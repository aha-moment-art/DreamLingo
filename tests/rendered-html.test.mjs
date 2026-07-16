import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("public player exposes the requested controls", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  assert.match(html, /DreamLingo/);
  assert.match(html, /0\.8 · 1 · 1\.2/);
  assert.match(html, /opts=\[60,120,180\]/);
  assert.match(html, /背景音乐/);
  assert.match(html, /Drifting Asleep/);
  assert.doesNotMatch(html, /03:08|02:42|03:24/);
});

test("all published audio assets exist and are non-empty", async () => {
  const files = ["quiet-london.mp3", "afternoon-tea.mp3", "country-rain.mp3", "drifting-asleep.mp3"];
  for (const file of files) {
    const info = await stat(new URL(`public/audio/${file}`, root));
    assert.ok(info.size > 100_000, `${file} should contain audio data`);
  }
});

test("server build renders the finished product", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const response = await worker.fetch(new Request("http://localhost/"), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /DreamLingo/);
  assert.match(html, /背景音乐/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
});
