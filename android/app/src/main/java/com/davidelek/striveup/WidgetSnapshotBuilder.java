package com.davidelek.striveup;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeSet;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** Rebuilds widgets from persisted habits and dated logs without starting the app. */
public final class WidgetSnapshotBuilder {
    private WidgetSnapshotBuilder() {}

    public static String dayKey(Calendar day) {
        return String.format(Locale.US, "%04d-%02d-%02d", day.get(Calendar.YEAR),
            day.get(Calendar.MONTH) + 1, day.get(Calendar.DAY_OF_MONTH));
    }

    static Calendar shift(Calendar day, int days) {
        Calendar result = (Calendar) day.clone();
        result.add(Calendar.DATE, days);
        return result;
    }

    static JSONObject build(JSONObject snapshot, Calendar now) throws JSONException {
        boolean hu = WidgetText.isHungarian(snapshot);
        JSONObject source = snapshot.optJSONObject("source");
        if (source == null) return snapshot; // Older installations migrate on the first app launch.
        JSONArray habits = source.optJSONArray("habits");
        JSONArray logs = source.optJSONArray("logs");
        if (habits == null || logs == null) return snapshot;
        String today = dayKey(now);
        Map<Integer, Map<String, Object>> history = new HashMap<>();
        for (int i = 0; i < logs.length(); i++) {
            JSONObject log = logs.optJSONObject(i);
            if (log == null) continue;
            int id = log.optInt("habitId", -1);
            if (!history.containsKey(id)) history.put(id, new HashMap<>());
            history.get(id).put(log.optString("dayKey"), log.opt("value"));
        }
        List<JSONObject> focus = new ArrayList<>();
        List<JSONObject> due = new ArrayList<>();
        List<JSONObject> quick = new ArrayList<>();
        Map<Integer, Boolean> completions = new HashMap<>();
        int currentStreak = 0;
        int longestStreak = 0;
        for (int i = 0; i < habits.length(); i++) {
            JSONObject habit = habits.optJSONObject(i);
            if (habit == null || habit.optBoolean("archived") || habit.optInt("id", -1) <= 0) continue;
            int id = habit.getInt("id");
            Map<String, Object> days = logsFor(history, id);
            JSONObject schedule = habit.optJSONObject("schedule");
            if (schedule == null) schedule = new JSONObject();
            String type = habit.optString("type", "binary");
            String period = schedule.optString("frequencyPeriod", "day");
            double target = "binary".equals(type) ? 1 : Math.max(1,
                schedule.optDouble("frequency".equals(type) ? "frequencyCount" : "dailyTargetValue", 1));
            double value = contribution(days.get(today));
            double periodValue = sum(days, periodStart(now, period), today);
            boolean done = periodValue >= target;
            int streak = currentStreak(days, now);
            currentStreak = Math.max(currentStreak, streak);
            longestStreak = Math.max(longestStreak, longestStreak(days, today));
            String progress = "binary".equals(type) ? (done ? (hu ? "Mára kész" : "Done for today") : (hu ? "Még nincs kész" : "Not done yet"))
                : number(value) + "/" + number(target) + " " +
                    ("frequency".equals(type) ? (hu ? "alkalom" : "check-ins") : habit.optString("units", ""));
            JSONObject item = new JSONObject().put("habitId", id).put("title", habit.optString("title", "Habit"))
                .put("icon", habit.optString("icon", "")).put("done", done).put("streak", streak)
                .put("progressText", progress.trim());
            focus.add(item);
            boolean allowed = allowedWeekday(schedule, now);
            double dueTarget = "binary".equals(type) ? 1 : schedule.optDouble("dailyTargetValue", 0);
            if (!"day".equals(period) && dueTarget > 0 && !"binary".equals(type)) {
                String created = habit.optString("createdDayKey", "");
                Calendar start = periodStartCalendar(now, period);
                Calendar end = (Calendar) start.clone();
                if ("month".equals(period)) end.add(Calendar.MONTH, 1); else end.add(Calendar.DATE, 7);
                int totalDays = 0;
                int activeDays = 0;
                for (Calendar day = (Calendar) start.clone(); day.before(end); day.add(Calendar.DATE, 1)) {
                    totalDays++;
                    if (dayKey(day).compareTo(created) >= 0) activeDays++;
                }
                if (created.compareTo(dayKey(start)) >= 0 && created.compareTo(dayKey(end)) < 0) {
                    dueTarget = Math.max(1, Math.round(dueTarget * activeDays / totalDays));
                }
            }
            // Use the same prorated quantitative target as the app during the first week/month.
            if ("quantitative".equals(type)) target = dueTarget;
            done = target > 0 && periodValue >= target;
            item.put("done", done).put("target", target).put("periodValue", periodValue)
                .put("todayValue", value);
            if (!"binary".equals(type)) {
                item.put("progressText", (number(periodValue) + "/" + number(target) + " " +
                    ("frequency".equals(type) ? (hu ? "alkalom" : "check-ins") : habit.optString("units", ""))).trim());
            }
            double lockValue = sum(days, periodStart(now, period), today);
            double lockTarget = "quantitative".equals(type) ? dueTarget : target;
            completions.put(id, lockTarget > 0 && lockValue >= lockTarget);
            // Keep the app's visibility rules, including newly created or never-logged habits.
            double dueValue = periodValue;
            dueTarget = target;
            boolean isDue = allowed && ("day".equals(period) || dueTarget <= 0 || dueValue < dueTarget);
            if (isDue || days.containsKey(today) || days.isEmpty() || today.equals(habit.optString("createdDayKey"))) due.add(item);
            if (!"binary".equals(type)) quick.add(new JSONObject().put("habitId", id)
                .put("title", item.getString("title")).put("icon", item.getString("icon"))
                .put("current", periodValue).put("target", target).put("unit", habit.optString("units", "")));
        }
        Collections.sort(focus, WidgetSnapshotBuilder::compareItems);
        Collections.sort(due, WidgetSnapshotBuilder::compareItems);
        Collections.sort(quick, (a, b) -> {
            int completed = Boolean.compare(a.optDouble("current") >= a.optDouble("target"), b.optDouble("current") >= b.optDouble("target"));
            return completed != 0 ? completed : a.optString("title").compareToIgnoreCase(b.optString("title"));
        });
        int completed = 0;
        for (JSONObject item : due) if (item.optBoolean("done")) completed++;
        int total = due.size();
        int remaining = total - completed;
        java.text.SimpleDateFormat timestamp = new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US);
        timestamp.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
        snapshot.put("dayKey", today).put("updatedAtIso", timestamp.format(now.getTime()))
            .put("todayHabits", array(due, 6)).put("focusHabits", array(focus, focus.size()))
            .put("singleHabitFocus", focus.isEmpty() ? new JSONObject() : focus.get(0))
            .put("quickAdd", array(quick, 2))
            .put("dailyProgress", new JSONObject().put("completed", completed).put("total", total).put("remaining", remaining)
                .put("percent", percent(completed, total)).put("hint", total == 0 ? (hu ? "Mára nincs ütemezett szokás" : "No habits scheduled today") : remaining == 0 ? (hu ? "Mára minden kész" : "Everything is done today") : remaining + (hu ? " van hátra mára" : " left today")))
            .put("streak", new JSONObject().put("current", currentStreak).put("longest", longestStreak)
                .put("message", currentStreak == 0 ? (hu ? "Kezdd el ma a sorozatot." : "Start your streak today.") : (hu ? "Tartsd életben a láncot." : "Keep the chain alive.")));
        JSONArray labels = new JSONArray();
        JSONArray rates = new JSONArray();
        int weeklyTotal = 0;
        int weeklyCompleted = 0;
        for (int offset = -6; offset <= 0; offset++) {
            Calendar day = shift(now, offset);
            String key = dayKey(day);
            Locale labelLocale = hu ? new Locale("hu", "HU") : Locale.US;
            labels.put(new java.text.SimpleDateFormat("EEEEE", labelLocale).format(day.getTime()).substring(0, 1));
            int dayTotal = 0;
            int dayCompleted = 0;
            for (int i = 0; i < habits.length(); i++) {
                JSONObject habit = habits.optJSONObject(i);
                if (habit == null || habit.optBoolean("archived") || habit.optString("createdDayKey", "").compareTo(key) > 0) continue;
                dayTotal++;
                if (contribution(logsFor(history, habit.optInt("id")).get(key)) > 0) dayCompleted++;
            }
            weeklyTotal += dayTotal;
            weeklyCompleted += dayCompleted;
            rates.put(percent(dayCompleted, dayTotal));
        }
        snapshot.put("weeklyConsistency", new JSONObject().put("dayLabels", labels).put("dayRates", rates).put("percent", percent(weeklyCompleted, weeklyTotal)));
        JSONArray locked = new JSONArray();
        JSONObject dependencies = snapshot.optJSONObject("lockDependencies");
        if (dependencies != null) {
            java.util.Iterator<String> keys = dependencies.keys();
            while (keys.hasNext()) {
                String key = keys.next();
                JSONArray blockers = dependencies.optJSONArray(key);
                if (blockers == null) continue;
                for (int i = 0; i < blockers.length(); i++) {
                    if (!Boolean.TRUE.equals(completions.get(blockers.optInt(i)))) {
                        try { locked.put(Integer.parseInt(key)); } catch (NumberFormatException ignored) { }
                        break;
                    }
                }
            }
        }
        return snapshot.put("lockedHabitIds", locked);
    }

    static void applyValue(JSONObject source, int habitId, String day, Object value) throws JSONException {
        JSONArray logs = source.optJSONArray("logs");
        if (logs == null) logs = new JSONArray();
        JSONArray updated = new JSONArray();
        for (int i = 0; i < logs.length(); i++) {
            JSONObject log = logs.optJSONObject(i);
            if (log != null && !(log.optInt("habitId") == habitId && day.equals(log.optString("dayKey")))) updated.put(log);
        }
        if (contribution(value) > 0) updated.put(new JSONObject().put("habitId", habitId).put("dayKey", day).put("value", value));
        source.put("logs", updated);
    }

    static double contribution(Object value) {
        return Boolean.TRUE.equals(value) ? 1 : value instanceof Number ? Math.max(0, ((Number) value).doubleValue()) : 0;
    }

    static Double nextValue(double current, double periodValue, double target, boolean increment, int amount) {
        if (increment) return current + Math.max(1, amount);
        if (target <= 0) return null;
        if (periodValue >= target) return current > 0 ? 0d : null;
        return current + Math.max(0, target - periodValue);
    }

    private static Map<String, Object> logsFor(Map<Integer, Map<String, Object>> history, int id) {
        Map<String, Object> days = history.get(id);
        return days == null ? Collections.emptyMap() : days;
    }

    private static int compareItems(JSONObject a, JSONObject b) {
        int done = Boolean.compare(a.optBoolean("done"), b.optBoolean("done"));
        return done != 0 ? done : a.optString("title").compareToIgnoreCase(b.optString("title"));
    }

    private static JSONArray array(List<JSONObject> items, int limit) {
        JSONArray result = new JSONArray();
        for (int i = 0; i < Math.min(limit, items.size()); i++) result.put(items.get(i));
        return result;
    }

    private static int percent(int completed, int total) { return total == 0 ? 0 : (int) Math.round(100d * completed / total); }
    private static String number(double value) { return value == (long) value ? Long.toString((long) value) : Double.toString(value); }

    private static boolean allowedWeekday(JSONObject schedule, Calendar day) {
        JSONArray weekdays = schedule.optJSONArray("allowedWeekdays");
        if (weekdays == null || weekdays.length() == 0) return true;
        for (int i = 0; i < weekdays.length(); i++) if (weekdays.optInt(i, -1) == day.get(Calendar.DAY_OF_WEEK) - 1) return true;
        return false;
    }

    private static Calendar periodStartCalendar(Calendar day, String period) {
        Calendar start = (Calendar) day.clone();
        if ("month".equals(period)) start.set(Calendar.DATE, 1);
        if ("week".equals(period)) start.add(Calendar.DATE, -((start.get(Calendar.DAY_OF_WEEK) + 5) % 7));
        return start;
    }

    private static String periodStart(Calendar day, String period) { return dayKey(periodStartCalendar(day, period)); }

    private static double sum(Map<String, Object> days, String start, String end) {
        double result = 0;
        for (Map.Entry<String, Object> log : days.entrySet()) if (log.getKey().compareTo(start) >= 0 && log.getKey().compareTo(end) <= 0) result += contribution(log.getValue());
        return result;
    }

    private static int currentStreak(Map<String, Object> days, Calendar now) {
        Calendar day = (Calendar) now.clone();
        if (contribution(days.get(dayKey(day))) <= 0) day.add(Calendar.DATE, -1);
        int count = 0;
        while (contribution(days.get(dayKey(day))) > 0) { count++; day.add(Calendar.DATE, -1); }
        return count;
    }

    private static int longestStreak(Map<String, Object> days, String today) {
        TreeSet<String> keys = new TreeSet<>();
        for (Map.Entry<String, Object> log : days.entrySet()) if (contribution(log.getValue()) > 0 && log.getKey().compareTo(today) <= 0) keys.add(log.getKey());
        String expected = "";
        int count = 0;
        int longest = 0;
        for (String key : keys) {
            if (!key.matches("\\d{4}-\\d{2}-\\d{2}")) continue;
            count = key.equals(expected) ? count + 1 : 1;
            longest = Math.max(longest, count);
            Calendar date = Calendar.getInstance();
            date.clear();
            date.set(Integer.parseInt(key.substring(0, 4)), Integer.parseInt(key.substring(5, 7)) - 1, Integer.parseInt(key.substring(8, 10)), 12, 0);
            expected = dayKey(shift(date, 1));
        }
        return longest;
    }
}
