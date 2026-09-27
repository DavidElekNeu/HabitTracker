package com.davidelek.striveup;

import android.app.Notification;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.Calendar;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class BackgroundFeaturesTest {
    private Context context() { return InstrumentationRegistry.getInstrumentation().getTargetContext(); }

    @Test public void persistsTapsAcrossRefreshAndAcknowledgesOnlyImportedActions() throws Exception {
        Context context = context();
        SharedPreferences prefs = context.getSharedPreferences(WidgetConstants.PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().clear().commit();
        JSONObject snapshot = new JSONObject("{source:{habits:[{id:1,title:'Read',type:'quantitative',createdDayKey:'2026-01-01',schedule:{dailyTargetValue:5}}],logs:[]}}");
        WidgetStore.mergeSnapshot(context, snapshot, new JSONArray());
        WidgetStore.applyHabitAction(context, WidgetConstants.ACTION_INCREMENT_HABIT, 1, 2, "test");
        JSONArray pending = WidgetStore.consumeActions(context);
        assertEquals(2, pending.getJSONObject(0).getInt("value"));
        assertEquals(WidgetSnapshotBuilder.dayKey(Calendar.getInstance()), pending.getJSONObject(0).getString("dayKey"));
        assertEquals(1, WidgetStore.consumeActions(context).length());
        WidgetStore.applyHabitAction(context, WidgetConstants.ACTION_INCREMENT_HABIT, 1, 1, "test");
        JSONObject imported = new JSONObject(snapshot.toString());
        WidgetSnapshotBuilder.applyValue(imported.getJSONObject("source"), 1, pending.getJSONObject(0).getString("dayKey"), 2);
        WidgetStore.mergeSnapshot(context, imported, new JSONArray().put(pending.getJSONObject(0).getString("id")));
        assertEquals(1, WidgetStore.consumeActions(context).length());
        assertEquals(3, WidgetStore.readSnapshot(context).getJSONArray("quickAdd").getJSONObject(0).getInt("current"));
        // Reloading an old app snapshot must overlay the pending tap rather than lose it.
        WidgetStore.mergeSnapshot(context, imported, new JSONArray());
        assertEquals(3, WidgetStore.readSnapshot(context).getJSONArray("quickAdd").getJSONObject(0).getInt("current"));
        prefs.edit().clear().commit();
    }

    @Test public void lessonsRenewAfterRestartAvoidDuplicatesAndRenderFullHungarianText() throws Exception {
        Context context = context();
        SharedPreferences state = context.getSharedPreferences("daily-lessons", Context.MODE_PRIVATE);
        state.edit().clear().commit();
        DailyLessonReceiver.configure(context, true);
        long nextAt = state.getLong("nextAt", 0);
        assertTrue(nextAt > System.currentTimeMillis());
        DailyLessonReceiver.configure(context, true);
        assertEquals(nextAt, state.getLong("nextAt", 0));
        new DailyLessonReceiver().onReceive(context, new Intent(Intent.ACTION_BOOT_COMPLETED));
        assertTrue(state.getLong("nextAt", 0) > System.currentTimeMillis());

        Calendar afternoon = Calendar.getInstance();
        afternoon.set(Calendar.HOUR_OF_DAY, 15);
        DailyLessonReceiver.deliver(context, afternoon);
        assertEquals(1, state.getInt("nextIndex", -1));
        DailyLessonReceiver.deliver(context, afternoon);
        assertEquals(1, state.getInt("nextIndex", -1));
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        awaitNotifications(manager, 1);
        assertEquals(1, manager.getActiveNotifications().length);
        Notification notification = manager.getActiveNotifications()[0].getNotification();
        assertEquals("Sürgős és fontos", notification.extras.getString(Notification.EXTRA_TITLE));
        String fullText = notification.extras.getCharSequence(Notification.EXTRA_BIG_TEXT).toString();
        assertTrue(fullText.contains("\n\n"));
        assertTrue(fullText.contains("mennyire sürgős és mennyire fontos."));
        assertEquals("Forrás", notification.actions[0].title.toString());
        DailyLessonReceiver.configure(context, false);
        awaitNotifications(manager, 0);
        assertFalse(state.contains("nextAt"));
        assertEquals(0, manager.getActiveNotifications().length);
        // Leave a representative sample for a screenshot in the isolated test emulator.
        state.edit().clear().commit();
        DailyLessonReceiver.deliver(context, afternoon);
        awaitNotifications(manager, 1);
    }

    private void awaitNotifications(NotificationManager manager, int count) {
        long deadline = android.os.SystemClock.elapsedRealtime() + 5000;
        while (manager.getActiveNotifications().length != count && android.os.SystemClock.elapsedRealtime() < deadline) {
            android.os.SystemClock.sleep(100);
        }
        assertEquals(count, manager.getActiveNotifications().length);
    }
}
