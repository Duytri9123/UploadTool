# Tasks: Voice Cloning TTS Pipeline

## Task List

- [ ] 1. Tạo module `core/voice_cloner.py`
  - [ ] 1.1 Định nghĩa class `VoiceCloner` với constructor nhận `api_key` và `tts_model`
  - [ ] 1.2 Implement `clone_voice()`: validate audio duration, gọi MiniMax `/v1/voice_clone` với multipart form, retry 3 lần
  - [ ] 1.3 Implement `tts_with_cloned_voice()`: gọi MiniMax `/v1/t2a_v2` với `voice_id` tùy chỉnh, decode hex audio, ghi file MP3
  - [ ] 1.4 Implement `list_cloned_voices()`: gọi MiniMax `/v1/get_voice`
  - [ ] 1.5 Implement `delete_cloned_voice()`: gọi MiniMax delete endpoint
  - [ ] 1.6 Đọc API key từ config.yml (`minimax.api_key`) và env var `MINIMAX_API_KEY`

- [ ] 2. Thêm Flask routes vào `app.py`
  - [ ] 2.1 `POST /api/voice-clone/extract-audio`: nhận video upload, gọi `extract_audio_only()`, trả về audio URL
  - [ ] 2.2 `POST /api/voice-clone/upload`: full pipeline (extract → clone → optional TTS), chạy trong background thread với SocketIO progress
  - [ ] 2.3 `POST /api/voice-clone/tts`: nhận `voice_id` + `text`, gọi `tts_with_cloned_voice()`, trả về audio URL
  - [ ] 2.4 `GET /api/voice-clone/voices`: trả về danh sách cloned voices
  - [ ] 2.5 `DELETE /api/voice-clone/voices/<voice_id>`: xóa voice
  - [ ] 2.6 `GET /api/voice-clone/download/<filename>`: serve file MP3 từ temp_uploads

- [ ] 3. Cập nhật `config.yml` và `config/default_config.py`
  - [ ] 3.1 Thêm section `minimax` vào `config.yml` với `api_key`, `tts_model`
  - [ ] 3.2 Thêm default values cho minimax config trong `default_config.py`

- [ ] 4. Validation và Error Handling
  - [ ] 4.1 Validate MIME type và extension của file upload (chỉ chấp nhận video formats)
  - [ ] 4.2 Validate file size <= 500MB
  - [ ] 4.3 Validate audio duration (10-300s) trước khi gọi clone API
  - [ ] 4.4 Implement temp file cleanup (TTL 1 giờ) bằng background thread

- [ ] 5. Tests
  - [ ] 5.1 Unit test `VoiceCloner.clone_voice()` với mock aiohttp
  - [ ] 5.2 Unit test `VoiceCloner.tts_with_cloned_voice()` với mock response
  - [ ] 5.3 Unit test validation logic (duration, voice_name, text empty)
  - [ ] 5.4 Test Flask endpoints với `test_client()`

- [x] 6. Thêm HuggingFace TTS engine (`core/hf_tts.py`)
  - [x] 6.1 Tạo file `core/hf_tts.py` với class `HuggingFaceTTS`
    - Constructor nhận `hf_token`, `tts_model`, `device`, `speaker_embeddings_path` (optional)
    - Method `synthesize(text: str, out_path: Path, language: str = "vi") -> tuple[bool, str]`
    - Load model từ HuggingFace Hub dùng `transformers` pipeline (`text-to-speech`)
    - Hỗ trợ model `facebook/mms-tts-vie` (Vietnamese) và `microsoft/speecht5_tts`
    - Với `speecht5_tts`: load speaker embeddings từ `datasets` hoặc file local nếu `speaker_embeddings_path` được cung cấp
    - Ghi output audio ra file WAV rồi convert sang MP3 bằng ffmpeg
    - _Requirements: 6.1, 6.2, 6.3_
  - [ ]* 6.2 Viết unit test cho `HuggingFaceTTS.synthesize()` với mock transformers pipeline
    - Test trường hợp `text` rỗng → trả về `(False, error)`
    - Test trường hợp model load thất bại → trả về `(False, error)`
    - _Requirements: 6.1_

- [x] 7. Thêm config `huggingface` section vào `config.yml` và `default_config.py`
  - [x] 7.1 Thêm section `huggingface` vào `config/default_config.py` với các fields:
    - `hf_token`: `""` (sẽ fallback sang `translation.hf_token`)
    - `tts_model`: `"facebook/mms-tts-vie"`
    - `tts_speaker_embeddings`: `""` (optional, đường dẫn local)
    - `device`: `"cpu"`
    - _Requirements: 6.1_
  - [x] 7.2 Thêm section `huggingface` vào `config.yml` với giá trị thực tế:
    - `hf_token`: để trống (dùng `translation.hf_token` đã có)
    - `tts_model`: `"facebook/mms-tts-vie"`
    - `tts_speaker_embeddings`: `""`
    - `device`: `"cpu"`
    - _Requirements: 6.1_

- [x] 8. Tích hợp `HuggingFaceTTS` vào `MultiProviderTTS` trong `video_processor.py`
  - [x] 8.1 Import `HuggingFaceTTS` từ `core/hf_tts.py` trong `video_processor.py`
  - [x] 8.2 Trong `MultiProviderTTS` (hoặc hàm TTS dispatch tương đương), thêm nhánh `tts_engine == "huggingface"`:
    - Đọc config `huggingface` từ config loader
    - Resolve `hf_token`: ưu tiên `huggingface.hf_token`, fallback sang `translation.hf_token`
    - Khởi tạo `HuggingFaceTTS` và gọi `synthesize(text, out_path, language)`
    - _Requirements: 6.1, 6.2, 6.3_
  - [ ]* 8.3 Viết unit test cho nhánh `huggingface` trong TTS dispatch với mock `HuggingFaceTTS`
    - _Requirements: 6.1_

- [x] 9. Thêm UI option cho HF TTS trong `templates/components/page_process.html`
  - [x] 9.1 Trong dropdown/select `tts_engine`, thêm option `<option value="huggingface">HuggingFace TTS</option>` bên cạnh `fpt-ai` và `edge-tts`
  - [x] 9.2 Thêm section config HF TTS (ẩn/hiện theo `tts_engine == "huggingface"`):
    - Input `huggingface.tts_model` (text input, default `facebook/mms-tts-vie`)
    - Input `huggingface.device` (select: `cpu` / `cuda`)
    - Input `huggingface.tts_speaker_embeddings` (text input, optional)
    - _Requirements: 6.1_

- [x] 10. Thêm Flask route để list available HF TTS models
  - [x] 10.1 Thêm route `GET /api/hf-tts/models` vào `app.py`:
    - Trả về danh sách các model HF TTS được hỗ trợ: `facebook/mms-tts-vie`, `microsoft/speecht5_tts`, v.v.
    - Response: `{ ok: true, models: [{ id: str, name: str, language: str }] }`
    - _Requirements: 6.1_

- [x] 11. Checkpoint — Đảm bảo tất cả tests pass
  - Ensure all tests pass, ask the user if questions arise.
