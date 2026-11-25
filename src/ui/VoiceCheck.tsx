import { Mic, Play, RotateCcw, Square, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { play, stopAudio } from "../lib/audio";
import {
  COMPARE_GAP_MS,
  RECORD_LIMIT_MS,
  elapsedLabel,
  pickAudioMime,
  recorderErrorMessage,
  recorderSupported,
} from "../lib/voice";

type Phase = "idle" | "asking" | "recording" | "ready";

/**
 * Say it, hear it beside the native recording. No scoring, no network: the learner's
 * own ear is the judge, and the take never leaves the page's memory. Since the machine
 * scores pronunciation itself (`PronounceCheck`), this is the secondary route.
 */
export function VoicePractice({
  word,
  ipa,
  sentence,
  nativeSrc,
  nativeKind = "uk",
  showHead = true,
}: {
  word: string;
  ipa?: string;
  sentence?: string | null;
  nativeSrc?: string | null;
  nativeKind?: "uk" | "us";
  /** The sheet already prints the word and the IPA above this block. */
  showHead?: boolean;
}) {
  const supported = recorderSupported();
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState<"native" | "mine" | "both" | null>(null);

  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const urlRef = useRef<string | null>(null);
  const limitTimer = useRef(0);
  const tickTimer = useRef(0);
  const startedAt = useRef(0);

  const text = sentence || word;

  const release = () => {
    window.clearTimeout(limitTimer.current);
    window.clearInterval(tickTimer.current);
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    recorder.current = null;
  };

  // The microphone must never outlive the sheet.
  useEffect(
    () => () => {
      window.clearTimeout(limitTimer.current);
      window.clearInterval(tickTimer.current);
      stream.current?.getTracks().forEach((track) => track.stop());
      stopAudio();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const start = async () => {
    if (!supported) return;
    setError(null);
    stopAudio();
    // Told before the await: the browser's permission prompt is easy to miss, and a request
    // that is already blocked resolves slowly, so silence would read as "the button is dead".
    setPhase("asking");
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      stream.current = media;
      const mime = pickAudioMime((type) => MediaRecorder.isTypeSupported(type));
      const rec = mime ? new MediaRecorder(media, { mimeType: mime }) : new MediaRecorder(media);
      chunks.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size) chunks.current.push(ev.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunks.current, { type: mime || "audio/webm" });
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        const next = URL.createObjectURL(blob);
        urlRef.current = next;
        setUrl(next);
        setPhase("ready");
        release();
      };
      rec.onerror = () => {
        setError(recorderErrorMessage((rec as unknown as { error?: unknown }).error));
        setPhase("idle");
        release();
      };
      recorder.current = rec;
      rec.start();
      startedAt.current = performance.now();
      setElapsed(0);
      setPhase("recording");
      tickTimer.current = window.setInterval(() => setElapsed(performance.now() - startedAt.current), 120);
      limitTimer.current = window.setTimeout(() => {
        if (rec.state !== "inactive") rec.stop();
      }, RECORD_LIMIT_MS);
    } catch (err) {
      setError(recorderErrorMessage(err));
      setPhase("idle");
      release();
    }
  };

  const stop = () => {
    const rec = recorder.current;
    if (rec && rec.state !== "inactive") rec.stop();
  };

  const takeAgain = () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setUrl(null);
    setElapsed(0);
    setPhase("idle");
    setError(null);
  };

  const playNative = async () => {
    setPlaying("native");
    try {
      await play(nativeSrc, text, nativeKind);
    } finally {
      setPlaying(null);
    }
  };

  const playMine = () =>
    new Promise<void>((resolve) => {
      if (!urlRef.current) {
        resolve();
        return;
      }
      const audio = new Audio(urlRef.current);
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      void audio.play().catch(() => resolve());
    });

  const compare = async () => {
    setPlaying("both");
    try {
      await play(nativeSrc, text, nativeKind);
      await new Promise((resolve) => window.setTimeout(resolve, COMPARE_GAP_MS));
      await playMine();
    } finally {
      setPlaying(null);
    }
  };

  const busy = playing !== null;

  return (
    <div className="voice">
      {showHead && (
        <>
          <p className="eyebrow">Luyện phát âm · nghe lại và so</p>
          <p className="voice-word" lang="en">
            {word}
          </p>
          {ipa ? <p className="voice-ipa ipa">{ipa}</p> : null}
          {sentence ? (
            <p className="voice-sentence" lang="en">
              {sentence}
            </p>
          ) : null}
        </>
      )}

      {supported ? (
        <>
          <div className="voice-actions">
            <button type="button" className="btn btn-ghost" onClick={() => void playNative()} disabled={busy || phase === "recording"}>
              <Volume2 size={17} /> {playing === "native" ? "Đang phát…" : "Nghe bản xứ"}
            </button>
            {phase === "recording" ? (
              <button type="button" className="btn voice-rec is-on" onClick={stop}>
                <Square size={15} /> Dừng · {elapsedLabel(elapsed)}
              </button>
            ) : (
              <button type="button" className="btn voice-rec" onClick={() => void start()} disabled={busy || phase === "asking"}>
                <Mic size={17} /> {phase === "asking" ? "Đang xin quyền…" : url ? "Ghi lại" : "Ghi âm giọng bạn"}
              </button>
            )}
          </div>

          {phase === "asking" && (
            <p className="voice-note">
              Trình duyệt đang hỏi quyền dùng micro — hãy bấm <b>Cho phép</b> ở hộp thoại vừa hiện (có thể nó nằm ở
              góc trên bên trái cửa sổ). Nếu không thấy hộp thoại nào, hãy bấm vào ổ khoá cạnh địa chỉ trang và cho
              phép Micro.
            </p>
          )}

          {phase === "recording" && (
            <p className="voice-note">
              Đang ghi · đọc to: <b lang="en">{text}</b> · tối đa {elapsedLabel(RECORD_LIMIT_MS)}
            </p>
          )}

          {url && phase !== "recording" && (
            <div className="voice-actions">
              <button type="button" className="btn btn-ghost" onClick={() => void playMine()} disabled={busy}>
                <Play size={17} /> Nghe giọng tôi
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void compare()} disabled={busy}>
                {playing === "both" ? "Đang so…" : "So sánh hai giọng"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={takeAgain} disabled={busy}>
                <RotateCcw size={17} /> Thu lại
              </button>
            </div>
          )}
        </>
      ) : (
        <p className="voice-error">
          Trình duyệt này không cho trang ghi âm. Tính năng cần https hoặc localhost và một trình duyệt hỗ trợ micro
          (Chrome, Edge, Safari, Firefox bản mới).
        </p>
      )}

      {error && <p className="voice-error">{error}</p>}

      <p className="voice-note">
        Bản ghi chỉ nằm trong bộ nhớ của trang này: không gửi lên máy chủ nào, và mất ngay khi bạn đóng bảng.
      </p>
    </div>
  );
}
