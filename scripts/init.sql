CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY,
    user_wallet VARCHAR(50) NOT NULL,
    input_token VARCHAR(10) NOT NULL,
    output_token VARCHAR(10) NOT NULL,
    input_amount DECIMAL(20, 8) NOT NULL,
    output_amount DECIMAL(20, 8),
    selected_dex VARCHAR(20),
    status VARCHAR(20) NOT NULL,
    tx_hash VARCHAR(100),
    error TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
