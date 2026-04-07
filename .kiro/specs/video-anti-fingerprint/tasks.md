# Implementation Plan: Video Anti-Fingerprint

## Overview

Tích hợp tính năng chống fingerprint video vào pipeline hiện có bằng cách thêm các hàm helper và hàm chính vào `core/video_processor.py`, cập nhật config, và bổ sung UI trong GUI.

## Tasks

- [x] 1. Thêm helper `_resolve_image_path()` vào `core/video_processor.py`
  - Implement hàm nhận `image_path: str` và `project_root: Path`, resolve đường dẫn tuyệt đối hoặc tương đối
  - Kiểm tra file tồn tại và extension thuộc `{.png, .jpg, .jpeg, .webp}` (case-insensitive)
  - Trả về `Optional[Path]`: `Path` hợp lệ nếu pass, `None` nếu không hợp lệ
  - _Requirements: 1.2, 1.5, 2.5, 4.3_

  - [ ]* 1.1 Viết property test cho `_resolve_image_path()` (Property 2)
    - **Property 2: Image path validation**
    - **Validates: Requirements 1.2, 4.3**
    - Dùng `@given(st.text(), st.sampled_from([".png", ".jpg", ".jpeg", ".webp", ".mp4", ".txt", ""]))` với temp files
    - Kiểm tra: trả về `Path` khi file tồn tại + extension hợp lệ, `None` với mọi trường hợp còn lại

- [x] 2. Thêm helper `_build_anti_fingerprint_filter()` vào `core/video_processor.py`
  - Implement hàm nhận `has_overlay`, `overlay_opacity`, `has_logo`, `logo_position`, `logo_max_width_pct`, `logo_padding`, `n_extra_inputs`
  - Trả về `tuple[str, list[str]]`: filter_complex string và danh sách output labels
  - Logic 3 nhánh: chỉ overlay / chỉ logo / cả hai — theo đúng filter_complex trong design
  - Logo position mapping: `top-left→(P,P)`, `top-right→(W-w-P,P)`, `bottom-left→(P,H-h-P)`, `bottom-right→(W-w-P,H-h-P)`
  - Fallback `logo_position` không hợp lệ về `"bottom-left"`
  - _Requirements: 1.3, 2.1, 2.2, 2.3, 2.4, 3.2, 3.3_

  - [ ]* 2.1 Viết property test cho overlay scale filter (Property 3)
    - **Property 3: Overlay scale filter**
    - **Validates: Requirements 1.3**
    - Dùng `@given(st.floats(min_value=0.01, max_value=1.0))` — kiểm tra `"scale2ref"` có trong filter string khi `has_overlay=True`

  - [ ]* 2.2 Viết property test cho logo position filter (Property 4)
    - **Property 4: Logo position filter expression**
    - **Validates: Requirements 2.1, 2.2, 2.4**
    - Dùng `@given(st.sampled_from(["top-left","top-right","bottom-left","bottom-right"]), st.integers(min_value=0, max_value=50))`
    - Kiểm tra overlay expression chứa đúng offset `(P,P)`, `(W-w-P,P)`, `(P,H-h-P)`, `(W-w-P,H-h-P)`

  - [ ]* 2.3 Viết property test cho logo scale constraint (Property 5)
    - **Property 5: Logo scale constraint**
    - **Validates: Requirements 2.3**
    - Dùng `@given(st.floats(min_value=0.05, max_value=0.5))` — kiểm tra filter chứa `scale=iw*{pct}:-1`

- [x] 3. Thêm hàm chính `apply_anti_fingerprint()` vào `core/video_processor.py`
  - Implement hàm nhận `video_path`, `output_path`, `ffmpeg`, `overlay_image`, `overlay_opacity`, `logo_image`, `logo_position`, `logo_max_width_pct=0.15`, `logo_padding=10`
  - Gọi `_resolve_image_path()` cho cả overlay và logo; log warning và bỏ qua nếu không hợp lệ
  - Gọi `_build_anti_fingerprint_filter()` để tạo filter_complex
  - Nếu không có overlay lẫn logo hợp lệ: return `(False, "no valid images")`
  - Build ffmpeg command: `-i video`, `-i overlay?`, `-i logo?`, `-filter_complex`, `-map [vout]`, `-map 0:a?`, `-c:a copy`, `-c:v libx264 -preset veryfast -crf 23`
  - Gọi `run_ffmpeg()` đúng một lần; trả về `(True, "")` hoặc `(False, error_msg)`
  - _Requirements: 1.1, 1.3, 1.4, 2.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 3.1 Viết property test cho opacity clamping (Property 1)
    - **Property 1: Opacity clamping invariant**
    - **Validates: Requirements 1.4**
    - Dùng `@given(st.floats(allow_nan=False, allow_infinity=False))` — kiểm tra `_clamp_float(v, 0.01, 1.0)` luôn nằm trong `[0.01, 1.0]`

  - [ ]* 3.2 Viết unit test cho single-pass encode (Property 6)
    - **Property 6: Single-pass encode khi có cả overlay và logo**
    - **Validates: Requirements 3.2, 3.3**
    - Mock `run_ffmpeg`, kiểm tra call count == 1 khi cả overlay và logo đều hợp lệ

  - [ ]* 3.3 Viết property test cho audio preservation (Property 7)
    - **Property 7: Audio preservation**
    - **Validates: Requirements 3.4**
    - Dùng `@given(st.booleans(), st.booleans())` cho `has_overlay`, `has_logo`
    - Kiểm tra ffmpeg command chứa `"-map"` và `"0:a?"` hoặc `"-c:a"` và `"copy"`

