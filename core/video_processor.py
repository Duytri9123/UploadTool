#!/usr/bin/env python3
"""
video_processor.py — Xử lý video sau khi tải:
  1. Burn subtitles (SRT → hardcode vào video)
  2. Blur/làm mờ text gốc trên video (detect vùng subtitle gốc)
  3. Voice conversion: ZH → VI (Whisper transcribe → dịch → TTS edge-tts)

Yêu cầu:
  pip install openai-whisper edge-tts pydub
  ffmpeg phải có trong PATH
"""
import asyncio
import json
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Generator, Optional


# ── ffmpeg helper ─────────────────────────────────────────────────────────────
def find_ffmpeg() -> Optional[str]:
    p = shutil.which("ffmpeg")
    if p:
        return p
    local = Path(__file__).parent.parent / "cli" / "ffmpeg.exe"
    if local.exists():
        return str(local)
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        pass
    return None


def run_ffmpeg(args: list, desc: str = "") -> tuple[bool, str]:
    """Run ffmpeg command, return (success, stderr)."""
    try:
        r = subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace")
        return r.returncode == 0, r.stderr.strip()
    except Exception as e:
        return False, str(e)


def _safe_stem(stem: str) -> str:
    stem = stem.replace("\n", " ").replace("\r", " ")
    stem = re.sub(r'[<>:"/\\|?*#]', '_', stem)
    stem = re.sub(r'[\s_]+', '_', stem)
    return stem.strip('_ ')[:150]


# ── SRT helpers ───────────────────────────────────────────────────────────────
def _fmt_srt_time(seconds: float) -> str:
    h, r = divmod(seconds, 3600)
    m, r = divmod(r, 60)
    s = int(r)
    ms = int((r - s) * 1000)
    return f"{int(h):02d}:{int(m):02d}:{s:02d},{ms:03d}"


def _parse_srt(srt_path: Path) -> list[dict]:
    """Parse SRT → list of {index, start, end, text}"""
    segments = []
    content = srt_path.read_text(encoding="utf-8", errors="replace")
    blocks = re.split(r'\n\s*\n', content.strip())
    for block in blocks:
        lines = block.strip().splitlines()
        if len(lines) < 3:
            continue
        try:
            idx = int(lines[0].strip())
            times = lines[1].strip()
            m = re.match(r'(\d+:\d+:\d+[,\.]\d+)\s*-->\s*(\d+:\d+:\d+[,\.]\d+)', times)
            if not m:
                continue
            def to_sec(t):
                t = t.replace(',', '.')
                parts = t.split(':')
                return int(parts[0])*3600 + int(parts[1])*60 + float(parts[2])
            text = '\n'.join(lines[2:]).strip()
            segments.append({'index': idx, 'start': to_sec(m.group(1)), 'end': to_sec(m.group(2)), 'text': text})
        except Exception:
            continue
    return segments


# ══════════════════════════════════════════════════════════════════════════════
# GroqWhisperTranscriber  (default — cloud API, much faster than local CPU)
# ══════════════════════════════════════════════════════════════════════════════
_GROQ_MODEL   = "whisper-large-v3-turbo"
_GROQ_MAX_MB  = 25  # Groq free tier limit


