# YouTube Upload Setup

Hướng dẫn kết nối và upload video lên YouTube từ ứng dụng Douyin Downloader.

## 1. Chuẩn bị

### Cài đặt Dependencies
```bash
pip install -r requirements.txt
```

### Lấy Google OAuth 2.0 Credentials

1. **Vào [Google Cloud Console](https://console.cloud.google.com/)**
   - Tạo project mới (hoặc dùng project hiện có)
   - Tên: "Douyin Downloader" (tùy ý)

2. **Enable YouTube Data API v3**
   - Vào "APIs & Services" → "Library"
   - Tìm "YouTube Data API v3"
   - Bấm "Enable"

3. **Tạo OAuth 2.0 Consent Screen**
   - Vào "APIs & Services" → "OAuth consent screen"
   - Chọn "External" (nếu chưa có)
   - Điền thông tin:
     - App name: "Douyin Downloader"
     - User support email: email của bạn
     - Developer contact: email của bạn
   - Bấm "Save & Continue"
   - Skip "Scopes" step, bấp "Save & Continue"
   - Bấp "Save & Continue" ở step "Summary"

4. **Tạo OAuth 2.0 Credentials**
   - Vào "APIs & Services" → "Credentials"
   - Bấm "+ Create Credentials" → "OAuth client ID"
   - Application type: "Desktop application"
   - Name: "Douyin Downloader Desktop"
   - Bấm "Create"
   - Download JSON file → Lưu vào **root folder** dự án thành `client_secrets.json`

## 2. Sử dụng

### Bắt đầu ứng dụng
```bash
python app.py
```

### Truy cập trang Process Video
1. Vào tab **Xử lý Video** (Process)
2. Scroll xuống **YouTube Upload** section
3. Bấm **"Đăng nhập YouTube"**

### Lần đầu đăng nhập
- Sẽ mở popup browser yêu cầu đăng nhập Google
- Chấp nhận permission để ứng dụng access YouTube
- Token sẽ được lưu vào `.youtube_tokens/youtube_token.pickle`

### Upload Video

#### Cách 1: Manual
1. Xử lý video xong (burn subs, TTS, v.v.)
2. Điền:
   - **Tiêu đề YouTube**
   - **Mô tả** (tùy chọn)
   - **Chế độ riêng tư**: Private/Unlisted/Public
3. **Không có nút Upload riêng** - bạn sử dụng URL video cuối cùng

#### Cách 2: Auto-Upload
1. Bật checkbox **"Tự động upload video cuối cùng lên YouTube"**
2. Bấm "Xử lý Video"
3. Khi hoàn tất, popup hỏi có upload không
4. Bấp "OK" để upload

## 3. Ghi chú

### Multi-account
- Để đăng nhập account YouTube khác:
  1. Bấp "Đăng xuất" 
  2. Bấp "Đăng nhập YouTube"
  3. Chọn account khác trong browser popup

### Lưu trữ Token
- Token OAuth được lưu an toàn trong `.youtube_tokens/youtube_token.pickle`
- Không chia sẻ folder này nếu sử dụng source control

### Lỗi Common

**Lỗi: "client_secrets.json not found"**
- Đảm bảo file `client_secrets.json` nằm trong root folder dự án

**Lỗi: "YouTube API quota exceeded"**
- Giới hạn free tier: 10,000 quota units/ngày
- Mỗi upload ~1,600 quota units
- Chờ ngày hôm sau hoặc upgrade đến paid plan

**Video upload thất bại**
- Kiểm tra:
  - File video tồn tại & không bị corrupted
  - Kích thước < 256GB
  - Format hỗ trợ (MP4, WebM, AVI, v.v.)
  - Có kết nối internet ổn định

## 4. Features

- ✅ Xác thực OAuth 2.0 an toàn
- ✅ Upload video lên YouTube
- ✅ Tự động upload sau xử lý
- ✅ Hỗ trợ Private/Unlisted/Public
- ✅ Lưu token cho lần sau
- ✅ Hiển thị channel info & statistics
- ✅ Progress tracking upload
- ✅ Hỗ trợ multi-account

## 5. Xóa Token

Để xóa toàn bộ thông tin đăng nhập YouTube:
```bash
rm -rf .youtube_tokens/
```

Hoặc bấp "Đăng xuất" trong UI.
