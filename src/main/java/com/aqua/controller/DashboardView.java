package com.aqua.controller;

import com.aqua.model.Bill;
import com.aqua.model.Customer;
import com.aqua.model.Delivery;
import com.aqua.service.BillService;
import com.aqua.service.CustomerService;
import com.aqua.service.DeliveryService;

import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.Label;
import javafx.scene.control.ScrollPane;
import javafx.scene.layout.*;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;

import java.time.LocalDate;
import java.time.Month;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

public class DashboardView extends VBox {

    private final CustomerService customerService = new CustomerService();
    private final DeliveryService deliveryService = new DeliveryService();
    private final BillService billService = new BillService();

    private Label totalCustomersLabel, todayDeliveriesLabel, monthlyIncomeLabel, pendingBillsLabel;
    private VBox todayDeliveriesBox, pendingBillsBox, monthlySummaryBox, routeBreakdownBox;

    public DashboardView() {
        setPadding(new Insets(25));
        setSpacing(20);
        getStyleClass().add("content-area");
        buildHeader();
        buildStatCards();
        buildInfoPanels();
        refreshData();
    }

    private void buildHeader() {
        HBox headerBox = new HBox();
        headerBox.setAlignment(Pos.CENTER_LEFT);

        VBox left = new VBox(3);
        Label title = new Label("📊 Dashboard");
        title.getStyleClass().add("page-title");
        Label sub = new Label("Bhairavnath Cool Aqua — " + LocalDate.now().format(DateTimeFormatter.ofPattern("EEEE, dd MMM yyyy")));
        sub.getStyleClass().add("page-subtitle");
        left.getChildren().addAll(title, sub);

        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);

        VBox right = new VBox(5);
        right.setAlignment(Pos.CENTER_RIGHT);
        
        javafx.scene.control.Button backupBtn = new javafx.scene.control.Button("💾 Set Backup Folder");
        backupBtn.setStyle("-fx-background-color: transparent; -fx-text-fill: #0069b4; -fx-cursor: hand; -fx-font-weight: bold; -fx-font-size: 12px;");
        backupBtn.setOnAction(e -> {
            javafx.stage.DirectoryChooser chooser = new javafx.stage.DirectoryChooser();
            chooser.setTitle("Select Google Drive or Backup Folder");
            java.io.File dir = chooser.showDialog(this.getScene().getWindow());
            if (dir != null) {
                java.util.prefs.Preferences.userNodeForPackage(com.aqua.App.class).put("backup_dir", dir.getAbsolutePath());
                com.aqua.util.AlertUtil.showSuccess("Auto-Backup folder set to:\n" + dir.getAbsolutePath() + "\n\nBackups will be saved here automatically.");
            }
        });
        
        Label tip = new Label("Alt+1-5 Navigate | Tab/Enter Form | ↑↓ Lists");
        tip.setStyle("-fx-text-fill: #999; -fx-font-size: 11px;");
        right.getChildren().addAll(backupBtn, tip);

