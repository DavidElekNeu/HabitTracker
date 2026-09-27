# Android Widgets

This project now ships six Android home-screen widgets with a shared native snapshot store and a Capacitor bridge.

## Widget types

- Today habits (`TodayHabitsWidgetProvider`)
- Daily progress (`DailyProgressWidgetProvider`)
- Streak (`StreakWidgetProvider`)
- Single habit focus (`SingleHabitFocusWidgetProvider`)
- Weekly consistency (`WeeklyConsistencyWidgetProvider`)
- Quick add (`QuickAddWidgetProvider`)

## Data flow

1. Once habits and logs have loaded, Angular builds a unified snapshot in `AndroidWidgetSyncService`, including habit schedules and dated log values.
2. `HabitWidgets` Capacitor plugin writes it into native `SharedPreferences`.
3. Native widget providers rebuild the current day's progress, focus, streak and weekly history from persisted data before rendering `RemoteViews`.
4. Android refreshes every 30 minutes and schedules a local-midnight refresh. Boot, clock/timezone changes, app upgrades and widget taps also refresh all widgets. Inexact alarms can be delayed by Android power management.
5. Widget button taps update native dated logs immediately and enqueue an idempotent final value with a unique ID and the original local day.
6. On app foreground/focus or data changes, Angular imports queued values and acknowledges them only alongside a successful snapshot write. New taps arriving during import are preserved and overlaid on the incoming snapshot.

Open the upgraded app once to seed the native habit/log source. Thereafter widgets can refresh across day/week/month boundaries while the app is closed. Force-stopping the app in Android settings suspends its alarms until it is opened again.

## Daily lessons

- `src/assets/daily-lessons.json` contains all 120 Hungarian lessons in their supplied order, including source attribution. Regenerate it with `node scripts/import-daily-lessons.mjs <markdown-path>`.
- Android's `DailyLessonReceiver` schedules one inexact, idle-capable alarm around 15:00 local time and renews it after delivery. It restores scheduling after reboot, upgrades and clock/timezone changes, without requiring the WebView or exact-alarm permission.
- The existing motivational-mode setting enables/disables delivery. Android notification permission and channel preferences are respected. Old one-shot daily alarms are cancelled during migration; habit reminders are left intact.
- Each notification has the lesson title, a brief collapsed preview, the full text split into readable paragraphs when expanded, a day counter and a source-link action.
- The collection repeats after lesson 120. The document is content input, not an instruction to generate or fetch new material at runtime.
- A persisted day guard prevents duplicate daily delivery. Delayed overnight alarms do not produce a backlog. Notification permission/channel denial does not advance the lesson index.

## Verification

- `gradlew.bat :app:testDebugUnitTest :app:assembleDebug`: midnight rollover, weekday schedules, weekly/monthly completion, idempotent dated values, locks, quick-add reset, DST/year boundaries and lesson scheduling.
- On a disposable emulator, grant notification permission and run `gradlew.bat :app:connectedDebugAndroidTest`: pending-action acknowledgement/merge and actual expanded Hungarian notification rendering, duplicate prevention, restart scheduling and cancellation.
- `npm run test:ci -- --include=src/app/core/services/android-widget-sync.service.spec.ts`: original-day import, idempotent replay and storage failure propagation.

Use the `:app:` prefix for device tests: the generated Cordova dependency's own Android test fixture currently has conflicting Kotlin standard-library versions, independent of the app's passing tests.

## Core files

- Native plugin: `android/app/src/main/java/com/davidelek/striveup/HabitWidgetsPlugin.java`
- Snapshot/action store: `android/app/src/main/java/com/davidelek/striveup/WidgetStore.java`
- Interaction receiver: `android/app/src/main/java/com/davidelek/striveup/WidgetActionReceiver.java`
- Widget refresh dispatcher: `android/app/src/main/java/com/davidelek/striveup/WidgetUpdater.java`
- Angular sync service: `src/app/core/services/android-widget-sync.service.ts`
- Angular plugin contract: `src/app/core/plugins/habit-widgets.plugin.ts`
