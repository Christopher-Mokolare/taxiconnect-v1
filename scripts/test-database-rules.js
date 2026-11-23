"use strict";

const assert = require("node:assert/strict");
const admin = require("../functions/node_modules/firebase-admin");

const projectId = "taxiconnect-dev";
const databaseURL = "http://127.0.0.1:9000?ns=taxiconnect-dev-default-rtdb";

function makeClient(name, uid, claims = {}) {
  const app = admin.initializeApp({
    projectId,
    databaseURL,
    databaseAuthVariableOverride: uid ? { uid, ...claims } : null
  }, name);
  return { app, db: admin.database(app) };
}

async function expectAllowed(label, operation) {
  try {
    return await operation();
  } catch (error) {
    throw new Error(label + " should be allowed, but failed: " + error.message);
  }
}

async function expectDenied(label, operation) {
  let denied = false;
  try {
    await operation();
  } catch (error) {
    denied = true;
  }
  assert.equal(denied, true, label + " should be denied by Realtime Database rules");
}

async function main() {
  const owner = makeClient("rules-owner", "rules-test-admin", { admin: true });
  const passenger = makeClient("rules-passenger", "passenger-1", {
    firebase: { sign_in_provider: "anonymous" }
  });
  const otherPassenger = makeClient("rules-other-passenger", "passenger-2", {
    firebase: { sign_in_provider: "anonymous" }
  });
  const driver = makeClient("rules-driver", "driver-1", { isDriver: true });
  const otherDriver = makeClient("rules-other-driver", "driver-2", { isDriver: true });
  const conductor = makeClient("rules-conductor", "conductor-1", { isConductor: true });
  const unauthenticated = makeClient("rules-unauthenticated", null);

  const seed = {
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
  };

  await expectAllowed("reset emulator database", () => owner.db.ref("/").set(seed));
  await expectDenied("unauthenticated root read", () => unauthenticated.db.ref("/").once("value"));

  const ownWait = {
    route: "SUN_CITY",
    groupSize: 2,
    passengerId: "passenger-1",
    timestamp: Date.now(),
    status: "waiting"
  };
  await expectAllowed("passenger creates own wait signal", () => passenger.db.ref("waitingPassengers/wait-1").set(ownWait));
  await expectAllowed("passenger reads own wait signal", () => passenger.db.ref("waitingPassengers/wait-1").once("value"));
  await expectDenied("passenger cannot read another passenger signal", () => passenger.db.ref("waitingPassengers/otherWait").once("value"));
  await expectDenied("passenger cannot list all waiting signals", () => passenger.db.ref("waitingPassengers").once("value"));
  await expectDenied("passenger cannot create signal for another UID", () => passenger.db.ref("waitingPassengers/spoofed").set({
    ...ownWait,
    passengerId: "passenger-2"
  }));
  await expectAllowed("passenger stores own wait index", () => passenger.db.ref("passengerWaiting/passenger-1").set("wait-1"));
  await expectDenied("passenger cannot store another user's wait index", () => passenger.db.ref("passengerWaiting/passenger-2").set("wait-1"));
  await expectAllowed("passenger cancels own signal", () => passenger.db.ref("waitingPassengers/wait-1").remove());

  const ownTaxi = {
    driverId: "driver-1",
    driverName: "Driver One",
    route: "RUSTENBURG",
    capacity: 14,
    passengersOnboard: 3,
    status: "loading",
    lastUpdated: Date.now()
  };
  await expectAllowed("driver creates own taxi", () => driver.db.ref("taxis/taxi-1").set(ownTaxi));
  await expectDenied("driver cannot create taxi for another UID", () => driver.db.ref("taxis/taxi-spoof").set({
    ...ownTaxi,
    driverId: "driver-2"
  }));
  await expectAllowed("driver updates own passenger count", () => driver.db.ref("taxis/taxi-1").update({
    passengersOnboard: 4,
    lastUpdated: Date.now()
  }));
  await expectDenied("driver cannot mark taxi departed", () => driver.db.ref("taxis/taxi-1").update({
    status: "departed",
    lastUpdated: Date.now()
  }));
  await expectDenied("driver cannot remove another driver's taxi", () => driver.db.ref("taxis/seedTaxi").remove());

  await expectAllowed("conductor lists waiting passengers", () => conductor.db.ref("waitingPassengers").once("value"));
  await expectAllowed("conductor marks taxi breakdown", () => conductor.db.ref("taxis/taxi-1").update({
    status: "breakdown",
    lastUpdated: Date.now()
  }));
  await expectAllowed("conductor publishes route summons", () => conductor.db.ref("summons/SUN_CITY").set({
    count: 4,
    timestamp: Date.now(),
    conductorId: "conductor-1"
  }));
  await expectDenied("conductor cannot publish unsupported route", () => conductor.db.ref("summons/UNKNOWN").set({
    count: 4,
    timestamp: Date.now(),
    conductorId: "conductor-1"
  }));

  await Promise.all([
    owner.app.delete(),
    passenger.app.delete(),
    otherPassenger.app.delete(),
    driver.app.delete(),
    otherDriver.app.delete(),
    conductor.app.delete(),
    unauthenticated.app.delete()
  ]);

  console.log("Realtime Database security emulator tests passed.");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