class GroqWhisperTranscriber:
    """Speech-to-text via Groq Whisper API (cloud, fast)."""

    def __init__(self, language: str = "zh", api_key: str = "", model: str = _GROQ_MODEL, max_mb: int = _GROQ_MAX_MB):
        self.language = language
        self.api_key = (api_key or "").strip()
        self.model = str(model or _GROQ_MODEL).strip() or _GROQ_MODEL
        try:
            self.max_mb = int(max_mb)
        except Exception:
            self.max_mb = _GROQ_MAX_MB

    def transcribe(self, video_path: Path, ffmpeg: str, out_srt: Path) -> list[dict]:
        import httpx

        video_path = Path(video_path)
        out_srt    = Path(out_srt)

        with tempfile.TemporaryDirectory(prefix="groq_whisper_") as tmpdir:
            audio_path = Path(tmpdir) / "audio.mp3"
            ok, err = run_ffmpeg([
                ffmpeg, "-i", str(video_path),
                "-vn", "-acodec", "libmp3lame", "-ar", "16000", "-ac", "1", "-q:a", "5",
                str(audio_path), "-y", "-loglevel", "error"
            ])
            if not ok or not audio_path.exists():
                raise RuntimeError(f"Audio extraction failed: {err}")

            size_mb = audio_path.stat().st_size / (1024 * 1024)
            if size_mb > self.max_mb:
                raise RuntimeError(f"Audio too large for Groq API: {size_mb:.1f}MB > {self.max_mb}MB")

            if not self.api_key:
                raise RuntimeError("Missing GROQ_API_KEY (set env GROQ_API_KEY or config transcript.groq_api_key)")

            with open(audio_path, "rb") as f:
                response = httpx.post(
                    "https://api.groq.com/openai/v1/audio/transcriptions",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    files={"file": ("audio.mp3", f, "audio/mpeg")},
                    data={
                        "model": self.model,
                        "language": self.language,
                        "response_format": "verbose_json",
                        "timestamp_granularities[]": "segment",
                    },
                    timeout=120,
                )

            if response.status_code != 200:
                raise RuntimeError(f"Groq API error {response.status_code}: {response.text}")

            result = response.json()
            segments = [
                {"start": seg["start"], "end": seg["end"], "text": seg["text"].strip()}
                for seg in result.get("segments", [])
                if seg.get("text", "").strip()
            ]

        srt_lines = []
        for i, seg in enumerate(segments, 1):
            srt_lines.append(
                f"{i}\n{_fmt_srt_time(seg['start'])} --> {_fmt_srt_time(seg['end'])}\n{seg['text']}\n"
            )
        out_srt.write_text("\n".join(srt_lines), encoding="utf-8")
        return segments


# ══════════════════════════════════════════════════════════════════════════════
# FasterWhisperTranscriber  (fallback — local CPU)
# ══════════════════════════════════════════════════════════════════════════════
_whisper_model_cache: dict = {}  # {model_name: WhisperModel} — keep in memory


class FasterWhisperTranscriber:
    """Speech-to-text using faster-whisper (~4x faster than openai-whisper on CPU)."""

    def __init__(self, model_name: str, language: str, use_vad: bool = True):
        self.model_name = model_name
        self.language = language
        self.use_vad = use_vad
        # Reuse cached model to avoid reloading from disk on every call
        if model_name not in _whisper_model_cache:
            import os
            import multiprocessing
            os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")
            from faster_whisper import WhisperModel  # lazy import
            cpu_threads = min(multiprocessing.cpu_count(), 8)
            _whisper_model_cache[model_name] = WhisperModel(
                model_name,
                device="cpu",
                compute_type="int8",
                cpu_threads=cpu_threads,
                num_workers=2,
            )
        self._model = _whisper_model_cache[model_name]

    def transcribe(self, video_path: Path, ffmpeg: str, out_srt: Path) -> list[dict]:
        """
        Extract audio from video, transcribe with faster-whisper, write SRT.
        Returns list of {"start": float, "end": float, "text": str} dicts.
        """
        video_path = Path(video_path)
        out_srt = Path(out_srt)

        with tempfile.TemporaryDirectory(prefix="fwhisper_") as tmpdir:
            audio_path = Path(tmpdir) / "audio.wav"
            ok, err = run_ffmpeg([
                ffmpeg, "-i", str(video_path),
                "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
                str(audio_path), "-y", "-loglevel", "error"
            ])
            if not ok or not audio_path.exists():
                raise RuntimeError(f"Audio extraction failed: {err}")

            fw_segments, _info = self._model.transcribe(
                str(audio_path),
                language=self.language,
                vad_filter=self.use_vad,
                beam_size=1,
                vad_parameters={"min_silence_duration_ms": 500},
            )
            segments = [
                {"start": seg.start, "end": seg.end, "text": seg.text.strip()}
                for seg in fw_segments
                if seg.text.strip()
            ]

        # write SRT
        srt_lines = []
        for i, seg in enumerate(segments, 1):
            srt_lines.append(
                f"{i}\n{_fmt_srt_time(seg['start'])} --> {_fmt_srt_time(seg['end'])}\n{seg['text']}\n"
            )
        out_srt.write_text("\n".join(srt_lines), encoding="utf-8")

        return segments


