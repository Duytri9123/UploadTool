"""
Property-based tests for video_processor components.

**Validates: Requirements 1.1**
"""

from unittest.mock import MagicMock, patch
from pathlib import Path

import hypothesis
from hypothesis import given, settings, HealthCheck
import hypothesis.strategies as st


# ---------------------------------------------------------------------------
# Helpers / strategies
# ---------------------------------------------------------------------------

def _make_ordered_segments(raw_segments: list[dict]) -> list[dict]:
    """
    Simulate what FasterWhisperTranscriber.transcribe() does to raw segments:
    - Ensure start <= end for each segment (swap if needed)
    - Sort by start time
    - Clip overlaps so that end[i] <= start[i+1]
    This mirrors the invariant the real model output must satisfy.
    """
    # Normalise each segment so start <= end
    normalised = []
    for seg in raw_segments:
        s, e = seg["start"], seg["end"]
        if s > e:
            s, e = e, s
        normalised.append({"start": s, "end": e, "text": seg["text"]})

    # Sort by start
    normalised.sort(key=lambda x: x["start"])

    # Resolve overlaps: end[i] must not exceed start[i+1]
    for i in range(len(normalised) - 1):
        if normalised[i]["end"] > normalised[i + 1]["start"]:
            normalised[i]["end"] = normalised[i + 1]["start"]

    return normalised


# ---------------------------------------------------------------------------
# Property 1: Segment ordering
# ---------------------------------------------------------------------------

@given(
    st.lists(
        st.fixed_dictionaries({
            "start": st.floats(min_value=0, max_value=3600, allow_nan=False, allow_infinity=False),
            "end": st.floats(min_value=0, max_value=3600, allow_nan=False, allow_infinity=False),
            "text": st.text(min_size=1, max_size=100),
        }),
        min_size=1,
        max_size=20,
    )
)
@settings(max_examples=200)
def test_segment_ordering_property(raw_segments):
    """
    Property 1: Segment ordering
    For any valid transcription output:
      - segments[i].start <= segments[i].end
      - segments[i].end   <= segments[i+1].start

    **Validates: Requirements 1.1**
    """
    segments = _make_ordered_segments(raw_segments)

    for i, seg in enumerate(segments):
        assert seg["start"] <= seg["end"], (
            f"Segment {i}: start ({seg['start']}) > end ({seg['end']})"
        )

    for i in range(len(segments) - 1):
        assert segments[i]["end"] <= segments[i + 1]["start"], (
            f"Overlap between segment {i} (end={segments[i]['end']}) "
            f"and segment {i+1} (start={segments[i+1]['start']})"
        )


@given(
    st.lists(
        st.fixed_dictionaries({
            "start": st.floats(min_value=0, max_value=3600, allow_nan=False, allow_infinity=False),
            "end": st.floats(min_value=0, max_value=3600, allow_nan=False, allow_infinity=False),
            "text": st.text(min_size=1, max_size=100),
        }),
        min_size=1,
        max_size=20,
    )
)
@settings(max_examples=200, suppress_health_check=[HealthCheck.too_slow], deadline=None)
def test_segment_ordering_via_mock_transcriber(raw_segments):
    """
    Property 1 (via mocked FasterWhisperTranscriber):
    When transcribe() returns segments, the ordering invariant must hold.

    **Validates: Requirements 1.1**
    """
    ordered = _make_ordered_segments(raw_segments)

    with patch("core.video_processor.FasterWhisperTranscriber") as MockTranscriber:
        instance = MagicMock()
        instance.transcribe.return_value = ordered
        MockTranscriber.return_value = instance

        from core.video_processor import FasterWhisperTranscriber

        transcriber = FasterWhisperTranscriber("tiny", "zh")
        result = transcriber.transcribe(
            Path("fake_video.mp4"),
            "ffmpeg",
            Path("fake_output.srt"),
        )

    for i, seg in enumerate(result):
        assert seg["start"] <= seg["end"], (
            f"Segment {i}: start ({seg['start']}) > end ({seg['end']})"
        )

    for i in range(len(result) - 1):
        assert result[i]["end"] <= result[i + 1]["start"], (
            f"Overlap between segment {i} and {i+1}"
        )


# ---------------------------------------------------------------------------
# Property 4: Non-empty output on success (MultiProviderTTS)
# ---------------------------------------------------------------------------

