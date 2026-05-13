-- ============================================
-- Supabase Setup Script for Bhairavnath Aqua
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================

-- 1. Create tables (if not already created by desktop SyncEngine)
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    mobile TEXT,
    route TEXT DEFAULT '',
    email TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deliveries (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    delivery_date TEXT NOT NULL,
    jar_qty INTEGER DEFAULT 0,
    bottle_qty INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (customer_id, bill_month, bill_year)
);

-- 2. Create indexes for mobile app performance
CREATE INDEX IF NOT EXISTS idx_del_date ON deliveries(delivery_date);
CREATE INDEX IF NOT EXISTS idx_del_customer ON deliveries(customer_id, delivery_date);
CREATE INDEX IF NOT EXISTS idx_bill_month ON bills(bill_month, bill_year);

-- 3. Auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_customers_updated ON customers;
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_deliveries_updated ON deliveries;
CREATE TRIGGER trg_deliveries_updated BEFORE UPDATE ON deliveries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_bills_updated ON bills;
CREATE TRIGGER trg_bills_updated BEFORE UPDATE ON bills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. Disable RLS (for simple setup — enable later for security)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

-- Allow all operations with anon key (simple setup)
DROP POLICY IF EXISTS "Allow all on customers" ON customers;
CREATE POLICY "Allow all on customers" ON customers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on deliveries" ON deliveries;
CREATE POLICY "Allow all on deliveries" ON deliveries FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on bills" ON bills;
CREATE POLICY "Allow all on bills" ON bills FOR ALL USING (true) WITH CHECK (true);

-- 5. Make deliveries.id auto-increment for mobile app inserts
-- (Desktop uses explicit IDs, mobile lets Supabase generate them)
-- The SERIAL type already handles this.

SELECT 'Supabase setup complete!' AS status;
