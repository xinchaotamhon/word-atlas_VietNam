import { Download, RotateCcw, Upload } from "lucide-react";
import { useMemo, useRef } from "react";
import { useAtlas } from "../atlas/context";
import { isMastered } from "../store/srs";
import { dayKey, exportBackup, importBackup, resetProgress, store, useStore, type Settings } from "../store/store";
import { toast } from "../ui/Toast";
import { streakOf } from "./Today";

export function Me({ privateAvailable }: { privateAvailable: boolean }) {
  const atlas = useAtlas();
  const progress = useStore((s) => s.progress);
  const settings = useStore((s) => s.settings);
  const saveError = useStore((s) => s.saveError);
  const file = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    const cards = Object.values(progress.cards);
    const days = Object.values(progress.days);
    const r = days.reduce((n, d) => n + d.r, 0);
    const c = days.reduce((n, d) => n + d.c, 0);
    const t = days.reduce((n, d) => n + d.t, 0);
    const now = Date.now();
    const forecast = Array.from({ length: 7 }, (_, i) => {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      end.setDate(end.getDate() + i);
      const start = new Date(end);
      start.setHours(0, 0, 0, 0);
      return cards.filter((x) => (i === 0 ? x.due <= end.getTime() : x.due >= start.getTime() && x.due <= end.getTime())).length;
    });
    void now;
    return { learned: cards.length, mastered: cards.filter(isMastered).length, reviews: r, accuracy: r ? Math.round((c / r) * 100) : 0, minutes: Math.round(t / 60), forecast };
  }, [progress]);

  const set = (patch: Partial<Settings>) => store.settings(patch);
  const download = () => {
    const blob = new Blob([exportBackup()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `word-atlas-backup-${dayKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const restore = async (f: File) => {
    if (f.size > 30 * 1024 * 1024) return toast("Tệp quá lớn, không giống bản sao lưu học tập.", "warn");
    const r = importBackup(await f.text());
    toast(r.ok ? `Đã khôi phục ghi nhớ cho ${r.cards} từ` : r.error, r.ok ? "ok" : "warn");
  };
  const maxF = Math.max(1, ...stats.forecast);

  return (
    <div className="page me">
      <header className="page-head">
        <p className="eyebrow">Cá nhân</p>
        <h1 className="display">Bầu trời sao của bạn</h1>
      </header>

      <section className="stat-strip">
        <div>
          <dt>Chuỗi liên tục</dt>
          <dd>
            {streakOf(progress.days)}
            <small>ngày</small>
          </dd>
        </div>
        <div>
          <dt>Đã học</dt>
          <dd>{stats.learned.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Nhớ lâu dài</dt>
          <dd>{stats.mastered.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Độ chính xác lần đầu</dt>
          <dd>
            {stats.accuracy}
            <small>%</small>
          </dd>
        </div>
        <div>
          <dt>Thời gian học</dt>
          <dd>
            {stats.minutes}
            <small>phút</small>
          </dd>
        </div>
      </section>

      <div className="me-grid">
        <section className="panel">
          <h3 className="eyebrow">20 tuần qua</h3>
          <Heatmap days={progress.days} />
          <p className="muted">Mỗi ô là một ngày, màu càng đậm làm càng nhiều câu.「Nhớ lâu dài」nghĩa là độ ổn định trí nhớ vượt 21 ngày.</p>
        </section>

        <section className="panel">
          <h3 className="eyebrow">Lượng ôn tập 7 ngày tới</h3>
          <ol className="forecast">
            {stats.forecast.map((n, i) => (
              <li key={i}>
                <span style={{ height: `${(n / maxF) * 100}%` }} />
                <b>{n}</b>
                <small>{i === 0 ? "Hôm nay" : i === 1 ? "Ngày mai" : `+${i}`}</small>
              </li>
            ))}
          </ol>
        </section>

        <section className="panel settings">
          <h3 className="eyebrow">Cài đặt học tập</h3>
          <Field label="Từ mới mỗi ngày" hint="Ôn tập không giới hạn, thuật toán chỉ sắp xếp từ sắp quên.">
            <div className="segmented">
              {[5, 10, 15, 20, 30].map((n) => (
                <button key={n} className={settings.dailyNew === n ? "is-on" : ""} onClick={() => set({ dailyNew: n })}>
                  {n}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Bắt đầu từ độ khó nào" hint="Bỏ qua các từ cấp thấp bạn đã quen thuộc.">
            <div className="segmented">
              {atlas.cefr.map((l, i) => (
                <button key={l} className={settings.startLevel === i ? "is-on" : ""} onClick={() => set({ startLevel: i })}>
                  {l}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Tỷ lệ ghi nhớ mục tiêu" hint="Càng cao thì ôn càng thường xuyên. 90% là mức tối ưu cho đa số người học.">
            <div className="segmented">
              {[0.85, 0.9, 0.95].map((n) => (
                <button key={n} className={settings.retention === n ? "is-on" : ""} onClick={() => set({ retention: n })}>
                  {Math.round(n * 100)}%
                </button>
              ))}
            </div>
          </Field>
          <Field label="Giọng phát âm">
            <div className="segmented">
              <button className={settings.accent === "uk" ? "is-on" : ""} onClick={() => set({ accent: "uk" })}>
                Anh (UK)
              </button>
              <button className={settings.accent === "us" ? "is-on" : ""} onClick={() => set({ accent: "us" })}>
                Mỹ (US)
              </button>
            </div>
          </Field>
          <Field label="Giao diện">
            <div className="segmented">
              {(
                [
                  ["system", "Theo hệ thống"],
                  ["light", "Sáng"],
                  ["dark", "Tối"],
                ] as const
              ).map(([k, l]) => (
                <button key={k} className={settings.theme === k ? "is-on" : ""} onClick={() => set({ theme: k })}>
                  {l}
                </button>
              ))}
            </div>
          </Field>
          <Toggle label="Tự động phát âm" on={settings.autoplay} set={(v) => set({ autoplay: v })} />
          <Toggle label="Âm thanh thao tác" on={settings.sfx} set={(v) => set({ sfx: v })} />
          <Toggle label="Hiệu ứng mở đầu (1 lần/ngày)" on={settings.splash} set={(v) => set({ splash: v })} />
          <Toggle label="Kèm câu hỏi chính tả khi ôn tập" on={settings.spell} set={(v) => set({ spell: v })} />
          {privateAvailable && (
            <Field label="Kho từ điển" hint="Kho từ riêng chỉ khả dụng trên máy chủ phát triển cục bộ.">
              <div className="segmented">
                <button className={settings.dataset === "open" ? "is-on" : ""} onClick={() => set({ dataset: "open" })}>
                  Từ điển mở
                </button>
                <button className={settings.dataset === "private" ? "is-on" : ""} onClick={() => set({ dataset: "private" })}>
                  Bộ riêng 8000
                </button>
              </div>
            </Field>
          )}
        </section>

        <section className="panel">
          <h3 className="eyebrow">Dữ liệu</h3>
          <p className="muted">Tiến độ chỉ lưu trong trình duyệt của thiết bị này: không cần tài khoản, không máy chủ. Khi đổi máy, chỉ cần xuất sao lưu và nhập lại.</p>
          {saveError && <p className="warn-text">Trình duyệt từ chối lưu (có thể do chế độ ẩn danh hoặc đầy bộ nhớ). Vui lòng sớm xuất sao lưu.</p>}
          <div className="data-actions">
            <button className="btn btn-ghost" onClick={download}>
              <Download size={18} /> Xuất sao lưu
            </button>
            <button className="btn btn-ghost" onClick={() => file.current?.click()}>
              <Upload size={18} /> Nhập sao lưu
            </button>
            <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && restore(e.target.files[0]).finally(() => (e.target.value = ""))} />
            <button
              className="btn btn-ghost btn-danger"
              onClick={() => {
                if (confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử học tập? Thao tác này không thể hoàn tác, bạn nên xuất bản sao lưu trước.")) {
                  resetProgress();
                  toast("Lịch sử học tập đã được xóa");
                }
              }}
            >
              <RotateCcw size={18} /> Xóa lịch sử
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <div>
        <b>{label}</b>
        {hint && <small>{hint}</small>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <label className="field toggle">
      <b>{label}</b>
      <input type="checkbox" role="switch" checked={on} onChange={(e) => set(e.target.checked)} />
      <span className="switch" aria-hidden="true" />
    </label>
  );
}

function Heatmap({ days }: { days: Record<string, { r: number }> }) {
  const weeks = 20;
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (weeks * 7 - 1) - end.getDay());
  const cells: { k: string; v: number; future: boolean }[] = [];
  const d = new Date(start);
  for (let i = 0; i < (weeks + 1) * 7; i++) {
    const k = dayKey(d);
    cells.push({ k, v: days[k]?.r ?? 0, future: d > end });
    d.setDate(d.getDate() + 1);
  }
  const lvl = (v: number) => (v === 0 ? 0 : v < 10 ? 1 : v < 25 ? 2 : v < 50 ? 3 : 4);
  return (
    <div className="heatmap" role="img" aria-label="Biểu đồ nhiệt học tập">
      {cells.map((c) => (
        <span key={c.k} className={`h${c.future ? "x" : lvl(c.v)}`} title={`${c.k} · ${c.v} câu`} />
      ))}
    </div>
  );
}
