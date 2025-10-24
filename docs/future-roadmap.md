# Future Roadmap & Testing Plan

## Sync architecture considerations
- **Optional cloud backup:** introduce a SyncService that pushes exports to user-selected storage (Drive, Dropbox, WebDAV). Use background sync when online, fall back to manual export.
- **Conflict resolution:** rely on `updatedAt` timestamps and habit/log UUIDs. Present merge UI when conflicts appear.
- **Encryption at rest:** offer passphrase-based encryption layer before uplink.

## Strategy framework ideas
- **Implementation intentions library:** suggest proven templates for common obstacles.
- **Habit stacking catalogue:** curate anchors for common routines (wake-up, meals, commute).
- **Accountability partner flow:** share streak summaries with trusted contacts (opt-in, privacy-first).

## Gamification & AI coach
- **Badges and streak celebrations:** milestone badges for streak lengths, completion streak, consistency score.
- **Weekly digest:** generate lightweight insights and send via push/email.
- **AI encouragement (opt-in):** use LLM API to craft motivational nudges based on progress; keep data local unless user consents.

## Release notes / update workflow
- Maintain `docs/release-notes.md` with versioned bullet points.
- When service worker updates, show “What’s new” toast linking to latest notes.
- Include update banner dismissible state in local storage.

## Testing roadmap
- **Unit tests:** expand coverage for analytics, reminders, strategy form builders, export/import.
- **E2E tests:** Cypress-style journeys covering habit creation, logging, reminder toggling, export/import.
- **Performance tests:** scripted Lighthouse runs for PWA scores.
- **Regression suite:** nightly offline simulation via Playwright (network offline) plus IndexedDB volume seeding.

Track progress in the project board and revisit quarterly.
