package com.aqua.repository;

import com.aqua.database.DatabaseConnection;
import com.aqua.model.Bill;

import java.sql.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

public class BillRepository {

    public boolean saveOrUpdate(Bill bill) {
        Bill existing = findByCustomerAndMonth(bill.getCustomerId(), bill.getBillMonth(), bill.getBillYear());

        try {
            Connection conn = DatabaseConnection.getConnection();
            if (existing != null) {
                String sql = "UPDATE bills SET total_jars=?, total_bottles=?, jar_rate=?, bottle_rate=?, jar_amount=?, bottle_amount=?, grand_total=?, status=?, generated_at=datetime('now') WHERE customer_id=? AND bill_month=? AND bill_year=?";
                PreparedStatement pstmt = conn.prepareStatement(sql);
                pstmt.setInt(1, bill.getTotalJars());
                pstmt.setInt(2, bill.getTotalBottles());
                pstmt.setDouble(3, bill.getJarRate());
                pstmt.setDouble(4, bill.getBottleRate());
                pstmt.setDouble(5, bill.getJarAmount());
                pstmt.setDouble(6, bill.getBottleAmount());
                pstmt.setDouble(7, bill.getGrandTotal());
                pstmt.setString(8, bill.getStatus());
                pstmt.setInt(9, bill.getCustomerId());
                pstmt.setInt(10, bill.getBillMonth());
                pstmt.setInt(11, bill.getBillYear());
                bill.setId(existing.getId());
                boolean ok = pstmt.executeUpdate() > 0;
                pstmt.close();
                System.out.println("Bill updated for customer " + bill.getCustomerId() + ": " + ok);
                return ok;
            } else {
                String sql = "INSERT INTO bills (customer_id, bill_month, bill_year, total_jars, total_bottles, jar_rate, bottle_rate, jar_amount, bottle_amount, grand_total, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                PreparedStatement pstmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
                pstmt.setInt(1, bill.getCustomerId());
                pstmt.setInt(2, bill.getBillMonth());
                pstmt.setInt(3, bill.getBillYear());
                pstmt.setInt(4, bill.getTotalJars());
                pstmt.setInt(5, bill.getTotalBottles());
                pstmt.setDouble(6, bill.getJarRate());
                pstmt.setDouble(7, bill.getBottleRate());
                pstmt.setDouble(8, bill.getJarAmount());
                pstmt.setDouble(9, bill.getBottleAmount());
                pstmt.setDouble(10, bill.getGrandTotal());
                pstmt.setString(11, bill.getStatus());
                int rows = pstmt.executeUpdate();
                if (rows > 0) {
                    ResultSet keys = pstmt.getGeneratedKeys();
                    if (keys.next()) bill.setId(keys.getInt(1));
                }
                pstmt.close();
                System.out.println("Bill inserted for customer " + bill.getCustomerId() + ", id=" + bill.getId());
                return rows > 0;
            }
        } catch (SQLException e) {
            System.err.println("Error saving bill: " + e.getMessage());
            e.printStackTrace();
        }
        return false;
    }

    public boolean updateStatus(int billId, String status) {
        String sql = "UPDATE bills SET status=? WHERE id=?";
        try {
            PreparedStatement pstmt = DatabaseConnection.getConnection().prepareStatement(sql);
            pstmt.setString(1, status);
            pstmt.setInt(2, billId);
            boolean ok = pstmt.executeUpdate() > 0;
            pstmt.close();
            return ok;
        } catch (SQLException e) { System.err.println("Error updating status: " + e.getMessage()); }
        return false;
    }

