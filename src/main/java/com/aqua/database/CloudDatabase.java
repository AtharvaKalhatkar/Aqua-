package com.aqua.database;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Properties;

/**
 * Singleton PostgreSQL connection to Supabase.
 * Used exclusively for syncing data from the local SQLite database.
 */
public class CloudDatabase {

    private static final String DB_DIR = System.getProperty("user.home") + File.separator + ".aqua_management";
    private static final String CONFIG_FILE = DB_DIR + File.separator + "db.properties";
    private static Connection connection;
    private static boolean initialized = false;

    private CloudDatabase() {}

    private static Properties loadProperties() {
        Properties props = new Properties();
        File file = new File(CONFIG_FILE);
        if (!file.exists()) {
            return props;
        }
        try (FileInputStream in = new FileInputStream(file)) {
            props.load(in);
        } catch (IOException e) {
            System.err.println("Failed to read " + CONFIG_FILE);
        }
        return props;
    }

    public static Connection getConnection() throws SQLException {
        if (connection == null || connection.isClosed()) {
            Properties props = loadProperties();
            String url = props.getProperty("db.url");
            String user = props.getProperty("db.user");
            String pass = props.getProperty("db.password");
            
            if (url == null || pass == null || pass.equals("[YOUR-PASSWORD]")) {
                throw new SQLException("Cloud Database credentials not configured in db.properties");
            }
            
            connection = DriverManager.getConnection(url, user, pass);
            if (!initialized) {
                initializeCloudSchema();
                initialized = true;
            }
        }
        return connection;
    }

    private static void initializeCloudSchema() {
        try (Statement stmt = connection.createStatement()) {
            stmt.executeUpdate("""
                CREATE TABLE IF NOT EXISTS customers (
                    id INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    address TEXT,
                    mobile TEXT,
                    route TEXT DEFAULT '',
                    email TEXT DEFAULT '',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )""");

            stmt.executeUpdate("""
                CREATE TABLE IF NOT EXISTS deliveries (
                    id INTEGER PRIMARY KEY,
                    customer_id INTEGER NOT NULL,
                    delivery_date TEXT NOT NULL,
                    jar_qty INTEGER DEFAULT 0,
                    bottle_qty INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )""");

            stmt.executeUpdate("""
                CREATE TABLE IF NOT EXISTS bills (
                    id INTEGER PRIMARY KEY,
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
                    UNIQUE (customer_id, bill_month, bill_year)
                )""");
                
            System.out.println("Cloud Schema Validated.");
        } catch (SQLException e) {
            System.err.println("Cloud Schema init error: " + e.getMessage());
        }
    }

    public static void closeConnection() {
        try {
            if (connection != null && !connection.isClosed()) { connection.close(); }
        } catch (SQLException e) { System.err.println("Error closing Cloud DB: " + e.getMessage()); }
    }
}
