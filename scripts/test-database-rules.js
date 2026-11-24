"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails
} = require("../functions/node_modules/@firebase/rules-unit-testing");
const {
  ref,
  set,
  get,
  update,
  remove
} = require("../functions/node_modules/firebase/database");

const projectId = "taxiconnect-dev";

async function main() {
  const testEnv = await initializeTestEnvironment({
    projectId,
    database: {
      host: "127.0.0.1",
      port: 9000,
      rules: fs.readFileSync(path.join(__dirname, "..", "database.rules.json"), "utf8")
    }
  });

  try {
    const passengerDb = testEnv.authenticatedContext("passenger-1", {
      firebase: { sign_in_provider: "anonymous" }
    }).database();
    const otherPassengerDb = testEnv.authenticatedContext("passenger-2", {
      firebase: { sign_in_provider: "anonymous" }
    }).database();
    const driverDb = testEnv.authenticatedContext("driver-1", { isDriver: true }).database();
    const otherDriverDb = testEnv.authenticatedContext("driver-2", { isDriver: true }).database();
    const conductorDb = testEnv.authenticatedContext("conductor-1", { isConductor: true }).database();
    const unauthenticatedDb = testEnv.unauthenticatedContext().database();

    await testEnv.withSecurityRulesDisabled(async context => {
      await set(ref(context.database(), "/"), {
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
      });
    });

    await assertFails(get(ref(unauthenticatedDb, "/")));

    const ownWait = {
      route: "SUN_CITY",
      groupSize: 2,
      passengerId: "passenger-1",
      timestamp: Date.now(),
      pickupPoint: "Mabeskraal village shop",
      expiresAt: Date.now() + 45 * 60 * 1000,
      status: "waiting"
    };
    await assertSucceeds(set(ref(passengerDb, "passengerWaiting/passenger-1"), "wait-1"));
    await assertSucceeds(set(ref(passengerDb, "waitingPassengers/wait-1"), ownWait));
    await assertFails(set(ref(passengerDb, "waitingPassengers/wait-duplicate"), {
      ...ownWait,
      pickupPoint: "Another stop"
    }));
    await assertSucceeds(get(ref(passengerDb, "waitingPassengers/wait-1")));
    await assertFails(get(ref(passengerDb, "waitingPassengers/otherWait")));
    await assertFails(get(ref(passengerDb, "waitingPassengers")));
    await assertFails(set(ref(passengerDb, "waitingPassengers/spoofed"), {
      ...ownWait,
      passengerId: "passenger-2"
    }));
    await assertFails(set(ref(passengerDb, "passengerWaiting/passenger-2"), "wait-1"));
    await assertSucceeds(remove(ref(passengerDb, "waitingPassengers/wait-1")));
    await assertSucceeds(remove(ref(passengerDb, "passengerWaiting/passenger-1")));

    const ownTaxi = {
      driverId: "driver-1",
      driverName: "Driver One",
      route: "RUSTENBURG",
      capacity: 14,
      passengersOnboard: 3,
      status: "loading",
      lastUpdated: Date.now()
    };
    await assertSucceeds(set(ref(driverDb, "taxis/taxi-1"), ownTaxi));
    await assertSucceeds(get(ref(passengerDb, "taxis")));
    await assertSucceeds(get(ref(conductorDb, "taxis")));
    const connectionSession = { connectedAt: Date.now(), lastSeen: Date.now() };
    await assertSucceeds(set(ref(driverDb, "taxiConnections/taxi-1/session-1"), connectionSession));
    await assertSucceeds(get(ref(passengerDb, "taxiConnections/taxi-1")));
    await assertSucceeds(get(ref(conductorDb, "taxiConnections/taxi-1")));
    await assertFails(set(ref(otherDriverDb, "taxiConnections/taxi-1/session-evil"), connectionSession));
    await assertSucceeds(remove(ref(conductorDb, "taxiConnections/taxi-1/session-1")));
    await assertSucceeds(set(ref(driverDb, "taxiConnections/taxi-1/session-1"), connectionSession));
    await assertSucceeds(remove(ref(driverDb, "taxiConnections/taxi-1/session-1")));
    const assignableWait = {
      route: "RUSTENBURG",
      groupSize: 2,
      passengerId: "passenger-1",
      timestamp: Date.now(),
      pickupPoint: "Mabeskraal main road",
      expiresAt: Date.now() + 45 * 60 * 1000,
      status: "waiting"
    };
    await assertSucceeds(set(ref(passengerDb, "passengerWaiting/passenger-1"), "wait-assign"));
    await assertSucceeds(set(ref(passengerDb, "waitingPassengers/wait-assign"), assignableWait));
    await assertSucceeds(update(ref(conductorDb, "waitingPassengers/wait-assign"), {
      status: "assigned",
      assignedTaxiId: "taxi-1",
      assignedAt: Date.now()
    }));
    await assertSucceeds(get(ref(passengerDb, "waitingPassengers/wait-assign")));

    // Existing requests remain assignable after the 60-second creation window,
    // provided their original timestamp is immutable and the 45-minute expiry remains valid.
    const staleRequestNow = Date.now();
    await testEnv.withSecurityRulesDisabled(async context => {
      await set(ref(context.database(), "waitingPassengers/wait-old"), {
        route: "RUSTENBURG",
        groupSize: 2,
        passengerId: "passenger-1",
        timestamp: staleRequestNow - 2 * 60 * 1000,
        pickupPoint: "Mabeskraal village shop",
        expiresAt: staleRequestNow + 20 * 60 * 1000,
        status: "waiting"
      });
      await set(ref(context.database(), "waitingPassengers/wait-expired"), {
        route: "RUSTENBURG",
        groupSize: 2,
        passengerId: "passenger-1",
        timestamp: staleRequestNow - 2 * 60 * 1000,
        pickupPoint: "Mabeskraal village shop",
        expiresAt: staleRequestNow - 1000,
        status: "waiting"
      });
    });
    await assertSucceeds(update(ref(conductorDb, "waitingPassengers/wait-old"), {
      status: "assigned",
      assignedTaxiId: "taxi-1",
      assignedAt: Date.now()
    }));
    await assertFails(update(ref(conductorDb, "waitingPassengers/wait-expired"), {
      status: "assigned",
      assignedTaxiId: "taxi-1",
      assignedAt: Date.now()
    }));
    await assertFails(update(ref(conductorDb, "waitingPassengers/wait-old"), {
      timestamp: Date.now(),
      assignedTaxiId: "taxi-1",
      assignedAt: Date.now()
    }));
    await assertFails(update(ref(otherPassengerDb, "waitingPassengers/wait-assign"), {
      status: "assigned",
      assignedTaxiId: "taxi-1",
      assignedAt: Date.now()
    }));
    await assertFails(update(ref(conductorDb, "waitingPassengers/wait-assign"), {
      assignedTaxiId: "missing-taxi",
      assignedAt: Date.now()
    }));
    await assertFails(set(ref(driverDb, "taxis/taxi-spoof"), {
      ...ownTaxi,
      driverId: "driver-2"
    }));
    await assertSucceeds(update(ref(driverDb, "taxis/taxi-1"), {
      passengersOnboard: 4,
      lastUpdated: Date.now()
    }));
    await assertFails(update(ref(driverDb, "taxis/taxi-1"), {
      status: "departed",
      lastUpdated: Date.now()
    }));
    await assertFails(remove(ref(driverDb, "taxis/seedTaxi")));
    await assertFails(remove(ref(driverDb, "taxis/taxi-1")));
    await assertSucceeds(update(ref(driverDb, "taxis/taxi-1"), {
      status: "offline",
      lastUpdated: Date.now()
    }));
    await assertFails(update(ref(driverDb, "taxis/taxi-1"), {
      status: "departed",
      lastUpdated: Date.now()
    }));
    await assertFails(get(ref(passengerDb, "drivers/driver-1")));
    await assertSucceeds(get(ref(driverDb, "drivers/driver-1")));

    await assertSucceeds(set(ref(conductorDb, "routeDemand/mabeskraal-stop"), {
      route: "RUSTENBURG",
      pickupPoint: "Mabeskraal village shop",
      people: 5,
      requests: 3,
      expiresAt: Date.now() + 30 * 60 * 1000
    }));
    await assertSucceeds(get(ref(driverDb, "routeDemand")));
    await assertFails(get(ref(passengerDb, "routeDemand")));
    await assertFails(set(ref(driverDb, "routeDemand/forbidden"), {
      route: "RUSTENBURG",
      pickupPoint: "Main road",
      people: 2,
      requests: 2,
      expiresAt: Date.now() + 30 * 60 * 1000
    }));

    await assertSucceeds(get(ref(conductorDb, "waitingPassengers")));
    await assertSucceeds(update(ref(conductorDb, "taxis/taxi-1"), {
      status: "breakdown",
      lastUpdated: Date.now()
    }));
    await assertSucceeds(set(ref(conductorDb, "summons/SUN_CITY"), {
      count: 4,
      timestamp: Date.now(),
      conductorId: "conductor-1"
    }));
    await assertFails(set(ref(conductorDb, "summons/UNKNOWN"), {
      count: 4,
      timestamp: Date.now(),
      conductorId: "conductor-1"
    }));

    console.log("Realtime Database security emulator tests passed.");
  } finally {
    await testEnv.cleanup();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