- [x] 4. Checkpoint — Đảm bảo các hàm helper và hàm chính hoạt động đúng
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Tích hợp Bước 5 Anti-Fingerprint vào `process_video_full()`
  - Thêm block Step 5 sau khi `final_output_path` được set từ bước voice convert (hoặc bước 3 nếu không có voice)
  - Đọc `af_cfg` từ `cfg_raw.get("video_process", {}).get("anti_fingerprint", {})`
  - Chỉ chạy khi `_as_bool(af_cfg.get("enabled", False), False)` là `True`
  - Clamp `overlay_opacity` bằng `_clamp_float(_as_float(..., 0.02), 0.01, 1.0)`
  - Nếu `apply_anti_fingerprint()` thành công: cập nhật `final_output_path = af_out`
  - Nếu thất bại: log lỗi, giữ nguyên `final_output_path` từ bước trước
  - Cập nhật step labels từ `[Bước X/4]` thành `[Bước X/5]` trong toàn bộ hàm
  - _Requirements: 1.1, 1.6, 3.1, 3.4, 3.5_

  - [ ]* 5.1 Viết unit test cho disabled state (Property 9)
    - **Property 9: Disabled state — không thay đổi output**
    - **Validates: Requirements 1.6, 2.6**
    - Mock `apply_anti_fingerprint`, kiểm tra không được gọi khi `enabled=False`

- [x] 6. Cập nhật `config/default_config.py` thêm `DEFAULT_ANTI_FINGERPRINT`
  - Thêm dict `DEFAULT_ANTI_FINGERPRINT` với các key: `enabled=False`, `overlay_image=""`, `overlay_opacity=0.02`, `logo_enabled=False`, `logo_image=""`, `logo_position="bottom-left"`
  - _Requirements: 4.1, 4.2_

  - [ ]* 6.1 Viết property test cho config defaults (Property 8)
    - **Property 8: Config defaults khi thiếu section**
    - **Validates: Requirements 4.1, 4.2**
    - Dùng `@given(st.dictionaries(st.text(), st.text()))` — kiểm tra khi không có key `anti_fingerprint`, các giá trị default được áp dụng đúng

- [x] 7. Cập nhật `config.yml` thêm section `video_process.anti_fingerprint`
  - Thêm sub-section `anti_fingerprint` vào `video_process` với đầy đủ các trường theo design
  - _Requirements: 4.1, 4.3_

- [x] 8. Cập nhật GUI — thêm Browse buttons cho overlay_image và logo_image
  - [x] 8.1 Cập nhật `templates/components/sidebar.html`
    - Thêm section "Anti-Fingerprint" trong tab Video Processing
    - Thêm checkbox `enabled`, input + Browse button cho `overlay_image`, input `overlay_opacity`
    - Thêm checkbox `logo_enabled`, input + Browse button cho `logo_image`, select `logo_position`
    - Hiển thị preview tên file đã chọn cho cả hai image inputs
    - _Requirements: 5.1, 5.2, 5.4_

  - [x] 8.2 Cập nhật `static/js/app.js`
    - Thêm event handlers cho Browse buttons gọi `/api/browse-file`
    - Cập nhật tên file preview sau khi chọn
    - Gọi `/api/save-config` khi thay đổi bất kỳ trường anti-fingerprint nào
    - _Requirements: 5.2, 5.3_

  - [x] 8.3 Kiểm tra endpoint `/api/browse-file` trong `gui.py`
    - Xác nhận endpoint đã tồn tại và hoạt động đúng cho file picker
    - Nếu chưa có: thêm endpoint trả về đường dẫn file được chọn qua `tkinter.filedialog`
    - _Requirements: 5.2_

  - [ ]* 8.4 Viết unit test kiểm tra HTML template chứa Browse buttons (Requirements 5.2)
    - Kiểm tra `sidebar.html` chứa Browse button cho `overlay_image` và `logo_image`
    - _Requirements: 5.2_

- [x] 9. Viết tests tại `tests/test_video_anti_fingerprint.py`
  - Tạo file test với đầy đủ imports: `pytest`, `hypothesis`, `unittest.mock`
  - Tổ chức thành các class: `TestResolveImagePath`, `TestBuildFilter`, `TestApplyAntiFp`, `TestPipelineIntegration`, `TestConfigDefaults`
  - Bao gồm tất cả property tests từ các task trên (1.1, 2.1–2.3, 3.1–3.3, 5.1, 6.1)
  - Thêm unit tests cho edge cases: file không tồn tại, extension sai, opacity ngoài range, logo_position không hợp lệ
  - _Requirements: 1.2, 1.4, 1.5, 2.2, 2.5, 3.2, 3.3, 3.4, 4.2_

  - [ ]* 9.1 Viết integration test cho config save round-trip (Property 10)
    - **Property 10: Config save round-trip**
    - **Validates: Requirements 5.3**
    - Dùng temp `config.yml`, POST `/api/save-config` với anti_fingerprint values, đọc lại và so sánh

- [x] 10. Checkpoint cuối — Đảm bảo toàn bộ tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks đánh dấu `*` là optional, có thể bỏ qua để MVP nhanh hơn
- Mỗi task tham chiếu requirements cụ thể để traceability
- Property tests dùng Hypothesis với tối thiểu 100 iterations mỗi test
- Tất cả lỗi trong bước Anti-Fingerprint không được dừng pipeline — giữ nguyên output từ bước trước
