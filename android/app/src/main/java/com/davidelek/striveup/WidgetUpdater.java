package com.davidelek.striveup;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;

public final class WidgetUpdater {
    private WidgetUpdater() {}

    public static void updateAllWidgets(Context context) {
        WidgetRefreshReceiver.scheduleNextRefresh(context);
        updateProvider(context, TodayHabitsWidgetProvider.class);
        updateProvider(context, DailyProgressWidgetProvider.class);
        updateProvider(context, StreakWidgetProvider.class);
        updateProvider(context, SingleHabitFocusWidgetProvider.class);
        updateProvider(context, WeeklyConsistencyWidgetProvider.class);
        updateProvider(context, QuickAddWidgetProvider.class);
    }

    private static void updateProvider(Context context, Class<? extends AppWidgetProvider> providerClass) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName provider = new ComponentName(context, providerClass);
        int[] ids = manager.getAppWidgetIds(provider);
        if (ids == null || ids.length == 0) {
            return;
        }

        Intent updateIntent = new Intent(context, providerClass);
        updateIntent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        updateIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        context.sendBroadcast(updateIntent);
    }
}
