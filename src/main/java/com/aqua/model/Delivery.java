package com.aqua.model;

import javafx.beans.property.*;
import java.time.LocalDate;

/**
 * Delivery model with JavaFX properties for TableView binding.
 */
public class Delivery {

    private final IntegerProperty id = new SimpleIntegerProperty();
    private final IntegerProperty customerId = new SimpleIntegerProperty();
    private final StringProperty customerName = new SimpleStringProperty();
    private final ObjectProperty<LocalDate> deliveryDate = new SimpleObjectProperty<>();
    private final IntegerProperty jarQty = new SimpleIntegerProperty();
    private final IntegerProperty bottleQty = new SimpleIntegerProperty();

    public Delivery() {}

    public Delivery(int id, int customerId, String customerName, LocalDate deliveryDate, int jarQty, int bottleQty) {
        this.id.set(id);
        this.customerId.set(customerId);
        this.customerName.set(customerName);
        this.deliveryDate.set(deliveryDate);
        this.jarQty.set(jarQty);
        this.bottleQty.set(bottleQty);
    }

    public Delivery(int customerId, LocalDate deliveryDate, int jarQty, int bottleQty) {
        this.customerId.set(customerId);
        this.deliveryDate.set(deliveryDate);
        this.jarQty.set(jarQty);
        this.bottleQty.set(bottleQty);
    }

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

    // Delivery Date
    public LocalDate getDeliveryDate() { return deliveryDate.get(); }
    public void setDeliveryDate(LocalDate deliveryDate) { this.deliveryDate.set(deliveryDate); }
    public ObjectProperty<LocalDate> deliveryDateProperty() { return deliveryDate; }

    // Jar Quantity
    public int getJarQty() { return jarQty.get(); }
    public void setJarQty(int jarQty) { this.jarQty.set(jarQty); }
    public IntegerProperty jarQtyProperty() { return jarQty; }

    // Bottle Quantity
    public int getBottleQty() { return bottleQty.get(); }
    public void setBottleQty(int bottleQty) { this.bottleQty.set(bottleQty); }
    public IntegerProperty bottleQtyProperty() { return bottleQty; }
}
