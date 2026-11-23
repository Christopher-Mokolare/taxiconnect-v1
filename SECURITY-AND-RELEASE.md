# TaxiConnect V1 security and release gates

## Security and product changes in this branch

- Staff sign-in uses individual Firebase Authentication email/password accounts.
- Driver and conductor permissions are server-assigned Firebase custom claims. The browser cannot grant itself a role.
- An Admin SDK provisioning utility assigns staff roles using Application Default Credentials.
- Realtime Database rules independently verify the required driver or conductor custom claim and record ownership for every write.
- Passenger waiting-signal cancellation is scoped to the authenticated passenger UID.
- Passengers can restore their active waiting signal after refreshing the page.
- Drivers can restore their active taxi session after refreshing the page.
- The destructive whole-database deletion callable and unused phone pre-approval endpoint have been removed.
- Conductors can assign waiting groups only to active taxis on the same route with enough remaining seats; assignment state is visible to the passenger.
- If a taxi is marked broken down or removed, its assigned waiting groups are returned to the waiting queue.
- Drivers cannot delete taxi records directly. Going offline marks the taxi unavailable, and the conductor can return affected assignments to the queue without losing passenger signals.
- Passengers subscribe to their assigned taxi status and see when the taxi becomes unavailable.
- GitHub Actions validates configuration and browser scripts, runs application smoke tests, and exercises database authorization in the Firebase Emulator Suite.

## Current development setup

- The TaxiConnect-Dev Web App configuration is committed in `public/firebase-config.js`.
- Anonymous and Email/Password Authentication have been enabled in Firebase Console.
- Fake staff accounts and sample taxis can be created with the guarded `npm run seed:test` utility. It only targets `taxiconnect-dev` and requires explicit opt-in plus a temporary password.

## Required before production release

1. Configure and verify the separate production Firebase project; do not reuse development test data.
2. Enable and verify the required Authentication providers in that production project.
3. Create authorized staff accounts and assign their custom claims using the Admin SDK provisioning utility.
4. Review and test Realtime Database rules using the Firebase Emulator Suite.
5. Confirm the intended Firebase project, database instance and region before deployment.
6. Confirm the project remains on the intended Firebase plan and review current Hosting, Authentication and Realtime Database quotas.
7. Run end-to-end tests against a non-production Firebase project, including passenger signal creation/cancellation, driver go-live/offline, conductor summons/status changes, cleanup and session restoration.
8. Verify manual cleanup controls and operational monitoring; scheduled server-side cleanup is not part of the Spark deployment.

## Product scope

The current V1 web app supports taxi availability and route-demand coordination for Sun City (Sun Village) and Rustenburg (Town), using Realtime Database rules as the server-side access boundary. Online payments, fare settlement, passenger SMS verification, driver KYC, GPS turn-by-turn navigation and a full trip-booking marketplace are not included in this V1 web release.

## Deployment safety

CI deliberately does not deploy Firebase resources. Deployment requires explicit review of the Firebase project, client configuration, auth providers, database rules and billing plan. Never commit service-account keys, private credentials or staff passwords.
