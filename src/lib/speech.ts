/**
 * Judging what the learner said, from the transcript the browser's speech recogniser
 * returns. Pure functions only: no microphone, no network, so the rules that decide
 * "đúng / sai / sai âm nào" can be tested without a human voice.
 *
 * The trick that makes this useful without a phoneme model: the atlas already stores IPA
 * for all 7 298 words, so when the machine hears a *different word*, that word's IPA can be
 * compared with the target's and the difference named ("/ɪ/ thay vì /iː/") instead of only
 * "sai".
 */

const IPA_MARKS = new Set(["/", "[", "]", "ˈ", "ˌ", ".", "‿", " ", "|"]);
const LENGTH_MARK = "ː";

/** "/ˈʃiːp/" -> ["ʃ", "iː", "p"]; the length mark stays with the vowel it lengthens. */
export function ipaUnits(ipa: string): string[] {
  const out: string[] = [];
  for (const ch of Array.from(ipa || "")) {
    if (IPA_MARKS.has(ch)) continue;
    if (ch === LENGTH_MARK && out.length > 0) {
      out[out.length - 1] += ch;
      continue;
    }
    out.push(ch);
  }
  return out;
}

export type UnitOp = { op: "same" | "sub" | "del" | "ins"; a?: string; b?: string };

/** Longest-common-subsequence alignment of two phoneme strings, with del+ins folded into sub. */
export function diffUnits(a: string[], b: string[]): UnitOp[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const raw: UnitOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      raw.push({ op: "same", a: a[i], b: b[j] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      raw.push({ op: "del", a: a[i] });
      i += 1;
    } else {
      raw.push({ op: "ins", b: b[j] });
      j += 1;
    }
  }
  while (i < n) raw.push({ op: "del", a: a[i++] });
  while (j < m) raw.push({ op: "ins", b: b[j++] });

  const out: UnitOp[] = [];
  for (let k = 0; k < raw.length; k += 1) {
    const cur = raw[k];
    const next = raw[k + 1];
    if (cur.op === "del" && next && next.op === "ins") {
      out.push({ op: "sub", a: cur.a, b: next.b });
      k += 1;
    } else {
      out.push(cur);
    }
  }
  return out;
}

/** The learner-facing sentence for one phoneme comparison. */
export function explainPhonemes(expected: string[], heard: string[]): string {
  const parts: string[] = [];
  for (const op of diffUnits(expected, heard)) {
    if (op.op === "sub") parts.push(`đọc /${op.b}/ thay vì /${op.a}/`);
    else if (op.op === "del") parts.push(`thiếu âm /${op.a}/`);
    else if (op.op === "ins") parts.push(`thêm âm /${op.b}/`);
  }
  if (parts.length === 0) return "";
  return parts.slice(0, 3).join("; ");
}

export type VerdictKind = "exact" | "near" | "wrong" | "unclear";

export interface WordVerdict {
  kind: VerdictKind;
  /** The same verdict cut down to what fits inside a 188 px card. */
  short: string;
  /** 0-100, how closely the heard sound sequence matches the expected one. */
  score: number;
  /** What the machine heard, normalised. */
  heard: string;
  /** Label shown to the learner. */
  label: string;
  /** One sentence of Vietnamese feedback. */
  hint: string;
}

const LETTERS = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9 ' -]/g, "")
    .trim();

