# TaxiConnect V1 security and release gates

## Changes already applied on the product-completion branch

- Removed the callable `clearAllData` endpoint. A fixed confirmation string is not an acceptable safeguard for deleting operational data.
- Fixed the passenger cancellation button to call the implemented `cancelWaiting` function and to restore the waiting button after a successful cancellation.
- Added automated repository validation and CI checks for JSON configuration, required application files, inline browser JavaScript syntax, and the removed destructive endpoint.

## Release blockers that require environment access and verification

1. Replace the placeholder web configuration in `public/firebase-config.js` using the Firebase Web App settings for the intended V1 project.
2. Confirm that Firebase Authentication Anonymous provider is enabled for passenger access and that driver/conductor authentication is provisioned securely.
3. Replace shared driver/conductor PIN authentication with individual, managed identities before public production use. The current shared-PIN callable has no per-identity lifecycle and is not suitable as the final production identity model.
4. Review and test every Realtime Database rule with the Firebase Emulator Suite. Admin SDK Cloud Functions bypass database rules, so callable authorization must be independently tested.
5. Add rate limiting / abuse controls to callable authentication and passenger demand signaling.
6. Verify FCM web push configuration and service-worker support on supported browsers.
7. Verify scheduled Cloud Functions billing/plan requirements and stale-record cleanup behavior.
8. Run end-to-end tests against a non-production Firebase project, then perform a human-reviewed production release.

## Deployment safety

CI deliberately does not deploy Firebase resources. Deployment requires explicit approval after the release gates above are met. Never commit service-account keys, PINs, API secrets, or private credentials.
