/**
 * The offline speech engine: whisper-tiny.en (Apache-2.0) running in the page through
 * ONNX Runtime Web. Nothing leaves the machine and there is no key.
 *
 * The files are vendored under `public/asr/` (63.0 MB): the library bundle, the ONNX
 * Runtime wasm, and the int8 model. They are fetched once, when the learner first asks
 * for a check, and the browser caches them.
 */

type Transcriber = (audio: Float32Array) => Promise<{ text?: string }>;

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

let loading: Promise<Transcriber> | null = null;

export type LoadProgress = { percent: number; file: string };

/** Load the model once per page; every later call reuses the same instance. */
export function loadTranscriber(onProgress?: (progress: LoadProgress) => void): Promise<Transcriber> {
  if (loading) return loading;
  loading = (async () => {
    // Fetched from our own origin, so no bundler, no CDN, no network after the first time.
    const mod = (await import(/* @vite-ignore */ `${base()}/asr/transformers.min.js`)) as {
      pipeline: (task: string, model: string, options?: Record<string, unknown>) => Promise<Transcriber>;
      env: Record<string, unknown> & {
        backends: { onnx: { wasm: { wasmPaths: string; numThreads: number } } };
      };
    };
    const { pipeline, env } = mod;
    (env as unknown as { allowRemoteModels: boolean }).allowRemoteModels = false;
    (env as unknown as { allowLocalModels: boolean }).allowLocalModels = true;
    (env as unknown as { localModelPath: string }).localModelPath = `${base()}/asr/models/`;
    env.backends.onnx.wasm.wasmPaths = `${base()}/asr/`;
    env.backends.onnx.wasm.numThreads = 1;

    return await pipeline("automatic-speech-recognition", "whisper-tiny.en", {
      dtype: "q8",
      progress_callback: (event: { status?: string; progress?: number; file?: string }) => {
        if (!onProgress) return;
        if (event?.status === "progress" && typeof event.progress === "number") {
          onProgress({ percent: Math.round(event.progress), file: event.file ?? "" });
        }
      },
    });
  })();
  return loading;
}

/** Decode whatever the recorder produced into the 16 kHz mono samples Whisper wants. */
export async function decodeToMono16k(blob: Blob): Promise<Float32Array> {
  const bytes = await blob.arrayBuffer();
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx({ sampleRate: 16000 });
  try {
    const buffer = await ctx.decodeAudioData(bytes.slice(0));
    return buffer.getChannelData(0).slice();
  } finally {
    void ctx.close().catch(() => {});
  }
}

/** Transcribe one recording; returns "" when the engine heard nothing usable. */
export async function transcribe(blob: Blob, onProgress?: (p: LoadProgress) => void): Promise<string> {
  const run = await loadTranscriber(onProgress);
  const audio = await decodeToMono16k(blob);
  if (audio.length < 1600) return ""; // under 100 ms: nothing to recognise
  const out = await run(audio);
  return (out?.text ?? "").trim();
}

export function resetTranscriber() {
  loading = null;
}
