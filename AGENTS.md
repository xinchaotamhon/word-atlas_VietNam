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


### 3.7. Việt hóa 100% toàn bộ cơ sở dữ liệu & Che câu thông minh (v=12)
- **Tập tin chính:** `src/pages/Atlas.tsx`, `src/styles/app.css`, `public/atlas/index.json`, `public/atlas/sentences-*.json`, `public/atlas/entries/*.json`.
- **Cơ chế & Thay đổi:**
  1. **Việt hóa 100% dữ liệu:** Dịch toàn bộ 7.298 định nghĩa từ, 7.298 câu ví dụ Hàng ngày, 7.298 câu ngữ cảnh IELTS, 24.722 cụm từ thường gặp (`col`), 7.280 mẹo ghi nhớ (`tip`), 6.295 nét nghĩa phụ (`senses`) và 19 chủ đề học tập sang tiếng Việt chuẩn, tự nhiên. Không còn ký tự tiếng Trung nào trong toàn bộ ứng dụng.
  2. **Che câu thông minh (Smart Masking) & Khắc phục tràn viền:** Thay thế chuỗi 40 dấu chấm liền nhau cũ bằng cơ chế che từng từ bảo toàn khoảng trắng (`sentenceEn.replace(/[a-zA-Z0-9]/g, "•")`), tự động xuống hàng 2-3 dòng theo khung thẻ. Bổ sung `overflow: hidden;`, `word-break: break-word;`, `overflow-wrap: anywhere;` trên thẻ để chống tràn viền tuyệt đối.


### 3.8. Luyện gõ trực tiếp trên từng thẻ & Bộ lọc nhiều cấp độ CEFR lũy tiến (v=13)
- **Tập tin chính:** `src/pages/Atlas.tsx`, `src/styles/app.css`.
- **Cơ chế & Thay đổi:**
  1. **Luyện tập gõ (Typing Practice) trực tiếp trên mỗi card:**
     - Tích hợp nút bàn phím `<Keyboard size={13/15} />` trên từng thẻ từ/câu ở cả chế độ lưới (`VirtualGrid`) và danh sách (`VirtualList`).
     - Khi bấm vào biểu tượng bàn phím, thẻ chuyển sang giao diện gõ ôn tập (`inline typing mode`).
     - Hiển thị gợi ý nghĩa tiếng Việt (`w.zh` hoặc `sentenceZh`), các ký tự chưa gõ được che bằng dấu chấm giữa `·` (bảo tồn dấu cách và dấu câu `?`, `,`, `!`, `'` chuẩn xác theo phòng luyện gõ).
     - **Không được in đáp án (v=14):** hàng đợi ký tự do hàm thuần `promptCells(target, typed, revealed)` trong `src/lib/typing.ts` sinh ra. Ký tự **chưa gõ** → che `·`; ký tự **gõ đúng** → in đúng chữ đó, màu đất nung (`is-ok`); ký tự **gõ sai** → in **chữ người học vừa gõ**, màu đỏ (`is-bad`). Tuyệt đối không in ký tự đúng của đáp án ở vị trí gõ sai (lỗi cũ của `v=13`: mỗi lần gõ là hé một chữ của đáp án). Có 7 unit test trong `src/lib/typing.prompt.test.ts` canh đúng điều này.
     - Nút `Đáp án` trong header thẻ là **đường duy nhất** để in cả câu; khi đã bấm thì ô nhập chuyển `readOnly` và con trỏ biến mất.
     - Phản hồi bàn phím tức thì: âm thanh gõ phím `cue("key")`, con trỏ nhấp nháy (`is-caret`).
     - Khi gõ đúng 100%, phát âm thanh chúc mừng `cue("correct")` và tự động phát âm chuẩn UK của từ/câu.
     - Hỗ trợ đóng nhanh bằng phím `Escape`, nút `X`, hoặc bấm lại vào icon bàn phím.
     - **Bẫy đã gặp:** `<input>` ẩn của chế độ gõ phủ toàn thẻ (`position:absolute; inset:0`), nên nó nuốt mọi cú click chuột vào `X` và `Đáp án`. Giữ `.tile-typing-header/.tile-typing-prompt` (và bản `row-`) ở `z-index: 2`, nếu không hai nút này chỉ dùng được bằng bàn phím.
  2. **Bộ lọc cấp độ CEFR thông minh (Cascading & Multi-select):**
     - Khi chưa chọn cấp độ: bấm vào độ khó cao (như B1, B2) thì toàn bộ các cấp độ phía dưới (A1, A2...) tự động được chọn lũy tiến (`A1, A2, B1...`).
     - Cho phép người dùng linh hoạt tích chọn hoặc bật/tắt riêng từng cấp độ tùy thích theo nhu cầu ôn luyện.
     - Nút "Tất cả độ khó" cho phép khôi phục hiển thị toàn bộ danh sách.

