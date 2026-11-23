#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const requiredJson = ["firebase.json", ".firebaserc", "database.rules.json"];
const requiredPages = [
  "public/index.html",
  "public/conductor.html",
  "public/driver.html",
  "public/passenger.html",
  "public/firebase-config.js",
  "public/js/app-common.js",
  "functions/scripts/provision-staff.js",
];
const errors = [];

for (const relative of requiredJson) {
  const file = path.join(root, relative);
  try {
    JSON.parse(fs.readFileSync(file, "utf8"));
    console.log("JSON OK:", relative);
  } catch (error) {
    errors.push(relative + ": " + error.message);
  }
}

for (const relative of requiredPages) {
  if (!fs.existsSync(path.join(root, relative))) {
    errors.push("Missing required product file: " + relative);
  } else {
    console.log("File OK:", relative);
  }
}

const functionsFile = path.join(root, "functions", "index.js");
if (fs.existsSync(functionsFile)) {
  const source = fs.readFileSync(functionsFile, "utf8");
  if (/exports\.clearAllData\s*=/.test(source)) {
    errors.push("A whole-database deletion callable must never be exposed.");
  }
  if (/loginWithPin|DRIVER_PIN|CONDUCTOR_PIN/.test(source)) {
    errors.push("Shared staff PIN authentication must not be present.");
  }
}

try {
  new vm.Script(fs.readFileSync(path.join(root, "functions", "scripts", "provision-staff.js"), "utf8"));
} catch (error) {
  errors.push("Staff provisioning script: " + error.message);
}

for (const relative of requiredPages.filter((file) => file.endsWith(".html"))) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) continue;

  const html = fs.readFileSync(file, "utf8");
  if (!html.includes("/firebase-config.js") && relative !== "public/index.html") {
    errors.push(relative + ": Firebase client configuration script is not loaded.");
  }
  if (/onclick=["']cancelSignal\(\)["']/.test(html)) {
    errors.push(relative + ": references the removed cancelSignal handler.");
  }

  const scripts = [...html.matchAll(/<script\b(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi)];
  for (let index = 0; index < scripts.length; index += 1) {
    const body = scripts[index][1].trim();
    if (!body) continue;
    const type = scripts[index][0].match(/\btype=["']([^"']+)["']/i)?.[1];
    if (type && type !== "text/javascript" && type !== "application/javascript") continue;
    try {
      new vm.Script(body, { filename: relative + " inline script #" + (index + 1) });
    } catch (error) {
      errors.push(relative + " inline script #" + (index + 1) + ": " + error.message);
    }
  }
}

const firebaseConfig = JSON.parse(fs.readFileSync(path.join(root, "firebase.json"), "utf8"));
if (Object.prototype.hasOwnProperty.call(firebaseConfig, "functions")) {
  errors.push("Spark-compatible V1 deployment must not include Cloud Functions.");
}

for (const relative of ["public/conductor.html", "public/driver.html", "public/passenger.html"]) {
  const html = fs.readFileSync(path.join(root, relative), "utf8");
  if (/httpsCallable|firebase-functions-compat/.test(html)) {
    errors.push(relative + ": active web pages must use Realtime Database, not Cloud Functions.");
  }
}

const databaseRules = JSON.parse(fs.readFileSync(path.join(root, "database.rules.json"), "utf8")).rules;
if (databaseRules[".read"] !== false || databaseRules[".write"] !== false) {
  errors.push("Realtime Database root access must remain denied by default.");
}
if (!databaseRules.taxis || !databaseRules.waitingPassengers || !databaseRules.passengerWaiting || !databaseRules.summons) {
  errors.push("Required role-protected Realtime Database paths are missing.");
}

const configFile = path.join(root, "public", "firebase-config.js");
if (fs.existsSync(configFile)) {
  const config = fs.readFileSync(configFile, "utf8");
  if (config.includes("REPLACE_WITH_FIREBASE_WEB_API_KEY")) {
    console.warn("WARNING: Firebase web configuration is still a placeholder; live sign-in is not ready.");
  }
}

if (errors.length) {
  console.error("\nValidation failed:");
  for (const error of errors) console.error(" -", error);
  process.exit(1);
}

console.log("\nTaxiConnect V1 repository validation passed.");
