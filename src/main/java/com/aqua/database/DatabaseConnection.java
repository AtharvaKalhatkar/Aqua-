package com.aqua.database;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.Comparator;

/**
 * Singleton SQLite connection. DB file created in app directory.
 * (Primary Offline Database)
 */
public class DatabaseConnection {

    private static final String DB_DIR = System.getProperty("user.home") + File.separator + ".aqua_management";
    private static final String DB_FILE = DB_DIR + File.separator + "aqua_management.db";
    private static final String URL = "jdbc:sqlite:" + DB_FILE;
    private static Connection connection;
    private static boolean initialized = false;

    private DatabaseConnection() {}

    public static Connection getConnection() throws SQLException {
        if (connection == null || connection.isClosed()) {
            // Explicitly load SQLite driver to override any service loading shading issues
            try { Class.forName("org.sqlite.JDBC"); } catch (Exception ignored) {}
            
            // Ensure storage directory exists
            File storageDir = new File(DB_DIR);
            if (!storageDir.exists()) {
                storageDir.mkdirs();
            }
            
            connection = DriverManager.getConnection(URL);
            try (Statement stmt = connection.createStatement()) {
                stmt.execute("PRAGMA foreign_keys = ON");
            }
            if (!initialized) {
                initializeDatabase();
                initialized = true;
                // Run resilient auto-backup asynchronously on first connect to preserve performance!
                new Thread(DatabaseConnection::triggerAutoBackup).start();
            }
        }
        return connection;
    }

