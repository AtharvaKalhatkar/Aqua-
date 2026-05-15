package com.aqua.util;

import java.util.ArrayList;
import java.util.List;
import java.util.prefs.Preferences;

public class VaultManager {
    private static final Preferences prefs = Preferences.userNodeForPackage(VaultManager.class);
    private static final String KEY_LOCKED = "vault_locked";
    private static final List<Runnable> listeners = new ArrayList<>();

    public static boolean isLocked() {
        return prefs.getBoolean(KEY_LOCKED, false); // Defaults to unlocked
    }

    public static void setLocked(boolean locked) {
        prefs.putBoolean(KEY_LOCKED, locked);
        notifyListeners();
    }

    public static void toggle() {
        setLocked(!isLocked());
    }

    public static String mask(String rawValue) {
        if (isLocked()) {
            if (rawValue == null) return "";
            // If value has currency symbol like ₹, preserve it
            if (rawValue.contains("₹")) {
                return "₹ ••••";
            }
            return "••••";
        }
        return rawValue;
    }

    public static void addListener(Runnable listener) {
        listeners.add(listener);
    }

    private static void notifyListeners() {
        for (Runnable r : listeners) {
            try { r.run(); } catch (Exception ignored) {}
        }
    }
}
