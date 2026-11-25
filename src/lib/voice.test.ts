import assert from "node:assert/strict";
import { test } from "node:test";
import {
  COMPARE_GAP_MS,
  RECORD_LIMIT_MS,
  elapsedLabel,
  pickAudioMime,
  recorderErrorMessage,
  recorderSupported,
  stopReason,
} from "./voice";

test("the newest container is preferred and a silent browser still works", () => {
  const all = () => true;
  assert.equal(pickAudioMime(all), "audio/webm;codecs=opus");
  // Safari: no webm at all, but mp4 is accepted.
  assert.equal(pickAudioMime((t) => t.startsWith("audio/mp4")), "audio/mp4");
  // Nothing known: the browser's own default is used.
  assert.equal(pickAudioMime(() => false), undefined);
});

test("recording is offered only where the page can actually capture", () => {
  assert.equal(recorderSupported({ navigator: { mediaDevices: { getUserMedia: () => {} } }, MediaRecorder: function () {} }), true);
  assert.equal(recorderSupported({ navigator: { mediaDevices: {} }, MediaRecorder: function () {} }), false);
  assert.equal(recorderSupported({ navigator: { mediaDevices: { getUserMedia: () => {} } } }), false);
  assert.equal(recorderSupported({}), false);
});

test("each microphone failure tells the learner what to do", () => {
  assert.match(recorderErrorMessage({ name: "NotAllowedError" }), /cho phép Micro/);
  assert.match(recorderErrorMessage({ name: "NotFoundError" }), /không có micro/);
  assert.match(recorderErrorMessage({ name: "NotReadableError" }), /chương trình khác/);
  assert.match(recorderErrorMessage({ name: "WeirdError" }), /https hoặc localhost/);
  assert.match(recorderErrorMessage(undefined), /https hoặc localhost/);
});

test("the timer reads as a clock and the ceiling is what stops a long take", () => {
  assert.equal(elapsedLabel(0), "0:00");
  assert.equal(elapsedLabel(3_400), "0:03");
  assert.equal(elapsedLabel(61_000), "1:01");
  assert.equal(elapsedLabel(-5), "0:00");
  assert.equal(stopReason(1_000), "learner");
  assert.equal(stopReason(RECORD_LIMIT_MS), "limit");
  assert.equal(stopReason(30_000), "limit");
});

test("the comparison leaves a real pause between the two voices", () => {
  assert.ok(COMPARE_GAP_MS >= 300 && COMPARE_GAP_MS <= 800);
});
