package com.davidelek.striveup;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;
import android.net.Uri;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Calendar;
import org.json.JSONArray;
import org.json.JSONObject;

/** One persisted alarm, renewed by Android after every delivery, even with the WebView closed. */
public class DailyLessonReceiver extends BroadcastReceiver {
    static final String ACTION = "com.davidelek.striveup.DAILY_LESSON";
    private static final String CHANNEL = "daily-motivation";
    private static final int ID = 910002;

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences("daily-lessons", Context.MODE_PRIVATE);
    }

    public static synchronized void configure(Context context, boolean enabled) {
        prefs(context).edit().putBoolean("enabled", enabled).commit();
        if (!enabled) {
            prefs(context).edit().remove("nextAt").commit();
            alarms(context).cancel(pending(context));
            NotificationManagerCompat.from(context).cancel(ID);
            return;
        }
        schedule(context);
    }

    public static synchronized void setLanguage(Context context, String language) {
        prefs(context).edit().putString("language", "en".equals(language) ? "en" : "hu").commit();
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!prefs(context).getBoolean("enabled", false)) return;
        if (intent != null && ACTION.equals(intent.getAction())) {
            Calendar now = Calendar.getInstance();
            deliver(context, now);
            if (now.get(Calendar.HOUR_OF_DAY) >= 13 && now.get(Calendar.HOUR_OF_DAY) < 18) {
                prefs(context).edit().putString("lastAttempt", dayKey(now)).commit();
            }
        }
        prefs(context).edit().remove("nextAt").commit();
        schedule(context);
    }

    static synchronized void schedule(Context context) {
        if (!prefs(context).getBoolean("enabled", false)) return;
        Calendar now = Calendar.getInstance();
        String lastDay = prefs(context).getString("lastDay", "");
        String lastAttempt = prefs(context).getString("lastAttempt", "");
        boolean handledToday = dayKey(now).equals(lastDay) || dayKey(now).equals(lastAttempt);
        Calendar next = nextDelivery(now, handledToday ? dayKey(now) : lastDay);
        long savedAt = prefs(context).getLong("nextAt", 0);
        Calendar saved = (Calendar) now.clone();
        saved.setTimeInMillis(savedAt);
        if (savedAt > now.getTimeInMillis() || (savedAt > 0 && dayKey(saved).equals(dayKey(now))
            && now.get(Calendar.HOUR_OF_DAY) < 18 && !handledToday)) {
            next.setTimeInMillis(Math.max(savedAt, now.getTimeInMillis() + 1000));
        }
        prefs(context).edit().putLong("nextAt", next.getTimeInMillis()).commit();
        // Inexact idle-capable alarms do not require special exact-alarm access.
        alarms(context).setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next.getTimeInMillis(), pending(context));
    }

    static Calendar nextDelivery(Calendar now, String lastDay) {
        Calendar next = (Calendar) now.clone();
        next.set(Calendar.HOUR_OF_DAY, 15);
        next.set(Calendar.MINUTE, 0);
        next.set(Calendar.SECOND, 0);
        next.set(Calendar.MILLISECOND, 0);
        if (dayKey(now).equals(lastDay) || now.get(Calendar.HOUR_OF_DAY) >= 18) {
            next.add(Calendar.DATE, 1);
        } else if (!next.after(now)) {
            next.setTimeInMillis(now.getTimeInMillis() + 60_000);
        }
        return next;
    }

    private static String dayKey(Calendar day) { return WidgetSnapshotBuilder.dayKey(day); }

    static synchronized void deliver(Context context, Calendar now) {
        SharedPreferences state = prefs(context);
        // Skip overnight/backlogged delivery, then renew for the next afternoon.
        if (now.get(Calendar.HOUR_OF_DAY) < 13 || now.get(Calendar.HOUR_OF_DAY) >= 18) return;
        String today = dayKey(now);
        if (today.equals(state.getString("lastDay", ""))) return;
        NotificationManagerCompat manager = NotificationManagerCompat.from(context);
        if (!manager.areNotificationsEnabled()) return;
        try (InputStream input = context.getAssets().open("public/assets/daily-lessons.json")) {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            byte[] buffer = new byte[4096];
            int count;
            while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
            JSONArray lessons = new JSONArray(new String(output.toByteArray(), StandardCharsets.UTF_8));
            if (lessons.length() == 0) return;
            int index = Math.max(0, state.getInt("nextIndex", 0)) % lessons.length();
            JSONObject lesson = lessons.getJSONObject(index);
            boolean hu = !"en".equals(state.getString("language", "hu"));
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(CHANNEL, hu ? "Napi tanulság" : "Daily lesson", NotificationManager.IMPORTANCE_DEFAULT);
                channel.setDescription(hu ? "Élet, cél, idő – egy gondolat és egy apró gyakorlat naponta." : "Life, goals and time — one thought and a small daily practice.");
                context.getSystemService(NotificationManager.class).createNotificationChannel(channel);
                NotificationChannel existing = context.getSystemService(NotificationManager.class).getNotificationChannel(CHANNEL);
                if (existing != null && existing.getImportance() == NotificationManager.IMPORTANCE_NONE) return;
            }
            String body = lesson.getString("body");
            int sentence = body.indexOf(". ");
            String expanded = sentence >= 0 ? body.substring(0, sentence + 1) + "\n\n" + body.substring(sentence + 2) : body;
            String summary = (hu ? "Élet, cél, idő" : "Life, goals, time") + " · " + (index + 1) + "/" + lessons.length() + " · " + lesson.getString("topic");
            NotificationCompat.Builder notification = new NotificationCompat.Builder(context, CHANNEL)
                .setSmallIcon(R.drawable.ic_daily_lesson)
                .setColor(Color.rgb(79, 70, 229))
                .setContentTitle(lesson.getString("title"))
                .setContentText(sentence >= 0 ? body.substring(0, sentence + 1) : body)
                .setSubText((hu ? "Napi tanulság" : "Daily lesson") + " · " + (index + 1) + "/" + lessons.length())
                .setStyle(new NotificationCompat.BigTextStyle().bigText(expanded).setSummaryText(summary))
                .setContentIntent(WidgetIntentFactory.openApp(context, ID))
                .setAutoCancel(true)
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT);
            Intent source = new Intent(Intent.ACTION_VIEW, Uri.parse(lesson.getString("sourceUrl")));
            PendingIntent sourceAction = PendingIntent.getActivity(context, ID + 1, source,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            notification.addAction(0, hu ? "Forrás" : "Source", sourceAction);
            manager.notify(ID, notification.build());
            state.edit().putString("lastDay", today).putInt("nextIndex", (index + 1) % lessons.length()).commit();
        } catch (Exception error) {
            Log.w("DailyLessons", "Unable to deliver daily lesson", error);
        }
    }

    private static AlarmManager alarms(Context context) {
        return (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
    }

    private static PendingIntent pending(Context context) {
        return PendingIntent.getBroadcast(context, ID,
            new Intent(context, DailyLessonReceiver.class).setAction(ACTION),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
