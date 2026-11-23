const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.database();
const messaging = admin.messaging();
const auth = admin.auth();

const ROUTES = {
  SUN_CITY: "Sun City (Sun Village)",
  RUSTENBURG: "Rustenburg (Town)",
};

// =============================================================================
// PIN LOGIN - Uses .env variables (functions.config() is removed in v7)
// =============================================================================

exports.loginWithPin = functions.https.onCall(async (data, context) => {
  const { pin, role, name } = data || {};
  if (!["driver", "conductor"].includes(role)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid role.");
  }
  if (!name || !name.trim()) {
    throw new functions.https.HttpsError("invalid-argument", "Name is required.");
  }

  // Use process.env (loaded from .env file automatically in 2nd-gen functions)
  const expectedPin = role === "driver" ? process.env.DRIVER_PIN : process.env.CONDUCTOR_PIN;
  if (!expectedPin) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      `No PIN configured for role "${role}". Add DRIVER_PIN and CONDUCTOR_PIN to firebase/functions/.env and redeploy.`
    );
  }
  if (pin !== expectedPin) {
    throw new functions.https.HttpsError("permission-denied", "Incorrect PIN.");
  }

  const uid = `${role}_${_slug(name)}`;
  const claims = { isDriver: role === "driver", isConductor: role === "conductor" };

  try {
    await auth.getUser(uid);
    await auth.setCustomUserClaims(uid, claims);
  } catch (e) {
    await auth.createUser({ uid });
    await auth.setCustomUserClaims(uid, claims);
  }

  await db.ref(`users/${uid}`).set({
    displayName: name.trim(),
    role,
    lastLogin: Date.now(),
  });

  const token = await auth.createCustomToken(uid, claims);
  return { token, uid };
});

// =============================================================================
// CLEAR ALL DATA
// =============================================================================

exports.clearAllData = functions.https.onCall(async (data, context) => {
  _requireConductor(context);
  if (data.confirmation !== 'CONFIRM_DELETE_123') {
    throw new functions.https.HttpsError('invalid-argument', 'Confirmation code required');
  }
  await Promise.all([
    db.ref('taxis').remove(),
    db.ref('waitingPassengers').remove(),
    db.ref('summons').remove(),
    db.ref('summonRequests').remove(),
    db.ref('demandHeatmap').remove(),
    db.ref('history').remove(),
  ]);
  return { success: true };
});

// =============================================================================
// DRIVER GO LIVE
// =============================================================================

exports.goLive = functions.https.onCall(async (data, context) => {
  _requireDriver(context);
  const { route, capacity, passengersOnboard, fcmToken } = data;
  _validateRoute(route);
  _validateNumber(capacity, 1, 22, "capacity");
  _validateNumber(passengersOnboard, 0, capacity, "passengersOnboard");

  const uid = context.auth.uid;
  const userSnap = await db.ref(`users/${uid}`).once("value");
  const user = userSnap.val();
  if (!user) throw new functions.https.HttpsError("not-found", "User profile not found.");

  // Remove existing taxi for this driver (prevents duplicates on refresh)
  const existingSnap = await db.ref("taxis").orderByChild("driverId").equalTo(uid).once("value");
  const removals = [];
  existingSnap.forEach((child) => removals.push(child.ref.remove()));
  await Promise.all(removals);

  const taxiRef = db.ref("taxis").push();
  await taxiRef.set({
    driverId: uid,
    driverName: user.displayName,
    route,
    capacity,
    passengersOnboard,
    status: passengersOnboard >= capacity ? "full" : "loading",
    lastUpdated: Date.now(),
  });

  if (fcmToken) {
    await db.ref(`drivers/${uid}`).update({ fcmToken, displayName: user.displayName, lastSeen: Date.now() });
  }

  const available = capacity - passengersOnboard;
  if (available > 0) {
    await messaging.send({
      topic: `passengers_${route}`,
      notification: {
        title: "🚕 Taxi Available!",
        body: `${user.displayName}'s taxi to ${ROUTES[route]} is loading. ${available} seat(s) available.`,
      },
      data: { type: "TAXI_AVAILABLE", route, taxiId: taxiRef.key },
    }).catch(() => {});
  }
  return { taxiId: taxiRef.key };
});

// =============================================================================
// DRIVER UPDATE PASSENGERS
// =============================================================================

