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
            System.out.println("SUCCESS! Connected perfectly.");
            conn.close();
            
        } catch (Exception e) {
            System.err.println("FAILED!");
            e.printStackTrace();
        }
    }
}
