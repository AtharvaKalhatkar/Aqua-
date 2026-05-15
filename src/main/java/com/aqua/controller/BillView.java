package com.aqua.controller;

import com.aqua.model.Bill;
import com.aqua.model.Customer;
import com.aqua.service.BillService;
import com.aqua.service.CustomerService;
import com.aqua.util.AlertUtil;
import com.aqua.util.EmailService;
import com.aqua.util.PDFGenerator;

import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.geometry.Bounds;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.*;
import javafx.scene.control.cell.PropertyValueFactory;
import javafx.scene.input.KeyCode;
import javafx.scene.input.KeyEvent;
import javafx.scene.layout.*;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;
import javafx.stage.Popup;

import java.awt.Desktop;
import java.io.File;
import java.time.LocalDate;
import java.time.Month;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.util.List;
import java.util.Locale;

public class BillView extends VBox {

    private final BillService billService = new BillService();
    private final CustomerService customerService = new CustomerService();
    private final EmailService emailService = new EmailService();

    private ComboBox<String> monthCombo, routeCombo;
    private ComboBox<Integer> yearCombo;
    private TextField customerSearchField;
    private ListView<Customer> customerSuggestionList;
    private Popup suggestionPopup;
    private Customer selectedCustomer = null;
    private boolean suppressSearch = false;

    private Label totalJarsLabel, totalBottlesLabel, jarAmountLabel, bottleAmountLabel, grandTotalLabel;
    private TextField jarRateField, bottleRateField;
    private Button saveBillBtn, exportPdfBtn, printBtn;

    private TableView<Bill> billTable;
    private Label totalIncomeLabel;

    public BillView() {
        setPadding(new Insets(30));
        setSpacing(20);
        getStyleClass().add("content-area");
        buildHeader();
        buildControls();
        buildBillForm();
        buildBillTable();
        loadBills();
    }

    private void buildHeader() {
        Label title = new Label("Monthly Billing");
        title.getStyleClass().add("page-title");
        Label subtitle = new Label("Select customer → Enter rates → Save/Print bill | Tab = next | Enter = save");
        subtitle.getStyleClass().add("page-subtitle");
        getChildren().add(new VBox(5, title, subtitle));
    }

    private void buildControls() {
        HBox row = new HBox(12);
        row.setAlignment(Pos.CENTER_LEFT);
        row.getStyleClass().add("form-section");
        row.setPadding(new Insets(15, 20, 15, 20));

        monthCombo = new ComboBox<>();
        for (Month m : Month.values())
            monthCombo.getItems().add(m.getDisplayName(TextStyle.FULL, Locale.ENGLISH));
        monthCombo.getSelectionModel().select(LocalDate.now().getMonthValue() - 1);
        monthCombo.setPrefWidth(140);

        yearCombo = new ComboBox<>();
        int cy = LocalDate.now().getYear();
        for (int y = cy - 5; y <= cy + 1; y++)
            yearCombo.getItems().add(y);
        yearCombo.getSelectionModel().select(Integer.valueOf(cy));
        yearCombo.setPrefWidth(90);

        routeCombo = new ComboBox<>();
        routeCombo.getItems().add("All Routes");
        routeCombo.getItems().addAll(customerService.getAllRoutes());
        routeCombo.getSelectionModel().selectFirst();
        routeCombo.setPrefWidth(150);
        routeCombo.setOnAction(e -> refreshCustomerSearch());

        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);

        Button loadBtn = new Button("🔄  Load Bills");
        loadBtn.getStyleClass().add("btn-secondary");
        loadBtn.setOnAction(e -> loadBills());