        headerBox.getChildren().addAll(left, spacer, right);
        getChildren().add(headerBox);
    }

    private void buildStatCards() {
        HBox row = new HBox(15);
        row.setAlignment(Pos.CENTER_LEFT);

        VBox c1 = makeCard("👥", "Total Customers", "0", "#0069b4", "#e3f2fd");
        totalCustomersLabel = (Label) c1.lookup("#sv");
        VBox c2 = makeCard("🚚", "Today Deliveries", "0", "#27ae60", "#e8f5e9");
        todayDeliveriesLabel = (Label) c2.lookup("#sv");
        VBox c3 = makeCard("💰", "Monthly Income", "₹0", "#8e44ad", "#f3e5f5");
        monthlyIncomeLabel = (Label) c3.lookup("#sv");
        VBox c4 = makeCard("📋", "Pending Bills", "0", "#e67e22", "#fff3e0");
        pendingBillsLabel = (Label) c4.lookup("#sv");

        row.getChildren().addAll(c1, c2, c3, c4);
        for (var c : row.getChildren()) HBox.setHgrow(c, Priority.ALWAYS);
        getChildren().add(row);
    }

    private VBox makeCard(String icon, String title, String value, String color, String bgColor) {
        VBox card = new VBox(6);
        card.setPadding(new Insets(18));
        card.setMinWidth(180);
        card.setMaxWidth(Double.MAX_VALUE);
        card.setStyle(String.format("-fx-background-color: %s; -fx-background-radius: 14; -fx-border-color: %s; -fx-border-width: 0 0 3 0; -fx-border-radius: 14; -fx-effect: dropshadow(gaussian,rgba(0,0,0,0.08),10,0,0,2);", bgColor, color));

        HBox top = new HBox(10);
        top.setAlignment(Pos.CENTER_LEFT);
        Label iconL = new Label(icon);
        iconL.setFont(Font.font("System", 28));
        Label titleL = new Label(title);
        titleL.setFont(Font.font("System", FontWeight.SEMI_BOLD, 12));
        titleL.setStyle("-fx-text-fill: #666;");
        top.getChildren().addAll(iconL, titleL);

        Label valueL = new Label(value);
        valueL.setId("sv");
        valueL.setFont(Font.font("System", FontWeight.BOLD, 26));
        valueL.setStyle("-fx-text-fill: " + color + ";");

        card.getChildren().addAll(top, valueL);
        return card;
    }

    private void buildInfoPanels() {
        // Row 1: Today's Deliveries (left) + Pending Bills (right)
        HBox row1 = new HBox(15);
        row1.setAlignment(Pos.TOP_LEFT);
        VBox.setVgrow(row1, Priority.ALWAYS);

        todayDeliveriesBox = buildPanel("🚚 Today's Deliveries", "#27ae60");
        HBox.setHgrow(todayDeliveriesBox, Priority.ALWAYS);

        pendingBillsBox = buildPanel("⚠️ Pending Bills", "#e67e22");
        HBox.setHgrow(pendingBillsBox, Priority.ALWAYS);

        row1.getChildren().addAll(todayDeliveriesBox, pendingBillsBox);

        // Row 2: Monthly Summary (left) + Route Breakdown (right)
        HBox row2 = new HBox(15);
        row2.setAlignment(Pos.TOP_LEFT);
        VBox.setVgrow(row2, Priority.ALWAYS);

        monthlySummaryBox = buildPanel("📈 This Month's Summary", "#0069b4");
        HBox.setHgrow(monthlySummaryBox, Priority.ALWAYS);

        routeBreakdownBox = buildPanel("🗺️ Route-wise Customers", "#8e44ad");
        HBox.setHgrow(routeBreakdownBox, Priority.ALWAYS);

        row2.getChildren().addAll(monthlySummaryBox, routeBreakdownBox);

        getChildren().addAll(row1, row2);
    }

    private VBox buildPanel(String titleText, String accentColor) {
        VBox panel = new VBox(10);
        panel.setPadding(new Insets(16));
        panel.setMinHeight(180);
        panel.setStyle("-fx-background-color: white; -fx-background-radius: 14; " +
                "-fx-border-color: " + accentColor + "; -fx-border-width: 2 0 0 0; -fx-border-radius: 14; " +
                "-fx-effect: dropshadow(gaussian,rgba(0,0,0,0.06),8,0,0,2);");

        Label title = new Label(titleText);
        title.setFont(Font.font("System", FontWeight.BOLD, 14));
        title.setStyle("-fx-text-fill: #1a1a2e;");
        panel.getChildren().add(title);

        return panel;
    }

    public void refreshData() {
        try {
            LocalDate now = LocalDate.now();
            int m = now.getMonthValue(), y = now.getYear();

            // Update stat cards
            int totalCust = customerService.getTotalCustomers();
            int todayDel = deliveryService.getTodayDeliveryCount();
            double monthIncome = billService.getMonthlyIncome(m, y);
            int pendingCount = billService.getPendingBillsCount();

            totalCustomersLabel.setText(String.valueOf(totalCust));
            todayDeliveriesLabel.setText(String.valueOf(todayDel));
            monthlyIncomeLabel.setText(String.format("₹%.0f", monthIncome));
            pendingBillsLabel.setText(String.valueOf(pendingCount));

            // --- Today's Deliveries Panel ---
            refreshTodayDeliveries(now);

            // --- Pending Bills Panel ---
            refreshPendingBills(m, y);

            // --- Monthly Summary Panel ---
            refreshMonthlySummary(m, y, now);

            // --- Route Breakdown Panel ---
            refreshRouteBreakdown();

        } catch (Exception e) {
            System.err.println("Dashboard error: " + e.getMessage());
        }
    }

    private void refreshTodayDeliveries(LocalDate today) {
        // Keep only the title (first child)
        if (todayDeliveriesBox.getChildren().size() > 1)
            todayDeliveriesBox.getChildren().remove(1, todayDeliveriesBox.getChildren().size());

        List<Delivery> deliveries = deliveryService.getDeliveriesByDate(today);

        if (deliveries.isEmpty()) {
            Label empty = new Label("No deliveries recorded today");
            empty.setStyle("-fx-text-fill: #999; -fx-font-style: italic; -fx-padding: 15 0 0 0;");
            todayDeliveriesBox.getChildren().add(empty);
            return;
        }

        // Table header
        HBox header = makeTableRow("Customer", "Jars", "Bottles", true);
        todayDeliveriesBox.getChildren().add(header);

        VBox rowsBox = new VBox(0);
        int count = 0;
        for (Delivery d : deliveries) {
            if (count >= 8) break; // Show max 8 rows
            HBox row = makeTableRow(
                    d.getCustomerName(),
                    String.valueOf(d.getJarQty()),
                    String.valueOf(d.getBottleQty()),
                    false
            );
            if (count % 2 == 0)
                row.setStyle(row.getStyle() + "-fx-background-color: #f8f9fa; -fx-background-radius: 6;");
            rowsBox.getChildren().add(row);
            count++;
        }
        if (deliveries.size() > 8) {
            Label more = new Label("+" + (deliveries.size() - 8) + " more deliveries...");
            more.setStyle("-fx-text-fill: #666; -fx-font-size: 11px; -fx-padding: 5 0 0 8;");
            rowsBox.getChildren().add(more);
        }

        // Total row
        int totalJars = deliveries.stream().mapToInt(Delivery::getJarQty).sum();
        int totalBottles = deliveries.stream().mapToInt(Delivery::getBottleQty).sum();
        HBox totalRow = makeTableRow("Total (" + deliveries.size() + ")", String.valueOf(totalJars), String.valueOf(totalBottles), true);
        totalRow.setStyle("-fx-background-color: #e8f5e9; -fx-background-radius: 6; -fx-border-color: #27ae60; -fx-border-width: 1 0 0 0;");
        rowsBox.getChildren().add(totalRow);

        ScrollPane scroll = new ScrollPane(rowsBox);
        scroll.setFitToWidth(true);
        scroll.setMaxHeight(160);
        scroll.setStyle("-fx-background: transparent; -fx-background-color: transparent;");
        VBox.setVgrow(scroll, Priority.ALWAYS);
        todayDeliveriesBox.getChildren().add(scroll);
    }

    private void refreshPendingBills(int month, int year) {
        if (pendingBillsBox.getChildren().size() > 1)
            pendingBillsBox.getChildren().remove(1, pendingBillsBox.getChildren().size());

        List<Bill> bills = billService.getBillsByMonth(month, year);
        List<Bill> pending = bills.stream().filter(b -> "PENDING".equals(b.getStatus())).collect(Collectors.toList());

        if (pending.isEmpty()) {
            Label empty = new Label("✅ All bills are paid this month!");
            empty.setStyle("-fx-text-fill: #27ae60; -fx-font-weight: bold; -fx-padding: 15 0 0 0;");
            pendingBillsBox.getChildren().add(empty);
            return;
        }

        HBox header = makeTableRow("Customer", "Amount", "Status", true);
        pendingBillsBox.getChildren().add(header);

        VBox rowsBox = new VBox(0);
        double totalPending = 0;
        int count = 0;
        for (Bill b : pending) {
            if (count >= 8) break;
            HBox row = makeTableRow(
                    b.getCustomerName(),
                    String.format("₹%.0f", b.getGrandTotal()),
                    "⏳ Pending",
                    false
            );
            if (count % 2 == 0)
                row.setStyle(row.getStyle() + "-fx-background-color: #fff8f0; -fx-background-radius: 6;");
            rowsBox.getChildren().add(row);
            totalPending += b.getGrandTotal();
            count++;
        }
        if (pending.size() > 8) {
            Label more = new Label("+" + (pending.size() - 8) + " more pending...");
            more.setStyle("-fx-text-fill: #666; -fx-font-size: 11px; -fx-padding: 5 0 0 8;");
            rowsBox.getChildren().add(more);
        }

        HBox totalRow = makeTableRow("Total (" + pending.size() + ")", String.format("₹%.0f", totalPending), "", true);
        totalRow.setStyle("-fx-background-color: #fff3e0; -fx-background-radius: 6; -fx-border-color: #e67e22; -fx-border-width: 1 0 0 0;");
        rowsBox.getChildren().add(totalRow);

        ScrollPane scroll = new ScrollPane(rowsBox);
        scroll.setFitToWidth(true);
        scroll.setMaxHeight(160);
        scroll.setStyle("-fx-background: transparent; -fx-background-color: transparent;");
        VBox.setVgrow(scroll, Priority.ALWAYS);
        pendingBillsBox.getChildren().add(scroll);
    }

    private void refreshMonthlySummary(int month, int year, LocalDate now) {
        if (monthlySummaryBox.getChildren().size() > 1)
            monthlySummaryBox.getChildren().remove(1, monthlySummaryBox.getChildren().size());

        String monthName = Month.of(month).getDisplayName(TextStyle.FULL, Locale.ENGLISH) + " " + year;

        int totalJars = deliveryService.getMonthlyJarTotal(month, year);
        int totalBottles = deliveryService.getMonthlyBottleTotal(month, year);

        List<Bill> bills = billService.getBillsByMonth(month, year);
        double paidAmount = bills.stream().filter(b -> "PAID".equals(b.getStatus())).mapToDouble(Bill::getGrandTotal).sum();
        double pendingAmount = bills.stream().filter(b -> "PENDING".equals(b.getStatus())).mapToDouble(Bill::getGrandTotal).sum();
        double totalBilled = paidAmount + pendingAmount;

        int totalDeliveriesThisMonth = deliveryService.getDeliveriesByMonth(month, year).size();

        // Last month comparison
        LocalDate lastMonth = now.minusMonths(1);
        int lm = lastMonth.getMonthValue(), ly = lastMonth.getYear();
        int lastMonthJars = deliveryService.getMonthlyJarTotal(lm, ly);
        int lastMonthBottles = deliveryService.getMonthlyBottleTotal(lm, ly);
        double lastMonthIncome = billService.getMonthlyIncome(lm, ly);

        GridPane grid = new GridPane();
        grid.setHgap(20);
        grid.setVgap(10);
        grid.setPadding(new Insets(5, 0, 0, 0));

        // Column 1: Deliveries summary
        addSummaryItem(grid, 0, 0, "📅 Month", monthName);
        addSummaryItem(grid, 1, 0, "📦 Total Deliveries", String.valueOf(totalDeliveriesThisMonth));
        addSummaryItem(grid, 2, 0, "🫙 Jars Delivered", totalJars + getChangeIndicator(totalJars, lastMonthJars));
        addSummaryItem(grid, 3, 0, "🍶 Bottles Delivered", totalBottles + getChangeIndicator(totalBottles, lastMonthBottles));

        // Column 2: Financial summary
        addSummaryItem(grid, 0, 2, "💳 Total Billed", String.format("₹%.0f", totalBilled));
        addSummaryItem(grid, 1, 2, "✅ Collected", String.format("₹%.0f", paidAmount));
        addSummaryItem(grid, 2, 2, "⏳ Outstanding", String.format("₹%.0f", pendingAmount));
        String lastMonthStr = lastMonth.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
        addSummaryItem(grid, 3, 2, "📊 " + lastMonthStr + " Income", String.format("₹%.0f", lastMonthIncome));

        // Column constraints to make it even
        ColumnConstraints col1 = new ColumnConstraints();
        col1.setPercentWidth(15);
        ColumnConstraints col2 = new ColumnConstraints();
        col2.setPercentWidth(35);
        ColumnConstraints col3 = new ColumnConstraints();
        col3.setPercentWidth(15);
        ColumnConstraints col4 = new ColumnConstraints();
        col4.setPercentWidth(35);
        grid.getColumnConstraints().addAll(col1, col2, col3, col4);

        monthlySummaryBox.getChildren().add(grid);
    }

    private String getChangeIndicator(int current, int previous) {
        if (previous == 0) return "";
        int diff = current - previous;
        if (diff > 0) return "  ▲" + diff;
        else if (diff < 0) return "  ▼" + Math.abs(diff);
        return "  ―";
    }

    private void addSummaryItem(GridPane grid, int row, int col, String label, String value) {
        Label lblLabel = new Label(label);
        lblLabel.setFont(Font.font("System", FontWeight.NORMAL, 12));
        lblLabel.setStyle("-fx-text-fill: #666;");

        Label lblValue = new Label(value);
        lblValue.setFont(Font.font("System", FontWeight.BOLD, 13));
        lblValue.setStyle("-fx-text-fill: #1a1a2e;");

        grid.add(lblLabel, col, row);
        grid.add(lblValue, col + 1, row);
    }

    private void refreshRouteBreakdown() {
        if (routeBreakdownBox.getChildren().size() > 1)
            routeBreakdownBox.getChildren().remove(1, routeBreakdownBox.getChildren().size());

        List<Customer> allCustomers = customerService.getAllCustomers();
        Map<String, Long> routeMap = allCustomers.stream()
                .collect(Collectors.groupingBy(
                        c -> (c.getRoute() == null || c.getRoute().isEmpty()) ? "No Route" : c.getRoute(),
                        Collectors.counting()
                ));

        if (routeMap.isEmpty()) {
            Label empty = new Label("No customers registered yet");
            empty.setStyle("-fx-text-fill: #999; -fx-font-style: italic; -fx-padding: 15 0 0 0;");
            routeBreakdownBox.getChildren().add(empty);
            return;
        }

        VBox barsBox = new VBox(8);
        barsBox.setPadding(new Insets(5, 0, 0, 0));

        long maxCount = routeMap.values().stream().mapToLong(l -> l).max().orElse(1);
        String[] colors = {"#0069b4", "#27ae60", "#8e44ad", "#e67e22", "#e74c3c", "#2ecc71", "#3498db", "#9b59b6"};
        int colorIdx = 0;

        for (Map.Entry<String, Long> entry : routeMap.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .collect(Collectors.toList())) {

            String route = entry.getKey();
            long count = entry.getValue();
            String color = colors[colorIdx % colors.length];

            HBox rowBox = new HBox(10);
            rowBox.setAlignment(Pos.CENTER_LEFT);

            Label routeLabel = new Label(route);
            routeLabel.setFont(Font.font("System", FontWeight.SEMI_BOLD, 12));
            routeLabel.setStyle("-fx-text-fill: #333;");
            routeLabel.setMinWidth(90);
            routeLabel.setMaxWidth(90);

            double barPercent = (double) count / maxCount;
            Region bar = new Region();
            bar.setMinHeight(20);
            bar.setMaxHeight(20);
            bar.setStyle("-fx-background-color: " + color + "; -fx-background-radius: 5;");
            bar.setMinWidth(Math.max(30, barPercent * 200));

            Label countLabel = new Label(count + " customer" + (count > 1 ? "s" : ""));
            countLabel.setFont(Font.font("System", FontWeight.NORMAL, 11));
            countLabel.setStyle("-fx-text-fill: #666;");

            rowBox.getChildren().addAll(routeLabel, bar, countLabel);
            barsBox.getChildren().add(rowBox);
            colorIdx++;
        }

        ScrollPane scroll = new ScrollPane(barsBox);
        scroll.setFitToWidth(true);
        scroll.setMaxHeight(160);
        scroll.setStyle("-fx-background: transparent; -fx-background-color: transparent;");
        VBox.setVgrow(scroll, Priority.ALWAYS);
        routeBreakdownBox.getChildren().add(scroll);
    }

    private HBox makeTableRow(String col1, String col2, String col3, boolean isHeader) {
        HBox row = new HBox();
        row.setAlignment(Pos.CENTER_LEFT);
        row.setPadding(new Insets(6, 10, 6, 10));
        row.setStyle("-fx-background-radius: 6;");

        Label l1 = new Label(col1);
        l1.setMinWidth(140);
        l1.setMaxWidth(Double.MAX_VALUE);
        HBox.setHgrow(l1, Priority.ALWAYS);

        Label l2 = new Label(col2);
        l2.setMinWidth(70);
        l2.setAlignment(Pos.CENTER_RIGHT);

        Label l3 = new Label(col3);
        l3.setMinWidth(80);
        l3.setAlignment(Pos.CENTER_RIGHT);

        if (isHeader) {
            l1.setFont(Font.font("System", FontWeight.BOLD, 12));
            l2.setFont(Font.font("System", FontWeight.BOLD, 12));
            l3.setFont(Font.font("System", FontWeight.BOLD, 12));
            l1.setStyle("-fx-text-fill: #333;");
            l2.setStyle("-fx-text-fill: #333;");
            l3.setStyle("-fx-text-fill: #333;");
            row.setStyle("-fx-border-color: #ddd; -fx-border-width: 0 0 1 0; -fx-background-radius: 0;");
        } else {
            l1.setFont(Font.font("System", 12));
            l2.setFont(Font.font("System", 12));
            l3.setFont(Font.font("System", 12));
            l1.setStyle("-fx-text-fill: #444;");
            l2.setStyle("-fx-text-fill: #444;");
            l3.setStyle("-fx-text-fill: #e67e22;");
        }

        row.getChildren().addAll(l1, l2, l3);
        return row;
    }
}