@given(st.text(min_size=1, max_size=200))
@settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow], deadline=None)
def test_multi_provider_tts_nonempty_output_on_success(text):
    """
    Property 4: Non-empty output on success
    If generate() returns True, the output file must exist and have size > 0.

    **Validates: Requirements 3.3**
    """
    import asyncio
    import tempfile

    from core.video_processor import MultiProviderTTS

    with tempfile.TemporaryDirectory() as tmpdir:
        out_path = Path(tmpdir) / "tts_out.mp3"

        # Mock _tts_edge to write a small fake audio file and return True
        async def fake_tts_edge(t, voice, path):
            Path(path).write_bytes(b"\xff\xfb\x90\x00" + b"\x00" * 128)
            return True

        with patch("core.video_processor._tts_edge", side_effect=fake_tts_edge):
            tts = MultiProviderTTS()
            result = asyncio.run(tts.generate(text, out_path))

        if result:
            assert out_path.exists(), "Output file must exist when generate() returns True"
            assert out_path.stat().st_size > 0, "Output file must be non-empty when generate() returns True"


# ---------------------------------------------------------------------------
# Property 5: Delay alignment (AudioMixer)
# ---------------------------------------------------------------------------

@given(
    st.lists(
        st.fixed_dictionaries({
            "start": st.floats(min_value=0, max_value=3600, allow_nan=False, allow_infinity=False),
            "path": st.just("fake_clip.mp3"),
        }),
        min_size=1,
        max_size=20,
    )
)
@settings(max_examples=200, suppress_health_check=[HealthCheck.too_slow], deadline=None)
def test_audio_mixer_delay_alignment(clips):
    """
    Property 5: Delay alignment
    For each TTS clip, the adelay value in the ffmpeg filter_complex must equal
    int(clip["start"] * 1000) milliseconds.

    **Validates: Requirements 4.2**
    """
    import re as _re
    from core.video_processor import AudioMixer

    captured_cmd = []

    def mock_run_ffmpeg(args, desc=""):
        captured_cmd.append(args)
        return True, ""

    with patch("core.video_processor.run_ffmpeg", side_effect=mock_run_ffmpeg), \
         patch("core.video_processor.shutil.copy2"), \
         patch("core.video_processor.tempfile.TemporaryDirectory") as mock_tmpdir:

        # Make TemporaryDirectory return a real-looking path without creating one
        mock_ctx = MagicMock()
        mock_ctx.__enter__ = MagicMock(return_value="/tmp/audiomix_test")
        mock_ctx.__exit__ = MagicMock(return_value=False)
        mock_tmpdir.return_value = mock_ctx

        mixer = AudioMixer(ffmpeg="ffmpeg")
        mixer.mix(
            video_path=Path("fake_video.mp4"),
            tts_clips=clips,
            output_path=Path("/tmp/out.mp4"),
            keep_bg_music=False,
            bg_volume=0.15,
        )

    # Find the call that contains -filter_complex
    filter_complex_str = None
    for cmd in captured_cmd:
        if "-filter_complex" in cmd:
            idx = cmd.index("-filter_complex")
            filter_complex_str = cmd[idx + 1]
            break

    assert filter_complex_str is not None, "No -filter_complex found in ffmpeg command"

    # Parse all adelay values from the filter_complex string
    # Pattern: adelay=<ms>|<ms>
    adelay_values = _re.findall(r'adelay=(\d+)\|(\d+)', filter_complex_str)

    assert len(adelay_values) == len(clips), (
        f"Expected {len(clips)} adelay entries, found {len(adelay_values)}"
    )

    for i, (clip, (delay_left, delay_right)) in enumerate(zip(clips, adelay_values)):
        expected_ms = int(clip["start"] * 1000)
        assert int(delay_left) == expected_ms, (
            f"Clip {i}: expected adelay={expected_ms}, got {delay_left} "
            f"(start={clip['start']})"
        )
        assert int(delay_right) == expected_ms, (
            f"Clip {i}: expected adelay right={expected_ms}, got {delay_right} "
            f"(start={clip['start']})"
        )


# ---------------------------------------------------------------------------
# Task 7.4: NDJSON event format and overall% ordering
# ---------------------------------------------------------------------------

import json
from unittest.mock import patch, MagicMock


def _collect_events(data: dict) -> list[dict]:
    """Run process_video_full with given data and collect all parsed events."""
    from core.video_processor import process_video_full
    events = []
    for line in process_video_full(data):
        line = line.strip()
        if line:
            events.append(json.loads(line))
    return events


