package com.kept.app;

import android.nfc.cardemulation.HostApduService;
import android.os.Bundle;
import android.util.Log;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

/**
 * KeptCardEmulationService
 * Standard Android Host Card Emulation (HCE) service conforming to ISO 7816-4.
 * Enables smart readers to read virtual passes and card tokens directly from the device.
 */
public class KeptCardEmulationService extends HostApduService {

    private static final String TAG = "KeptHceService";

    // ISO 7816-4 Status Words
    private static final byte[] STATUS_SUCCESS = new byte[] { (byte) 0x90, (byte) 0x00 };
    private static final byte[] STATUS_FAILED = new byte[] { (byte) 0x6F, (byte) 0x00 };
    private static final byte[] STATUS_CLA_NOT_SUPPORTED = new byte[] { (byte) 0x6E, (byte) 0x00 };
    private static final byte[] STATUS_INS_NOT_SUPPORTED = new byte[] { (byte) 0x6D, (byte) 0x00 };

    // ISO 7816-4 SELECT command header: CLA=0x00, INS=0xA4, P1=0x04, P2=0x00
    private static final byte[] SELECT_HEADER = new byte[] { (byte) 0x00, (byte) 0xA4, (byte) 0x04, (byte) 0x00 };

    // Active Card in-memory state
    private static volatile String sActiveCardId = "";
    private static volatile String sActiveCardName = "Kept Pass";
    private static volatile String sActiveCardUid = "04A9723CEF51";
    private static volatile String sActiveCardPayload = "KEPT-VAULT-ACCESS";
    private static volatile boolean sIsActive = false;

    public static synchronized void setActiveCard(String id, String name, String uid, String payload) {
        sActiveCardId = id != null ? id : "";
        sActiveCardName = name != null ? name : "Kept Pass";
        sActiveCardUid = uid != null ? uid : "04A9723CEF51";
        sActiveCardPayload = payload != null ? payload : "KEPT-VAULT-ACCESS";
        sIsActive = true;
        Log.i(TAG, "Active HCE Card set: " + sActiveCardName + " (UID: " + sActiveCardUid + ")");
    }

    public static synchronized void clearActiveCard() {
        sActiveCardId = "";
        sActiveCardName = "";
        sActiveCardUid = "";
        sActiveCardPayload = "";
        sIsActive = false;
        Log.i(TAG, "Active HCE Card cleared");
    }

    public static boolean isEmulating() {
        return sIsActive;
    }

    public static String getActiveCardName() {
        return sActiveCardName;
    }

    public static String getActiveCardUid() {
        return sActiveCardUid;
    }

    @Override
    public byte[] processCommandApdu(byte[] commandApdu, Bundle extras) {
        if (commandApdu == null || commandApdu.length < 4) {
            return STATUS_FAILED;
        }

        Log.d(TAG, "Received APDU length: " + commandApdu.length);

        // Check if SELECT command
        boolean isSelect = commandApdu[0] == SELECT_HEADER[0] &&
                           commandApdu[1] == SELECT_HEADER[1] &&
                           commandApdu[2] == SELECT_HEADER[2] &&
                           commandApdu[3] == SELECT_HEADER[3];

        if (isSelect) {
            Log.i(TAG, "SELECT AID command recognized. Emulating card: " + sActiveCardName);
            
            // Format response: Active Card UID / Payload followed by 0x90 0x00
            String responseStr = sIsActive 
                ? (sActiveCardUid + ":" + sActiveCardPayload) 
                : "KEPT:STANDBY";
            
            byte[] responseData = responseStr.getBytes(StandardCharsets.UTF_8);
            byte[] responseWithStatus = new byte[responseData.length + STATUS_SUCCESS.length];
            System.arraycopy(responseData, 0, responseWithStatus, 0, responseData.length);
            System.arraycopy(STATUS_SUCCESS, 0, responseWithStatus, responseData.length, STATUS_SUCCESS.length);
            
            return responseWithStatus;
        }

        // Generic read / ping command: return active payload
        byte[] payloadData = (sActiveCardUid).getBytes(StandardCharsets.UTF_8);
        byte[] result = new byte[payloadData.length + STATUS_SUCCESS.length];
        System.arraycopy(payloadData, 0, result, 0, payloadData.length);
        System.arraycopy(STATUS_SUCCESS, 0, result, payloadData.length, STATUS_SUCCESS.length);
        return result;
    }

    @Override
    public void onDeactivated(int reason) {
        Log.i(TAG, "HCE Deactivated. Reason: " + (reason == DEACTIVATION_LINK_LOSS ? "LINK_LOSS" : "DESELECTED"));
    }
}
