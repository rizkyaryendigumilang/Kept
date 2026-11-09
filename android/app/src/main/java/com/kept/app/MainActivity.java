package com.kept.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(KeptHcePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