### 3.9. Che hình minh họa — luyện nhớ không có tranh (v=14)
- **Tập tin chính:** `src/pages/Atlas.tsx`, `src/ui/Illustration.tsx`, `src/store/store.ts`, `src/styles/app.css`.
- **Cơ chế:**
  - Trạng thái nằm trong `Settings.hideArt` (`store.settings({ hideArt })`), mặc định `false`, có kiểm tra trong `sanitizeSettings` nên bản `settings` cũ trong `localStorage` vẫn nạp được.
  - Nút trên thanh lọc (`ImageOff` / `Image`) bật/tắt cho **toàn bộ** thẻ; nhãn `aria-pressed` phản ánh trạng thái.
  - `Illustration` nhận prop `veiled`; lớp `.illo-veil` phủ lên `<img>` **mà không gỡ ảnh khỏi DOM**, nên khi mở ra ảnh hiện ngay trong một khung hình (không nháy, không tải lại).
  - Chạm vào lớp phủ → `peekArt(w, e)`: mở ảnh đúng **1.000 ms** rồi tự che lại, cùng nhịp với `peek()` của từ. Trong danh sách, `veilHint` được rút ngắn còn "Xem 1s" và ẩn chữ gợi ý dưới 48 px.
  - **Không** đụng tới trạng thái ẩn/hiện của từ: ẩn hình và ẩn chữ là hai công tắc độc lập.

### 3.10. Ghi âm và so với giọng bản xứ — đường phụ (v=14)
- **Tập tin chính:** `src/ui/VoiceCheck.tsx` (chỉ còn `VoicePractice`), `src/lib/voice.ts`, `src/ui/EntryView.tsx`, `src/styles/app.css`.
- **Vị trí hiện nay:** nằm trong khối `<details>` "Chỉ muốn nghe lại giọng mình để tự so" bên dưới phần máy chấm (§3.13), vì chủ dự án đã nói rõ tự so là không đủ.
- **Cơ chế:**
  - `VoicePractice` mở từ khối `<details>` trong `PronounceCheck.tsx` (`VoiceLab`), hoặc từ trang chi tiết từ (`EntryView`).
  - `VoicePractice` dùng `getUserMedia` + `MediaRecorder`; `pickAudioMime()` chọn container theo thứ tự `audio/webm;codecs=opus` → `audio/webm` → `audio/mp4` (Safari) → `audio/ogg;codecs=opus`; không có container nào khớp thì để trình duyệt tự chọn.
  - Bản ghi tối đa `RECORD_LIMIT_MS` = 12 giây, có đồng hồ `elapsedLabel()`. Bản ghi là **blob trong bộ nhớ**, `URL.revokeObjectURL` khi thu lại hoặc khi đóng bảng; `getTracks().stop()` khi dừng và khi unmount, nên micro không bao giờ sống lâu hơn bảng.
  - Ba nút sau khi thu: `Nghe giọng tôi`, `So sánh hai giọng` (bản xứ → nghỉ `COMPARE_GAP_MS` → giọng người học), `Thu lại`.
  - **Không chấm điểm và không gửi gì lên mạng.** Tính năng cố ý để tai người học tự phán; `recorderErrorMessage()` dịch `NotAllowedError`/`NotFoundError`/`NotReadableError` thành câu nói rõ phải làm gì.
  - Trang phải chạy trên **https hoặc localhost** thì trình duyệt mới cho ghi âm; `recorderSupported()` trả `false` thì bảng hiện lời giải thích thay vì nút.
  - **Bắt buộc có trạng thái `asking`:** trước `await getUserMedia`, đặt `phase = "asking"` để nút đổi thành "Đang xin quyền…" và hiện câu hướng dẫn. Thiếu nó, một hộp thoại xin quyền bị bỏ qua (hoặc một quyền đã bị chặn từ trước) khiến người dùng thấy như nút không có tác dụng.