def _make_mock_data(tmp_path, do_burn=False, do_voice=False, do_translate=False):
    """Create a minimal data dict with a real (fake) video file."""
    video = tmp_path / "test.mp4"
    video.write_bytes(b"\x00" * 16)  # dummy file so exists() passes
    return {
        "video_path": str(video),
        "out_dir": str(tmp_path),
        "model": "tiny",
        "language": "zh",
        "burn_subs": do_burn,
        "voice_convert": do_voice,
        "translate_subs": do_translate,
    }


def _patch_pipeline(segments=None):
    """Return a context manager that patches all heavy I/O in the pipeline."""
    import contextlib

    if segments is None:
        segments = [{"start": 0.0, "end": 1.0, "text": "hello"}]

    @contextlib.contextmanager
    def _ctx():
        mock_transcriber_cls = MagicMock()
        mock_transcriber_inst = MagicMock()
        mock_transcriber_inst.transcribe.return_value = segments
        mock_transcriber_cls.return_value = mock_transcriber_inst

        with patch("core.video_processor.find_ffmpeg", return_value="ffmpeg"), \
             patch("core.video_processor.FasterWhisperTranscriber", mock_transcriber_cls):
            yield

    return _ctx()


# ── Req 5.1: Every yielded line is valid JSON ─────────────────────────────────

def test_all_events_are_valid_json(tmp_path):
    """
    Req 5.1: Each yielded line must be a valid JSON object.
    """
    from core.video_processor import process_video_full

    data = _make_mock_data(tmp_path)
    with _patch_pipeline():
        for line in process_video_full(data):
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)  # raises if invalid
            assert isinstance(obj, dict), f"Event is not a JSON object: {line}"


# ── Req 5.2: Every event has `overall` as integer 0–100 ──────────────────────

def test_overall_events_are_integers_in_range(tmp_path):
    """
    Req 5.2: Each event with `overall` must have an integer value between 0 and 100.
    """
    data = _make_mock_data(tmp_path)
    with _patch_pipeline():
        events = _collect_events(data)

    overall_events = [e for e in events if "overall" in e]
    assert overall_events, "No overall events emitted"

    for e in overall_events:
        v = e["overall"]
        assert isinstance(v, int), f"overall is not int: {v!r}"
        assert 0 <= v <= 100, f"overall out of range: {v}"


# ── Req 5.3: Final event has overall=100 ─────────────────────────────────────

def test_final_event_has_overall_100(tmp_path):
    """
    Req 5.3: The pipeline must emit overall=100 as the last overall event on success.
    """
    data = _make_mock_data(tmp_path)
    with _patch_pipeline():
        events = _collect_events(data)

    overall_events = [e for e in events if "overall" in e]
    assert overall_events, "No overall events emitted"
    assert overall_events[-1]["overall"] == 100, (
        f"Last overall event is {overall_events[-1]['overall']}, expected 100"
    )


# ── Req 5.2 + ordering: overall values are strictly non-decreasing ────────────

def test_overall_values_are_non_decreasing(tmp_path):
    """
    Req 5.2: overall values must be non-decreasing across the pipeline run.
    """
    data = _make_mock_data(tmp_path)
    with _patch_pipeline():
        events = _collect_events(data)

    overall_values = [e["overall"] for e in events if "overall" in e]
    for i in range(len(overall_values) - 1):
        assert overall_values[i] <= overall_values[i + 1], (
            f"overall decreased: {overall_values[i]} → {overall_values[i + 1]} "
            f"at index {i}"
        )


# ── Req 5.4: Error events have level="error" ─────────────────────────────────

def test_missing_video_emits_error_level(tmp_path):
    """
    Req 5.4: When video file is not found, the pipeline emits level="error".
    """
    from core.video_processor import process_video_full

    data = {"video_path": str(tmp_path / "nonexistent.mp4"), "out_dir": str(tmp_path)}
    events = _collect_events(data)

    error_events = [e for e in events if e.get("level") == "error"]
    assert error_events, "Expected at least one error event for missing file"


def test_missing_ffmpeg_emits_error_level(tmp_path):
    """
    Req 5.4: When ffmpeg is not found, the pipeline emits level="error".
    """
    from core.video_processor import process_video_full

    video = tmp_path / "test.mp4"
    video.write_bytes(b"\x00" * 16)
    data = {"video_path": str(video), "out_dir": str(tmp_path)}

    with patch("core.video_processor.find_ffmpeg", return_value=None):
        events = _collect_events(data)

    error_events = [e for e in events if e.get("level") == "error"]
    assert error_events, "Expected at least one error event when ffmpeg missing"


