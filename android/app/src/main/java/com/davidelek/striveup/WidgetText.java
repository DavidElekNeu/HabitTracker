package com.davidelek.striveup;

import org.json.JSONObject;

final class WidgetText {
    private WidgetText() {}

    static boolean isHungarian(JSONObject snapshot) {
        return snapshot == null || !"en".equals(snapshot.optString("language", "hu"));
    }

    static String get(JSONObject snapshot, String hu, String en) {
        return isHungarian(snapshot) ? hu : en;
    }
}
