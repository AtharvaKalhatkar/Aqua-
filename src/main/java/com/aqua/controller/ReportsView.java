package com.aqua.controller;

import com.aqua.model.Customer;
import com.aqua.model.Delivery;
import com.aqua.service.CustomerService;
import com.aqua.service.DeliveryService;
import com.aqua.util.AlertUtil;
import com.aqua.util.ExcelExporter;

import javafx.beans.property.SimpleStringProperty;
import javafx.collections.FXCollections;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.*;
import javafx.scene.layout.*;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;

import java.awt.Desktop;
import java.io.File;
import java.time.LocalDate;
import java.time.Month;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.*;
import java.util.Locale;

/**
 * Register-style spreadsheet view matching the physical delivery register.
 * Rows = Customers, Columns = Dates (1-31), Cells = Daily quantities.
 */
public class ReportsView extends VBox {

    private final DeliveryService deliveryService = new DeliveryService();
    private final CustomerService customerService = new CustomerService();
    private ComboBox<String> monthCombo, routeCombo;
    private ComboBox<Integer> yearCombo;
    private TableView<String[]> registerTable;
    private Label summaryLabel;

    public ReportsView() {
        setPadding(new Insets(25));
        setSpacing(18);
        getStyleClass().add("content-area");
        buildHeader();
        buildControls();
        buildRegisterTable();
        loadData();
    }

    private void buildHeader() {
        Label title = new Label("📋 Delivery Register");
        title.getStyleClass().add("page-title");
        Label sub = new Label("Date-wise delivery record for each customer — just like your physical register book");
        sub.getStyleClass().add("page-subtitle");
        getChildren().add(new VBox(4, title, sub));
    }

    private void buildControls() {
        HBox row = new HBox(12);
        row.setAlignment(Pos.CENTER_LEFT);
        row.setStyle("-fx-background-color: white; -fx-background-radius: 12; -fx-effect: dropshadow(gaussian,rgba(0,0,0,0.06),8,0,0,2);");
        row.setPadding(new Insets(14, 18, 14, 18));

        monthCombo = new ComboBox<>();
        for (Month m : Month.values()) monthCombo.getItems().add(m.getDisplayName(TextStyle.FULL, Locale.ENGLISH));
        monthCombo.getSelectionModel().select(LocalDate.now().getMonthValue() - 1);
        monthCombo.setPrefWidth(140);

        yearCombo = new ComboBox<>();
        int cy = LocalDate.now().getYear();
        for (int y = cy - 5; y <= cy + 1; y++) yearCombo.getItems().add(y);
        yearCombo.getSelectionModel().select(Integer.valueOf(cy));

        routeCombo = new ComboBox<>();
        routeCombo.getItems().add("All Routes");
        routeCombo.getItems().addAll(customerService.getAllRoutes());
        routeCombo.getSelectionModel().selectFirst();
        routeCombo.setPrefWidth(150);

        Button loadBtn = new Button("🔄 Load");
        loadBtn.getStyleClass().add("btn-primary");
        loadBtn.setOnAction(e -> loadData());

        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);

        Button excelBtn = new Button("📥 Download Excel");
        excelBtn.getStyleClass().add("btn-primary");
        excelBtn.setStyle("-fx-background-color: linear-gradient(to bottom, #27ae60, #1e8449);");
        excelBtn.setOnAction(e -> exportExcel());

        summaryLabel = new Label("");
        summaryLabel.setFont(Font.font("System", FontWeight.SEMI_BOLD, 12));
        summaryLabel.setStyle("-fx-text-fill: #555;");

        row.getChildren().addAll(
            new Label("Month:") {{ getStyleClass().add("form-label"); }}, monthCombo,
            new Label("Year:") {{ getStyleClass().add("form-label"); }}, yearCombo,
            new Label("Route:") {{ getStyleClass().add("form-label"); }}, routeCombo,
            loadBtn, spacer, excelBtn
        );

