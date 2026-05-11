package com.aqua.model;

import javafx.beans.property.*;
import java.time.LocalDateTime;

/**
 * Bill model with JavaFX properties for TableView binding.
 */
public class Bill {

    private final IntegerProperty id = new SimpleIntegerProperty();
    private final IntegerProperty customerId = new SimpleIntegerProperty();
    private final StringProperty customerName = new SimpleStringProperty();
    private final IntegerProperty billMonth = new SimpleIntegerProperty();
    private final IntegerProperty billYear = new SimpleIntegerProperty();
    private final IntegerProperty totalJars = new SimpleIntegerProperty();
    private final IntegerProperty totalBottles = new SimpleIntegerProperty();
    private final DoubleProperty jarRate = new SimpleDoubleProperty();
    private final DoubleProperty bottleRate = new SimpleDoubleProperty();
    private final DoubleProperty jarAmount = new SimpleDoubleProperty();
    private final DoubleProperty bottleAmount = new SimpleDoubleProperty();
    private final DoubleProperty grandTotal = new SimpleDoubleProperty();
    private final StringProperty status = new SimpleStringProperty("PENDING");
    private final ObjectProperty<LocalDateTime> generatedAt = new SimpleObjectProperty<>();

    public Bill() {}

    // ID
    public int getId() { return id.get(); }
    public void setId(int id) { this.id.set(id); }
    public IntegerProperty idProperty() { return id; }

    // Customer ID
    public int getCustomerId() { return customerId.get(); }
    public void setCustomerId(int customerId) { this.customerId.set(customerId); }
    public IntegerProperty customerIdProperty() { return customerId; }

    // Customer Name
    public String getCustomerName() { return customerName.get(); }
    public void setCustomerName(String customerName) { this.customerName.set(customerName); }
    public StringProperty customerNameProperty() { return customerName; }

    // Bill Month
    public int getBillMonth() { return billMonth.get(); }
    public void setBillMonth(int billMonth) { this.billMonth.set(billMonth); }
    public IntegerProperty billMonthProperty() { return billMonth; }

    // Bill Year
    public int getBillYear() { return billYear.get(); }
    public void setBillYear(int billYear) { this.billYear.set(billYear); }
    public IntegerProperty billYearProperty() { return billYear; }

    // Total Jars
    public int getTotalJars() { return totalJars.get(); }
    public void setTotalJars(int totalJars) { this.totalJars.set(totalJars); }
    public IntegerProperty totalJarsProperty() { return totalJars; }

    // Total Bottles
    public int getTotalBottles() { return totalBottles.get(); }
    public void setTotalBottles(int totalBottles) { this.totalBottles.set(totalBottles); }
    public IntegerProperty totalBottlesProperty() { return totalBottles; }

    // Jar Rate
    public double getJarRate() { return jarRate.get(); }
    public void setJarRate(double jarRate) { this.jarRate.set(jarRate); }
    public DoubleProperty jarRateProperty() { return jarRate; }

    // Bottle Rate
    public double getBottleRate() { return bottleRate.get(); }
    public void setBottleRate(double bottleRate) { this.bottleRate.set(bottleRate); }
    public DoubleProperty bottleRateProperty() { return bottleRate; }

    // Jar Amount
    public double getJarAmount() { return jarAmount.get(); }
    public void setJarAmount(double jarAmount) { this.jarAmount.set(jarAmount); }
    public DoubleProperty jarAmountProperty() { return jarAmount; }

    // Bottle Amount
    public double getBottleAmount() { return bottleAmount.get(); }
    public void setBottleAmount(double bottleAmount) { this.bottleAmount.set(bottleAmount); }
    public DoubleProperty bottleAmountProperty() { return bottleAmount; }

    // Grand Total
    public double getGrandTotal() { return grandTotal.get(); }
    public void setGrandTotal(double grandTotal) { this.grandTotal.set(grandTotal); }
    public DoubleProperty grandTotalProperty() { return grandTotal; }

    // Status
    public String getStatus() { return status.get(); }
    public void setStatus(String status) { this.status.set(status); }
    public StringProperty statusProperty() { return status; }

    // Generated At
    public LocalDateTime getGeneratedAt() { return generatedAt.get(); }
    public void setGeneratedAt(LocalDateTime generatedAt) { this.generatedAt.set(generatedAt); }
    public ObjectProperty<LocalDateTime> generatedAtProperty() { return generatedAt; }

    /**
     * Returns the month name for display purposes.
     */
    public String getMonthName() {
        String[] months = {"", "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"};
        int m = billMonth.get();
        return (m >= 1 && m <= 12) ? months[m] : "Unknown";
    }
}
