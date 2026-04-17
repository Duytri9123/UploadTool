# Hướng dẫn sử dụng tính năng CapCut trong UI

## Vị trí

Trong trang **Tải xuống** (Download), phần **Điều khiển tải xuống**, bạn sẽ thấy 2 checkbox mới:

```
☑ 🎬 Import vào CapCut
☑ Tự động mở CapCut
```

## Cách sử dụng

### 1. Bật tính năng CapCut

- Tick vào checkbox **"🎬 Import vào CapCut"**
- (Optional) Tick vào **"Tự động mở CapCut"** nếu muốn CapCut tự động mở sau khi import

### 2. Cấu hình xử lý video

Đảm bảo các tùy chọn xử lý video đã được bật:
- ☑ Xử lý video
- ☑ Chèn phụ đề (nếu muốn)
- ☑ Tạo giọng nói (nếu muốn)

### 3. Thêm video vào hàng chờ

- Dán URL video Douyin/TikTok vào ô input
- Click **"Thêm"** để thêm vào hàng chờ

### 4. Bắt đầu tải

- Click **"Bắt đầu tải"**
- Chờ quá trình tải xuống và xử lý hoàn tất

### 5. Kết quả

Sau khi xử lý xong, video và file phụ đề sẽ tự động được import vào CapCut:
- Video đã xử lý (có phụ đề, giọng nói tiếng Việt)
- File SRT tiếng Việt
- Project mới trong CapCut Drafts

## Workflow hoàn chỉnh

```
1. Tải video từ Douyin
   ↓
2. Phiên âm (tạo phụ đề gốc)
   ↓
3. Dịch sang tiếng Việt
   ↓
4. Chèn phụ đề (optional)
   ↓
5. Tạo giọng nói tiếng Việt (optional)
   ↓
6. Import vào CapCut ✨
   ↓
7. Mở CapCut và chỉnh sửa
```

## Log messages

Trong quá trình xử lý, bạn sẽ thấy các log:

```
[CapCut] Đang import vào CapCut...
[CapCut] ✓ Đã import: Video_Name (ID: uuid-xxx)
[CapCut] Đang mở CapCut...
```

## Lưu ý

1. **CapCut phải được cài đặt** trước khi sử dụng tính năng này
2. **Chỉ hỗ trợ Windows** (hiện tại)
3. **Project name** tự động lấy từ tên video đã dịch
4. **Mỗi lần import** tạo một project mới với UUID riêng

## Troubleshooting

### Lỗi: "CapCut not found"

**Nguyên nhân**: Không tìm thấy CapCut trên máy

**Giải pháp**:
1. Kiểm tra CapCut đã cài đặt chưa
2. Thêm đường dẫn CapCut vào `config.yml`:

```yaml
capcut:
  enabled: true
  auto_import: true
  capcut_path: "C:/Program Files/CapCut"
  auto_open: false
```

### Video không hiển thị trong CapCut

**Nguyên nhân**: CapCut chưa refresh danh sách draft

**Giải pháp**:
1. Đóng và mở lại CapCut
2. Kiểm tra thư mục `%USERPROFILE%\AppData\Local\CapCut\User Data\Drafts\`

### Import thất bại

**Nguyên nhân**: Không có quyền ghi vào thư mục CapCut

**Giải pháp**:
1. Chạy ứng dụng với quyền Administrator
2. Kiểm tra quyền truy cập thư mục CapCut

## Tips

1. **Tắt auto-open** nếu xử lý nhiều video cùng lúc
2. **Kiểm tra log** để xem chi tiết quá trình import
3. **Backup project** quan trọng trước khi chỉnh sửa

---

**Chúc bạn sử dụng hiệu quả! 🎬✨**
