# TaxiConnect V1

**Active recovery/development branch:** `feat/v1-deployable-recovery`

TaxiConnect V1 is being restored as a Firebase-based taxi coordination application. Its architecture remains Firebase Hosting, Firebase Authentication, Cloud Functions, and Realtime Database. V1 is kept separate from TaxiConnect V2.

## Project structure

- `public/` — web landing page, conductor dashboard, driver app, passenger app, Firebase client config.
- `functions/` — Firebase Cloud Functions.
- `database.rules.json` — Realtime Database security rules.
- `archive/flutter-app/` — incomplete historical Flutter source, retained for recovery only.
- `backup_*/` — historical snapshots retained for comparison and audit.

## V1 data model boundary

The archived Flutter code uses `village`, `destination`, `destinationCategory`, and `seatsAvailable`. The restored web/Functions code uses `route`, `capacity`, and `passengersOnboard`. These schemas are not interchangeable. Do not connect the archived Flutter client to the web database contract without a reviewed migration.

## Getting started

See [DEPLOYMENT.md](DEPLOYMENT.md) for Firebase project setup, configuration, validation, and manual deployment prerequisites.

**Deployment status:** not yet release-ready. The Firebase web configuration is a placeholder, secrets must be configured, database rules require security review, and the Flutter app is incomplete.