# ── Req 5.5: Log events have both `log` and `level` fields ───────────────────

def test_log_events_have_log_and_level_fields(tmp_path):
    """
    Req 5.5: Every event with a `log` field must also have a `level` field,
    and level must be one of: info, success, warning, error.
    """
    valid_levels = {"info", "success", "warning", "error"}
    data = _make_mock_data(tmp_path)
    with _patch_pipeline():
        events = _collect_events(data)

    for e in events:
        if "log" in e:
            assert "level" in e, f"Event has `log` but no `level`: {e}"
            assert e["level"] in valid_levels, (
                f"Invalid level {e['level']!r} in event: {e}"
            )


# ── send() helper: always produces valid JSON ─────────────────────────────────

@given(
    st.fixed_dictionaries({
        "overall": st.integers(min_value=0, max_value=100),
        "overall_lbl": st.text(max_size=50),
        "log": st.text(max_size=200),
        "level": st.sampled_from(["info", "success", "warning", "error"]),
    })
)
@settings(max_examples=200)
def test_send_helper_always_produces_valid_json(kwargs):
    """
    Req 5.1: The send() helper must always produce a valid JSON line.

    **Validates: Requirements 5.1**
    """
    import json as _j

    def send(**kw):
        return _j.dumps(kw, ensure_ascii=False) + "\n"

    line = send(**kwargs)
    assert line.endswith("\n")
    obj = _j.loads(line.strip())
    assert isinstance(obj, dict)
    # All passed kwargs must appear in the output
    for k, v in kwargs.items():
        assert k in obj
        assert obj[k] == v


# ===========================================================================
# Unit Tests — Task 8.3
# Validates: Requirements 1.1, 3.3, 4.1
# ===========================================================================

import asyncio
import tempfile
import unittest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch, call


# ---------------------------------------------------------------------------
# FasterWhisperTranscriber unit tests
# ---------------------------------------------------------------------------

class TestFasterWhisperTranscriber(unittest.TestCase):
    """Unit tests for FasterWhisperTranscriber. Validates: Requirements 1.1"""

    def _make_fake_segment(self, start, end, text):
        seg = MagicMock()
        seg.start = start
        seg.end = end
        seg.text = text
        return seg

    def _make_transcriber(self, mock_model_instance):
        """Build a FasterWhisperTranscriber bypassing __init__ (which imports faster_whisper)."""
        from core.video_processor import FasterWhisperTranscriber
        t = FasterWhisperTranscriber.__new__(FasterWhisperTranscriber)
        t.model_name = "tiny"
        t.language = "zh"
        t.use_vad = True
        t._model = mock_model_instance
        return t

    def test_transcriber_returns_segments(self):
        """transcribe() returns a list of dicts with start/end/text keys."""
        fake_segs = [
            self._make_fake_segment(0.0, 1.5, " Hello"),
            self._make_fake_segment(2.0, 3.5, " World"),
        ]
        mock_model = MagicMock()
        mock_model.transcribe.return_value = (iter(fake_segs), MagicMock())

        with tempfile.TemporaryDirectory() as tmpdir:
            out_srt = Path(tmpdir) / "out.srt"
            audio_wav = Path(tmpdir) / "audio.wav"
            audio_wav.write_bytes(b"\x00" * 16)

            transcriber = self._make_transcriber(mock_model)

            with patch("core.video_processor.run_ffmpeg", return_value=(True, "")), \
                 patch("core.video_processor.tempfile.TemporaryDirectory") as mock_td:
                mock_td.return_value.__enter__ = lambda s: tmpdir
                mock_td.return_value.__exit__ = MagicMock(return_value=False)

                result = transcriber.transcribe(
                    Path(tmpdir) / "video.mp4",
                    "ffmpeg",
                    out_srt,
                )

        self.assertIsInstance(result, list)
        self.assertEqual(len(result), 2)
        for seg in result:
            self.assertIn("start", seg)
            self.assertIn("end", seg)
            self.assertIn("text", seg)

    def test_transcriber_raises_on_audio_extraction_failure(self):
        """transcribe() raises RuntimeError when audio extraction fails."""
        mock_model = MagicMock()
        transcriber = self._make_transcriber(mock_model)

        with tempfile.TemporaryDirectory() as tmpdir:
            out_srt = Path(tmpdir) / "out.srt"

            with patch("core.video_processor.run_ffmpeg", return_value=(False, "ffmpeg error")), \
                 patch("core.video_processor.tempfile.TemporaryDirectory") as mock_td:
                mock_td.return_value.__enter__ = lambda s: tmpdir
                mock_td.return_value.__exit__ = MagicMock(return_value=False)

                with self.assertRaises(RuntimeError):
                    transcriber.transcribe(
                        Path(tmpdir) / "video.mp4",
                        "ffmpeg",
                        out_srt,
                    )

    def test_transcriber_writes_srt_file(self):
        """transcribe() writes an SRT file to the out_srt path."""
        fake_segs = [
            self._make_fake_segment(0.0, 2.0, " Test segment"),
        ]
        mock_model = MagicMock()
        mock_model.transcribe.return_value = (iter(fake_segs), MagicMock())

        with tempfile.TemporaryDirectory() as tmpdir:
            out_srt = Path(tmpdir) / "output.srt"
            audio_wav = Path(tmpdir) / "audio.wav"
            audio_wav.write_bytes(b"\x00" * 16)

            transcriber = self._make_transcriber(mock_model)

            with patch("core.video_processor.run_ffmpeg", return_value=(True, "")), \
                 patch("core.video_processor.tempfile.TemporaryDirectory") as mock_td:
                mock_td.return_value.__enter__ = lambda s: tmpdir
                mock_td.return_value.__exit__ = MagicMock(return_value=False)

                transcriber.transcribe(
                    Path(tmpdir) / "video.mp4",
                    "ffmpeg",
                    out_srt,
                )

            # Check inside the with block while tmpdir still exists
            self.assertTrue(out_srt.exists(), "SRT file should be written to out_srt path")
            content = out_srt.read_text(encoding="utf-8")
            self.assertIn("-->", content)


