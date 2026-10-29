<div align="center">

<a href="https://github.com/xinchaotamhon/word-atlas_VietNam"><img src="docs/assets/cover-v2.jpg" alt="Word Atlas (Bản đồ từ vựng) — Mỗi từ một bức tranh, thắp sáng IELTS" width="100%"></a>

# Word Atlas · Bản đồ từ vựng IELTS (Phiên bản Tiếng Việt)

**Biến từ vựng thành hình ảnh, biến việc ôn tập thành hành trình khám phá các vì sao.**

7.298 mục từ IELTS · Tranh minh họa độc bản · Phát âm chuẩn Anh/Mỹ · Thuật toán ghi nhớ FSRS · Giao diện Tiếng Việt · Tối ưu hiệu năng

[![Mã nguồn: MIT](https://img.shields.io/badge/Code-MIT-17283B?style=flat-square)](LICENSE)
[![Dữ liệu: CC BY 4.0](https://img.shields.io/badge/Dataset-CC_BY_4.0-AD5038?style=flat-square)](CONTENT_LICENSE.md)
[![Dự án gốc: designfuchen/word-atlas](https://img.shields.io/badge/Upstream-word--atlas-17283B?style=flat-square&logo=github)](https://github.com/designfuchen/word-atlas)

</div>

---

## 📌 Giới thiệu dự án

Dự án này là phiên bản **Việt hóa toàn diện và tối ưu hóa hiệu năng** của kho từ điển gốc [Word Atlas (词光)](https://github.com/designfuchen/word-atlas) do tác giả [@designfuchen](https://github.com/designfuchen) sáng tạo và phát triển.

Word Atlas là ứng dụng học từ vựng IELTS đột phá lấy hình ảnh và ngữ cảnh làm trọng tâm. Người học hiểu sâu nghĩa từ qua tranh vẽ trực quan, nghe phát âm giọng bản xứ để liên kết âm thanh - hình ảnh, và củng cố trí nhớ dài hạn nhờ thuật toán lặp lại ngắt quãng **FSRS** (thuật toán khoa học cùng loại với Anki thế hệ mới).

Ứng dụng tuân thủ triết lý **Local-first (ưu tiên cục bộ)**: không cần đăng ký tài khoản, không máy chủ theo dõi, toàn bộ tiến độ học tập được lưu trữ 100% riêng tư và an toàn trong trình duyệt trên thiết bị của bạn.

---

## 📊 So sánh chi tiết: Bản Việt hóa so với Bản gốc của tác giả

Dưới đây là bảng tổng hợp các điểm cải tiến và thay đổi cụ thể so với repository gốc `designfuchen/word-atlas`:

| Tiêu chí so sánh | Bản gốc tác giả (`designfuchen/word-atlas`) | Bản cải tiến Tiếng Việt (`xinchaotamhon/word-atlas_VietNam`) |
| :--- | :--- | :--- |
| **Ngôn ngữ giao diện (UI)** | 100% Tiếng Trung (menu, nút bấm, hướng dẫn, cài đặt, phím tắt). | **100% Tiếng Việt** tự nhiên, chỉn chu trên toàn bộ các trang (`Hôm nay`, `Từ điển`, `Luyện tập`, `Cá nhân`, `Giới thiệu`, `Cài đặt`). |
| **Hiển thị định nghĩa từ vựng** | Hiển thị tiếng Trung (`zh`) làm định nghĩa chính. | **Ưu tiên định nghĩa chuẩn tiếng Anh gốc (`en`)** trên thẻ từ vựng để giữ trọn vẹn ngữ cảnh học thuật IELTS, tránh sai lệch do dịch thô. |
| **Hiển thị font chữ tiếng Việt** | Dùng font tiếng Trung làm mặc định; các ký tự có dấu phức (`ệ`, `ở`, `ữ`, `ẵ`,...) thường bị lỗi lệch dấu, vỡ chữ trên Windows/Android. | **Đã tái cấu trúc Font Stack:** Ưu tiên `Segoe UI`, `Roboto`, `-apple-system` lên đầu trong CSS và Canvas; hiển thị tiếng Việt sắc nét 100%. |
| **Tốc độ tải ảnh khi cuộn (Scroll Lag)** | Thẻ từ ra/vào màn hình bị unmount/mount liên tục; ảnh bị ẩn (`opacity: 0`) và tải lại từ đầu, gây chớp nháy và giật khung hình. | **Tích hợp RAM Memory Cache Set:** Nhớ ngay các ảnh đã tải. Khi cuộn qua lại, ảnh hiển thị **tức thì (độ trễ 0ms)**, hoàn toàn không giật. |
| **Cơ chế nạp ảnh Virtual Grid** | Dùng `loading="lazy"` chồng lên Virtual Grid khiến trình duyệt delay thêm 100-300ms; vùng đệm chỉ 4 hàng. | **Bỏ lazy-load thừa thãi, bật `decoding="async"`**; mở rộng vùng đệm quét trước (overscan buffer) lên **8 hàng**, ảnh nạp xong trước khi cuộn tới. |
| **Hiệu ứng đồ họa (GPU Load)** | Hiệu ứng fade-in kéo dài `0.5s` kèm zoom phóng to `0.8s`, làm đơ khung hình khi cuộn lướt qua nhiều card. | **Rút ngắn transition xuống `0.15s`**, loại bỏ hiệu ứng zoom nặng nề khi cuộn danh sách; tắt transition với ảnh đã có trong cache. |
| **Bản đồ sao 3D & Xuất ảnh chia sẻ** | Toàn bộ chú thích sao, cụm chủ đề và ảnh poster xuất ra bằng tiếng Trung. | Dịch nhãn sao 3D (`Chưa học`, `Đang học`, `Đã thuộc`), 19 chủ đề tiếng Việt; xuất poster vũ trụ và thẻ thành tích học tập bằng tiếng Việt. |
| **Cách thức khởi chạy trên máy** | Yêu cầu mở Terminal và gõ các lệnh npm phức tạp. | **Tích hợp sẵn file `run.cmd` (1-Click):** Chỉ cần nhấp đúp là tự bật UTF-8 và mở trình duyệt web chạy app cục bộ offline. |
| **Khả năng tương thích gói cài đặt** | Thường gặp lỗi chặn build scripts (`ERR_PNPM_IGNORED_BUILDS` của esbuild) nếu dùng pnpm v11+. | **Bổ sung sẵn `pnpm-workspace.yaml` & `pnpm-lock.yaml`**, hỗ trợ mượt mà cả `pnpm` lẫn `npm`. |

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy (Dành cho người mới)

Ứng dụng chạy hoàn toàn offline trên máy tính cá nhân.

### Bước 1: Chuẩn bị môi trường
Hãy đảm bảo máy tính của bạn đã cài đặt:
1. **Node.js** (Phiên bản 20 trở lên): Tải bản LTS tại [nodejs.org](https://nodejs.org/).
2. **Git**: Tải tại [git-scm.com](https://git-scm.com/) (nếu dùng dòng lệnh `git clone`).

### Bước 2: Tải mã nguồn về máy
Mở Terminal / PowerShell hoặc Command Prompt và chạy lệnh:
```bash
git clone https://github.com/xinchaotamhon/word-atlas_VietNam.git
cd word-atlas_VietNam
```
*(Nếu không quen dùng Git, bạn có thể nhấn nút xanh **Code** -> **Download ZIP** ở góc trên trang GitHub này rồi giải nén thư mục).*

### Bước 3: Cài đặt thư viện phụ thuộc
Khuyên dùng trình quản lý gói **pnpm** (nhanh và tiết kiệm bộ nhớ) hoặc **npm**:

```bash
# Cài đặt pnpm (nếu máy bạn chưa có)
npm install -g pnpm

# Cài đặt các thư viện cần thiết
pnpm install
```
*(Nếu muốn dùng npm truyền thống: chỉ cần chạy lệnh `npm install`)*.

### Bước 4: Khởi chạy ứng dụng

#### 👉 Cách 1: Nhanh nhất (Dành cho Windows)
Vào thư mục dự án và **nhấp đúp chuột vào file `run.cmd`**. Trình duyệt sẽ tự động mở trang web tại địa chỉ `http://localhost:5188`.

#### 👉 Cách 2: Dùng dòng lệnh (Terminal / macOS / Linux)
Chạy lệnh sau:
```bash
pnpm run dev
# hoặc: npm run dev
```
Sau đó mở trình duyệt web và truy cập địa chỉ: **`http://localhost:5188`**.

---

## 📖 Các tính năng chính trong Word Atlas

- **Bản đồ sao từ vựng 3D (Galaxy View):** 7.298 từ vựng được phân bổ theo 19 chủ đề lớn trong một vũ trụ sao 3D tương tác (WebGL2). Mỗi từ học xong là một vì sao tỏa sáng.
- **Phương pháp học trực quan đa giác quan:**
  - *Thị giác:* Mỗi từ có một bức tranh minh họa câu chuyện trong ví dụ đầu tiên.
  - *Thính giác:* Hai giọng đọc chuẩn Anh (Alice) và Mỹ (Sarah) cùng 6 âm thanh nền tự nhiên giúp tập trung (mưa rơi, thư viện, quán cà phê, rừng cây,...).
  - *Vận động:* Typing Studio hỗ trợ luyện gõ phím rèn phản xạ chính tả theo chuẩn tốc độ WPM.
- **Thuật toán lặp lại ngắt quãng FSRS:** Sắp xếp lịch ôn tập tối ưu cho trí nhớ dài hạn, chỉ ôn những từ chuẩn bị quên.
- **Quyền riêng tư tuyệt đối:** Không cần tài khoản; hỗ trợ xuất (`Export`) và nhập (`Import`) tệp sao lưu tiến độ học tập JSON bất cứ lúc nào khi đổi máy.

---

## 🛠 Lệnh dành cho nhà phát triển

```bash
# Kiểm tra kiểu dữ liệu TypeScript
pnpm exec tsc --noEmit

# Chạy kiểm thử tự động
pnpm test

# Đóng gói bản dựng sản phẩm vào thư mục dist/
pnpm run build
```

---

## 📜 Bản quyền & Ghi nhận tác giả (Licenses & Credits)

- **Mã nguồn ứng dụng:** Phát hành theo giấy phép [MIT License](LICENSE).
- **Bộ dữ liệu từ vựng, hình minh họa & file ghi âm:** Thuộc giấy phép [Creative Commons Attribution 4.0 International (CC BY 4.0)](CONTENT_LICENSE.md).
- **Tác giả gốc (Upstream Creator):** Dự án gốc được xây dựng bởi [@designfuchen](https://github.com/designfuchen) (Theo dõi trên [X · @yangleiocx3](https://x.com/yangleiocx3)).
- **Phiên bản Tiếng Việt:** Được hoàn thiện, dịch thuật và tối ưu hiệu năng bởi [xinchaotamhon](https://github.com/xinchaotamhon).

---

<div align="center">
  <i>Chúc bạn có những trải nghiệm học từ vựng trực quan và tràn đầy cảm hứng! ⭐</i>
</div>
