import assert from "node:assert/strict";
import { test } from "node:test";
import { maskedCharacter, promptCells } from "./typing";

const target = "The pirate rows.";

test("an untouched prompt shows length and punctuation but no letters", () => {
  const cells = promptCells(target, "");
  assert.equal(cells.length, target.length);
  assert.deepEqual(
    cells.map((c) => c.ch).join(""),
    "··· ······ ····.",
  );
  assert.equal(cells[0].cls, "is-caret");
  assert.equal(cells[1].cls, "");
});

test("a wrong keystroke shows the learner's own letter, never the answer", () => {
  const cells = promptCells(target, "z");
  assert.equal(cells[0].ch, "z");
  assert.equal(cells[0].cls, "is-bad");
  assert.equal(cells[1].cls, "is-caret");
  // The give-away the old code had: it printed "T" here.
  assert.notEqual(cells[0].ch, "T");
});

test("typing a wrong letter at every position never reveals the target", () => {
  const wrong = "z".repeat(target.length);
  const shown = promptCells(target, wrong)
    .map((c) => c.ch)
    .join("");
  assert.equal(shown, wrong);
  for (let i = 0; i < target.length; i++) {
    if (/[A-Za-z]/.test(target[i])) {
      assert.notEqual(shown[i].toLowerCase(), target[i].toLowerCase(), `position ${i} leaked the answer`);
    }
  }
});

test("a correct keystroke shows the target's own character and is marked ok", () => {
  const cells = promptCells(target, "the p");
  assert.deepEqual(
    cells.slice(0, 5).map((c) => [c.ch, c.cls]),
    [
      ["T", "is-ok"],
      ["h", "is-ok"],
      ["e", "is-ok"],
      [" ", "is-ok"],
      ["p", "is-ok"],
    ],
  );
  assert.equal(cells[5].cls, "is-caret");
});

test("a mixed attempt marks each position on its own", () => {
  const cells = promptCells("cat", "cxt");
  assert.deepEqual(
    cells.map((c) => [c.ch, c.cls]),
    [
      ["c", "is-ok"],
      ["x", "is-bad"],
      ["t", "is-ok"],
    ],
  );
});

test("the explicit answer view prints the target with no marking", () => {
  const cells = promptCells(target, "zzz", true);
  assert.equal(
    cells.map((c) => c.ch).join(""),
    target,
  );
  assert.ok(cells.every((c) => c.cls === ""));
});

test("spaces and punctuation are visible before they are typed, letters are not", () => {
  assert.equal(maskedCharacter(" "), " ");
  assert.equal(maskedCharacter("."), ".");
  assert.equal(maskedCharacter(","), ",");
  assert.equal(maskedCharacter("a"), "·");
  assert.equal(maskedCharacter("7"), "·");
});
