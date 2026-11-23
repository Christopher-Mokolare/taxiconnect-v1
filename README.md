# TaxiConnect V1

TaxiConnect V1 is a Firebase-based taxi coordination web application for the Sun City (Sun Village) and Rustenburg (Town) routes. It is kept separate from TaxiConnect V2 and is designed for Firebase's Spark plan.

## Web application

- Passenger web app: `/passenger.html`
- Driver web app: `/driver.html`
- Conductor dashboard: `/conductor.html`
- Public role selector: `/`

## Core workflows

- Passengers see live taxi availability, send a waiting signal and cancel their own signal.
- Drivers sign in with individual staff accounts, go live, share available seats, update passenger counts, receive route summons and go offline.
- Conductors monitor live supply and demand, summon drivers, manage taxi status and clean stale records.
- Passenger and driver sessions restore their active waiting/taxi state after a page refresh.

## Architecture

The active web application uses Firebase Hosting, Firebase Authentication and Realtime Database. Browser actions write to Realtime Database directly, with role and ownership checks enforced by `database.rules.json`. The active Firebase deployment has only `database` and `hosting` targets; it does not deploy Cloud Functions or require a Blaze upgrade.

Staff roles are assigned with the Admin SDK provisioning utility in `functions/scripts/provision-staff.js`. The old `functions/index.js` callable implementation is retained for reference only and is not deployed.

## Project structure

- `public/` — responsive role-based web application and Firebase client configuration.
- `public/js/app-common.js` — shared route labels, time formatting and safe text rendering.
- `database.rules.json` — Realtime Database security rules.
- `scripts/validate.js` — repository, configuration and browser-script validation.
- `tests/app.test.js` — Node smoke tests for routes, auth wiring and database security boundaries.
- `scripts/test-database-rules.js` — Firebase Realtime Database Emulator authorization tests.
- `functions/scripts/provision-staff.js` — local Admin SDK utility for assigning staff roles.
- `archive/flutter-app/` and `backup_*/` — historical source retained for reference, not part of the active web deployment.

## Getting started

Follow [DEPLOYMENT.md](DEPLOYMENT.md) to configure Firebase, enable the required Authentication providers, provision staff roles and deploy Hosting plus Realtime Database rules.

**Release status:** the application code and CI validation are implemented. The actual Firebase Web App configuration, staff accounts, role claims, deployed rules and live end-to-end acceptance still need to be completed in the Firebase project.