### 3.11. Bẫy layout: `Sheet` phải render qua portal (v=14)
- **Tập tin chính:** `src/ui/Sheet.tsx`, `src/styles/app.css` (`.page`, `@keyframes page-in`).
- **Sự cố thật, đo ngày 2026-11-24:** `.page` giữ `animation: page-in … both`, nên `transform` của nó **không trở về `none`** sau khi chạy xong (đo được `matrix(1, 0, 0, 1, 0, 0)`). Một `transform` trên tổ tiên biến `position: fixed` của `.sheet-root` thành "neo vào tổ tiên đó": `.sheet-root` cao bằng cả trang (2 261 px thay vì 928 px của màn hình) và bảng nằm ở `top = 1047` — **ngoài tầm nhìn**, chỉ còn tấm nền mờ phủ lên trang. Người dùng chỉ thấy "màn hình mờ, không thấy gì khác".
- **Quy tắc:** mọi `Sheet` phải `createPortal(..., document.body)`. Token CSS nằm ở `:root` nên portal không làm mất theme.
- **Bài học kiểm thử:** `isVisible()` của Playwright trả `true` cho phần tử nằm ngoài màn hình (nó chỉ hỏi "có hộp hay không"), và `click()` tự cuộn tới phần tử nên cũng không bắt được lỗi. Phép kiểm tra đúng phải so `getBoundingClientRect()` với `innerHeight`; số đo và cách sửa nằm trong `hau_can.md`.

### 3.12. Không in nhãn CEFR trên từng thẻ (v=14)
- **Tập tin chính:** `src/pages/Atlas.tsx`, `src/styles/app.css`.
- **Lý do:** cấp độ đã được chọn bằng bộ lọc phía trên, nên nhãn `A1/B1…` lặp lại thông tin đó trên mọi thẻ và chiếm chỗ của các nút tác vụ.
- **Đã bỏ:** `<span className="tile-lv">` ở cả `VirtualGrid` (chế độ từ và chế độ câu) và luật CSS `.tile-lv`. **Giữ nguyên:** nhãn từ loại `.tile-pos-tag` (cần để phân biệt `ski` / `skiing`) và chip cấp độ trong trang chi tiết từ (`EntryView`, `.chip-level`), nơi cấp độ là thuộc tính của từ chứ không phải bản sao của bộ lọc.

### 3.13. Máy chấm phát âm — thay cho "nghe lại rồi tự so" (v=14)
- **Tập tin chính:** `src/lib/speech.ts` (toàn bộ luật chấm, hàm thuần), `src/lib/speech.test.ts` (13 test), `src/ui/PronounceCheck.tsx` (`PronounceCheck` + `VoiceLab` + `VoiceCheck`), `src/ui/VoiceCheck.tsx` (chỉ còn `VoicePractice`, phần ghi âm tự so, giờ là đường phụ).
- **Vì sao đổi:** chủ dự án dùng thử bản đầu và nói thẳng: *"Nghe lại và tự so tôi thấy không hợp lý, cần có cách khác"*. Tai của người đang học không phải là một phán quyết; máy phải nói đúng/sai.
- **Đường đi:** `SpeechRecognition` / `webkitSpeechRecognition` của trình duyệt, `en-GB`, `maxAlternatives = 5`, `interimResults = true` (hiện chữ đang nghe được), tự dừng sau 12 giây.
- **Luật chấm (không cần model âm vị):**
  1. Chuẩn hoá chữ (bỏ hoa, bỏ dấu câu); nếu một phương án nghe được **trùng từ** → 100, "Chuẩn".
  2. Nếu máy nghe ra **từ khác**, tra IPA của từ đó trong `public/atlas/index.json` (đã có đủ 7 298 từ) rồi so chuỗi âm với IPA của từ chuẩn bằng LCS: `diffUnits()` gộp cặp xoá+thêm thành một phép thay, `explainPhonemes()` in ra "đọc /ɪ/ thay vì /iː/". Điểm 90 − 20 × số âm lệch (sàn 35), nhãn "Gần đúng".
  3. Từ không có trong kho → chấm theo khoảng cách chữ; lệch quá nửa từ → "Chưa nghe rõ" (không bao giờ gọi là "sai").
  4. **Im lặng là một kết luận riêng** (`Không nghe thấy gì…`), không phải điểm 0.
  5. Câu: so từng từ bằng LCS, tô đỏ từ máy không nghe ra, in `Được x/10 từ`.
