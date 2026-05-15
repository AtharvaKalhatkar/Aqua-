package com.aqua.service;

import com.aqua.model.Customer;
import com.aqua.repository.CustomerRepository;

import java.util.List;

public class CustomerService {

    private final CustomerRepository repository = new CustomerRepository();

    public boolean addCustomer(Customer customer) { return repository.insert(customer); }
    public boolean updateCustomer(Customer customer) { return repository.update(customer); }
    public boolean deleteCustomer(int id) { return repository.delete(id); }
    public List<Customer> getAllCustomers() { return repository.findAll(); }
    public Customer getCustomerById(int id) { return repository.findById(id); }
    public int getTotalCustomers() { return repository.getCount(); }
    public List<Customer> getCustomersByRoute(String route) { return repository.findByRoute(route); }
    public List<String> getAllRoutes() { return repository.getDistinctRoutes(); }

    public List<Customer> searchCustomers(String name) {
        if (name == null || name.trim().isEmpty()) return repository.findAll();
        return repository.searchByName(name.trim());
    }

    public List<Customer> searchCustomersByRoute(String name, String route) {
        if (route == null || route.isEmpty()) return searchCustomers(name);
        if (name == null || name.trim().isEmpty()) return repository.findByRoute(route);
        return repository.searchByNameAndRoute(name.trim(), route);
    }

    public List<Customer> getActiveCustomersInMonth(int month, int year) {
        return repository.findActiveInMonth(month, year);
    }

    public List<Customer> getActiveCustomersInMonthByRoute(int month, int year, String route) {
        return repository.findActiveInMonthByRoute(month, year, route);
    }

    public List<Customer> searchActiveCustomersInMonth(String name, int month, int year) {
        if (name == null || name.trim().isEmpty()) return repository.findActiveInMonth(month, year);
        return repository.searchActiveInMonth(name.trim(), month, year);
    }

    public List<Customer> searchActiveCustomersInMonthAndRoute(String name, int month, int year, String route) {
        if (route == null || route.isEmpty()) return searchActiveCustomersInMonth(name, month, year);
        if (name == null || name.trim().isEmpty()) return repository.findActiveInMonthByRoute(month, year, route);
        return repository.searchActiveInMonthAndRoute(name.trim(), month, year, route);
    }
}
