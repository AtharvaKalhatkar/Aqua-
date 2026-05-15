package com.aqua;

import com.aqua.controller.*;
import com.aqua.database.DatabaseConnection;
import com.aqua.util.AlertUtil;

import javafx.application.Application;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.ScrollPane;
import javafx.scene.control.Separator;
import javafx.scene.input.KeyCode;
import javafx.scene.input.KeyEvent;
import javafx.scene.layout.*;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;
import javafx.stage.Stage;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

public class App extends Application {

    private StackPane contentArea;
    private DashboardView dashboardView;
    private CustomerView customerView;
    private DeliveryView deliveryView;
    private BillView billView;
    private ReportsView reportsView;
    private Button activeButton = null;
    private Button[] navButtons;
    private Label statusLabel;

    @Override
    public void start(Stage primaryStage) {
        // Initialize Database with High-Resiliency Safeguard
        try {
            com.aqua.database.DatabaseConnection.getConnection();
        } catch (Exception ex) {
            System.err.println("Critical Database Lock Alert: " + ex.getMessage());
            AlertUtil.showError("⚠️ Critical Database Startup Error", 
                "The local Database Engine could not be loaded.\n\n" +
                "Reason: " + ex.getMessage() + "\n\n" +
                "👉 Solution: Ensure that another copy of the Bhairavnath Aqua Software is NOT already running on this computer! Close other windows and try again.");
            System.exit(1);
        }

        // Database connection already initialized above

        BorderPane root = new BorderPane();
        root.getStyleClass().add("root-pane");
        root.setLeft(buildSidebar());

        contentArea = new StackPane();
        contentArea.getStyleClass().add("content-container");

        ScrollPane scroll = new ScrollPane(contentArea);
        scroll.setFitToWidth(true);
        scroll.setFitToHeight(true);
        scroll.getStyleClass().add("content-scroll");
        root.setCenter(scroll);

        // Status Bar at bottom
        HBox statusBar = new HBox(15);
        statusBar.getStyleClass().add("status-bar");
        statusBar.setAlignment(Pos.CENTER_LEFT);
        statusLabel = new Label("Ready");
        statusLabel.setStyle("-fx-text-fill: #8899aa; -fx-font-size: 11px;");
        Label dateLabel = new Label("📅 " + LocalDate.now().format(DateTimeFormatter.ofPattern("EEEE, dd MMM yyyy")));
        dateLabel.setStyle("-fx-text-fill: #8899aa; -fx-font-size: 11px;");
        Region statusSpacer = new Region();
        HBox.setHgrow(statusSpacer, Priority.ALWAYS);
        Label shortcutHint = new Label("Alt+1-5 Navigate  |  Tab/Enter Form  |  Esc Clear");
        shortcutHint.setStyle("-fx-text-fill: #667788; -fx-font-size: 10px;");
        statusBar.getChildren().addAll(statusLabel, statusSpacer, dateLabel, new Separator(), shortcutHint);
        root.setBottom(statusBar);

        dashboardView = new DashboardView();
        customerView = new CustomerView();
        deliveryView = new DeliveryView();
        billView = new BillView();
        reportsView = new ReportsView();

        showView(dashboardView);
        updateStatus("📊 Dashboard");

        Scene scene = new Scene(root, 1280, 800);
        scene.getStylesheets().add(getClass().getResource("/com/aqua/styles/style.css").toExternalForm());

        scene.addEventFilter(KeyEvent.KEY_PRESSED, e -> {
            if (e.isAltDown()) {
                switch (e.getCode()) {
                    case DIGIT1 -> { showView(dashboardView); dashboardView.refreshData(); setActive(navButtons[0]); updateStatus("📊 Dashboard"); e.consume(); }
                    case DIGIT2 -> { showView(deliveryView); deliveryView.refreshData(); setActive(navButtons[1]); updateStatus("🚚 Deliveries"); e.consume(); }
                    case DIGIT3 -> { showView(billView); billView.refreshData(); setActive(navButtons[2]); updateStatus("📋 Bills"); e.consume(); }
                    case DIGIT4 -> { showView(customerView); customerView.refreshData(); setActive(navButtons[3]); updateStatus("👥 Customers"); e.consume(); }
                    case DIGIT5 -> { showView(reportsView); reportsView.refreshData(); setActive(navButtons[4]); updateStatus("📊 Reports"); e.consume(); }
                }
            }
        });

        primaryStage.setTitle("Bhairavnath Cool Aqua — Management System");
        try {
            primaryStage.getIcons().add(new Image(getClass().getResourceAsStream("/com/aqua/images/logo.png")));
        } catch (Exception ex) {
            System.err.println("Could not load app icon: " + ex.getMessage());
        }

        // Cloud Database Sync Engine — syncs local SQLite → Supabase for mobile app
        try {
            com.aqua.service.SyncEngine.startAutoSync();
            System.out.println("☁️ Cloud Sync Engine started.");
        } catch (Exception ex) {
            System.err.println("Sync Engine startup failed (offline mode): " + ex.getMessage());
        }

        primaryStage.setOnCloseRequest(e -> {
            com.aqua.service.SyncEngine.stopAutoSync();
        });

        primaryStage.setScene(scene);
        primaryStage.setMinWidth(1024);
        primaryStage.setMinHeight(700);
        primaryStage.setMaximized(true);
        primaryStage.show();
    }

