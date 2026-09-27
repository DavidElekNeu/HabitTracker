package com.davidelek.striveup;

import android.content.Context;
import android.content.SharedPreferences;
import java.util.Calendar;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public final class WidgetStore {
    private WidgetStore() {}

    public static synchronized void saveSnapshot(Context context, JSONObject snapshot) {
        prefs(context).edit().putString(WidgetConstants.SNAPSHOT_KEY, snapshot.toString()).apply();
    }

    public static synchronized void mergeSnapshot(Context context, JSONObject snapshot, JSONArray acknowledged) throws JSONException {
        JSONArray pending = readActionQueue(context);
        JSONArray remaining = new JSONArray();
        for (int i = 0; i < pending.length(); i++) {
            JSONObject action = pending.optJSONObject(i);
            if (action == null) continue;
            boolean handled = false;
            for (int j = 0; acknowledged != null && j < acknowledged.length(); j++) {
                if (action.optString("id").equals(acknowledged.optString(j))) { handled = true; break; }
            }
            if (!handled) {
                remaining.put(action);
                JSONObject source = snapshot.optJSONObject("source");
                if (source != null && "set_value".equals(action.optString("type"))) {
                    WidgetSnapshotBuilder.applyValue(source, action.getInt("habitId"), action.getString("dayKey"), action.get("value"));
                }
            }
        }
        JSONObject fresh = WidgetSnapshotBuilder.build(snapshot, Calendar.getInstance());
        // Commit the queue acknowledgement and replacement together; failed JS writes retain taps.
        prefs(context).edit().putString(WidgetConstants.ACTION_QUEUE_KEY, remaining.toString())
            .putString(WidgetConstants.SNAPSHOT_KEY, fresh.toString()).commit();
    }

    public static synchronized JSONObject readSnapshot(Context context) {
        String raw = prefs(context).getString(WidgetConstants.SNAPSHOT_KEY, "{}");
        try {
            return WidgetSnapshotBuilder.build(new JSONObject(raw != null ? raw : "{}"), Calendar.getInstance());
        } catch (JSONException error) {
            return new JSONObject();
        }
    }

    public static synchronized void enqueueAction(Context context, JSONObject action) {
        JSONArray queue = readActionQueue(context);
        queue.put(action);
        prefs(context).edit().putString(WidgetConstants.ACTION_QUEUE_KEY, queue.toString()).apply();
    }

    public static synchronized JSONArray consumeActions(Context context) {
        JSONArray queue = readActionQueue(context);
        for (int i = 0; i < queue.length(); i++) {
            JSONObject action = queue.optJSONObject(i);
            if (action != null && !action.has("id")) {
                try { action.put("id", java.util.UUID.randomUUID().toString()); } catch (JSONException ignored) { }
            }
        }
        prefs(context).edit().putString(WidgetConstants.ACTION_QUEUE_KEY, queue.toString()).commit();
        return queue;
    }

    public static synchronized void applyHabitAction(Context context, String type, int habitId, int amount, String origin) {
        if (!WidgetConstants.ACTION_TOGGLE_HABIT.equals(type) && !WidgetConstants.ACTION_INCREMENT_HABIT.equals(type)) return;
        JSONObject snapshot = readSnapshot(context);
        JSONObject source = snapshot.optJSONObject("source");
        if (source == null) return;
        JSONArray habits = source.optJSONArray("habits");
        JSONObject habit = null;
        for (int i = 0; habits != null && i < habits.length(); i++) {
            JSONObject candidate = habits.optJSONObject(i);
            if (candidate != null && candidate.optInt("id") == habitId && !candidate.optBoolean("archived")) { habit = candidate; break; }
        }
        if (habit == null) return;
        JSONObject focusItem = null;
        JSONArray focus = snapshot.optJSONArray("focusHabits");
        for (int i = 0; focus != null && i < focus.length(); i++) {
            JSONObject item = focus.optJSONObject(i);
            if (item != null && item.optInt("habitId") == habitId) focusItem = item;
        }
        if (focusItem == null) return;
        String day = currentDayKey();
        double current = 0;
        JSONArray logs = source.optJSONArray("logs");
        for (int i = 0; logs != null && i < logs.length(); i++) {
            JSONObject log = logs.optJSONObject(i);
            if (log != null && log.optInt("habitId") == habitId && day.equals(log.optString("dayKey"))) current = WidgetSnapshotBuilder.contribution(log.opt("value"));
        }
        JSONObject schedule = habit.optJSONObject("schedule");
        if (schedule == null) schedule = new JSONObject();
        String habitType = habit.optString("type", "binary");
        double target = focusItem.optDouble("target", 1);
        Double nextValue = WidgetSnapshotBuilder.nextValue(current, focusItem.optDouble("periodValue", current),
            target, WidgetConstants.ACTION_INCREMENT_HABIT.equals(type), amount);
        if (nextValue == null) return;
        JSONArray locked = snapshot.optJSONArray("lockedHabitIds");
        for (int i = 0; nextValue > current && locked != null && i < locked.length(); i++) {
            if (locked.optInt(i) == habitId) return;
        }
        Object value;
        if ("binary".equals(habitType)) value = nextValue > 0;
        else value = nextValue;
        try {
            JSONObject action = new JSONObject().put("id", java.util.UUID.randomUUID().toString())
                .put("type", "set_value").put("habitId", habitId).put("dayKey", day).put("value", value)
                .put("timestamp", System.currentTimeMillis()).put("origin", origin);
            WidgetSnapshotBuilder.applyValue(source, habitId, day, value);
            JSONArray queue = readActionQueue(context);
            queue.put(action);
            prefs(context).edit().putString(WidgetConstants.ACTION_QUEUE_KEY, queue.toString())
                .putString(WidgetConstants.SNAPSHOT_KEY, WidgetSnapshotBuilder.build(snapshot, Calendar.getInstance()).toString()).commit();
        } catch (JSONException error) {
            android.util.Log.w("HabitWidgets", "Unable to save widget action", error);
        }
    }

    public static synchronized void saveFocusedHabitId(Context context, int habitId) {
        prefs(context).edit().putInt(WidgetConstants.FOCUSED_HABIT_ID_KEY, habitId).apply();
    }

    public static synchronized int readFocusedHabitId(Context context) {
        return prefs(context).getInt(WidgetConstants.FOCUSED_HABIT_ID_KEY, -1);
    }

    public static synchronized void clearFocusedHabitId(Context context) {
        prefs(context).edit().remove(WidgetConstants.FOCUSED_HABIT_ID_KEY).apply();
    }

    public static synchronized void reconcileFocusedHabitSelection(Context context, JSONObject snapshot) {
        int selectedId = readFocusedHabitId(context);
        if (selectedId <= 0) {
            return;
        }
        if (!snapshotContainsHabitId(snapshot.optJSONArray("focusHabits"), selectedId)) {
            clearFocusedHabitId(context);
        }
    }

    public static synchronized boolean isSnapshotStaleForToday(JSONObject snapshot) {
        if (snapshot == null) {
            return true;
        }

        String dayKey = snapshot.optString("dayKey", "");
        if (dayKey == null || dayKey.trim().isEmpty()) {
            return true;
        }

        return !currentDayKey().equals(dayKey);
    }

    private static JSONArray readActionQueue(Context context) {
        String raw = prefs(context).getString(WidgetConstants.ACTION_QUEUE_KEY, "[]");
        try {
            return new JSONArray(raw != null ? raw : "[]");
        } catch (JSONException error) {
            return new JSONArray();
        }
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(WidgetConstants.PREFS_NAME, Context.MODE_PRIVATE);
    }

    private static boolean snapshotContainsHabitId(JSONArray items, int habitId) {
        if (items == null || habitId <= 0) {
            return false;
        }
        for (int i = 0; i < items.length(); i++) {
            JSONObject item = items.optJSONObject(i);
            if (item != null && item.optInt("habitId", -1) == habitId) {
                return true;
            }
        }
        return false;
    }

    private static String currentDayKey() {
        Calendar calendar = Calendar.getInstance();
        return String.format(
            Locale.US,
            "%04d-%02d-%02d",
            calendar.get(Calendar.YEAR),
            calendar.get(Calendar.MONTH) + 1,
            calendar.get(Calendar.DAY_OF_MONTH)
        );
    }
}
