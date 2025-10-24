# Offline & Large-Data QA Checklist

Use this guide when validating new releases. It focuses on scenarios that are easy to miss during regular development.

## Offline behaviour
- [ ] Visit the app once online to allow the service worker to cache the shell.
- [ ] Switch the browser to offline mode (DevTools → Network → Offline) and refresh.
- [ ] Verify routing still works (Dashboard → Habits → Reports → Settings).
- [ ] Create, edit, and delete habits/logs while offline; confirm data persists after a reload.
- [ ] Re-enable the network and ensure the UI continues to operate without errors.

## IndexedDB stress test
- [ ] Programmatically seed 500+ habits and 10k+ logs (use DevSeedService or temporary script).
- [ ] Confirm dashboard and reports load within an acceptable time (<2s target).
- [ ] Check memory usage in DevTools; watch for excessive GC churn.
- [ ] Scroll through habit list and detail views to ensure no jank.

## Reminders & notifications
- [ ] With notifications granted, schedule reminders for multiple habits.
- [ ] Confirm preview notification fires immediately after enabling.
- [ ] Close the tab; ensure reminders still appear at scheduled times (service worker).
- [ ] Disable reminders from Settings and verify notifications stop.

## PWA install & updates
- [ ] Install the PWA on desktop/mobile.
- [ ] Launch from home screen; confirm splash and theme colours match branding.
- [ ] Trigger an application update (e.g., change version) and ensure the SW picks it up.
- [ ] Validate export/import workflows inside the PWA shell.

## Accessibility spot checks
- [ ] Run Lighthouse/axe scans for accessibility issues.
- [ ] Navigate key screens using keyboard only (Tab/Shift+Tab/Enter/Space).
- [ ] Use a screen reader (NVDA/VoiceOver) to walk through the dashboard tips modal.
- [ ] Confirm focus is returned appropriately after closing modals/overlays.

Record any issues in the tracker and link screenshots or HAR files when possible.
