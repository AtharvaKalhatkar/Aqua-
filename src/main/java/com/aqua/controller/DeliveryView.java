package com.aqua.controller;

import com.aqua.model.Customer;
import com.aqua.model.Delivery;
import com.aqua.service.CustomerService;
import com.aqua.service.DeliveryService;
import com.aqua.util.AlertUtil;

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

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

public class DeliveryView extends VBox {

    private final CustomerService customerService = new CustomerService();
    private final DeliveryService deliveryService = new DeliveryService();

    private TextField customerSearchField;
    private ListView<Customer> customerSuggestionList;
    private Popup suggestionPopup;
    private Label selectedCustomerLabel;
    private DatePicker datePicker;
    private Spinner<Integer> jarSpinner, bottleSpinner;
    private TableView<Delivery> deliveryTable;
    private Customer selectedCustomer = null;
    private boolean suppressSearch = false;

    public DeliveryView() {
        setPadding(new Insets(30));
        setSpacing(20);
        getStyleClass().add("content-area");
        buildHeader();
        buildEntryForm();
        buildDeliveryTable();
        loadTodayDeliveries();
    }

    private void buildHeader() {
        Label title = new Label("Daily Delivery Entry");
        title.getStyleClass().add("page-title");
        Label subtitle = new Label("Tab = next field | ↓ = suggestions | Enter = select/save | Esc = clear");
        subtitle.getStyleClass().add("page-subtitle");
        getChildren().add(new VBox(5, title, subtitle));
    }

