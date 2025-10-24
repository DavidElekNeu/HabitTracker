# Testing & QA Guide

## Unit tests
- Run `npm test` for watch mode, `npm run test:ci` for headless Chromium (`ChromeHeadless`).
- Coverage focus areas:
  - Services: habits/logs/reminders/analytics/data-transfer/sync.
  - Shared components: dashboard cards, reports visuals, onboarding overlay (use shallow component tests).

## Suggested new suites
- **ReminderService:** stub `navigator.serviceWorker`/`Notification` to verify scheduling fallback logic.
- **Onboarding overlay:** assert focus trap behaviour and dismissal events.
- **Reports view model:** test filter combinatorics by instantiating component harness with mock services.

## E2E roadmap
- Adopt Playwright or Cypress to cover:
  1. Create habit → log updates streak → reports reflect new data.
  2. Reminder permission + settings toggles.
  3. Export JSON, clear data, import JSON.
  4. Offline session (service worker), including reload while offline.
- Headless run should seed DB via DevSeedService before scenarios.

## Performance & offline checks
- Automated Lighthouse (`npm run lh` suggested future script) targeting PWA score ≥ 90.
- Use Playwright’s `browserContext.route` to simulate offline and large data sets (seed 500 habits/10k logs).

## CI recommendations
- Enforce `npm run lint`, `npm run test:ci`, and Lighthouse budgets on pull requests.
- Cache Angular build output between runs; record screenshot/video artifacts for failed E2E steps.
