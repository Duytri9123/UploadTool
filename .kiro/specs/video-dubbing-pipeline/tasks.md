# Implementation Plan: Video Dubbing Pipeline

## Overview

Refactor `core/video_processor.py` và `utils/translation.py` để thay thế `openai-whisper` bằng `faster-whisper`, bổ sung `BatchTranslator`, `MultiProviderTTS`, và `AudioMixer` dưới dạng các class riêng biệt. Toàn bộ pipeline giữ nguyên interface `process_video_full(data: dict)` và streaming NDJSON.

## Tasks

- [x] 1. Cập nhật dependencies
  - Thêm `faster-whisper>=1.0.0` vào `requirements.txt`
  - Thêm `edge-tts>=6.1.0`, `gtts>=2.5.0`, `pydub>=0.25.0` vào `requirements.txt`
  - Thêm `hypothesis>=6.0.0` vào `requirements.txt` (cho property tests)
  - _Requirements: 1.2, 6.1_

- [x] 2. Implement FasterWhisperTranscriber
  - [x] 2.1 Tạo class `FasterWhisperTranscriber` trong `core/video_processor.py`
    - Constructor nhận `model_name: str`, `language: str`, `use_vad: bool = True`
    - Load model với `compute_type="int8"` và `device="cpu"`
    - Method `transcribe(video_path: Path, ffmpeg: str, out_srt: Path) -> list[dict]`
    - Trả về list segments `[{"start": float, "end": float, "text": str}]`
    - Ghi SRT file ra `out_srt`
    - Raise `RuntimeError` nếu audio extraction thất bại
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 2.2 Viết property test cho FasterWhisperTranscriber
    - **Property 1: Segment ordering** — với bất kỳ output hợp lệ, `segments[i].start <= segments[i].end` và `segments[i].end <= segments[i+1].start`
    - **Validates: Requirements 1.1**

- [x] 3. Implement BatchTranslator
  - [x] 3.1 Tạo class `BatchTranslator` trong `utils/translation.py`
    - Constructor nhận `trans_cfg: dict`
    - Method `translate(texts: list[str], preferred_provider: str = "auto") -> tuple[list[str], str]`
    - Tái sử dụng logic `translate_texts()` hiện có, wrap vào class
    - Method `write_vi_srt(segments: list[dict], translations: list[str], out_path: Path)` để ghi SRT tiếng Việt
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.2 Viết property test cho BatchTranslator
    - **Property 2: Output length preservation** — `len(output) == len(input)` với mọi input list
    - **Property 3: Fallback identity** — khi tất cả providers fail, output[i] == input[i]
    - **Validates: Requirements 2.3, 2.4**

- [x] 4. Implement MultiProviderTTS
  - [x] 4.1 Tạo class `MultiProviderTTS` trong `core/video_processor.py`
    - Constructor nhận `voice: str = "vi-VN-HoaiMyNeural"`, `engine: str = "edge-tts"`
    - Async method `generate(text: str, out_path: Path) -> bool`
    - Thử Edge-TTS trước, fallback sang gTTS nếu thất bại
    - Skip segment (return False) nếu cả hai đều fail, không raise exception
    - Async method `generate_all(segments: list[dict], translations: list[str], tmpdir: Path) -> list[dict]`
    - Dùng `asyncio.gather` để generate concurrent, trả về list `{"path", "start", "end"}`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 4.2 Viết property test cho MultiProviderTTS
    - **Property 4: Non-empty output on success** — nếu `generate()` trả về True thì file tồn tại và `size > 0`
    - **Validates: Requirements 3.3**

- [x] 5. Implement AudioMixer
  - [x] 5.1 Tạo class `AudioMixer` trong `core/video_processor.py`
    - Constructor nhận `ffmpeg: str`
    - Method `mix(video_path: Path, tts_clips: list[dict], output_path: Path, keep_bg_music: bool, bg_volume: float) -> tuple[bool, str]`
    - Build `filter_complex` với `adelay` cho từng clip theo `start` timestamp (ms)
    - Nếu `keep_bg_music=True`: extract original audio, mix ở `bg_volume`
    - Nếu `tts_clips` rỗng: return `(False, "No TTS clips")` — caller emit error NDJSON
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 5.2 Viết property test cho AudioMixer
    - **Property 5: Delay alignment** — delay_ms cho clip i bằng `int(clip.start * 1000)`
    - **Validates: Requirements 4.2**

