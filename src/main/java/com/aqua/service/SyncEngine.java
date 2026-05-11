package com.aqua.service;

import com.aqua.database.CloudDatabase;
import com.aqua.database.DatabaseConnection;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class SyncEngine {

    private static final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
    private static boolean isSyncing = false;
    private static String lastPullTimestamp = "2000-01-01 00:00:00";

    public static void startAutoSync() {
        // Run sync every 1 minute
        scheduler.scheduleAtFixedRate(() -> {
            try {
                runSync();
            } catch (Exception e) {
                System.err.println("Sync Error: " + e.getMessage());
            }
        }, 5, 60, TimeUnit.SECONDS);
    }

    public static void stopAutoSync() {
        scheduler.shutdownNow();
    }

    public static synchronized void runSync() {
        if (isSyncing) return;
        isSyncing = true;
        
        try {
            Connection localDb = DatabaseConnection.getConnection();
            Connection cloudDb = CloudDatabase.getConnection();
             
            System.out.println("Starting Cloud Sync...");

            // 1. PUSH: Local -> Cloud (Customers)
            pushCustomers(localDb, cloudDb);
            
            // 2. PUSH: Local -> Cloud (Deliveries)
            pushDeliveries(localDb, cloudDb);

            // 3. PUSH: Local -> Cloud (Bills)
            pushBills(localDb, cloudDb);

            // 4. PULL: Cloud -> Local (Driver updates to Deliveries)
            pullDeliveries(localDb, cloudDb);

            // 5. PULL: Cloud -> Local (Driver updates to Bills)
            pullBills(localDb, cloudDb);

            lastPullTimestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
            System.out.println("Cloud Sync Complete.");

        } catch (SQLException e) {
            System.err.println("Database connection failed during sync: " + e.getMessage());
        } finally {
            isSyncing = false;
        }
    }

    private static void pushCustomers(Connection localDb, Connection cloudDb) throws SQLException {
        String selectLocal = "SELECT * FROM customers WHERE sync_status = 'PENDING'";
        String upsertCloud = "INSERT INTO customers (id, name, address, mobile, route, email, created_at, updated_at) " +
                             "VALUES (?, ?, ?, ?, ?, ?, ?, ?) " +
                             "ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, address=EXCLUDED.address, mobile=EXCLUDED.mobile, route=EXCLUDED.route, email=EXCLUDED.email, updated_at=EXCLUDED.updated_at";
        String markSynced = "UPDATE customers SET sync_status = 'SYNCED' WHERE id = ?";

        try (Statement stmt = localDb.createStatement();
             ResultSet rs = stmt.executeQuery(selectLocal);
             PreparedStatement pushStmt = cloudDb.prepareStatement(upsertCloud);
             PreparedStatement updateLocalStmt = localDb.prepareStatement(markSynced)) {

            while (rs.next()) {
                pushStmt.setInt(1, rs.getInt("id"));
                pushStmt.setString(2, rs.getString("name"));
                pushStmt.setString(3, rs.getString("address"));
                pushStmt.setString(4, rs.getString("mobile"));
                pushStmt.setString(5, rs.getString("route"));
                pushStmt.setString(6, rs.getString("email"));
                pushStmt.setString(7, rs.getString("created_at"));
                pushStmt.setString(8, rs.getString("updated_at"));
                pushStmt.executeUpdate();

                updateLocalStmt.setInt(1, rs.getInt("id"));
                updateLocalStmt.executeUpdate();
            }
        }
    }

    private static void pushDeliveries(Connection localDb, Connection cloudDb) throws SQLException {
        String selectLocal = "SELECT * FROM deliveries WHERE sync_status = 'PENDING'";
        String upsertCloud = "INSERT INTO deliveries (id, customer_id, delivery_date, jar_qty, bottle_qty, created_at, updated_at) " +
                             "VALUES (?, ?, ?, ?, ?, ?, ?) " +
                             "ON CONFLICT (id) DO UPDATE SET jar_qty=EXCLUDED.jar_qty, bottle_qty=EXCLUDED.bottle_qty, updated_at=EXCLUDED.updated_at";
        String markSynced = "UPDATE deliveries SET sync_status = 'SYNCED' WHERE id = ?";

        try (Statement stmt = localDb.createStatement();
             ResultSet rs = stmt.executeQuery(selectLocal);
             PreparedStatement pushStmt = cloudDb.prepareStatement(upsertCloud);
             PreparedStatement updateLocalStmt = localDb.prepareStatement(markSynced)) {

            while (rs.next()) {
                pushStmt.setInt(1, rs.getInt("id"));
                pushStmt.setInt(2, rs.getInt("customer_id"));
                pushStmt.setString(3, rs.getString("delivery_date"));
                pushStmt.setInt(4, rs.getInt("jar_qty"));
                pushStmt.setInt(5, rs.getInt("bottle_qty"));
                pushStmt.setString(6, rs.getString("created_at"));
                pushStmt.setString(7, rs.getString("updated_at"));
                pushStmt.executeUpdate();

                updateLocalStmt.setInt(1, rs.getInt("id"));
                updateLocalStmt.executeUpdate();
            }
        }
    }

    private static void pushBills(Connection localDb, Connection cloudDb) throws SQLException {
        String selectLocal = "SELECT * FROM bills WHERE sync_status = 'PENDING'";
        String upsertCloud = "INSERT INTO bills (id, customer_id, bill_month, bill_year, total_jars, total_bottles, jar_rate, bottle_rate, jar_amount, bottle_amount, grand_total, status, generated_at, updated_at) " +
                             "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) " +
                             "ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, updated_at=EXCLUDED.updated_at";
        String markSynced = "UPDATE bills SET sync_status = 'SYNCED' WHERE id = ?";

        try (Statement stmt = localDb.createStatement();
             ResultSet rs = stmt.executeQuery(selectLocal);
             PreparedStatement pushStmt = cloudDb.prepareStatement(upsertCloud);
             PreparedStatement updateLocalStmt = localDb.prepareStatement(markSynced)) {

            while (rs.next()) {
                pushStmt.setInt(1, rs.getInt("id"));
                pushStmt.setInt(2, rs.getInt("customer_id"));
                pushStmt.setInt(3, rs.getInt("bill_month"));
                pushStmt.setInt(4, rs.getInt("bill_year"));
                pushStmt.setInt(5, rs.getInt("total_jars"));
                pushStmt.setInt(6, rs.getInt("total_bottles"));
                pushStmt.setDouble(7, rs.getDouble("jar_rate"));
                pushStmt.setDouble(8, rs.getDouble("bottle_rate"));
                pushStmt.setDouble(9, rs.getDouble("jar_amount"));
                pushStmt.setDouble(10, rs.getDouble("bottle_amount"));
                pushStmt.setDouble(11, rs.getDouble("grand_total"));
                pushStmt.setString(12, rs.getString("status"));
                pushStmt.setString(13, rs.getString("generated_at"));
                pushStmt.setString(14, rs.getString("updated_at"));
                pushStmt.executeUpdate();

                updateLocalStmt.setInt(1, rs.getInt("id"));
                updateLocalStmt.executeUpdate();
            }
        }
    }

    private static void pullDeliveries(Connection localDb, Connection cloudDb) throws SQLException {
        // Mobile app updates delivery quantities
        String selectCloud = "SELECT id, jar_qty, bottle_qty FROM deliveries WHERE updated_at > ?";
        String updateLocal = "UPDATE deliveries SET jar_qty = ?, bottle_qty = ?, sync_status = 'SYNCED' WHERE id = ?";

        try (PreparedStatement pullStmt = cloudDb.prepareStatement(selectCloud);
             PreparedStatement updateLocalStmt = localDb.prepareStatement(updateLocal)) {
             
            pullStmt.setString(1, lastPullTimestamp);
            ResultSet rs = pullStmt.executeQuery();

            while (rs.next()) {
                updateLocalStmt.setInt(1, rs.getInt("jar_qty"));
                updateLocalStmt.setInt(2, rs.getInt("bottle_qty"));
                updateLocalStmt.setInt(3, rs.getInt("id"));
                updateLocalStmt.executeUpdate();
            }
        }
    }

    private static void pullBills(Connection localDb, Connection cloudDb) throws SQLException {
        // Mobile app updates bill status to PAID
        String selectCloud = "SELECT id, status FROM bills WHERE updated_at > ?";
        String updateLocal = "UPDATE bills SET status = ?, sync_status = 'SYNCED' WHERE id = ?";

        try (PreparedStatement pullStmt = cloudDb.prepareStatement(selectCloud);
             PreparedStatement updateLocalStmt = localDb.prepareStatement(updateLocal)) {
             
            pullStmt.setString(1, lastPullTimestamp);
            ResultSet rs = pullStmt.executeQuery();

            while (rs.next()) {
                updateLocalStmt.setString(1, rs.getString("status"));
                updateLocalStmt.setInt(2, rs.getInt("id"));
                updateLocalStmt.executeUpdate();
            }
        }
    }
}