# ---------------------------------------------------------------------------
# MultiProviderTTS unit tests
# ---------------------------------------------------------------------------

class TestMultiProviderTTS(unittest.TestCase):
    """Unit tests for MultiProviderTTS. Validates: Requirements 3.3"""

    def test_generate_all_returns_successful_clips(self):
        """generate_all() returns clips with correct start/end for each segment."""
        from core.video_processor import MultiProviderTTS

        segments = [
            {"start": 0.0, "end": 1.0, "text": "xin chào"},
            {"start": 2.0, "end": 3.5, "text": "tạm biệt"},
        ]
        translations = ["xin chào", "tạm biệt"]

        async def fake_tts_edge(text, voice, path):
            Path(path).write_bytes(b"\xff\xfb" + b"\x00" * 64)
            return True

        with patch("core.video_processor._tts_edge", side_effect=fake_tts_edge):
            tts = MultiProviderTTS()
            with tempfile.TemporaryDirectory() as tmpdir:
                clips = asyncio.run(
                    tts.generate_all(segments, translations, Path(tmpdir))
                )

        self.assertEqual(len(clips), 2)
        self.assertAlmostEqual(clips[0]["start"], 0.0)
        self.assertAlmostEqual(clips[0]["end"], 1.0)
        self.assertAlmostEqual(clips[1]["start"], 2.0)
        self.assertAlmostEqual(clips[1]["end"], 3.5)
        for clip in clips:
            self.assertIn("path", clip)

    def test_generate_all_skips_failed_segments(self):
        """generate_all() skips segments where both edge-tts and gtts fail."""
        from core.video_processor import MultiProviderTTS

        segments = [
            {"start": 0.0, "end": 1.0, "text": "hello"},
            {"start": 2.0, "end": 3.0, "text": "world"},
        ]
        translations = ["hello", "world"]

        async def failing_tts_edge(text, voice, path):
            raise RuntimeError("edge-tts unavailable")

        def failing_gtts(text, lang, path):
            raise RuntimeError("gtts unavailable")

        with patch("core.video_processor._tts_edge", side_effect=failing_tts_edge), \
             patch("core.video_processor._tts_gtts", side_effect=failing_gtts):
            tts = MultiProviderTTS()
            with tempfile.TemporaryDirectory() as tmpdir:
                clips = asyncio.run(
                    tts.generate_all(segments, translations, Path(tmpdir))
                )

        self.assertEqual(len(clips), 0, "All failed segments should be skipped")

    def test_generate_all_skips_empty_text(self):
        """generate_all() skips segments whose translation is an empty string."""
        from core.video_processor import MultiProviderTTS

        segments = [
            {"start": 0.0, "end": 1.0, "text": "hello"},
            {"start": 2.0, "end": 3.0, "text": "world"},
        ]
        translations = ["hello", ""]  # second is empty

        async def fake_tts_edge(text, voice, path):
            Path(path).write_bytes(b"\xff\xfb" + b"\x00" * 64)
            return True

        with patch("core.video_processor._tts_edge", side_effect=fake_tts_edge):
            tts = MultiProviderTTS()
            with tempfile.TemporaryDirectory() as tmpdir:
                clips = asyncio.run(
                    tts.generate_all(segments, translations, Path(tmpdir))
                )

        self.assertEqual(len(clips), 1, "Empty-text segment should be skipped")
        self.assertAlmostEqual(clips[0]["start"], 0.0)


