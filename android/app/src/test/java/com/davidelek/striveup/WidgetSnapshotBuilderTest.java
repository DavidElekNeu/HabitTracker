package com.davidelek.striveup;

import org.junit.Test;
import static org.junit.Assert.*;
import java.util.Calendar;
import java.util.TimeZone;
import org.json.JSONArray;
import org.json.JSONObject;

public class WidgetSnapshotBuilderTest {
    private Calendar day(int year, int month, int date) {
        Calendar day = Calendar.getInstance(TimeZone.getTimeZone("Europe/Budapest"));
        day.clear();
        day.set(year, month - 1, date, 12, 0);
        return day;
    }

    private JSONObject snapshot() throws Exception {
        return new JSONObject("{source:{habits:[{id:1,title:'Walk',type:'binary',createdDayKey:'2026-01-01',schedule:{frequencyPeriod:'day'}}],logs:[]}}");
    }

    @Test public void rollsOverWithoutOpeningAppAndKeepsYesterdayHistory() throws Exception {
        JSONObject snapshot = snapshot();
        WidgetSnapshotBuilder.applyValue(snapshot.getJSONObject("source"), 1, "2026-09-25", true);
        JSONObject today = WidgetSnapshotBuilder.build(snapshot, day(2026, 9, 25));
        assertEquals(100, today.getJSONObject("dailyProgress").getInt("percent"));
        JSONObject tomorrow = WidgetSnapshotBuilder.build(snapshot, day(2026, 9, 26));
        assertEquals("2026-09-26", tomorrow.getString("dayKey"));
        assertEquals(0, tomorrow.getJSONObject("dailyProgress").getInt("percent"));
        assertEquals(1, tomorrow.getJSONObject("streak").getInt("current"));
        assertEquals(100, tomorrow.getJSONObject("weeklyConsistency").getJSONArray("dayRates").getInt(5));
        assertEquals(0, WidgetSnapshotBuilder.build(snapshot, day(2026, 9, 27)).getJSONObject("streak").getInt("current"));
    }

    @Test public void recalculatesWeekdayList() throws Exception {
        JSONObject snapshot = snapshot();
        snapshot.getJSONObject("source").getJSONArray("habits").getJSONObject(0).getJSONObject("schedule").put("allowedWeekdays", new JSONArray("[5]"));
        WidgetSnapshotBuilder.applyValue(snapshot.getJSONObject("source"), 1, "2026-09-18", true);
        assertEquals(1, WidgetSnapshotBuilder.build(snapshot, day(2026, 9, 25)).getJSONObject("dailyProgress").getInt("total"));
        assertEquals(0, WidgetSnapshotBuilder.build(snapshot, day(2026, 9, 26)).getJSONObject("dailyProgress").getInt("total"));
    }

    @Test public void retainsWeeklyCompletionUntilMonday() throws Exception {
        JSONObject snapshot = snapshot();
        snapshot.getJSONObject("source").getJSONArray("habits").getJSONObject(0).getJSONObject("schedule").put("frequencyPeriod", "week");
        WidgetSnapshotBuilder.applyValue(snapshot.getJSONObject("source"), 1, "2026-09-25", true);
        assertTrue(WidgetSnapshotBuilder.build(snapshot, day(2026, 9, 27)).getJSONArray("focusHabits").getJSONObject(0).getBoolean("done"));
        assertFalse(WidgetSnapshotBuilder.build(snapshot, day(2026, 9, 28)).getJSONArray("focusHabits").getJSONObject(0).getBoolean("done"));
    }

    @Test public void retainsMonthlyQuantityUntilNextMonth() throws Exception {
        JSONObject snapshot = snapshot();
        JSONObject habit = snapshot.getJSONObject("source").getJSONArray("habits").getJSONObject(0);
        habit.put("type", "quantitative");
        habit.getJSONObject("schedule").put("frequencyPeriod", "month").put("dailyTargetValue", 5);
        WidgetSnapshotBuilder.applyValue(snapshot.getJSONObject("source"), 1, "2026-09-24", 2);
        WidgetSnapshotBuilder.applyValue(snapshot.getJSONObject("source"), 1, "2026-09-25", 3);
        assertTrue(WidgetSnapshotBuilder.build(snapshot, day(2026, 9, 30)).getJSONArray("focusHabits").getJSONObject(0).getBoolean("done"));
        assertFalse(WidgetSnapshotBuilder.build(snapshot, day(2026, 10, 1)).getJSONArray("focusHabits").getJSONObject(0).getBoolean("done"));
    }

    @Test public void valuesAreIdempotentAndUndoRemovesOnlyOriginalDay() throws Exception {
        JSONObject source = snapshot().getJSONObject("source");
        WidgetSnapshotBuilder.applyValue(source, 1, "2026-09-25", 3);
        WidgetSnapshotBuilder.applyValue(source, 1, "2026-09-25", 3);
        WidgetSnapshotBuilder.applyValue(source, 1, "2026-09-26", true);
        assertEquals(2, source.getJSONArray("logs").length());
        WidgetSnapshotBuilder.applyValue(source, 1, "2026-09-25", false);
        assertEquals("2026-09-26", source.getJSONArray("logs").getJSONObject(0).getString("dayKey"));
    }