# ══════════════════════════════════════════════════════════════════════════════
# STEP 1: Whisper transcribe → SRT
# ══════════════════════════════════════════════════════════════════════════════
def transcribe_to_srt(
    video_path: Path,
    ffmpeg: str,
    model_name: str = "base",
    language: str = "zh",
    out_srt: Optional[Path] = None,
) -> tuple[Optional[Path], list[dict]]:
    """
    Transcribe video audio → SRT file.
    Returns (srt_path, segments).
    """
    try:
        import whisper
    except ImportError:
        raise RuntimeError("openai-whisper not installed: pip install openai-whisper")

    video_path = Path(video_path)
    if out_srt is None:
        out_srt = video_path.parent / f"{_safe_stem(video_path.stem)}.srt"

    with tempfile.TemporaryDirectory(prefix="vproc_") as tmpdir:
        # copy video to temp (avoid special chars in path)
        tmp_video = Path(tmpdir) / "input.mp4"
        shutil.copy2(str(video_path), str(tmp_video))

        # extract audio
        audio_path = Path(tmpdir) / "audio.wav"
        ok, err = run_ffmpeg([
            ffmpeg, "-i", str(tmp_video),
            "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
            str(audio_path), "-y", "-loglevel", "error"
        ])
        if not ok or not audio_path.exists():
            raise RuntimeError(f"Audio extraction failed: {err}")

        model = whisper.load_model(model_name)
        result = model.transcribe(str(audio_path), language=language, verbose=False)
        segments = result.get("segments", [])

    if not segments:
        return None, []

    # write SRT
    srt_lines = []
    for i, seg in enumerate(segments, 1):
        text = seg.get("text", "").strip()
        if text:
            srt_lines.append(
                f"{i}\n{_fmt_srt_time(seg['start'])} --> {_fmt_srt_time(seg['end'])}\n{text}\n"
            )
    out_srt.write_text("\n".join(srt_lines), encoding="utf-8")
    return out_srt, segments


# ══════════════════════════════════════════════════════════════════════════════
# STEP 2: Burn subtitles + blur original text region
# ══════════════════════════════════════════════════════════════════════════════
def burn_subtitles(
    video_path: Path,
    srt_path: Path,
    output_path: Path,
    ffmpeg: str,
    blur_original: bool = True,
    blur_zone: str = "bottom",
    blur_height_pct: float = 0.15,
    font_size: int = 18,
    font_color: str = "white",
    outline_color: str = "black",
    outline_width: int = 2,
    margin_v: int = 30,
    subtitle_position: str = "bottom",
) -> tuple[bool, str]:
    """
    Burn SRT subtitles into video.
    Optionally blur the bottom/top region to hide original burned-in text.
    Uses -filter_complex for blur+overlay, then subtitles on top.
    """
    video_path = Path(video_path)
    srt_path = Path(srt_path)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Copy both video and SRT to temp dir to avoid special chars in paths
    with tempfile.TemporaryDirectory(prefix="burn_") as tmpdir:
        tmp_video = Path(tmpdir) / "input.mp4"
        tmp_srt   = Path(tmpdir) / "subs.srt"
        tmp_out   = Path(tmpdir) / "output.mp4"

        shutil.copy2(str(video_path), str(tmp_video))
        shutil.copy2(str(srt_path),   str(tmp_srt))

        # SRT path for subtitles filter
        # On Windows: use forward slashes, escape colon in drive letter (C: → C\:)
        srt_esc = str(tmp_srt).replace("\\", "/")
        # Escape colon in drive letter for ffmpeg subtitles filter
        if len(srt_esc) >= 2 and srt_esc[1] == ':':
            srt_esc = srt_esc[0] + "\\:" + srt_esc[2:]

        # subtitle ASS style
        alignment = "8" if str(subtitle_position).lower() == "top" else "2"
        sub_style = (
            f"FontSize={font_size},"
            f"PrimaryColour=&H00{_hex_color(font_color)},"
            f"OutlineColour=&H00{_hex_color(outline_color)},"
            f"Outline={outline_width},"
            f"MarginV={margin_v},"
            f"Alignment={alignment}"
        )

        if blur_original and blur_zone != "none":
            # Two-pass approach: first blur the zone, then burn subtitles
            # Step A: blur zone → intermediate file
            tmp_blurred = Path(tmpdir) / "blurred.mp4"

            h_pct = blur_height_pct
            if blur_zone == "bottom":
                # crop bottom strip, blur it, pad back, overlay
                crop_filter = (
                    f"[0:v]split[orig][copy];"
                    f"[copy]crop=iw:ih*{h_pct:.4f}:0:ih*(1-{h_pct:.4f}),"
                    f"boxblur=luma_radius=20:luma_power=3[blurred];"
                    f"[orig][blurred]overlay=0:H*(1-{h_pct:.4f})[blended]"
                )
            else:  # top
                crop_filter = (
                    f"[0:v]split[orig][copy];"
                    f"[copy]crop=iw:ih*{h_pct:.4f}:0:0,"
                    f"boxblur=luma_radius=20:luma_power=3[blurred];"
                    f"[orig][blurred]overlay=0:0[blended]"
                )

            ok, err = run_ffmpeg([
                ffmpeg, "-i", str(tmp_video),
                "-filter_complex", crop_filter,
                "-map", "[blended]", "-map", "0:a?",
                "-c:v", "libx264", "-preset", "fast", "-crf", "20",
                "-c:a", "copy",
                str(tmp_blurred), "-y", "-loglevel", "error"
            ])
            if not ok:
                # fallback: skip blur, just burn subs
                tmp_blurred = tmp_video

            # Step B: burn subtitles on top of blurred video
            ok, err = run_ffmpeg([
                ffmpeg, "-i", str(tmp_blurred),
                "-vf", f"subtitles='{srt_esc}':force_style='{sub_style}'",
                "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                "-c:a", "copy",
                str(tmp_out), "-y", "-loglevel", "error"
            ])
        else:
            # No blur - just burn subtitles directly
            ok, err = run_ffmpeg([
                ffmpeg, "-i", str(tmp_video),
                "-vf", f"subtitles='{srt_esc}':force_style='{sub_style}'",
                "-c:v", "libx264", "-preset", "fast", "-crf", "23",
                "-c:a", "copy",
                str(tmp_out), "-y", "-loglevel", "error"
            ])

        if ok and tmp_out.exists():
            shutil.copy2(str(tmp_out), str(output_path))
            return True, ""
        return False, err


