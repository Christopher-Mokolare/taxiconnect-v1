"use strict";

const admin = require("firebase-admin");

const [emailArg, roleArg] = process.argv.slice(2);
const email = String(emailArg || "").trim().toLowerCase();
const role = String(roleArg || "").trim().toLowerCase();

if (!email || !["driver", "conductor"].includes(role)) {
  console.error("Usage: npm run provision:staff -- <email> <driver|conductor>");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: process.env.GCLOUD_PROJECT || "taxiconnect-dev"
});

async function main() {
  const user = await admin.auth().getUserByEmail(email);
  const claims = {
    ...(user.customClaims || {}),
    isDriver: role === "driver",
    isConductor: role === "conductor"
  };

  await admin.auth().setCustomUserClaims(user.uid, claims);

  console.log("Staff role assigned.");
  console.log("Email:", user.email);
  console.log("UID:", user.uid);
  console.log("Role:", role);
  console.log("The staff member must sign out and sign in again to refresh their ID token.");
}

main().catch(error => {
  console.error("Could not provision staff role:", error.message);
  process.exitCode = 1;
});
