# Requirements: Voice Cloning TTS Pipeline

## Introduction

Tài liệu này mô tả các yêu cầu chức năng và phi chức năng cho tính năng Voice Cloning TTS Pipeline, được dẫn xuất từ design document. Pipeline cho phép người dùng upload video, tách audio, clone giọng nói qua MiniMax API, và tổng hợp giọng nói (TTS) bằng giọng đã clone.

---

## Requirements

### Requirement 1: Tách Audio từ Video

**User Story**: Là người dùng, tôi muốn upload một video và nhận lại file audio (MP3) được tách ra từ video đó, để tôi có thể dùng làm sample cho voice cloning hoặc lưu trữ độc lập.

#### Acceptance Criteria

1.1. GIVEN người dùng upload một file video hợp lệ (MP4, AVI, MOV, MKV) có chứa audio track, WHEN gọi endpoint `POST /api/voice-clone/extract-audio`, THEN hệ thống phải trả về `{ ok: true, audio_url: "...", duration: <float> }` và file MP3 phải tồn tại, có `size > 0`.

1.2. GIVEN video upload không có audio track, WHEN gọi endpoint extract-audio, THEN hệ thống phải trả về `{ ok: false, error: "Video không có audio track" }` với HTTP 400.

1.3. GIVEN file upload không phải định dạng video hợp lệ, WHEN gọi endpoint extract-audio, THEN hệ thống phải từ chối với HTTP 400 và thông báo lỗi rõ ràng.

1.4. GIVEN file upload vượt quá 500MB, WHEN gọi endpoint extract-audio, THEN hệ thống phải từ chối với HTTP 413.

1.5. GIVEN ffmpeg không tìm thấy trong PATH, WHEN gọi bất kỳ endpoint nào cần ffmpeg, THEN hệ thống phải trả về `{ ok: false, error: "ffmpeg không tìm thấy" }`.

---

### Requirement 2: Clone Voice qua MiniMax API

**User Story**: Là người dùng, tôi muốn tạo một voice profile mới từ audio sample đã tách, để tôi có thể dùng giọng đó cho TTS sau này.

#### Acceptance Criteria

2.1. GIVEN audio sample hợp lệ (10-300 giây) và MiniMax API key hợp lệ, WHEN gọi `clone_voice()`, THEN hệ thống phải trả về `(True, voice_id, "")` với `voice_id` không rỗng.

2.2. GIVEN audio sample ngắn hơn 10 giây, WHEN gọi `clone_voice()`, THEN hệ thống phải trả về `(False, "", "Audio quá ngắn, cần ít nhất 10 giây")` mà không gọi MiniMax API.

2.3. GIVEN audio sample dài hơn 300 giây, WHEN gọi `clone_voice()`, THEN hệ thống phải trả về `(False, "", "Audio quá dài, tối đa 300 giây")` mà không gọi MiniMax API.

2.4. GIVEN MiniMax API trả về lỗi (HTTP 4xx/5xx), WHEN gọi `clone_voice()`, THEN hệ thống phải retry tối đa 3 lần với exponential backoff trước khi trả về lỗi.

2.5. GIVEN `voice_name` chứa ký tự đặc biệt không hợp lệ, WHEN gọi `clone_voice()`, THEN hệ thống phải trả về lỗi validation trước khi gọi API.

2.6. GIVEN clone voice thành công, WHEN pipeline hoàn thành, THEN `voice_id` phải được trả về trong response của endpoint upload.

---

### Requirement 3: TTS bằng Giọng Đã Clone

**User Story**: Là người dùng, tôi muốn nhập văn bản và nhận lại file audio được tổng hợp bằng giọng nói đã clone, để tôi có thể dùng trong video dubbing.

#### Acceptance Criteria

3.1. GIVEN `voice_id` hợp lệ và `text` không rỗng, WHEN gọi `POST /api/voice-clone/tts`, THEN hệ thống phải trả về `{ ok: true, audio_url: "..." }` và file MP3 phải tồn tại với `size > 1KB`.

3.2. GIVEN `text` rỗng, WHEN gọi endpoint TTS, THEN hệ thống phải trả về `{ ok: false, error: "Text không được rỗng" }` với HTTP 400.

3.3. GIVEN `voice_id` không tồn tại hoặc đã bị xóa, WHEN gọi endpoint TTS, THEN hệ thống phải trả về `{ ok: false, error: "Voice ID không hợp lệ" }` với HTTP 400.

3.4. GIVEN `speed` nằm ngoài khoảng [0.5, 2.0], WHEN gọi endpoint TTS, THEN hệ thống phải clamp giá trị về khoảng hợp lệ (không trả về lỗi).

3.5. GIVEN `pitch` nằm ngoài khoảng [-12, 12], WHEN gọi endpoint TTS, THEN hệ thống phải clamp giá trị về khoảng hợp lệ.

3.6. GIVEN TTS thành công, WHEN người dùng gọi `GET /api/voice-clone/download/<filename>`, THEN hệ thống phải trả về file MP3 với `Content-Type: audio/mpeg`.

---

### Requirement 4: Full Pipeline Upload → Clone → TTS

**User Story**: Là người dùng, tôi muốn thực hiện toàn bộ pipeline (upload video → tách audio → clone voice → TTS) trong một lần gọi API, để tiết kiệm thời gian.

#### Acceptance Criteria