def _hex_color(name: str) -> str:
    """Convert color name to BGR hex for ASS style."""
    colors = {
        "white": "FFFFFF", "black": "000000", "yellow": "00FFFF",
        "red": "0000FF", "blue": "FF0000", "green": "00FF00",
        "cyan": "FFFF00", "magenta": "FF00FF",
    }
    return colors.get(name.lower(), "FFFFFF")


# ══════════════════════════════════════════════════════════════════════════════
# MultiProviderTTS
# ══════════════════════════════════════════════════════════════════════════════
class MultiProviderTTS:
    """Multi-provider TTS with Edge-TTS as primary and gTTS as fallback."""

    def __init__(self, voice: str = "vi-VN-HoaiMyNeural", engine: str = "edge-tts"):
        self.voice = voice
        self.engine = engine

    async def generate(self, text: str, out_path: Path) -> bool:
        """
        Generate TTS audio for text, writing to out_path.
        Tries Edge-TTS first, falls back to gTTS.
        Returns False (without raising) if both providers fail.
        """
        out_path = Path(out_path)

        # Try Edge-TTS first
        try:
            ok = await _tts_edge(text, self.voice, out_path)
            if ok:
                return True
        except Exception:
            pass

        # Fallback to gTTS
        try:
            ok = _tts_gtts(text, "vi", out_path)
            if ok:
                return True
        except Exception:
            pass

        return False

    async def generate_all(
        self,
        segments: list[dict],
        translations: list[str],
        tmpdir: Path,
    ) -> list[dict]:
        """
        Generate TTS for all segments concurrently using asyncio.gather.
        Returns list of {"path": Path, "start": float, "end": float}
        only for successfully generated segments.
        """
        tmpdir = Path(tmpdir)

        async def _gen_one(i: int, seg: dict, text: str):
            if not text or not text.strip():
                return None
            out_path = tmpdir / f"tts_{i:04d}.mp3"
            ok = await self.generate(text.strip(), out_path)
            if ok:
                return {"path": out_path, "start": seg["start"], "end": seg["end"]}
            return None

        tasks = [
            _gen_one(i, seg, text)
            for i, (seg, text) in enumerate(zip(segments, translations))
        ]
        results = await asyncio.gather(*tasks)
        return [r for r in results if r is not None]


# ══════════════════════════════════════════════════════════════════════════════
# STEP 3: Voice conversion ZH → VI
# ══════════════════════════════════════════════════════════════════════════════
async def _tts_edge(text: str, voice: str, out_path: Path) -> bool:
    """Generate TTS audio using edge-tts."""
    try:
        import edge_tts
        communicate = edge_tts.Communicate(text, voice)
        await communicate.save(str(out_path))
        return out_path.exists() and out_path.stat().st_size > 0
    except Exception as e:
        raise RuntimeError(f"edge-tts failed: {e}")


