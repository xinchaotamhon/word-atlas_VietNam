#!/usr/bin/env node
/**
 * Answer the question the owner had to answer twice with a screenshot: does the inline
 * typing card ever print the answer, and does everything still fit inside the card?
 *
 * It drives a real Chrome against a served build (default `ban_do_tieng_anh.cmd`, i.e.
 * http://localhost:5188) and checks the promise the feature makes:
 *
 *   1. opening the card shows length and punctuation only, never a letter of the target;
 *   2. a wrong keystroke shows the learner's own letter, not the expected one;
 *   3. finishing the sentence does NOT paint the answer across the card;
 *   4. "Xem câu" / "Đáp án" is the one deliberate way to print the target;
 *   5. nothing the card draws is outside the card, and the "Chính xác" tick is visible.
 *
 * Usage: node scripts/ui-check.mjs [--url <url>] [--browser chrome|msedge] [--quiet]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const require = createRequire(`${root}/package.json`);
const { chromium } = require("playwright");

const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const url = argOf("--url", "http://localhost:5188");
const channel = argOf("--browser", "chrome");
const quiet = argv.includes("--quiet");

const SENTENCES = JSON.parse(
  fs.readFileSync(path.join(root, "public/atlas/sentences-daily.json"), "utf8"),
);
const SENTENCE_WORD = "cathedral";
const SENTENCE = SENTENCES[SENTENCE_WORD][0];
const WORD = "library";

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  if (!quiet) console.log(`${ok ? "ok  " : "FAIL"}  ${name}${detail ? `  - ${detail}` : ""}`);
};

/** Letters of the target that the card must not be showing. */
const lettersOf = (text) => new Set(text.toLowerCase().match(/[a-z]/g) ?? []);

const maskedOnly = (promptText, target) => {
  // Everything the prompt may show before the learner has typed: masks, spaces, punctuation.
  if (/[A-Za-z0-9]/.test(promptText)) return false;
  const allowed = new Set(["·", " ", "'", "’", ",", ".", "?", "!", "-", ":"]);
  return [...promptText].every((ch) => allowed.has(ch)) && promptText.length >= target.length - 2;
};

/** The element that visually holds the card: a grid tile or a list row. */
const CARD = ".tile, .row";

const cardText = (page) =>
  page.evaluate((sel) => document.querySelector(sel)?.textContent ?? "", CARD);

