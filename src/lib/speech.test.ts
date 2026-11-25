import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createRecognizer,
  diffUnits,
  explainPhonemes,
  ipaUnits,
  judgeSentence,
  judgeWord,
  letterDistance,
  recognizerSupported,
  speechErrorMessage,
} from "./speech";

const IPA: Record<string, string> = {
  sheep: "/ʃiːp/",
  ship: "/ʃɪp/",
  fool: "/fuːl/",
  full: "/fʊl/",
  seat: "/siːt/",
  sit: "/sɪt/",
};
const lookup = (w: string) => IPA[w];
const word = (target: string, heard: string[]) => judgeWord(target, IPA[target] ?? "", heard, lookup);

test("IPA is split into phonemes and a length mark stays with its vowel", () => {
  assert.deepEqual(ipaUnits("/ˈʃiːp/"), ["ʃ", "iː", "p"]);
  assert.deepEqual(ipaUnits("/ʃɪp/"), ["ʃ", "ɪ", "p"]);
  assert.deepEqual(ipaUnits(""), []);
});

test("a deletion followed by an insertion reads as one substitution", () => {
  const ops = diffUnits(["ʃ", "iː", "p"], ["ʃ", "ɪ", "p"]);
  assert.deepEqual(
    ops.map((o) => o.op),
    ["same", "sub", "same"],
  );
  assert.equal(ops[1].a, "iː");
  assert.equal(ops[1].b, "ɪ");
});

test("the phoneme message names the sound the learner used and the one that was wanted", () => {
  assert.equal(explainPhonemes(ipaUnits("/ʃiːp/"), ipaUnits("/ʃɪp/")), "đọc /ɪ/ thay vì /iː/");
  assert.equal(explainPhonemes(ipaUnits("/fuːl/"), ipaUnits("/fʊl/")), "đọc /ʊ/ thay vì /uː/");
  assert.equal(explainPhonemes(ipaUnits("/siːt/"), ipaUnits("/siːt/")), "");
});

test("hearing the right word is the only 100", () => {
  const v = word("sheep", ["sheep"]);
  assert.equal(v.kind, "exact");
  assert.equal(v.score, 100);
  assert.match(v.hint, /sheep/);
});

test("capital letters, punctuation and extra words do not fail a correct answer", () => {
  assert.equal(word("sheep", ["Sheep!"]).kind, "exact");
  assert.equal(word("sheep", ["the sheep"]).kind, "exact");
});

test("a minimal pair is reported with the two IPA strings, not just 'sai'", () => {
  const v = word("sheep", ["ship"]);
  assert.equal(v.kind, "near");
  assert.equal(v.heard, "ship");
  assert.match(v.hint, /\/ɪ\//);
  assert.match(v.hint, /\/iː\//);
  assert.equal(v.score, 70);
  assert.ok(v.score < 100 && v.score > 35);
});

test("two wrong sounds cost more than one", () => {
  const one = word("sheep", ["ship"]).score;
  const two = judgeWord("sheep", "/ʃiːp/", ["sip"], (w) => (w === "sip" ? "/sɪp/" : undefined)).score;
  assert.ok(two < one, `${two} should be below ${one}`);
});

test("a different word is not flattered as 'Gần đúng'", () => {
  // /wɔː/ heard as /ˈpæləs/: three sounds apart, so it must not read as a near miss.
  const v = judgeWord("war", "/wɔː/", ["palace"], (w) => (w === "palace" ? "/ˈpæləs/" : undefined));
  assert.equal(v.kind, "wrong");
  assert.equal(v.label, "Sai từ");
  assert.match(v.short, /palace/);
  assert.ok(v.score < 60, `score ${v.score} should be well below a near miss`);

  // one sound apart still counts as the same word mispronounced
  assert.equal(word("sheep", ["ship"]).kind, "near");
  assert.equal(word("sheep", ["ship"]).label, "Gần đúng");
});

test("a word the atlas does not know is still judged, by how far off it is", () => {
  const close = word("sheep", ["sheet"]);
  assert.equal(close.kind, "wrong");
  assert.equal(close.heard, "sheet");
  assert.match(close.hint, /sheet/);

  const far = word("sheep", ["banana"]);
  assert.equal(far.kind, "unclear");
  assert.match(far.hint, /thử lại/);
});

test("silence is its own verdict, never a wrong answer", () => {
  const v = word("sheep", []);
  assert.equal(v.kind, "unclear");
  assert.equal(v.score, 0);
  assert.match(v.hint, /im lặng/);
});

test("letter distance behaves", () => {
  assert.equal(letterDistance("sheep", "sheep"), 0);
  assert.equal(letterDistance("sheep", "sheet"), 1);
  assert.equal(letterDistance("", "abc"), 3);
});

test("a sentence is scored word by word and names the words that did not come through", () => {
  const all = judgeSentence("The queen wore a golden crown.", "the queen wore a golden crown");
  assert.equal(all.score, 100);
  assert.equal(all.label, "Chuẩn");
  assert.equal(all.missed.length, 0);

  const some = judgeSentence("The queen wore a golden crown.", "the queen wore a crown");
  assert.equal(some.cells.length, 6);
  assert.equal(some.score, 83);
  assert.deepEqual(some.missed, ["golden"]);
  assert.match(some.hint, /golden/);

  const none = judgeSentence("The queen wore a golden crown.", "");
  assert.equal(none.score, 0);
  assert.equal(none.label, "Chưa đúng");
});

test("recognition is offered only where the browser has it, and a recogniser is configured", () => {
  assert.equal(recognizerSupported({}), false);
  assert.equal(recognizerSupported({ webkitSpeechRecognition: function Fake() {} } as never), true);

  const made: Record<string, unknown> = {};
  function Fake(this: Record<string, unknown>) {
    this.start = () => {
      made.started = true;
    };
    this.stop = () => {};
  }
  const env = globalThis as unknown as { SpeechRecognition?: unknown };
  const before = env.SpeechRecognition;
  env.SpeechRecognition = Fake;
  const rec = createRecognizer("en-GB");
  assert.ok(rec);
  assert.equal(rec?.lang, "en-GB");
  assert.equal(rec?.interimResults, true);
  assert.equal(rec?.maxAlternatives, 5);
  assert.equal(rec?.continuous, false);
  rec?.start();
  assert.equal(made.started, true);
  env.SpeechRecognition = before;
});

test("every recogniser failure says what to do next", () => {
  assert.match(speechErrorMessage("not-allowed"), /cho phép Micro/);
  assert.match(speechErrorMessage("no-speech"), /đọc to ngay/);
  assert.match(speechErrorMessage("audio-capture"), /Không thấy micro/);
  assert.match(speechErrorMessage("network"), /mạng/);
  assert.match(speechErrorMessage("whatever"), /Thử lại/);
});
