package com.davidelek.striveup;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

public class SingleHabitFocusWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        WidgetRefreshReceiver.scheduleNextRefresh(context);
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    private void updateWidget(Context context, AppWidgetManager manager, int appWidgetId) {
        JSONObject snapshot = WidgetStore.readSnapshot(context);
        boolean stale = WidgetStore.isSnapshotStaleForToday(snapshot);
        JSONArray focusHabits = snapshot.optJSONArray("focusHabits");
        int selectedHabitId = WidgetStore.readFocusedHabitId(context);
        JSONObject selected = findFocusHabitById(focusHabits, selectedHabitId);

        if (selectedHabitId > 0 && selected == null) {
            WidgetStore.clearFocusedHabitId(context);
        }

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_single_habit_focus);
        views.setTextViewText(R.id.widget_focus_title, WidgetText.get(snapshot, "Egy szokás fókuszban", "Single habit focus"));

        views.setOnClickPendingIntent(
            R.id.widget_focus_root,
            WidgetIntentFactory.openApp(context, 13000 + appWidgetId)
        );

        if (stale) {
            views.setTextViewText(R.id.widget_focus_change, WidgetText.get(snapshot, "Megnyitás", "Open"));
            views.setTextViewText(R.id.widget_focus_icon, "\u25CF");
            views.setTextViewText(R.id.widget_focus_habit, WidgetText.get(snapshot, "Frissítés szükséges", "Refresh needed"));
            views.setTextViewText(R.id.widget_focus_status, WidgetText.get(snapshot, "Az adatok egy korábbi napról származnak", "Snapshot is from a previous day"));
            views.setTextViewText(R.id.widget_focus_progress, WidgetText.get(snapshot, "Nyisd meg a StriveUpot a frissítéshez.", "Open StriveUp to sync today's focus habit."));
            views.setTextViewText(R.id.widget_focus_streak, "");
            views.setTextViewText(R.id.widget_focus_action, WidgetText.get(snapshot, "Megnyitás", "Open"));
            views.setTextViewText(R.id.widget_focus_hint, WidgetText.get(snapshot, "Koppints a frissítéshez", "Tap to refresh"));
            views.setInt(R.id.widget_focus_action, "setBackgroundResource", R.drawable.widget_focus_action_pending);
            views.setOnClickPendingIntent(
                R.id.widget_focus_change,
                WidgetIntentFactory.openApp(context, 13001 + appWidgetId)
            );
            views.setOnClickPendingIntent(
                R.id.widget_focus_action,
                WidgetIntentFactory.openApp(context, 13002 + appWidgetId)
            );
            manager.updateAppWidget(appWidgetId, views);
            return;
        }

        int candidateCount = focusHabits != null ? focusHabits.length() : 0;
        if (candidateCount <= 0) {
            views.setTextViewText(R.id.widget_focus_change, WidgetText.get(snapshot, "Megnyitás", "Open"));
            views.setTextViewText(R.id.widget_focus_icon, "+");
            views.setTextViewText(R.id.widget_focus_habit, WidgetText.get(snapshot, "Még nincs szokás", "No habits yet"));
            views.setTextViewText(R.id.widget_focus_status, WidgetText.get(snapshot, "Add hozzá az első szokásod", "Add your first habit"));
            views.setTextViewText(R.id.widget_focus_progress, WidgetText.get(snapshot, "Hozz létre egy szokást az alkalmazásban.", "Create a habit in the app."));
            views.setTextViewText(R.id.widget_focus_streak, "");
            views.setTextViewText(R.id.widget_focus_action, "+");
            views.setTextViewText(R.id.widget_focus_hint, WidgetText.get(snapshot, "Koppints a háttérre az alkalmazás megnyitásához", "Tap background to open app"));
            views.setInt(R.id.widget_focus_action, "setBackgroundResource", R.drawable.widget_focus_action_pending);
            views.setOnClickPendingIntent(
                R.id.widget_focus_change,
                WidgetIntentFactory.openApp(context, 13001 + appWidgetId)
            );
            views.setOnClickPendingIntent(
                R.id.widget_focus_action,
                WidgetIntentFactory.openApp(context, 13002 + appWidgetId)
            );
            manager.updateAppWidget(appWidgetId, views);
            return;
        }

        views.setOnClickPendingIntent(
            R.id.widget_focus_change,
            WidgetIntentFactory.widgetAction(
                context,
                13190 + appWidgetId,
                WidgetConstants.ACTION_CYCLE_FOCUS_HABIT,
                -1,
                1,
                "single_focus_change"
            )
        );
        views.setOnClickPendingIntent(
            R.id.widget_focus_habit,
            WidgetIntentFactory.widgetAction(
                context,
                13191 + appWidgetId,
                WidgetConstants.ACTION_CYCLE_FOCUS_HABIT,
                -1,
                1,
                "single_focus_change"
            )
        );

        if (selected == null) {
            views.setTextViewText(R.id.widget_focus_change, WidgetText.get(snapshot, "Választás", "Choose"));
            views.setTextViewText(R.id.widget_focus_icon, "\u25CF");
            views.setTextViewText(R.id.widget_focus_habit, WidgetText.get(snapshot, "Válassz ki egy szokást", "Select a habit to focus on"));
            views.setTextViewText(R.id.widget_focus_status, WidgetText.get(snapshot, "Koppints a Választás gombra", "Tap Choose to switch habit"));
            views.setTextViewText(R.id.widget_focus_progress, candidateCount + WidgetText.get(snapshot, " elérhető szokás", " habits available"));
            views.setTextViewText(R.id.widget_focus_streak, "");
            views.setTextViewText(R.id.widget_focus_action, "\u2713");
            views.setTextViewText(R.id.widget_focus_hint, WidgetText.get(snapshot, "Koppints a kiválasztáshoz", "Tap to select"));
            views.setInt(R.id.widget_focus_action, "setBackgroundResource", R.drawable.widget_focus_action_pending);
            views.setOnClickPendingIntent(
                R.id.widget_focus_action,
                WidgetIntentFactory.widgetAction(
                    context,
                    13192 + appWidgetId,
                    WidgetConstants.ACTION_CYCLE_FOCUS_HABIT,
                    -1,
                    1,
                    "single_focus_select"
                )
            );
            manager.updateAppWidget(appWidgetId, views);
            return;
        }

        int habitId = selected.optInt("habitId", -1);
        boolean done = selected.optBoolean("done", false);
        boolean locked = habitId > 0 && !done && isHabitLocked(snapshot, habitId);
        String icon = selected.optString("icon", "");
        String title = selected.optString("title", "Habit");
        int streak = selected.optInt("streak", 0);
        String progress = selected.optString("progressText", done ? "Done for today" : "Not done yet");

        views.setTextViewText(R.id.widget_focus_change, WidgetText.get(snapshot, "Csere", "Change"));
        views.setTextViewText(R.id.widget_focus_icon, icon == null || icon.trim().isEmpty() ? "\u25CF" : icon);
        views.setTextViewText(R.id.widget_focus_habit, title);
        views.setTextViewText(R.id.widget_focus_status, done
            ? WidgetText.get(snapshot, "Ma kész", "Done today")
            : (locked ? WidgetText.get(snapshot, "Zárolva az előfeltétel teljesítéséig", "Locked until prerequisite done") : WidgetText.get(snapshot, "Ma függőben", "Pending today")));
        views.setTextViewText(R.id.widget_focus_progress, progress);
        views.setTextViewText(R.id.widget_focus_streak, WidgetText.isHungarian(snapshot) ? "Sorozat: " + streak + " nap" : "Streak: " + streak + " days");
        views.setTextViewText(R.id.widget_focus_action, "\u2713");
        views.setTextViewText(R.id.widget_focus_hint, done
            ? WidgetText.get(snapshot, "Koppints a visszavonáshoz", "Tap to undo")
            : (locked ? WidgetText.get(snapshot, "Előbb teljesítsd a kapcsolt szokást", "Complete linked habit first") : WidgetText.get(snapshot, "Koppints a teljesítéshez", "Tap to complete")));
        views.setInt(
            R.id.widget_focus_action,
            "setBackgroundResource",
            done ? R.drawable.widget_focus_action_done : R.drawable.widget_focus_action_pending
        );

        if (habitId > 0) {
            views.setOnClickPendingIntent(
                R.id.widget_focus_action,
                WidgetIntentFactory.widgetAction(
                    context,
                    13100 + appWidgetId,
                    WidgetConstants.ACTION_TOGGLE_HABIT,
                    habitId,
                    1,
                    "single_focus"
                )
            );
        }

        manager.updateAppWidget(appWidgetId, views);
    }

    private boolean isHabitLocked(JSONObject snapshot, int habitId) {
        if (snapshot == null || habitId <= 0) {
            return false;
        }
        JSONArray lockedHabitIds = snapshot.optJSONArray("lockedHabitIds");
        if (lockedHabitIds == null || lockedHabitIds.length() == 0) {
            return false;
        }
        for (int i = 0; i < lockedHabitIds.length(); i++) {
            if (lockedHabitIds.optInt(i, -1) == habitId) {
                return true;
            }
        }
        return false;
    }

    private JSONObject findFocusHabitById(JSONArray focusHabits, int habitId) {
        if (focusHabits == null || habitId <= 0) {
            return null;
        }
        for (int i = 0; i < focusHabits.length(); i++) {
            JSONObject item = focusHabits.optJSONObject(i);
            if (item != null && item.optInt("habitId", -1) == habitId) {
                return item;
            }
        }
        return null;
    }
}