def _tts_gtts(text: str, lang: str, out_path: Path) -> bool:
    """Fallback TTS using gTTS."""
    try:
        from gtts import gTTS
        tts = gTTS(text=text, lang=lang, slow=False)
        tts.save(str(out_path))
        return out_path.exists()
    except Exception as e:
        raise RuntimeError(f"gTTS failed: {e}")


async def convert_voice(
    video_path: Path,
    segments: list[dict],          # [{start, end, text}] in ZH
    translated_texts: list[str],   # VI translations (same order as segments)
    output_path: Path,
    ffmpeg: str,
    tts_voice: str = "vi-VN-HoaiMyNeural",  # edge-tts voice
    tts_engine: str = "edge-tts",   # "edge-tts" | "gtts"
    keep_bg_music: bool = True,
    bg_volume: float = 0.15,        # background original audio volume
) -> tuple[bool, str]:
    """
    Replace original audio with Vietnamese TTS voice.
    Each segment gets its own TTS clip, placed at the correct timestamp.
    Background music from original is optionally kept at low volume.
    """
    video_path = Path(video_path)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if not segments or not translated_texts:
        return False, "No segments to process"

    with tempfile.TemporaryDirectory(prefix="voice_") as tmpdir:
        tmpdir = Path(tmpdir)

        # copy video to temp
        tmp_video = tmpdir / "input.mp4"
        shutil.copy2(str(video_path), str(tmp_video))

        # get video duration
        dur_result2 = subprocess.run(
            [ffmpeg, "-i", str(tmp_video), "-f", "null", "-"],
            capture_output=True, text=True
        )
        video_duration = 0.0
        for line in dur_result2.stderr.splitlines():
            m = re.search(r'Duration:\s*(\d+):(\d+):([\d.]+)', line)
            if m:
                video_duration = int(m.group(1))*3600 + int(m.group(2))*60 + float(m.group(3))
                break

        if video_duration <= 0:
            video_duration = segments[-1]['end'] + 2.0 if segments else 60.0

        # Generate TTS for each segment
        tts_clips = []
        for i, (seg, vi_text) in enumerate(zip(segments, translated_texts)):
            if not vi_text or not vi_text.strip():
                continue
            clip_path = tmpdir / f"tts_{i:04d}.mp3"
            try:
                if tts_engine == "edge-tts":
                    ok = await _tts_edge(vi_text.strip(), tts_voice, clip_path)
                else:
                    ok = _tts_gtts(vi_text.strip(), "vi", clip_path)
                if ok:
                    tts_clips.append({
                        "path": clip_path,
                        "start": seg["start"],
                        "end": seg["end"],
                        "text": vi_text,
                    })
            except Exception:
                pass  # skip failed clips

        if not tts_clips:
            return False, "No TTS clips generated"

        # Build silent base audio track (same duration as video)
        silent_path = tmpdir / "silent.wav"
        run_ffmpeg([
            ffmpeg, "-f", "lavfi", "-i", f"anullsrc=r=44100:cl=stereo",
            "-t", str(video_duration),
            str(silent_path), "-y", "-loglevel", "error"
        ])

        # Mix all TTS clips into a single audio track using amix/adelay
        # Build complex filter: each clip delayed to its start time
        inputs = ["-i", str(silent_path)]
        filter_parts = []
        mix_inputs = ["[0:a]"]

        for j, clip in enumerate(tts_clips):
            inputs += ["-i", str(clip["path"])]
            delay_ms = int(clip["start"] * 1000)
            filter_parts.append(
                f"[{j+1}:a]adelay={delay_ms}|{delay_ms}[d{j}]"
            )
            mix_inputs.append(f"[d{j}]")

        n_mix = len(mix_inputs)
        filter_parts.append(
            f"{''.join(mix_inputs)}amix=inputs={n_mix}:duration=first:dropout_transition=0[tts_mix]"
        )

        if keep_bg_music:
            # extract original audio at low volume
            orig_audio = tmpdir / "orig_audio.wav"
            run_ffmpeg([
                ffmpeg, "-i", str(tmp_video),
                "-vn", "-acodec", "pcm_s16le", "-ar", "44100", "-ac", "2",
                str(orig_audio), "-y", "-loglevel", "error"
            ])
            if orig_audio.exists():
                inputs += ["-i", str(orig_audio)]
                bg_idx = len(tts_clips) + 1
                filter_parts.append(
                    f"[{bg_idx}:a]volume={bg_volume}[bg];"
                    f"[tts_mix][bg]amix=inputs=2:duration=first[final_audio]"
                )
                final_audio_label = "[final_audio]"
            else:
                filter_parts[-1] = filter_parts[-1].replace("[tts_mix]", "[tts_mix]").replace(
                    "amix=inputs=" + str(n_mix), "amix=inputs=" + str(n_mix)
                )
                final_audio_label = "[tts_mix]"
        else:
            final_audio_label = "[tts_mix]"

        filter_complex = ";".join(filter_parts)

        # Combine: original video + new audio
        cmd = [ffmpeg] + inputs + [
            "-i", str(tmp_video),
            "-filter_complex", filter_complex,
            "-map", f"{len(inputs)-1}:v",  # video from last input (original)
            "-map", final_audio_label,
            "-c:v", "copy",
            "-c:a", "aac", "-b:a", "128k",
            str(output_path), "-y", "-loglevel", "error"
        ]
        ok, err = run_ffmpeg(cmd, "voice mix")
        if not ok:
            return False, f"ffmpeg mix failed: {err}"

    return True, ""


