package com.aqua.service;

import com.aqua.model.Delivery;
import com.aqua.repository.DeliveryRepository;
import java.time.LocalDate;
import java.util.List;

public class DeliveryService {
    private final DeliveryRepository repository = new DeliveryRepository();

    public boolean addDelivery(Delivery d) { return repository.insert(d); }
    public boolean deleteDelivery(int id) { return repository.delete(id); }
    public List<Delivery> getDeliveriesByDate(LocalDate date) { return repository.findByDate(date); }
    public List<Delivery> getDeliveriesByCustomerAndMonth(int cid, int m, int y) { return repository.findByCustomerAndMonth(cid, m, y); }
    public List<Delivery> getDeliveriesByMonth(int m, int y) { return repository.findByMonth(m, y); }
    public List<Delivery> getDeliveriesByDateRange(LocalDate from, LocalDate to) { return repository.findByDateRange(from, to); }
    public int getTodayDeliveryCount() { return repository.getTodayCount(); }
    public int getTotalJars(int cid, int m, int y) { return repository.getTotalJars(cid, m, y); }
    public int getTotalBottles(int cid, int m, int y) { return repository.getTotalBottles(cid, m, y); }
    public LocalDate[] getDateRange(int cid, int m, int y) { return repository.getDateRange(cid, m, y); }
    public int getMonthlyJarTotal(int m, int y) { return repository.getMonthlyJarTotal(m, y); }
    public int getMonthlyBottleTotal(int m, int y) { return repository.getMonthlyBottleTotal(m, y); }
    public List<Object[]> getCustomerTotals(int m, int y) { return repository.getCustomerTotals(m, y); }
}
