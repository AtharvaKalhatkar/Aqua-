package com.aqua.controller;

import com.aqua.model.Customer;
import com.aqua.service.CustomerService;
import com.aqua.util.AlertUtil;

import javafx.collections.FXCollections;
import javafx.collections.ObservableList;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.*;
import javafx.scene.control.cell.PropertyValueFactory;
import javafx.scene.input.KeyCode;
import javafx.scene.input.KeyEvent;
import javafx.scene.layout.*;

import java.util.List;

public class CustomerView extends VBox {

    private final CustomerService customerService = new CustomerService();
    private TableView<Customer> tableView;
    private ObservableList<Customer> customerList;
    private TextField searchField, nameField, addressField, mobileField, emailField;
    private ComboBox<String> routeCombo;
    private Button saveBtn, clearBtn;
    private Customer editingCustomer = null;

    public CustomerView() {
        setPadding(new Insets(30));
        setSpacing(20);
        getStyleClass().add("content-area");
        buildHeader();
        buildForm();
        buildTable();
        loadCustomers();
    }

    private void buildHeader() {
        HBox headerBox = new HBox(20);
        headerBox.setAlignment(Pos.CENTER_LEFT);
        Label title = new Label("Customer Management");
        title.getStyleClass().add("page-title");

        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);

        searchField = new TextField();
        searchField.setPromptText("🔍 Search customers...");
        searchField.getStyleClass().add("search-field");
        searchField.setPrefWidth(300);
        searchField.textProperty().addListener((obs, o, n) -> filterCustomers(n));

