# TaxiConnect V1 deployment

This branch reconstructs the V1 Firebase Hosting + Realtime Database + Cloud Functions web deployment. It preserves the V1 Firebase architecture and does not migrate the app to V2.

## Required setup before deployment

1. Confirm the Firebase project is `taxiconnect-dev`.
2. In Firebase Console > Project settings > Your apps, copy the Web App configuration into `public/firebase-config.js`. The committed values are placeholders; web clients cannot authenticate until configured.
3. Configure `DRIVER_PIN` and `CONDUCTOR_PIN` as Cloud Functions runtime environment values/secrets. Never commit PINs or service-account credentials.
4. Enable Anonymous Authentication in Firebase Authentication.
5. Confirm Realtime Database exists and review `database.rules.json` for data privacy and access requirements.
6. Confirm billing/plan and region requirements for scheduled and callable Cloud Functions.

## Local validation

```bash
cd functions
npm install
npm run check
cd ..
node -e "for (const f of ['firebase.json','.firebaserc','database.rules.json']) JSON.parse(require('fs').readFileSync(f,'utf8'))"
```

## Manual deployment (requires explicit approval)

Install Firebase CLI and authenticate, then:

```bash
firebase use taxiconnect-dev
firebase deploy --only functions,database,hosting
```

Do not deploy until Firebase client config, secrets, authentication providers, database instance and rules have been verified. This repository does not automatically deploy Firebase resources.

## Known blockers

- The archived Flutter folder is incomplete: it has no `pubspec.yaml`, `main.dart`, platform runners, and several imported widgets are absent. It is not a buildable mobile app and is not included in this deployment.
- The archived Flutter model uses `village`, `destination`, `destinationCategory`, and `seatsAvailable`; the restored web app/Functions use `route`, `capacity`, and `passengersOnboard`. These contracts must not be mixed.
- The web Firebase config is a template until real Firebase Web App values are supplied.
- A full security review and Firebase Emulator integration test are still required before production release.
