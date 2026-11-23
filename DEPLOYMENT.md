# TaxiConnect V1 deployment

TaxiConnect V1 is a responsive web application for coordinating taxi availability on the Sun City (Sun Village) and Rustenburg (Town) routes. It uses Firebase Hosting, Firebase Authentication, Realtime Database and Cloud Functions.

## Application roles

- **Passenger:** view live taxis by route, signal a waiting group, restore an active waiting signal after refresh, and cancel their own signal.
- **Driver:** sign in, publish taxi capacity and passenger count, update passenger count, receive route summons, and go offline.
- **Conductor:** view live taxi and passenger demand, summon drivers, mark taxis departed or broken down, remove taxis, dismiss waiting signals and clean stale waiting records.

## Firebase project setup

The repository is configured for Firebase project ID `taxiconnect-dev` in `.firebaserc`. Confirm that this is the intended V1 project before deploying.

1. In Firebase Console, open **Project settings → Your apps** and register or select the V1 Web App.
2. Copy its Web App configuration into `public/firebase-config.js`. Replace all three placeholders: `apiKey`, `messagingSenderId`, and `appId`. These browser configuration values identify the Firebase project; do not put service-account keys or staff PINs in this file.
3. In **Authentication → Sign-in method**, enable **Anonymous** sign-in for passengers and **Email/Password** sign-in for staff.
4. Confirm that Realtime Database exists in the same project and region. Review `database.rules.json` before publishing it.
5. Create one Firebase Authentication email/password account for each driver and conductor in **Authentication → Users**.
6. Assign each staff account its server-side role using the provisioning utility below. Never grant staff roles from browser code.
7. Configure Firebase CLI access for the intended project and verify the selected project with `firebase use`.

## Provision individual staff identities

The web application uses Firebase Authentication email/password accounts for drivers and conductors. The backend checks server-assigned custom claims (`isDriver` or `isConductor`); a user cannot grant themselves a role from the browser.

Create the account in Firebase Console → Authentication → Users, then run the role utility from the repository:

```bash
gcloud auth application-default login
gcloud config set project taxiconnect-dev
cd functions
npm ci
npm run provision:staff -- driver@example.com driver
npm run provision:staff -- conductor@example.com conductor
```

Replace the example email addresses with the actual staff accounts. The utility uses Firebase Admin SDK Application Default Credentials and preserves other custom claims while setting the selected TaxiConnect role. Staff must sign out and sign in again after a role change so their ID token refreshes.

Do not expose a role-provisioning callable to ordinary clients. Keep administrator credentials out of the repository.

## Billing and free-tier implications

Firebase Hosting, Authentication, and Realtime Database have no-cost quotas, subject to their current plan limits. **Deploying Cloud Functions requires the Blaze plan and a linked Cloud Billing account**, even though Cloud Functions has a monthly no-cost usage allowance. A billing account is therefore required to deploy this backend; usage above no-cost quotas can incur charges. Set a budget alert before enabling production traffic.

The scheduled cleanup functions also depend on scheduled-function infrastructure. Review the Firebase plan and Cloud Scheduler billing requirements before deployment. The app can be developed and checked locally with Firebase Emulator Suite without deploying live functions.

## Local validation

From the repository root:

```bash
cd functions
npm ci
npm run check
cd ..
node scripts/validate.js
```

The repository CI workflow runs these checks on pushes and pull requests. A green CI result confirms static validation and syntax; it does not prove that Firebase credentials, authentication providers, rules, or live services are configured.

## Deploy after release gates pass

Install the Firebase CLI, authenticate, and verify the target project before deploying:

```bash
firebase use taxiconnect-dev
firebase deploy --only database,functions,hosting
```

Do not deploy until the Web App configuration, Anonymous Authentication, staff secrets, database instance, rules, billing plan, and non-production end-to-end tests have all been verified. This repository intentionally does not auto-deploy Firebase resources.

## Known scope boundaries

- The archived Flutter folder is incomplete and is not part of this web deployment.
- The archived Flutter model uses `village`, `destination`, `destinationCategory`, and `seatsAvailable`. The V1 web/Functions model uses `route`, `capacity`, and `passengersOnboard`. Do not mix the schemas without a reviewed migration.
- Online payment collection, fare settlement, GPS turn-by-turn tracking, driver identity/KYC verification, and passenger SMS verification are not implemented in this V1 web application.
- A live deployment and end-to-end acceptance test remain necessary before describing the product as production-ready.
