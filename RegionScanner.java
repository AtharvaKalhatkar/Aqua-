import java.sql.Connection;
import java.sql.DriverManager;

public class RegionScanner {
    public static void main(String[] args) {
        // List of probable Supabase AWS regions
        String[] regions = {
            "ap-south-1", "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ap-northeast-2",
            "us-east-1", "us-east-2", "us-west-1", "us-west-2",
            "eu-west-1", "eu-west-2", "eu-west-3", "eu-central-1", "eu-north-1",
            "ca-central-1", "sa-east-1", "af-south-1"
        };
        int[] ports = {5432, 6543};
        String[] users = {"postgres.uszuutvdfavikxbyrduy", "postgres"};
        String pass = "Atharva@3232";
        
        try { Class.forName("org.postgresql.Driver"); } catch(Exception e) {}

        System.out.println("🚀 INITIATING ABSOLUTE MATRIX GRID SCANNER...");
        
        for (String r : regions) {
            for (int p : ports) {
                for (String u : users) {
                    String host = "aws-0-" + r + ".pooler.supabase.com";
                    String url = "jdbc:postgresql://" + host + ":" + p + "/postgres?ssl=true&sslmode=require&connectTimeout=5";
                    
                    System.out.print("Scanning [Region: " + r + " | Port: " + p + " | User: " + u + "]... ");
                    try {
                        Connection conn = DriverManager.getConnection(url, u, pass);
                        System.out.println("\n\n🔥 BOOM!!! TARGET LOCKED & LOADED!!! 🔥");
                        System.out.println("================================================");
                        System.out.println("✅ HOST: " + host);
                        System.out.println("✅ PORT: " + p);
                        System.out.println("✅ USER: " + u);
                        System.out.println("================================================");
                        conn.close();
                        System.exit(0);
                    } catch (Exception e) {
                        String msg = e.getMessage();
                        if (msg.contains("password authentication failed")) {
                            System.out.println("\n\n🎯 FOUND IT!!! BUT WRONG PASSWORD!!!");
                            System.out.println("Connection hit the REAL server, but password rejected.");
                            System.exit(0);
                        } else {
                            System.out.println("❌ Rejection (Network/Auth/Tenant)");
                        }
                    }
                }
            }
        }
        System.out.println("⚠️ MATRIX COMPLETE. All permutations exhausted.");
    }
}
