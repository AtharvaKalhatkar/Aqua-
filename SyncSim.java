public class SyncSim {
    public static void main(String[] args) {
        String body = "[{\"id\":1,\"name\":\"Atharva pvt ltd\",\"address\":\"Chakan\",\"mobile\":\"8390768833\",\"route\":\"chakan\",\"email\":\"kalhatkaratharva01@gmail.com\",\"created_at\":\"2026-05-12T05:04:12.198\",\"updated_at\":\"2026-05-12T05:04:12.198\"}, \n {\"id\":2,\"name\":\"Pranita tech\",\"address\":\"Chakan\",\"mobile\":\"9322630631\",\"route\":\"chakan\",\"email\":\"pranitalavange@gmail.com\",\"created_at\":\"2026-05-12T05:40:26.232\",\"updated_at\":\"2026-05-12T05:40:26.232\"}, \n {\"id\":1778568994,\"name\":\"suraj\",\"address\":\"Chakan\",\"mobile\":\"8390768833\",\"route\":\"chakan\",\"email\":\"kalhatkaratharva01@gmail.com\",\"created_at\":\"2026-05-12T06:56:34.718\",\"updated_at\":\"2026-05-12T06:56:34.718\"}, \n {\"id\":4,\"name\":\"Pranu\",\"address\":\"chakan\",\"mobile\":\"8390768833\",\"route\":\"chakan\",\"email\":\"atharva8552@gmail.com\",\"created_at\":\"2026-05-12T19:05:39.283168\",\"updated_at\":\"2026-05-12T19:05:39.283168\"}, \n {\"id\":1778569634,\"name\":\"parag\",\"address\":\"Chakan\",\"mobile\":\"9322630631\",\"route\":\"chakan\",\"email\":\"pranitalavange@gmail.com\",\"created_at\":\"2026-05-12T07:07:14.385\",\"updated_at\":\"2026-05-12T07:07:14.385\"}]";

        String[] items = body.split("\\}\\s*,\\s*\\{");
        System.out.println("TOTAL SPLIT ITEMS: " + items.length);
        
        for (int i = 0; i < items.length; i++) {
            String item = items[i];
            String clean = item.replace("[{", "").replace("}]", "").replace("{", "").replace("}", "");
            int id = extractInt(clean, "\"id\":");
            String name = extractStr(clean, "\"name\":\"");
            System.out.println("Item " + i + " -> ID: " + id + " | Name: [" + name + "]");
        }
    }

    private static String extractStr(String raw, String key) {
        int idx = raw.indexOf(key);
        if (idx == -1) return "";
        int start = idx + key.length();
        int end = raw.indexOf("\"", start);
        if (end == -1) return "";
        return raw.substring(start, end);
    }

    private static int extractInt(String raw, String key) {
        int idx = raw.indexOf(key);
        if (idx == -1) return 0;
        int start = idx + key.length();
        int end = findDelimiter(raw, start);
        try {
            String val = raw.substring(start, end).trim().replace(":", "").replace("\"", "");
            return Integer.parseInt(val);
        } catch (Exception e) { return 0; }
    }

    private static int findDelimiter(String raw, int start) {
        int c = raw.indexOf(",", start);
        int q = raw.indexOf("\"", start);
        if (c == -1 && q == -1) return raw.length();
        if (c == -1) return q;
        if (q == -1) return c;
        return Math.min(c, q);
    }
}
