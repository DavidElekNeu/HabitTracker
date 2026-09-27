package com.davidelek.striveup;

import org.junit.Test;
import static org.junit.Assert.*;
import java.util.Calendar;
import java.util.TimeZone;

public class DailyLessonScheduleTest {
    private Calendar at(int month, int day, int hour) {
        Calendar now = Calendar.getInstance(TimeZone.getTimeZone("Europe/Budapest"));
        now.clear();
        now.set(2026, month - 1, day, hour, 0);
        return now;
    }

    @Test public void schedulesTodayAtThree() {
        Calendar next = DailyLessonReceiver.nextDelivery(at(9, 25, 10), "");
        assertEquals(25, next.get(Calendar.DATE));
        assertEquals(15, next.get(Calendar.HOUR_OF_DAY));
    }

    @Test public void catchesUpWithinAfternoonAndDoesNotDuplicate() {
        Calendar now = at(9, 25, 16);
        assertEquals(60_000, DailyLessonReceiver.nextDelivery(now, "").getTimeInMillis() - now.getTimeInMillis());
        Calendar next = DailyLessonReceiver.nextDelivery(now, "2026-09-25");
        assertEquals(26, next.get(Calendar.DATE));
        assertEquals(15, next.get(Calendar.HOUR_OF_DAY));
    }

    @Test public void skipsOvernightBacklogAndRespectsDst() {
        Calendar now = at(10, 24, 19);
        Calendar next = DailyLessonReceiver.nextDelivery(now, "");
        assertEquals(25, next.get(Calendar.DATE));
        assertEquals(15, next.get(Calendar.HOUR_OF_DAY));
        assertEquals(21 * 60 * 60 * 1000L, next.getTimeInMillis() - now.getTimeInMillis());
    }
}
