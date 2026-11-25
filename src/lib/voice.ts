/**
 * Recording rules that are worth testing without a microphone.
 * The browser APIs themselves live in `ui/VoiceCheck.tsx`.
 */

/** Hard stop, so a forgotten recording cannot fill the page's memory. */
export const RECORD_LIMIT_MS = 12_000;

/** Containers Safari, Chrome and Firefox accept, best first. */
const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

export function pickAudioMime(supported: (type: string) => boolean): string | undefined {
  return MIME_CANDIDATES.find((type) => supported(type));
}

type RecorderEnv = {
  navigator?: { mediaDevices?: { getUserMedia?: unknown } };
  MediaRecorder?: unknown;
};

/** Microphone capture needs a secure page (https or localhost) and a recorder. */
export function recorderSupported(env: RecorderEnv = globalThis as unknown as RecorderEnv): boolean {
  const getUserMedia = env.navigator?.mediaDevices?.getUserMedia;
  return typeof getUserMedia === "function" && typeof env.MediaRecorder === "function";
}

/** Every failure the learner can hit, said in words that tell them what to do next. */
export function recorderErrorMessage(err: unknown): string {
  const name = typeof err === "object" && err !== null ? String((err as { name?: unknown }).name ?? "") : "";
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "SecurityError":
      return "Trình duyệt đang chặn micro. Bấm vào ổ khoá cạnh địa chỉ trang, cho phép Micro, rồi thử lại.";
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
      return "Máy này không có micro nào dùng được.";
    case "NotReadableError":
    case "TrackStartError":
      return "Micro đang bị một chương trình khác giữ. Đóng chương trình đó rồi thử lại.";
    case "AbortError":
      return "Bản ghi bị ngắt giữa chừng. Thử lại giúp mình nhé.";
    default:
      return "Không mở được micro. Trang phải chạy trên https hoặc localhost thì trình duyệt mới cho ghi âm.";
  }
}

/** "0:03" — the recording timer, so the learner sees the 12-second ceiling coming. */
export function elapsedLabel(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Where the stop comes from: the learner, the ceiling, or the page closing. */
export function stopReason(elapsedMs: number, limitMs = RECORD_LIMIT_MS): "learner" | "limit" {
  return elapsedMs >= limitMs ? "limit" : "learner";
}

/** Compare two clips in order: the native recording, a beat, then the learner's take. */
export const COMPARE_GAP_MS = 420;
