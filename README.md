# VideoLoop Studio (Trình Tạo Video Ghép Giọng AI & Tự Động Lặp)

Ứng dụng web hiện đại xây dựng trên nền tảng **Next.js 16 (App Router + Turbopack)** giúp tự động tạo video ngắn (Shorts / TikTok / Reels / YouTube) từ kịch bản văn bản. 

Hệ thống tự động đồng bộ giọng đọc trí tuệ nhân tạo (Edge-TTS), tạo hiệu ứng phụ đề karaoke đổi màu từng từ theo nhịp đọc, cho phép kéo thả tiêu đề chính tự do trên video và xuất file video MP4 chất lượng cao tương thích 100% mọi thiết bị.

---

## 🚀 Các Tính Năng Nổi Bật

### 1. 🎙️ Giọng Đọc AI Đỉnh Cao (Edge-TTS)
- Tích hợp giọng đọc tiếng Việt truyền cảm, tự nhiên: **Hoài My (Nữ)**, **Nam Minh (Nam)** và các giọng đọc tiếng Anh quốc tế.
- Tùy chỉnh tốc độ đọc (Speech Rate) từ `-30%` đến `+30%`.
- Trích xuất nhịp đọc chi tiết từng từ (Word Boundaries) thời gian thực.

### 2. 📝 Phụ Đề Karaoke Đổi Màu Từng Từ (Auto Subtitles)
- Phụ đề hiển thị theo từng cụm 3–4 từ nhịp nhàng.
- Chữ mặc định màu trắng với viền đen đổ bóng sắc nét.
- **Hiệu ứng Karaoke**: Khi giọng đọc đến từ nào, từ đó tự động đổi sang màu nổi bật (Vàng TikTok, Xanh Cyan, Xanh Neon, Trắng Sáng) và phóng to nhẹ (`scale`).

### 3. 🎯 Tiêu Đề Chính Kéo Thả & Xuống Dòng Tự Do (Main Title)
- Nhập tiêu đề tùy ý với hỗ trợ **xuống dòng bằng phím Enter**.
- **Kéo thả trực tiếp**: Nhấn giữ và di chuyển tiêu đề đến bất kỳ vị trí mong muốn nào trên màn hình video (Top, Center, Bottom).
- **Co giãn kích thước (Resize)**: Kéo núm chỉnh mép cạnh trên video hoặc dùng thanh trượt để thay đổi độ rộng khung tiêu đề (30% – 95%).

### 4. 📐 Đa Dạng Tỉ Lệ (Smart Crop 9:16 & 16:9)
- Hỗ trợ chuẩn video dọc **9:16** (TikTok, YouTube Shorts, Reels) và chuẩn video ngang **16:9** (YouTube, Facebook TV).
- Tự động cắt giữa (Smart Crop) và scale độ phân giải chuẩn 1080p sắc nét.

### 5. 🎞️ Thư Viện Video Mẫu Đa Dạng & Tải Lên Video Riêng
- Tích hợp sẵn bộ sưu tập video mẫu chất lượng cao trong thư mục `public/templates/`.
- Hỗ trợ tải lên video riêng từ máy tính (`.mp4`, `.webm`) để ghép giọng ngay lập tức.
- Tự động lặp lại video nền (Auto-loop) mượt mà cho khớp hoàn hảo với độ dài kịch bản nói.

### 6. 🎬 Khắc Trực Tiếp Lên Video & Tương Thích 100% QuickTime (MP4 H.264 / AAC)
- Toàn bộ tiêu đề kéo thả và phụ đề karaoke được khắc trực tiếp (Burn-in 100%) vào từng khung hình của video.
- Chuyển mã sang chuẩn **H.264 (yuv420p) + AAC audio + faststart**, mở mượt mà trên **QuickTime Player của macOS, iPhone Photos, Android và trình duyệt**.

### 7. ⚡ Kiến Trúc Tối Ưu SSR & Clean Code
- `src/app/page.tsx` là **React Server Component (RSC)** thuần túy, đọc dữ liệu mẫu ngay trên Server giúp triệt tiêu hoàn toàn client waterfall.
- Các component được module hóa gọn gàng: `Header`, `AspectRatioSelector`, `TemplateSelector`, `ScriptSubtitleControls`, `VideoPreviewPlayer`, `VideoStudioClient`.
- Cột bên phải (Màn hình xem trước video) được ghim cố định (`sticky`), cột điều khiển bên trái cuộn độc lập mượt mà.

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend & Framework**: Next.js 16.3.4 (App Router, Turbopack, React 19).
- **Ngôn ngữ**: TypeScript.
- **Styling**: Tailwind CSS v4, Lucide React Icons.
- **Xử lý Audio/TTS**: `msedge-tts` (Microsoft Edge Text-to-Speech API).
- **Xử lý Video & Transcoding**: FFmpeg, Canvas 2D Streams API, MediaRecorder.

---

## 💻 Hướng Dẫn Cài Đặt & Chạy Cục Bộ

### Yêu cầu môi trường:
- **Node.js**: Phiên bản 18 trở lên (Khuyến nghị Node 20 hoặc 22).
- **FFmpeg**: Đã cài đặt trên máy (`brew install ffmpeg` trên macOS hoặc cài qua package manager).

### Các bước khởi chạy:

1. **Clone repository:**
   ```bash
   git clone https://github.com/quatangtruongthanh/video.git
   cd video
   ```

2. **Cài đặt các gói phụ thuộc:**
   ```bash
   npm install
   # hoặc pnpm install
   ```

3. **Chạy máy chủ phát triển (Development Server):**
   ```bash
   npm run dev
   ```

4. **Truy cập ứng dụng:**
   Mở trình duyệt và truy cập vào [http://localhost:3000](http://localhost:3000).

---

## 📁 Cấu Trúc Dự Án

```text
video-eg/
├── public/
│   └── templates/             # Thư mục chứa các video mẫu (.mp4)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── templates/     # API đọc danh sách video mẫu
│   │   │   ├── transcode/     # API chuyển mã sang chuẩn H.264/AAC QuickTime
│   │   │   └── tts/           # API sinh giọng nói Edge-TTS và timestamps từ
│   │   ├── layout.tsx         # Layout gốc ứng dụng
│   │   └── page.tsx           # Server Component trang chủ (RSC)
│   ├── components/
│   │   ├── AspectRatioSelector.tsx    # Component chọn tỉ lệ 9:16 / 16:9
│   │   ├── Header.tsx                 # Header thương hiệu
│   │   ├── ScriptSubtitleControls.tsx # Soạn kịch bản, chọn giọng đọc, style chữ
│   │   ├── TemplateSelector.tsx       # Lựa chọn & tìm kiếm video mẫu
│   │   ├── VideoPreviewPlayer.tsx     # Player xem trước, tiêu đề kéo thả, xuất MP4
│   │   └── VideoStudioClient.tsx      # Client Container quản lý trạng thái
│   ├── lib/
│   │   └── templates.ts       # Server helper đọc danh sách template từ disk
│   └── types/
│       └── video.ts           # Định nghĩa Type & Interface dữ liệu
├── next.config.ts             # Cấu hình Next.js (COOP/COEP headers cho WebAssembly)
├── package.json
└── README.md
```

---

## 📜 Giấy Phép (License)

Dự án được phát triển và sở hữu bởi **quatangtruongthanh**.