# ══════════════════════════════════════════════════════════════════════════════
# AudioMixer
# ══════════════════════════════════════════════════════════════════════════════
class AudioMixer:
    """Mix TTS audio clips into a video at correct timestamps using ffmpeg."""

    def __init__(self, ffmpeg: str):
        self.ffmpeg = ffmpeg

    def mix(
        self,
        video_path: Path,
        tts_clips: list[dict],
        output_path: Path,
        keep_bg_music: bool,
        bg_volume: float,
    ) -> tuple[bool, str]:
        """
        Mix TTS clips into video.

        Each clip dict must have: {"path": Path, "start": float, ...}
        delay_ms = int(clip["start"] * 1000)

        Returns (True, "") on success, (False, error_msg) on failure.
        """
        if not tts_clips:
            return False, "No TTS clips"

        video_path = Path(video_path)
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with tempfile.TemporaryDirectory(prefix="audiomix_") as tmpdir:
            tmpdir = Path(tmpdir)
            tmp_video = tmpdir / "input.mp4"
            shutil.copy2(str(video_path), str(tmp_video))

            # Build inputs list and filter_complex
            inputs = ["-i", str(tmp_video)]
            filter_parts = []
            mix_labels = []

            for j, clip in enumerate(tts_clips):
                inputs += ["-i", str(clip["path"])]
                delay_ms = int(clip["start"] * 1000)
                filter_parts.append(
                    f"[{j + 1}:a]adelay={delay_ms}|{delay_ms}[d{j}]"
                )
                mix_labels.append(f"[d{j}]")

            n_mix = len(mix_labels)
            filter_parts.append(
                f"{''.join(mix_labels)}amix=inputs={n_mix}:duration=longest:dropout_transition=0[tts_mix]"
            )

            if keep_bg_music:
                orig_audio = tmpdir / "orig_audio.wav"
                run_ffmpeg([
                    self.ffmpeg, "-i", str(tmp_video),
                    "-vn", "-acodec", "pcm_s16le", "-ar", "44100", "-ac", "2",
                    str(orig_audio), "-y", "-loglevel", "error"
                ])
                if orig_audio.exists():
                    bg_idx = len(tts_clips) + 1
                    inputs += ["-i", str(orig_audio)]
                    filter_parts.append(
                        f"[{bg_idx}:a]volume={bg_volume}[bg];"
                        f"[tts_mix][bg]amix=inputs=2:duration=first:dropout_transition=0[final_audio]"
                    )
                    final_label = "[final_audio]"
                else:
                    final_label = "[tts_mix]"
            else:
                final_label = "[tts_mix]"

            filter_complex = ";".join(filter_parts)

            # video input is always the last -i (tmp_video is inputs[1] at index 0)
            # We re-add tmp_video as the video source at the end for clean mapping
            video_input_idx = 0  # tmp_video is the first input

            cmd = [self.ffmpeg] + inputs + [
                "-filter_complex", filter_complex,
                "-map", f"{video_input_idx}:v",
                "-map", final_label,
                "-c:v", "copy",
                "-c:a", "aac", "-b:a", "128k",
                str(output_path), "-y", "-loglevel", "error"
            ]
            ok, err = run_ffmpeg(cmd, "audio mix")
            if not ok:
                return False, f"ffmpeg mix failed: {err}"

        return True, ""