        row.getChildren().addAll(
                new Label("Month:") {
                    {
                        getStyleClass().add("form-label");
                    }
                }, monthCombo,
                new Label("Year:") {
                    {
                        getStyleClass().add("form-label");
                    }
                }, yearCombo,
                new Label("Route:") {
                    {
                        getStyleClass().add("form-label");
                    }
                }, routeCombo,
                spacer, loadBtn);
        getChildren().add(row);
    }

    private String getSelectedRoute() {
        String r = routeCombo.getSelectionModel().getSelectedItem();
        return (r == null || "All Routes".equals(r)) ? null : r;
    }

    private void refreshCustomerSearch() {
        if (suppressSearch)
            return;
        String route = getSelectedRoute();
        String text = customerSearchField != null ? customerSearchField.getText() : "";
        List<Customer> results;
        if (route != null) {
            results = text.isEmpty() ? customerService.getCustomersByRoute(route)
                    : customerService.searchCustomersByRoute(text, route);
        } else {
            results = text.isEmpty() ? customerService.getAllCustomers() : customerService.searchCustomers(text);
        }
        if (customerSuggestionList != null) {
            customerSuggestionList.setItems(FXCollections.observableArrayList(results));
            if (!results.isEmpty() && customerSearchField.isFocused()) {
                showSuggestionPopup();
            } else {
                hideSuggestionPopup();
            }
        }
    }

    private void showSuggestionPopup() {
        if (suggestionPopup == null || customerSearchField.getScene() == null)
            return;
        Bounds bounds = customerSearchField.localToScreen(customerSearchField.getBoundsInLocal());
        if (bounds == null)
            return;
        int itemCount = Math.min(customerSuggestionList.getItems().size(), 8);
        customerSuggestionList.setPrefHeight(itemCount * 36 + 2);
        suggestionPopup.show(customerSearchField, bounds.getMinX(), bounds.getMaxY() + 2);
    }

    private void hideSuggestionPopup() {
        if (suggestionPopup != null)
            suggestionPopup.hide();
    }

    private void buildBillForm() {
        VBox formBox = new VBox(18);
        formBox.getStyleClass().add("form-section");
        formBox.setPadding(new Insets(22));

        Label formTitle = new Label("Generate Bill for Customer");
        formTitle.getStyleClass().add("form-title");

        // Customer search - full width
        VBox searchBox = new VBox(6);
        Label searchLabel = new Label("Customer *");
        searchLabel.getStyleClass().add("form-label");
        searchBox.getChildren().add(searchLabel);

        customerSearchField = new TextField();
        customerSearchField.setPromptText("🔍 Type customer name to search... (select Route first to filter)");
        customerSearchField.getStyleClass().add("search-field");

        // Popup-based suggestion list (overlays on top of content)
        customerSuggestionList = new ListView<>();
        customerSuggestionList.getStyleClass().add("suggestion-list");
        customerSuggestionList.setPrefWidth(600);
        customerSuggestionList.setMaxHeight(300);
        customerSuggestionList.setStyle(
                "-fx-background-color: white; -fx-border-color: #0069b4; -fx-border-width: 1; -fx-border-radius: 8; -fx-background-radius: 8; -fx-effect: dropshadow(gaussian, rgba(0,0,0,0.2), 12, 0, 0, 4);");

        // Custom cell factory to show name + route
        customerSuggestionList.setCellFactory(lv -> new ListCell<Customer>() {
            @Override
            protected void updateItem(Customer item, boolean empty) {
                super.updateItem(item, empty);
                if (empty || item == null) {
                    setText(null);
                    setGraphic(null);
                } else {
                    HBox cell = new HBox(10);
                    cell.setAlignment(Pos.CENTER_LEFT);
                    cell.setPadding(new Insets(4, 8, 4, 8));
                    Label nameLabel = new Label(item.getName());
                    nameLabel.setFont(Font.font("Segoe UI", FontWeight.BOLD, 13));
                    nameLabel.setStyle("-fx-text-fill: #1a1a2e;");
                    Label routeLabel = new Label(item.getRoute() != null ? "📍 " + item.getRoute() : "");
                    routeLabel.setStyle("-fx-text-fill: #6c757d; -fx-font-size: 11px;");
                    Region spacer = new Region();
                    HBox.setHgrow(spacer, Priority.ALWAYS);
                    Label mobileLabel = new Label(item.getMobile() != null ? "📞 " + item.getMobile() : "");
                    mobileLabel.setStyle("-fx-text-fill: #6c757d; -fx-font-size: 11px;");
                    cell.getChildren().addAll(nameLabel, routeLabel, spacer, mobileLabel);
                    setGraphic(cell);
                    setText(null);
                }
            }
        });

        suggestionPopup = new Popup();
        suggestionPopup.setAutoHide(true);
        suggestionPopup.setAutoFix(true);
        suggestionPopup.getContent().add(customerSuggestionList);

        // Show customers when search field gets focus
        customerSearchField.focusedProperty().addListener((obs, o, n) -> {
            if (n) {
                refreshCustomerSearch();
            } else {
                // Small delay to allow click on suggestion list
                javafx.application.Platform.runLater(() -> {
                    if (!customerSuggestionList.isFocused())
                        hideSuggestionPopup();
                });
            }
        });

        customerSearchField.textProperty().addListener((obs, o, n) -> {
            if (!suppressSearch) {
                selectedCustomer = null;
                refreshCustomerSearch();
            }
        });

        customerSearchField.setOnKeyPressed(e -> {
            if (e.getCode() == KeyCode.DOWN && suggestionPopup.isShowing()) {
                customerSuggestionList.requestFocus();
                customerSuggestionList.getSelectionModel().selectFirst();
                e.consume();
            } else if (e.getCode() == KeyCode.ENTER && !customerSuggestionList.getItems().isEmpty()) {
                selectCustomer(customerSuggestionList.getItems().get(0));
                jarRateField.requestFocus();
                e.consume();
            } else if (e.getCode() == KeyCode.ESCAPE) {
                hideSuggestionPopup();
                e.consume();
            }
        });

        customerSuggestionList.setOnKeyPressed(e -> {
            if (e.getCode() == KeyCode.ENTER) {
                Customer sel = customerSuggestionList.getSelectionModel().getSelectedItem();
                if (sel != null) {
                    selectCustomer(sel);
                    jarRateField.requestFocus();
                }
                e.consume();
            } else if (e.getCode() == KeyCode.ESCAPE) {
                hideSuggestionPopup();
                customerSearchField.requestFocus();
                e.consume();
            }
        });

        customerSuggestionList.setOnMouseClicked(e -> {
            Customer sel = customerSuggestionList.getSelectionModel().getSelectedItem();
            if (sel != null) {
                selectCustomer(sel);
                jarRateField.requestFocus();
            }
        });

        searchBox.getChildren().add(customerSearchField);

        // ---- Two side-by-side cards: Jars | Bottles ----
        HBox cardsRow = new HBox(15);
        cardsRow.setPadding(new Insets(8, 0, 0, 0));

        // Jar card
        VBox jarCard = new VBox(10);
        jarCard.setPadding(new Insets(16));
        jarCard.setStyle(
                "-fx-background-color: #e3f2fd; -fx-background-radius: 10; -fx-border-color: #0069b4; -fx-border-width: 0 0 3 0; -fx-border-radius: 10;");
        HBox.setHgrow(jarCard, Priority.ALWAYS);

        Label jarTitle = new Label("🫙 20L Jars");
        jarTitle.setFont(Font.font("System", FontWeight.BOLD, 14));
        jarTitle.setStyle("-fx-text-fill: #0069b4;");

        totalJarsLabel = new Label("0");
        totalJarsLabel.setFont(Font.font("System", FontWeight.BOLD, 28));
        totalJarsLabel.setStyle("-fx-text-fill: #0069b4;");

        Label jarDelivered = new Label("delivered this month");
        jarDelivered.setStyle("-fx-text-fill: #555; -fx-font-size: 11px;");

        HBox jarRateRow = new HBox(10);
        jarRateRow.setAlignment(Pos.CENTER_LEFT);
        jarRateRow.setPadding(new Insets(6, 0, 0, 0));
        Label jrl = new Label("Rate ₹:");
        jrl.setFont(Font.font("System", FontWeight.BOLD, 13));
        jarRateField = new TextField();
        jarRateField.setPromptText("rate");
        jarRateField.getStyleClass().add("form-field");
        jarRateField.setPrefWidth(100);
        jarRateRow.getChildren().addAll(jrl, jarRateField);

        jarAmountLabel = new Label("= ₹ 0.00");
        jarAmountLabel.setFont(Font.font("System", FontWeight.BOLD, 16));
        jarAmountLabel.setStyle("-fx-text-fill: #333;");

        jarCard.getChildren().addAll(jarTitle, totalJarsLabel, jarDelivered, jarRateRow, jarAmountLabel);

        // Bottle card
        VBox bottleCard = new VBox(10);
        bottleCard.setPadding(new Insets(16));
        bottleCard.setStyle(
                "-fx-background-color: #e8f5e9; -fx-background-radius: 10; -fx-border-color: #27ae60; -fx-border-width: 0 0 3 0; -fx-border-radius: 10;");
        HBox.setHgrow(bottleCard, Priority.ALWAYS);

        Label bottleTitle = new Label("🍶 20L Bottles");
        bottleTitle.setFont(Font.font("System", FontWeight.BOLD, 14));
        bottleTitle.setStyle("-fx-text-fill: #27ae60;");

        totalBottlesLabel = new Label("0");
        totalBottlesLabel.setFont(Font.font("System", FontWeight.BOLD, 28));
        totalBottlesLabel.setStyle("-fx-text-fill: #27ae60;");

        Label bottleDelivered = new Label("delivered this month");
        bottleDelivered.setStyle("-fx-text-fill: #555; -fx-font-size: 11px;");

        HBox bottleRateRow = new HBox(10);
        bottleRateRow.setAlignment(Pos.CENTER_LEFT);
        bottleRateRow.setPadding(new Insets(6, 0, 0, 0));
        Label brl = new Label("Rate ₹:");
        brl.setFont(Font.font("System", FontWeight.BOLD, 13));
        bottleRateField = new TextField();
        bottleRateField.setPromptText("rate");
        bottleRateField.getStyleClass().add("form-field");
        bottleRateField.setPrefWidth(100);
        bottleRateRow.getChildren().addAll(brl, bottleRateField);

        bottleAmountLabel = new Label("= ₹ 0.00");
        bottleAmountLabel.setFont(Font.font("System", FontWeight.BOLD, 16));
        bottleAmountLabel.setStyle("-fx-text-fill: #333;");

        bottleCard.getChildren().addAll(bottleTitle, totalBottlesLabel, bottleDelivered, bottleRateRow,
                bottleAmountLabel);

        // Grand Total card
        VBox totalCard = new VBox(8);
        totalCard.setPadding(new Insets(16));
        totalCard.setAlignment(Pos.CENTER);
        totalCard.setStyle(
                "-fx-background-color: #f3e5f5; -fx-background-radius: 10; -fx-border-color: #8e44ad; -fx-border-width: 0 0 3 0; -fx-border-radius: 10;");
        totalCard.setMinWidth(180);

        Label totalTitle = new Label("💰 GRAND TOTAL");
        totalTitle.setFont(Font.font("System", FontWeight.BOLD, 12));
        totalTitle.setStyle("-fx-text-fill: #8e44ad;");

        grandTotalLabel = new Label("₹ 0.00");
        grandTotalLabel.setFont(Font.font("System", FontWeight.BOLD, 26));
        grandTotalLabel.setStyle("-fx-text-fill: #8e44ad;");

        totalCard.getChildren().addAll(totalTitle, grandTotalLabel);

        cardsRow.getChildren().addAll(jarCard, bottleCard, totalCard);

        // Auto-calculate on rate change
        jarRateField.textProperty().addListener((obs, o, n) -> recalculate());
        bottleRateField.textProperty().addListener((obs, o, n) -> recalculate());

        // Keyboard flow
        jarRateField.addEventFilter(KeyEvent.KEY_PRESSED, e -> {
            if (e.getCode() == KeyCode.ENTER) {
                bottleRateField.requestFocus();
                e.consume();
            }
        });
        bottleRateField.addEventFilter(KeyEvent.KEY_PRESSED, e -> {
            if (e.getCode() == KeyCode.ENTER) {
                saveBill();
                e.consume();
            }
        });

        // Action buttons
        HBox btnRow = new HBox(10);
        btnRow.setAlignment(Pos.CENTER_LEFT);
        btnRow.setPadding(new Insets(5, 0, 0, 0));

        saveBillBtn = new Button("💾  Save Bill");
        saveBillBtn.getStyleClass().add("btn-primary");
        saveBillBtn.setOnAction(e -> saveBill());

        exportPdfBtn = new Button("📄  Export PDF");
        exportPdfBtn.getStyleClass().add("btn-secondary");
        exportPdfBtn.setOnAction(e -> exportPDF());

        Button emailBtn = new Button("📧  Email Bill");
        emailBtn.getStyleClass().add("btn-secondary");
        emailBtn.setStyle("-fx-border-color: #0069b4; -fx-text-fill: #0069b4; -fx-font-weight: bold;");
        emailBtn.setOnAction(e -> emailBill());

        Button waBtn = new Button("💬 WhatsApp");
        waBtn.getStyleClass().add("btn-secondary");
        waBtn.setStyle("-fx-border-color: #25D366; -fx-text-fill: #25D366; -fx-font-weight: bold;");
        waBtn.setOnAction(e -> sendWhatsApp());

        printBtn = new Button("🖨️  Print");
        printBtn.getStyleClass().add("btn-secondary");
        printBtn.setOnAction(e -> printBill());

        Button clearBtn = new Button("🔄  Clear (Esc)");
        clearBtn.getStyleClass().add("btn-secondary");
        clearBtn.setOnAction(e -> clearForm());

        Button emailConfigBtn = new Button("⚙️");
        emailConfigBtn.getStyleClass().add("btn-secondary");
        emailConfigBtn.setTooltip(new Tooltip("Configure Email Settings"));
        emailConfigBtn.setOnAction(e -> showEmailConfigDialog());

        btnRow.getChildren().addAll(saveBillBtn, exportPdfBtn, emailBtn, waBtn, printBtn, clearBtn, emailConfigBtn);

        formBox.getChildren().addAll(formTitle, searchBox, cardsRow, btnRow);
        formBox.setOnKeyPressed(e -> {
            if (e.getCode() == KeyCode.ESCAPE)
                clearForm();
        });
        getChildren().add(formBox);
    }

    @SuppressWarnings("unchecked")
    private void buildBillTable() {
        VBox tableBox = new VBox(10);
        tableBox.getStyleClass().add("table-section");
        tableBox.setPadding(new Insets(20));
        VBox.setVgrow(tableBox, Priority.ALWAYS);

        Label tableTitle = new Label("Generated Bills");
        tableTitle.getStyleClass().add("form-title");

        billTable = new TableView<>();
        billTable.getStyleClass().add("data-table");
        billTable.setPlaceholder(new Label("No bills yet. Select a customer and enter rates above."));
        billTable.setMinHeight(200);
        billTable.setPrefHeight(250);
        VBox.setVgrow(billTable, Priority.ALWAYS);

        TableColumn<Bill, String> custCol = new TableColumn<>("Customer");
        custCol.setCellValueFactory(new PropertyValueFactory<>("customerName"));
        custCol.setPrefWidth(170);

        TableColumn<Bill, Integer> jarsCol = new TableColumn<>("Jars");
        jarsCol.setCellValueFactory(new PropertyValueFactory<>("totalJars"));
        jarsCol.setPrefWidth(70);

        TableColumn<Bill, Double> jrCol = new TableColumn<>("Jar Rate");
        jrCol.setCellValueFactory(new PropertyValueFactory<>("jarRate"));
        jrCol.setPrefWidth(80);

        TableColumn<Bill, Double> jaCol = new TableColumn<>("Jar Amt");
        jaCol.setCellValueFactory(new PropertyValueFactory<>("jarAmount"));
        jaCol.setCellFactory(createCurrencyMaskedCellFactory());
        jaCol.setPrefWidth(90);

        TableColumn<Bill, Integer> botCol = new TableColumn<>("Bottles");
        botCol.setCellValueFactory(new PropertyValueFactory<>("totalBottles"));
        botCol.setPrefWidth(70);

        TableColumn<Bill, Double> brCol = new TableColumn<>("Bottle Rate");
        brCol.setCellValueFactory(new PropertyValueFactory<>("bottleRate"));
        brCol.setPrefWidth(90);

        TableColumn<Bill, Double> baCol = new TableColumn<>("Bottle Amt");
        baCol.setCellValueFactory(new PropertyValueFactory<>("bottleAmount"));
        baCol.setCellFactory(createCurrencyMaskedCellFactory());
        baCol.setPrefWidth(90);

        TableColumn<Bill, Double> totalCol = new TableColumn<>("Total ₹");
        totalCol.setCellValueFactory(new PropertyValueFactory<>("grandTotal"));
        totalCol.setCellFactory(createCurrencyMaskedCellFactory());
        totalCol.setPrefWidth(100);

        TableColumn<Bill, String> statusCol = new TableColumn<>("Status");
        statusCol.setCellValueFactory(new PropertyValueFactory<>("status"));
        statusCol.setPrefWidth(80);
        statusCol.setCellFactory(col -> new TableCell<>() {
            @Override
            protected void updateItem(String item, boolean empty) {
                super.updateItem(item, empty);
                if (empty || item == null) {
                    setText(null);
                    setStyle("");
                } else {
                    setText(item);
                    setStyle("PAID".equals(item) ? "-fx-text-fill:#27ae60;-fx-font-weight:bold;"
                            : "-fx-text-fill:#e67e22;-fx-font-weight:bold;");
                }
            }
        });

        TableColumn<Bill, Void> actCol = new TableColumn<>("Actions");
        actCol.setPrefWidth(220);
        actCol.setCellFactory(col -> new TableCell<>() {
            private final Button pdfBtn = new Button("📄");
            private final Button emailActBtn = new Button("📧");
            private final Button waActBtn = new Button("💬");
            private final Button paidBtn = new Button("✅");
            private final HBox box = new HBox(5, pdfBtn, emailActBtn, waActBtn, paidBtn);
            {
                pdfBtn.getStyleClass().add("btn-small-edit");
                emailActBtn.getStyleClass().add("btn-small-edit");
                emailActBtn.setStyle("-fx-background-color: #e3f2fd; -fx-text-fill: #0069b4;");
                waActBtn.getStyleClass().add("btn-small-edit");
                waActBtn.setStyle("-fx-background-color: #e8f5e9; -fx-text-fill: #25D366;");
                paidBtn.getStyleClass().add("btn-small-edit");
                box.setAlignment(Pos.CENTER);
                pdfBtn.setOnAction(e -> exportBillPDF(getTableView().getItems().get(getIndex())));
                emailActBtn.setOnAction(e -> emailBillFromTable(getTableView().getItems().get(getIndex())));
                waActBtn.setOnAction(e -> sendWhatsAppFromTable(getTableView().getItems().get(getIndex())));
                paidBtn.setOnAction(e -> togglePaid(getTableView().getItems().get(getIndex())));
            }

            @Override
            protected void updateItem(Void item, boolean empty) {
                super.updateItem(item, empty);
                if (empty)
                    setGraphic(null);
                else {
                    Bill b = getTableView().getItems().get(getIndex());
                    paidBtn.setText("PAID".equals(b.getStatus()) ? "↩️ Unpaid" : "✅ Paid");
                    setGraphic(box);
                }
            }
        });

        billTable.getColumns().addAll(custCol, jarsCol, jrCol, jaCol, botCol, brCol, baCol, totalCol, statusCol,
                actCol);

        // Keyboard in table: Enter exports PDF for selected bill
        billTable.setOnKeyPressed(e -> {
            Bill sel = billTable.getSelectionModel().getSelectedItem();
            if (sel == null)
                return;
            if (e.getCode() == KeyCode.ENTER)
                exportBillPDF(sel);
            else if (e.getCode() == KeyCode.SPACE)
                togglePaid(sel);
        });

        // Summary
        HBox summaryBox = new HBox(20);
        summaryBox.setAlignment(Pos.CENTER_RIGHT);
        summaryBox.setPadding(new Insets(10, 0, 0, 0));
        Label lbl = new Label("Total Monthly Income:");
        lbl.setFont(Font.font("System", FontWeight.BOLD, 16));
        totalIncomeLabel = new Label("₹ 0.00");
        totalIncomeLabel.setFont(Font.font("System", FontWeight.BOLD, 20));
        totalIncomeLabel.setStyle("-fx-text-fill: #0069b4;");
        summaryBox.getChildren().addAll(lbl, totalIncomeLabel);

        tableBox.getChildren().addAll(tableTitle, billTable, summaryBox);
        getChildren().add(tableBox);
    }

    private Label makeLabel(String text) {
        Label l = new Label(text);
        l.getStyleClass().add("form-label");
        return l;
    }

    private int getMonth() {
        return monthCombo.getSelectionModel().getSelectedIndex() + 1;
    }

    private int getYear() {
        return yearCombo.getSelectionModel().getSelectedItem();
    }

    private void selectCustomer(Customer c) {
        selectedCustomer = c;
        suppressSearch = true;
        customerSearchField.setText(c.getName());
        suppressSearch = false;
        hideSuggestionPopup();

        int m = getMonth(), y = getYear();
        int jars = billService.getTotalJars(c.getId(), m, y);
        int bottles = billService.getTotalBottles(c.getId(), m, y);
        totalJarsLabel.setText(String.valueOf(jars));
        totalBottlesLabel.setText(String.valueOf(bottles));

        // Pre-fill rates from previous bill if available
        Bill prev = billService.getBillForCustomer(c.getId(), m, y);
        if (prev != null) {
            jarRateField.setText(String.valueOf(prev.getJarRate()));
            bottleRateField.setText(String.valueOf(prev.getBottleRate()));
        } else {
            // Try previous month
            int pm = m == 1 ? 12 : m - 1;
            int py = m == 1 ? y - 1 : y;
            Bill prevMonth = billService.getBillForCustomer(c.getId(), pm, py);
            if (prevMonth != null) {
                jarRateField.setText(String.valueOf(prevMonth.getJarRate()));
                bottleRateField.setText(String.valueOf(prevMonth.getBottleRate()));
            } else {
                jarRateField.clear();
                bottleRateField.clear();
            }
        }
        recalculate();
    }

    private void recalculate() {
        try {
            int jars = Integer.parseInt(totalJarsLabel.getText());
            int bottles = Integer.parseInt(totalBottlesLabel.getText());
            double jr = jarRateField.getText().isEmpty() ? 0 : Double.parseDouble(jarRateField.getText());
            double br = bottleRateField.getText().isEmpty() ? 0 : Double.parseDouble(bottleRateField.getText());
            double ja = jars * jr, ba = bottles * br;
            jarAmountLabel.setText(com.aqua.util.VaultManager.mask(String.format("= ₹ %.0f", ja)));
            bottleAmountLabel.setText(com.aqua.util.VaultManager.mask(String.format("= ₹ %.0f", ba)));
            grandTotalLabel.setText(com.aqua.util.VaultManager.mask(String.format("₹ %.0f", ja + ba)));
        } catch (NumberFormatException e) {
            // ignore during typing
        }
    }

    private void saveBill() {
        if (selectedCustomer == null) {
            AlertUtil.showWarning("Validation", "Select a customer.");
            customerSearchField.requestFocus();
            return;
        }
        double jr, br;
        try {
            jr = Double.parseDouble(jarRateField.getText().trim());
            br = Double.parseDouble(bottleRateField.getText().trim());
        } catch (NumberFormatException e) {
            AlertUtil.showWarning("Validation", "Enter valid rates.");
            jarRateField.requestFocus();
            return;
        }

        Bill bill = billService.generateBill(selectedCustomer, getMonth(), getYear(), jr, br);
        if (bill != null) {
            AlertUtil.showSuccess("Bill saved for " + selectedCustomer.getName() + " — ₹"
                    + String.format("%.2f", bill.getGrandTotal()));
            clearForm();
            loadBills();
        }
    }

    private void exportPDF() {
        if (selectedCustomer == null) {
            AlertUtil.showWarning("Validation", "Select a customer first.");
            return;
        }
        // Save bill first if not saved
        double jr, br;
        try {
            jr = Double.parseDouble(jarRateField.getText().trim());
            br = Double.parseDouble(bottleRateField.getText().trim());
        } catch (NumberFormatException e) {
            AlertUtil.showWarning("Validation", "Enter valid rates.");
            return;
        }

        Bill bill = billService.generateBill(selectedCustomer, getMonth(), getYear(), jr, br);
        if (bill != null)
            exportBillPDF(bill);
    }

    private void exportBillPDF(Bill bill) {
        try {
            LocalDate[] range = billService.getDateRange(bill.getCustomerId(), bill.getBillMonth(), bill.getBillYear());
            String from = range != null ? range[0].format(DateTimeFormatter.ofPattern("dd-MM-yyyy")) : "01";
            String to = range != null ? range[1].format(DateTimeFormatter.ofPattern("dd-MM-yyyy")) : "30";
            String custName = bill.getCustomerName().replaceAll("[^a-zA-Z0-9]", "_");
            String fileName = String.format("%s_%s_to_%s_%s_%d.pdf", custName, from, to, bill.getMonthName(),
                    bill.getBillYear());

            // Save to user's Documents or Desktop
            String dir = System.getProperty("user.home") + File.separator + "Documents" + File.separator + "AquaBills";
            new File(dir).mkdirs();
            String path = dir + File.separator + fileName;

            PDFGenerator.generateInvoice(bill, path, range);
            AlertUtil.showSuccess("PDF saved!\n" + path);

            if (Desktop.isDesktopSupported())
                Desktop.getDesktop().open(new File(path));
            loadBills();
        } catch (Exception e) {
            AlertUtil.showError("PDF Error", "Failed: " + e.getMessage());
        }
    }

    private void printBill() {
        if (selectedCustomer == null) {
            AlertUtil.showWarning("Validation", "Select a customer first.");
            return;
        }
        try {
            double jr = Double.parseDouble(jarRateField.getText().trim());
            double br = Double.parseDouble(bottleRateField.getText().trim());
            Bill bill = billService.generateBill(selectedCustomer, getMonth(), getYear(), jr, br);
            LocalDate[] range = billService.getDateRange(bill.getCustomerId(), bill.getBillMonth(), bill.getBillYear());
            String tmp = System.getProperty("java.io.tmpdir") + "aqua_print.pdf";
            PDFGenerator.generateInvoice(bill, tmp, range);
            if (Desktop.isDesktopSupported())
                Desktop.getDesktop().print(new File(tmp));
            loadBills();
        } catch (Exception e) {
            AlertUtil.showError("Print Error", e.getMessage());
        }
    }

    private void togglePaid(Bill bill) {
        if ("PAID".equals(bill.getStatus()))
            billService.markAsPending(bill.getId());
        else
            billService.markAsPaid(bill.getId());
        loadBills();
    }

    private void sendWhatsApp() {
        if (selectedCustomer == null) {
            AlertUtil.showWarning("Validation", "Select a customer first.");
            return;
        }
        double jr, br;
        try {
            jr = Double.parseDouble(jarRateField.getText().trim());
            br = Double.parseDouble(bottleRateField.getText().trim());
        } catch (NumberFormatException e) {
            AlertUtil.showWarning("Validation", "Enter valid rates.");
            return;
        }

        Bill bill = billService.generateBill(selectedCustomer, getMonth(), getYear(), jr, br);
        if (bill != null) {
            sendWhatsAppFromTable(bill);
            loadBills();
        }
    }

    private void sendWhatsAppFromTable(Bill bill) {
        try {
            Customer cust = customerService.getCustomerById(bill.getCustomerId());
            String mobile = (cust != null && cust.getMobile() != null) ? cust.getMobile().replaceAll("[^0-9]", "") : "";
            if (mobile.isEmpty()) {
                AlertUtil.showWarning("No Mobile", "Customer '" + bill.getCustomerName()
                        + "' has no mobile number.\nPlease add it in the Customers section.");
                return;
            }
            if (mobile.length() == 10)
                mobile = "91" + mobile; // Assuming India prefix

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
            if (upiId != null && !upiId.isEmpty()) {
                String senderName = emailService.getSenderName() != null ? emailService.getSenderName()
                        : "Bhairavnath Cool Aqua";
                String upiUri = String.format("upi://pay?pa=%s&pn=%s&am=%.0f&cu=INR",
                        upiId.replace(" ", ""),
                        senderName.replace(" ", "%20"),
                        bill.getGrandTotal());
                msg.append("Pay instantly via UPI (Click below):\n");
                msg.append(upiUri).append("\n\n");
            }

            msg.append("Thank you for your business!\n");
            msg.append("Mob: 7030355656 / 8888355656");

            String encodedMsg = java.net.URLEncoder.encode(msg.toString(), "UTF-8").replace("+", "%20");
            String waUrl = "https://wa.me/" + mobile + "?text=" + encodedMsg;

            if (Desktop.isDesktopSupported()) {
                Desktop.getDesktop().browse(new java.net.URI(waUrl));
            } else {
                AlertUtil.showWarning("Error", "Desktop browsing is not supported.");
            }
        } catch (Exception e) {
            AlertUtil.showError("WhatsApp Error", "Failed to open WhatsApp: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private void emailBill() {
        if (selectedCustomer == null) {
            AlertUtil.showWarning("Validation", "Select a customer first.");
            return;
        }
        if (!emailService.isConfigured()) {
            showEmailConfigDialog();
            return;
        }
        double jr, br;
        try {
            jr = Double.parseDouble(jarRateField.getText().trim());
            br = Double.parseDouble(bottleRateField.getText().trim());
        } catch (NumberFormatException e) {
            AlertUtil.showWarning("Validation", "Enter valid rates.");
            return;
        }

        Bill bill = billService.generateBill(selectedCustomer, getMonth(), getYear(), jr, br);
        if (bill != null) {
            emailBillFromTable(bill);
            loadBills();
        }
    }

    private void emailBillFromTable(Bill bill) {
        if (!emailService.isConfigured()) {
            showEmailConfigDialog();
            return;
        }

        try {
            // Generate PDF first
            LocalDate[] range = billService.getDateRange(bill.getCustomerId(), bill.getBillMonth(), bill.getBillYear());
            String from = range != null ? range[0].format(DateTimeFormatter.ofPattern("dd-MM-yyyy")) : "01";
            String to = range != null ? range[1].format(DateTimeFormatter.ofPattern("dd-MM-yyyy")) : "30";
            String custName = bill.getCustomerName().replaceAll("[^a-zA-Z0-9]", "_");
            String fileName = String.format("%s_%s_to_%s_%s_%d.pdf", custName, from, to, bill.getMonthName(),
                    bill.getBillYear());

            String dir = System.getProperty("user.home") + File.separator + "Documents" + File.separator + "AquaBills";
            new File(dir).mkdirs();
            String path = dir + File.separator + fileName;
            PDFGenerator.generateInvoice(bill, path, range);

            // Get customer email
            Customer cust = customerService.getCustomerById(bill.getCustomerId());
            String email = (cust != null && cust.getEmail() != null && !cust.getEmail().isEmpty()) ? cust.getEmail()
                    : "";

            if (email.isEmpty()) {
                AlertUtil.showWarning("No Email", "Customer '" + bill.getCustomerName()
                        + "' has no email address.\nPlease add their email in the Customers section.");
                return;
            }

            // Build email HTML content
            String subject = "Bill - Bhairavnath Cool Aqua - " + bill.getMonthName() + " " + bill.getBillYear();

            StringBuilder bodyHtml = new StringBuilder();
            bodyHtml.append(
                    "<div style=\"font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;\">");
            bodyHtml.append("<h2 style=\"color: #0069b4; text-align: center;\">Bhairavnath Cool Aqua</h2>");
            bodyHtml.append("<p>Dear <strong>").append(bill.getCustomerName()).append("</strong>,</p>");
            bodyHtml.append("<p>Please find attached your water delivery bill for <strong>").append(bill.getMonthName())
                    .append(" ").append(bill.getBillYear()).append("</strong>.</p>");

            bodyHtml.append("<div style=\"background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;\">");
            bodyHtml.append("<h3 style=\"margin-top: 0; color: #555;\">Bill Summary</h3>");
            bodyHtml.append("<table style=\"width: 100%;\">");
            bodyHtml.append("<tr><td>Jars (20L)</td><td style=\"text-align: right;\">").append(bill.getTotalJars())
                    .append(" &times; &#8377;").append(String.format("%.0f", bill.getJarRate()))
                    .append(" = <strong>&#8377;").append(String.format("%.0f", bill.getJarAmount()))
                    .append("</strong></td></tr>");
            bodyHtml.append("<tr><td>Bottles (20L)</td><td style=\"text-align: right;\">")
                    .append(bill.getTotalBottles()).append(" &times; &#8377;")
                    .append(String.format("%.0f", bill.getBottleRate())).append(" = <strong>&#8377;")
                    .append(String.format("%.0f", bill.getBottleAmount())).append("</strong></td></tr>");
            bodyHtml.append("<tr><td colspan=\"2\"><hr style=\"border: 0; border-top: 1px solid #ccc;\"/></td></tr>");
            bodyHtml.append(
                    "<tr><td><strong>Grand Total</strong></td><td style=\"text-align: right; color: #d9534f; font-size: 1.2em;\"><strong>&#8377;")
                    .append(String.format("%.0f", bill.getGrandTotal())).append("</strong></td></tr>");
            bodyHtml.append("</table>");
            bodyHtml.append("</div>");

            String upiId = emailService.getUpiId();
            if (upiId != null && !upiId.isEmpty()) {
                String senderName = emailService.getSenderName() != null ? emailService.getSenderName()
                        : "Bhairavnath Cool Aqua";
                try {
                    String upiUri = String.format("upi://pay?pa=%s&pn=%s&am=%.0f&cu=INR",
                            upiId.replace(" ", ""),
                            senderName.replace(" ", "%20"),
                            bill.getGrandTotal());

                    String qrData = java.net.URLEncoder.encode(upiUri, "UTF-8");
                    String qrUrl = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" + qrData;

                    bodyHtml.append("<div style=\"text-align: center; margin: 30px 0;\">");
                    bodyHtml.append("<a href=\"").append(upiUri).append(
                            "\" style=\"background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 20px;\">Pay &#8377;")
                            .append(String.format("%.0f", bill.getGrandTotal())).append(" instantly via UPI</a><br/>");
                    bodyHtml.append("<img src=\"").append(qrUrl).append(
                            "\" alt=\"UPI QR Code\" style=\"border: 1px solid #ccc; border-radius: 8px; padding: 10px; background: white; width: 150px; height: 150px;\" /><br/>");
                    bodyHtml.append(
                            "<p style=\"font-size: 12px; color: #777; margin-top: 10px;\">Click the button on mobile, or scan the QR code from any UPI app</p>");
                    bodyHtml.append("</div>");
                } catch (Exception e) {
                    System.err.println("Failed to encode UPI link: " + e.getMessage());
                }
            }

            bodyHtml.append("<p>Thank you for your business!</p>");
            bodyHtml.append(
                    "<p style=\"margin-bottom: 0;\"><strong>Bhairavnath Cool Aqua</strong><br/>Mob: 7030355656 / 8888355656</p>");
            bodyHtml.append("</div>");

            String body = bodyHtml.toString();

            // Send email in background thread to avoid UI freeze
            File pdfFile = new File(path);
            javafx.application.Platform.runLater(() -> {
                try {
                    // Show sending indicator
                    Alert sendingAlert = new Alert(Alert.AlertType.INFORMATION);
                    sendingAlert.setTitle("Sending Email");
                    sendingAlert.setHeaderText(null);
                    sendingAlert.setContentText("📧 Sending email to " + email + "...");
                    sendingAlert.show();

                    new Thread(() -> {
                        try {
                            emailService.sendEmail(email, subject, body, pdfFile);
                            javafx.application.Platform.runLater(() -> {
                                sendingAlert.close();
                                AlertUtil.showSuccess(
                                        "✅ Email sent successfully!\n\n" +
                                                "To: " + email + "\n" +
                                                "Subject: " + subject + "\n" +
                                                "PDF: " + pdfFile.getName());
                            });
                        } catch (Exception ex) {
                            javafx.application.Platform.runLater(() -> {
                                sendingAlert.close();
                                AlertUtil.showError("Email Failed",
                                        "Could not send email to " + email + "\n\n" +
                                                "Error: " + ex.getMessage() + "\n\n" +
                                                "Check your email settings (⚙️ button).");
                            });
                        }
                    }).start();
                } catch (Exception ex) {
                    AlertUtil.showError("Email Error", ex.getMessage());
                }
            });

        } catch (Exception e) {
            AlertUtil.showError("Email Error", "Failed: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private void showEmailConfigDialog() {
        Dialog<Void> dialog = new Dialog<>();
        dialog.setTitle("⚙️ Email Configuration");
        dialog.setHeaderText("Configure Gmail SMTP for auto-sending bills");

        GridPane grid = new GridPane();
        grid.setHgap(10);
        grid.setVgap(12);
        grid.setPadding(new Insets(20));

        TextField emailField = new TextField(
                emailService.getSenderEmail() != null ? emailService.getSenderEmail() : "");
        emailField.setPromptText("your.email@gmail.com");
        emailField.setPrefWidth(300);

        PasswordField passwordField = new PasswordField();
        passwordField.setPromptText("Gmail App Password (16 chars)");
        passwordField.setPrefWidth(300);

        TextField nameField = new TextField(
                emailService.getSenderName() != null ? emailService.getSenderName() : "Bhairavnath Cool Aqua");
        nameField.setPromptText("Sender display name");
        nameField.setPrefWidth(300);

        TextField upiField = new TextField(emailService.getUpiId() != null ? emailService.getUpiId() : "");
        upiField.setPromptText("your_upi_id@bank (Optional for payment link)");
        upiField.setPrefWidth(300);

        Label helpLabel = new Label(
                "⚠️ You need a Gmail App Password (NOT your login password):\n" +
                        "1. Go to myaccount.google.com → Security\n" +
                        "2. Enable 2-Step Verification\n" +
                        "3. Search 'App passwords' → Create one for 'Mail'\n" +
                        "4. Copy the 16-character password here\n\n" +
                        "💳 Add your UPI ID to automatically include a 'Pay Now' button in emails.");
        helpLabel.setWrapText(true);
        helpLabel.setStyle("-fx-text-fill: #666; -fx-font-size: 11px;");
        helpLabel.setMaxWidth(400);

        grid.add(new Label("Gmail Email:"), 0, 0);
        grid.add(emailField, 1, 0);
        grid.add(new Label("App Password:"), 0, 1);
        grid.add(passwordField, 1, 1);
        grid.add(new Label("Sender Name:"), 0, 2);
        grid.add(nameField, 1, 2);
        grid.add(new Label("UPI ID (Optional):"), 0, 3);
        grid.add(upiField, 1, 3);
        grid.add(helpLabel, 0, 4, 2, 1);

        dialog.getDialogPane().setContent(grid);

        ButtonType saveType = new ButtonType("💾 Save", ButtonBar.ButtonData.OK_DONE);
        dialog.getDialogPane().getButtonTypes().addAll(saveType, ButtonType.CANCEL);

        dialog.setResultConverter(btn -> {
            if (btn == saveType) {
                String em = emailField.getText().trim();
                String pw = passwordField.getText().trim();
                String nm = nameField.getText().trim();
                String upi = upiField.getText().trim();
                if (em.isEmpty() || pw.isEmpty()) {
                    AlertUtil.showWarning("Validation", "Email and App Password are required.");
                    return null;
                }
                emailService.saveConfig(em, pw, nm.isEmpty() ? "Bhairavnath Cool Aqua" : nm, upi);
                AlertUtil.showSuccess("✅ Email configured!\nEmails will be sent from: " + em);
            }
            return null;
        });

        dialog.showAndWait();
    }

    private void clearForm() {
        selectedCustomer = null;
        suppressSearch = true;
        customerSearchField.clear();
        suppressSearch = false;
        hideSuggestionPopup();
        totalJarsLabel.setText("0");
        totalBottlesLabel.setText("0");
        jarRateField.clear();
        bottleRateField.clear();
        jarAmountLabel.setText(com.aqua.util.VaultManager.mask("₹ 0.00"));
        bottleAmountLabel.setText(com.aqua.util.VaultManager.mask("₹ 0.00"));
        grandTotalLabel.setText(com.aqua.util.VaultManager.mask("₹ 0.00"));
        customerSearchField.requestFocus();
    }

    private void loadBills() {
        int m = getMonth(), y = getYear();
        List<Bill> bills = billService.getBillsByMonth(m, y);
        billTable.setItems(FXCollections.observableArrayList(bills));
        billTable.refresh();
        double total = bills.stream().mapToDouble(Bill::getGrandTotal).sum();
        totalIncomeLabel.setText(com.aqua.util.VaultManager.mask(String.format("₹ %.2f", total)));
    }

    public void refreshData() {
        loadBills();
    }

    private javafx.util.Callback<TableColumn<Bill, Double>, TableCell<Bill, Double>> createCurrencyMaskedCellFactory() {
        return col -> new TableCell<>() {
            @Override
            protected void updateItem(Double item, boolean empty) {
                super.updateItem(item, empty);
                if (empty || item == null) {
                    setText(null);
                } else {
                    setText(com.aqua.util.VaultManager.mask(String.format("₹%.2f", item)));
                }
            }
        };
    }
}
