package com.aqua.controller;

import com.aqua.model.Bill;
import com.aqua.model.Customer;
import com.aqua.service.BillService;
import com.aqua.service.CustomerService;
import com.aqua.util.AlertUtil;
import com.aqua.util.EmailService;

import javafx.beans.property.SimpleBooleanProperty;
import javafx.beans.property.SimpleObjectProperty;
import javafx.collections.FXCollections;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.*;
import javafx.scene.control.cell.CheckBoxTableCell;
import javafx.scene.control.cell.PropertyValueFactory;
import javafx.scene.layout.*;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;

import java.awt.Desktop;
import java.time.LocalDate;
import java.time.Month;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class BroadcasterView extends VBox {

    private final BillService billService = new BillService();
    private final CustomerService customerService = new CustomerService();
    private final EmailService emailService = new EmailService();

    private ComboBox<String> monthCombo;
    private ComboBox<Integer> yearCombo;
    private TableView<BillSelection> table;
    private Label summaryLabel;
    
    // Wrapper class to hold selection state
    public static class BillSelection {
        private final SimpleBooleanProperty selected;
        private final Bill bill;

        public BillSelection(Bill bill, boolean selected) {
            this.selected = new SimpleBooleanProperty(selected);
            this.bill = bill;
        }

        public SimpleBooleanProperty selectedProperty() { return selected; }
        public boolean isSelected() { return selected.get(); }
        public void setSelected(boolean sel) { selected.set(sel); }
        public Bill getBill() { return bill; }
    }

    public BroadcasterView() {
        setPadding(new Insets(30));
        setSpacing(20);
        getStyleClass().add("content-area");

        buildHeader();
        buildControls();
        buildTable();
        
        loadBills();
    }

    private void buildHeader() {
        Label title = new Label("WhatsApp Broadcaster");
        title.getStyleClass().add("page-title");
        Label subtitle = new Label("Select customers to bulk-send generated bills for a specific month");
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
        monthCombo.setOnAction(e -> loadBills());

        yearCombo = new ComboBox<>();
        int cy = LocalDate.now().getYear();
        for (int y = cy - 5; y <= cy + 1; y++)
            yearCombo.getItems().add(y);
        yearCombo.getSelectionModel().select(Integer.valueOf(cy));
        yearCombo.setOnAction(e -> loadBills());

        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);

        Button selectAllBtn = new Button("☑️ Select All");
        selectAllBtn.getStyleClass().add("btn-secondary");
        selectAllBtn.setOnAction(e -> toggleAll(true));

        Button deselectAllBtn = new Button("☐ Deselect All");
        deselectAllBtn.getStyleClass().add("btn-secondary");
        deselectAllBtn.setOnAction(e -> toggleAll(false));

        Button sendBtn = new Button("💬 Send WhatsApp to Selected");
        sendBtn.getStyleClass().add("btn-primary");
        sendBtn.setStyle("-fx-background-color: #25D366; -fx-text-fill: white; -fx-font-weight: bold; -fx-border-radius: 4px;");
        sendBtn.setOnAction(e -> sendBulkWhatsApp());

        row.getChildren().addAll(
                new Label("Bill Month:") {{ getStyleClass().add("form-label"); }}, monthCombo,
                new Label("Year:") {{ getStyleClass().add("form-label"); }}, yearCombo,
                spacer, selectAllBtn, deselectAllBtn, sendBtn
        );
        getChildren().add(row);
    }

    @SuppressWarnings("unchecked")
    private void buildTable() {
        table = new TableView<>();
        table.getStyleClass().add("data-table");
        VBox.setVgrow(table, Priority.ALWAYS);
        table.setPlaceholder(new Label("No bills generated for this month yet."));
        table.setColumnResizePolicy(TableView.CONSTRAINED_RESIZE_POLICY);

        TableColumn<BillSelection, Boolean> selCol = new TableColumn<>("Send");
        selCol.setCellValueFactory(data -> data.getValue().selectedProperty());
        selCol.setCellFactory(CheckBoxTableCell.forTableColumn(selCol));
        selCol.setPrefWidth(60);
        selCol.setMinWidth(60);
        selCol.setMaxWidth(60);

        TableColumn<BillSelection, String> custCol = new TableColumn<>("Customer Name");
        custCol.setCellValueFactory(data -> new SimpleObjectProperty<>(data.getValue().getBill().getCustomerName()));
        
        TableColumn<BillSelection, String> mobileCol = new TableColumn<>("Mobile");
        mobileCol.setCellValueFactory(data -> {
            Customer cust = customerService.getCustomerById(data.getValue().getBill().getCustomerId());
            String mob = (cust != null && cust.getMobile() != null) ? cust.getMobile() : "N/A";
            return new SimpleObjectProperty<>(mob);
        });

        TableColumn<BillSelection, Integer> jarsCol = new TableColumn<>("Total Jars");
        jarsCol.setCellValueFactory(data -> new SimpleObjectProperty<>(data.getValue().getBill().getTotalJars()));
        
        TableColumn<BillSelection, Integer> botCol = new TableColumn<>("Total Bottles");
        botCol.setCellValueFactory(data -> new SimpleObjectProperty<>(data.getValue().getBill().getTotalBottles()));

        TableColumn<BillSelection, Double> totalCol = new TableColumn<>("Grand Total ₹");
        totalCol.setCellValueFactory(data -> new SimpleObjectProperty<>(data.getValue().getBill().getGrandTotal()));

        TableColumn<BillSelection, String> statusCol = new TableColumn<>("Status");
        statusCol.setCellValueFactory(data -> new SimpleObjectProperty<>(data.getValue().getBill().getStatus()));
        statusCol.setCellFactory(col -> new TableCell<>() {
            @Override
            protected void updateItem(String item, boolean empty) {
                super.updateItem(item, empty);
                if (empty || item == null) {
                    setText(null);
                    setStyle("");
                } else {
                    setText(item);
                    setStyle("PAID".equals(item) ? "-fx-text-fill:#27ae60;-fx-font-weight:bold;" : "-fx-text-fill:#e67e22;-fx-font-weight:bold;");
                }
            }
        });

        table.getColumns().addAll(selCol, custCol, mobileCol, jarsCol, botCol, totalCol, statusCol);
        table.setEditable(true);

        summaryLabel = new Label();
        summaryLabel.setFont(Font.font("System", FontWeight.BOLD, 14));
        summaryLabel.setPadding(new Insets(10, 0, 0, 0));

        getChildren().addAll(table, summaryLabel);
    }

    public void refreshData() {
        loadBills();
    }

    private void loadBills() {
        int m = monthCombo.getSelectionModel().getSelectedIndex() + 1;
        int y = yearCombo.getSelectionModel().getSelectedItem();
        
        List<Bill> bills = billService.getBillsByMonth(m, y);
        List<BillSelection> list = new ArrayList<>();
        
        for (Bill b : bills) {
            // Default to selected if pending, unselected if paid (optional, let's default all to false for safety)
            list.add(new BillSelection(b, false));
        }
        
        table.setItems(FXCollections.observableArrayList(list));
        summaryLabel.setText("Total Generated Bills: " + bills.size());
    }

    private void toggleAll(boolean state) {
        if (table.getItems() != null) {
            for (BillSelection bs : table.getItems()) {
                bs.setSelected(state);
            }
        }
    }

    private void sendBulkWhatsApp() {
        List<BillSelection> selected = new ArrayList<>();
        for (BillSelection bs : table.getItems()) {
            if (bs.isSelected()) selected.add(bs);
        }

        if (selected.isEmpty()) {
            AlertUtil.showWarning("No Selection", "Please select at least one customer to send a message.");
            return;
        }

        Alert progressAlert = new Alert(Alert.AlertType.INFORMATION);
        progressAlert.setTitle("Broadcaster (Safe Mode)");
        progressAlert.setHeaderText("Sending bills to " + selected.size() + " customers...");
        progressAlert.setContentText("Please wait. Do not close this window.\nWaiting 15 seconds between each message to prevent bans.");
        progressAlert.show();

        new Thread(() -> {
            int count = 0;
            for (BillSelection bs : selected) {
                Bill oldBill = bs.getBill();
                Customer cust = customerService.getCustomerById(oldBill.getCustomerId());
                if (cust == null) continue;
                
                // CRITICAL FIX: Recalculate the bill right before sending to ensure it captures any new deliveries added after the bill was originally saved!
                Bill bill = billService.generateBill(cust, oldBill.getBillMonth(), oldBill.getBillYear(), oldBill.getJarRate(), oldBill.getBottleRate());
                
                String mobile = (cust.getMobile() != null) ? cust.getMobile().replaceAll("[^0-9]", "") : "";
                if (mobile.isEmpty()) continue;
                if (mobile.length() == 10) mobile = "91" + mobile;

                try {
                    StringBuilder msg = new StringBuilder();
                    msg.append("*Bhairavnath Cool Aqua* 💧\n");
                    msg.append("Dear ").append(bill.getCustomerName()).append(",\n");
                    msg.append("Your water delivery bill for *").append(bill.getMonthName()).append(" ")
                            .append(bill.getBillYear()).append("* is ready.\n\n");
                    msg.append("*Bill Summary:*\n");
                    msg.append("Jars (20L): ").append(bill.getTotalJars()).append(" x ₹")
                            .append(String.format("%.0f", bill.getJarRate())).append(" = ₹")
                            .append(String.format("%.0f", bill.getJarAmount())).append("\n");
                    msg.append("Bottles (20L): ").append(bill.getTotalBottles()).append(" x ₹")
                            .append(String.format("%.0f", bill.getBottleRate())).append(" = ₹")
                            .append(String.format("%.0f", bill.getBottleAmount())).append("\n");
                    msg.append("--------------------\n");
                    msg.append("*Grand Total: ₹").append(String.format("%.0f", bill.getGrandTotal())).append("*\n\n");

                    String upiId = emailService.getUpiId();
                    if (upiId == null || upiId.trim().isEmpty()) {
                        upiId = "kalhatkaratharva01@okhdfcbank";
                    }

                    String senderName = emailService.getSenderName() != null ? emailService.getSenderName() : "Bhairavnath Cool Aqua";
                    String upiUri = String.format("upi://pay?pa=%s&pn=%s&am=%.0f&cu=INR&tn=AquaBill",
                            upiId.trim().replace(" ", ""),
                            senderName.trim().replace(" ", "%20"),
                            bill.getGrandTotal());

                    msg.append("💳 *Pay Instantly via UPI:*\n");
                    msg.append(upiUri).append("\n\n");
                    msg.append("Or pay directly to UPI ID: *").append(upiId.trim()).append("*\n\n");
                    msg.append("Thank you for your business!\n");
                    msg.append("Mob: 7030355656 / 8888355656");

                    String encodedMsg = java.net.URLEncoder.encode(msg.toString(), "UTF-8").replace("+", "%20");
                    String waUrl = "whatsapp://send?phone=" + mobile + "&text=" + encodedMsg;

                    if (Desktop.isDesktopSupported()) {
                        Desktop.getDesktop().browse(new java.net.URI(waUrl));
                    }
                    
                    count++;
                    final int currCount = count;
                    final String cName = bill.getCustomerName();
                    
                    javafx.application.Platform.runLater(() -> {
                        progressAlert.setContentText("Sent " + currCount + " of " + selected.size() + "\nLast sent: " + cName + "\n\nWaiting 15 seconds to prevent spam ban...");
                    });
                    
                    Thread.sleep(15000); 

                } catch (Exception ex) {
                    System.err.println("Broadcaster error for " + bill.getCustomerName() + ": " + ex.getMessage());
                }
            }
            
            final int totalSent = count;
            javafx.application.Platform.runLater(() -> {
                progressAlert.close();
                AlertUtil.showSuccess("Broadcaster Complete!\nSuccessfully opened WhatsApp for " + totalSent + " selected customers.\nRemember to click Send in WhatsApp Desktop!");
            });
        }).start();
    }
}
