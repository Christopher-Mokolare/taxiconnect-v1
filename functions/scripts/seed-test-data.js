"use strict";

const admin = require("firebase-admin");

const PROJECT_ID = "taxiconnect-dev";
const DATABASE_URL = "https://taxiconnect-dev-default-rtdb.firebaseio.com";
const password = process.env.TAXICONNECT_TEST_PASSWORD;

if (process.env.TAXICONNECT_ALLOW_TEST_SEED !== "1") {
  console.error("Refusing to seed. Set TAXICONNECT_ALLOW_TEST_SEED=1 to confirm test-data setup.");
  process.exit(1);
}
if ((process.env.GCLOUD_PROJECT || PROJECT_ID) !== PROJECT_ID) {
  console.error("Refusing to seed a project other than " + PROJECT_ID + ".");
  process.exit(1);
}
if (!password || password.length < 12) {
  console.error("Set TAXICONNECT_TEST_PASSWORD to a temporary password of at least 12 characters.");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: PROJECT_ID,
  databaseURL: DATABASE_URL
});

const staff = [
  { email: "driver1@taxiconnect.test", name: "Test Driver 1", role: "driver" },
  { email: "driver2@taxiconnect.test", name: "Test Driver 2", role: "driver" },
  { email: "conductor@taxiconnect.test", name: "Test Conductor", role: "conductor" }
];

async function ensureStaffAccount(item) {
  let user;
  try {
    user = await admin.auth().getUserByEmail(item.email);
    user = await admin.auth().updateUser(user.uid, {
      password,
      displayName: item.name,
      emailVerified: true,
      disabled: false
    });
  } catch (error) {
    if (error.code !== "auth/user-not-found") throw error;
    user = await admin.auth().createUser({
      email: item.email,
      password,
      displayName: item.name,
      emailVerified: true,
      disabled: false
    });
  }

  await admin.auth().setCustomUserClaims(user.uid, {
    ...(user.customClaims || {}),
    isDriver: item.role === "driver",
    isConductor: item.role === "conductor"
  });
  return { uid: user.uid, ...item };
}

async function main() {
  const accounts = [];
  for (const item of staff) accounts.push(await ensureStaffAccount(item));

  const drivers = accounts.filter(account => account.role === "driver");
  const taxis = {
    "test-taxi-sun-001": {
      driverId: drivers[0].uid,
      driverName: drivers[0].name,
      route: "SUN_CITY",
      capacity: 14,
      passengersOnboard: 3,
      status: "loading",
      lastUpdated: Date.now()
    },
    "test-taxi-rust-001": {
      driverId: drivers[1].uid,
      driverName: drivers[1].name,
      route: "RUSTENBURG",
      capacity: 14,
      passengersOnboard: 5,
      status: "loading",
      lastUpdated: Date.now()
    }
  };

  const database = admin.database();
  const waitingSnapshot = await database.ref("waitingPassengers").once("value");
  const cleanup = {};
  for (const [waitId, passenger] of Object.entries(waitingSnapshot.val() || {})) {
    if (passenger && Object.prototype.hasOwnProperty.call(taxis, passenger.assignedTaxiId)) {
      cleanup["waitingPassengers/" + waitId] = {
        ...passenger,
        status: "waiting",
        assignedTaxiId: null,
        assignedAt: null,
        groupCode: null
      };
    }
  }
  for (const taxiId of Object.keys(taxis)) {
    cleanup["taxiAssignments/" + taxiId] = null;
  }
  if (Object.keys(cleanup).length) await database.ref().update(cleanup);
  await database.ref("taxis").update(taxis);
  console.log("TaxiConnect test accounts and sample taxis are ready in " + PROJECT_ID + ".");
  console.log("Accounts:");
  for (const account of accounts) console.log("- " + account.email + " (" + account.role + ")");
  console.log("Temporary password: supplied through TAXICONNECT_TEST_PASSWORD (not displayed).");
  console.log("Passenger test signals should be created from the Passenger page using anonymous sign-in.");
  console.log("Remove test records and accounts manually when testing is complete.");
}

main()
  .catch(error => {
    console.error("Test data setup failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    // Close Admin SDK connections so CI does not wait on an open RTDB socket.
    try {
      await admin.app().delete();
    } catch (error) {
      console.error("Could not close Firebase Admin app cleanly:", error.message);
    }
  });
