package com.davidelek.striveup;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register local Capacitor plugins before BridgeActivity initializes.
        registerPlugin(HabitWidgetsPlugin.class);
        registerPlugin(DailyLessonsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
