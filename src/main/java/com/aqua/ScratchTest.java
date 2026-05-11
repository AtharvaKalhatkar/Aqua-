package com.aqua;

import com.aqua.model.Customer;
import com.aqua.repository.CustomerRepository;

public class ScratchTest {
    public static void main(String[] args) {
        CustomerRepository repo = new CustomerRepository();
        Customer c = new Customer();
        c.setName("Test");
        c.setAddress("Test Addr");
        c.setMobile("1234567890");
        c.setRoute("Test Route");
        c.setEmail("test@test.com");
        
        boolean ok = repo.insert(c);
        if(ok) {
            System.out.println("Insert OK");
        } else {
            System.out.println("Insert Failed");
        }
    }
}
