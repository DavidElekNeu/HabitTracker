package com.davidelek.striveup;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.app.AlarmManager;
import android.app.PendingIntent;
import java.util.Calendar;

public class WidgetRefreshReceiver extends BroadcastReceiver {
    public static void scheduleNextRefresh(Context context) {
        Calendar next = Calendar.getInstance();
        next.add(Calendar.DATE, 1);
        next.set(Calendar.HOUR_OF_DAY, 0);
        next.set(Calendar.MINUTE, 0);
        next.set(Calendar.SECOND, 5);
        next.set(Calendar.MILLISECOND, 0);
        PendingIntent alarm = PendingIntent.getBroadcast(context, 910003,
            new Intent(context, WidgetRefreshReceiver.class).setAction("com.davidelek.striveup.REFRESH_WIDGETS"),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        ((AlarmManager) context.getSystemService(Context.ALARM_SERVICE))
            .setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next.getTimeInMillis(), alarm);
    }
    @Override
    public void onReceive(Context context, Intent intent) {
        WidgetUpdater.updateAllWidgets(context);
    }
}
