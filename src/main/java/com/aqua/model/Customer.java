package com.aqua.model;

import javafx.beans.property.*;

/**
 * Customer model — rates are NOT stored here.
 * Rates are entered at bill time each month.
 */
public class Customer {

    private final IntegerProperty id = new SimpleIntegerProperty();
    private final StringProperty name = new SimpleStringProperty();
    private final StringProperty address = new SimpleStringProperty();
    private final StringProperty mobile = new SimpleStringProperty();
    private final StringProperty route = new SimpleStringProperty();
    private final StringProperty email = new SimpleStringProperty();

    public Customer() {}

    public Customer(int id, String name, String address, String mobile, String route, String email) {
        this.id.set(id);
        this.name.set(name);
        this.address.set(address);
        this.mobile.set(mobile);
        this.route.set(route);
        this.email.set(email);
    }

    public Customer(String name, String address, String mobile, String route, String email) {
        this.name.set(name);
        this.address.set(address);
        this.mobile.set(mobile);
        this.route.set(route);
        this.email.set(email);
    }

    public int getId() { return id.get(); }
    public void setId(int id) { this.id.set(id); }
    public IntegerProperty idProperty() { return id; }

    public String getName() { return name.get(); }
    public void setName(String name) { this.name.set(name); }
    public StringProperty nameProperty() { return name; }

    public String getAddress() { return address.get(); }
    public void setAddress(String address) { this.address.set(address); }
    public StringProperty addressProperty() { return address; }

    public String getMobile() { return mobile.get(); }
    public void setMobile(String mobile) { this.mobile.set(mobile); }
    public StringProperty mobileProperty() { return mobile; }

    public String getRoute() { return route.get(); }
    public void setRoute(String route) { this.route.set(route); }
    public StringProperty routeProperty() { return route; }

    public String getEmail() { return email.get(); }
    public void setEmail(String email) { this.email.set(email); }
    public StringProperty emailProperty() { return email; }

    @Override
    public String toString() { return name.get(); }
}
