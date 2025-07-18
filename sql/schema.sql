-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Stores Table
-- Stores information about different store branches.
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products Table
-- Stores inventory information for each product.
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    stock INT NOT NULL DEFAULT 0,
    cost_price NUMERIC(10, 2) NOT NULL,
    selling_price NUMERIC(10, 2) NOT NULL,
    image VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales Table
-- Records each sale transaction.
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity_sold INT NOT NULL,
    selling_price NUMERIC(10, 2) NOT NULL,
    sale_date DATE NOT NULL
);

-- Recent Activity Table
-- A log of significant events in the system.
CREATE TABLE IF NOT EXISTS recent_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL, -- e.g., 'sale', 'update', 'new'
    product_name VARCHAR(255) NOT NULL,
    details TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Triggers to update the 'updated_at' timestamp on product changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Seed initial data
INSERT INTO stores (id, name) VALUES
('1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed', 'Main Street Branch'),
('6f8d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bee', 'Downtown Superstore'),
('9a7d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bff', 'Westside Market')
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (sku, name, category, stock, cost_price, selling_price, image) VALUES
('LAP-001', 'ProBook Laptop', 'Electronics', 15, 800, 1200, 'https://placehold.co/64x64.png'),
('SMT-002', 'Galaxy Smartphone', 'Electronics', 3, 600, 999, 'https://placehold.co/64x64.png'),
('HDP-003', 'Wireless Headphones', 'Accessories', 50, 80, 149, 'https://placehold.co/64x64.png'),
('OFF-004', 'Ergonomic Chair', 'Furniture', 8, 250, 450, 'https://placehold.co/64x64.png'),
('BOK-005', 'Next.js for Pros', 'Books', 100, 25, 49, 'https://placehold.co/64x64.png'),
('CAM-006', '4K Action Camera', 'Electronics', 2, 300, 499, 'https://placehold.co/64x64.png')
ON CONFLICT (sku) DO NOTHING;

INSERT INTO recent_activity (type, product_name, details, timestamp) VALUES
('sale', 'ProBook Laptop', '2 units sold', NOW() - interval '2 minutes'),
('update', 'Ergonomic Chair', 'Stock updated to 8 units', NOW() - interval '1 hour'),
('new', 'Smart Watch', 'New product added', NOW() - interval '3 hours'),
('sale', 'Wireless Headphones', '5 units sold', NOW() - interval '1 day')
ON CONFLICT DO NOTHING;

INSERT INTO sales (product_id, quantity_sold, selling_price, sale_date)
SELECT p.id, (floor(random() * 10) + 1), p.selling_price, date_trunc('month', NOW()) - make_interval(months => floor(random() * 6)::int)
FROM products p, generate_series(1, 10)
ON CONFLICT DO NOTHING;
