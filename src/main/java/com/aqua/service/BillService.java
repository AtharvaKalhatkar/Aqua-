package com.aqua.service;

import com.aqua.model.Bill;
import com.aqua.model.Customer;
import com.aqua.repository.BillRepository;
import com.aqua.repository.DeliveryRepository;

import java.time.LocalDate;
import java.util.List;

public class BillService {

    private final BillRepository billRepository = new BillRepository();
    private final DeliveryRepository deliveryRepository = new DeliveryRepository();

    /**
     * Generates a bill with user-supplied rates (rates entered at bill time).
     */
    public Bill generateBill(Customer customer, int month, int year, double jarRate, double bottleRate) {
        int totalJars = deliveryRepository.getTotalJars(customer.getId(), month, year);
        int totalBottles = deliveryRepository.getTotalBottles(customer.getId(), month, year);
        double jarAmount = totalJars * jarRate;
        double bottleAmount = totalBottles * bottleRate;

        Bill bill = new Bill();
        bill.setCustomerId(customer.getId());
        bill.setCustomerName(customer.getName());
        bill.setBillMonth(month);
        bill.setBillYear(year);
        bill.setTotalJars(totalJars);
        bill.setTotalBottles(totalBottles);
        bill.setJarRate(jarRate);
        bill.setBottleRate(bottleRate);
        bill.setJarAmount(jarAmount);
        bill.setBottleAmount(bottleAmount);
        bill.setGrandTotal(jarAmount + bottleAmount);
        bill.setStatus("PENDING");

        billRepository.saveOrUpdate(bill);
        return bill;
    }

    /** Gets delivery date range [from, to] for PDF naming */
    public LocalDate[] getDateRange(int customerId, int month, int year) {
        return deliveryRepository.getDateRange(customerId, month, year);
    }

    public int getTotalJars(int customerId, int month, int year) {
        return deliveryRepository.getTotalJars(customerId, month, year);
    }

    public int getTotalBottles(int customerId, int month, int year) {
        return deliveryRepository.getTotalBottles(customerId, month, year);
    }

    public List<Bill> getBillsByMonth(int month, int year) {
        return billRepository.findByMonth(month, year);
    }

    public Bill getBillForCustomer(int customerId, int month, int year) {
        return billRepository.findByCustomerAndMonth(customerId, month, year);
    }

    public boolean markAsPaid(int billId) { return billRepository.updateStatus(billId, "PAID"); }
    public boolean markAsPending(int billId) { return billRepository.updateStatus(billId, "PENDING"); }
    public int getPendingBillsCount() { return billRepository.getPendingCount(); }
    public double getMonthlyIncome(int month, int year) { return billRepository.getMonthlyIncome(month, year); }
    public boolean deleteBill(int billId) { return billRepository.delete(billId); }
}
