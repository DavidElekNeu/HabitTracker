package com.davidelek.striveup;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.widget.RemoteViews;
import org.json.JSONObject;

public class DailyProgressWidgetProvider extends AppWidgetProvider {
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
        JSONObject progress = snapshot.optJSONObject("dailyProgress");
        int completed = progress != null ? progress.optInt("completed", 0) : 0;
        int total = progress != null ? progress.optInt("total", 0) : 0;
        int percent = progress != null ? progress.optInt("percent", 0) : 0;
        String hint =
            progress != null
                ? progress.optString("hint", "Build momentum today.")
                : "Build momentum today.";

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_daily_progress);
        views.setTextViewText(R.id.widget_progress_title, WidgetText.get(snapshot, "Ma", "Today"));
        if (stale) {
            views.setTextViewText(R.id.widget_progress_percent, "SYNC");
            views.setTextViewText(R.id.widget_progress_count, WidgetText.get(snapshot, "Frissítés szükséges", "Refresh needed"));
            views.setTextViewText(R.id.widget_progress_hint, WidgetText.get(snapshot, "Nyisd meg a StriveUpot a napi haladás frissítéséhez.", "Open StriveUp to sync today's progress."));
            views.setProgressBar(R.id.widget_progress_bar, 100, 0, false);
        } else {
            views.setTextViewText(R.id.widget_progress_percent, Math.max(0, Math.min(percent, 100)) + "%");
            views.setTextViewText(R.id.widget_progress_count, completed + "/" + total + WidgetText.get(snapshot, " szokás", " habits"));
            views.setTextViewText(R.id.widget_progress_hint, hint);
            views.setProgressBar(R.id.widget_progress_bar, 100, Math.max(0, Math.min(percent, 100)), false);
        }
        views.setOnClickPendingIntent(
            R.id.widget_progress_root,
            WidgetIntentFactory.openApp(context, 10000 + appWidgetId)
        );

        manager.updateAppWidget(appWidgetId, views);
    }
}
