# TaxiConnect rural pilot — Mabeskraal

## Product intent

TaxiConnect is a coordination tool for existing local taxi operators. It is not a ride-hailing operator and does not dispatch vehicles automatically. The driver or authorised operator decides when a vehicle departs.

## Pilot scope

- Begin with one locally verified route and two or three participating drivers.
- Confirm the route, destinations, actual pickup points, service days, operating times, vehicle capacities and fares with drivers and the relevant taxi association before enabling it for real passengers.
- Do not treat the existing Sun City and Rustenburg sample routes as verified Mabeskraal services.
- Cash remains supported. No in-app payment or compulsory booking is required.
- No continuous GPS tracking.
- No WhatsApp, SMS or USSD integration in the first pilot.

## Passenger flow

1. Select a destination/route.
2. Enter a recognisable pickup point (do not enter a home address or another person's personal details).
3. Select the number of people waiting.
4. Submit the request. A request is tied to the passenger's anonymous Firebase UID.
5. A passenger may have one active request at a time. Requests expire after 45 minutes; the passenger can cancel earlier.
6. If the device is offline, the request is saved in IndexedDB and clearly labelled as **not sent**. It is published only after connectivity returns and the user is still authenticated.

## Driver and operator flow

- Drivers publish a taxi's operational status (loading/full) independently of connection presence.
- Each driver browser session registers its own Realtime Database connection record and a server-side onDisconnect removal.
- A lost phone connection does not change the taxi's operational status.
- A 30-second heartbeat refreshes the connection lease. Other screens treat the vehicle as unverified after three minutes without a fresh heartbeat; Firebase `onDisconnect` normally removes the session sooner when the server detects a lost connection.
- Drivers receive only aggregated demand summaries by route and pickup point. They do not receive passenger names or passenger UIDs through the demand summary.
- The operator/dispatcher workspace can be run by an association representative, rank coordinator or fleet owner; an onboard conductor is not required. It can view individual waiting requests and coordinate assignments.

## Status meanings

- **Loading** — accepting passengers.
- **Full** — passenger capacity reached.
- **Departed** — vehicle has left; the operator closes its live record into history.
- **Connection lost** — no current connection session is confirmed. This is a derived display state, not a taxi operational status.
- **Offline** — driver explicitly stopped operating.
- **Breakdown** — operator reported the vehicle cannot continue.

## Connectivity and data use

- Realtime Database web writes are not treated as durable offline storage.
- Passenger waiting requests are first persisted to IndexedDB before network submission.
- The app retries queued requests when the browser reports connectivity, and the passenger sees whether a request is local/pending or confirmed by the server.
- Taxi connection presence uses separate records so intermittent signal does not erase loading/full/departed status.
- The UI shows the last confirmed update for unverified taxis.
- No background GPS polling or map tiles are required for the pilot.

## Security and privacy

- Passengers can read taxi availability and their own waiting request, but not the waiting-passenger collection or aggregated operator data.
- Drivers can read aggregated demand and their own taxi record; they cannot read passenger identities.
- Conductors can coordinate the waiting queue and publish aggregated route-demand summaries.
- Pickup-point text is limited to 80 characters. Do not collect precise residential addresses.
- Anonymous authentication is used for passenger request ownership; it is not proof of a passenger's real-world identity.

## Operational limitations to resolve before a live pilot

- An authorised operator/dispatcher account must be online to publish updated aggregated demand summaries in this Spark-only version. This role can belong to an association representative or fleet owner rather than a vehicle conductor. If no operator dashboard is active, drivers may see the last summary until it expires.
- Expired waiting records are removed by operator cleanup; all displays independently exclude expired requests.
- IndexedDB is browser/device-specific. A queued request cannot be recovered on another device or after browser data is cleared.
- WhatsApp, SMS, USSD, scheduled departure feeds and native Android offline persistence are future integrations, not part of this pilot.
- The exact Mabeskraal routes and pickup points are intentionally not preconfigured until locally verified.

## Acceptance checks

1. A driver goes live; passenger and conductor screens receive the taxi record.
2. Passenger and conductor see the taxi as unverified after its connection session disappears, without its operational status being rewritten to offline.
3. Reconnecting a driver restores connection presence.
4. A passenger can create, cancel and restore one active waiting request.
5. A request saved offline survives a page reload and is sent after reconnecting, without creating duplicates.
6. Expired assignments do not reserve seats on a taxi.
7. The conductor sees waiting counts grouped by pickup point.
8. The driver sees only the aggregated counts and pickup-point labels.
9. Expired requests disappear from demand and cannot be assigned.
10. A taxi with lost connectivity is not offered for a new assignment.
11. The development CI emulator verifies the database permission boundaries.

## Deployment boundary

All changes are intended for the TaxiConnect development Firebase project. Merge and deployment remain separate approval steps. Do not deploy to or modify production as part of this pilot.
