package com.davidelek.striveup;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

@CapacitorPlugin(name = "HabitWidgets")
public class HabitWidgetsPlugin extends Plugin {
    @PluginMethod
    public void setWidgetSnapshot(PluginCall call) {
        JSObject snapshot = call.getObject("snapshot");
        if (snapshot == null) {
            call.reject("snapshot is required");
            return;
        }

        try {
            JSONObject json = new JSONObject(snapshot.toString());
            WidgetStore.mergeSnapshot(getContext(), json, call.getArray("acknowledgedActionIds"));
            WidgetStore.reconcileFocusedHabitSelection(getContext(), json);
            WidgetUpdater.updateAllWidgets(getContext());
            call.resolve();
        } catch (JSONException error) {
            call.reject("snapshot is not valid JSON");
        }
    }

    @PluginMethod
    public void consumePendingActions(PluginCall call) {
        JSONArray queue = WidgetStore.consumeActions(getContext());
        JSArray actions = new JSArray();
        for (int i = 0; i < queue.length(); i++) {
            JSONObject action = queue.optJSONObject(i);
            if (action != null) {
                try {
                    actions.put(new JSObject(action.toString()));
                } catch (JSONException ignored) {
                    // Skip malformed queue entries instead of failing the plugin call.
                }
            }
        }
        JSObject result = new JSObject();
        result.put("actions", actions);
        call.resolve(result);
    }
}
