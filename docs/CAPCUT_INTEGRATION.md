# Tích hợp CapCut - Tự động Import Video và Subtitle

## Tổng quan

Tính năng này cho phép tự động import video MP4 và file SRT vào CapCut sau khi tải xuống và xử lý xong, giúp tối ưu workflow chỉnh sửa video.

## Cách hoạt động

1. Video được tải xuống và xử lý (transcribe, dịch, burn subtitle, voice conversion)
2. Sau khi xử lý xong, video và file SRT được tự động copy vào thư mục Draft của CapCut
3. Tạo project metadata để CapCut nhận diện
4. (Optional) Tự động mở CapCut với project mới

## Cấu hình

### 1. Bật tính năng trong `config.yml`:

```yaml
capcut:
  enabled: true              # Bật tính năng CapCut
  auto_import: true          # Tự động import sau khi xử lý video
  capcut_path: ""            # Để trống để tự động tìm, hoặc chỉ định đường dẫn
  auto_open: false           # Tự động mở CapCut sau khi import
```

### 2. Đường dẫn CapCut

Tool sẽ tự động tìm CapCut ở các vị trí sau (Windows):
- `%USERPROFILE%\AppData\Local\CapCut\User Data`
- `%USERPROFILE%\Documents\CapCut`
- `C:\Program Files\CapCut`

Nếu CapCut cài ở vị trí khác, chỉ định trong `capcut_path`:

```yaml
capcut:
  capcut_path: "D:/MyApps/CapCut"
```

## Sử dụng

### Tự động (Khuyến nghị)

Khi bật `auto_import: true`, video sẽ tự động được import vào CapCut sau khi xử lý xong:

```bash
python cli/main.py https://www.douyin.com/video/1234567890
```

### Thủ công (Import riêng lẻ)

Bạn cũng có thể import video thủ công:

```python
from tools.capcut_importer import CapCutImporter
from pathlib import Path

importer = CapCutImporter()
result = importer.import_video(
    video_path=Path("video.mp4"),
    srt_path=Path("video.srt"),
    project_name="My Project",
    auto_open=True,
)

print(result)
```

## Kết quả

Sau khi import thành công:

1. **Thư mục Draft**: Video và SRT được copy vào `CapCut/Drafts/{project_id}/`
2. **Project metadata**: File `draft_content.json` được tạo với thông tin project
3. **Mở CapCut**: Nếu bật `auto_open`, CapCut sẽ tự động mở

## Workflow hoàn chỉnh

```
Tải video → Transcribe → Dịch → Burn subtitle → Voice conversion → Import CapCut
```

### Ví dụ cấu hình đầy đủ:

```yaml
video_process:
  enabled: true
  burn_subs: true
  burn_vi_subs: true
  voice_convert: true
  translate: true

capcut:
  enabled: true
  auto_import: true
  auto_open: false
```

## Lưu ý

1. **CapCut phải được cài đặt** trước khi sử dụng tính năng này
2. **Định dạng hỗ trợ**: MP4 (video), SRT (subtitle)
3. **Project name**: Tự động lấy từ tên file hoặc custom title
4. **Không ghi đè**: Mỗi lần import tạo project mới với UUID riêng

## Troubleshooting

### CapCut không được tìm thấy

```
CapCut not found. Please install CapCut or set custom path.
```

**Giải pháp**: 
- Kiểm tra CapCut đã cài đặt chưa
- Chỉ định đường dẫn trong `capcut_path`

### Import thất bại

```
Import failed: [error message]
```

**Giải pháp**:
- Kiểm tra quyền ghi vào thư mục CapCut
- Đảm bảo video và SRT file tồn tại
- Kiểm tra log chi tiết trong console

## API Reference

### CapCutImporter

```python
class CapCutImporter:
    def __init__(self, capcut_path: Optional[str] = None)
    
    def import_video(
        self,
        video_path: Path,
        srt_path: Optional[Path] = None,
        project_name: Optional[str] = None,
        auto_open: bool = False,
    ) -> Dict[str, Any]
    
    def list_drafts(self) -> list[Dict[str, Any]]
```

### Return value của `import_video()`:

```python
{
    "success": True,
    "project_id": "uuid-string",
    "project_name": "My Project",
    "draft_path": Path("CapCut/Drafts/uuid/"),
    "video_path": Path("video.mp4"),
    "srt_path": Path("video.srt"),
    "message": "Successfully imported to CapCut: My Project"
}
```

## Tương lai

Các tính năng có thể bổ sung:
- [ ] Hỗ trợ macOS và Linux
- [ ] Import nhiều video cùng lúc
- [ ] Tùy chỉnh timeline layout
- [ ] Tự động apply effects/transitions
- [ ] Export từ CapCut sau khi chỉnh sửa
