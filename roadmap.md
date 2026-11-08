# Voice monetization MVP
- [x] Add atomic thirty-day check-in, calendar and reward balance updates with rule tests.
- [x] Add guest profile, free-coin modal, native sharing and reserved search/call banner slots.
- [ ] Connect real rewarded-video provider with independently verified completion; blocked until provider account and eligible integration exist.
- [x] Verify check-in, repeat-click protection, sharing and mobile layout through the live app.
- [x] Register four one-time test products at the requested prices: vozone_coins_10_brl (100 cents), vozone_coins_20_brl (200 cents), vozone_coins_30_brl (300 cents), vozone_coins_50_brl (500 cents), fixed quantity 1 and personal-use SaaS tax classification.
- [x] Confirm one-time purchases only: confirmed purchased coins add to existing balance, never expire and survive nickname changes. No subscriptions or plan changes. Owner requires Pix only and declined test card checkout.
- [ ] Implement embedded checkout and atomic purchased-coin fulfillment once a Pix-capable integration is connected; the current test account reports Pix unavailable.
- [x] Enable built-in Stripe in test after approval and check Pix availability (account configuration returns pix.available=false for both default configurations; no checkout created).
- [ ] Resolve automatic Pix provider blocker: this test account does not support Pix; do not substitute card payments or static-key confirmation without approval.
- [ ] Implement server-authoritative guest wallet, 100-coin bonus, inactivity cooldown and paid-search debits with regression tests.
- [ ] Enforce paid matchmaking on the server and implement compatible two-person fallback without charging automatic requeue.
- [ ] Add wallet, paid-filter lock, fixed Pix packages and authenticated administration after supported Pix settlement flow is established; do not expose purchases before verified fulfillment exists.
- [x] Require privacy choices worldwide; load optional advertising and measure searches only after explicit acceptance (browser flow and five regression tests verified).
- [x] Add reserved advertisement placements without unconfigured scripts.
- [ ] Verify payment settlement, concurrent debits, free calls, filtered calls and requeue end-to-end.

# Call reliability
- [x] Repair matchmaking and call signaling races.
- [x] Handle microphone permissions, audio playback, disconnects, and cleanup visibly.
- [x] Verify two-person audio, mute, hangup, cancellation, and regression tests (two successive calls with inbound audio packets on both peers; seven tests passed).
- [x] Check availability of a relay for restrictive mobile networks (no existing connection available).
- [x] Enable a TURN relay: Cloudflare TURN credentials issued server-side (1h), verified live.

# Call controls and safety
- [x] Automatically requeue the remaining participant after a peer leaves, preserving their microphone and preferences.
- [x] Enforce mutual location compatibility and verify automatic rematching with regression tests and live calls.
- [x] Suspend the current guest entry after a valid call report; verified warning screen and removal of call controls, with fresh re-entry allowed.
- [x] Add Próximo with a new search and no forced call time limit.
- [x] Ask for a name, own gender and location on every entry; verified fresh form and both call indicators.
- [x] Record reports and enforce temporary entry suspension server-side without accounts or permanent bans.
- [x] Verify reporting, suspension and re-entry through the live UI; 11 regression tests passed.
- [x] Confirm connected audio after the changes on actual devices (sandbox pairs matched, but connected audio was not confirmed; needs device/network test).