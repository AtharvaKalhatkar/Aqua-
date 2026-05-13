import java.sql.*;
import java.io.File;

public class DumpLocalDb {
    public static void main(String[] args) throws Exception {
        Class.forName("org.sqlite.JDBC");
        String path = System.getProperty("user.home") + File.separator + ".aqua_management" + File.separator + "aqua_management.db";
        String url = "jdbc:sqlite:" + path;
        
        System.out.println("Opening DB: " + path);
        try (Connection c = DriverManager.getConnection(url);
             Statement st = c.createStatement()) {
             
            System.out.println("\n--- CUSTOMERS ---");
            try (ResultSet rs = st.executeQuery("SELECT id, name FROM customers")) {
                while(rs.next()) System.out.println("Cust: [" + rs.getInt("id") + "] " + rs.getString("name"));
            }
            
            System.out.println("\n--- BILLS ---");
            try (ResultSet rs = st.executeQuery("SELECT customer_id, grand_total, status FROM bills")) {
                while(rs.next()) System.out.println("Bill: CustID=" + rs.getInt("customer_id") + " Total=" + rs.getDouble("grand_total") + " Status=" + rs.getString("status"));
            }
        }
    }
}
