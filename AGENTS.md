# HƯỚNG DẪN KỸ THUẬT & QUY CHUẨN DÀNH CHO AI TIẾP QUẢN (AGENTS.MD)

Tài liệu này dành cho các AI Agent (Antigravity, Claude, Cursor, Copilot,...) hoặc lập trình viên tiếp quản phát triển và bảo trì kho mã nguồn **Word Atlas Tiếng Việt**. Hãy đọc kỹ các quy chuẩn này trước khi thực hiện bất kỳ thay đổi nào.

---

## 1. Thông tin chung về dự án

- **Tên dự án:** Word Atlas – Mỗi từ một bức tranh (Bản Việt hóa & Nâng cấp tính năng học chủ động).
- **Mục tiêu:** Ứng dụng học 7.298 từ vựng IELTS qua tranh minh họa, phát âm bản xứ UK/US, thuật toán FSRS Spaced Repetition, Local-first 100% offline.
- **Repository:** `xinchaotamhon/word-atlas_VietNam` (nhánh chính: `main`).
- **Địa chỉ GitHub Pages trực tuyến:** `https://xinchaotamhon.github.io/word-atlas_VietNam/`
- **Tác giả gốc (Upstream):** `designfuchen/word-atlas` (tác giả [@designfuchen](https://github.com/designfuchen)).

---

## 2. Quy ước quan trọng: Đánh số phiên bản Cache-Busting (`?v=N`)

> [!IMPORTANT]
> **QUY TẮC BẮT BUỘC KHI GỬI LINK TEST HOẶC BÀN GIAO CHO NGƯỜI DÙNG:**
> 1. Luôn dùng tham số phiên bản dạng **số nguyên lũy tiến**: `?v=6`, `?v=7`, `?v=11`, `?v=9`,...
> 2. **TUYỆT ĐỐI KHÔNG DÙNG** chuỗi chữ hoặc tên tính năng (ví dụ: `?v=uk-audio`, `?v=test`, v.v.).
> 3. **Lý do:** Người dùng cần theo dõi phiên bản bằng số liên tục để biết mình đã tải đúng bản mới nhất, và trình duyệt di động (đặc biệt là Mobile Safari/Chrome iOS) cần query param mới để xóa triệt để cache của bundle cũ.

---

## 3. Kiến trúc các tính năng cốt lõi

### 3.1. Phương pháp học Active Recall & Hé lộ 1 giây (1s Peek)
- **Tập tin chính:** `src/pages/Atlas.tsx`, `src/styles/app.css`.
- **Trạng thái mặc định:** `hideWords = true` (kích hoạt chế độ Flashcard, ẩn toàn bộ từ vựng và định nghĩa để người học nhìn tranh tự suy ngẫm).
- **Hành vi khi bấm nút con mắt 👁️ hoặc nhấp vào vùng che:**
  1. Kích hoạt `peek(w, e)`: đặt `peeking[w.id] = true` trong đúng **1.000 ms** (`window.setTimeout`).
  2. Tự động phát âm thanh phát âm chuẩn UK: `void play(atlas.audio(w, "uk"), w.word, "uk")`.
  3. Hiển thị đồng thời cả 3 thành phần:
     - **Từ tiếng Anh (`w.word`):** hiển thị với class `.tile-word.is-revealed`.
     - **Phiên âm quốc tế UK (`w.ipa`):** hiển thị với class `.tile-ipa.is-revealed` (màu ochre nổi bật).
     - **Định nghĩa (`w.zh`):** hiển thị với class `.tile-zh.is-revealed`.
  4. Sau 1 giây, tự động che lại về dạng `••••••` để kích thích phản xạ truy hồi trí nhớ dài hạn.

### 3.2. Tự động phát âm thanh UK khi mở từ chi tiết (`EntryView`)
- **Tập tin chính:** `src/ui/EntryView.tsx`.
- **Hành vi:** Khi người học bấm mở từ (`mode === "detail"`), hook `useEffect` sẽ tự động gọi:
  ```ts
  useEffect(() => {
    if (mode === "detail") {
      void play(atlas.audio(entry, "uk"), entry.w, "uk");
    }
  }, [entry.id, mode]);
  ```
- **Xử lý âm thanh nền:** Hàm `play()` trong `src/lib/audio.ts` đã được thiết kế sẵn tính năng **audio ducking**: tự động giảm âm lượng nhạc nền xuống khi đọc từ và phục hồi lại khi đọc xong.

### 3.3. Xáo trộn thông minh (Smart Shuffle)
- **Tập tin chính:** `src/pages/Atlas.tsx`.
- **Hành vi:** Tự động xáo trộn 1 lần khi người học chuyển đổi chủ đề (`topic`) hoặc cấp độ CEFR (`level`). Ngoài ra có nút `<Shuffle />` trên thanh lọc để xáo trộn thủ công bất cứ lúc nào.

---


### 3.4. Hiển thị từ loại đa năng (Multi-POS Badges)
- **Tập tin chính:** `src/atlas/types.ts`, `src/atlas/data.ts`, `src/pages/Atlas.tsx`, `src/ui/EntryView.tsx`, `src/styles/app.css`.
- **Cơ chế:**
  - Kho 7.298 từ có hơn 2.028 từ mang từ 2 đến 3 từ loại (như `ski` vừa là `v.` vừa là `n.`, `fast` là `adj. adv. v.`).
  - Dữ liệu từ loại được trích xuất từ toàn bộ `public/atlas/entries/*.json` và lưu vào phần tử thứ 8 (`r[7]`) của `public/atlas/index.json`.
  - Trên thẻ từ vựng (`VirtualGrid` & `VirtualList`), các nhãn từ loại (`.tile-pos-tag`) luôn hiển thị rõ ràng ngay cả khi đang bật chế độ ẩn chữ (Active Recall). Điều này giúp người học phân biệt các thẻ tranh gần giống nhau (như `ski` vs `skiing`) để suy ngẫm từ vựng chính xác.


### 3.5. Chế độ học Câu ngữ cảnh đa năng (Daily & IELTS Sentence Modes)
- **Tập tin chính:** `src/lib/router.ts`, `src/pages/Atlas.tsx`, `src/styles/app.css`, `public/atlas/sentences-daily.json`, `public/atlas/sentences-ielts.json`.
- **Cơ chế:**
  - Trang Từ điển (`AtlasPage`) hỗ trợ 3 chế độ học qua tham số URL `mode`:
    1. `mode = "word"` (mặc định): Học từ vựng, phiên âm UK, từ loại và nghĩa.
    2. `mode = "daily"`: Học 7.298 câu ví dụ Hàng ngày gắn liền với bức tranh (100% có file ghi âm mp3 bản xứ `audio/ex/`).
    3. `mode = "ielts"`: Học 7.298 câu ví dụ Ngữ cảnh IELTS học thuật nâng cao (`audio/ex2/` và giọng đọc chuẩn).
  - **Tải dữ liệu bất đồng bộ theo nhu cầu (On-Demand Loading):** Dữ liệu câu chỉ được nạp khi người học bấm chọn tab Câu Hàng ngày hoặc Câu IELTS, hoàn toàn không làm chậm tốc độ tải ban đầu của trang Từ vựng.
  - **Cơ chế Active Recall cho câu:** Khi ở chế độ ẩn, câu tiếng Anh bị che dạng `••••••••••••••••••••••••••••••••••••••••`. Khi bấm con mắt 👁️ hé lộ 1 giây:
    - Câu hiện ra trọn vẹn với từ vựng chính được highlight nổi bật bằng thẻ `<mark className="mark-needle">`.
    - Tự động phát âm thanh giọng đọc của cả câu ví dụ (`ex` hoặc `ex2`).


### 3.6. Nút loa gợi ý phát âm & phiên âm độc lập (Audio & IPA Hint Button)
- **Tập tin chính:** `src/pages/Atlas.tsx`, `src/styles/app.css`.
- **Cơ chế:**
  - Ngay cạnh nút con mắt 👁️ trên mỗi card (`VirtualGrid` & `VirtualList`), bổ sung thêm nút biểu tượng loa 🔊 (`<Volume2 />` class `.tile-peek-audio-btn`).
  - Khi người học bấm nút loa này (hoặc nhấp trực tiếp vào dòng phiên âm bị che):
    1. Kích hoạt phát âm thanh chuẩn của từ hoặc câu.
    2. Hé lộ phiên âm quốc tế UK (`w.ipa`) trong 1,2 giây với màu ochre vàng đất nổi bật (`.is-peeking-audio` & `.is-revealed`).
    3. **Đặc biệt:** Mặt chữ tiếng Anh (`w.word` hoặc câu tiếng Anh) **VẪN GIỮ NGUYÊN TRẠNG THÁI BỊ ẨN** (`••••••`).
  - Giúp người học có thể kiểm tra thính giác và ký hiệu phiên âm trước mà không bị lộ chính tả tiếng Anh.

## 4. Quy tắc vàng về tương thích WebKit / Safari iOS

Khi chỉnh sửa mã nguồn, **TUYỆT ĐỐI TUÂN THỦ** các nguyên tắc sau để không làm sập ứng dụng trên iPhone/iPad:

1. **CẤM DÙNG Regex Negative Lookbehind `(?<!...)`:**
   - Safari trên iOS < 16.4 và nhiều trình duyệt WebKit cũ không hỗ trợ cú pháp này và sẽ crash ngay khi nạp bundle với màn hình đỏ:
     `SyntaxError: Invalid regular expression: invalid group specifier name`.
   - **Giải pháp:** Luôn sử dụng ranh giới từ `\b` (word boundary) hoặc xử lý logic chuỗi thuần.
2. **CẤM đăng ký Service Worker tự reload:**
   - Không được dùng `navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload())` vì sẽ tạo vòng lặp reload vô tận trên Safari iOS.
3. **Chính sách Autoplay Audio:**
   - Trình duyệt di động cấm phát âm thanh tự động trừ khi có cử chỉ tương tác của người dùng (`click` / `touchend`).
   - Mọi lệnh phát âm thanh phải bắt nguồn từ sự kiện click của người dùng (như click mở thẻ hoặc click nút hé lộ 1s).

---

## 5. Quy trình Kiểm thử, Đóng gói & Triển khai

Mỗi khi chỉnh sửa xong code, bắt buộc chạy chuỗi kiểm tra sau theo thứ tự:

```bash
# 1. Kiểm tra kiểu TypeScript (phải exit code 0)
pnpm exec tsc --noEmit

# 2. Chạy bộ Unit Test tự động (21/21 tests phải pass)
pnpm test

# 3. Đóng gói thử nghiệm Production bundle
pnpm run build

# 4. Commit và đẩy lên GitHub
git add .
git commit -m "feat/fix: mô tả ngắn gọn thay đổi"
git push origin main
```

Sau khi push, kiểm tra GitHub Actions workflow bằng lệnh:
```powershell
Invoke-RestMethod -Uri 'https://api.github.com/repos/xinchaotamhon/word-atlas_VietNam/actions/runs?per_page=1'
```
Khi workflow kết thúc với `conclusion: success`, hãy gửi link cho người dùng kèm số phiên bản kế tiếp:
`https://xinchaotamhon.github.io/word-atlas_VietNam/?v=<N>`