- [x] 6. Checkpoint — Đảm bảo các class hoạt động độc lập
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Refactor `process_video_full()` để dùng 4 components mới
  - [x] 7.1 Thay `transcribe_to_srt()` bằng `FasterWhisperTranscriber`
    - Khởi tạo `FasterWhisperTranscriber(model_name, language, use_vad=True)`
    - Gọi `.transcribe(video_path, ffmpeg, srt_path)`
    - Emit error NDJSON và return nếu transcription fail
    - _Requirements: 1.1, 1.5, 5.1, 5.2, 5.4, 5.5_

  - [x] 7.2 Thay inline translation bằng `BatchTranslator`
    - Khởi tạo `BatchTranslator(trans_cfg)` với config load từ `config.yml`
    - Gọi `.translate(texts, preferred_provider)` và `.write_vi_srt()`
    - _Requirements: 2.1, 2.5, 2.6, 6.2, 6.3_

  - [x] 7.3 Thay `convert_voice()` bằng `MultiProviderTTS` + `AudioMixer`
    - Khởi tạo `MultiProviderTTS(voice, engine)` và gọi `.generate_all()`
    - Khởi tạo `AudioMixer(ffmpeg)` và gọi `.mix()`
    - Emit error NDJSON nếu `AudioMixer.mix()` trả về False
    - _Requirements: 3.1, 3.2, 4.1, 4.5, 5.4, 6.4, 6.6_

  - [x] 7.4 Đảm bảo tất cả NDJSON events đúng format và overall% đúng thứ tự
    - Kiểm tra các event: `overall`, `overall_lbl`, `log`, `level`
    - overall tăng dần từ 5 → 100, emit `overall=100` khi hoàn thành
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 7.5 Đảm bảo backward compatibility với input keys hiện tại
    - Giữ nguyên tất cả input keys: `video_path`, `model`, `language`, `burn_subs`, `blur_original`, `voice_convert`, `tts_voice`, `tts_engine`, `keep_bg_music`, `bg_volume`, `translate_provider`
    - Output files: `{stem}_subbed.mp4` và `{stem}_vi_voice.mp4`
    - _Requirements: 6.1, 6.4, 6.5, 6.6_

- [x] 8. Viết tests
  - [x] 8.1 Tạo `tests/test_translation.py` với unit tests cho `BatchTranslator`
    - Test fallback chain khi provider fail
    - Test output order preservation
    - Test empty input handling
    - _Requirements: 2.2, 2.3, 2.4_

  - [x] 8.2 Viết property tests cho `BatchTranslator` dùng hypothesis
    - **Property 2: Output length preservation**
    - **Property 3: Fallback identity**
    - **Validates: Requirements 2.3, 2.4**

  - [x] 8.3 Tạo `tests/test_video_processor.py` với unit tests cho các components
    - Test `FasterWhisperTranscriber` với mock audio
    - Test `MultiProviderTTS.generate_all()` với mock edge-tts
    - Test `AudioMixer.mix()` với mock ffmpeg
    - _Requirements: 1.1, 3.3, 4.1_

  - [x] 8.4 Viết property tests cho pipeline components dùng hypothesis
    - **Property 1: Segment ordering**
    - **Property 4: Non-empty output on success**
    - **Property 5: Delay alignment**
    - **Validates: Requirements 1.1, 3.3, 4.2**

- [x] 9. Final checkpoint — Đảm bảo toàn bộ pipeline hoạt động
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks đánh dấu `*` là optional, có thể bỏ qua để MVP nhanh hơn
- `FasterWhisperTranscriber` thay thế hoàn toàn `transcribe_to_srt()` và import `whisper`
- `BatchTranslator` wrap `translate_texts()` hiện có — không xóa function gốc để tránh breaking change
- Các class mới nằm trong file hiện tại (`core/video_processor.py`, `utils/translation.py`) để tránh thay đổi import paths
- Property tests dùng `hypothesis` với `@given` decorator