# ══════════════════════════════════════════════════════════════════════════════
# Main pipeline: process_video_full
# ══════════════════════════════════════════════════════════════════════════════
def process_video_full(data: dict) -> Generator[str, None, None]:
    """
    Full pipeline generator (yields NDJSON lines for streaming).
    data keys:
      video_path, model, language, out_dir,
      burn_subs, blur_original, blur_zone, blur_height_pct,
      font_size, font_color, margin_v,
      voice_convert, tts_voice, tts_engine, keep_bg_music, bg_volume,
      translate_provider (for ZH→VI translation)
    """
    import json as _j

    def send(**kw):
        return _j.dumps(kw, ensure_ascii=False) + "\n"

    video_path = Path(data.get("video_path", "")).expanduser()
    if not video_path.exists():
        yield send(log=f"File not found: {video_path}", level="error")
        return

    ffmpeg = find_ffmpeg()
    if not ffmpeg:
        yield send(log="ffmpeg not found. Install ffmpeg and add to PATH.", level="error")
        return

    out_dir = Path(data.get("out_dir", "")).expanduser() if data.get("out_dir") else video_path.parent
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = _safe_stem(video_path.stem)

    do_burn = data.get("burn_subs", True)
    do_voice = data.get("voice_convert", False)
    # Default: always translate to VI and burn VI subtitles
    do_translate = data.get("translate_subs", True)
    do_burn_vi   = data.get("burn_vi_subs", True)
    model_name = data.get("model", "base")
    language = data.get("language", "zh")
    process_mode = str(data.get("process_mode", "ai") or "ai").strip().lower()
    transcribe_provider = str(data.get("transcribe_provider", "") or "").strip().lower()
    if not transcribe_provider:
        transcribe_provider = "model" if process_mode == "model" else "groq"

    yield send(log=f"Processing: {video_path.name}", level="info")
    yield send(overall=5, overall_lbl="Starting...")

    # ── Step 1: Transcribe ────────────────────────────────────────────────────
    if transcribe_provider == "model":
        yield send(log=f"Transcribing via local Whisper model ({model_name})...", level="info")
    else:
        yield send(log="Transcribing via Groq Whisper API...", level="info")
    yield send(overall=10, overall_lbl="Transcribing...")

    srt_path = out_dir / f"{stem}.srt"
    segments = []

    try:
        import yaml
        cfg_file = Path(__file__).parent.parent / "config.yml"
        cfg_raw = yaml.safe_load(cfg_file.read_text(encoding="utf-8")) if cfg_file.exists() else {}
        tr_cfg = cfg_raw.get("transcript", {}) or {}
        if transcribe_provider == "model":
            transcriber = FasterWhisperTranscriber(model_name, language, use_vad=True)
        else:
            groq_key = (
                str(data.get("groq_api_key") or "").strip()
                or os.getenv("GROQ_API_KEY", "").strip()
                or str(tr_cfg.get("groq_api_key") or "").strip()
            )
            groq_model = str(data.get("groq_model") or tr_cfg.get("groq_model") or _GROQ_MODEL).strip() or _GROQ_MODEL
            groq_max_mb = int(data.get("groq_max_mb") or tr_cfg.get("groq_max_mb") or _GROQ_MAX_MB)

            transcriber = GroqWhisperTranscriber(
                language=language,
                api_key=groq_key,
                model=groq_model,
                max_mb=groq_max_mb,
            )
        segments = transcriber.transcribe(video_path, ffmpeg, srt_path)
        if not segments:
            yield send(log="No speech detected in video", level="warning")
            return
        yield send(log=f"Transcribed {len(segments)} segments → {srt_path.name}", level="success")
        yield send(overall=35, overall_lbl=f"Transcribed {len(segments)} segments")
    except RuntimeError as e:
        yield send(log=f"Transcription failed: {e}", level="error")
        return
    except Exception as e:
        yield send(log=f"Transcription failed: {e}", level="error")
        return

    # ── Step 2: Translate ZH → VI (always by default) ────────────────────────
    translated_texts = []
    if do_translate or do_voice:
        yield send(log="Translating to Vietnamese...", level="info")
        yield send(overall=45, overall_lbl="Translating...")
        try:
            from utils.translation import BatchTranslator
            trans_cfg = cfg_raw.get("translation", {})
            if not trans_cfg.get("groq_key"):
                trans_cfg["groq_key"] = (
                    str(data.get("groq_api_key") or "").strip()
                    or os.getenv("GROQ_API_KEY", "").strip()
                    or str(tr_cfg.get("groq_api_key") or "").strip()
                )
            if not trans_cfg.get("groq_model"):
                trans_cfg["groq_model"] = (
                    str(data.get("groq_model") or "").strip()
                    or str(tr_cfg.get("groq_model") or "").strip()
                    or "llama-3.1-8b-instant"
                )
            req_provider = str(data.get("translate_provider") or "").strip().lower()
            cfg_provider = str(trans_cfg.get("preferred_provider") or "").strip().lower()
            # Treat "auto" as unspecified so config/provider key can decide deterministically.
            if req_provider == "auto":
                req_provider = ""
            if cfg_provider == "auto":
                cfg_provider = ""
            provider = req_provider or cfg_provider or ("deepseek" if trans_cfg.get("deepseek_key") else "auto")
            texts = [seg.get("text", "").strip() for seg in segments]
            translator = BatchTranslator(trans_cfg)
            translated_texts, used = translator.translate(texts, provider)
            yield send(log=f"Translated {len(translated_texts)} segments (provider: {used})", level="success")
            yield send(overall=55, overall_lbl="Translation done")

            if translated_texts:
                vi_srt_path = out_dir / f"{stem}_vi.srt"
                translator.write_vi_srt(segments, translated_texts, vi_srt_path)
                yield send(log=f"Vietnamese SRT saved: {vi_srt_path.name}", level="success")
                if do_burn and do_burn_vi:
                    srt_path = vi_srt_path
        except Exception as e:
            yield send(log=f"Translation failed: {e}", level="warning")
            translated_texts = []

    # ── Step 3: Burn subtitles ────────────────────────────────────────────────
    burned_path = None
    if do_burn:
        yield send(log="Burning subtitles into video...", level="info")
        yield send(overall=65, overall_lbl="Burning subtitles...")
        burned_path = out_dir / f"{stem}_subbed.mp4"
        ok, err = burn_subtitles(
            video_path=video_path,
            srt_path=srt_path,
            output_path=burned_path,
            ffmpeg=ffmpeg,
            blur_original=data.get("blur_original", True),
            blur_zone=data.get("blur_zone", "bottom"),
            blur_height_pct=float(data.get("blur_height_pct", 0.15)),
            font_size=int(data.get("font_size", 18)),
            font_color=data.get("font_color", "white"),
            outline_color=data.get("outline_color", "black"),
            outline_width=int(data.get("outline_width", 2)),
            margin_v=int(data.get("margin_v", 30)),
            subtitle_position=data.get("subtitle_position", "bottom"),
        )
        if ok:
            yield send(log=f"Subtitled video saved: {burned_path.name}", level="success")
            yield send(overall=80, overall_lbl="Subtitles burned")
        else:
            yield send(log=f"Subtitle burn failed: {err}", level="error")
            burned_path = None

    # ── Step 4: Voice conversion ──────────────────────────────────────────────
    if do_voice and translated_texts:
        yield send(log="Generating Vietnamese voice...", level="info")
        yield send(overall=85, overall_lbl="Generating voice...")
        source_for_voice = burned_path if burned_path else video_path
        voice_path = out_dir / f"{stem}_vi_voice.mp4"
        try:
            with tempfile.TemporaryDirectory(prefix="tts_") as tts_tmpdir:
                tts = MultiProviderTTS(
                    voice=data.get("tts_voice", "vi-VN-HoaiMyNeural"),
                    engine=data.get("tts_engine", "edge-tts"),
                )
                tts_clips = asyncio.run(tts.generate_all(segments, translated_texts, Path(tts_tmpdir)))
                mixer = AudioMixer(ffmpeg)
                ok, err = mixer.mix(
                    video_path=source_for_voice,
                    tts_clips=tts_clips,
                    output_path=voice_path,
                    keep_bg_music=data.get("keep_bg_music", True),
                    bg_volume=float(data.get("bg_volume", 0.15)),
                )
            if ok:
                yield send(log=f"Voice converted: {voice_path.name}", level="success")
                yield send(overall=98, overall_lbl="Voice done")
            else:
                yield send(log=f"Voice conversion failed: {err}", level="error")
        except Exception as e:
            yield send(log=f"Voice conversion error: {e}", level="error")

    yield send(log="Done!", level="success")
    yield send(overall=100, overall_lbl="Complete")