- **Ranh giới phải giữ trong giao diện, không được giấu:**
  - Đây là **nhận dạng giọng nói**, không phải chấm điểm âm vị của người bản xứ; điểm số là "mức khớp chuỗi âm máy nghe được", và câu này in ngay dưới thẻ điểm.
  - Âm thanh rời khỏi máy tới dịch vụ của **chính trình duyệt** (Chrome dùng máy chủ Google). Vì vậy lần bấm đầu tiên phải hiện lời giải thích và một nút đồng ý (`Bắt đầu chấm phát âm`) — không tự động gửi.
  - Trình duyệt không có bộ nhận dạng (Firefox) → hiện lời giải thích và mời dùng đường ghi âm tự so.
- **Bẫy đã gặp (1):** ở `mode=daily`/`ielts`, `sentences` nạp bất đồng bộ; nếu người dùng mở bảng trước khi câu về thì `sentence` là `null` và bảng chấm **từ** thay vì **câu**. Phép kiểm tra phải chờ `.voice-sentence` xuất hiện, và khi sửa luồng này phải giữ nguyên hành vi dự phòng đó.
- **Bẫy đã gặp (2) — "máy đang chờ bạn nói" mà không có gì xảy ra:** Chrome **không gửi sự kiện nào** trong lúc chờ tiếng nói, và có thể kết thúc một lượt **hoàn toàn im lặng**: đo trên chính máy này (`D:\dsh-tmp\speech-probe.mjs`, đã xoá) ra `start → audiostart → soundstart → speechstart → speechend → audioend → end` — **không `result`, cũng không `error`**. Vì vậy giao diện **không được** chỉ hiện "đang nghe":
  1. `openMeter()` mở micro **lần thứ hai** bằng `getUserMedia` + `AnalyserNode` chỉ để vẽ **mức âm lượng thật** (`.say-meter`); nếu mở được mà thanh không nhúc nhích khi người dùng nói thì lỗi ở micro của máy, không phải ở ứng dụng — đây là câu trả lời nhanh nhất cho câu hỏi "sao không có gì xảy ra".
  2. `addEventListener` cho `audiostart`/`soundstart`/`speechstart`/`speechend` cập nhật câu trạng thái, để người dùng thấy Chrome đã đi tới bước nào.
  3. **Đồng hồ canh** `LISTEN_LIMIT_MS = 9 000`: hết 9 giây mà chưa có kết quả thì `stop()` rồi báo rõ, kèm biến thể "đã nghe thấy tiếng" / "không thu được âm thanh nào" theo `peakRef`.
  4. `onend` không có kết quả là **một kết luận riêng**, không phải im lặng: `Chrome kết thúc lượt nghe mà không trả về chữ nào…`.
  5. `SILENT_MS = 2 500`: micro không thu được gì sau 2,5 giây thì hiện cảnh báo màu vàng ngay trong lúc nghe.
- **Quy tắc kiểm thử:** phải có ba ca giả lập — bộ nhận dạng **không bao giờ trả lời** (canh đồng hồ), bộ nhận dạng **kết thúc rỗng** (`end` không `result`), và bộ nhận dạng **trả lời bình thường**. Ba ca này nằm trong `D:\dsh-tmp\verify-stall.mjs` (một lần, đã xoá) và đạt `10/10`; nếu chỉ kiểm ca thứ ba thì lỗi im lặng sẽ quay lại mà không ai biết.
- **Chấm ngay trên thẻ, không mở bảng (v=14, yêu cầu trực tiếp của chủ dự án: "bỏ cái bảng đó đi… đừng làm người dùng phải thao tác nhiều hơn mức cần thiết"):** nút micro trên thẻ **bật/tắt tại chỗ** (`sayingId`, giống hệt cơ chế `typingId` của chế độ gõ), không còn `Sheet`. `PronounceCheck` có prop `compact` cho bố cục trong thẻ; `VoiceLab` (không compact) chỉ còn dùng ở trang chi tiết từ.
  - Đồng ý gửi giọng hỏi **một lần duy nhất trong đời máy** (`Settings.sayConsent`), không hỏi lại mỗi lần bấm.
  - Trong lưới, phần chấm nằm trong thẻ; trong **danh sách**, dòng chỉ cao 60 px nên phần chấm **nổi ngay dưới dòng** (`.row-inline-say`, `.row.is-saying-row` với `z-index: 10`) — nếu nhét vào trong dòng thì nó bị cắt mất (đã đo: nút không bấm được).