    @Test public void resetsLocksAndQuickAddAtMidnight() throws Exception {
        JSONObject snapshot = snapshot();
        snapshot.put("lockDependencies", new JSONObject("{'2':[1]}"));
        JSONObject source = snapshot.getJSONObject("source");
        source.getJSONArray("habits").put(new JSONObject("{id:2,title:'Read',type:'quantitative',createdDayKey:'2026-01-01',schedule:{dailyTargetValue:10}}"));
        WidgetSnapshotBuilder.applyValue(source, 1, "2026-09-25", true);
        WidgetSnapshotBuilder.applyValue(source, 2, "2026-09-25", 4);
        assertEquals(0, WidgetSnapshotBuilder.build(snapshot, day(2026, 9, 25)).getJSONArray("lockedHabitIds").length());
        JSONObject tomorrow = WidgetSnapshotBuilder.build(snapshot, day(2026, 9, 26));
        assertEquals(2, tomorrow.getJSONArray("lockedHabitIds").getInt(0));
        assertEquals(0, tomorrow.getJSONArray("quickAdd").getJSONObject(0).getInt("current"));
    }

    @Test public void streakSurvivesDstTransitionAndYearBoundary() throws Exception {
        JSONObject snapshot = snapshot();
        JSONObject source = snapshot.getJSONObject("source");
        for (String date : new String[]{"2026-10-24", "2026-10-25", "2026-10-26"}) WidgetSnapshotBuilder.applyValue(source, 1, date, true);
        assertEquals(3, WidgetSnapshotBuilder.build(snapshot, day(2026, 10, 26)).getJSONObject("streak").getInt("current"));
        for (String date : new String[]{"2026-12-31", "2027-01-01"}) WidgetSnapshotBuilder.applyValue(source, 1, date, true);
        assertEquals(2, WidgetSnapshotBuilder.build(snapshot, day(2027, 1, 1)).getJSONObject("streak").getInt("current"));
    }

    @Test public void totalsIncludeMoreThanSixVisibleHabits() throws Exception {
        JSONObject snapshot = snapshot();
        JSONArray habits = snapshot.getJSONObject("source").getJSONArray("habits");
        for (int id = 2; id <= 9; id++) habits.put(new JSONObject(habits.getJSONObject(0).toString()).put("id", id));
        JSONObject result = WidgetSnapshotBuilder.build(snapshot, day(2026, 9, 25));
        assertEquals(9, result.getJSONObject("dailyProgress").getInt("total"));
        assertEquals(6, result.getJSONArray("todayHabits").length());
    }

    @Test public void newWeeklyHabitUsesProratedTargetAndPeriodProgress() throws Exception {
        JSONObject snapshot = snapshot();
        JSONObject source = snapshot.getJSONObject("source");
        JSONObject habit = source.getJSONArray("habits").getJSONObject(0);
        habit.put("type", "quantitative").put("createdDayKey", "2026-09-25");
        habit.getJSONObject("schedule").put("frequencyPeriod", "week").put("dailyTargetValue", 70);
        WidgetSnapshotBuilder.applyValue(source, 1, "2026-09-25", 30);
        JSONObject result = WidgetSnapshotBuilder.build(snapshot, day(2026, 9, 26));
        assertTrue(result.getJSONArray("focusHabits").getJSONObject(0).getBoolean("done"));
        assertEquals(30, result.getJSONArray("quickAdd").getJSONObject(0).getInt("target"));
        assertEquals(30, result.getJSONArray("quickAdd").getJSONObject(0).getInt("current"));
    }

    @Test public void partialFrequencyProgressIsNotMarkedComplete() throws Exception {
        JSONObject snapshot = snapshot();
        JSONObject habit = snapshot.getJSONObject("source").getJSONArray("habits").getJSONObject(0);
        habit.put("type", "frequency");
        habit.getJSONObject("schedule").put("frequencyCount", 3).put("frequencyPeriod", "week");
        WidgetSnapshotBuilder.applyValue(snapshot.getJSONObject("source"), 1, "2026-09-25", 1);
        assertFalse(WidgetSnapshotBuilder.build(snapshot, day(2026, 9, 25)).getJSONArray("focusHabits").getJSONObject(0).getBoolean("done"));
    }

    @Test public void completingPeriodAddsOnlyMissingAmountAndDoesNotUndoAnotherDay() {
        assertEquals(30d, WidgetSnapshotBuilder.nextValue(10, 50, 70, false, 1), 0.001);
        assertNull(WidgetSnapshotBuilder.nextValue(0, 70, 70, false, 1));
        assertEquals(0d, WidgetSnapshotBuilder.nextValue(10, 70, 70, false, 1), 0.001);
        assertEquals(11d, WidgetSnapshotBuilder.nextValue(10, 50, 70, true, 1), 0.001);
    }
}
