CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS candidates (
    id SERIAL PRIMARY KEY,
    group_id INT REFERENCES groups(id) ON DELETE RESTRICT,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(50),
    gender VARCHAR(20),
    photo TEXT,
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS candidate_contributions (
    id SERIAL PRIMARY KEY,
    candidate_id INT REFERENCES candidates(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    payment_date DATE NOT NULL,
    month INT CHECK (month BETWEEN 1 AND 12),
    year INT,
    payment_method VARCHAR(50) DEFAULT 'Cash',
    note TEXT,
    recorded_by INT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS group_funds (
    id SERIAL PRIMARY KEY,
    group_id INT REFERENCES groups(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    source VARCHAR(100) NOT NULL,
    reason VARCHAR(150) NOT NULL,
    description TEXT,
    transaction_date DATE NOT NULL,
    recorded_by INT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_candidates_group_id ON candidates(group_id);
CREATE INDEX IF NOT EXISTS idx_contributions_candidate_id ON candidate_contributions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_contributions_payment_date ON candidate_contributions(payment_date);
CREATE INDEX IF NOT EXISTS idx_group_funds_group_id ON group_funds(group_id);
CREATE INDEX IF NOT EXISTS idx_group_funds_transaction_date ON group_funds(transaction_date);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
