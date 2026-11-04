import { BookOpen, Coffee, Eye, EyeOff, GraduationCap, Grid3x3, List, Search, Shuffle, Sparkles, X } from "lucide-react";
import { Galaxy } from "../galaxy/Galaxy";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useAtlas } from "../atlas/context";
import type { WordRef } from "../atlas/types";
import { play } from "../lib/audio";
import { morphFrom } from "../lib/motion";
import { go, openWord, type Route } from "../lib/router";
import { shuffle, splitHighlight } from "../lib/text";
import { isMastered } from "../store/srs";
import { useStore } from "../store/store";
import { Illustration } from "../ui/Illustration";
import { searchAtlas } from "../ui/Palette";
import { Speak } from "../ui/Speak";

type Status = "all" | "new" | "learning" | "mastered" | "saved";
const STATUS: [Status, string][] = [
  ["all", "Tất cả"],
  ["new", "Chưa học"],
  ["learning", "Đang học"],
  ["mastered", "Đã thuộc"],
  ["saved", "Đã lưu"],
];

type View = "grid" | "list" | "galaxy";
function readView(): View {
  try {
    const v = localStorage.getItem("word-atlas:view");
    return v === "list" || v === "galaxy" ? v : "grid";
  } catch {
    return "grid";
  }
}


type StudyMode = "word" | "daily" | "ielts";
const sentencesCache: Record<string, Record<string, [string, string]>> = {};