/** Edit distance over letters, used only when the heard word is not in the atlas. */
export function letterDistance(a: string, b: string): number {
  const s = Array.from(a);
  const t = Array.from(b);
  const dp: number[] = Array.from({ length: t.length + 1 }, (_, j) => j);
  for (let i = 1; i <= s.length; i += 1) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= t.length; j += 1) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (s[i - 1] === t[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[t.length];
}

function scoreFromDifferences(count: number): number {
  return Math.max(35, 90 - 20 * count);
}

/**
 * Judge one word. `alternatives` is what the recogniser offered, best first (0..n).
 * `lookupIpa` returns the atlas IPA for a lowercase word, or undefined.
 */
export function judgeWord(
  target: string,
  targetIpa: string,
  alternatives: string[],
  lookupIpa: (word: string) => string | undefined,
): WordVerdict {
  const want = LETTERS(target);
  const heardList = alternatives.map(LETTERS).filter(Boolean);

  for (const heard of heardList) {
    const tokens = heard.split(/\s+/);
    const hit = tokens.includes(want);
    if (hit) {
      return {
        kind: "exact",
        score: 100,
        heard,
        label: "Chuẩn",
        short: "Nghe đúng.",
        hint: `Máy nghe đúng là «${target}».`,
      };
    }
  }

  if (heardList.length === 0) {
    return {
      kind: "unclear",
      score: 0,
      heard: "",
      label: "Chưa nghe rõ",
      short: "Không nghe thấy gì — thử lại.",
      hint: "Không nhận được âm thanh nào. Bấm micro rồi đọc to ngay, đừng để im lặng.",
    };
  }

  // The closest thing the machine thought it heard.
  let best = heardList[0];
  let bestDistance = letterDistance(want, best);
  for (const heard of heardList.slice(1)) {
    const d = letterDistance(want, heard);
    if (d < bestDistance) {
      best = heard;
      bestDistance = d;
    }
  }

  const heardWord = best.split(/\s+/).sort((x, y) => letterDistance(want, x) - letterDistance(want, y))[0];
  const heardIpa = lookupIpa(heardWord);

  if (heardIpa) {
    const ops = diffUnits(ipaUnits(targetIpa), ipaUnits(heardIpa)).filter((o) => o.op !== "same");
    const explanation = explainPhonemes(ipaUnits(targetIpa), ipaUnits(heardIpa));
    // One or two sounds apart is the same word mispronounced; three or more is a different
    // word altogether, and calling that "Gần đúng" would flatter a wrong answer.
    const differentWord = ops.length >= 3;
    return {
      kind: differentWord ? "wrong" : "near",
      score: scoreFromDifferences(ops.length),
      heard: heardWord,
      label: differentWord ? "Sai từ" : "Gần đúng",
      short: differentWord
        ? `Nghe ra «${heardWord}» chứ không phải «${target}».`
        : explanation
          ? `${explanation}.`
          : "Hai từ gần giống nhau.",
      hint: differentWord
        ? `Máy nghe ra «${heardWord}» ${heardIpa}, khác hẳn «${target}» ${targetIpa} — thành ${ops.length} âm lệch. Đọc lại chậm hơn.`
        : explanation
          ? `Máy nghe ra «${heardWord}» ${heardIpa} — ${explanation}. Chuẩn là «${target}» ${targetIpa}.`
          : `Máy nghe ra «${heardWord}» — hai từ gần giống nhau. Chuẩn là «${target}» ${targetIpa}.`,
    };
  }

  // Nothing in the atlas sounds like it: say what was heard and how far off it was.
  const share = want.length ? bestDistance / Math.max(1, want.length) : 1;
  if (share > 0.5) {
    return {
      kind: "unclear",
      score: 15,
      heard: heardWord,
      label: "Chưa nghe rõ",
      short: `Nghe ra «${heardWord}» — xa quá.`,
      hint: `Máy nghe ra «${heardWord}», khác quá xa «${target}». Đọc chậm hơn, to hơn, rồi thử lại.`,
    };
  }
  return {
    kind: "wrong",
    score: 30,
    heard: heardWord,
    label: "Chưa đúng",
    short: `«${heardWord}» thay vì «${target}».`,
    hint: `Máy nghe ra «${heardWord}» thay vì «${target}» ${targetIpa}. Nghe lại giọng bản xứ rồi đọc theo.`,
  };
}

export interface SentenceCell {
  word: string;
  ok: boolean;
}

export interface SentenceVerdict {
  score: number;
  label: string;
  heard: string;
  /** The target words in order, each marked as heard or missed. */
  cells: SentenceCell[];
  /** Target words the machine did not hear, in order. */
  missed: string[];
  hint: string;
}

const TOKEN = (s: string) =>
  LETTERS(s)
    .split(/\s+/)
    .filter(Boolean);

/** Word-level comparison of one sentence: which words came through, which did not. */
export function judgeSentence(target: string, transcript: string): SentenceVerdict {
  const want = TOKEN(target);
  const got = TOKEN(transcript);
  const n = want.length;
  const m = got.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      dp[i][j] = want[i] === got[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const cells: SentenceCell[] = want.map((word) => ({ word, ok: false }));
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (want[i] === got[j]) {
      cells[i].ok = true;
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i += 1;
    } else {
      j += 1;
    }
  }
  const matched = cells.filter((c) => c.ok).length;
  const score = n === 0 ? 0 : Math.round((matched / n) * 100);
  const missed = cells.filter((c) => !c.ok).map((c) => c.word);
  const label = score === 100 ? "Chuẩn" : score >= 75 ? "Gần đúng" : "Chưa đúng";
  const hint =
    n === 0
      ? "Câu này chưa có nội dung để chấm."
      : missed.length === 0
        ? `Máy nghe ra đủ ${n} từ.`
        : score >= 75
          ? `Được ${matched}/${n} từ. Máy chưa nghe ra: ${missed.slice(0, 6).map((w) => `«${w}»`).join(", ")}.`
          : `Được ${matched}/${n} từ. Đọc chậm lại và rõ từng từ rồi thử lại.`;
  return { score, label, heard: transcript.trim(), cells, missed, hint };
}

/* ---------- the browser side ---------- */

type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: unknown) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onend: (() => void) | null;
  /** Chrome, Edge and Safari all expose this; the optional shape keeps test doubles simple. */
  addEventListener?: (type: string, listener: (event: unknown) => void) => void;
};

type SpeechEnvironment = {
  SpeechRecognition?: new () => RecognitionLike;
  webkitSpeechRecognition?: new () => RecognitionLike;
};

export function recognizerSupported(env: SpeechEnvironment = globalThis as unknown as SpeechEnvironment): boolean {
  return typeof (env.SpeechRecognition || env.webkitSpeechRecognition) === "function";
}

export function createRecognizer(lang = "en-GB"): RecognitionLike | null {
  const env = globalThis as unknown as SpeechEnvironment;
  const Ctor = env.SpeechRecognition || env.webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = lang;
  rec.continuous = false;
  rec.interimResults = true;
  rec.maxAlternatives = 5;
  return rec;
}

/** Recogniser failures, said in words that tell the learner what to do next. */
export function speechErrorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Chrome chưa được phép dùng micro, hoặc trang này bị chặn dịch vụ nhận dạng. Bấm vào ổ khoá cạnh địa chỉ trang, cho phép Micro, rồi thử lại.";
    case "no-speech":
      return "Không nghe thấy gì. Bấm micro rồi đọc to ngay, đừng để im lặng.";
    case "audio-capture":
      return "Không thấy micro nào dùng được trên máy này.";
    case "network":
      return "Chrome cần mạng để nhận dạng giọng nói và hiện không kết nối được. Kiểm tra mạng rồi thử lại.";
    case "aborted":
      return "Lượt nghe đã bị dừng.";
    default:
      return "Không chấm được lượt này. Thử lại giúp mình nhé.";
  }
}
