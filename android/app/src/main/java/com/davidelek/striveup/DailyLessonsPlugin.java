package com.davidelek.striveup;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "DailyLessons")
public class DailyLessonsPlugin extends Plugin {
    @PluginMethod
    public void configure(PluginCall call) {
        DailyLessonReceiver.configure(getContext(), Boolean.TRUE.equals(call.getBoolean("enabled", false)));
        call.resolve();
    }

    @PluginMethod
    public void setLanguage(PluginCall call) {
        String language = call.getString("language", "hu");
        DailyLessonReceiver.setLanguage(getContext(), "en".equals(language) ? "en" : "hu");
        call.resolve();
    }
}
