"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("shared route labels cover every supported route", () => {
  const context = { window: {}, Date };
  vm.runInNewContext(read("public/js/app-common.js"), context);
  assert.equal(context.window.routeLabel("SUN_CITY"), "Sun City (Sun Village)");
  assert.equal(context.window.routeLabel("RUSTENBURG"), "Rustenburg (Town)");
  assert.equal(context.window.routeLabel("UNKNOWN"), "Unknown route");
});

test("shared text rendering escapes HTML-sensitive characters", () => {
  const context = { window: {}, Date };
  vm.runInNewContext(read("public/js/app-common.js"), context);
  assert.equal(
    context.window.escapeHtml('<script>alert("x")</script>'),
    "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
  );
});

test("every web callable has a backend export", () => {
  const backend = read("functions/index.js");
  const exports = new Set([...backend.matchAll(/exports\.([A-Za-z0-9_]+)\s*=/g)].map((match) => match[1]));
  const pages = ["public/conductor.html", "public/driver.html", "public/passenger.html"];
  const callables = new Set();
  for (const page of pages) {
    for (const match of read(page).matchAll(/httpsCallable\(['"]([^'"]+)['"]\)/g)) {
      callables.add(match[1]);
    }
  }
  assert.ok(callables.size >= 10, "expected the core operational callables to be present");
  for (const callable of callables) {
    assert.ok(exports.has(callable), "missing backend callable: " + callable);
  }
});

test("all role pages load shared helpers and Firebase configuration", () => {
  for (const page of ["public/conductor.html", "public/driver.html", "public/passenger.html"]) {
    const html = read(page);
    assert.match(html, /src=["']\/firebase-config\.js["']/);
    assert.match(html, /src=["']\/js\/app-common\.js["']/);
    const scripts = [...html.matchAll(/<script\b(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi)];
    for (const [index, script] of scripts.entries()) {
      if (!script[1].trim()) continue;
      assert.doesNotThrow(
        () => new vm.Script(script[1], { filename: page + " inline script " + (index + 1) }),
        page + " inline script " + (index + 1)
      );
    }
  }
});

test("unsafe or removed administrative endpoints are not exposed", () => {
  const backend = read("functions/index.js");
  const conductor = read("public/conductor.html");
  assert.doesNotMatch(backend, /exports\.clearAllData\s*=/);
  assert.doesNotMatch(backend, /exports\.approvePhone\s*=/);
  assert.doesNotMatch(conductor, /clearAllData|approvePhone|registerPhone/);
});
