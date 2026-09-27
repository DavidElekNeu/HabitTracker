package com.davidelek.striveup;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

public class TodayHabitsWidgetProvider extends AppWidgetProvider {
    private static final int[] ROW_IDS = {
        R.id.widget_today_row1,
        R.id.widget_today_row2,
        R.id.widget_today_row3,
        R.id.widget_today_row4
    };

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
        JSONArray todayHabits = snapshot.optJSONArray("todayHabits");
        JSONObject progress = snapshot.optJSONObject("dailyProgress");
        int completed = progress != null ? progress.optInt("completed", 0) : 0;
        int total = progress != null ? progress.optInt("total", 0) : 0;

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_today_habits);
        views.setTextViewText(R.id.widget_today_header, WidgetText.get(snapshot, "Mai szokások", "Today habits"));

        if (stale) {
            views.setTextViewText(R.id.widget_today_summary, WidgetText.get(snapshot, "Nyisd meg a StriveUpot a frissítéshez", "Open StriveUp to refresh today's list"));
            views.setViewVisibility(R.id.widget_today_row1, View.VISIBLE);
            views.setTextViewText(R.id.widget_today_row1, WidgetText.get(snapshot, "A widget adatai egy korábbi napról származnak.", "Widget snapshot is from a previous day."));
            views.setOnClickPendingIntent(
                R.id.widget_today_row1,
                WidgetIntentFactory.openApp(context, 10950 + appWidgetId)
            );
            views.setViewVisibility(R.id.widget_today_row2, View.GONE);
            views.setViewVisibility(R.id.widget_today_row3, View.GONE);
            views.setViewVisibility(R.id.widget_today_row4, View.GONE);
            views.setOnClickPendingIntent(
                R.id.widget_today_root,
                WidgetIntentFactory.openApp(context, 10900 + appWidgetId)
            );
            manager.updateAppWidget(appWidgetId, views);
            return;
        }

        views.setTextViewText(
            R.id.widget_today_summary,
            total > 0 ? completed + "/" + total + WidgetText.get(snapshot, " teljesítve", " completed") : WidgetText.get(snapshot, "Még nincs szokás", "No habits yet")
        );

        int visibleRows = 0;
        for (int i = 0; i < ROW_IDS.length; i++) {
            int rowId = ROW_IDS[i];
            JSONObject item = todayHabits != null ? todayHabits.optJSONObject(i) : null;
            if (item == null) {
                views.setViewVisibility(rowId, View.GONE);
                continue;
            }

            int habitId = item.optInt("habitId", -1);
            String title = item.optString("title", "Habit");
            String icon = item.optString("icon", "");
            boolean done = item.optBoolean("done", false);
            String mark = done ? "\u2611" : "\u2610";
            String text = mark + " " + (icon.isEmpty() ? "" : icon + " ") + title;
            views.setViewVisibility(rowId, View.VISIBLE);
            views.setTextViewText(rowId, truncate(text, 38));
            visibleRows += 1;

            if (habitId > 0) {
                views.setOnClickPendingIntent(
                    rowId,
                    WidgetIntentFactory.widgetAction(
                        context,
                        11000 + (appWidgetId * 10) + i,
                        WidgetConstants.ACTION_TOGGLE_HABIT,
                        habitId,
                        1,
                        "today_habits"
                    )
                );
            }
        }

        if (visibleRows == 0) {
            views.setViewVisibility(R.id.widget_today_row1, View.VISIBLE);
            views.setTextViewText(R.id.widget_today_row1, WidgetText.get(snapshot, "Még nincs szokás. Add hozzá az elsőt.", "No habits yet. Add your first habit."));
            views.setOnClickPendingIntent(
                R.id.widget_today_row1,
                WidgetIntentFactory.openApp(context, 10950 + appWidgetId)
            );
            views.setViewVisibility(R.id.widget_today_row2, View.GONE);
            views.setViewVisibility(R.id.widget_today_row3, View.GONE);
            views.setViewVisibility(R.id.widget_today_row4, View.GONE);
        }

        views.setOnClickPendingIntent(
            R.id.widget_today_root,
            WidgetIntentFactory.openApp(context, 10900 + appWidgetId)
        );

        manager.updateAppWidget(appWidgetId, views);
    }

    private String truncate(String text, int max) {
        if (text == null || text.length() <= max) {
            return text;
        }
        return text.substring(0, Math.max(0, max - 1)) + "\u2026";
    }
}
