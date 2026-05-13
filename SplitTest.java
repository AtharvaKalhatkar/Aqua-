public class SplitTest {
    public static void main(String[] args) {
        String json = "[{\"id\":1}, \n {\"id\":2}]";
        String[] items = json.split("\\}\\s*,\\s*\\{");
        System.out.println("Items Count: " + items.length);
        for (String s : items) System.out.println("SplitItem: " + s.replace("[{","").replace("}]","").trim());
    }
}
