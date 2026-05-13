package com.aqua;
import com.aqua.service.SyncEngine;

public class Launcher {
    public static void main(String[] args) {
        // Safeguard: Run one final synchronous sync block if user closes app suddenly!
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            System.out.println("🛑 APP SHUTDOWN DETECTED: Performing final emergency Cloud Sync...");
            SyncEngine.runSync();
            System.out.println("✅ Final Safeguard Sync Completed. Exiting.");
        }));
        
        App.main(args);
    }
}
