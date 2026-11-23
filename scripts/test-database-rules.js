"use strict";

const assert = require("node:assert/strict");

const host = process.env.FIREBASE_DATABASE_EMULATOR_HOST || "127.0.0.1:9000";
const namespace = "taxiconnect-dev-default-rtdb";
const base = "http://" + host;

const passenger = {
  uid: "passenger-1",
  token: { firebase: { sign_in_provider: "anonymous" } }
};
const otherPassenger = {
  uid: "passenger-2",
  token: { firebase: { sign_in_provider: "anonymous" } }
};
const driver = { uid: "driver-1", token: { isDriver: true } };
const otherDriver = { uid: "driver-2", token: { isDriver: true } };
const conductor = { uid: "conductor-1", token: { isConductor: true } };

async function request(path, method = "GET", body, identity) {
  const url = new URL("/" + path.replace(/^\/+/, "") + ".json", base);
  url.searchParams.set("ns", namespace);
  const headers = { "Content-Type": "application/json" };

  if (identity === "owner") {
    headers.Authorization = "Bearer owner";
  } else if (identity) {
    url.searchParams.set("auth_variable_override", JSON.stringify(identity));
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch {}
  return { ok: response.ok, status: response.status, data, text };
}

async function expectAllowed(label, path, method, body, identity) {
  const result = await request(path, method, body, identity);
  assert.equal(result.ok, true, label + " should be allowed; got " + result.status + " " + result.text);
  return result.data;
}

async function expectDenied(label, path, method, body, identity) {
  const result = await request(path, method, body, identity);
  assert.equal(result.ok, false, label + " should be denied");
}

async function main() {
  await expectAllowed("reset emulator database", "", "PUT", {
    taxis: {
      seedTaxi: {
        driverId: "driver-2",
        driverName: "Other Driver",
        route: "SUN_CITY",
        capacity: 14,
        passengersOnboard: 2,
        status: "loading",
        lastUpdated: Date.now()
      }
    },
    waitingPassengers: {
      otherWait: {
        route: "SUN_CITY",
        groupSize: 1,
        passengerId: "passenger-2",
        timestamp: Date.now(),
        status: "waiting"
      }
    }
  }, "owner");

  await expectDenied("unauthenticated root read", "", "GET", undefined, null);

  const ownWait = {
    route: "SUN_CITY",
    groupSize: 2,
    passengerId: passenger.uid,
    timestamp: Date.now(),
    status: "waiting"
  };
  await expectAllowed("passenger creates own wait signal", "waitingPassengers/wait-1", "PUT", ownWait, passenger);
  await expectAllowed("passenger reads own wait signal", "waitingPassengers/wait-1", "GET", undefined, passenger);
  await expectDenied("passenger cannot read another passenger signal", "waitingPassengers/otherWait", "GET", undefined, passenger);
  await expectDenied("passenger cannot list all waiting signals", "waitingPassengers", "GET", undefined, passenger);
  await expectDenied("passenger cannot create signal for another UID", "waitingPassengers/spoofed", "PUT", {
    ...ownWait,
    passengerId: otherPassenger.uid
  }, passenger);
  await expectAllowed("passenger stores own wait index", "passengerWaiting/passenger-1", "PUT", "wait-1", passenger);
  await expectDenied("passenger cannot store another user's wait index", "passengerWaiting/passenger-2", "PUT", "wait-1", passenger);
  await expectAllowed("passenger cancels own signal", "waitingPassengers/wait-1", "DELETE", undefined, passenger);

  const ownTaxi = {
    driverId: driver.uid,
    driverName: "Driver One",
    route: "RUSTENBURG",
    capacity: 14,
    passengersOnboard: 3,
    status: "loading",
    lastUpdated: Date.now()
  };
  await expectAllowed("driver creates own taxi", "taxis/taxi-1", "PUT", ownTaxi, driver);
  await expectDenied("driver cannot create taxi for another UID", "taxis/taxi-spoof", "PUT", {
    ...ownTaxi,
    driverId: otherDriver.uid
  }, driver);
  await expectAllowed("driver updates own passenger count", "taxis/taxi-1", "PATCH", {
    passengersOnboard: 4,
    lastUpdated: Date.now()
  }, driver);
  await expectDenied("driver cannot mark taxi departed", "taxis/taxi-1", "PATCH", {
    status: "departed",
    lastUpdated: Date.now()
  }, driver);
  await expectDenied("driver cannot remove another driver's taxi", "taxis/seedTaxi", "DELETE", undefined, driver);

  await expectAllowed("conductor lists waiting passengers", "waitingPassengers", "GET", undefined, conductor);
  await expectAllowed("conductor marks taxi breakdown", "taxis/taxi-1", "PATCH", {
    status: "breakdown",
    lastUpdated: Date.now()
  }, conductor);
  await expectAllowed("conductor publishes route summons", "summons/SUN_CITY", "PUT", {
    count: 4,
    timestamp: Date.now(),
    conductorId: conductor.uid
  }, conductor);
  await expectDenied("conductor cannot publish unsupported route", "summons/UNKNOWN", "PUT", {
    count: 4,
    timestamp: Date.now(),
    conductorId: conductor.uid
  }, conductor);

  console.log("Realtime Database security emulator tests passed.");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
