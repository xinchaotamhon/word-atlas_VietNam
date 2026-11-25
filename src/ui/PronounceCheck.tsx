import { Mic, RotateCcw, Square, Volume2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Atlas } from "../atlas/types";
import { useAtlas } from "../atlas/context";
import { play } from "../lib/audio";
import { loadTranscriber, transcribe, type LoadProgress } from "../lib/asr";
import { judgeSentence, judgeWord, type SentenceVerdict, type WordVerdict } from "../lib/speech";
import { pickAudioMime, recorderErrorMessage, recorderSupported } from "../lib/voice";
import { store, useStore } from "../store/store";
import { VoicePractice } from "./VoiceCheck";

/** The atlas IPA column, built once per atlas: it is what turns "sai" into "sai âm nào". */
const ipaCache = new WeakMap<Atlas, Map<string, string>>();

function useIpaLookup() {
  const atlas = useAtlas();
  return useMemo(() => {
    let map = ipaCache.get(atlas);
    if (!map) {
      map = new Map<string, string>();
      for (const w of atlas.words) if (w.ipa) map.set(w.word.toLowerCase(), w.ipa);
      ipaCache.set(atlas, map);
    }
    const lookup = (word: string) => map?.get(word.trim().toLowerCase());
    return lookup;
  }, [atlas]);
}

type Status = "idle" | "loading" | "listening" | "thinking" | "done" | "error";

/** Stop by itself: a word never needs more than this, and a sentence rarely does. */
const MAX_RECORD_MS = 9_000;
/** After the learner has spoken, this much quiet ends the take. */
const TRAILING_SILENCE_MS = 900;
/** Below this the room is "silent" for our purposes. */
const SPEECH_LEVEL = 0.035;

/**
 * Say it, and the machine answers: right, nearly right, or which sound was wrong.
 *
 * The engine is Whisper running in this page (`src/lib/asr.ts`), so nothing is uploaded and
 * no key is needed: the browser's own speech recognition is not used at all. Rendered inside
 * the card itself - one tap, no panel in between.
 */