- **Động cơ nhận dạng phải kiểm trước khi tin:** đo trên chính máy chủ dự án ngày 2026-11-24 bằng cách cho Chrome **nghe một file giọng bản xứ thật** (`palace.mp3` → WAV 48 kHz mono qua `ffmpeg-full`, script `D:\dsh-tmp\speech-file-test.mjs`):
  - **Chrome:** `start → audiostart → soundstart → speechstart → speechend → audioend → end`, **không `result`, không `error`** → dịch vụ Google bị chặn ở đây, tính năng không thể chạy.
  - **Edge:** có `result` nhưng `alts=[""]` (rỗng).
  Vì vậy **không được coi Web Speech API là động cơ chắc chắn**: hãy kiểm bằng file WAV trước khi hứa.

### 3.14. Động cơ chấm hiện tại: Whisper chạy trong trang, offline (v=14)
- **Tập tin chính:** `src/lib/asr.ts`, `public\asr\**`, `src/ui/PronounceCheck.tsx`.
- **Vì sao đổi lần thứ ba:** sau khi đo ra Web Speech API không dùng được trên máy này (§3.13), chủ dự án chọn đường tải một lần. Đã tải **63,0 MB** vào `public\asr\` (đúng những gì đã báo trước khi tải):

      transformers.min.js                              888 173 B
      ort-wasm-simd-threaded.jsep.mjs                   44 484 B
      ort-wasm-simd-threaded.jsep.wasm              21 596 019 B
      models\whisper-tiny.en\onnx\encoder_model_quantized.onnx  10 124 993 B
      models\whisper-tiny.en\onnx\decoder_model_merged_quantized.onnx 30 718 858 B
      config/tokenizer/preprocessor/generation      2 686 523 B   (4 tập tin)
      --------------------------------------------------------------
      TỔNG                                          66 065 050 B (63,0 MB)

  Licence: model `whisper-tiny.en` **Apache-2.0**; thư viện `@huggingface/transformers` 3.8.1 (Apache-2.0) và ONNX Runtime Web (MIT). Không script cài nào chạy; chỉ là tệp tĩnh nằm trong `public\asr\`.
- **Cách dùng trong code:** `loadTranscriber()` nạp thư viện bằng `import('/asr/transformers.min.js')` (đường dẫn theo `import.meta.env.BASE_URL` nên chạy đúng cả khi deploy dưới `/word-atlas_VietNam/`), đặt `env.allowRemoteModels = false`, `env.localModelPath = <base>/asr/models/`, `env.backends.onnx.wasm.wasmPaths = <base>/asr/`, `numThreads = 1`, `dtype: "q8"`. Bộ nạp được giữ trong một promise dùng chung: cả phiên chỉ nạp **một lần**, sau đó chạy offline hoàn toàn (WebGPU khi có, WASM khi không).
- **Một micro, hai người đọc:** `getUserMedia` mở **một** luồng; `MediaRecorder` ghi, `AnalyserNode` vẽ mức âm lượng — không còn mở micro hai lần như bản Web Speech.
- **Tự dừng thông minh:** `SPEECH_LEVEL = 0.035` để biết đã có tiếng nói; sau khi nói, `TRAILING_SILENCE_MS = 900` im lặng thì tự dừng; trần cứng `MAX_RECORD_MS = 9 000`. Người học không phải bấm gì thêm.
- **Đo được:** nạp thư viện + model lần đầu **6,2 s**; chép lại một file giọng bản xứ 0,88 s thành **`" Palace."` trong 2,6 s** (`D:\dsh-tmp\asr-proof.mjs`). Đầu-cuối trong app, micro là chính file WAV đó: **`100 · Chuẩn Máy nghe đúng là «palace».`** sau **31 s** kể từ cú bấm đầu tiên, gồm cả lần nạp model đầu tiên (`7/7` kiểm tra).
- **Ranh giới đã đổi:** giọng nói **không rời khỏi máy** nữa — câu giải thích trong giao diện và trong `Settings.sayConsent` phải nói đúng điều đó (trước đây nói ngược lại vì dùng dịch vụ của trình duyệt).
- **Bố cục trong thẻ phải vừa thẻ (đo, không đoán):** thẻ từ chỉ cao ~300 px; câu giải thích dài đẩy nút ra ngoài và người dùng chỉ thấy chữ bị cắt (chủ dự án gặp đúng lỗi này: *"là sao nhỉ? bao giờ mới tải xong?"*). Vì vậy trong `compact`:
  1. **Nút chính là lời giải thích** — nhãn của nó ghi chi phí một lần (`Tải 63 MB & nói`), không có bước đồng ý riêng.
  2. Bỏ dòng phiên âm khi mở phần chấm (chữ đã hiện ngay trên đó).
  3. `.say-line.is-clamp` cắt còn 2 dòng (kết quả 3 dòng) và cỡ chữ 11 px.
  4. `ensureReady()` chạy **trước** khi mở micro, nên nút đổi thành `Đang tải x% <tên file>` và thanh tiến độ là thật; trước đây model chỉ nạp **sau** khi ghi âm xong nên nhìn như không có gì xảy ra.
  Phép kiểm tra đúng phải so `boundingBox` của bảng với `boundingBox` của thẻ (`verify-fit.mjs`, 5/5) — không chỉ hỏi phần tử có tồn tại.
- **Lần sửa thứ hai, sau khi chủ dự án báo "sao có chấm gì đâu nhỉ":** thẻ `war` rộng **214 px**, hàng bốn nút **xuống dòng** và nút `X` lòi ra ngoài đáy thẻ, kéo dòng kết quả ra khỏi tầm nhìn — máy vẫn chấm, người dùng không thấy. Ba quy tắc rút ra:
  1. Hàng nút trong thẻ **cấm xuống dòng**: `.say-compact .say-row { flex-wrap: nowrap }`, nút chính `flex: 1 1 auto; min-width: 0; text-overflow: ellipsis`, các nút icon `flex: none`. Bỏ nút "xoay" khỏi thẻ (nút chính đã là "Chấm lại") để chỉ còn ba nút.
  2. **Kết quả phải có bản ngắn**: `WordVerdict` có thêm trường `short` (ví dụ `đọc /ɪ/ thay vì /iː/.`), vì câu giải thích đầy đủ cần 5 dòng trong thẻ 214 px. Dùng `short` trong `compact`, giữ `hint` cho bảng rộng.
  3. **Đo từng phần tử, không đo cái hộp**: phép kiểm tra phải lấy `Math.max(...)` của `getBoundingClientRect().bottom` trên mọi con (`.tile-say-word, .say-row, .say-btn, .say-line, .say-meter`) trừ đi đáy thẻ, và chạy **sau khi có kết quả** (trạng thái cao nhất). Đo được: **−36 px** khi đang mở, **−5 px** khi có kết quả (`verify-overflow.mjs`, 8/8).
  4. Nút cùng một hàng phải so **tâm** (`top + height/2`) chứ không so `top`: nút chính cao hơn nút icon 3 px nên so `top` sẽ báo sai là xuống dòng.
- **Còn phải đo:** độ chính xác trên giọng **người Việt học tiếng Anh** (mọi con số ở trên là giọng bản xứ tổng hợp), thời gian trên điện thoại, và việc 63 MB có nằm trong giới hạn của GitHub Pages hay không (repo đã ~700 MB).

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

# 2. Chạy bộ Unit Test tự động (47/47 tests phải pass)
pnpm test

# 3. Đóng gói thử nghiệm Production bundle
pnpm run build

# 4. Commit và đẩy lên GitHub
git add .
git commit -m "feat/fix: mô tả ngắn gọn thay đổi"
git push origin main
```

