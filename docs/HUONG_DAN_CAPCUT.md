# Hướng dẫn sử dụng tính năng CapCut

## Giới thiệu

Tính năng này giúp bạn tự động import video đã xử lý và file phụ đề vào CapCut, tiết kiệm thời gian và tối ưu workflow chỉnh sửa video.

## Cài đặt

### 1. Cài đặt CapCut

Tải và cài đặt CapCut từ: https://www.capcut.com/

### 2. Bật tính năng trong config.yml

Mở file `config.yml` và thêm/sửa phần cấu hình:

```yaml
capcut:
  enabled: true              # Bật tính năng
  auto_import: true          # Tự động import sau khi xử lý
  capcut_path: ""            # Để trống (tự động tìm)
  auto_open: false           # Có tự động mở CapCut không
```

## Sử dụng

### Cách 1: Tự động (Khuyến nghị)

Khi bật `auto_import: true`, video sẽ tự động được import vào CapCut:

```bash
# Tải và xử lý video
python cli/main.py https://www.douyin.com/video/1234567890

# Video sẽ tự động được import vào CapCut sau khi xử lý xong
```

### Cách 2: Test thủ công

Kiểm tra tính năng hoạt động:

```bash
# Test cơ bản
python tests/test_capcut_importer.py

# Test với video cụ thể
python tests/test_capcut_importer.py "path/to/video.mp4" "path/to/subtitle.srt"
```

### Cách 3: Sử dụng trong code

```python
from tools.capcut_importer import CapCutImporter
from pathlib import Path

# Khởi tạo
importer = CapCutImporter()

# Import video
result = importer.import_video(
    video_path=Path("video.mp4"),
    srt_path=Path("video.srt"),
    project_name="Video của tôi",
    auto_open=True,  # Tự động mở CapCut
)

if result["success"]:
    print(f"Thành công! Project ID: {result['project_id']}")
else:
    print(f"Lỗi: {result['message']}")
```

## Workflow hoàn chỉnh

```
1. Tải video từ Douyin/TikTok
   ↓
2. Transcribe (tạo phụ đề gốc)
   ↓
3. Dịch sang tiếng Việt
   ↓
4. Burn subtitle (optional)
   ↓
5. Voice conversion (optional)
   ↓
6. Tự động import vào CapCut ✨
   ↓
7. Mở CapCut và chỉnh sửa
```

## Cấu hình nâng cao

### Tự động mở CapCut sau khi import

```yaml
capcut:
  enabled: true
  auto_import: true
  auto_open: true  # Bật tính năng này
```

### Chỉ định đường dẫn CapCut tùy chỉnh

Nếu CapCut cài ở vị trí khác:

```yaml
capcut:
  enabled: true
  auto_import: true
  capcut_path: "D:/MyApps/CapCut"
```

### Kết hợp với xử lý video

```yaml
video_process:
  enabled: true
  burn_subs: true       # Burn phụ đề gốc
  burn_vi_subs: true    # Burn phụ đề tiếng Việt
  voice_convert: true   # Đổi giọng sang tiếng Việt
  translate: true       # Dịch phụ đề

capcut:
  enabled: true
  auto_import: true     # Import video đã xử lý vào CapCut
```

## Kết quả

Sau khi import thành công, bạn sẽ thấy:

1. **Project mới trong CapCut**: Mở CapCut và tìm trong phần "Drafts"
2. **Video đã được import**: Video nằm trong timeline
3. **Subtitle đã được import**: File SRT sẵn sàng để sử dụng

## Xử lý lỗi

### Lỗi: "CapCut not found"

**Nguyên nhân**: Không tìm thấy CapCut trên máy

**Giải pháp**:
1. Kiểm tra CapCut đã cài đặt chưa
2. Chỉ định đường dẫn trong `capcut_path`

```yaml
capcut:
  capcut_path: "C:/Program Files/CapCut"
```

### Lỗi: "Import failed"

**Nguyên nhân**: Không có quyền ghi vào thư mục CapCut

**Giải pháp**:
1. Chạy với quyền Administrator
2. Kiểm tra quyền truy cập thư mục CapCut

### Video không hiển thị trong CapCut

**Nguyên nhân**: CapCut chưa refresh danh sách draft

**Giải pháp**:
1. Đóng và mở lại CapCut
2. Kiểm tra thư mục `CapCut/Drafts/` có project mới không

## Tips & Tricks

### 1. Tối ưu workflow

Bật tất cả tính năng tự động:

```yaml
video_process:
  enabled: true
  burn_vi_subs: true
  voice_convert: true

capcut:
  enabled: true
  auto_import: true
  auto_open: true
```

### 2. Chỉ import, không xử lý

Nếu chỉ muốn import video gốc:

```yaml
video_process:
  enabled: false

capcut:
  enabled: true
  auto_import: true
```

### 3. Xử lý nhiều video

Tool sẽ tự động import từng video sau khi xử lý xong:

```bash
python cli/main.py https://www.douyin.com/user/MS4wLjABAAAA...
```

## Câu hỏi thường gặp

**Q: Có hỗ trợ macOS/Linux không?**
A: Hiện tại chỉ hỗ trợ Windows. Hỗ trợ macOS/Linux sẽ được thêm trong tương lai.

**Q: Có thể import nhiều video cùng lúc không?**
A: Có, mỗi video sẽ tạo một project riêng trong CapCut.

**Q: File SRT có bắt buộc không?**
A: Không, bạn có thể import chỉ video mà không cần SRT.

**Q: Có thể tùy chỉnh layout timeline không?**
A: Hiện tại chưa hỗ trợ, sẽ được thêm trong phiên bản sau.

## Liên hệ & Hỗ trợ

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra log trong console
2. Chạy test: `python tests/test_capcut_importer.py`
3. Báo lỗi trên GitHub Issues

---

**Chúc bạn sử dụng hiệu quả! 🎬✨**
