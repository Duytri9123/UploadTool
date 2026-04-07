# Requirements Document

## Introduction

Tính năng chống fingerprint video (Video Anti-Fingerprint) cho phép người dùng thêm một lớp ảnh overlay
bán trong suốt phủ toàn bộ video và một logo thương hiệu ở góc video. Mục đích là khi các bot/hệ thống
quét nội dung video, chúng sẽ nhận diện lớp overlay thay vì nội dung video gốc, giúp tránh bị phát hiện
fingerprint. Tính năng này được tích hợp vào pipeline xử lý video hiện có trong `core/video_processor.py`
và có thể cấu hình qua `config.yml` hoặc GUI.

## Glossary

- **Video_Processor**: Module `core/video_processor.py` xử lý video bằng ffmpeg
- **Overlay_Image**: Ảnh tĩnh do người dùng cung cấp, được phủ toàn bộ lên video với độ mờ thấp
- **Opacity**: Độ mờ của lớp overlay, tính theo phần trăm (0% = hoàn toàn trong suốt, 100% = đục hoàn toàn)
- **Logo_Image**: Ảnh logo thương hiệu do người dùng cung cấp, hiển thị ở góc video
- **Logo_Position**: Vị trí đặt logo: `top-left`, `top-right`, `bottom-left`, `bottom-right`
- **Anti_Fingerprint_Pipeline**: Bước xử lý chống fingerprint trong pipeline video
- **Config**: File `config.yml`, section `video_process`
- **ffmpeg**: Công cụ xử lý video/audio dòng lệnh

## Requirements

### Requirement 1: Thêm lớp Overlay ảnh bán trong suốt

**User Story:** As a content creator, I want to apply a semi-transparent image overlay on top of my video,
so that fingerprint scanning bots detect the overlay image instead of the original video content.

#### Acceptance Criteria

1. WHEN người dùng cung cấp đường dẫn `overlay_image` hợp lệ trong config và `anti_fingerprint.enabled` là `true`, THE Video_Processor SHALL phủ Overlay_Image lên toàn bộ khung hình video với Opacity mặc định là 2%.
2. THE Video_Processor SHALL hỗ trợ Overlay_Image ở các định dạng PNG, JPG, JPEG, và WEBP.
3. THE Video_Processor SHALL tự động scale Overlay_Image để khớp với kích thước (width × height) của video gốc trước khi áp dụng overlay.
4. WHEN giá trị `overlay_opacity` được cấu hình trong config, THE Video_Processor SHALL sử dụng giá trị đó thay cho giá trị mặc định, với phạm vi hợp lệ từ 0.01 đến 1.0.
5. IF đường dẫn `overlay_image` không tồn tại hoặc không phải định dạng được hỗ trợ, THEN THE Video_Processor SHALL bỏ qua bước overlay, ghi log cảnh báo, và tiếp tục pipeline mà không dừng xử lý.
6. WHERE `anti_fingerprint.enabled` là `false`, THE Video_Processor SHALL bỏ qua toàn bộ bước Anti_Fingerprint_Pipeline.

### Requirement 2: Thêm Logo thương hiệu ở góc video

**User Story:** As a content creator, I want to display a brand logo at a corner of my video,
so that my content is identifiable and branded.

#### Acceptance Criteria

1. WHEN người dùng cung cấp đường dẫn `logo_image` hợp lệ và `anti_fingerprint.logo_enabled` là `true`, THE Video_Processor SHALL đặt Logo_Image tại vị trí góc video được chỉ định bởi `logo_position`.
2. THE Video_Processor SHALL hỗ trợ các giá trị `logo_position`: `top-left`, `top-right`, `bottom-left`, `bottom-right`, với giá trị mặc định là `bottom-left`.
3. THE Video_Processor SHALL resize Logo_Image sao cho chiều rộng logo không vượt quá 15% chiều rộng video, giữ nguyên tỉ lệ khung hình (aspect ratio) của logo.
4. THE Video_Processor SHALL áp dụng padding 10 pixel giữa logo và cạnh video.
5. IF đường dẫn `logo_image` không tồn tại hoặc không hợp lệ, THEN THE Video_Processor SHALL bỏ qua bước logo, ghi log cảnh báo, và tiếp tục pipeline.
6. WHERE `anti_fingerprint.logo_enabled` là `false`, THE Video_Processor SHALL không thêm logo vào video.

### Requirement 3: Tích hợp vào pipeline xử lý video hiện có

**User Story:** As a developer, I want the anti-fingerprint step to integrate seamlessly into the existing
video processing pipeline, so that it works together with subtitle burning and voice conversion without
requiring separate manual steps.

#### Acceptance Criteria

1. THE Video_Processor SHALL thực hiện bước Anti_Fingerprint_Pipeline sau khi hoàn thành bước burn subtitles và voice conversion.
2. THE Video_Processor SHALL thực hiện overlay ảnh và logo trong một lần encode ffmpeg duy nhất để tối ưu hiệu suất.
3. WHEN cả `overlay_image` và `logo_image` đều được cung cấp, THE Video_Processor SHALL áp dụng cả hai trong cùng một lệnh ffmpeg filter_complex.
4. THE Video_Processor SHALL bảo toàn audio track gốc (hoặc audio đã được voice-convert) khi thực hiện bước Anti_Fingerprint_Pipeline.
5. IF bước Anti_Fingerprint_Pipeline thất bại, THEN THE Video_Processor SHALL ghi log lỗi chi tiết và trả về video từ bước trước đó (không mất output).

### Requirement 4: Cấu hình qua config.yml

**User Story:** As a user, I want to configure the anti-fingerprint feature through the config file,
so that I can enable/disable and customize the feature without modifying code.

#### Acceptance Criteria

1. THE Config SHALL hỗ trợ section `video_process.anti_fingerprint` với các trường: `enabled` (bool), `overlay_image` (string path), `overlay_opacity` (float), `logo_enabled` (bool), `logo_image` (string path), `logo_position` (string).
2. WHEN `video_process.anti_fingerprint` không có trong config, THE Video_Processor SHALL sử dụng giá trị mặc định: `enabled=false`, `overlay_opacity=0.02`, `logo_enabled=false`, `logo_position=bottom-left`.
3. THE Config SHALL cho phép đường dẫn ảnh là đường dẫn tuyệt đối hoặc tương đối so với thư mục gốc của project.

### Requirement 5: Hỗ trợ cấu hình qua GUI

**User Story:** As a user, I want to configure the anti-fingerprint feature through the GUI,
so that I can easily browse and select overlay/logo images without editing config files manually.

#### Acceptance Criteria

1. THE GUI SHALL hiển thị các trường cấu hình Anti_Fingerprint_Pipeline trong tab hoặc section "Video Processing".
2. THE GUI SHALL cung cấp nút "Browse" để người dùng chọn file ảnh cho `overlay_image` và `logo_image`.
3. WHEN người dùng thay đổi cấu hình anti-fingerprint trong GUI, THE GUI SHALL lưu thay đổi vào `config.yml` ngay lập tức.
4. THE GUI SHALL hiển thị preview tên file đã chọn cho `overlay_image` và `logo_image`.
