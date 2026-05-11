-- Aqua Management System Database Schema (SQLite)
-- The application auto-creates these tables on first run.
-- This file is for reference only.

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT,
    mobile TEXT,
    jar_rate REAL DEFAULT 0.00,
    bottle_rate REAL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deliveries table
CREATE TABLE IF NOT EXISTS deliveries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    delivery_date TEXT NOT NULL,
    jar_qty INTEGER DEFAULT 0,
    bottle_qty INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Bills table
CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    bill_month INTEGER NOT NULL,
    bill_year INTEGER NOT NULL,
    total_jars INTEGER DEFAULT 0,
    total_bottles INTEGER DEFAULT 0,
    jar_rate REAL DEFAULT 0.00,
    bottle_rate REAL DEFAULT 0.00,
    jar_amount REAL DEFAULT 0.00,
    bottle_amount REAL DEFAULT 0.00,
    grand_total REAL DEFAULT 0.00,
    status TEXT DEFAULT 'PENDING',
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    UNIQUE (customer_id, bill_month, bill_year)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_delivery_date ON deliveries(delivery_date);
CREATE INDEX IF NOT EXISTS idx_delivery_customer ON deliveries(customer_id, delivery_date);
CREATE INDEX IF NOT EXISTS idx_bill_month ON bills(bill_month, bill_year);
