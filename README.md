# TaxiConnect V1

TaxiConnect V1 is a Firebase-based taxi coordination web application for the Sun City (Sun Village) and Rustenburg (Town) routes. This V1 repository is kept separate from TaxiConnect V2.

## Web application

- Passenger web app: `/passenger.html`
- Driver web app: `/driver.html`
- Conductor dashboard: `/conductor.html`
- Public role selector: `/`

## Project structure

- `public/` — responsive role-based web application and Firebase client configuration.
- `public/js/app-common.js` — shared route labels, time formatting and safe text rendering.
- `functions/` — Firebase callable and scheduled Cloud Functions.
- `database.rules.json` — Realtime Database security rules.
- `scripts/validate.js` — repository, configuration and browser-script validation.
- `archive/flutter-app/` and `backup_*/` — historical source retained for reference, not part of the active web deployment.

## Core workflows

- Passengers see live taxi availability, send a waiting signal and cancel their own signal.
- Drivers sign in, go live with capacity and onboard counts, update occupancy, respond to conductor summons and go offline.
- Conductors monitor live supply and demand, summon drivers, manage taxi status and remove stale waiting records.

## Getting started

1. Configure the Firebase Web App values in `public/firebase-config.js`.
2. Enable Firebase Anonymous and Email/Password Authentication for passenger sessions.
3. Create staff email/password accounts and assign driver/conductor custom claims using the provisioning utility in `functions/scripts/`.
4. Review `database.rules.json`.
5. Follow [DEPLOYMENT.md](DEPLOYMENT.md).

**Current release status:** code and CI validation are in progress. Live Firebase configuration and non-production end-to-end verification are still required. Cloud Functions deployment requires Firebase Blaze billing; see [DEPLOYMENT.md](DEPLOYMENT.md).
