# Functions directory

The active TaxiConnect V1 web application is Spark-compatible and does **not** deploy Cloud Functions. Browser workflows write to Firebase Realtime Database directly, and `database.rules.json` enforces passenger, driver and conductor permissions.

- `scripts/provision-staff.js` is an administrative local utility that assigns Firebase custom claims to staff accounts using Application Default Credentials.
- `index.js` is retained as a historical callable-backend reference. It is not listed in `firebase.json` and is not part of the active deployment.
- Do not run `firebase deploy --only functions` for the Spark-compatible V1 release.