4.1. GIVEN video hợp lệ, `voice_name` hợp lệ, và `tts_text` không rỗng, WHEN gọi `POST /api/voice-clone/upload`, THEN hệ thống phải thực hiện tuần tự: tách audio → clone voice → TTS, và trả về `{ ok: true, voice_id, audio_url, tts_url }`.

4.2. GIVEN pipeline đang chạy, WHEN bất kỳ bước nào thất bại, THEN hệ thống phải dừng pipeline, trả về error message rõ ràng chỉ rõ bước nào thất bại.

4.3. GIVEN `tts_text` không được cung cấp, WHEN gọi endpoint upload, THEN hệ thống chỉ thực hiện tách audio và clone voice (bỏ qua bước TTS), trả về `{ ok: true, voice_id, audio_url, tts_url: null }`.

4.4. GIVEN pipeline hoàn thành (thành công hoặc thất bại), WHEN sau 1 giờ, THEN các file tạm trong `temp_uploads/{job_id}/` phải được tự động xóa.

---

### Requirement 5: Quản lý Cloned Voices

**User Story**: Là người dùng, tôi muốn xem danh sách các voice đã clone và xóa những voice không cần thiết.

#### Acceptance Criteria

5.1. WHEN gọi `GET /api/voice-clone/voices`, THEN hệ thống phải trả về `{ ok: true, voices: [{ voice_id, name, created_at }] }`.

5.2. GIVEN `voice_id` hợp lệ, WHEN gọi `DELETE /api/voice-clone/voices/<voice_id>`, THEN hệ thống phải xóa voice trên MiniMax và trả về `{ ok: true }`.

5.3. GIVEN `voice_id` không tồn tại, WHEN gọi DELETE endpoint, THEN hệ thống phải trả về `{ ok: false, error: "Voice không tồn tại" }` với HTTP 404.

---

### Requirement 6: Cấu hình MiniMax API

**User Story**: Là người dùng, tôi muốn cấu hình MiniMax API key trong `config.yml`, để pipeline có thể sử dụng đúng credentials.

#### Acceptance Criteria

6.1. GIVEN `config.yml` có section `minimax` với `api_key`, WHEN khởi tạo `VoiceCloner`, THEN nó phải đọc API key từ config (không hardcode).

6.2. GIVEN `MINIMAX_API_KEY` environment variable được set, WHEN khởi tạo `VoiceCloner`, THEN env var phải được ưu tiên hơn config file.

6.3. GIVEN không có API key nào được cấu hình, WHEN gọi bất kỳ endpoint voice cloning nào, THEN hệ thống phải trả về `{ ok: false, error: "MiniMax API key chưa được cấu hình" }`.

---

### Requirement 7: Bảo mật và Validation

**User Story**: Là developer, tôi muốn đảm bảo pipeline xử lý file upload an toàn, tránh các lỗ hổng bảo mật.

#### Acceptance Criteria

7.1. GIVEN tên file upload chứa path traversal (`../`, `../../`), WHEN xử lý upload, THEN hệ thống phải dùng `secure_filename()` để sanitize tên file.

7.2. GIVEN file upload có MIME type không phải video, WHEN xử lý upload, THEN hệ thống phải từ chối với HTTP 400.

7.3. GIVEN MiniMax API key trong config, WHEN trả về response từ bất kỳ endpoint nào, THEN API key không được xuất hiện trong response body hoặc logs.

7.4. GIVEN mỗi upload request, WHEN tạo thư mục temp, THEN phải dùng UUID làm tên thư mục để tránh conflict giữa các request đồng thời.

---

### Requirement 8: HuggingFace TTS Engine

**User Story**: Là người dùng, tôi muốn dùng HuggingFace TTS (ví dụ `facebook/mms-tts-vie`) như một TTS engine thay thế trong pipeline xử lý video, để có thêm lựa chọn tổng hợp giọng nói không phụ thuộc vào FPT-AI hay edge-tts.

#### Acceptance Criteria

8.1. GIVEN `tts_engine: huggingface` được cấu hình trong `video_process`, WHEN pipeline xử lý video chạy bước TTS, THEN hệ thống phải dùng `HuggingFaceTTS.synthesize()` thay vì FPT-AI hoặc edge-tts.

8.2. GIVEN `huggingface.hf_token` để trống trong config, WHEN khởi tạo `HuggingFaceTTS`, THEN hệ thống phải fallback sang `translation.hf_token` đã có trong config.

8.3. GIVEN không có HF token nào được cấu hình, WHEN gọi `HuggingFaceTTS.synthesize()`, THEN hệ thống phải trả về `(False, "HuggingFace token chưa được cấu hình")`.

8.4. GIVEN `text` rỗng, WHEN gọi `HuggingFaceTTS.synthesize()`, THEN hệ thống phải trả về `(False, "Text không được rỗng")` mà không load model.

8.5. GIVEN `huggingface.tts_model` được set (ví dụ `facebook/mms-tts-vie`), WHEN `synthesize()` được gọi lần đầu, THEN model phải được load từ HuggingFace Hub và cache lại cho các lần gọi tiếp theo.

8.6. GIVEN `huggingface.device: cuda` nhưng CUDA không khả dụng, WHEN khởi tạo `HuggingFaceTTS`, THEN hệ thống phải tự động fallback sang `cpu` và log warning.
