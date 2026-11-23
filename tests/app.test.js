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

test("role pages use Realtime Database directly without callable Functions", () => {
  for (const page of ["public/conductor.html", "public/driver.html", "public/passenger.html"]) {
    const html = read(page);
    assert.match(html, /firebase\.database\(\)/);
    assert.match(html, /\.ref\(/);
    assert.doesNotMatch(html, /httpsCallable|firebase-functions-compat/);
  }
});

test("database rules enforce role and passenger ownership boundaries", () => {
  const rules = JSON.parse(read("database.rules.json")).rules;
  assert.equal(rules[".read"], false);
  assert.equal(rules[".write"], false);
  assert.match(rules.taxis["$taxiId"][".write"], /isDriver/);
  assert.match(rules.taxis["$taxiId"][".write"], /isConductor/);
  assert.match(rules.taxis["$taxiId"][".write"], /newData.exists\(\)/);
  assert.match(rules.taxis["$taxiId"][".validate"], /offline/);
  assert.match(rules.waitingPassengers["$waitId"][".write"], /passengerId/);
  assert.match(rules.waitingPassengers["$waitId"][".read"], /auth.uid/);
  assert.match(rules.passengerWaiting["$uid"][".read"], /auth.uid/);
  assert.match(rules.summons[".read"], /isDriver/);
  assert.match(rules.summons["$route"][".write"], /isConductor/);
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

test("passenger assignment and conductor taxi selection are connected", () => {
  const passenger = read("public/passenger.html");
  const conductor = read("public/conductor.html");
  assert.match(passenger, /let myWaitId = null, myWaitRef = null/);
  assert.match(passenger, /renderWaitStatus\(record\)/);
  assert.match(passenger, /assignedTaxiId/);
  assert.match(conductor, /async function assignTaxi\(waitId\)/);
  assert.match(conductor, /status: 'assigned'/);
  assert.match(conductor, /freeSeats < Number\(passenger\.groupSize \|\| 1\)/);
  assert.match(conductor, /requeueAssignment/);
  assert.match(conductor, /taxi.status !== 'offline'/);
  assert.match(driver, /status: 'offline'/);
  assert.match(passenger, /t.status !== 'offline'/);
});

test("staff authentication uses individual Firebase accounts and admin role claims", () => {
  const conductor = read("public/conductor.html");
  const driver = read("public/driver.html");
  const provisioner = read("functions/scripts/provision-staff.js");
  assert.match(conductor, /signInWithEmailAndPassword/);
  assert.match(driver, /signInWithEmailAndPassword/);
  assert.match(conductor, /claims\.isConductor !== true/);
  assert.match(driver, /claims\.isDriver !== true/);
  assert.match(provisioner, /setCustomUserClaims/);
});

test("Spark deployment does not publish Cloud Functions", () => {
  const config = JSON.parse(read("firebase.json"));
  assert.equal(Object.hasOwn(config, "functions"), false);
  assert.deepEqual(Object.keys(config).filter(key => key !== "emulators").sort(), ["database", "hosting"]);
  assert.doesNotMatch(read("public/firebase-config.js"), /serviceAccount|private_key/i);
});
