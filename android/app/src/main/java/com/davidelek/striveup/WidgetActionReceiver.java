package com.davidelek.striveup;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import org.json.JSONArray;
import org.json.JSONObject;

public class WidgetActionReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !WidgetConstants.ACTION_WIDGET_INTERACTION.equals(intent.getAction())) {
            return;
        }

        String actionType = intent.getStringExtra(WidgetConstants.EXTRA_ACTION_TYPE);
        int habitId = intent.getIntExtra(WidgetConstants.EXTRA_HABIT_ID, -1);
        int amount = intent.getIntExtra(WidgetConstants.EXTRA_AMOUNT, 1);
        String origin = intent.getStringExtra(WidgetConstants.EXTRA_ORIGIN);

        if (actionType == null || actionType.trim().isEmpty()) {
            return;
        }

        if (WidgetConstants.ACTION_CYCLE_FOCUS_HABIT.equals(actionType)) {
            cycleFocusedHabit(context);
            WidgetUpdater.updateAllWidgets(context);
            return;
        }

        if (habitId > 0) {
            WidgetStore.applyHabitAction(context, actionType, habitId, amount, origin);
        }

        WidgetUpdater.updateAllWidgets(context);
    }

    private void cycleFocusedHabit(Context context) {
        JSONObject snapshot = WidgetStore.readSnapshot(context);
        JSONArray focusHabits = snapshot.optJSONArray("focusHabits");
        if (focusHabits == null || focusHabits.length() == 0) {
            WidgetStore.clearFocusedHabitId(context);
            return;
        }

        int currentId = WidgetStore.readFocusedHabitId(context);
        int nextIndex = 0;
        for (int i = 0; i < focusHabits.length(); i++) {
            if (readHabitId(focusHabits, i) == currentId) {
                nextIndex = (i + 1) % focusHabits.length();
                break;
            }
        }

        int nextHabitId = readHabitId(focusHabits, nextIndex);
        if (nextHabitId > 0) {
            WidgetStore.saveFocusedHabitId(context, nextHabitId);
        } else {
            WidgetStore.clearFocusedHabitId(context);
        }
    }

    private int readHabitId(JSONArray list, int index) {
        JSONObject item = list.optJSONObject(index);
        return item != null ? item.optInt("habitId", -1) : -1;
    }

}
