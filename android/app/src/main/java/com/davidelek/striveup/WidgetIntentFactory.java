package com.davidelek.striveup;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;

public final class WidgetIntentFactory {
    private WidgetIntentFactory() {}

    public static PendingIntent openApp(Context context, int requestCode) {
        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.setFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK
                | Intent.FLAG_ACTIVITY_CLEAR_TOP
                | Intent.FLAG_ACTIVITY_SINGLE_TOP
        );
        return PendingIntent.getActivity(
            context,
            requestCode,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    public static PendingIntent widgetAction(
        Context context,
        int requestCode,
        String actionType,
        int habitId,
        int amount,
        String origin
    ) {
        Intent intent = new Intent(context, WidgetActionReceiver.class);
        intent.setAction(WidgetConstants.ACTION_WIDGET_INTERACTION);
        intent.putExtra(WidgetConstants.EXTRA_ACTION_TYPE, actionType);
        intent.putExtra(WidgetConstants.EXTRA_HABIT_ID, habitId);
        intent.putExtra(WidgetConstants.EXTRA_AMOUNT, amount);
        intent.putExtra(WidgetConstants.EXTRA_ORIGIN, origin);

        return PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }
}
