package com.kept.app;

import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Enforce anti-screen capture / screenshot blocking on Android for Zero-Knowledge personal vault
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
        registerPlugin(KeptHcePlugin.class);
        super.onCreate(savedInstanceState);
    }
}

