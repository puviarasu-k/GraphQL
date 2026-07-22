CREATE SCHEMA IF NOT EXISTS zeroqueue;
USE zeroqueue;

CREATE TABLE restaurants (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE outlets (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    restaurant_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),

    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,

    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),

    address_line_1 TEXT,
    address_line_2 TEXT,

    branch_name VARCHAR(255),
    public_id VARCHAR(20) UNIQUE NOT NULL,

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_outlet_restaurant
        FOREIGN KEY (restaurant_id)
        REFERENCES restaurants(id)
        ON DELETE CASCADE,

    SPATIAL INDEX idx_location (latitude, longitude)
);

CREATE TABLE staff (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    outlet_id BIGINT NOT NULL,

    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    role VARCHAR(100),

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_staff_outlet
        FOREIGN KEY (outlet_id)
        REFERENCES outlets(id)
        ON DELETE CASCADE
);

CREATE TABLE queue_sessions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    outlet_id BIGINT NOT NULL,

    business_date DATE NOT NULL,

    current_token INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_queue_session UNIQUE (outlet_id, business_date),

    CONSTRAINT fk_session_outlet
        FOREIGN KEY (outlet_id)
        REFERENCES outlets(id)
        ON DELETE CASCADE
);

CREATE TABLE queue_entries (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    queue_session_id BIGINT NOT NULL,

    user_id BIGINT NOT NULL,

    token_number INT NOT NULL,

    status ENUM('WAITING','CALLED','COMPLETED','CANCELLED')
        DEFAULT 'WAITING',

    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    called_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_entry_session
        FOREIGN KEY (queue_session_id)
        REFERENCES queue_sessions(id)
        ON DELETE CASCADE
);

CREATE INDEX idx_outlets_restaurant
ON outlets(restaurant_id);

CREATE INDEX idx_staff_outlet
ON staff(outlet_id);

CREATE INDEX idx_queue_sessions_outlet_date
ON queue_sessions(outlet_id, business_date);

CREATE INDEX idx_queue_entries_session
ON queue_entries(queue_session_id);

CREATE INDEX idx_queue_entries_status
ON queue_entries(status);
