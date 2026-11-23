# TaxiConnect V1 security and release gates

## Security and product changes in this branch

- Staff sign-in uses individual Firebase Authentication email/password accounts.
- Driver and conductor permissions are server-assigned Firebase custom claims. The browser cannot grant itself a role.
- An Admin SDK provisioning utility assigns staff roles using Application Default Credentials.
- Backend callables independently verify the required driver or conductor claim.
- Passenger waiting-signal cancellation is scoped to the authenticated passenger UID.
- Passengers can restore their active waiting signal after refreshing the page.
- Drivers can restore their active taxi session after refreshing the page.
- The destructive whole-database deletion callable and unused phone pre-approval endpoint have been removed.
- Conductor actions are scoped to individual taxis and waiting signals.
- GitHub Actions validates configuration, browser scripts, backend callable contracts and application smoke tests.

## Required before production release

1. Replace placeholder Firebase Web App values in `public/firebase-config.js` with the configuration from the intended V1 Firebase project.
2. Enable Anonymous and Email/Password Authentication.
3. Create individual staff accounts and assign their custom claims using the Admin SDK provisioning utility.
4. Review and test Realtime Database rules using the Firebase Emulator Suite.
5. Confirm the intended Firebase project, database instance and region before deployment.
6. Confirm the Firebase Blaze billing requirement for Cloud Functions and set budget alerts before enabling billing.
7. Run end-to-end tests against a non-production Firebase project, including passenger signal creation/cancellation, driver go-live/offline, conductor summons/status changes, and session restoration.
8. Verify scheduled cleanup functions and operational monitoring.

## Product scope

The current V1 web app supports taxi availability and route-demand coordination for Sun City (Sun Village) and Rustenburg (Town). Online payments, fare settlement, passenger SMS verification, driver KYC, GPS turn-by-turn navigation and a full trip-booking marketplace are not included in this V1 web release.

## Deployment safety

CI deliberately does not deploy Firebase resources. Deployment requires explicit review of the Firebase project, client configuration, auth providers, database rules and billing plan. Never commit service-account keys, private credentials or staff passwords.
