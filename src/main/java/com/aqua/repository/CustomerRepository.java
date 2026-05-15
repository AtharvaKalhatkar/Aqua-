package com.aqua.repository;

import com.aqua.database.DatabaseConnection;
import com.aqua.model.Customer;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class CustomerRepository {

    public boolean insert(Customer customer) {
        String sql = "INSERT INTO customers (name, address, mobile, route, email) VALUES (?, ?, ?, ?, ?)";
        try (PreparedStatement pstmt = DatabaseConnection.getConnection().prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            pstmt.setString(1, customer.getName());
            pstmt.setString(2, customer.getAddress());
            pstmt.setString(3, customer.getMobile());
            pstmt.setString(4, customer.getRoute());
            pstmt.setString(5, customer.getEmail());
            int rows = pstmt.executeUpdate();
            if (rows > 0) {
                ResultSet keys = pstmt.getGeneratedKeys();
                if (keys.next()) customer.setId(keys.getInt(1));
                return true;
            }
        } catch (SQLException e) { System.err.println("Error inserting customer: " + e.getMessage()); }
        return false;
    }

    public boolean update(Customer customer) {
        String sql = "UPDATE customers SET name=?, address=?, mobile=?, route=?, email=? WHERE id=?";
        try (PreparedStatement pstmt = DatabaseConnection.getConnection().prepareStatement(sql)) {
            pstmt.setString(1, customer.getName());
            pstmt.setString(2, customer.getAddress());
            pstmt.setString(3, customer.getMobile());
            pstmt.setString(4, customer.getRoute());
            pstmt.setString(5, customer.getEmail());
            pstmt.setInt(6, customer.getId());
            return pstmt.executeUpdate() > 0;
        } catch (SQLException e) { System.err.println("Error updating customer: " + e.getMessage()); }
        return false;
    }

    public boolean delete(int id) {
        String sql = "DELETE FROM customers WHERE id=?";
        try (PreparedStatement pstmt = DatabaseConnection.getConnection().prepareStatement(sql)) {
            pstmt.setInt(1, id);
            return pstmt.executeUpdate() > 0;
        } catch (SQLException e) { System.err.println("Error deleting customer: " + e.getMessage()); }
        return false;
    }

    public List<Customer> findAll() {
        List<Customer> list = new ArrayList<>();
        String sql = "SELECT id, name, address, mobile, route, email FROM customers ORDER BY name ASC";
        try (Statement stmt = DatabaseConnection.getConnection().createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            while (rs.next()) list.add(map(rs));
        } catch (SQLException e) { System.err.println("Error fetching customers: " + e.getMessage()); }
        return list;
    }

    public List<Customer> findByRoute(String route) {
        List<Customer> list = new ArrayList<>();
        String sql = "SELECT id, name, address, mobile, route, email FROM customers WHERE LOWER(route)=LOWER(?) ORDER BY name ASC";
        try (PreparedStatement pstmt = DatabaseConnection.getConnection().prepareStatement(sql)) {
            pstmt.setString(1, route);
            ResultSet rs = pstmt.executeQuery();
            while (rs.next()) list.add(map(rs));
        } catch (SQLException e) { System.err.println("Error fetching by route: " + e.getMessage()); }
        return list;
    }

    public List<String> getDistinctRoutes() {
        List<String> routes = new ArrayList<>();
        String sql = "SELECT DISTINCT route FROM customers WHERE route IS NOT NULL AND route != '' ORDER BY route ASC";
        try (Statement stmt = DatabaseConnection.getConnection().createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            while (rs.next()) routes.add(rs.getString("route"));
        } catch (SQLException e) { System.err.println("Error fetching routes: " + e.getMessage()); }
        return routes;
    }

    public List<Customer> searchByName(String name) {
        List<Customer> list = new ArrayList<>();
        String sql = "SELECT id, name, address, mobile, route, email FROM customers WHERE LOWER(name) LIKE ? ORDER BY name ASC";
        try (PreparedStatement pstmt = DatabaseConnection.getConnection().prepareStatement(sql)) {
            pstmt.setString(1, name.toLowerCase() + "%");
            ResultSet rs = pstmt.executeQuery();
            while (rs.next()) list.add(map(rs));
        } catch (SQLException e) { System.err.println("Error searching customers: " + e.getMessage()); }
        return list;
    }

    public List<Customer> searchByNameAndRoute(String name, String route) {
        List<Customer> list = new ArrayList<>();
        String sql = "SELECT id, name, address, mobile, route, email FROM customers WHERE LOWER(name) LIKE ? AND LOWER(route)=LOWER(?) ORDER BY name ASC";
        try (PreparedStatement pstmt = DatabaseConnection.getConnection().prepareStatement(sql)) {
            pstmt.setString(1, name.toLowerCase() + "%");
            pstmt.setString(2, route);
            ResultSet rs = pstmt.executeQuery();
            while (rs.next()) list.add(map(rs));
        } catch (SQLException e) { System.err.println("Error: " + e.getMessage()); }
        return list;
    }

    public Customer findById(int id) {
        String sql = "SELECT id, name, address, mobile, route, email FROM customers WHERE id=?";
        try (PreparedStatement pstmt = DatabaseConnection.getConnection().prepareStatement(sql)) {
            pstmt.setInt(1, id);
            ResultSet rs = pstmt.executeQuery();
            if (rs.next()) return map(rs);
        } catch (SQLException e) { System.err.println("Error finding customer: " + e.getMessage()); }
        return null;
    }

    public int getCount() {
        String sql = "SELECT COUNT(*) FROM customers";
        try (Statement stmt = DatabaseConnection.getConnection().createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            if (rs.next()) return rs.getInt(1);
        } catch (SQLException e) { System.err.println("Error counting customers: " + e.getMessage()); }
        return 0;
    }

    public List<Customer> findActiveInMonth(int month, int year) {
        List<Customer> list = new ArrayList<>();
        String sql = "SELECT DISTINCT c.id, c.name, c.address, c.mobile, c.route, c.email " +
                     "FROM customers c " +
                     "JOIN deliveries d ON c.id = d.customer_id " +
                     "WHERE CAST(strftime('%m',d.delivery_date) AS INTEGER)=? AND CAST(strftime('%Y',d.delivery_date) AS INTEGER)=? " +
                     "AND (d.jar_qty > 0 OR d.bottle_qty > 0) " +
                     "ORDER BY c.name ASC";
        try (PreparedStatement pstmt = DatabaseConnection.getConnection().prepareStatement(sql)) {
            pstmt.setInt(1, month);
            pstmt.setInt(2, year);
            ResultSet rs = pstmt.executeQuery();
            while (rs.next()) list.add(map(rs));
        } catch (SQLException e) { System.err.println("Error fetching active customers: " + e.getMessage()); }
        return list;
    }

    public List<Customer> findActiveInMonthByRoute(int month, int year, String route) {
        List<Customer> list = new ArrayList<>();
        String sql = "SELECT DISTINCT c.id, c.name, c.address, c.mobile, c.route, c.email " +
                     "FROM customers c " +
                     "JOIN deliveries d ON c.id = d.customer_id " +
                     "WHERE CAST(strftime('%m',d.delivery_date) AS INTEGER)=? AND CAST(strftime('%Y',d.delivery_date) AS INTEGER)=? " +
                     "AND LOWER(c.route)=LOWER(?) AND (d.jar_qty > 0 OR d.bottle_qty > 0) " +
                     "ORDER BY c.name ASC";
        try (PreparedStatement pstmt = DatabaseConnection.getConnection().prepareStatement(sql)) {
            pstmt.setInt(1, month);
            pstmt.setInt(2, year);
            pstmt.setString(3, route);
            ResultSet rs = pstmt.executeQuery();
            while (rs.next()) list.add(map(rs));
        } catch (SQLException e) { System.err.println("Error fetching active by route: " + e.getMessage()); }
        return list;
    }

    public List<Customer> searchActiveInMonth(String name, int month, int year) {
        List<Customer> list = new ArrayList<>();
        String sql = "SELECT DISTINCT c.id, c.name, c.address, c.mobile, c.route, c.email " +
                     "FROM customers c " +
                     "JOIN deliveries d ON c.id = d.customer_id " +
                     "WHERE LOWER(c.name) LIKE ? " +
                     "AND CAST(strftime('%m',d.delivery_date) AS INTEGER)=? AND CAST(strftime('%Y',d.delivery_date) AS INTEGER)=? " +
                     "AND (d.jar_qty > 0 OR d.bottle_qty > 0) " +
                     "ORDER BY c.name ASC";
        try (PreparedStatement pstmt = DatabaseConnection.getConnection().prepareStatement(sql)) {
            pstmt.setString(1, name.toLowerCase() + "%");
            pstmt.setInt(2, month);
            pstmt.setInt(3, year);
            ResultSet rs = pstmt.executeQuery();
            while (rs.next()) list.add(map(rs));
        } catch (SQLException e) { System.err.println("Error searching active customers: " + e.getMessage()); }
        return list;
    }

    public List<Customer> searchActiveInMonthAndRoute(String name, int month, int year, String route) {
        List<Customer> list = new ArrayList<>();
        String sql = "SELECT DISTINCT c.id, c.name, c.address, c.mobile, c.route, c.email " +
                     "FROM customers c " +
                     "JOIN deliveries d ON c.id = d.customer_id " +
                     "WHERE LOWER(c.name) LIKE ? AND LOWER(c.route)=LOWER(?) " +
                     "AND CAST(strftime('%m',d.delivery_date) AS INTEGER)=? AND CAST(strftime('%Y',d.delivery_date) AS INTEGER)=? " +
                     "AND (d.jar_qty > 0 OR d.bottle_qty > 0) " +
                     "ORDER BY c.name ASC";
        try (PreparedStatement pstmt = DatabaseConnection.getConnection().prepareStatement(sql)) {
            pstmt.setString(1, name.toLowerCase() + "%");
            pstmt.setString(2, route);
            pstmt.setInt(3, month);
            pstmt.setInt(4, year);
            ResultSet rs = pstmt.executeQuery();
            while (rs.next()) list.add(map(rs));
        } catch (SQLException e) { System.err.println("Error searching active by route: " + e.getMessage()); }
        return list;
    }

    private Customer map(ResultSet rs) throws SQLException {
        String email = "";
        try { email = rs.getString("email"); } catch (SQLException ignored) {}
        return new Customer(rs.getInt("id"), rs.getString("name"), rs.getString("address"),
                rs.getString("mobile"), rs.getString("route"), email != null ? email : "");
    }
}
