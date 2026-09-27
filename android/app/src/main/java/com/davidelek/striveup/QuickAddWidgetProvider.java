package com.davidelek.striveup;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.view.View;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;

public class QuickAddWidgetProvider extends AppWidgetProvider {
    private static final int[] ROW_IDS = {R.id.widget_quickadd_row1, R.id.widget_quickadd_row2};
    private static final int[] TITLE_IDS = {R.id.widget_quickadd_title1, R.id.widget_quickadd_title2};
    private static final int[] VALUE_IDS = {R.id.widget_quickadd_value1, R.id.widget_quickadd_value2};
    private static final int[] BUTTON_IDS = {R.id.widget_quickadd_plus1, R.id.widget_quickadd_plus2};

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
        JSONArray entries = snapshot.optJSONArray("quickAdd");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_quick_add);
        views.setTextViewText(R.id.widget_quickadd_header, WidgetText.get(snapshot, "Gyors hozzáadás", "Quick add"));
        views.setOnClickPendingIntent(
            R.id.widget_quickadd_root,
            WidgetIntentFactory.openApp(context, 15000 + appWidgetId)
        );

        if (stale) {
            views.setViewVisibility(R.id.widget_quickadd_row1, View.VISIBLE);
            views.setTextViewText(R.id.widget_quickadd_title1, WidgetText.get(snapshot, "Frissítés szükséges", "Refresh needed"));
            views.setTextViewText(R.id.widget_quickadd_value1, WidgetText.get(snapshot, "Nyisd meg a StriveUpot a frissítéshez", "Open StriveUp to sync today's actions"));
            views.setTextViewText(R.id.widget_quickadd_plus1, WidgetText.get(snapshot, "Megnyitás", "Open"));
            views.setOnClickPendingIntent(
                R.id.widget_quickadd_plus1,
                WidgetIntentFactory.openApp(context, 15300 + appWidgetId)
            );
            views.setOnClickPendingIntent(
                R.id.widget_quickadd_row1,
                WidgetIntentFactory.openApp(context, 15301 + appWidgetId)
            );
            views.setViewVisibility(R.id.widget_quickadd_row2, View.GONE);
            manager.updateAppWidget(appWidgetId, views);
            return;
        }

        int visibleRows = 0;
        for (int i = 0; i < ROW_IDS.length; i++) {
            JSONObject item = entries != null ? entries.optJSONObject(i) : null;
            if (item == null) {
                views.setViewVisibility(ROW_IDS[i], View.GONE);
                continue;
            }

            int habitId = item.optInt("habitId", -1);
            String title = item.optString("title", "Habit");
            String icon = item.optString("icon", "");
            double current = item.optDouble("current", 0);
            double target = item.optDouble("target", 1);
            String unit = item.optString("unit", "");

            views.setViewVisibility(ROW_IDS[i], View.VISIBLE);
            String displayTitle = (icon == null || icon.trim().isEmpty()) ? title : icon + " " + title;
            views.setTextViewText(TITLE_IDS[i], truncate(displayTitle, 24));
            views.setTextViewText(
                VALUE_IDS[i],
                formatNumber(current) + "/" + formatNumber(target) + (unit.isEmpty() ? "" : " " + unit)
            );
            views.setTextViewText(BUTTON_IDS[i], "+1");
            visibleRows += 1;

            if (habitId > 0) {
                views.setOnClickPendingIntent(
                    BUTTON_IDS[i],
                    WidgetIntentFactory.widgetAction(
                        context,
                        15100 + (appWidgetId * 10) + i,
                        WidgetConstants.ACTION_INCREMENT_HABIT,
                        habitId,
                        1,
                        "quick_add"
                    )
                );
            }
        }

        if (visibleRows == 0) {
            views.setViewVisibility(R.id.widget_quickadd_row1, View.VISIBLE);
            views.setTextViewText(R.id.widget_quickadd_title1, WidgetText.get(snapshot, "Nincs mérhető szokás", "No trackable habits"));
            views.setTextViewText(R.id.widget_quickadd_value1, WidgetText.get(snapshot, "Add hozzá az első szokásod", "Add your first habit"));
            views.setTextViewText(R.id.widget_quickadd_plus1, WidgetText.get(snapshot, "Megnyitás", "Open"));
            views.setOnClickPendingIntent(
                R.id.widget_quickadd_plus1,
                WidgetIntentFactory.openApp(context, 15300 + appWidgetId)
            );
            views.setOnClickPendingIntent(
                R.id.widget_quickadd_row1,
                WidgetIntentFactory.openApp(context, 15301 + appWidgetId)
            );
            views.setViewVisibility(R.id.widget_quickadd_row2, View.GONE);
        }

        manager.updateAppWidget(appWidgetId, views);
    }

    private String formatNumber(double value) {
        long whole = (long) value;
        if (Math.abs(value - whole) < 0.0001d) {
            return String.valueOf(whole);
        }
        return String.format(java.util.Locale.US, "%.1f", value);
    }

    private String truncate(String text, int max) {
        if (text == null || text.length() <= max) {
            return text;
        }
        return text.substring(0, Math.max(0, max - 1)) + "\u2026";
    }
}