    private void refreshCustomerSearch() {
        if (suppressSearch) return;
        String text = customerSearchField != null ? customerSearchField.getText() : "";
        List<Customer> results;
        if (text.isEmpty()) {
            results = customerService.getAllCustomers();
        } else {
            results = customerService.searchCustomers(text);
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
        if (suggestionPopup == null || customerSearchField.getScene() == null) return;
        Bounds bounds = customerSearchField.localToScreen(customerSearchField.getBoundsInLocal());
        if (bounds == null) return;
        int itemCount = Math.min(customerSuggestionList.getItems().size(), 8);
        customerSuggestionList.setPrefHeight(itemCount * 36 + 2);
        suggestionPopup.show(customerSearchField, bounds.getMinX(), bounds.getMaxY() + 2);
    }

    private void hideSuggestionPopup() {
        if (suggestionPopup != null) suggestionPopup.hide();
    }

    private void buildEntryForm() {
        VBox formBox = new VBox(15);
        formBox.getStyleClass().add("form-section");
        formBox.setPadding(new Insets(20));

        Label formTitle = new Label("New Delivery Entry");
        formTitle.getStyleClass().add("form-title");

        // Row 1: Customer Search
        HBox customerRow = new HBox(15);
        customerRow.setAlignment(Pos.CENTER_LEFT);

        VBox searchBox = new VBox(5);
        Label searchLabel = new Label("Search Customer * (type name, ↓ to select)");
        searchLabel.getStyleClass().add("form-label");

        customerSearchField = new TextField();
        customerSearchField.setPromptText("🔍 Type customer name...");
        customerSearchField.getStyleClass().add("search-field");
        customerSearchField.setPrefWidth(350);

        // Popup-based suggestion list
        customerSuggestionList = new ListView<>();
        customerSuggestionList.getStyleClass().add("suggestion-list");
        customerSuggestionList.setPrefWidth(500);
        customerSuggestionList.setMaxHeight(300);
        customerSuggestionList.setStyle("-fx-background-color: white; -fx-border-color: #0069b4; -fx-border-width: 1; -fx-border-radius: 8; -fx-background-radius: 8; -fx-effect: dropshadow(gaussian, rgba(0,0,0,0.2), 12, 0, 0, 4);");

        // Custom cell factory to show name + route + mobile
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

        // Show all customers when search field gets focus
        customerSearchField.focusedProperty().addListener((obs, o, n) -> {
            if (n) {
                refreshCustomerSearch();
            } else {
                javafx.application.Platform.runLater(() -> {
                    if (!customerSuggestionList.isFocused()) hideSuggestionPopup();
                });
            }
        });

        // Search as you type
        customerSearchField.textProperty().addListener((obs, o, n) -> {
            if (!suppressSearch) {
                selectedCustomer = null;
                refreshCustomerSearch();
            }
        });

        // Keyboard: Down arrow goes to suggestion list
        customerSearchField.setOnKeyPressed(e -> {
            if (e.getCode() == KeyCode.DOWN && suggestionPopup.isShowing()) {
                customerSuggestionList.requestFocus();
                customerSuggestionList.getSelectionModel().selectFirst();
                e.consume();
            } else if (e.getCode() == KeyCode.ENTER && !customerSuggestionList.getItems().isEmpty()) {
                selectCustomer(customerSuggestionList.getItems().get(0));
                datePicker.requestFocus();
                e.consume();
            } else if (e.getCode() == KeyCode.ESCAPE) {
                hideSuggestionPopup();
                e.consume();
            }
        });

        // Keyboard: Enter/arrow in suggestion list
        customerSuggestionList.setOnKeyPressed(e -> {
            if (e.getCode() == KeyCode.ENTER) {
                Customer sel = customerSuggestionList.getSelectionModel().getSelectedItem();
                if (sel != null) { selectCustomer(sel); datePicker.requestFocus(); }
                e.consume();
            } else if (e.getCode() == KeyCode.ESCAPE) {
                hideSuggestionPopup();
                customerSearchField.requestFocus();
                e.consume();
            }
        });

        // Mouse click also selects
        customerSuggestionList.setOnMouseClicked(e -> {
            Customer sel = customerSuggestionList.getSelectionModel().getSelectedItem();
            if (sel != null) { selectCustomer(sel); datePicker.requestFocus(); }
        });

        searchBox.getChildren().addAll(searchLabel, customerSearchField);

        selectedCustomerLabel = new Label("No customer selected");
        selectedCustomerLabel.getStyleClass().add("selected-customer-label");
        selectedCustomerLabel.setWrapText(true);

        VBox selBox = new VBox(5);
        Label selTitle = new Label("Selected Customer");
        selTitle.getStyleClass().add("form-label");
        selBox.getChildren().addAll(selTitle, selectedCustomerLabel);

        customerRow.getChildren().addAll(searchBox, selBox);
        HBox.setHgrow(searchBox, Priority.ALWAYS);
        HBox.setHgrow(selBox, Priority.ALWAYS);

        // Row 2: Date & Quantities
        HBox entryRow = new HBox(20);
        entryRow.setAlignment(Pos.CENTER_LEFT);

        VBox dateBox = new VBox(5);
        Label dateLabel = new Label("Date *");
        dateLabel.getStyleClass().add("form-label");
        datePicker = new DatePicker(LocalDate.now());
        datePicker.setPrefWidth(180);
        dateBox.getChildren().addAll(dateLabel, datePicker);

        VBox jarBox = new VBox(5);
        Label jarLabel = new Label("Jar Qty (20L)");
        jarLabel.getStyleClass().add("form-label");
        jarSpinner = new Spinner<>(0, 999, 0);
        jarSpinner.setEditable(true);
        jarSpinner.setPrefWidth(120);
        jarBox.getChildren().addAll(jarLabel, jarSpinner);

        VBox bottleBox = new VBox(5);
        Label bottleLabel = new Label("Bottle Qty (20L)");
        bottleLabel.getStyleClass().add("form-label");
        bottleSpinner = new Spinner<>(0, 999, 0);
        bottleSpinner.setEditable(true);
        bottleSpinner.setPrefWidth(120);
        bottleBox.getChildren().addAll(bottleLabel, bottleSpinner);

        Button saveBtn = new Button("💾  Save Delivery");
        saveBtn.getStyleClass().add("btn-primary");
        saveBtn.setPrefHeight(38);
        saveBtn.setOnAction(e -> saveDelivery());

        Label spacerLabel = new Label(" ");
        spacerLabel.getStyleClass().add("form-label");
        VBox saveBtnBox = new VBox(5, spacerLabel, saveBtn);

        // Keyboard flow: date -> jar -> bottle -> Enter saves
        datePicker.addEventFilter(KeyEvent.KEY_PRESSED, e -> { if (e.getCode() == KeyCode.ENTER) { jarSpinner.requestFocus(); e.consume(); } });
        jarSpinner.addEventFilter(KeyEvent.KEY_PRESSED, e -> { if (e.getCode() == KeyCode.ENTER) { jarSpinner.increment(0); bottleSpinner.requestFocus(); e.consume(); } });
        bottleSpinner.addEventFilter(KeyEvent.KEY_PRESSED, e -> { if (e.getCode() == KeyCode.ENTER) { bottleSpinner.increment(0); saveDelivery(); e.consume(); } });

        entryRow.getChildren().addAll(dateBox, jarBox, bottleBox, saveBtnBox);

        formBox.getChildren().addAll(formTitle, customerRow, entryRow);

        // Global Escape for form
        formBox.setOnKeyPressed(e -> { if (e.getCode() == KeyCode.ESCAPE) clearForm(); });

        getChildren().add(formBox);
    }

    @SuppressWarnings("unchecked")
    private void buildDeliveryTable() {
        VBox tableBox = new VBox(10);
        tableBox.getStyleClass().add("table-section");
        tableBox.setPadding(new Insets(20));
        VBox.setVgrow(tableBox, Priority.ALWAYS);

        HBox tableHeader = new HBox(15);
        tableHeader.setAlignment(Pos.CENTER_LEFT);
        Label tableTitle = new Label("Today's Deliveries  (↑↓ navigate, Delete to remove)");
        tableTitle.getStyleClass().add("form-title");
        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);
        Button refreshBtn = new Button("🔄 Refresh");
        refreshBtn.getStyleClass().add("btn-secondary");
        refreshBtn.setOnAction(e -> loadTodayDeliveries());
        tableHeader.getChildren().addAll(tableTitle, spacer, refreshBtn);

        deliveryTable = new TableView<>();
        deliveryTable.getStyleClass().add("data-table");
        deliveryTable.setPlaceholder(new Label("No deliveries recorded today."));
        VBox.setVgrow(deliveryTable, Priority.ALWAYS);

        TableColumn<Delivery, Integer> idCol = new TableColumn<>("ID");
        idCol.setCellValueFactory(new PropertyValueFactory<>("id"));
        idCol.setPrefWidth(60);

        TableColumn<Delivery, String> custCol = new TableColumn<>("Customer");
        custCol.setCellValueFactory(new PropertyValueFactory<>("customerName"));
        custCol.setPrefWidth(200);

        TableColumn<Delivery, LocalDate> dateCol = new TableColumn<>("Date");
        dateCol.setCellValueFactory(new PropertyValueFactory<>("deliveryDate"));
        dateCol.setPrefWidth(130);
        dateCol.setCellFactory(c -> new TableCell<>() {
            @Override
            protected void updateItem(LocalDate item, boolean empty) {
                super.updateItem(item, empty);
                setText(empty || item == null ? null : item.format(DateTimeFormatter.ofPattern("dd-MM-yyyy")));
            }
        });

        TableColumn<Delivery, Integer> jarCol = new TableColumn<>("Jars");
        jarCol.setCellValueFactory(new PropertyValueFactory<>("jarQty"));
        jarCol.setPrefWidth(80);

        TableColumn<Delivery, Integer> bottleCol = new TableColumn<>("Bottles");
        bottleCol.setCellValueFactory(new PropertyValueFactory<>("bottleQty"));
        bottleCol.setPrefWidth(80);

        TableColumn<Delivery, Void> actionsCol = new TableColumn<>("Actions");
        actionsCol.setPrefWidth(120);
        actionsCol.setCellFactory(col -> new TableCell<>() {
            private final Button deleteBtn = new Button("🗑️ Delete");
            { deleteBtn.getStyleClass().add("btn-small-delete");
              deleteBtn.setOnAction(e -> deleteDelivery(getTableView().getItems().get(getIndex()))); }
            @Override
            protected void updateItem(Void item, boolean empty) { super.updateItem(item, empty); setGraphic(empty ? null : deleteBtn); }
        });

        deliveryTable.getColumns().addAll(custCol, dateCol, jarCol, bottleCol, actionsCol);

        // Keyboard: Delete key in table
        deliveryTable.setOnKeyPressed(e -> {
            if (e.getCode() == KeyCode.DELETE) {
                Delivery sel = deliveryTable.getSelectionModel().getSelectedItem();
                if (sel != null) deleteDelivery(sel);
            }
        });

        tableBox.getChildren().addAll(tableHeader, deliveryTable);
        getChildren().add(tableBox);
    }

