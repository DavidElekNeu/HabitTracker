package com.davidelek.striveup;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.graphics.Color;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

public class WeeklyConsistencyWidgetProvider extends AppWidgetProvider {
    private static final int[] DAY_TEXT_IDS = {
        R.id.widget_weekly_day1,
        R.id.widget_weekly_day2,
        R.id.widget_weekly_day3,
        R.id.widget_weekly_day4,
        R.id.widget_weekly_day5,
        R.id.widget_weekly_day6,
        R.id.widget_weekly_day7
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
        JSONObject weekly = snapshot.optJSONObject("weeklyConsistency");
        int percent = weekly != null ? weekly.optInt("percent", 0) : 0;
        JSONArray labels = weekly != null ? weekly.optJSONArray("dayLabels") : null;
        JSONArray rates = weekly != null ? weekly.optJSONArray("dayRates") : null;

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_weekly_consistency);
        views.setTextViewText(R.id.widget_weekly_title, WidgetText.get(snapshot, "Heti következetesség", "Weekly consistency"));
        views.setTextViewText(R.id.widget_weekly_percent, stale ? "SYNC" : percent + "%");

        int activeDays = 0;
        for (int i = 0; i < DAY_TEXT_IDS.length; i++) {
            String label = stale ? "?" : (labels != null ? labels.optString(i, "?") : "?");
            int rate = stale ? 0 : (rates != null ? rates.optInt(i, 0) : 0);
            if (rate >= 50) {
                activeDays += 1;
            }
            String symbol = rate >= 50 ? "\u25CF" : "\u25CB";
            views.setTextViewText(DAY_TEXT_IDS[i], label + "\n" + symbol);
            views.setTextColor(DAY_TEXT_IDS[i], colorForRate(rate));
        }
        views.setTextViewText(
            R.id.widget_weekly_subtitle,
            stale ? WidgetText.get(snapshot, "Nyisd meg a StriveUpot a hét frissítéséhez.", "Open StriveUp to refresh this week.") : activeDays + "/7 " + WidgetText.get(snapshot, "aktív nap", "active days")
        );

        views.setOnClickPendingIntent(
            R.id.widget_weekly_root,
            WidgetIntentFactory.openApp(context, 14000 + appWidgetId)
        );

        manager.updateAppWidget(appWidgetId, views);
    }

    private int colorForRate(int rate) {
        if (rate >= 70) {
            return Color.parseColor("#D6F5DD");
        }
        if (rate >= 35) {
            return Color.parseColor("#FFE6B4");
        }
        return Color.parseColor("#F0F4F8");
    }
}
