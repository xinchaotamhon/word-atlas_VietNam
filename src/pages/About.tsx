import { ArrowUpRight, Database, Github, Heart } from "lucide-react";
import { useAtlas } from "../atlas/context";
import { REPO_URL } from "../config";

const BASE = import.meta.env.BASE_URL;

export function About() {
  const atlas = useAtlas();
  return (
    <div className="page about">
      <header className="about-hero">
        <img src={`${BASE}brand/og.webp`} alt="" />
        <div>
          <p className="eyebrow">Về Word Atlas</p>
          <h1 className="display">Một từ một bức tranh, thắp sáng IELTS.</h1>
          <p className="lede">
            Word Atlas tuyển chọn 8.000 từ vựng IELTS Reading thành {atlas.count.toLocaleString()} mục từ. Mỗi từ kèm một tranh minh họa độc bản, một câu ví dụ đời sống, một câu ví dụ học thuật IELTS, cùng phát âm chuẩn Anh/Mỹ, cụm từ thông dụng và lưu ý tránh nhầm lẫn. Mỗi từ học xong là một vì sao tỏa sáng trên bầu trời của bạn.
          </p>
          <p className="lede">Ứng dụng hoàn toàn miễn phí, mã nguồn mở, không cần đăng ký tài khoản. Mã nguồn theo giấy phép MIT, kho dữ liệu theo CC BY 4.0, ai cũng có thể tự do sử dụng.</p>
          <div className="about-actions">
            <a className="btn btn-primary" href={REPO_URL} target="_blank" rel="noreferrer">
              <Github size={18} /> Xem trên GitHub
            </a>
            <a className="btn btn-ghost" href={`${REPO_URL}/tree/main/data`} target="_blank" rel="noreferrer">
              <Database size={18} /> Tải dữ liệu JSON / CSV
            </a>
          </div>
        </div>
      </header>

      <div className="about-grid">
        <section className="panel">
          <h3 className="eyebrow">Tại sao phương pháp này giúp nhớ lâu?</h3>
          <ul className="feature-list">
            <li>
              <b>Nhìn thấy trước.</b> Mỗi từ vựng có một bức tranh minh họa câu chuyện diễn ra trong ví dụ đầu tiên.
            </li>
            <li>
              <b>Gợi nhớ lại.</b> Chọn nghĩa, nhìn hình điền câu, nghe âm đoán từ, gõ chính tả — chuyển từ nhận biết thụ động sang phản xạ viết chủ động.
            </li>
            <li>
              <b>Gặp lại đúng lúc sắp quên.</b> Thuật toán FSRS tiên tiến (cùng thuật toán với Anki thế hệ mới) tính toán lịch ôn tập tối ưu cho trí nhớ dài hạn.
            </li>
            <li>
              <b>Điểm số trung thực.</b> Chỉ tính kết quả lần thử đầu tiên. Từ trả lời sai sẽ xuất hiện lại dưới dạng câu hỏi khác để củng cố, nhưng không tính gian lận độ chính xác.
            </li>
            <li>
              <b>Dữ liệu thuộc về bạn.</b> Không tài khoản, không máy chủ, toàn bộ tiến độ lưu cục bộ trên trình duyệt của bạn và có thể xuất file sao lưu bất cứ lúc nào.
            </li>
          </ul>
        </section>

        <section className="panel">
          <h3 className="eyebrow">Phím tắt thao tác</h3>
          <dl className="keys">
            <div>
              <dt>
                <kbd>⌘</kbd>
                <kbd>K</kbd> hoặc <kbd>/</kbd>
              </dt>
              <dd>Tìm kiếm từ vựng bất kỳ</dd>
            </div>
            <div>
              <dt>
                <kbd>1</kbd>–<kbd>4</kbd>
              </dt>
              <dd>Chọn đáp án trắc nghiệm</dd>
            </div>
            <div>
              <dt>
                <kbd>Enter</kbd>
              </dt>
              <dd>Xác nhận / Tiếp tục</dd>
            </div>
            <div>
              <dt>
                <kbd>←</kbd> <kbd>→</kbd>
              </dt>
              <dd>Chuyển từ trước / từ tiếp theo trong thẻ từ</dd>
            </div>
            <div>
              <dt>
                <kbd>Esc</kbd>
              </dt>
              <dd>Đóng cửa sổ / hộp thoại</dd>
            </div>
          </dl>
        </section>

        <section className="panel">
          <h3 className="eyebrow">Nguồn gốc dữ liệu</h3>
          <p className="muted">
            Định nghĩa, câu ví dụ, cụm liên kết và ghi chú được biên soạn theo quy chuẩn từ điển nhất quán; hình minh họa phong cách hội họa thống nhất; phát âm chất lượng cao qua công nghệ tổng hợp âm thanh ElevenLabs (giọng Anh Alice, giọng Mỹ Sarah). Toàn bộ nội dung đã qua kiểm thử tự động về cấu trúc dữ liệu. Nếu phát hiện sai sót, rất hoan nghênh bạn mở Issue hoặc gửi PR trên GitHub.
          </p>
          <p className="muted">Word Atlas không phải danh sách từ vựng chính thức của kỳ thi IELTS và không cam kết tăng điểm số. Mục tiêu của dự án là giúp việc học từ vựng tiếng Anh trở nên trực quan, thẩm mỹ và bền vững hơn.</p>
        </section>

        <section className="panel">
          <h3 className="eyebrow">Dành cho nhà phát triển</h3>
          <p className="muted">
            <code>data/word-atlas.json</code> và <code>.csv</code> chứa toàn bộ kho từ vựng; thư mục <code>public/atlas</code> chứa dữ liệu phân mảnh, tranh vẽ và âm thanh dùng cho web. Bạn có thể sử dụng để làm bộ thẻ Anki, mini-app, tiện ích mở rộng trình duyệt hoặc bộ dữ liệu đánh giá mô hình AI.
          </p>
          <a className="link" href={`${REPO_URL}#readme`} target="_blank" rel="noreferrer">
            Xem tài liệu hướng dẫn <ArrowUpRight size={14} />
          </a>
        </section>
      </div>
      <p className="colophon">
        <Heart size={14} /> Dành tặng cho tất cả những ai đang trên hành trình học từ vựng.
      </p>
    </div>
  );
}
