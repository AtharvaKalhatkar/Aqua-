package com.aqua.controller;

import com.aqua.model.Bill;
import com.aqua.model.Customer;
import com.aqua.service.BillService;
import com.aqua.service.CustomerService;
import com.aqua.util.AlertUtil;

import javafx.beans.property.SimpleIntegerProperty;
import javafx.beans.property.SimpleObjectProperty;
import javafx.beans.property.SimpleStringProperty;
import javafx.collections.FXCollections;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.*;
import javafx.scene.input.KeyCode;
import javafx.scene.layout.*;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;

import java.time.LocalDate;
import java.time.Month;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class BulkBillingView extends VBox {

    private final BillService billService = new BillService();
    private final CustomerService customerService = new CustomerService();

    private ComboBox<String> monthCombo;
    private ComboBox<Integer> yearCombo;
    private TableView<BulkBillItem> table;
    private Label summaryLabel;

    public static class BulkBillItem {
        private final Customer customer;
        private final int totalJars;
        private final int totalBottles;
        private final TextField jarRateField;
        private final TextField bottleRateField;

        public BulkBillItem(Customer customer, int totalJars, int totalBottles, Double prevJarRate, Double prevBotRate) {
            this.customer = customer;
            this.totalJars = totalJars;
            this.totalBottles = totalBottles;
            
            this.jarRateField = new TextField();
            this.jarRateField.setPromptText("Rate");
            this.jarRateField.setStyle("-fx-alignment: center; -fx-pref-width: 80; -fx-background-radius: 4; -fx-border-radius: 4; -fx-border-color: #dee2e6;");
            if (prevJarRate != null) this.jarRateField.setText(String.valueOf(prevJarRate));

            this.bottleRateField = new TextField();
            this.bottleRateField.setPromptText("Rate");
            this.bottleRateField.setStyle("-fx-alignment: center; -fx-pref-width: 80; -fx-background-radius: 4; -fx-border-radius: 4; -fx-border-color: #dee2e6;");
            if (prevBotRate != null) this.bottleRateField.setText(String.valueOf(prevBotRate));
        }

        public Customer getCustomer() { return customer; }
        public int getTotalJars() { return totalJars; }
        public int getTotalBottles() { return totalBottles; }
        public TextField getJarRateField() { return jarRateField; }
        public TextField getBottleRateField() { return bottleRateField; }
    }

    public BulkBillingView() {
        setPadding(new Insets(30));
        setSpacing(20);
        getStyleClass().add("content-area");

        buildHeader();
        buildControls();
        buildTable();
        
        loadUnbilled();
    }

    private void buildHeader() {
        Label title = new Label("Auto Bulk Billing (Calculations)");
        title.getStyleClass().add("page-title");
        Label subtitle = new Label("Fast-entry grid for pending bills. Press ENTER to jump to the next block.");
        subtitle.getStyleClass().add("page-subtitle");
        getChildren().add(new VBox(5, title, subtitle));
    }

    private void buildControls() {
        HBox row = new HBox(15);
        row.setAlignment(Pos.CENTER_LEFT);
        row.getStyleClass().add("form-section");
        row.setPadding(new Insets(15, 20, 15, 20));

        monthCombo = new ComboBox<>();
        for (Month m : Month.values())
            monthCombo.getItems().add(m.getDisplayName(TextStyle.FULL, Locale.ENGLISH));
        monthCombo.getSelectionModel().select(LocalDate.now().getMonthValue() - 1);
        monthCombo.setOnAction(e -> loadUnbilled());

        yearCombo = new ComboBox<>();
        int cy = LocalDate.now().getYear();
        for (int y = cy - 5; y <= cy + 1; y++)
            yearCombo.getItems().add(y);
        yearCombo.getSelectionModel().select(Integer.valueOf(cy));
        yearCombo.setOnAction(e -> loadUnbilled());

        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);

        Button generateBtn = new Button("⚡ Generate All Bills");
        generateBtn.getStyleClass().add("btn-primary");
        generateBtn.setOnAction(e -> generateBulk());

        row.getChildren().addAll(
                new Label("Bill Month:") {{ getStyleClass().add("form-label"); }}, monthCombo,
                new Label("Year:") {{ getStyleClass().add("form-label"); }}, yearCombo,
                spacer, generateBtn
        );
        getChildren().add(row);
    }

    @SuppressWarnings("unchecked")
    private void buildTable() {
        table = new TableView<>();
        table.getStyleClass().add("data-table");
        VBox.setVgrow(table, Priority.ALWAYS);
        table.setPlaceholder(new Label("No pending unbilled deliveries found for this month."));
        table.setColumnResizePolicy(TableView.CONSTRAINED_RESIZE_POLICY);

        TableColumn<BulkBillItem, String> custCol = new TableColumn<>("Customer Name");
        custCol.setCellValueFactory(data -> new SimpleStringProperty(data.getValue().getCustomer().getName()));
        
        TableColumn<BulkBillItem, Integer> jarsCol = new TableColumn<>("Delivered Jars");
        jarsCol.setCellValueFactory(data -> new SimpleObjectProperty<>(data.getValue().getTotalJars()));
        
        TableColumn<BulkBillItem, TextField> jarRateCol = new TableColumn<>("Jar Rate ₹");
        jarRateCol.setCellValueFactory(data -> new SimpleObjectProperty<>(data.getValue().getJarRateField()));
        jarRateCol.setStyle("-fx-alignment: CENTER;");

        TableColumn<BulkBillItem, Integer> botCol = new TableColumn<>("Delivered Bottles");
        botCol.setCellValueFactory(data -> new SimpleObjectProperty<>(data.getValue().getTotalBottles()));

        TableColumn<BulkBillItem, TextField> botRateCol = new TableColumn<>("Bottle Rate ₹");
        botRateCol.setCellValueFactory(data -> new SimpleObjectProperty<>(data.getValue().getBottleRateField()));
        botRateCol.setStyle("-fx-alignment: CENTER;");

        table.getColumns().addAll(custCol, jarsCol, jarRateCol, botCol, botRateCol);

        summaryLabel = new Label();
        summaryLabel.setFont(Font.font("System", FontWeight.BOLD, 14));
        summaryLabel.setPadding(new Insets(10, 0, 0, 0));

        getChildren().addAll(table, summaryLabel);
    }

    public void refreshData() {
        loadUnbilled();
    }

    private void loadUnbilled() {
        int m = monthCombo.getSelectionModel().getSelectedIndex() + 1;
        int y = yearCombo.getSelectionModel().getSelectedItem();
        
        int prevM = m == 1 ? 12 : m - 1;
        int prevY = m == 1 ? y - 1 : y;

        List<Customer> activeCusts = customerService.getActiveCustomersInMonth(m, y);
        List<BulkBillItem> list = new ArrayList<>();
        
        for (Customer c : activeCusts) {
            // Only add if bill does NOT exist
            if (billService.getBillForCustomer(c.getId(), m, y) == null) {
                int j = billService.getTotalJars(c.getId(), m, y);
                int b = billService.getTotalBottles(c.getId(), m, y);
                
                // Fetch previous bill to pre-fill rates
                Bill prevBill = billService.getBillForCustomer(c.getId(), prevM, prevY);
                Double prevJarRate = (prevBill != null) ? prevBill.getJarRate() : null;
                Double prevBotRate = (prevBill != null) ? prevBill.getBottleRate() : null;

                list.add(new BulkBillItem(c, j, b, prevJarRate, prevBotRate));
            }
        }
        
        table.setItems(FXCollections.observableArrayList(list));
        summaryLabel.setText("Total Pending Customers: " + list.size());

        // Setup Enter key navigation
        setupKeyboardNavigation();
    }
    
    private void setupKeyboardNavigation() {
        javafx.application.Platform.runLater(() -> {
            List<TextField> inputs = new ArrayList<>();
            for (BulkBillItem item : table.getItems()) {
                inputs.add(item.getJarRateField());
                inputs.add(item.getBottleRateField());
            }
            
            for (int i = 0; i < inputs.size(); i++) {
                final int nextIdx = (i + 1) % inputs.size();
                TextField current = inputs.get(i);
                current.setOnKeyPressed(e -> {
                    if (e.getCode() == KeyCode.ENTER) {
                        inputs.get(nextIdx).requestFocus();
                        e.consume();
                    }
                });
            }
        });
    }

    private void generateBulk() {
        if (table.getItems().isEmpty()) {
            AlertUtil.showWarning("No Data", "There are no pending bills to generate.");
            return;
        }

        Alert confirm = new Alert(Alert.AlertType.CONFIRMATION);
        confirm.setTitle("Confirm Bulk Billing");
        confirm.setHeaderText("Generate " + table.getItems().size() + " invoices?");
        confirm.setContentText("Are you sure you want to process these bills? Please ensure all rates are entered correctly.");
        
        if (confirm.showAndWait().orElse(ButtonType.CANCEL) == ButtonType.OK) {
            
            Alert confirm2 = new Alert(Alert.AlertType.CONFIRMATION);
            confirm2.setTitle("Final Security Check");
            confirm2.setHeaderText("WARNING: Final Confirmation");
            confirm2.setContentText("Are you ABSOLUTELY sure? This will lock in the rates and instantly generate " + table.getItems().size() + " official bills.");
            
            if (confirm2.showAndWait().orElse(ButtonType.CANCEL) == ButtonType.OK) {
                int m = monthCombo.getSelectionModel().getSelectedIndex() + 1;
                int y = yearCombo.getSelectionModel().getSelectedItem();
                
                int success = 0;
                for (BulkBillItem item : table.getItems()) {
                    double jarRate = 0;
                    double botRate = 0;
                    try { jarRate = Double.parseDouble(item.getJarRateField().getText()); } catch(Exception ignored) {}
                    try { botRate = Double.parseDouble(item.getBottleRateField().getText()); } catch(Exception ignored) {}
                    
                    billService.generateBill(item.getCustomer(), m, y, jarRate, botRate);
                    success++;
                }
                
                AlertUtil.showSuccess("Successfully generated " + success + " bills!");
                loadUnbilled();
            }
        }
    }
}
