package com.aqua.repository;

import com.aqua.database.DatabaseConnection;
import com.aqua.model.Delivery;

import java.sql.*;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class DeliveryRepository {

    public boolean insert(Delivery delivery) {
        String sql = "INSERT INTO deliveries (customer_id, delivery_date, jar_qty, bottle_qty) VALUES (?, ?, ?, ?)";
        try (PreparedStatement pstmt = DatabaseConnection.getConnection().prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            pstmt.setInt(1, delivery.getCustomerId());
            pstmt.setString(2, delivery.getDeliveryDate().toString());
            pstmt.setInt(3, delivery.getJarQty());
            pstmt.setInt(4, delivery.getBottleQty());
            int rows = pstmt.executeUpdate();
            if (rows > 0) {
                ResultSet keys = pstmt.getGeneratedKeys();
                if (keys.next()) delivery.setId(keys.getInt(1));
                return true;
            }
        } catch (SQLException e) { System.err.println("Error inserting delivery: " + e.getMessage()); }
        return false;
    }

    public boolean delete(int id) {
        String sql = "DELETE FROM deliveries WHERE id=?";
        try (PreparedStatement pstmt = DatabaseConnection.getConnection().prepareStatement(sql)) {
            pstmt.setInt(1, id);
            return pstmt.executeUpdate() > 0;
        } catch (SQLException e) { System.err.println("Error deleting delivery: " + e.getMessage()); }
        return false;
    }

    public List<Delivery> findByDate(LocalDate date) {
        List<Delivery> list = new ArrayList<>();
        String sql = "SELECT d.*, c.name AS customer_name FROM deliveries d JOIN customers c ON d.customer_id=c.id WHERE d.delivery_date=? ORDER BY d.created_at DESC";
        try (PreparedStatement pstmt = DatabaseConnection.getConnection().prepareStatement(sql)) {
            pstmt.setString(1, date.toString());
            ResultSet rs = pstmt.executeQuery();
            while (rs.next()) list.add(map(rs));
        } catch (SQLException e) { System.err.println("Error fetching deliveries: " + e.getMessage()); }
        return list;
    }

    public List<Delivery> findByCustomerAndMonth(int customerId, int month, int year) {
        List<Delivery> list = new ArrayList<>();
        String sql = "SELECT d.*, c.name AS customer_name FROM deliveries d JOIN customers c ON d.customer_id=c.id WHERE d.customer_id=? AND CAST(strftime('%m',d.delivery_date) AS INTEGER)=? AND CAST(strftime('%Y',d.delivery_date) AS INTEGER)=? ORDER BY d.delivery_date ASC";
        try (PreparedStatement pstmt = DatabaseConnection.getConnection().prepareStatement(sql)) {
            pstmt.setInt(1, customerId);
            pstmt.setInt(2, month);
            pstmt.setInt(3, year);
            ResultSet rs = pstmt.executeQuery();
            while (rs.next()) list.add(map(rs));
        } catch (SQLException e) { System.err.println("Error fetching deliveries: " + e.getMessage()); }
        return list;
    }

    public List<Delivery> findByMonth(int month, int year) {
        List<Delivery> list = new ArrayList<>();
        String sql = "SELECT d.*, c.name AS customer_name FROM deliveries d JOIN customers c ON d.customer_id=c.id WHERE CAST(strftime('%m',d.delivery_date) AS INTEGER)=? AND CAST(strftime('%Y',d.delivery_date) AS INTEGER)=? ORDER BY d.delivery_date DESC, c.name ASC";
        try (PreparedStatement pstmt = DatabaseConnection.getConnection().prepareStatement(sql)) {
            pstmt.setInt(1, month);
            pstmt.setInt(2, year);
            ResultSet rs = pstmt.executeQuery();
            while (rs.next()) list.add(map(rs));
        } catch (SQLException e) { System.err.println("Error fetching deliveries: " + e.getMessage()); }
        return list;
    }

    public int getTodayCount() {
        String sql = "SELECT COUNT(*) FROM deliveries WHERE delivery_date=?";
        try (PreparedStatement pstmt = DatabaseConnection.getConnection().prepareStatement(sql)) {
            pstmt.setString(1, LocalDate.now().toString());
            ResultSet rs = pstmt.executeQuery();
            if (rs.next()) return rs.getInt(1);
        } catch (SQLException e) { System.err.println("Error counting deliveries: " + e.getMessage()); }
        return 0;
    }

    public int getTotalJars(int customerId, int month, int year) {
        String sql = "SELECT COALESCE(SUM(jar_qty),0) FROM deliveries WHERE customer_id=? AND CAST(strftime('%m',delivery_date) AS INTEGER)=? AND CAST(strftime('%Y',delivery_date) AS INTEGER)=?";
        try (PreparedStatement pstmt = DatabaseConnection.getConnection().prepareStatement(sql)) {
            pstmt.setInt(1, customerId); pstmt.setInt(2, month); pstmt.setInt(3, year);
            ResultSet rs = pstmt.executeQuery();
            if (rs.next()) return rs.getInt(1);
        } catch (SQLException e) { System.err.println("Error: " + e.getMessage()); }
        return 0;
    }

    public int getTotalBottles(int customerId, int month, int year) {
        String sql = "SELECT COALESCE(SUM(bottle_qty),0) FROM deliveries WHERE customer_id=? AND CAST(strftime('%m',delivery_date) AS INTEGER)=? AND CAST(strftime('%Y',delivery_date) AS INTEGER)=?";
        try (PreparedStatement pstmt = DatabaseConnection.getConnection().prepareStatement(sql)) {
            pstmt.setInt(1, customerId); pstmt.setInt(2, month); pstmt.setInt(3, year);
            ResultSet rs = pstmt.executeQuery();
            if (rs.next()) return rs.getInt(1);
        } catch (SQLException e) { System.err.println("Error: " + e.getMessage()); }
        return 0;
    }

    /** Returns [minDate, maxDate] for a customer's deliveries in a given month. */
    public LocalDate[] getDateRange(int customerId, int month, int year) {
        String sql = "SELECT MIN(delivery_date), MAX(delivery_date) FROM deliveries WHERE customer_id=? AND CAST(strftime('%m',delivery_date) AS INTEGER)=? AND CAST(strftime('%Y',delivery_date) AS INTEGER)=?";
        try (PreparedStatement pstmt = DatabaseConnection.getConnection().prepareStatement(sql)) {
            pstmt.setInt(1, customerId); pstmt.setInt(2, month); pstmt.setInt(3, year);
            ResultSet rs = pstmt.executeQuery();
            if (rs.next()) {
                String minStr = rs.getString(1);
                String maxStr = rs.getString(2);
                if (minStr != null && maxStr != null) {
                    return new LocalDate[]{LocalDate.parse(minStr), LocalDate.parse(maxStr)};
                }
            }
        } catch (SQLException e) { System.err.println("Error: " + e.getMessage()); }
        return null;
    }
    /** Total jars for ALL customers in a month (for charts) */
    public int getMonthlyJarTotal(int month, int year) {
        String sql = "SELECT COALESCE(SUM(jar_qty),0) FROM deliveries WHERE CAST(strftime('%m',delivery_date) AS INTEGER)=? AND CAST(strftime('%Y',delivery_date) AS INTEGER)=?";
        try (PreparedStatement p = DatabaseConnection.getConnection().prepareStatement(sql)) {
            p.setInt(1, month); p.setInt(2, year);
            ResultSet rs = p.executeQuery();
            if (rs.next()) return rs.getInt(1);
        } catch (SQLException e) { System.err.println(e.getMessage()); }
        return 0;
    }

    /** Total bottles for ALL customers in a month (for charts) */
    public int getMonthlyBottleTotal(int month, int year) {
        String sql = "SELECT COALESCE(SUM(bottle_qty),0) FROM deliveries WHERE CAST(strftime('%m',delivery_date) AS INTEGER)=? AND CAST(strftime('%Y',delivery_date) AS INTEGER)=?";
        try (PreparedStatement p = DatabaseConnection.getConnection().prepareStatement(sql)) {
            p.setInt(1, month); p.setInt(2, year);
            ResultSet rs = p.executeQuery();
            if (rs.next()) return rs.getInt(1);
        } catch (SQLException e) { System.err.println(e.getMessage()); }
        return 0;
    }

    /** Per-customer delivery totals for a month (for pie chart) */
    public List<Object[]> getCustomerTotals(int month, int year) {
        List<Object[]> list = new ArrayList<>();
        String sql = "SELECT c.name, COALESCE(SUM(d.jar_qty),0)+COALESCE(SUM(d.bottle_qty),0) as total FROM deliveries d JOIN customers c ON d.customer_id=c.id WHERE CAST(strftime('%m',d.delivery_date) AS INTEGER)=? AND CAST(strftime('%Y',d.delivery_date) AS INTEGER)=? GROUP BY c.name ORDER BY total DESC LIMIT 8";
        try (PreparedStatement p = DatabaseConnection.getConnection().prepareStatement(sql)) {
            p.setInt(1, month); p.setInt(2, year);
            ResultSet rs = p.executeQuery();
            while (rs.next()) list.add(new Object[]{rs.getString(1), rs.getInt(2)});
        } catch (SQLException e) { System.err.println(e.getMessage()); }
        return list;
    }

    /** All deliveries in a date range (for reports/spreadsheet) */
    public List<Delivery> findByDateRange(LocalDate from, LocalDate to) {
        List<Delivery> list = new ArrayList<>();
        String sql = "SELECT d.*, c.name AS customer_name FROM deliveries d JOIN customers c ON d.customer_id=c.id WHERE d.delivery_date BETWEEN ? AND ? ORDER BY d.delivery_date ASC, c.name ASC";
        try (PreparedStatement p = DatabaseConnection.getConnection().prepareStatement(sql)) {
            p.setString(1, from.toString()); p.setString(2, to.toString());
            ResultSet rs = p.executeQuery();
            while (rs.next()) list.add(map(rs));
        } catch (SQLException e) { System.err.println(e.getMessage()); }
        return list;
    }

    private Delivery map(ResultSet rs) throws SQLException {
        return new Delivery(rs.getInt("id"), rs.getInt("customer_id"), rs.getString("customer_name"),
                LocalDate.parse(rs.getString("delivery_date")), rs.getInt("jar_qty"), rs.getInt("bottle_qty"));
    }
}