exports.updatePassengers = functions.https.onCall(async (data, context) => {
  _requireDriver(context);
  const { taxiId, passengersOnboard } = data;
  if (!taxiId) throw new functions.https.HttpsError("invalid-argument", "taxiId required.");

  const taxiSnap = await db.ref(`taxis/${taxiId}`).once("value");
  const taxi = taxiSnap.val();
  if (!taxi) throw new functions.https.HttpsError("not-found", "Taxi not found.");
  if (taxi.driverId !== context.auth.uid) {
    throw new functions.https.HttpsError("permission-denied", "Not your taxi.");
  }

  _validateNumber(passengersOnboard, 0, taxi.capacity, "passengersOnboard");

  const isFull = passengersOnboard >= taxi.capacity;
  await db.ref(`taxis/${taxiId}`).update({
    passengersOnboard,
    status: isFull ? "full" : "loading",
    lastUpdated: Date.now(),
  });

  if (isFull) {
    await _notifyConductor({
      title: "✅ Taxi Full — Ready to Depart",
      body: `${taxi.driverName}'s taxi to ${ROUTES[taxi.route]} is full (${taxi.capacity}/${taxi.capacity}).`,
      data: { type: "TAXI_FULL", taxiId, route: taxi.route },
    });
  }
  return { status: isFull ? "full" : "loading" };
});

// =============================================================================
// DRIVER GO OFFLINE
// =============================================================================

exports.goOffline = functions.https.onCall(async (data, context) => {
  _requireDriver(context);
  const { taxiId } = data;
  const taxiSnap = await db.ref(`taxis/${taxiId}`).once("value");
  const taxi = taxiSnap.val();
  if (!taxi) return { success: true };
  if (taxi.driverId !== context.auth.uid) {
    throw new functions.https.HttpsError("permission-denied", "Not your taxi.");
  }

  const waitingSnap = await db.ref("waitingPassengers").orderByChild("assignedTaxiId").equalTo(taxiId).once("value");
  waitingSnap.forEach((child) => child.ref.remove());

  await db.ref(`taxis/${taxiId}`).remove();
  await db.ref(`drivers/${context.auth.uid}/lastSeen`).set(Date.now());
  return { success: true };
});

// =============================================================================
// PASSENGER SIGNAL WAITING
// =============================================================================

exports.signalWaiting = functions.https.onCall(async (data, context) => {
  _requireAuth(context);
  const { route, groupSize } = data;
  _validateRoute(route);
  _validateNumber(groupSize, 1, 10, "groupSize");

  const uid = context.auth.uid;

  const existingSnap = await db.ref("waitingPassengers").orderByChild("passengerId").equalTo(uid).once("value");
  const removals = [];
  existingSnap.forEach((child) => removals.push(child.ref.remove()));
  await Promise.all(removals);

  const ref = db.ref("waitingPassengers").push();
  await ref.set({
    route,
    groupSize,
    passengerId: uid,
    timestamp: Date.now(),
    status: "waiting"
  });

  const waitSnap = await db.ref("waitingPassengers").orderByChild("route").equalTo(route).once("value");
  let totalWaiting = 0;
  waitSnap.forEach((child) => { totalWaiting += child.val().groupSize || 1; });

  await _notifyConductor({
    title: `⚠️ ${totalWaiting} Waiting — ${ROUTES[route]}`,
    body: `${totalWaiting} passenger(s) waiting for a taxi to ${ROUTES[route]}.`,
    data: { type: "DEMAND_ALERT", route, count: String(totalWaiting) },
  });

  await db.ref(`demandHeatmap/${route}`).transaction((current) => {
    const now = Date.now();
    if (!current) return { count: 1, lastUpdated: now };
    return { count: (current.count || 0) + 1, lastUpdated: now };
  });
  return { waitId: ref.key };
});

// =============================================================================
// CONDUCTOR SUMMON DRIVERS
// =============================================================================

exports.summonDrivers = functions.https.onCall(async (data, context) => {
  _requireConductor(context);
  const { route, passengerCount } = data;
  _validateRoute(route);
  _validateNumber(passengerCount, 1, 200, "passengerCount");

  const summonRef = await db.ref("summonRequests").push({
    conductorId: context.auth.uid,
    route,
    passengerCount,
    timestamp: Date.now(),
    status: "pending",
    respondedDrivers: {},
  });

  await db.ref(`summons/${route}`).set({
    count: passengerCount,
    timestamp: Date.now(),
    conductorId: context.auth.uid,
  });

  await messaging.send({
    topic: `drivers_${route}`,
    notification: {
      title: "🚨 PASSENGERS WAITING!",
      body: `${passengerCount} passenger(s) need a taxi to ${ROUTES[route]}. Respond now.`,
    },
    data: { type: "SUMMON_DRIVER", summonId: summonRef.key, route, passengerCount: String(passengerCount) },
    android: { priority: "high" },
    apns: { payload: { aps: { sound: "default", contentAvailable: true } } },
  }).catch(() => {});
  return { summonId: summonRef.key };
});