export function PronounceCheck({
  word,
  ipa,
  sentence,
  nativeSrc,
  nativeKind = "uk",
  compact = false,
  onClose,
}: {
  word: string;
  ipa?: string;
  sentence?: string | null;
  nativeSrc?: string | null;
  nativeKind?: "uk" | "us";
  compact?: boolean;
  onClose?: () => void;
}) {
  const lookupIpa = useIpaLookup();
  const canRecord = recorderSupported();
  const agreed = useStore((s) => s.settings.sayConsent);
  const [status, setStatus] = useState<Status>("idle");
  const [load, setLoad] = useState<LoadProgress | null>(null);
  const [ready, setReady] = useState(false);
  const [level, setLevel] = useState(0);
  const [heard, setHeard] = useState("");
  const [wordVerdict, setWordVerdict] = useState<WordVerdict | null>(null);
  const [sentenceVerdict, setSentenceVerdict] = useState<SentenceVerdict | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const frame = useRef(0);
  const gizmo = useRef<{ ctx: AudioContext; analyser: AnalyserNode } | null>(null);
  const startedAt = useRef(0);
  const spokeAt = useRef(0);
  const quietSince = useRef(0);
  const stopping = useRef(false);

  const target = sentence || word;
  const isSentence = Boolean(sentence);

  /** Load the engine once per page; every card after the first reuses it. */
  const ensureReady = async () => {
    if (ready) return true;
    setStatus((s) => (s === "idle" ? "loading" : s));
    try {
      await loadTranscriber(setLoad);
      setReady(true);
      setLoad(null);
      setStatus((s) => (s === "loading" ? "idle" : s));
      return true;
    } catch (err) {
      setLoad(null);
      setError(`Không tải được bộ nghe: ${String((err as Error)?.message ?? err).slice(0, 120)}`);
      setStatus("error");
      return false;
    }
  };

  const teardown = () => {
    cancelAnimationFrame(frame.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    recorder.current = null;
    if (gizmo.current) {
      void gizmo.current.ctx.close().catch(() => {});
      gizmo.current = null;
    }
    setLevel(0);
  };

  useEffect(() => () => teardown(), []);

  const finish = (blob: Blob) => {
    teardown();
    setStatus("thinking");
    void transcribe(blob, setLoad)
      .then((text) => {
        setHeard(text);
        if (isSentence) setSentenceVerdict(judgeSentence(sentence as string, text));
        else setWordVerdict(judgeWord(word, ipa ?? "", text ? [text] : [], lookupIpa));
        setStatus("done");
      })
      .catch((err) => {
        setError(
          `Không chạy được bộ nghe trong máy: ${String((err as Error)?.message ?? err).slice(0, 120)}`,
        );
        setStatus("error");
      });
  };

  const stop = () => {
    const rec = recorder.current;
    if (rec && rec.state !== "inactive") rec.stop();
  };

  const start = async () => {
    if (!canRecord) return;
    setError(null);
    setHeard("");
    setWordVerdict(null);
    setSentenceVerdict(null);
    stopping.current = false;
    chunks.current = [];
    // The engine comes first: the learner sees real progress instead of a dead button.
    const engineReady = await ensureReady();
    if (!engineReady) return;
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      stream.current = media;

      // One microphone, two readers: the recorder and the level meter.
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const source = ctx.createMediaStreamSource(media);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      gizmo.current = { ctx, analyser };

      const mime = pickAudioMime((t) => MediaRecorder.isTypeSupported(t));
      const rec = mime ? new MediaRecorder(media, { mimeType: mime }) : new MediaRecorder(media);
      recorder.current = rec;
      rec.ondataavailable = (ev) => {
        if (ev.data.size) chunks.current.push(ev.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunks.current, { type: mime || "audio/webm" });
        if (blob.size < 800) {
          teardown();
          setError("Bản ghi quá ngắn — bấm micro rồi đọc ngay.");
          setStatus("error");
          return;
        }
        finish(blob);
      };
      rec.start();

      const data = new Float32Array(analyser.fftSize);
      const tick = () => {
        const a = gizmo.current;
        if (!a) return;
        a.analyser.getFloatTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i += 1) sum += data[i] * data[i];
        const rms = Math.sqrt(sum / data.length);
        setLevel(Math.min(1, rms * 6));

        const now = performance.now();
        if (rms > SPEECH_LEVEL) {
          if (!spokeAt.current) spokeAt.current = now;
          quietSince.current = 0;
        } else if (spokeAt.current) {
          if (!quietSince.current) quietSince.current = now;
          if (now - quietSince.current > TRAILING_SILENCE_MS && !stopping.current) {
            stopping.current = true;
            stop();
            return;
          }
        }
        if (now - startedAt.current > MAX_RECORD_MS && !stopping.current) {
          stopping.current = true;
          stop();
          return;
        }
        frame.current = requestAnimationFrame(tick);
      };
      startedAt.current = performance.now();
      spokeAt.current = 0;
      quietSince.current = 0;
      frame.current = requestAnimationFrame(tick);
      setStatus("listening");
    } catch (err) {
      teardown();
      setError(recorderErrorMessage(err));
      setStatus("error");
    }
  };

  const again = () => {
    teardown();
    setStatus("idle");
    setHeard("");
    setWordVerdict(null);
    setSentenceVerdict(null);
    setError(null);
  };

  const playNative = () => void play(nativeSrc, target, nativeKind);

  if (!canRecord) {
    return (
      <p className={compact ? "say-line is-warn" : "voice-error"}>
        Trình duyệt này không cho trang ghi âm. Cần https hoặc localhost, và một trình duyệt có micro.
      </p>
    );
  }

  const busy = status === "loading" || status === "thinking";
  const listening = status === "listening";
  const verdict = wordVerdict ?? sentenceVerdict;

  if (compact) {
    // The card gives this block about four short lines, so the button IS the explanation:
    // its label states the one-time cost, and the line underneath shows real progress.
    const pct = load ? load.percent : 0;
    return (
      <div className="say say-compact">
        <div className="say-row">
          {listening ? (
            <button type="button" className="say-btn is-live" onClick={stop}>
              <Square size={13} /> Dừng & chấm
            </button>
          ) : (
            <button
              type="button"
              className="say-btn is-primary"
              onClick={() => {
                if (!agreed) store.settings({ sayConsent: true });
                void start();
              }}
              disabled={busy}
            >
              <Mic size={14} />{" "}
              {status === "loading"
                ? `${pct}%`
                : status === "thinking"
                  ? "Đang chấm…"
                  : verdict
                    ? "Chấm lại"
                    : ready || agreed
                      ? "Nói"
                      : "Tải 63 MB & nói"}
            </button>
          )}
          <button type="button" className="say-btn" onClick={playNative} disabled={listening} aria-label="Nghe bản xứ">
            <Volume2 size={13} />
          </button>
          {onClose && (
            <button type="button" className="say-btn" onClick={onClose} aria-label="Đóng">
              <X size={13} />
            </button>
          )}
        </div>

        {listening && (
          <>
            <div className="say-meter" role="img" aria-label={`Mức âm thanh micro ${Math.round(level * 100)}%`}>
              <span className="say-meter-fill" style={{ width: `${Math.round(level * 100)}%` }} />
            </div>
            <p className="say-line is-clamp">{level > SPEECH_LEVEL ? "Đang nghe bạn đọc…" : "Đọc to từ trên thẻ…"}</p>
          </>
        )}

        {status === "loading" && (
          <p className="say-line is-warn is-clamp">
            Đang tải một lần{load ? ` — ${pct}% ${load.file ? load.file.replace(/^onnx\//, "") : ""}` : "…"}
          </p>
        )}
        {status === "thinking" && <p className="say-line is-clamp">Đang nghe lại câu bạn vừa đọc…</p>}

        {verdict && (
          <p className={`say-line say-verdict is-clamp is-${wordVerdict ? wordVerdict.kind : sentenceVerdict && sentenceVerdict.score === 100 ? "exact" : sentenceVerdict && sentenceVerdict.score >= 75 ? "near" : "wrong"}`}>
            <b>
              {wordVerdict ? `${wordVerdict.score} · ${wordVerdict.label}` : `${sentenceVerdict?.score} · ${sentenceVerdict?.label}`}
            </b>{" "}
            {wordVerdict
              ? wordVerdict.short
              : sentenceVerdict
                ? sentenceVerdict.score === 100
                  ? "Nghe đủ cả câu."
                  : `Được ${sentenceVerdict.cells.filter((c) => c.ok).length}/${sentenceVerdict.cells.length} từ.`
                : ""}
          </p>
        )}

        {error && <p className="say-line is-warn is-clamp">{error}</p>}
      </div>
    );
  }

  // Wide layout, used by the word sheet.
  return (
    <div className="say">
      <div className="voice-actions">
        {listening ? (
          <button type="button" className="btn say-mic is-on" onClick={stop}>
            <Square size={15} /> Dừng & chấm
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => void start()} disabled={busy}>
            <Mic size={17} /> {busy ? "Đang xử lý…" : "Nói và chấm"}
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={playNative} disabled={listening}>
          <Volume2 size={17} /> Nghe bản xứ
        </button>
        {(status === "done" || status === "error") && (
          <button type="button" className="btn btn-ghost" onClick={again}>
            <RotateCcw size={17} /> Làm lại
          </button>
        )}
      </div>

      {listening && (
        <div className="say-listen">
          <p className="voice-note">
            Đọc to: <b lang="en">{target}</b>
          </p>
          <div className="say-meter" role="img" aria-label={`Mức âm thanh micro ${Math.round(level * 100)}%`}>
            <span className="say-meter-fill" style={{ width: `${Math.round(level * 100)}%` }} />
          </div>
          <p className="voice-note">{level > SPEECH_LEVEL ? "Đang nghe bạn đọc…" : "Máy đang chờ bạn đọc…"}</p>
        </div>
      )}

      {status === "loading" && <p className="voice-note">Đang tải bộ nghe lần đầu{load ? ` — ${load.percent}%` : "…"}</p>}
      {status === "thinking" && <p className="voice-note">Đang nghe lại câu bạn vừa đọc…</p>}

      {wordVerdict && (
        <div className={`say-card is-${wordVerdict.kind}`} role="status">
          <span className="say-score">{wordVerdict.score}</span>
          <div className="say-body">
            <p className="say-label">
              {wordVerdict.label}
              {wordVerdict.heard ? <span className="say-heard"> · máy nghe: «{wordVerdict.heard}»</span> : null}
            </p>
            <p className="say-hint">{wordVerdict.hint}</p>
          </div>
        </div>
      )}

      {sentenceVerdict && (
        <div className={`say-card is-${sentenceVerdict.score === 100 ? "exact" : sentenceVerdict.score >= 75 ? "near" : "wrong"}`} role="status">
          <span className="say-score">{sentenceVerdict.score}</span>
          <div className="say-body">
            <p className="say-label">{sentenceVerdict.label}</p>
            <p className="say-words" lang="en">
              {sentenceVerdict.cells.map((cell, i) => (
                <span key={`${cell.word}-${i}`} className={cell.ok ? "is-ok" : "is-miss"}>
                  {cell.word}{" "}
                </span>
              ))}
            </p>
            <p className="say-hint">{sentenceVerdict.hint}</p>
          </div>
        </div>
      )}

      {error && <p className="voice-error">{error}</p>}

      {heard && !error && <p className="voice-note">Máy nghe được: «{heard}»</p>}

      <p className="voice-note">
        Bộ nghe chạy <b>ngay trong máy bạn</b> (Whisper tiny, đã tải một lần) — không có giọng nói nào rời khỏi
        máy tính này. Điểm số là mức khớp giữa chuỗi âm máy nghe được và chuỗi âm chuẩn của từ điển.
      </p>
    </div>
  );
}

/** The whole practice surface for the word sheet: the machine's verdict plus self-comparison. */
export function VoiceLab({
  word,
  ipa,
  sentence,
  nativeSrc,
  nativeKind = "uk",
}: {
  word: string;
  ipa?: string;
  sentence?: string | null;
  nativeSrc?: string | null;
  nativeKind?: "uk" | "us";
}) {
  return (
    <div className="voice">
      <p className="eyebrow">Luyện phát âm · máy chấm</p>
      <p className="voice-word" lang="en">
        {word}
      </p>
      {ipa ? <p className="voice-ipa ipa">{ipa}</p> : null}
      {sentence ? (
        <p className="voice-sentence" lang="en">
          {sentence}
        </p>
      ) : null}
      <PronounceCheck word={word} ipa={ipa} sentence={sentence} nativeSrc={nativeSrc} nativeKind={nativeKind} />
      <details className="voice-block">
        <summary className="eyebrow">Chỉ muốn nghe lại giọng mình để tự so</summary>
        <VoicePractice
          word={word}
          ipa={ipa}
          sentence={sentence}
          nativeSrc={nativeSrc}
          nativeKind={nativeKind}
          showHead={false}
        />
      </details>
    </div>
  );
}