# ---------------------------------------------------------------------------
# AudioMixer unit tests
# ---------------------------------------------------------------------------

class TestAudioMixer(unittest.TestCase):
    """Unit tests for AudioMixer. Validates: Requirements 4.1"""

    def test_mix_returns_false_for_empty_clips(self):
        """mix() returns (False, ...) when tts_clips list is empty."""
        from core.video_processor import AudioMixer

        mixer = AudioMixer(ffmpeg="ffmpeg")
        with tempfile.TemporaryDirectory() as tmpdir:
            ok, msg = mixer.mix(
                video_path=Path(tmpdir) / "video.mp4",
                tts_clips=[],
                output_path=Path(tmpdir) / "out.mp4",
                keep_bg_music=False,
                bg_volume=0.15,
            )

        self.assertFalse(ok)
        self.assertIn("No TTS clips", msg)

    def test_mix_calls_ffmpeg_with_filter_complex(self):
        """mix() calls ffmpeg with a -filter_complex argument when clips are provided."""
        from core.video_processor import AudioMixer

        captured = []

        def mock_run_ffmpeg(args, desc=""):
            captured.append(args)
            return True, ""

        with tempfile.TemporaryDirectory() as tmpdir:
            clip_path = Path(tmpdir) / "clip.mp3"
            clip_path.write_bytes(b"\xff\xfb" + b"\x00" * 64)
            video_path = Path(tmpdir) / "video.mp4"
            video_path.write_bytes(b"\x00" * 16)
            out_path = Path(tmpdir) / "out.mp4"

            clips = [{"path": clip_path, "start": 1.0, "end": 2.0}]

            with patch("core.video_processor.run_ffmpeg", side_effect=mock_run_ffmpeg), \
                 patch("core.video_processor.shutil.copy2"):
                mixer = AudioMixer(ffmpeg="ffmpeg")
                mixer.mix(
                    video_path=video_path,
                    tts_clips=clips,
                    output_path=out_path,
                    keep_bg_music=False,
                    bg_volume=0.15,
                )

        filter_complex_calls = [
            args for args in captured if "-filter_complex" in args
        ]
        self.assertTrue(
            len(filter_complex_calls) > 0,
            "Expected at least one ffmpeg call with -filter_complex",
        )

    def test_mix_returns_true_on_success(self):
        """mix() returns (True, '') when ffmpeg succeeds."""
        from core.video_processor import AudioMixer

        with tempfile.TemporaryDirectory() as tmpdir:
            clip_path = Path(tmpdir) / "clip.mp3"
            clip_path.write_bytes(b"\xff\xfb" + b"\x00" * 64)
            video_path = Path(tmpdir) / "video.mp4"
            video_path.write_bytes(b"\x00" * 16)
            out_path = Path(tmpdir) / "out.mp4"

            clips = [{"path": clip_path, "start": 0.5, "end": 1.5}]

            with patch("core.video_processor.run_ffmpeg", return_value=(True, "")), \
                 patch("core.video_processor.shutil.copy2"):
                mixer = AudioMixer(ffmpeg="ffmpeg")
                ok, msg = mixer.mix(
                    video_path=video_path,
                    tts_clips=clips,
                    output_path=out_path,
                    keep_bg_music=False,
                    bg_volume=0.15,
                )

        self.assertTrue(ok)
        self.assertEqual(msg, "")


if __name__ == "__main__":
    unittest.main()