    private void selectCustomer(Customer c) {
        selectedCustomer = c;
        suppressSearch = true;
        customerSearchField.setText(c.getName());
        suppressSearch = false;
        hideSuggestionPopup();
        selectedCustomerLabel.setText(String.format("%s\n📍 %s\n📱 %s",
                c.getName(),
                c.getAddress() != null ? c.getAddress() : "N/A",
                c.getMobile() != null ? c.getMobile() : "N/A"));
        selectedCustomerLabel.setStyle("-fx-text-fill: #0069b4; -fx-font-weight: bold;");
    }

    private void saveDelivery() {
        if (selectedCustomer == null) { AlertUtil.showWarning("Validation", "Select a customer first."); customerSearchField.requestFocus(); return; }
        if (datePicker.getValue() == null) { AlertUtil.showWarning("Validation", "Select a date."); datePicker.requestFocus(); return; }

        int jars = jarSpinner.getValue(), bottles = bottleSpinner.getValue();
        if (jars == 0 && bottles == 0) { AlertUtil.showWarning("Validation", "Enter at least one quantity."); jarSpinner.requestFocus(); return; }

        Delivery d = new Delivery(selectedCustomer.getId(), datePicker.getValue(), jars, bottles);
        if (deliveryService.addDelivery(d)) {
            AlertUtil.showSuccess(selectedCustomer.getName() + " — " + jars + " Jars, " + bottles + " Bottles saved!");
            clearForm();
            loadTodayDeliveries();
        } else AlertUtil.showError("Error", "Failed to save delivery.");
    }

    private void deleteDelivery(Delivery d) {
        if (AlertUtil.showConfirmation("Delete", "Delete delivery for " + d.getCustomerName() + "?")) {
            deliveryService.deleteDelivery(d.getId());
            loadTodayDeliveries();
        }
    }

    private void clearForm() {
        selectedCustomer = null;
        suppressSearch = true;
        customerSearchField.clear();
        suppressSearch = false;
        hideSuggestionPopup();
        selectedCustomerLabel.setText("No customer selected");
        selectedCustomerLabel.setStyle("");
        datePicker.setValue(LocalDate.now());
        jarSpinner.getValueFactory().setValue(0);
        bottleSpinner.getValueFactory().setValue(0);
        customerSearchField.requestFocus();
    }

    private void loadTodayDeliveries() {
        deliveryTable.setItems(FXCollections.observableArrayList(deliveryService.getDeliveriesByDate(LocalDate.now())));
    }

    public void refreshData() {
        datePicker.setValue(LocalDate.now());
        loadTodayDeliveries();
    }
}