        getChildren().addAll(row);
    }

    private void buildRegisterTable() {
        VBox tableBox = new VBox(8);
        tableBox.setStyle("-fx-background-color: white; -fx-background-radius: 12; -fx-effect: dropshadow(gaussian,rgba(0,0,0,0.06),8,0,0,2);");
        tableBox.setPadding(new Insets(15));
        VBox.setVgrow(tableBox, Priority.ALWAYS);

        registerTable = new TableView<>();
        registerTable.getStyleClass().add("data-table");
        registerTable.setPlaceholder(new Label("Select month/year and click Load to see the delivery register."));
        VBox.setVgrow(registerTable, Priority.ALWAYS);

        tableBox.getChildren().addAll(registerTable, summaryLabel);
        getChildren().add(tableBox);
    }

    private int getMonth() { return monthCombo.getSelectionModel().getSelectedIndex() + 1; }
    private int getYear() { return yearCombo.getSelectionModel().getSelectedItem(); }

    @SuppressWarnings("unchecked")
    private void loadData() {
        int month = getMonth(), year = getYear();
        int daysInMonth = YearMonth.of(year, month).lengthOfMonth();

        // Get customers (filtered by route if selected)
        String route = routeCombo.getSelectionModel().getSelectedItem();
        List<Customer> customers;
        if (route != null && !"All Routes".equals(route)) {
            customers = customerService.getCustomersByRoute(route);
        } else {
            customers = customerService.getAllCustomers();
        }

        // Get all deliveries for this month
        List<Delivery> deliveries = deliveryService.getDeliveriesByMonth(month, year);

        // Build lookup: customerId -> { day -> "jars/bottles" }
        Map<Integer, Map<Integer, int[]>> lookup = new HashMap<>();
        for (Delivery d : deliveries) {
            lookup.computeIfAbsent(d.getCustomerId(), k -> new HashMap<>());
            int day = d.getDeliveryDate().getDayOfMonth();
            int[] qty = lookup.get(d.getCustomerId()).computeIfAbsent(day, k -> new int[]{0, 0});
            qty[0] += d.getJarQty();
            qty[1] += d.getBottleQty();
        }

        // Build table columns: Sr | Customer | 1 | 2 | 3 | ... | 31 | Total Jars | Total Bottles
        registerTable.getColumns().clear();

        TableColumn<String[], String> srCol = new TableColumn<>("Sr.");
        srCol.setCellValueFactory(c -> new SimpleStringProperty(c.getValue()[0]));
        srCol.setPrefWidth(40);
        srCol.setStyle("-fx-alignment: CENTER;");

        TableColumn<String[], String> nameCol = new TableColumn<>("Customer");
        nameCol.setCellValueFactory(c -> new SimpleStringProperty(c.getValue()[1]));
        nameCol.setPrefWidth(160);
        nameCol.setMinWidth(140);

        registerTable.getColumns().addAll(srCol, nameCol);

        for (int d = 1; d <= daysInMonth; d++) {
            final int colIdx = d + 1; // offset: 0=sr, 1=name, 2=day1, ...
            TableColumn<String[], String> dayCol = new TableColumn<>(String.valueOf(d));
            dayCol.setCellValueFactory(c -> {
                String[] row = c.getValue();
                return new SimpleStringProperty(colIdx < row.length ? row[colIdx] : "");
            });
            dayCol.setPrefWidth(50);
            dayCol.setMinWidth(42);
            dayCol.setStyle("-fx-alignment: CENTER;");
            dayCol.setCellFactory(col -> new TableCell<>() {
                @Override protected void updateItem(String item, boolean empty) {
                    super.updateItem(item, empty);
                    if (empty || item == null || item.isEmpty()) {
                        setText("-");
                        setStyle("-fx-alignment: CENTER; -fx-text-fill: #ccc; -fx-font-size: 10px;");
                    } else {
                        setText(item);
                        setStyle("-fx-alignment: CENTER; -fx-font-weight: bold; -fx-text-fill: #0069b4; -fx-font-size: 11px;");
                    }
                }
            });
            registerTable.getColumns().add(dayCol);
        }

        // Total columns
        int totalJarIdx = daysInMonth + 2;
        int totalBotIdx = daysInMonth + 3;

        TableColumn<String[], String> totJarCol = new TableColumn<>("Jars");
        totJarCol.setCellValueFactory(c -> new SimpleStringProperty(c.getValue()[totalJarIdx]));
        totJarCol.setPrefWidth(55);
        totJarCol.setStyle("-fx-alignment: CENTER;");
        totJarCol.setCellFactory(col -> new TableCell<>() {
            @Override protected void updateItem(String item, boolean empty) {
                super.updateItem(item, empty);
                setText(empty ? null : item);
                setStyle("-fx-alignment: CENTER; -fx-font-weight: bold; -fx-text-fill: #e67e22;");
            }
        });

        TableColumn<String[], String> totBotCol = new TableColumn<>("Bottles");
        totBotCol.setCellValueFactory(c -> new SimpleStringProperty(c.getValue()[totalBotIdx]));
        totBotCol.setPrefWidth(55);
        totBotCol.setStyle("-fx-alignment: CENTER;");
        totBotCol.setCellFactory(col -> new TableCell<>() {
            @Override protected void updateItem(String item, boolean empty) {
                super.updateItem(item, empty);
                setText(empty ? null : item);
                setStyle("-fx-alignment: CENTER; -fx-font-weight: bold; -fx-text-fill: #27ae60;");
            }
        });

        registerTable.getColumns().addAll(totJarCol, totBotCol);

        // Build data rows
        List<String[]> rows = new ArrayList<>();
        int grandJars = 0, grandBottles = 0;
        int sr = 1;

        for (Customer c : customers) {
            Map<Integer, int[]> dayMap = lookup.getOrDefault(c.getId(), Collections.emptyMap());
            // Only show customers who have deliveries (or show all if you want)
            if (dayMap.isEmpty()) continue;

            String[] row = new String[daysInMonth + 4]; // sr + name + days + totalJars + totalBottles
            row[0] = String.valueOf(sr++);
            row[1] = c.getName();

            int custJars = 0, custBottles = 0;
            for (int d = 1; d <= daysInMonth; d++) {
                int[] qty = dayMap.getOrDefault(d, new int[]{0, 0});
                if (qty[0] > 0 || qty[1] > 0) {
                    row[d + 1] = qty[0] + "/" + qty[1];
                } else {
                    row[d + 1] = "";
                }
                custJars += qty[0];
                custBottles += qty[1];
            }
            row[totalJarIdx] = String.valueOf(custJars);
            row[totalBotIdx] = String.valueOf(custBottles);

            grandJars += custJars;
            grandBottles += custBottles;
            rows.add(row);
        }

        registerTable.setItems(FXCollections.observableArrayList(rows));
        summaryLabel.setText(String.format("%d customers  |  Grand Total — Jars: %d  |  Bottles: %d",
                rows.size(), grandJars, grandBottles));
    }

    private void exportExcel() {
        if (registerTable.getItems().isEmpty()) { AlertUtil.showWarning("No Data", "No records to export."); return; }

        try {
            int month = getMonth(), year = getYear();
            int daysInMonth = YearMonth.of(year, month).lengthOfMonth();
            String monthName = monthCombo.getValue();

            // Get all deliveries for this month as a flat list too
            List<Delivery> deliveries = deliveryService.getDeliveriesByMonth(month, year);

            String dir = System.getProperty("user.home") + File.separator + "Documents" + File.separator + "AquaReports";
            new File(dir).mkdirs();
            String fileName = String.format("Delivery_Register_%s_%d.xlsx", monthName, year);
            String path = dir + File.separator + fileName;

            // Use register-format export
            ExcelExporter.exportRegister(registerTable.getItems(), daysInMonth, path,
                    "Delivery Register — " + monthName + " " + year);

            AlertUtil.showSuccess("Excel saved!\n" + path);
            if (Desktop.isDesktopSupported()) Desktop.getDesktop().open(new File(path));
        } catch (Exception e) {
            AlertUtil.showError("Export Error", e.getMessage());
            e.printStackTrace();
        }
    }

    public void refreshData() { loadData(); }
}