    private static void triggerAutoBackup() {
        try {
            File source = new File(DB_FILE);
            if (!source.exists()) return;

            String backupDirPath = DB_DIR + File.separator + "backups";
            File backupDir = new File(backupDirPath);
            if (!backupDir.exists()) {
                backupDir.mkdirs();
            }

            // Generate high-precision timestamped filename
            String stamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            File target = new File(backupDirPath + File.separator + "backup_" + stamp + ".db");

            // Asynchronous copy
            Files.copy(source.toPath(), target.toPath(), StandardCopyOption.REPLACE_EXISTING);
            System.out.println("🛡️ System Backup Locked: " + target.getName());

            // Rotation Safeguard: Retain only the last 10 backups to keep disk clean!
            File[] backupFiles = backupDir.listFiles((dir, name) -> name.startsWith("backup_") && name.endsWith(".db"));
            if (backupFiles != null && backupFiles.length > 10) {
                Arrays.sort(backupFiles, Comparator.comparingLong(File::lastModified));
                for (int i = 0; i < backupFiles.length - 10; i++) {
                    if (backupFiles[i].delete()) {
                        System.out.println("🧹 Auto-Pruned Stale Backup: " + backupFiles[i].getName());
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("⚠️ Database Backup Safe Hook Encountered: " + e.getMessage());
        }
    }

    private static void initializeDatabase() {
        try (Statement stmt = connection.createStatement()) {
            stmt.executeUpdate("""
                CREATE TABLE IF NOT EXISTS customers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    address TEXT,
                    mobile TEXT,
                    route TEXT DEFAULT '',
                    email TEXT DEFAULT '',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    sync_status TEXT DEFAULT 'PENDING'
                )""");

            try { stmt.executeUpdate("ALTER TABLE customers ADD COLUMN route TEXT DEFAULT ''"); } catch (Exception ignored) {}
            try { stmt.executeUpdate("ALTER TABLE customers ADD COLUMN email TEXT DEFAULT ''"); } catch (Exception ignored) {}
            try { stmt.executeUpdate("ALTER TABLE customers ADD COLUMN updated_at TIMESTAMP"); } catch (Exception ignored) {}
            try { stmt.executeUpdate("UPDATE customers SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL"); } catch (Exception ignored) {}
            try { stmt.executeUpdate("ALTER TABLE customers ADD COLUMN sync_status TEXT DEFAULT 'PENDING'"); } catch (Exception ignored) {}

            stmt.executeUpdate("""
                CREATE TABLE IF NOT EXISTS deliveries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    customer_id INTEGER NOT NULL,
                    delivery_date TEXT NOT NULL,
                    jar_qty INTEGER DEFAULT 0,
                    bottle_qty INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    sync_status TEXT DEFAULT 'PENDING',
                    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
                )""");

            try { stmt.executeUpdate("ALTER TABLE deliveries ADD COLUMN updated_at TIMESTAMP"); } catch (Exception ignored) {}
            try { stmt.executeUpdate("UPDATE deliveries SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL"); } catch (Exception ignored) {}
            try { stmt.executeUpdate("ALTER TABLE deliveries ADD COLUMN sync_status TEXT DEFAULT 'PENDING'"); } catch (Exception ignored) {}

            stmt.executeUpdate("""
                CREATE TABLE IF NOT EXISTS bills (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    customer_id INTEGER NOT NULL,
                    bill_month INTEGER NOT NULL,
                    bill_year INTEGER NOT NULL,
                    total_jars INTEGER DEFAULT 0,
                    total_bottles INTEGER DEFAULT 0,
                    jar_rate REAL DEFAULT 0.00,
                    bottle_rate REAL DEFAULT 0.00,
                    jar_amount REAL DEFAULT 0.00,
                    bottle_amount REAL DEFAULT 0.00,
                    grand_total REAL DEFAULT 0.00,
                    status TEXT DEFAULT 'PENDING',
                    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    sync_status TEXT DEFAULT 'PENDING',
                    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
                    UNIQUE (customer_id, bill_month, bill_year)
                )""");

            try { stmt.executeUpdate("ALTER TABLE bills ADD COLUMN updated_at TIMESTAMP"); } catch (Exception ignored) {}
            try { stmt.executeUpdate("UPDATE bills SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL"); } catch (Exception ignored) {}
            try { stmt.executeUpdate("ALTER TABLE bills ADD COLUMN sync_status TEXT DEFAULT 'PENDING'"); } catch (Exception ignored) {}

            stmt.executeUpdate("CREATE INDEX IF NOT EXISTS idx_delivery_date ON deliveries(delivery_date)");
            stmt.executeUpdate("CREATE INDEX IF NOT EXISTS idx_delivery_customer ON deliveries(customer_id, delivery_date)");
            stmt.executeUpdate("CREATE INDEX IF NOT EXISTS idx_bill_month ON bills(bill_month, bill_year)");

            // Triggers for auto-updating sync_status and updated_at on modification
            stmt.executeUpdate("""
                CREATE TRIGGER IF NOT EXISTS update_customer_sync
                AFTER UPDATE ON customers
                FOR EACH ROW WHEN NEW.sync_status != 'PENDING' AND OLD.sync_status == NEW.sync_status
                BEGIN
                    UPDATE customers SET sync_status = 'PENDING', updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
                END;
            """);

            stmt.executeUpdate("""
                CREATE TRIGGER IF NOT EXISTS update_delivery_sync
                AFTER UPDATE ON deliveries
                FOR EACH ROW WHEN NEW.sync_status != 'PENDING' AND OLD.sync_status == NEW.sync_status
                BEGIN
                    UPDATE deliveries SET sync_status = 'PENDING', updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
                END;
            """);

            stmt.executeUpdate("""
                CREATE TRIGGER IF NOT EXISTS update_bill_sync
                AFTER UPDATE ON bills
                FOR EACH ROW WHEN NEW.sync_status != 'PENDING' AND OLD.sync_status == NEW.sync_status
                BEGIN
                    UPDATE bills SET sync_status = 'PENDING', updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
                END;
            """);

            System.out.println("Local Database ready: " + DB_FILE);
        } catch (SQLException e) {
            System.err.println("DB init error: " + e.getMessage());
        }
    }

    public static void closeConnection() {
        try {
            if (connection != null && !connection.isClosed()) { connection.close(); }
        } catch (SQLException e) { System.err.println("Error closing DB: " + e.getMessage()); }
    }
}