// =============================================================================
// TRIGGERS
// =============================================================================

exports.onTaxiStatusChange = functions.database.ref("/taxis/{taxiId}/status").onUpdate(async (change, context) => {
  const newStatus = change.after.val();
  const oldStatus = change.before.val();
  if (newStatus === oldStatus) return;

  const taxiSnap = await db.ref(`taxis/${context.params.taxiId}`).once("value");
  const taxi = taxiSnap.val();
  if (!taxi) return;

  if (newStatus === "departed") {
    const assignedSnap = await db.ref("waitingPassengers").orderByChild("assignedTaxiId").equalTo(context.params.taxiId).once("value");
    assignedSnap.forEach((child) => child.ref.remove());
    await db.ref(`history/${context.params.taxiId}`).set({ ...taxi, departedAt: Date.now() });
    await db.ref(`taxis/${context.params.taxiId}`).remove();
  }

  const messages = {
    full: { title: "🔥 Taxi Almost Gone!", body: `${taxi.driverName}'s taxi to ${ROUTES[taxi.route]} is FULL.` },
    departed: { title: "🚌 Taxi Departed", body: `${taxi.driverName}'s taxi to ${ROUTES[taxi.route]} has left.` },
    breakdown: { title: "⚠️ Taxi Breakdown", body: `${taxi.driverName}'s taxi to ${ROUTES[taxi.route]} has broken down.` },
  };
  const msg = messages[newStatus];
  if (msg) {
    await messaging.send({
      topic: `passengers_${taxi.route}`,
      notification: msg,
      data: { type: `TAXI_${newStatus.toUpperCase()}`, route: taxi.route, taxiId: context.params.taxiId },
    }).catch(() => {});
  }
  if (newStatus === "breakdown") {
    await _notifyConductor({
      title: "⚠️ Taxi Breakdown!",
      body: `${taxi.driverName}'s taxi to ${ROUTES[taxi.route]} has broken down.`,
      data: { type: "TAXI_BREAKDOWN", route: taxi.route, taxiId: context.params.taxiId },
    });
  }
});

// =============================================================================
// SCHEDULED CLEANUP
// =============================================================================

exports.cleanupStaleSignals = functions.pubsub.schedule("every 4 hours").onRun(async () => {
  const cutoff = Date.now() - 4 * 60 * 60 * 1000;
  const snap = await db.ref("waitingPassengers").orderByChild("timestamp").endAt(cutoff).once("value");
  const updates = {};
  snap.forEach((child) => { updates[child.key] = null; });
  if (Object.keys(updates).length > 0) {
    await db.ref("waitingPassengers").update(updates);
  }
});

exports.cleanupStaleTaxis = functions.pubsub.schedule("every 30 minutes").onRun(async () => {
  const cutoff = Date.now() - 45 * 60 * 1000;
  const snap = await db.ref("taxis").orderByChild("lastUpdated").endAt(cutoff).once("value");
  const removals = [];
  snap.forEach((child) => removals.push(child.ref.remove()));
  await Promise.all(removals);
});

// =============================================================================
// HELPERS
// =============================================================================

function _requireAuth(context) {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Sign in required.");
}
function _requireDriver(context) {
  _requireAuth(context);
  if (!context.auth.token.isDriver) throw new functions.https.HttpsError("permission-denied", "Drivers only.");
}
function _requireConductor(context) {
  _requireAuth(context);
  if (!context.auth.token.isConductor) throw new functions.https.HttpsError("permission-denied", "Conductors only.");
}
function _validateRoute(route) {
  if (!["SUN_CITY", "RUSTENBURG"].includes(route)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid route.");
  }
}
function _validateNumber(val, min, max, name) {
  if (typeof val !== "number" || val < min || val > max) {
    throw new functions.https.HttpsError("invalid-argument", `${name} must be between ${min} and ${max}.`);
  }
}
function _slug(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 40) || "user";
}
async function _notifyConductor({ title, body, data }) {
  const conductorsSnap = await db.ref("conductors").once("value");
  const tokens = [];
  conductorsSnap.forEach((child) => {
    const token = child.val()?.fcmToken;
    if (token) tokens.push(token);
  });
  if (!tokens.length) return;
  await messaging.sendEachForMulticast({
    tokens,
    notification: { title, body },
    data,
    android: { priority: "high" }
  }).catch(() => {});
}
