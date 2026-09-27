package com.davidelek.striveup;

public final class WidgetConstants {
    public static final String PREFS_NAME = "habit_widget_store";
    public static final String SNAPSHOT_KEY = "snapshot_json";
    public static final String ACTION_QUEUE_KEY = "pending_actions_json";
    public static final String FOCUSED_HABIT_ID_KEY = "focused_habit_id";

    public static final String ACTION_WIDGET_INTERACTION = "com.davidelek.striveup.WIDGET_INTERACTION";
    public static final String EXTRA_ACTION_TYPE = "widget_action_type";
    public static final String EXTRA_HABIT_ID = "habit_id";
    public static final String EXTRA_AMOUNT = "amount";
    public static final String EXTRA_ORIGIN = "origin";

    public static final String ACTION_TOGGLE_HABIT = "toggle_habit";
    public static final String ACTION_INCREMENT_HABIT = "increment_habit";
    public static final String ACTION_CYCLE_FOCUS_HABIT = "cycle_focus_habit";

    private WidgetConstants() {}
}
