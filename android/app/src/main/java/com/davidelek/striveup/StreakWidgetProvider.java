package com.davidelek.striveup;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.graphics.Color;
import android.widget.RemoteViews;
import org.json.JSONObject;

public class StreakWidgetProvider extends AppWidgetProvider {
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
        JSONObject streak = snapshot.optJSONObject("streak");
        int current = streak != null ? streak.optInt("current", 0) : 0;
        int longest = streak != null ? streak.optInt("longest", 0) : 0;
        String message =
            streak != null ? streak.optString("message", "Keep going.") : "Keep going.";

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_streak);
        views.setTextViewText(R.id.widget_streak_title, WidgetText.get(snapshot, "Sorozat", "Streak"));
        if (stale) {
            views.setTextViewText(R.id.widget_streak_icon, "\u2736");
            views.setTextViewText(R.id.widget_streak_current, "--");
            views.setTextViewText(R.id.widget_streak_longest, WidgetText.get(snapshot, "Frissítés szükséges", "Refresh needed"));
            views.setTextViewText(R.id.widget_streak_message, WidgetText.get(snapshot, "Nyisd meg a StriveUpot a sorozat frissítéséhez.", "Open StriveUp to refresh streak data."));
            views.setTextColor(R.id.widget_streak_current, Color.parseColor("#FFFFFFFF"));
        } else {
            views.setTextViewText(R.id.widget_streak_icon, current >= 7 ? "\uD83D\uDD25" : "\u2736");
            views.setTextViewText(R.id.widget_streak_current, String.valueOf(current));
            views.setTextViewText(R.id.widget_streak_longest, WidgetText.isHungarian(snapshot) ? "Leghosszabb: " + longest + " nap" : "Longest " + longest + " days");
            views.setTextViewText(R.id.widget_streak_message, message);
            views.setTextColor(
                R.id.widget_streak_current,
                current >= 30 ? Color.parseColor("#FFD36B") : Color.parseColor("#FFFFFFFF")
            );
        }
        views.setOnClickPendingIntent(
            R.id.widget_streak_root,
            WidgetIntentFactory.openApp(context, 12000 + appWidgetId)
        );

        manager.updateAppWidget(appWidgetId, views);
    }
}