    private void updateStatus(String view) {
        if (statusLabel != null) statusLabel.setText("📍 " + view);
    }

    // Cloud deployment does not require local .db backup mechanics.

    private VBox buildSidebar() {
        VBox sidebar = new VBox();
        sidebar.getStyleClass().add("sidebar");
        sidebar.setPrefWidth(250);
        sidebar.setMinWidth(250);

        VBox brandBox = new VBox(4);
        brandBox.setAlignment(Pos.CENTER);
        brandBox.setPadding(new Insets(24, 18, 20, 18));

        ImageView logo = new ImageView();
        try {
            logo.setImage(new Image(getClass().getResourceAsStream("/com/aqua/images/logo.png")));
            logo.setFitWidth(60);
            logo.setFitHeight(60);
            logo.setPreserveRatio(true);
        } catch (Exception ex) {
            System.err.println("Could not load sidebar logo: " + ex.getMessage());
        }
        Label name = new Label("Bhairavnath Cool Aqua");
        name.setFont(Font.font("System", FontWeight.BOLD, 15));
        name.getStyleClass().add("brand-name");
        Label tag = new Label("Water Delivery Management");
        tag.getStyleClass().add("brand-tagline");

        brandBox.getChildren().addAll(logo, name, tag);

        Separator sep = new Separator();
        sep.getStyleClass().add("sidebar-separator");

        VBox navBox = new VBox(4);
        navBox.setPadding(new Insets(14, 10, 10, 10));

        navButtons = new Button[5];
        navButtons[0] = navBtn("📊  Dashboard", "Alt+1", () -> { showView(dashboardView); dashboardView.refreshData(); updateStatus("📊 Dashboard"); });
        navButtons[1] = navBtn("🚚  Deliveries", "Alt+2", () -> { showView(deliveryView); deliveryView.refreshData(); updateStatus("🚚 Deliveries"); });
        navButtons[2] = navBtn("📋  Bills", "Alt+3", () -> { showView(billView); billView.refreshData(); updateStatus("📋 Bills"); });
        navButtons[3] = navBtn("👥  Customers", "Alt+4", () -> { showView(customerView); customerView.refreshData(); updateStatus("👥 Customers"); });
        navButtons[4] = navBtn("📊  Reports", "Alt+5", () -> { showView(reportsView); reportsView.refreshData(); updateStatus("📊 Reports"); });

        navBox.getChildren().addAll(navButtons);
        setActive(navButtons[0]);

        for (int i = 0; i < navButtons.length; i++) {
            final int idx = i;
            navButtons[i].setOnKeyPressed(e -> {
                if (e.getCode() == KeyCode.DOWN && idx < navButtons.length - 1) { navButtons[idx + 1].requestFocus(); e.consume(); }
                else if (e.getCode() == KeyCode.UP && idx > 0) { navButtons[idx - 1].requestFocus(); e.consume(); }
            });
        }

        Region spacer = new Region();
        VBox.setVgrow(spacer, Priority.ALWAYS);

        Label ver = new Label("v3.0 • SQLite • Keyboard-first");
        ver.getStyleClass().add("version-label");
        ver.setPadding(new Insets(12));

        sidebar.getChildren().addAll(brandBox, sep, navBox, spacer, ver);
        return sidebar;
    }

    private Button navBtn(String text, String shortcut, Runnable action) {
        Button btn = new Button(text);
        btn.getStyleClass().add("nav-button");
        btn.setMaxWidth(Double.MAX_VALUE);
        btn.setPrefHeight(44);
        btn.setOnAction(e -> { action.run(); setActive(btn); });

        // Tooltip with shortcut
        javafx.scene.control.Tooltip tip = new javafx.scene.control.Tooltip(text.replaceAll("[^a-zA-Z ]", "").trim() + " (" + shortcut + ")");
        tip.setShowDelay(javafx.util.Duration.millis(400));
        btn.setTooltip(tip);

        return btn;
    }

    private void setActive(Button btn) {
        if (activeButton != null) activeButton.getStyleClass().remove("nav-button-active");
        btn.getStyleClass().add("nav-button-active");
        activeButton = btn;
    }

    private void showView(VBox view) {
        contentArea.getChildren().clear();
        contentArea.getChildren().add(view);
    }

    @Override
    public void stop() { 
        com.aqua.service.SyncEngine.stopAutoSync();
        DatabaseConnection.closeConnection(); 
    }
    public static void main(String[] args) { launch(args); }
}
