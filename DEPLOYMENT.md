# TaxiConnect V1 deployment

TaxiConnect V1 is a responsive taxi-coordination web application for the Sun City (Sun Village) and Rustenburg (Town) routes. The active deployment uses Firebase Hosting, Firebase Authentication and Firebase Realtime Database. It is designed to deploy on the Firebase Spark plan without Cloud Functions.

## Application roles

- **Passenger:** view live taxis by route, signal a waiting group, see when a conductor assigns a taxi, restore an active signal after refresh, and cancel their own signal.
- **Driver:** sign in with an individual staff account, publish taxi capacity and passenger count, update occupancy, receive route summons, restore an active taxi after refresh, and go offline. Going offline marks the taxi unavailable without deleting its record; a conductor can return any affected assigned group to the queue.
- **Conductor:** view live taxi and passenger demand, summon drivers, assign available taxis to waiting groups with seat-capacity checks, mark taxis departed or broken down, remove taxis, clear waiting signals and clean stale records.

## Firebase project setup

The repository is configured for Firebase project ID `taxiconnect-dev` in `.firebaserc`. Confirm that this is the intended V1 project before deploying.

1. In Firebase Console, open **Project settings → Your apps** and register or select the V1 Web App.
2. Verify that `public/firebase-config.js` matches the TaxiConnect-Dev Web App. The current branch already contains the supplied development configuration. These browser configuration values identify the Firebase project; do not put service-account keys, admin credentials or staff passwords in this file.
3. Confirm **Anonymous** sign-in and **Email/Password** sign-in are enabled in **Authentication → Sign-in method**. Both were enabled during the current development setup.
4. Confirm that Realtime Database exists in the same project and region. Review `database.rules.json` before publishing it.
5. Create one Firebase Authentication email/password account for each driver and conductor in **Authentication → Users**.
6. Assign each staff account its server-side role using the provisioning utility below.
7. Configure Firebase CLI access for the intended project and verify the selected project with `firebase use`.

## Run the test-data seeder from GitHub Actions

The repository includes a manual workflow at `.github/workflows/seed-test-data.yml`. It is restricted to `taxiconnect-dev`, requires an explicit `yes` confirmation, and never prints the test password or service-account JSON.

Before running it, configure these two **Actions secrets** in GitHub repository Settings → Secrets and variables → Actions:

- `FIREBASE_SERVICE_ACCOUNT_TAXICONNECT_DEV`: the JSON key for a dedicated service account whose `project_id` is exactly `taxiconnect-dev`. Grant only the Firebase Authentication Admin and Realtime Database permissions needed to create test users, assign custom claims and write sample taxi records. Do not commit this JSON or paste it into chat.
- `TAXICONNECT_TEST_PASSWORD`: a temporary password of at least 12 characters for the three fake staff accounts.

Then open **Actions → Seed TaxiConnect development test data → Run workflow**, choose branch `feat/v1-product-completion`, set `confirm_seed` to `yes`, and run it. Review the job logs and summary. The workflow only creates or updates the three `@taxiconnect.test` users and two sample taxi records in the development project.

**GitHub limitation:** GitHub only allows manually dispatching a workflow once its workflow file exists on the repository's default branch. This workflow has been added to the feature branch and its PR; it will become selectable for manual dispatch after the workflow file is merged into the default branch. It does not run automatically and this change does not merge the PR.

## Create the fake test accounts and sample taxis

For development testing only, the repository includes a guarded seeder. It creates `driver1@taxiconnect.test`, `driver2@taxiconnect.test` and `conductor@taxiconnect.test`, assigns their custom claims, and creates two clearly named sample taxis. It refuses to run unless the development project and explicit test-seed confirmation are supplied.

```bash
cd functions
npm ci
TAXICONNECT_ALLOW_TEST_SEED=1 TAXICONNECT_TEST_PASSWORD='use-a-temporary-password-of-at-least-12-characters' npm run seed:test
```

Authenticate with Google Application Default Credentials first. The temporary password is supplied through the environment and is never written to the repository or printed by the script. Passenger test signals are created from the Passenger page through anonymous authentication. Do not use real passenger, driver or conductor information in this environment.

## Provision individual staff identities

The web application uses Firebase Authentication email/password accounts for drivers and conductors. The database rules and browser UI check server-assigned custom claims (`isDriver` or `isConductor`); a user cannot grant themselves a role from the browser.

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

## Spark-compatible architecture

The active application does not call Cloud Functions. Passenger signals, driver taxi records, conductor status changes and route summons are written directly to Realtime Database. `database.rules.json` is the server-side authorization boundary:

- Passenger sessions use Firebase Anonymous Authentication and can create/delete only their own waiting signal.
- Drivers need the `isDriver` custom claim and can create and update only their own taxi record. They cannot delete taxi records; going offline marks the taxi unavailable so assigned passenger requests remain recoverable.
- Conductors can assign a waiting group only to an active taxi on the same route with enough unreserved seats. The passenger's own live waiting record reflects the assignment.
- Conductors need the `isConductor` custom claim and can manage taxis, waiting signals, history and route summons. If a taxi is offline or missing, the conductor can return its assigned groups to the waiting queue.
- Root database reads and writes are denied by default.

The `functions/index.js` file is retained as a historical callable-backend reference and is not deployed. `firebase.json` intentionally contains only `database` and `hosting` targets.

## Local validation

From the repository root:

```bash
cd functions
npm ci
npm install --no-save --no-package-lock @firebase/rules-unit-testing firebase
cd ..
node scripts/validate.js
node --test tests/*.test.js
npx --yes firebase-tools emulators:exec --project taxiconnect-dev --only database "node scripts/test-database-rules.js"
```

The repository CI workflow runs these checks on pushes and pull requests. A green CI result confirms static validation and smoke tests; it does not prove that Firebase credentials, auth providers, rules or live services are configured.

## Deploy

Install the Firebase CLI, authenticate, and verify the target project before deploying:

```bash
bash scripts/deploy.sh
```

This active deployment does not require Cloud Functions or a Blaze upgrade. Firebase Authentication and Realtime Database remain subject to their Spark quotas and product limits. Check current Firebase plan limits before production traffic.

## Operational behaviour and limitations

- Drivers refresh their taxi heartbeat while the driver page is open. The conductor can remove waiting signals older than four hours and taxis with no heartbeat for 45 minutes.
- Driver summons are delivered through a live Realtime Database listener while the driver app is open. Browser notifications require notification permission.
- There is no server-side scheduled cleanup on Spark; cleanup is a conductor action.
- The archived Flutter folder is incomplete and is not part of this web deployment.
- The archived Flutter model uses `village`, `destination`, `destinationCategory`, and `seatsAvailable`. The V1 web model uses `route`, `capacity`, and `passengersOnboard`. Do not mix the schemas without a reviewed migration.
- Online payments, fare settlement, passenger SMS verification, driver KYC and GPS turn-by-turn navigation are not included in this V1 web application.
- A live deployment and end-to-end acceptance test remain necessary before describing the product as production-ready.
