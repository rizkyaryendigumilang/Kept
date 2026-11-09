package com.kept.app;

import android.content.Context;
import android.content.pm.PackageManager;
import android.nfc.NfcAdapter;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * KeptHcePlugin
 * Capacitor bridge exposing Host Card Emulation (HCE) management to the web app.
 */
@CapacitorPlugin(name = "KeptHce")
public class KeptHcePlugin extends Plugin {

    @PluginMethod
    public void isHceSupported(PluginCall call) {
        Context context = getContext();
        NfcAdapter nfcAdapter = NfcAdapter.getDefaultAdapter(context);

        boolean hasNfc = nfcAdapter != null;
        boolean isEnabled = hasNfc && nfcAdapter.isEnabled();
        boolean hasHce = context.getPackageManager().hasSystemFeature(PackageManager.FEATURE_NFC_HOST_CARD_EMULATION);

        JSObject ret = new JSObject();
        ret.put("supported", hasNfc && hasHce);
        ret.put("enabled", isEnabled);
        ret.put("hasNfcHardware", hasNfc);
        ret.put("hasHceFeature", hasHce);
        call.resolve(ret);
    }

    @PluginMethod
    public void setActiveCard(PluginCall call) {
        String id = call.getString("id", "");
        String name = call.getString("name", "Kept Card");
        String uid = call.getString("uid", "04A9723CEF51");
        String payload = call.getString("payload", "");

        KeptCardEmulationService.setActiveCard(id, name, uid, payload);

        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("active", true);
        ret.put("name", name);
        ret.put("uid", uid);
        call.resolve(ret);
    }

    @PluginMethod
    public void clearActiveCard(PluginCall call) {
        KeptCardEmulationService.clearActiveCard();

        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("active", false);
        call.resolve(ret);
    }

    @PluginMethod
    public void getHceStatus(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("isEmulating", KeptCardEmulationService.isEmulating());
        ret.put("activeCardName", KeptCardEmulationService.getActiveCardName());
        ret.put("activeCardUid", KeptCardEmulationService.getActiveCardUid());
        call.resolve(ret);
    }
}