> [!NOTE]
> Trong workspace của chủ dự án, `pnpm` không có trên `PATH` và `node_modules` được cài ở máy khác rồi
> chuyển sang, nên ba bước trên chạy bằng một lệnh duy nhất:
> `dan_chu\ban_do_tieng_anh.cmd -Check` (tsc + toàn bộ unit test + kiểm tra kho từ) và
> `dan_chu\ban_do_tieng_anh.cmd -Build`. Đây là đường duy nhất đã được đo, `hau_can.md` ghi lý do.

Sau khi push, kiểm tra GitHub Actions workflow bằng lệnh:
```powershell
Invoke-RestMethod -Uri 'https://api.github.com/repos/xinchaotamhon/word-atlas_VietNam/actions/runs?per_page=1'
```
Khi workflow kết thúc với `conclusion: success`, hãy gửi link cho người dùng kèm số phiên bản kế tiếp:
`https://xinchaotamhon.github.io/word-atlas_VietNam/?v=<N>`

### 5.1. Phải diễn tập đúng đường phát hành trước khi push (đo 2026-11-25, v=14)

`-Build` ở trên dựng bundle với `base: "/"` — chỉ đúng khi mở trong máy. Trang thật chạy dưới
`/word-atlas_VietNam/`, và `src/lib/asr.ts` dựng **mọi** đường dẫn của bộ nghe từ
`import.meta.env.BASE_URL`, nên một bản build sai `base` sẽ làm micro chết ngay trên trang thật trong khi
máy vẫn chạy tốt. Vì vậy trước khi push phải dựng **đúng base của CI** rồi mở ở đúng đường dẫn con:

```powershell
$env:ATLAS_BASE='/word-atlas_VietNam/'
node node_modules\vite\bin\vite.js build --outDir dist-pages
node node_modules\vite\bin\vite.js preview --outDir dist-pages --port 5199 --strictPort
# rồi mở http://localhost:5199/word-atlas_VietNam/?v=<N> và bấm micro
```

- **Bẫy:** `.gitignore` chỉ có `dist/`, **không** có `dist-pages/`. Dựng thử trong repo rồi `git add -A`
  là đẩy cả **705,5 MB / 37 655 tệp** vào commit. Hoặc dựng ra ngoài repo, hoặc xoá `dist-pages\`
  **trước** `git add` và kiểm lại `git status` (lần v=14 đã đụng đúng bẫy này và chỉ thoát nhờ kiểm lại).
- **Kiểm micro bằng máy, không bằng tai:** cho Chrome giả làm micro bằng một bản ghi thật —
  `--use-fake-device-for-media-stream --use-file-for-fake-audio-capture=<wav>`, sau khi đổi
  `public\atlas\audio\uk\<từ>.mp3` sang WAV 48 kHz mono và **thêm ~2 s im lặng** ở cuối
  (`-af apad=pad_dur=2`) để cơ chế tự dừng theo im lặng cũng được kiểm.
- **Số đo lần v=14** (bản diễn tập chính là thứ CI dựng): 12/12 yêu cầu `/asr/**` trả `200`; kết quả
  `100 · Chuẩn` sau **26,3 s** kể từ cú bấm (đã gồm lần tải 63 MB đầu tiên); 0 lỗi mạng, 0 `pageerror`;
  thẻ 214×300 px còn dư **19 px** và ba nút cùng một hàng.
- **Trang mới gặp hộp thoại chào mừng trước tiên:** mọi phép kiểm tự động phải bấm `.onboard .btn-xl`
  trước, nếu không thì cú click vào thẻ bị chặn và phép kiểm báo sai là "không bấm được".

### 5.2. Giới hạn GitHub Pages so với kích thước thật (đọc 2026-11-25)

| Giới hạn | Con số | Thực tế của repo này |
| --- | --- | --- |
| Kho nguồn (khuyến nghị) | 1 GB | ~769 MB sau khi thêm `public/asr/` (63,0 MB) |
| Trang đã phát hành | 1 GB | ~768 MB |
| Thời gian triển khai | 10 phút | phải đo ở lần deploy kế tiếp, `hau_can.md` |
| Băng thông | 100 GB/tháng (mềm) | mỗi người bấm micro lần đầu là 63 MB |

Đã gần trần: **đừng thêm dữ liệu lớn vào `public/`** nữa. Nếu cần thêm model hay audio, hãy nâng cấp
model đã có (ví dụ `whisper-tiny.en` → `base.en`) thay vì chồng thêm bộ thứ hai.
