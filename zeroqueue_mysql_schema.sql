-- ============================================================
-- wait_less schema — PostgreSQL version
-- ============================================================

-- PostGIS is required for the GEOGRAPHY(Point, 4326) column on users
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE SCHEMA IF NOT EXISTS wait_less;
SET search_path TO wait_less;

-- ------------------------------------------------------------
-- Generic trigger function to emulate MySQL's
-- "ON UPDATE CURRENT_TIMESTAMP" behaviour
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- restaurants
-- ------------------------------------------------------------
CREATE TABLE restaurants (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_restaurants_updated_at
BEFORE UPDATE ON restaurants
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- outlets
-- ------------------------------------------------------------
CREATE TABLE outlets (
    id BIGSERIAL PRIMARY KEY,
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

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Derived from latitude/longitude, kept in sync by trg_outlets_sync_location below.
    -- Used for fast "nearby outlets" queries via the GIST index.
    location GEOGRAPHY(Point, 4326),

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_outlet_restaurant
        FOREIGN KEY (restaurant_id)
        REFERENCES restaurants(id)
        ON DELETE CASCADE
);

CREATE TRIGGER trg_outlets_updated_at
BEFORE UPDATE ON outlets
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Plain btree index, useful for simple bounding-box filters / display sorting
CREATE INDEX idx_outlets_lat_lng ON outlets(latitude, longitude);

-- Spatial index — this is what powers fast "nearby outlets" queries
CREATE INDEX idx_outlets_location ON outlets USING GIST(location);

-- ------------------------------------------------------------
-- staff
-- ------------------------------------------------------------
CREATE TABLE staff (
    id BIGSERIAL PRIMARY KEY,
    outlet_id BIGINT NOT NULL,

    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    role VARCHAR(100),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_staff_outlet
        FOREIGN KEY (outlet_id)
        REFERENCES outlets(id)
        ON DELETE CASCADE
);

CREATE TRIGGER trg_staff_updated_at
BEFORE UPDATE ON staff
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- queue_sessions
-- ------------------------------------------------------------
CREATE TABLE queue_sessions (
    id BIGSERIAL PRIMARY KEY,

    outlet_id BIGINT NOT NULL,

    business_date DATE NOT NULL,

    current_token INT NOT NULL DEFAULT 0,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_queue_session UNIQUE (outlet_id, business_date),

    CONSTRAINT fk_session_outlet
        FOREIGN KEY (outlet_id)
        REFERENCES outlets(id)
        ON DELETE CASCADE
);

CREATE TRIGGER trg_queue_sessions_updated_at
BEFORE UPDATE ON queue_sessions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- Enum type for users.role
-- ------------------------------------------------------------
CREATE TYPE role AS ENUM (
    'USER'
    -- Add other values here, e.g.
    -- 'ADMIN',
    -- 'DRIVER'
);

-- ------------------------------------------------------------
-- users
-- ------------------------------------------------------------
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    mobile VARCHAR(20) NOT NULL UNIQUE,
    role role NOT NULL DEFAULT 'USER',
    location GEOGRAPHY(Point, 4326),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_users_location ON users USING GIST (location);

-- ------------------------------------------------------------
-- Enum type for queue_entries.status
-- ------------------------------------------------------------
CREATE TYPE queue_entry_status AS ENUM (
    'WAITING',
    'CALLED',
    'COMPLETED',
    'CANCELLED'
);

-- ------------------------------------------------------------
-- queue_entries
-- ------------------------------------------------------------
CREATE TABLE queue_entries (
    id BIGSERIAL PRIMARY KEY,

    queue_session_id BIGINT NOT NULL,

    user_id BIGINT NOT NULL,

    token_number INT NOT NULL,

    status queue_entry_status NOT NULL DEFAULT 'WAITING',

    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    called_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_entry_session
        FOREIGN KEY (queue_session_id)
        REFERENCES queue_sessions(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_entry_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);

CREATE TRIGGER trg_queue_entries_updated_at
BEFORE UPDATE ON queue_entries
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- Remaining indexes
-- ------------------------------------------------------------
CREATE INDEX idx_outlets_restaurant ON outlets(restaurant_id);
CREATE INDEX idx_staff_outlet ON staff(outlet_id);
CREATE INDEX idx_queue_sessions_outlet_date ON queue_sessions(outlet_id, business_date);
CREATE INDEX idx_queue_entries_session ON queue_entries(queue_session_id);
CREATE INDEX idx_queue_entries_status ON queue_entries(status);