async function run(browser, { width, height, view, mode, query }, checks) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  const params = new URLSearchParams();
  if (mode) params.set("mode", mode);
  if (query) params.set("q", query);
  if (view) params.set("view", view);
  await page.goto(`${url}/#/atlas?${params.toString()}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForSelector(`${CARD}, .onboard`, { timeout: 90_000 });
  if (await page.locator(".onboard").count()) await page.locator(".onboard .btn-xl").click();
  await page.waitForSelector(CARD, { timeout: 90_000 });
  await page.locator('[aria-label^="Luyện gõ"]').first().click();
  await page.waitForSelector(".tile-typing-header, .row-typing-hint", { timeout: 30_000 });
  await page.waitForTimeout(200);
  await checks(page, pageErrors);
  await context.close();
}

const promptText = (page) =>
  page.evaluate(
    () => document.querySelector(".tile-typing-prompt, .row-typing-prompt")?.textContent ?? null,
  );

const overflow = (page) =>
  page.evaluate((sel) => {
    const card = document.querySelector(sel);
    if (!card) return null;
    const bottom = card.getBoundingClientRect().bottom;
    let worst = -Infinity;
    let worstName = "";
    for (const s of [".tile-typing-hint", ".tile-typing-done", ".tile-typing-prompt",
                     ".tile-typing-done-line", ".tile-typing-close", ".tile-typing-reveal",
                     ".row-typing-hint", ".row-typing-done", ".row-typing-prompt",
                     ".row-typing-done-line", ".row-typing-reveal"]) {
      for (const el of document.querySelectorAll(s)) {
        const r = el.getBoundingClientRect();
        if (r.height <= 0) continue;
        if (r.bottom - bottom > worst) {
          worst = r.bottom - bottom;
          worstName = s;
        }
      }
    }
    return { overflow: Math.round(worst), worstName, cardH: Math.round(card.getBoundingClientRect().height) };
  }, CARD);

const tickInside = (page) =>
  page.evaluate((sel) => {
    const card = document.querySelector(sel);
    const tick = document.querySelector(".tile-typing-done, .row-typing-done");
    if (!card || !tick) return null;
    const c = card.getBoundingClientRect();
    const t = tick.getBoundingClientRect();
    return t.bottom <= c.bottom + 1 && t.top >= c.top - 1 && t.width > 0;
  }, CARD);

/** The same five promises for a sentence card and for a one-word card. */
async function typingChecks(page, pageErrors, { target, label }) {
  const opened = await promptText(page);
  check(`${label}: opens masked`, maskedOnly(opened, target), JSON.stringify(opened?.slice(0, 24)));
  check(`${label}: opens with no target letter`, ![...lettersOf(target)].some((c) => opened?.toLowerCase().includes(c)));

  const fitOpen = await overflow(page);
  check(`${label}: open state fits the card`, fitOpen !== null && fitOpen.overflow <= 1, JSON.stringify(fitOpen));

  // A deliberately wrong first character.
  await page.locator("input.tile-typing-input, input.row-typing-input").first().focus();
  await page.keyboard.type("qz");
  await page.waitForTimeout(250);
  const wrong = await promptText(page);
  const cells = await page.evaluate(() =>
    [...document.querySelectorAll(".tile-typing-prompt span, .row-typing-prompt span")].slice(0, 3)
      .map((s) => `${s.textContent || " "}|${s.className || "-"}`),
  );
  check(`${label}: wrong keystrokes print the learner's own letters`, wrong?.startsWith("qz"), JSON.stringify(cells));
  check(
    `${label}: the expected letters stay hidden`,
    !target.slice(0, 4).split("").every((c, i) => wrong?.[i]?.toLowerCase() === c.toLowerCase()),
  );

  // Finish it.
  await page.evaluate(() => {
    const input = document.querySelector("input.tile-typing-input, input.row-typing-input");
    input?.blur();
  });
  await page.locator("input.tile-typing-input, input.row-typing-input").first().fill(target);
  await page.waitForTimeout(400);
  const text = await cardText(page);
  check(`${label}: finishing does not print the target on the card`, !text.includes(target), text.replace(/\s+/g, " ").slice(0, 60));
  check(`${label}: finishing announces itself`, (await tickInside(page)) === true);
  check(`${label}: the tick is not clipped`, await page.locator(".tile-typing-done, .row-typing-done").first().isVisible());
  const fitDone = await overflow(page);
  check(`${label}: finished state fits the card`, fitDone !== null && fitDone.overflow <= 1, JSON.stringify(fitDone));

  // The explicit route still prints it.
  const reveal = page.locator(".tile-typing-reveal, .row-typing-reveal").first();
  await reveal.click();
  await page.waitForTimeout(300);
  const shown = await promptText(page);
  const norm = (s) => (s ?? "").replace(/\s+/g, " ").trim();
  check(`${label}: "Xem câu" prints the target on request`, norm(shown) === norm(target), JSON.stringify(shown?.slice(0, 30)));

  check(`${label}: no page errors`, pageErrors.length === 0, pageErrors.slice(0, 2).join(" | "));
}

let browser;
let server = null;

/** Is the app already being served? Then --serve has nothing to do. */
async function reachable(u, timeoutMs = 1500) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(u, { signal: ctrl.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

if (argv.includes("--serve") && !(await reachable(url))) {
  if (!fs.existsSync(path.join(root, "dist/index.html"))) {
    console.error("[ui-check] no built app. Run: dan_chu\\ban_do_tieng_anh.cmd -Build");
    process.exit(2);
  }
  server = spawn(
    process.execPath,
    [path.join(root, "node_modules/vite/bin/vite.js"), "preview", "--port", "5188", "--strictPort"],
    { cwd: root, stdio: "ignore" },
  );
  const deadline = Date.now() + 40_000;
  let up = false;
  while (Date.now() < deadline) {
    if (await reachable(url)) {
      up = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  if (!up) {
    console.error("[ui-check] the preview server did not come up");
    server.kill();
    process.exit(2);
  }
}

try {
  browser = await chromium.launch({ channel });
} catch (err) {
  console.error(`[ui-check] cannot launch ${channel}: ${err.message.split("\n")[0]}`);
  server?.kill();
  process.exit(2);
}

try {
  await run(browser, { width: 390, height: 844, mode: "daily", query: SENTENCE_WORD }, (page, errs) =>
    typingChecks(page, errs, { target: SENTENCE, label: "sentence 390px" }));
  await run(browser, { width: 1280, height: 900, mode: "daily", query: SENTENCE_WORD }, (page, errs) =>
    typingChecks(page, errs, { target: SENTENCE, label: "sentence 1280px" }));
  await run(browser, { width: 1280, height: 900, view: "list", mode: "daily", query: SENTENCE_WORD }, (page, errs) =>
    typingChecks(page, errs, { target: SENTENCE, label: "sentence list" }));
  await run(browser, { width: 1280, height: 900, query: WORD }, (page, errs) =>
    typingChecks(page, errs, { target: WORD, label: "word" }));
} finally {
  await browser.close();
  server?.kill();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  for (const f of failed) console.log(`  FAIL ${f.name}${f.detail ? ` - ${f.detail}` : ""}`);
  process.exit(1);
}
console.log("UI CHECK OK");