function useSentences(mode: StudyMode) {
  const [data, setData] = useState<Record<string, [string, string]> | null>(() => {
    if (mode === "daily" && sentencesCache.daily) return sentencesCache.daily;
    if (mode === "ielts" && sentencesCache.ielts) return sentencesCache.ielts;
    return null;
  });

  useEffect(() => {
    if (mode === "word") {
      setData(null);
      return;
    }
    const key = mode;
    if (sentencesCache[key]) {
      setData(sentencesCache[key]);
      return;
    }
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const file = mode === "daily" ? "sentences-daily.json" : "sentences-ielts.json";
    let active = true;
    fetch(`${base}/atlas/${file}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Record<string, [string, string]>>;
      })
      .then((json) => {
        sentencesCache[key] = json;
        if (active) setData(json);
      })
      .catch((err) => {
        console.error(`Không thể tải ${file}:`, err);
      });
    return () => {
      active = false;
    };
  }, [mode]);

  return data;
}

function highlightHeadword(sentence: string, word: string): React.ReactNode {
  if (!sentence) return "";
  const parts = splitHighlight(sentence, word);
  if (!parts) return sentence;
  return (
    <>
      {parts[0]}
      <mark className="mark-needle">{parts[1]}</mark>
      {parts[2]}
    </>
  );
}

export function AtlasPage({
  route,
}: {
  route: Extract<Route, { page: "atlas" }>;
}) {
  const atlas = useAtlas();
  const cards = useStore((s) => s.progress.cards);
  const bookmarks = useStore((s) => s.progress.bookmarks);
  const [q, setQ] = useState(route.q ?? "");
  const [status, setStatus] = useState<Status>("all");
  const [view, setViewState] = useState<View>(() =>
    route.view === "galaxy" || route.view === "list" || route.view === "grid"
      ? route.view
      : readView(),
  );

  // Flashcard mode: Hide words and definitions by default
  const [hideWords, setHideWords] = useState(true);

  // Random mode: Shuffled by default and re-shuffled whenever switching topic or difficulty level
  const [isShuffled, setIsShuffled] = useState(true);
  const [shuffleSeed, setShuffleSeed] = useState(() => Math.floor(Math.random() * 2 ** 31));

  // Follow the URL when a link switches views while this page is already open.
  useEffect(() => {
    if (route.view === "grid" || route.view === "list" || route.view === "galaxy") setViewState(route.view);
  }, [route.view]);
  const setView = (v: View) => {
    setViewState(v);
    go(
      {
        page: "atlas",
        topic: route.topic,
        level: route.level,
        view: v === "grid" ? undefined : v,
      },
      null,
      true,
    );
  };
  const topic = route.topic;
  const level = route.level;
  const studyMode: StudyMode = route.mode === "daily" || route.mode === "ielts" ? route.mode : "word";
  const sentences = useSentences(studyMode);


  // Auto re-shuffle once whenever topic or difficulty level changes
  const prevFilterRef = useRef<{ topic?: string; level?: string }>({ topic, level });
  useEffect(() => {
    if (prevFilterRef.current.topic !== topic || prevFilterRef.current.level !== level) {
      prevFilterRef.current = { topic, level };
      setShuffleSeed(Math.floor(Math.random() * 2 ** 31));
    }
  }, [topic, level]);

  const handleShuffle = () => {
    setIsShuffled(true);
    setShuffleSeed(Math.floor(Math.random() * 2 ** 31));
  };

  useEffect(() => {
    try {
      localStorage.setItem("word-atlas:view", view);
    } catch {
      /* optional */
    }
  }, [view]);

  const list = useMemo(() => {
    const saved = new Set(bookmarks);
    const ti = topic ? atlas.topics.findIndex((t) => t[0] === topic) : -1;
    const li = level ? atlas.cefr.indexOf(level) : -1;
    const base = q.trim() ? searchAtlas(atlas, q, 5000) : atlas.words;
    const filtered = base.filter((w) => {
      if (ti >= 0 && w.topic !== ti) return false;
      if (li >= 0 && w.cefr !== li) return false;
      const c = cards[w.id];
      if (status === "new") return !c;
      if (status === "learning") return !!c && !isMastered(c);
      if (status === "mastered") return isMastered(c);
      if (status === "saved") return saved.has(w.id);
      return true;
    });
    return isShuffled && !q.trim() ? shuffle(filtered, shuffleSeed) : filtered;
  }, [atlas, q, topic, level, status, cards, bookmarks, isShuffled, shuffleSeed]);

  const setFilter = (patch: Partial<Extract<Route, { page: "atlas" }>>) =>
    go({ page: "atlas", topic, level, view: route.view, ...patch }, null, true);

  return (
    <div className={`page atlas ${view === "galaxy" ? "is-galaxy" : ""}`}>
      <header className="atlas-head">
        <div>
          <p className="eyebrow">
            {studyMode === "daily"
              ? `Câu Hàng ngày · ${atlas.count.toLocaleString()} câu có âm thanh bản xứ`
              : studyMode === "ielts"
              ? `Ngữ cảnh IELTS · ${atlas.count.toLocaleString()} câu học thuật nâng cao`
              : `Từ điển · ${atlas.count.toLocaleString()} từ`}
          </p>
          <h1 className="display">
            {studyMode === "daily" ? (
              <>
                Mỗi một câu,
                <br className="br-sm" />
                đều có một bức tranh.
              </>
            ) : studyMode === "ielts" ? (
              <>
                Mỗi một câu,
                <br className="br-sm" />
                thắp sáng ngữ cảnh IELTS.
              </>
            ) : (
              <>
                Mỗi một từ,
                <br className="br-sm" />
                đều có một bức tranh.
              </>
            )}
          </h1>
          <p className="lede">
            {studyMode === "daily"
              ? "Ngữ cảnh đời sống thường nhật sinh động · 100% âm thanh chuẩn bản xứ · Luyện phản xạ câu qua tranh"
              : studyMode === "ielts"
              ? "Vận dụng câu học thuật chuẩn IELTS · Rèn luyện lập luận và ngữ cảnh nâng cao · Luyện phản xạ qua tranh"
              : `${atlas.examples.toLocaleString()} câu ví dụ nguyên bản · Phát âm Anh/Mỹ · Phân loại theo độ khó và ${atlas.topics.length} chủ đề IELTS`}
          </p>
        </div>
        <label className="search">
          <Search size={19} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm kiếm từ tiếng Anh..."
            spellCheck={false}
            autoComplete="off"
          />
          {q && (
            <button
              className="icon-btn"
              onClick={() => setQ("")}
              aria-label="Xóa tìm kiếm"
            >
              <X size={16} />
            </button>
          )}
        </label>
      </header>

      
      <div className="study-mode-tabs" role="tablist" aria-label="Chế độ học">
        <button
          type="button"
          className={`study-mode-tab ${studyMode === "word" ? "is-active" : ""}`}
          onClick={() => setFilter({ mode: undefined })}
          role="tab"
          aria-selected={studyMode === "word"}
        >
          <BookOpen size={16} />
          <span>Từ vựng ({atlas.count.toLocaleString()})</span>
        </button>
        <button
          type="button"
          className={`study-mode-tab ${studyMode === "daily" ? "is-active" : ""}`}
          onClick={() => setFilter({ mode: "daily" })}
          role="tab"
          aria-selected={studyMode === "daily"}
        >
          <Coffee size={16} />
          <span>Câu Hàng ngày ({atlas.count.toLocaleString()})</span>
        </button>
        <button
          type="button"
          className={`study-mode-tab ${studyMode === "ielts" ? "is-active" : ""}`}
          onClick={() => setFilter({ mode: "ielts" })}
          role="tab"
          aria-selected={studyMode === "ielts"}
        >
          <GraduationCap size={16} />
          <span>Ngữ cảnh IELTS ({atlas.count.toLocaleString()})</span>
        </button>
      </div>

      <div className="filters">
        {view !== "galaxy" && (
          <>
            <div className="chips chips-scroll" role="group" aria-label="Độ khó">
              <button
                className={`chip-btn ${!level ? "is-on" : ""}`}
                onClick={() => setFilter({ level: undefined })}
              >
                Tất cả độ khó
              </button>
              {atlas.cefr.map((l) => (
                <button
                  key={l}
                  className={`chip-btn lv lv-${l} ${level === l ? "is-on" : ""}`}
                  onClick={() =>
                    setFilter({ level: level === l ? undefined : l })
                  }
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="chips chips-scroll" role="group" aria-label="Chủ đề">
              <button
                className={`chip-btn ${!topic ? "is-on" : ""}`}
                onClick={() => setFilter({ topic: undefined })}
              >
                Tất cả chủ đề
              </button>
              {atlas.topics.map(([k, name]) => (
                <button
                  key={k}
                  className={`chip-btn ${topic === k ? "is-on" : ""}`}
                  onClick={() =>
                    setFilter({ topic: topic === k ? undefined : k })
                  }
                >
                  {name}
                </button>
              ))}
            </div>
          </>
        )}
        <div className="filters-row">
          {view !== "galaxy" && (
            <div className="segmented" role="group" aria-label="Trạng thái học">
              {STATUS.map(([k, label]) => (
                <button
                  key={k}
                  className={status === k ? "is-on" : ""}
                  onClick={() => setStatus(k)}
                  aria-pressed={status === k}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <span className="result-count">
            {view === "galaxy"
              ? "Tìm kiếm một từ, Bản đồ sao sẽ đưa bạn tới đó"
              : `${list.length.toLocaleString()} kết quả`}
          </span>

          {view !== "galaxy" && (
            <div
              className="segmented segmented-icons"
              role="group"
              aria-label="Công cụ học tập"
            >
              <button
                type="button"
                className={isShuffled ? "is-on" : ""}
                onClick={handleShuffle}
                aria-label="Xáo trộn ngẫu nhiên"
                title="Xáo trộn ngẫu nhiên (Nhấp để đổi thứ tự mới)"
              >
                <Shuffle size={17} />
              </button>
              <button
                type="button"
                className={hideWords ? "is-on" : ""}
                onClick={() => setHideWords((h) => !h)}
                aria-label={hideWords ? "Hiện từ và nghĩa" : "Ẩn từ và nghĩa (Đoán qua tranh)"}
                title={hideWords ? "Đang ẩn từ & nghĩa (Nhấp để hiện)" : "Ẩn từ & nghĩa (Nhấp để ẩn)"}
              >
                {hideWords ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          )}

          <div
            className="segmented segmented-icons"
            role="group"
            aria-label="Chế độ xem"
          >
            <button
              className={view === "grid" ? "is-on" : ""}
              onClick={() => setView("grid")}
              aria-label="Dạng lưới ảnh"
              aria-pressed={view === "grid"}
            >
              <Grid3x3 size={17} />
            </button>
            <button
              className={view === "list" ? "is-on" : ""}
              onClick={() => setView("list")}
              aria-label="Dạng danh sách"
              aria-pressed={view === "list"}
            >
              <List size={17} />
            </button>
            <button
              className={view === "galaxy" ? "is-on" : ""}
              onClick={() => setView("galaxy")}
              aria-label="Dạng bản đồ sao"
              aria-pressed={view === "galaxy"}
            >
              <Sparkles size={17} />
            </button>
          </div>
        </div>
      </div>

      {view === "galaxy" ? (
        <Galaxy mode="full" focus={q.trim() ? list[0]?.id : null} />
      ) : list.length === 0 ? (
        <div className="empty">
          <img src={`${import.meta.env.BASE_URL}brand/empty.webp`} alt="" />
          <p>Khu vực sao này chưa có từ nào. Hãy thử đổi điều kiện lọc.</p>
        </div>
      ) : view === "grid" ? (
        <VirtualGrid items={list} cards={cards} hideWords={hideWords} studyMode={studyMode} sentences={sentences} />
      ) : (
        <VirtualList items={list} cards={cards} hideWords={hideWords} studyMode={studyMode} sentences={sentences} />
      )}
    </div>
  );
}

function useWindowRange(
  container: React.RefObject<HTMLDivElement | null>,
  rowHeight: number,
  rows: number,
  overscan = 4,
) {
  const [range, setRange] = useState<[number, number]>([0, 12]);
  useLayoutEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = container.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const first = Math.max(0, Math.floor(-top / rowHeight) - overscan);
      const last = Math.min(
        rows,
        Math.ceil((window.innerHeight - top) / rowHeight) + overscan,
      );
      setRange((r) => (r[0] === first && r[1] === last ? r : [first, last]));
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      cancelAnimationFrame(raf);
    };
  }, [container, rowHeight, rows, overscan]);
  return range;
}

function useWidth(ref: React.RefObject<HTMLDivElement | null>) {
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    setW(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

function VirtualGrid({
  items,
  cards,
  hideWords,
  studyMode = "word",
  sentences,
}: {
  items: WordRef[];
  cards: Record<string, { s: number; st: number }>;
  hideWords: boolean;
  studyMode?: StudyMode;
  sentences?: Record<string, [string, string]> | null;
}) {
  const atlas = useAtlas();
  const box = useRef<HTMLDivElement>(null);
  const width = useWidth(box);
  const gap = width < 560 ? 10 : 16;
  const cols = Math.max(
    2,
    Math.floor((width + gap) / ((width < 560 ? 150 : 188) + gap)),
  );
  const cell = (width - gap * (cols - 1)) / cols;
  const isSentence = studyMode !== "word";
  const rowH = cell + (isSentence ? (width < 560 ? 116 : 126) : (width < 560 ? 76 : 86)) + gap;
  const rows = Math.ceil(items.length / cols);
  const [a, b] = useWindowRange(box, rowH, rows, 8);

  const [peeking, setPeeking] = useState<Record<string, boolean>>({});
  const timerRef = useRef<Record<string, number>>({});

  const peek = (w: WordRef, e: React.MouseEvent) => {
    e.stopPropagation();
    const id = w.id;
    if (timerRef.current[id]) {
      window.clearTimeout(timerRef.current[id]);
    }
    setPeeking((prev) => ({ ...prev, [id]: true }));
    if (studyMode === "daily") {
      const s = sentences?.[w.id]?.[0] || w.word;
      void play(atlas.audio(w, "ex"), s, "uk");
    } else if (studyMode === "ielts") {
      const s = sentences?.[w.id]?.[0] || w.word;
      void play(atlas.audio(w, "ex2"), s, "uk");
    } else {
      void play(atlas.audio(w, "uk"), w.word, "uk");
    }
    timerRef.current[id] = window.setTimeout(() => {
      setPeeking((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      delete timerRef.current[id];
    }, 1000);
  };

  useEffect(() => {
    const timers = timerRef.current;
    return () => {
      Object.values(timers).forEach((t) => window.clearTimeout(t));
    };
  }, []);

  const visible: React.ReactNode[] = [];
  if (width > 0)
    for (let r = a; r < b; r++)
      for (let c = 0; c < cols; c++) {
        const w = items[r * cols + c];
        if (!w) break;
        const card = cards[w.id];
        const st = card
          ? card.st === 2 && card.s >= 21
            ? "is-mastered"
            : "is-learning"
          : "";
        const isPeeking = !!peeking[w.id];
        const showWord = !hideWords || isPeeking;
        const sentencePair = sentences?.[w.id];
        const sentenceEn = sentencePair?.[0] || "";
        const sentenceZh = sentencePair?.[1] || "";

        visible.push(
          <button
            key={w.id}
            className={`tile ${st} ${isPeeking ? "is-peeking-card" : ""}`}
            style={{
              transform: `translate(${c * (cell + gap)}px, ${r * rowH}px)`,
              width: cell,
              height: rowH - gap,
            }}
            onClick={(e) => morphFrom(e.currentTarget.querySelector<HTMLElement>(".illo"), () => openWord(w.id))}
          >
            <Illustration
              src={atlas.img(w, "thumb")}
              word={w.word}
              topic={w.topic}
              eager
            />
            <span className="tile-no">
              № {String(w.order + 1).padStart(4, "0")}
            </span>
            {isSentence ? (
              <span className="tile-text tile-text-sentence">
                <div className="tile-sentence-header">
                  <span className="tile-word-sub" lang="en">
                    {showWord ? w.word : "••••••"}
                  </span>
                  <div className="tile-actions">
                    {w.pos && w.pos.length > 0 && (
                      <span className="tile-pos-badges" title={`Từ loại: ${w.pos.join(", ")}`}>
                        {w.pos.map((p) => (
                          <span key={p} className="tile-pos-tag">
                            {p}
                          </span>
                        ))}
                      </span>
                    )}
                    {hideWords && (
                      <span
                        className={`tile-peek-btn ${isPeeking ? "is-peeking" : ""}`}
                        role="button"
                        tabIndex={0}
                        onClick={(e) => peek(w, e)}
                        onKeyDown={(e) => e.key === "Enter" && peek(w, e as unknown as React.MouseEvent)}
                        title="Hé lộ câu trong 1 giây"
                        aria-label="Hé lộ câu trong 1 giây"
                      >
                        <Eye size={13} />
                      </span>
                    )}
                    <span className={`tile-lv lv-${atlas.cefr[w.cefr]}`}>
                      {atlas.cefr[w.cefr]}
                    </span>
                  </div>
                </div>
                <p
                  className={`tile-sentence-en ${showWord ? (isPeeking ? "is-revealed" : "") : "is-masked"}`}
                  lang="en"
                  onClick={hideWords && !isPeeking ? (e) => peek(w, e) : undefined}
                  title={hideWords && !isPeeking ? "Nhấp để nghe & xem trong 1s" : undefined}
                >
                  {showWord
                    ? (sentenceEn ? highlightHeadword(sentenceEn, w.word) : w.word)
                    : "••••••••••••••••••••••••••••••••••••••••"}
                </p>
                <p
                  className={`tile-sentence-zh ${showWord ? (isPeeking ? "is-revealed" : "") : "is-masked"}`}
                  onClick={hideWords && !isPeeking ? (e) => peek(w, e) : undefined}
                  title={hideWords && !isPeeking ? "Nhấp để nghe & xem trong 1s" : undefined}
                >
                  {showWord ? (sentenceZh || w.zh) : "Nhấp 👁️ xem & nghe 1s"}
                </p>
              </span>
            ) : (
              <span className="tile-text">
                <span
                  className={`tile-word ${showWord ? (isPeeking ? "is-revealed" : "") : "is-masked"}`}
                  lang="en"
                  onClick={hideWords && !isPeeking ? (e) => peek(w, e) : undefined}
                  title={hideWords && !isPeeking ? "Nhấp để xem trong 1s" : undefined}
                >
                  {showWord ? w.word : "••••••"}
                </span>
                <div className="tile-actions">
                  {hideWords && (
                    <span
                      className={`tile-peek-btn ${isPeeking ? "is-peeking" : ""}`}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => peek(w, e)}
                      onKeyDown={(e) => e.key === "Enter" && peek(w, e as unknown as React.MouseEvent)}
                      title="Hé lộ từ trong 1 giây"
                      aria-label="Hé lộ từ trong 1 giây"
                    >
                      <Eye size={13} />
                    </span>
                  )}
                  <span className={`tile-lv lv-${atlas.cefr[w.cefr]}`}>
                    {atlas.cefr[w.cefr]}
                  </span>
                </div>
                <div className="tile-meta-row">
                  <span
                    className={`tile-ipa ipa ${showWord ? (isPeeking ? "is-revealed" : "") : "is-masked"}`}
                    onClick={hideWords && !isPeeking ? (e) => peek(w, e) : undefined}
                    title={hideWords && !isPeeking ? "Nhấp để xem trong 1s" : undefined}
                  >
                    {showWord ? (w.ipa || "") : "••••••"}
                  </span>
                  {w.pos && w.pos.length > 0 && (
                    <span className="tile-pos-badges" title={`Từ loại: ${w.pos.join(", ")}`}>
                      {w.pos.map((p) => (
                        <span key={p} className="tile-pos-tag">
                          {p}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
                <span
                  className={`tile-zh ${showWord ? (isPeeking ? "is-revealed" : "") : "is-masked"}`}
                  onClick={hideWords && !isPeeking ? (e) => peek(w, e) : undefined}
                  title={hideWords && !isPeeking ? "Nhấp để xem trong 1s" : undefined}
                >
                  {showWord ? w.zh : "Nhấp 👁️ xem 1s"}
                </span>
              </span>
            )}
          </button>,
        );
      }
  return (
    <div ref={box} className="vgrid" style={{ height: rows * rowH }}>
      {visible}
    </div>
  );
}

function VirtualList({
  items,
  cards,
  hideWords,
  studyMode = "word",
  sentences,
}: {
  items: WordRef[];
  cards: Record<string, { s: number; st: number }>;
  hideWords: boolean;
  studyMode?: StudyMode;
  sentences?: Record<string, [string, string]> | null;
}) {
  const atlas = useAtlas();
  const accent = useStore((s) => s.settings.accent);
  const box = useRef<HTMLDivElement>(null);
  const isSentence = studyMode !== "word";
  const rowH = isSentence ? 74 : 68;
  const [a, b] = useWindowRange(box, rowH, items.length, 8);

  const [peeking, setPeeking] = useState<Record<string, boolean>>({});
  const timerRef = useRef<Record<string, number>>({});

  const peek = (w: WordRef, e: React.MouseEvent) => {
    e.stopPropagation();
    const id = w.id;
    if (timerRef.current[id]) {
      window.clearTimeout(timerRef.current[id]);
    }
    setPeeking((prev) => ({ ...prev, [id]: true }));
    if (studyMode === "daily") {
      const s = sentences?.[w.id]?.[0] || w.word;
      void play(atlas.audio(w, "ex"), s, "uk");
    } else if (studyMode === "ielts") {
      const s = sentences?.[w.id]?.[0] || w.word;
      void play(atlas.audio(w, "ex2"), s, "uk");
    } else {
      void play(atlas.audio(w, "uk"), w.word, "uk");
    }
    timerRef.current[id] = window.setTimeout(() => {
      setPeeking((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      delete timerRef.current[id];
    }, 1000);
  };

  useEffect(() => {
    const timers = timerRef.current;
    return () => {
      Object.values(timers).forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return (
    <div ref={box} className="vlist" style={{ height: items.length * rowH }}>
      {items.slice(a, b).map((w, i) => {
        const card = cards[w.id];
        const isPeeking = !!peeking[w.id];
        const showWord = !hideWords || isPeeking;
        const sentencePair = sentences?.[w.id];
        const sentenceEn = sentencePair?.[0] || "";
        const sentenceZh = sentencePair?.[1] || "";

        return (
          <div
            key={w.id}
            className={`row ${isPeeking ? "is-peeking-row" : ""}`}
            style={{ transform: `translateY(${(a + i) * rowH}px)` }}
            onClick={() => openWord(w.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && openWord(w.id)}
          >
            <Illustration
              src={atlas.img(w, "thumb")}
              word={w.word}
              topic={w.topic}
              className="row-art"
            />
            {isSentence ? (
              <>
                <span
                  className={`row-sentence-en ${showWord ? (isPeeking ? "is-revealed" : "") : "is-masked"}`}
                  lang="en"
                  onClick={hideWords && !isPeeking ? (e) => peek(w, e) : undefined}
                >
                  {showWord
                    ? (sentenceEn ? highlightHeadword(sentenceEn, w.word) : w.word)
                    : "••••••••••••••••••••••••••••••••"}
                </span>
                <span
                  className={`row-zh ${showWord ? (isPeeking ? "is-revealed" : "") : "is-masked"}`}
                  onClick={hideWords && !isPeeking ? (e) => peek(w, e) : undefined}
                >
                  {showWord ? (sentenceZh || w.zh) : "Nhấp 👁️ xem & nghe 1s"}
                </span>
              </>
            ) : (
              <>
                <span className="row-word-wrap">
                  <span
                    className={`row-word ${showWord ? (isPeeking ? "is-revealed" : "") : "is-masked"}`}
                    lang="en"
                    onClick={hideWords && !isPeeking ? (e) => peek(w, e) : undefined}
                  >
                    {showWord ? w.word : "••••••"}
                  </span>
                  {w.pos && w.pos.length > 0 && (
                    <span className="row-pos-badges" title={`Từ loại: ${w.pos.join(", ")}`}>
                      {w.pos.map((p) => (
                        <span key={p} className="tile-pos-tag">
                          {p}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
                <span
                  className={`row-ipa ipa ${showWord ? (isPeeking ? "is-revealed" : "") : "is-masked"}`}
                  onClick={hideWords && !isPeeking ? (e) => peek(w, e) : undefined}
                >
                  {showWord ? w.ipa : ""}
                </span>
                <span
                  className={`row-zh ${showWord ? (isPeeking ? "is-revealed" : "") : "is-masked"}`}
                  onClick={hideWords && !isPeeking ? (e) => peek(w, e) : undefined}
                >
                  {showWord ? w.zh : "Nhấp 👁️ xem 1s"}
                </span>
              </>
            )}
            {hideWords && (
              <span
                className={`row-peek-btn ${isPeeking ? "is-peeking" : ""}`}
                role="button"
                tabIndex={0}
                onClick={(e) => peek(w, e)}
                title="Hé lộ 1s"
              >
                <Eye size={15} />
              </span>
            )}
            <span
              className={`row-dot ${card ? (card.st === 2 && card.s >= 21 ? "is-mastered" : "is-learning") : ""}`}
            />
            <Speak
              url={studyMode === "daily" ? atlas.audio(w, "ex") : studyMode === "ielts" ? atlas.audio(w, "ex2") : atlas.audio(w, accent)}
              text={isSentence ? sentenceEn : w.word}
              accent={accent}
              size="sm"
            />
          </div>
        );
      })}
    </div>
  );
}