        headerBox.getChildren().addAll(title, spacer, searchField);
        getChildren().add(headerBox);
    }

    private void buildForm() {
        VBox formBox = new VBox(15);
        formBox.getStyleClass().add("form-section");
        formBox.setPadding(new Insets(20));

        Label formTitle = new Label("Add / Edit Customer  (Tab to move, Enter to save)");
        formTitle.getStyleClass().add("form-title");

        GridPane grid = new GridPane();
        grid.setHgap(15);
        grid.setVgap(12);

        nameField = createField("Customer Name");
        addressField = createField("Address");
        mobileField = createField("Mobile Number");
        emailField = createField("customer@email.com");

        // Editable ComboBox for Route — shows existing routes as suggestions
        routeCombo = new ComboBox<>();
        routeCombo.setEditable(true);
        routeCombo.setPromptText("Select or type route...");
        routeCombo.getStyleClass().add("form-field");
        routeCombo.setMaxWidth(Double.MAX_VALUE);
        refreshRouteList();

        grid.add(createLabel("Name *"), 0, 0);
        grid.add(nameField, 1, 0);
        grid.add(createLabel("Address"), 2, 0);
        grid.add(addressField, 3, 0);
        grid.add(createLabel("Mobile"), 0, 1);
        grid.add(mobileField, 1, 1);
        grid.add(createLabel("Route"), 2, 1);
        grid.add(routeCombo, 3, 1);
        grid.add(createLabel("Email"), 0, 2);
        grid.add(emailField, 1, 2);

        ColumnConstraints labelCol = new ColumnConstraints(100);
        ColumnConstraints fieldCol = new ColumnConstraints();
        fieldCol.setHgrow(Priority.ALWAYS);
        grid.getColumnConstraints().addAll(labelCol, fieldCol, labelCol, fieldCol);

        // Keyboard: Enter on any field moves to next
        nameField.addEventFilter(KeyEvent.KEY_PRESSED, e -> { if (e.getCode() == KeyCode.ENTER) { addressField.requestFocus(); e.consume(); } });
        addressField.addEventFilter(KeyEvent.KEY_PRESSED, e -> { if (e.getCode() == KeyCode.ENTER) { mobileField.requestFocus(); e.consume(); } });
        mobileField.addEventFilter(KeyEvent.KEY_PRESSED, e -> { if (e.getCode() == KeyCode.ENTER) { routeCombo.requestFocus(); e.consume(); } });
        routeCombo.addEventFilter(KeyEvent.KEY_PRESSED, e -> { if (e.getCode() == KeyCode.ENTER) { emailField.requestFocus(); e.consume(); } });
        emailField.addEventFilter(KeyEvent.KEY_PRESSED, e -> { if (e.getCode() == KeyCode.ENTER) { saveCustomer(); e.consume(); } });

        HBox btnBox = new HBox(10);
        btnBox.setAlignment(Pos.CENTER_LEFT);
        btnBox.setPadding(new Insets(10, 0, 0, 0));

        saveBtn = new Button("💾  Save Customer");
        saveBtn.getStyleClass().add("btn-primary");
        saveBtn.setOnAction(e -> saveCustomer());

        clearBtn = new Button("🔄  Clear (Esc)");
        clearBtn.getStyleClass().add("btn-secondary");
        clearBtn.setOnAction(e -> clearForm());

        btnBox.getChildren().addAll(saveBtn, clearBtn);

        formBox.setOnKeyPressed(e -> { if (e.getCode() == KeyCode.ESCAPE) clearForm(); });

        formBox.getChildren().addAll(formTitle, grid, btnBox);
        getChildren().add(formBox);
    }

    @SuppressWarnings("unchecked")
    private void buildTable() {
        VBox tableBox = new VBox(10);
        tableBox.getStyleClass().add("table-section");
        tableBox.setPadding(new Insets(20));
        VBox.setVgrow(tableBox, Priority.ALWAYS);

        Label tableTitle = new Label("Customer List  (↑↓ navigate, Enter = edit, Delete = remove)");
        tableTitle.getStyleClass().add("form-title");

        tableView = new TableView<>();
        tableView.getStyleClass().add("data-table");
        tableView.setPlaceholder(new Label("No customers found. Add your first customer above."));
        VBox.setVgrow(tableView, Priority.ALWAYS);

        TableColumn<Customer, Integer> idCol = new TableColumn<>("ID");
        idCol.setCellValueFactory(new PropertyValueFactory<>("id"));
        idCol.setPrefWidth(50);

        TableColumn<Customer, String> nameCol = new TableColumn<>("Name");
        nameCol.setCellValueFactory(new PropertyValueFactory<>("name"));
        nameCol.setPrefWidth(180);

        TableColumn<Customer, String> addressCol = new TableColumn<>("Address");
        addressCol.setCellValueFactory(new PropertyValueFactory<>("address"));
        addressCol.setPrefWidth(200);

        TableColumn<Customer, String> mobileCol = new TableColumn<>("Mobile");
        mobileCol.setCellValueFactory(new PropertyValueFactory<>("mobile"));
        mobileCol.setPrefWidth(130);

        TableColumn<Customer, String> routeCol = new TableColumn<>("Route");
        routeCol.setCellValueFactory(new PropertyValueFactory<>("route"));
        routeCol.setPrefWidth(120);

        TableColumn<Customer, String> emailCol = new TableColumn<>("Email");
        emailCol.setCellValueFactory(new PropertyValueFactory<>("email"));
        emailCol.setPrefWidth(180);

        TableColumn<Customer, Void> actionsCol = new TableColumn<>("Actions");
        actionsCol.setPrefWidth(180);
        actionsCol.setCellFactory(col -> new TableCell<>() {
            private final Button editBtn = new Button("✏️ Edit");
            private final Button deleteBtn = new Button("🗑️ Delete");
            private final HBox box = new HBox(8, editBtn, deleteBtn);
            {
                editBtn.getStyleClass().add("btn-small-edit");
                deleteBtn.getStyleClass().add("btn-small-delete");
                box.setAlignment(Pos.CENTER);
                editBtn.setOnAction(e -> editCustomer(getTableView().getItems().get(getIndex())));
                deleteBtn.setOnAction(e -> deleteCustomer(getTableView().getItems().get(getIndex())));
            }
            @Override
            protected void updateItem(Void item, boolean empty) {
                super.updateItem(item, empty);
                setGraphic(empty ? null : box);
            }
        });

        tableView.getColumns().addAll(idCol, nameCol, addressCol, mobileCol, routeCol, emailCol, actionsCol);

        tableView.setOnKeyPressed(e -> {
            Customer selected = tableView.getSelectionModel().getSelectedItem();
            if (selected == null) return;
            if (e.getCode() == KeyCode.ENTER) editCustomer(selected);
            else if (e.getCode() == KeyCode.DELETE) deleteCustomer(selected);
        });

        tableBox.getChildren().addAll(tableTitle, tableView);
        getChildren().add(tableBox);
    }

    private TextField createField(String prompt) {
        TextField f = new TextField();
        f.setPromptText(prompt);
        f.getStyleClass().add("form-field");
        return f;
    }

    private Label createLabel(String text) {
        Label l = new Label(text);
        l.getStyleClass().add("form-label");
        return l;
    }

    /**
     * Normalizes a route value: trims whitespace and matches an existing route
     * case-insensitively. If "Route 1" already exists and user types "route 1",
     * the existing "Route 1" is used instead of creating a duplicate.
     */
    private String normalizeRoute(String input) {
        if (input == null) return "";
        String trimmed = input.trim();
        if (trimmed.isEmpty()) return "";

        // Check existing routes for case-insensitive match
        List<String> existingRoutes = customerService.getAllRoutes();
        for (String existing : existingRoutes) {
            if (existing.equalsIgnoreCase(trimmed)) {
                return existing; // Use the already-stored casing
            }
        }
        // No match — capitalize first letter of each word for consistency
        return capitalizeWords(trimmed);
    }

    private String capitalizeWords(String str) {
        String[] words = str.split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String word : words) {
            if (sb.length() > 0) sb.append(" ");
            if (word.length() > 0) {
                sb.append(Character.toUpperCase(word.charAt(0)));
                if (word.length() > 1) sb.append(word.substring(1));
            }
        }
        return sb.toString();
    }

    private String getRouteValue() {
        String val = routeCombo.getEditor().getText();
        return normalizeRoute(val);
    }

    private void refreshRouteList() {
        List<String> routes = customerService.getAllRoutes();
        String currentText = routeCombo.getEditor().getText();
        routeCombo.setItems(FXCollections.observableArrayList(routes));
        // Restore the editor text after refresh (setItems clears it)
        if (currentText != null && !currentText.isEmpty()) {
            routeCombo.getEditor().setText(currentText);
        }
    }

    private void saveCustomer() {
        String name = nameField.getText().trim();
        if (name.isEmpty()) { AlertUtil.showWarning("Validation", "Customer name is required."); nameField.requestFocus(); return; }

        String route = getRouteValue();

        if (editingCustomer != null) {
            editingCustomer.setName(name);
            editingCustomer.setAddress(addressField.getText().trim());
            editingCustomer.setMobile(mobileField.getText().trim());
            editingCustomer.setRoute(route);
            editingCustomer.setEmail(emailField.getText().trim());
            if (customerService.updateCustomer(editingCustomer)) {
                AlertUtil.showSuccess("Customer updated!");
                clearForm(); loadCustomers(); refreshRouteList();
            } else AlertUtil.showError("Error", "Failed to update customer.");
        } else {
            Customer c = new Customer(name, addressField.getText().trim(), mobileField.getText().trim(), route, emailField.getText().trim());
            if (customerService.addCustomer(c)) {
                AlertUtil.showSuccess("Customer added!");
                clearForm(); loadCustomers(); refreshRouteList();
            } else AlertUtil.showError("Error", "Failed to add customer.");
        }
    }

    private void editCustomer(Customer c) {
        editingCustomer = c;
        nameField.setText(c.getName());
        addressField.setText(c.getAddress());
        mobileField.setText(c.getMobile());
        routeCombo.getEditor().setText(c.getRoute() != null ? c.getRoute() : "");
        emailField.setText(c.getEmail() != null ? c.getEmail() : "");
        saveBtn.setText("💾  Update Customer");
        nameField.requestFocus();
    }

    private void deleteCustomer(Customer c) {
        if (AlertUtil.showConfirmation("Delete Customer",
                "Delete '" + c.getName() + "'? All delivery records and bills will also be deleted.")) {
            if (customerService.deleteCustomer(c.getId())) { AlertUtil.showSuccess("Deleted!"); loadCustomers(); refreshRouteList(); }
        }
    }

    private void clearForm() {
        editingCustomer = null;
        nameField.clear(); addressField.clear(); mobileField.clear(); emailField.clear();
        routeCombo.getEditor().clear();
        routeCombo.getSelectionModel().clearSelection();
        saveBtn.setText("💾  Save Customer");
        nameField.requestFocus();
    }

    private void loadCustomers() {
        customerList = FXCollections.observableArrayList(customerService.getAllCustomers());
        tableView.setItems(customerList);
    }

    private void filterCustomers(String q) {
        if (q == null || q.trim().isEmpty()) loadCustomers();
        else tableView.setItems(FXCollections.observableArrayList(customerService.searchCustomers(q)));
    }

    public void refreshData() { loadCustomers(); refreshRouteList(); }
}
