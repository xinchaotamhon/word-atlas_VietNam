/** Normalize the typography mobile keyboards commonly substitute. */
export const clean = (text: string) =>
  text
    .normalize("NFKC")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐‑–—]/g, "-")
    .replace(/\s/g, " ");
export const same = (a: string, b: string) =>
  clean(a).toLowerCase() === clean(b).toLowerCase();

/** Use normalized Unicode code points consistently for scoring and highlighting. */
export function correctCharacterCount(value: string, target: string) {
  const expected = Array.from(clean(target));
  return Array.from(clean(value)).filter((char, index) =>
    same(char, expected[index] || ""),
  ).length;
}

/** Count newly inserted characters, including replacements, without rewarding deletions. */
export function typingDelta(previous: string, next: string, target: string) {
  const before = Array.from(clean(previous));
  const after = Array.from(clean(next));
  const expected = Array.from(clean(target));
  let prefix = 0;
  while (
    prefix < before.length &&
    prefix < after.length &&
    before[prefix] === after[prefix]
  ) prefix++;
  let suffix = 0;
  while (
    suffix < before.length - prefix &&
    suffix < after.length - prefix &&
    before[before.length - 1 - suffix] === after[after.length - 1 - suffix]
  ) suffix++;
  const added = after.slice(prefix, after.length - suffix);
  let correct = 0;
  for (let i = 0; i < added.length; i++) {
    if (same(added[i], expected[prefix + i] || "")) correct++;
  }
  return { total: added.length, correct };
}

/** What an untyped position shows: length and punctuation stay, letters never do. */
export function maskedCharacter(ch: string) {
  if (ch === " ") return " ";
  return /[A-Za-z0-9]/.test(ch) ? "·" : ch;
}

export interface PromptCell {
  /** The character drawn at this position. */
  ch: string;
  /** "" | "is-ok" | "is-bad" | "is-caret" */
  cls: string;
}

/**
 * One row of the recall prompt. The answer is never printed for a position the learner
 * has not filled: a wrong keystroke shows the learner's own letter in red (`is-bad`),
 * not the expected one, so the exercise cannot be completed by copying the screen.
 * `revealed` is the explicit "Xem đáp án" state, where the target is shown plain.
 */
export function promptCells(target: string, typed: string, revealed = false): PromptCell[] {
  const want = Array.from(clean(target));
  const got = Array.from(clean(typed));
  return want.map((ch, k) => {
    if (revealed) return { ch, cls: "" };
    const t = got[k];
    if (t === undefined) return { ch: maskedCharacter(ch), cls: k === got.length ? "is-caret" : "" };
    // Correct: draw the target's character (keeps the name's own capitalisation).
    if (same(t, ch)) return { ch, cls: "is-ok" };
    // Wrong: draw what the learner actually typed, never the answer.
    return { ch: t, cls: "is-bad" };
  });
}

/** Standard WPM uses 5 characters per word, not the number of vocabulary cards. */
export function typingMetrics(
  correctCharacters: number,
  attemptedCharacters: number,
  acceptedCharacters: number,
  elapsedMs: number,
) {
  const finiteNonnegative = (n: number) => Number.isFinite(n) ? Math.max(0, n) : 0;
  const attempted = finiteNonnegative(attemptedCharacters);
  const correct = Math.min(finiteNonnegative(correctCharacters), attempted);
  const accepted = finiteNonnegative(acceptedCharacters);
  const duration = finiteNonnegative(elapsedMs);
  return {
    accuracy: attempted ? Math.round((correct / attempted) * 100) : 100,
    wpm: duration >= 1000 ? Math.round(accepted / 5 / (duration / 60000)) : 0,
  };
}