    public List<Bill> findByMonth(int month, int year) {
        List<Bill> bills = new ArrayList<>();
        String sql = "SELECT b.*, c.name AS customer_name FROM bills b JOIN customers c ON b.customer_id=c.id WHERE b.bill_month=? AND b.bill_year=? ORDER BY c.name ASC";
        try {
            PreparedStatement pstmt = DatabaseConnection.getConnection().prepareStatement(sql);
            pstmt.setInt(1, month);
            pstmt.setInt(2, year);
            ResultSet rs = pstmt.executeQuery();
            while (rs.next()) bills.add(mapResultSet(rs));
            pstmt.close();
        } catch (SQLException e) { System.err.println("Error fetching bills: " + e.getMessage()); }
        return bills;
    }

    public Bill findByCustomerAndMonth(int customerId, int month, int year) {
        String sql = "SELECT b.*, c.name AS customer_name FROM bills b JOIN customers c ON b.customer_id=c.id WHERE b.customer_id=? AND b.bill_month=? AND b.bill_year=?";
        try {
            PreparedStatement pstmt = DatabaseConnection.getConnection().prepareStatement(sql);
            pstmt.setInt(1, customerId);
            pstmt.setInt(2, month);
            pstmt.setInt(3, year);
            ResultSet rs = pstmt.executeQuery();
            Bill bill = rs.next() ? mapResultSet(rs) : null;
            pstmt.close();
            return bill;
        } catch (SQLException e) { System.err.println("Error finding bill: " + e.getMessage()); }
        return null;
    }

    public int getPendingCount() {
        String sql = "SELECT COUNT(*) FROM bills WHERE status='PENDING'";
        try {
            Statement stmt = DatabaseConnection.getConnection().createStatement();
            ResultSet rs = stmt.executeQuery(sql);
            int count = rs.next() ? rs.getInt(1) : 0;
            stmt.close();
            return count;
        } catch (SQLException e) { System.err.println("Error: " + e.getMessage()); }
        return 0;
    }

    public double getMonthlyIncome(int month, int year) {
        String sql = "SELECT COALESCE(SUM(grand_total),0) FROM bills WHERE bill_month=? AND bill_year=?";
        try {
            PreparedStatement pstmt = DatabaseConnection.getConnection().prepareStatement(sql);
            pstmt.setInt(1, month);
            pstmt.setInt(2, year);
            ResultSet rs = pstmt.executeQuery();
            double income = rs.next() ? rs.getDouble(1) : 0;
            pstmt.close();
            return income;
        } catch (SQLException e) { System.err.println("Error: " + e.getMessage()); }
        return 0;
    }

    public boolean delete(int id) {
        String sql = "DELETE FROM bills WHERE id=?";
        try {
            PreparedStatement pstmt = DatabaseConnection.getConnection().prepareStatement(sql);
            pstmt.setInt(1, id);
            boolean ok = pstmt.executeUpdate() > 0;
            pstmt.close();
            return ok;
        } catch (SQLException e) { System.err.println("Error: " + e.getMessage()); }
        return false;
    }

    private Bill mapResultSet(ResultSet rs) throws SQLException {
        Bill bill = new Bill();
        bill.setId(rs.getInt("id"));
        bill.setCustomerId(rs.getInt("customer_id"));
        bill.setCustomerName(rs.getString("customer_name"));
        bill.setBillMonth(rs.getInt("bill_month"));
        bill.setBillYear(rs.getInt("bill_year"));
        bill.setTotalJars(rs.getInt("total_jars"));
        bill.setTotalBottles(rs.getInt("total_bottles"));
        bill.setJarRate(rs.getDouble("jar_rate"));
        bill.setBottleRate(rs.getDouble("bottle_rate"));
        bill.setJarAmount(rs.getDouble("jar_amount"));
        bill.setBottleAmount(rs.getDouble("bottle_amount"));
        bill.setGrandTotal(rs.getDouble("grand_total"));
        bill.setStatus(rs.getString("status"));
        String tsStr = rs.getString("generated_at");
        if (tsStr != null) {
            try { bill.setGeneratedAt(LocalDateTime.parse(tsStr, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))); }
            catch (Exception e) { bill.setGeneratedAt(LocalDateTime.now()); }
        }
        return bill;
    }
}
