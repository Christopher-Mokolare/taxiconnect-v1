# TaxiConnect V1 — Legacy Archive

**Status: ARCHIVED — reference only. Not for production deployment.**

This repository contains the historical TaxiConnect Flutter application,
Firebase backend snapshots, and early web implementation.

## Contents

- `archive/flutter-app/` — archived Flutter application.
- `backup_20260909_132122/` — historical Firebase Functions, database rules,
  and early web application.
- `backup_*` directories — historical Firebase and early-web implementation
  snapshots from September 2026.

## Important compatibility warning

The legacy application uses a data model based on:

- `village`
- `destination`
- `destinationCategory`
- `seatsAvailable`

The later TaxiConnect platform uses a route-first model with concepts such as
routes, capacity, passengers onboard, trips, and dispatch.

These models are not interchangeable.

**Do not connect this archived application to a newer TaxiConnect database
or production environment without a separately reviewed migration.**

## Development guidance

This repository is preserved for historical reference and recovery.

- Do not extend it as the active TaxiConnect product.
- Do not deploy its Firebase Functions or database rules.
- Do not assume historical credentials or Firebase configuration are valid.
- Do not copy its schema or authentication assumptions into a newer version
  without reviewing compatibility.

## Project separation

The newer Cloudflare Workers, D1, Durable Objects, and PWA implementation
belongs in the separate TaxiConnect V2 repository.
