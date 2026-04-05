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


FPT_TTS_ENDPOINT = "https://api.fpt.ai/hmi/tts/v5"
FPT_TTS_DEFAULT_KEY = "ssMeU5l89LMLfg8jhDzTBWV7D22s1xOy"


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


def get_media_duration_seconds(ffmpeg: str, media_path: Path) -> float:
    """Best-effort duration parser from ffmpeg stderr output."""
    try:
        r = subprocess.run(
            [ffmpeg, "-i", str(media_path), "-f", "null", "-"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
        )
        for line in (r.stderr or "").splitlines():
            m = re.search(r"Duration:\s*(\d+):(\d+):([\d.]+)", line)
            if m:
                return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))
    except Exception:
        pass
    return 0.0


def _safe_stem(stem: str) -> str:
    stem = stem.replace("\n", " ").replace("\r", " ")
    stem = re.sub(r'[<>:"/\\|?*#]', '_', stem)
    stem = re.sub(r'[\s_]+', '_', stem)
    return stem.strip('_ ')[:150]


def _as_bool(value, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return bool(value)
    txt = str(value).strip().lower()
    if txt in {"1", "true", "yes", "y", "on"}:
        return True
    if txt in {"0", "false", "no", "n", "off", ""}:
        return False
    return default


def _as_int(value, default: int) -> int:
    try:
        return int(value)
    except Exception:
        return default


def _as_float(value, default: float) -> float:
    try:
        return float(value)
    except Exception:
        return default


def _clamp_float(value: float, low: float, high: float) -> float:
    try:
        v = float(value)
    except Exception:
        v = low
    return max(low, min(high, v))


def _fmt_hms(seconds: float) -> str:
    total = max(0.0, float(seconds))
    h, r = divmod(total, 3600)
    m, s = divmod(r, 60)
    return f"{int(h):02d}:{int(m):02d}:{s:05.2f}"


def has_audio_track(video_path: Path, ffmpeg: str) -> bool:
    """Check if video has at least one audio stream."""
    try:
        video_path = Path(video_path)
        r = subprocess.run(
            [ffmpeg, "-i", str(video_path)],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=5,
        )
        stderr = r.stderr or ""
        # Look for "Audio: " in ffmpeg output
        return "Audio:" in stderr
    except Exception:
        return False


# ── SRT helpers ───────────────────────────────────────────────────────────────
def _fmt_srt_time(seconds: float) -> str:
    h, r = divmod(seconds, 3600)
    m, r = divmod(r, 60)
    s = int(r)
    ms = int((r - s) * 1000)
    return f"{int(h):02d}:{int(m):02d}:{s:02d},{ms:03d}"


def _fmt_ass_time(seconds: float) -> str:
    """Format seconds → ASS timestamp h:mm:ss.cs"""
    h, r = divmod(seconds, 3600)
    m, r = divmod(r, 60)
    s = int(r)
    cs = int((r - s) * 100)
    return f"{int(h)}:{int(m):02d}:{s:02d}.{cs:02d}"


def write_ass(segments: list[dict], out_path: Path,
              font_size: int = 32, font_color: str = "white",
              outline_color: str = "black", outline_width: int = 2,
              shadow: int = 1, margin_v: int = 20,
              alignment: int = 2) -> Path:
    """
    Write ASS subtitle file from segments list.
    alignment: 2=bottom-center, 8=top-center
    """
    primary  = f"&H00{_hex_color(font_color)}"
    outline  = f"&H00{_hex_color(outline_color)}"
    shadow_c = "&H80000000"

    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 720
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,{font_size},{primary},&H000000FF,{outline},{shadow_c},0,0,0,0,100,100,0,0,1,{outline_width},{shadow},{alignment},10,10,{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = [header]
    for seg in segments:
        start = _fmt_ass_time(seg["start"])
        end   = _fmt_ass_time(seg["end"])
        text  = seg.get("text", "").replace("\n", "\\N")
        lines.append(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{text}")

    out_path = Path(out_path)
    out_path.write_text("\n".join(lines), encoding="utf-8")
    return out_path


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
    blur_width_pct: float = 0.80,
    blur_lift_pct: float = 0.06,
    font_size: int = 18,
    font_color: str = "white",
    outline_color: str = "black",
    outline_width: int = 2,
    margin_v: int = 30,
    subtitle_position: str = "bottom",
    subtitle_format: str = "srt",
) -> tuple[bool, str]:
    """
    Burn subtitles into video.
    If subtitle_format='ass': use ASS filter (no blur needed, faster).
    If subtitle_format='srt': use SRT with optional blur strip.
    """
    # ASS path — fast, supports blur
    if str(subtitle_format).lower() == "ass":
        return _burn_ass(video_path, srt_path, output_path, ffmpeg,
                         font_size, font_color, outline_color, outline_width,
                         margin_v, subtitle_position,
                         blur_original, blur_zone, blur_height_pct, blur_width_pct, blur_lift_pct)

    # SRT path (original logic)
    return _burn_srt(video_path, srt_path, output_path, ffmpeg,
                     blur_original, blur_zone, blur_height_pct, blur_width_pct, blur_lift_pct,
                     font_size, font_color, outline_color, outline_width,
                     margin_v, subtitle_position)


def _burn_ass(
    video_path: Path,
    ass_path: Path,
    output_path: Path,
    ffmpeg: str,
    font_size: int = 32,
    font_color: str = "white",
    outline_color: str = "black",
    outline_width: int = 2,
    margin_v: int = 20,
    subtitle_position: str = "bottom",
    blur_original: bool = False,
    blur_zone: str = "bottom",
    blur_height_pct: float = 0.15,
    blur_width_pct: float = 0.80,
    blur_lift_pct: float = 0.06,
) -> tuple[bool, str]:
    """Burn ASS subtitle file into video. Optionally blur a zone to hide burned-in original subs."""
    video_path  = Path(video_path)
    ass_path    = Path(ass_path)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="burn_ass_") as tmpdir:
        tmp_video = Path(tmpdir) / "input.mp4"
        tmp_ass   = Path(tmpdir) / "subs.ass"
        tmp_out   = Path(tmpdir) / "output.mp4"

        shutil.copy2(str(video_path), str(tmp_video))

        # If input is SRT, convert to ASS on the fly
        if ass_path.suffix.lower() == ".srt":
            segs = _parse_srt(ass_path)
            alignment = 8 if str(subtitle_position).lower() == "top" else 2
            tmp_ass = write_ass(segs, tmp_ass, font_size=font_size,
                                font_color=font_color, outline_color=outline_color,
                                outline_width=outline_width, margin_v=margin_v,
                                alignment=alignment)
        else:
            shutil.copy2(str(ass_path), str(tmp_ass))

        ass_esc = str(tmp_ass).replace("\\", "/")
        if len(ass_esc) >= 2 and ass_esc[1] == ':':
            ass_esc = ass_esc[0] + "\\:" + ass_esc[2:]

        # Single-pass pipeline: blur zone (optional) + burn ASS in one encode.
        if blur_original and blur_zone != "none":
            h_pct = _clamp_float(blur_height_pct, 0.08, 0.45)
            w_pct = max(0.35, min(1.0, float(blur_width_pct)))
            lift_pct = _clamp_float(blur_lift_pct, 0.0, 0.20)
            if blur_zone == "bottom":
                y_start = max(0.0, 1.0 - h_pct - lift_pct)
                filter_complex = (
                    f"[0:v]split[orig][copy];"
                    f"[copy]crop=iw*{w_pct:.4f}:ih*{h_pct:.4f}:iw*(1-{w_pct:.4f})/2:ih*{y_start:.4f},"
                    f"boxblur=luma_radius=20:luma_power=3[blurred];"
                    f"[orig][blurred]overlay=(W-w)/2:H*{y_start:.4f},ass='{ass_esc}'[vout]"
                )
            else:  # top
                filter_complex = (
                    f"[0:v]split[orig][copy];"
                    f"[copy]crop=iw*{w_pct:.4f}:ih*{h_pct:.4f}:iw*(1-{w_pct:.4f})/2:0,"
                    f"boxblur=luma_radius=20:luma_power=3[blurred];"
                    f"[orig][blurred]overlay=(W-w)/2:0,ass='{ass_esc}'[vout]"
                )

            ok, err = run_ffmpeg([
                ffmpeg, "-i", str(tmp_video),
                "-filter_complex", filter_complex,
                "-map", "[vout]", "-map", "0:a?",
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
                "-c:a", "copy",
                str(tmp_out), "-y", "-loglevel", "error"
            ])
        else:
            ok, err = run_ffmpeg([
                ffmpeg, "-i", str(tmp_video),
                "-vf", f"ass='{ass_esc}'",
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
                "-c:a", "copy",
                str(tmp_out), "-y", "-loglevel", "error"
            ])

        if ok and tmp_out.exists():
            shutil.copy2(str(tmp_out), str(output_path))
            return True, ""
        return False, err


def _burn_srt(
    video_path: Path,
    srt_path: Path,
    output_path: Path,
    ffmpeg: str,
    blur_original: bool = True,
    blur_zone: str = "bottom",
    blur_height_pct: float = 0.15,
    blur_width_pct: float = 0.80,
    blur_lift_pct: float = 0.06,
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

            h_pct = _clamp_float(blur_height_pct, 0.08, 0.45)
            w_pct = max(0.35, min(1.0, float(blur_width_pct)))
            lift_pct = _clamp_float(blur_lift_pct, 0.0, 0.20)
            if blur_zone == "bottom":
                y_start = max(0.0, 1.0 - h_pct - lift_pct)
                # crop bottom strip, blur it, pad back, overlay
                crop_filter = (
                    f"[0:v]split[orig][copy];"
                    f"[copy]crop=iw*{w_pct:.4f}:ih*{h_pct:.4f}:iw*(1-{w_pct:.4f})/2:ih*{y_start:.4f},"
                    f"boxblur=luma_radius=20:luma_power=3[blurred];"
                    f"[orig][blurred]overlay=(W-w)/2:H*{y_start:.4f}[blended]"
                )
            else:  # top
                crop_filter = (
                    f"[0:v]split[orig][copy];"
                    f"[copy]crop=iw*{w_pct:.4f}:ih*{h_pct:.4f}:iw*(1-{w_pct:.4f})/2:0,"
                    f"boxblur=luma_radius=20:luma_power=3[blurred];"
                    f"[orig][blurred]overlay=(W-w)/2:0[blended]"
                )

            ok, err = run_ffmpeg([
                ffmpeg, "-i", str(tmp_video),
                "-filter_complex", crop_filter,
                "-map", "[blended]", "-map", "0:a?",
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
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
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
                "-c:a", "copy",
                str(tmp_out), "-y", "-loglevel", "error"
            ])
        else:
            # No blur - just burn subtitles directly
            ok, err = run_ffmpeg([
                ffmpeg, "-i", str(tmp_video),
                "-vf", f"subtitles='{srt_esc}':force_style='{sub_style}'",
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
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

    def __init__(
        self,
        voice: str = "vi-VN-HoaiMyNeural",
        engine: str = "edge-tts",
        fpt_api_key: str = "",
        fpt_speed: int = 0,
    ):
        self.voice = voice
        self.engine = engine
        self.fpt_api_key = (fpt_api_key or "").strip()
        self.fpt_speed = int(fpt_speed)

    async def generate(self, text: str, out_path: Path) -> bool:
        """
        Generate TTS audio for text, writing to out_path.
        Tries Edge-TTS first, falls back to gTTS.
        Returns False (without raising) if both providers fail.
        """
        out_path = Path(out_path)

        # Explicit engine selection
        if str(self.engine).strip().lower() == "fpt-ai":
            try:
                ok = await _tts_fpt_ai(text, self.voice, out_path, self.fpt_api_key, self.fpt_speed)
                if ok:
                    return True
            except Exception:
                pass

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
        max_concurrency: int = 2,
        retries: int = 2,
    ) -> list[dict]:
        """
        Generate TTS for all segments with bounded concurrency.
        Returns list of {"path": Path, "start": float, "end": float}
        only for successfully generated segments.
        """
        tmpdir = Path(tmpdir)
        sem = asyncio.Semaphore(max(1, int(max_concurrency)))

        async def _gen_one(i: int, seg: dict, text: str):
            if not text or not text.strip():
                return None
            out_path = tmpdir / f"tts_{i:04d}.mp3"
            # Bound parallel requests to avoid provider throttling.
            async with sem:
                for _attempt in range(max(1, int(retries) + 1)):
                    ok = await self.generate(text.strip(), out_path)
                    if ok:
                        return {"path": out_path, "start": seg["start"], "end": seg["end"]}
                    # Small exponential backoff helps with temporary TTS throttling.
                    await asyncio.sleep(0.25 * (_attempt + 1))
            return None

        tasks = [
            _gen_one(i, seg, text)
            for i, (seg, text) in enumerate(zip(segments, translations))
        ]
        results = await asyncio.gather(*tasks)
        clips = [r for r in results if r is not None]
        clips.sort(key=lambda c: float(c.get("start", 0.0)))
        return clips


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


async def _tts_fpt_ai(
    text: str,
    voice: str,
    out_path: Path,
    api_key: str = "",
    speed: int = 0,
) -> bool:
    """Generate TTS audio using FPT AI TTS v5 (Vietnamese voices)."""
    import aiohttp

    key = (api_key or "").strip() or os.getenv("FPT_AI_API_KEY", "").strip() or FPT_TTS_DEFAULT_KEY
    if not key:
        raise RuntimeError("Missing FPT AI API key")

    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    payload = str(text or "").strip()
    if not payload:
        return False

    # FPT commonly uses lowercase voice keys like banmai, leminh, myan...
    fpt_voice = str(voice or "banmai").strip().lower()
    headers = {
        "api-key": key,
        "voice": fpt_voice,
        "speed": str(int(speed)),
        "format": "mp3",
    }

    timeout = aiohttp.ClientTimeout(total=90)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        async with session.post(FPT_TTS_ENDPOINT, data=payload.encode("utf-8"), headers=headers) as resp:
            if resp.status != 200:
                raise RuntimeError(f"FPT TTS request failed: status={resp.status}, body={await resp.text()}")
            data = await resp.json(content_type=None)

        audio_url = str((data or {}).get("async") or (data or {}).get("url") or "").strip()
        if not audio_url:
            raise RuntimeError(f"FPT TTS missing async URL: {data}")

        # Poll async URL until audio is ready.
        for attempt in range(24):
            await asyncio.sleep(0.5)
            async with session.get(audio_url) as aresp:
                if aresp.status != 200:
                    continue
                ctype = str(aresp.headers.get("Content-Type") or "").lower()
                blob = await aresp.read()
                # When not ready yet, some gateways may return JSON/text instead of audio.
                if "audio" not in ctype and blob[:1] in (b"{", b"["):
                    continue
                if blob:
                    out_path.write_bytes(blob)
                    return out_path.exists() and out_path.stat().st_size > 0

    return False


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
        tts_volume: float,
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

            video_duration = get_media_duration_seconds(self.ffmpeg, tmp_video)
            if video_duration <= 0:
                video_duration = max(float(c.get("start", 0.0)) for c in tts_clips) + 8.0

            # Create a silent base track so amix always has stable timeline from t=0.
            silent_path = tmpdir / "silent.wav"
            ok_silent, err_silent = run_ffmpeg([
                self.ffmpeg,
                "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
                "-t", str(video_duration),
                str(silent_path), "-y", "-loglevel", "error"
            ])
            if not ok_silent or not silent_path.exists():
                return False, f"failed to create silent base: {err_silent}"

            # Build inputs list and filter_complex
            inputs = ["-i", str(tmp_video), "-i", str(silent_path)]
            filter_parts = []
            mix_labels = []

            for j, clip in enumerate(tts_clips):
                inputs += ["-i", str(clip["path"])]
                delay_ms = int(clip["start"] * 1000)
                filter_parts.append(
                    f"[{j + 2}:a]adelay={delay_ms}|{delay_ms}[d{j}]"
                )
                mix_labels.append(f"[d{j}]")

            # Mix all delayed clips with a silent base of full video duration.
            n_mix = len(mix_labels) + 1
            filter_parts.append(
                f"[1:a]{''.join(mix_labels)}amix=inputs={n_mix}:duration=first:dropout_transition=0:normalize=0[tts_raw]"
            )
            # Boost dubbed voice so it is clearly above background/original sound.
            filter_parts.append(f"[tts_raw]volume={max(0.1, float(tts_volume)):.3f}[tts_mix]")

            if keep_bg_music:
                orig_audio = tmpdir / "orig_audio.wav"
                run_ffmpeg([
                    self.ffmpeg, "-i", str(tmp_video),
                    "-vn", "-acodec", "pcm_s16le", "-ar", "44100", "-ac", "2",
                    str(orig_audio), "-y", "-loglevel", "error"
                ])
                if orig_audio.exists():
                    bg_idx = len(tts_clips) + 2
                    inputs += ["-i", str(orig_audio)]
                    filter_parts.append(
                        f"[{bg_idx}:a]volume={bg_volume}[bg];"
                        f"[tts_mix][bg]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,aresample=async=1:first_pts=0[final_audio]"
                    )
                    final_label = "[final_audio]"
                else:
                    final_label = "[tts_mix]"
            else:
                final_label = "[tts_mix]"

            filter_complex = ";".join(filter_parts)

            cmd = [self.ffmpeg] + inputs + [
                "-filter_complex", filter_complex,
                "-map", "0:v:0",
                "-map", final_label,
                "-c:v", "copy",
                "-c:a", "aac", "-b:a", "128k",
                "-shortest",
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
    video_title = str(data.get("video_title") or "").strip()
    stem_source = video_title or video_path.stem
    stem = _safe_stem(stem_source)

    do_burn = _as_bool(data.get("burn_subs", True), True)
    do_voice = _as_bool(data.get("voice_convert", False), False)
    cleanup_outputs = _as_bool(data.get("cleanup_outputs", True), True)
    delete_source_after = _as_bool(data.get("delete_source_after_process", False), False)
    # Default: always translate to VI and burn VI subtitles
    do_translate = _as_bool(data.get("translate_subs", True), True)
    do_burn_vi = _as_bool(data.get("burn_vi_subs", True), True)
    model_name = data.get("model", "base")
    language = data.get("language", "zh")
    process_mode = str(data.get("process_mode", "ai") or "ai").strip().lower()
    transcribe_provider = str(data.get("transcribe_provider", "") or "").strip().lower()
    if not transcribe_provider:
        transcribe_provider = "model" if process_mode == "model" else "groq"

    subtitle_pos = str(data.get("subtitle_position", "bottom")).lower()
    blur_zone = str(data.get("blur_zone", "bottom")).lower()
    blur_enabled = _as_bool(data.get("blur_original", True), True)
    blur_height_pct = _clamp_float(_as_float(data.get("blur_height_pct", 0.15), 0.15), 0.08, 0.45)
    blur_lift_pct = _clamp_float(_as_float(data.get("blur_lift_pct", 0.06), 0.06), 0.0, 0.20)

    effective_margin_v = _as_int(data.get("margin_v", 20), 20)
    if subtitle_pos == "bottom":
        # Keep subtitle around the center of the (possibly lifted) bottom blur strip.
        auto_margin = int(720 * (blur_height_pct * 0.5 + (blur_lift_pct if (blur_enabled and blur_zone == "bottom") else 0.0)))
        effective_margin_v = max(effective_margin_v + 8, auto_margin)

    vi_ass_path = None
    final_output_path = None

    yield send(log=f"[Bước 1/4] Phiên âm: {video_path.name}", level="info")
    yield send(overall=5, overall_lbl="Bắt đầu...")

    # ── Step 1: Transcribe ────────────────────────────────────────────────────
    # Check video audio first
    has_audio = has_audio_track(video_path, ffmpeg)
    if not has_audio:
        yield send(log=f"[Bước 1/4] ⚠ Video không có audio track", level="warning")
    
    if transcribe_provider == "model":
        yield send(log=f"[Bước 1/4] Đang phiên âm bằng Whisper local ({model_name})...", level="info")
    else:
        yield send(log="[Bước 1/4] Đang phiên âm bằng Groq Whisper API...", level="info")
    yield send(overall=10, overall_lbl="Đang phiên âm...")

    ass_path = out_dir / f"{stem}.ass"  # dùng ASS thay SRT
    source_srt_path = out_dir / f"{stem}.srt"  # transcriber output gốc
    srt_path = source_srt_path  # file dùng cho bước burn (có thể đổi sang vi_ass)
    segments = []
    transcribe_failed = False

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
        segments = transcriber.transcribe(video_path, ffmpeg, source_srt_path)
        if not segments:
            transcribe_failed = True
            yield send(log="[Bước 1/4] ⚠ Không phát hiện giọng nói trong video", level="warning")
            # ─ Fallback: Kiểm tra nếu user muốn TTS + burn phụ đề
            if not (do_voice or do_burn):
                yield send(log="[Bước 1/4] ✗ Không có giọng nói và TTS/burn phụ đề cũng bị tắt", level="error")
                return
            # ─ Nếu chỉ muốn burn phụ đề mà không TTS, hãy skip transcribe
            if do_burn and not do_voice:
                yield send(log="[Bước 1/4] ℹ Sẽ chỉ burn phụ đề, bỏ qua phiên âm", level="info")
                segments = []  # Empty segments — sẽ skip TTS later
            else:
                # Tạo empty segments với duration từ video metadata
                video_duration = get_media_duration_seconds(ffmpeg, video_path)
                if video_duration > 0:
                    segments = [{"start": 0.0, "end": video_duration, "text": "[Giọng nói tự động]"}]
                    yield send(log=f"[Bước 1/4] ℹ Tạo 1 segment tự động (0s → {video_duration:.1f}s)", level="info")
                else:
                    yield send(log="[Bước 1/4] ✗ Không thể tính được thời lượng video", level="error")
                    return
        else:
            # Convert transcription to ASS
            write_ass(segments, ass_path)
            yield send(log=f"[Bước 1/4] ✓ Phiên âm {len(segments)} đoạn → {ass_path.name}", level="success")
        
        yield send(overall=35, overall_lbl=f"Phiên âm xong: {len(segments)} đoạn")
    except RuntimeError as e:
        transcribe_failed = True
        yield send(log=f"[Bước 1/4] ⚠ Phiên âm thất bại: {e}", level="warning")
        # Fallback tương tự như trên
        if not (do_voice or do_burn):
            yield send(log="[Bước 1/4] ✗ Không có giọng nói và TTS/burn phụ đề cũng bị tắt", level="error")
            return
        if do_burn and not do_voice:
            yield send(log="[Bước 1/4] ℹ Sẽ chỉ burn phụ đề", level="info")
            segments = []
        else:
            video_duration = get_media_duration_seconds(ffmpeg, video_path)
            if video_duration > 0:
                segments = [{"start": 0.0, "end": video_duration, "text": "[Giọng nói tự động]"}]
                yield send(log=f"[Bước 1/4] ℹ Tạo fallback segment (0s → {video_duration:.1f}s)", level="info")
            else:
                yield send(log="[Bước 1/4] ✗ Không thể tính được thời lượng video", level="error")
                return
    except Exception as e:
        transcribe_failed = True
        yield send(log=f"[Bước 1/4] ⚠ Lỗi phiên âm: {e}", level="warning")
        if not (do_voice or do_burn):
            return
        if do_burn and not do_voice:
            segments = []
        else:
            video_duration = get_media_duration_seconds(ffmpeg, video_path)
            if video_duration > 0:
                segments = [{"start": 0.0, "end": video_duration, "text": "[Giọng nói tự động]"}]
            else:
                return

    # ── Step 2: Translate ZH → VI ─────────────────────────────────────────────
    translated_texts = []
    if (do_translate or do_voice) and segments:
        n_segs = len(segments)
        batch_sz = 30
        n_batches = (n_segs + batch_sz - 1) // batch_sz
        yield send(log=f"[Bước 2/4] Dịch {n_segs} đoạn sang tiếng Việt ({n_batches} batch)...", level="info")
        yield send(overall=45, overall_lbl=f"Đang dịch {n_segs} đoạn...")
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
            has_ds = bool(trans_cfg.get("deepseek_key"))
            has_groq = bool(trans_cfg.get("groq_key"))
            yield send(log=f"[Bước 2/4] Provider: {provider} | deepseek={'✓' if has_ds else '✗'} | groq={'✓' if has_groq else '✗'}", level="info")
            translator = BatchTranslator(trans_cfg)
            translated_texts, used = translator.translate(texts, provider)
            yield send(log=f"[Bước 2/4] ✓ Dịch xong {len(translated_texts)} đoạn (provider: {used})", level="success")
            yield send(overall=55, overall_lbl="Dịch xong")

            if translated_texts:
                # Luôn dùng ASS — không dùng SRT
                alignment = 8 if str(data.get("subtitle_position", "bottom")).lower() == "top" else 2
                vi_ass_path = out_dir / f"{stem}_vi.ass"
                vi_segs = [{"start": s["start"], "end": s["end"], "text": t}
                           for s, t in zip(segments, translated_texts) if t]
                write_ass(vi_segs, vi_ass_path,
                          font_size=_as_int(data.get("font_size", 32), 32),
                          font_color=data.get("font_color", "white"),
                          outline_color=data.get("outline_color", "black"),
                          outline_width=_as_int(data.get("outline_width", 2), 2),
                          margin_v=effective_margin_v,
                          alignment=alignment)
                yield send(log=f"[Bước 2/4] ✓ ASS tiếng Việt: {vi_ass_path.name}", level="success")

                if do_burn and do_burn_vi:
                    srt_path = vi_ass_path
                    yield send(log=f"[Bước 2/4] Sẽ burn: {srt_path.name}", level="info")
        except Exception as e:
            yield send(log=f"[Bước 2/4] ✗ Dịch thất bại: {e}", level="error")
            translated_texts = []

    # ── Step 3: Burn subtitles ────────────────────────────────────────────────
    burned_path = None
    if do_burn and srt_path.exists():
        yield send(log=f"[Bước 3/4] Đang burn phụ đề ASS vào video...", level="info")
        yield send(overall=65, overall_lbl="Đang burn phụ đề...")
        burned_path = out_dir / f"{stem}_subbed.mp4"
        ok, err = burn_subtitles(
            video_path=video_path,
            srt_path=srt_path,
            output_path=burned_path,
            ffmpeg=ffmpeg,
            blur_original=_as_bool(data.get("blur_original", True), True),
            blur_zone=data.get("blur_zone", "bottom"),
            blur_height_pct=_as_float(data.get("blur_height_pct", 0.15), 0.15),
            blur_width_pct=_as_float(data.get("blur_width_pct", 0.80), 0.80),
            blur_lift_pct=_as_float(data.get("blur_lift_pct", 0.06), 0.06),
            font_size=_as_int(data.get("font_size", 32), 32),
            font_color=data.get("font_color", "white"),
            outline_color=data.get("outline_color", "black"),
            outline_width=_as_int(data.get("outline_width", 2), 2),
            margin_v=effective_margin_v,
            subtitle_position=data.get("subtitle_position", "bottom"),
            subtitle_format="ass",  # luôn dùng ASS
        )
        if ok:
            yield send(log=f"[Bước 3/4] ✓ Video có phụ đề: {burned_path.name}", level="success")
            yield send(overall=80, overall_lbl="Burn phụ đề xong")
            final_output_path = burned_path
        else:
            yield send(log=f"[Bước 3/4] ✗ Burn thất bại: {err}", level="error")
            burned_path = None
    elif do_burn and not srt_path.exists():
        yield send(log="[Bước 3/4] ⚠ Không có file phụ đề để burn", level="warning")
    else:
        yield send(log="[Bước 3/4] ℹ Bỏ qua burn phụ đề", level="info")

    # ── Step 4: Voice conversion ──────────────────────────────────────────────
    if do_voice and translated_texts:
        yield send(log="[Bước 4/4] Đang tạo giọng tiếng Việt...", level="info")
        yield send(overall=85, overall_lbl="Đang tạo giọng nói...")
        source_for_voice = burned_path if burned_path else video_path
        voice_path = out_dir / f"{stem}_vi_voice.mp4"
        try:
            with tempfile.TemporaryDirectory(prefix="tts_") as tts_tmpdir:
                tts = MultiProviderTTS(
                    voice=data.get("tts_voice", "vi-VN-HoaiMyNeural"),
                    engine=data.get("tts_engine", "edge-tts"),
                    fpt_api_key=(
                        str(data.get("fpt_api_key") or "").strip()
                        or str((cfg_raw.get("video_process") or {}).get("fpt_api_key") or "").strip()
                        or os.getenv("FPT_AI_API_KEY", "").strip()
                        or FPT_TTS_DEFAULT_KEY
                    ),
                    fpt_speed=_as_int(data.get("fpt_speed", 0), 0),
                )
                tts_clips = asyncio.run(
                    tts.generate_all(
                        segments,
                        translated_texts,
                        Path(tts_tmpdir),
                        max_concurrency=_as_int(data.get("tts_concurrency", 2), 2),
                        retries=_as_int(data.get("tts_retries", 2), 2),
                    )
                )
                yield send(
                    log=f"[Bước 4/4] TTS clips thành công: {len(tts_clips)}/{len(translated_texts)}",
                    level="info",
                )
                if tts_clips:
                    first_start = float(tts_clips[0].get("start", 0.0))
                    last_end = max(float(c.get("end", 0.0)) for c in tts_clips)
                    coverage_ratio = 0.0
                    if segments:
                        src_end = max(float(s.get("end", 0.0)) for s in segments)
                        if src_end > 0:
                            coverage_ratio = min(100.0, max(0.0, (last_end / src_end) * 100.0))
                    yield send(
                        log=(
                            f"[Bước 4/4] Độ phủ timeline giọng: "
                            f"{_fmt_hms(first_start)} → {_fmt_hms(last_end)} "
                            f"(~{coverage_ratio:.1f}% thời lượng thoại)"
                        ),
                        level="info",
                    )
                if len(tts_clips) < max(1, int(len(translated_texts) * 0.2)):
                    yield send(
                        log="[Bước 4/4] Cảnh báo: quá ít clip TTS, có thể bị giới hạn dịch vụ. Hãy thử lại hoặc giảm tốc độ tạo giọng.",
                        level="warning",
                    )
                mixer = AudioMixer(ffmpeg)
                ok, err = mixer.mix(
                    video_path=source_for_voice,
                    tts_clips=tts_clips,
                    output_path=voice_path,
                    keep_bg_music=_as_bool(data.get("keep_bg_music", False), False),
                    bg_volume=_as_float(data.get("bg_volume", 0.08), 0.08),
                    tts_volume=_as_float(data.get("tts_volume", 1.8), 1.8),
                )
            if ok:
                yield send(log=f"[Bước 4/4] ✓ Giọng tiếng Việt: {voice_path.name}", level="success")
                yield send(overall=98, overall_lbl="Tạo giọng xong")
                final_output_path = voice_path
            else:
                yield send(log=f"[Bước 4/4] ✗ Tạo giọng thất bại: {err}", level="error")
        except Exception as e:
            yield send(log=f"[Bước 4/4] ✗ Lỗi tạo giọng: {e}", level="error")

    if cleanup_outputs and final_output_path and final_output_path.exists():
        for extra in (source_srt_path, srt_path, ass_path, vi_ass_path, burned_path):
            try:
                if extra and Path(extra).exists() and Path(extra).resolve() != final_output_path.resolve():
                    Path(extra).unlink()
            except Exception:
                pass

        if delete_source_after:
            try:
                src = Path(video_path)
                if src.exists() and src.resolve() != final_output_path.resolve():
                    src.unlink()
            except Exception:
                pass

        yield send(log=f"[Hoàn tất] File cuối cùng: {final_output_path.name}", level="success", file_path=str(final_output_path.resolve()))

    yield send(log="✅ Hoàn tất!", level="success")
    yield send(overall=100, overall_lbl="Hoàn tất")
