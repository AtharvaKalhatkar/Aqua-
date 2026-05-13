import java.io.File;
import java.sql.Connection;
import java.sql.DriverManager;

public class TestRealConnect {
    public static void main(String[] args) {
        try {
            String dbDir = System.getProperty("user.home") + File.separator + ".aqua_management";
            String dbFile = dbDir + File.separator + "aqua_management.db";
            // Force forward slashes for JDBC compatibility on Windows absolute paths
            String sanitizedFile = dbFile.replace("\\", "/");
            String url = "jdbc:sqlite:" + sanitizedFile;
            
            System.out.println("Constructed Path: " + dbFile);
            System.out.println("Constructed URL: " + url);
            
            File dir = new File(dbDir);
            if(!dir.exists()){
                System.out.println("Creating dir: " + dir.mkdirs());
            } else {
                System.out.println("Dir exists.");
            }
            
            System.out.println("Attempting connection...");
            Connection conn = DriverManager.getConnection(url);
            System.out.println("SUCCESS! Connected to local DB.");
            
            try(java.sql.Statement st = conn.createStatement()) {
                java.sql.ResultSet rs = st.executeQuery("SELECT count(*) FROM customers");
                rs.next(); System.out.println("TOTAL CUSTOMERS: " + rs.getInt(1));
                
                rs = st.executeQuery("SELECT count(*) FROM deliveries");
                rs.next(); System.out.println("TOTAL DELIVERIES: " + rs.getInt(1));
            }
            conn.close();
            
        } catch (Exception e) {
            System.err.println("FAILED!");
            e.printStackTrace();
        }
    }
}
