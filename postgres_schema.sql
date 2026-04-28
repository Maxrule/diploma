-- PostgreSQL schema generated from Django models
-- Run as a superuser or a user with CREATE privileges in your database.

-- Drop existing tables (in dependency order)
DROP TABLE IF EXISTS chat_message CASCADE;
DROP TABLE IF EXISTS orders_order CASCADE;
DROP TABLE IF EXISTS listings_image CASCADE;
DROP TABLE IF EXISTS listings_review CASCADE;
DROP TABLE IF EXISTS listings_favorite CASCADE;
DROP TABLE IF EXISTS listings_listing CASCADE;
DROP TABLE IF EXISTS listings_category CASCADE;
DROP TABLE IF EXISTS listings_location CASCADE;
DROP TABLE IF EXISTS users_visit CASCADE;
DROP TABLE IF EXISTS users_customuser CASCADE;

-- Users (CustomUser from users.models.CustomUser)
CREATE TABLE users_customuser (
    id BIGSERIAL PRIMARY KEY,
    password VARCHAR(128) NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE,
    is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
    username VARCHAR(150) NOT NULL UNIQUE,
    first_name VARCHAR(150) NOT NULL DEFAULT '',
    last_name VARCHAR(150) NOT NULL DEFAULT '',
    email VARCHAR(254) NOT NULL DEFAULT '',
    is_staff BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    date_joined TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    full_name VARCHAR(255) NOT NULL DEFAULT '',
    phone VARCHAR(20) NOT NULL DEFAULT ''
);

-- Many-to-many between users_customuser and auth.group
-- Note: Django's `auth` and related M2M tables are created by Django migrations.
-- The many-to-many tables connecting `users_customuser` to `auth_group` and
-- `auth_permission` are intentionally omitted here to avoid FK errors when
-- importing into a fresh database. Run `python manage.py migrate` afterwards
-- to create and sync these auth-related tables.

-- Listings: Category
CREATE TABLE listings_category (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    delivery_price INTEGER NOT NULL DEFAULT 0
);

-- Listings: Location
CREATE TABLE listings_location (
    id BIGSERIAL PRIMARY KEY,
    city VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    UNIQUE (city)
);

-- Listings: Listing
CREATE TABLE listings_listing (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    photo VARCHAR(100),
    description TEXT NOT NULL DEFAULT '',
    price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    user_id BIGINT NOT NULL,
    category_id BIGINT,
    location_id BIGINT,
    name VARCHAR(100) NOT NULL DEFAULT '',
    email VARCHAR(254) NOT NULL DEFAULT '',
    phone VARCHAR(20) NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users_customuser(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES listings_category(id) ON DELETE SET NULL,
    FOREIGN KEY (location_id) REFERENCES listings_location(id) ON DELETE SET NULL
);

-- Listings: Image
CREATE TABLE listings_image (
    id BIGSERIAL PRIMARY KEY,
    image_url TEXT NOT NULL,
    listing_id BIGINT NOT NULL,
    FOREIGN KEY (listing_id) REFERENCES listings_listing(id) ON DELETE CASCADE
);

-- Listings: Review
CREATE TABLE listings_review (
    id BIGSERIAL PRIMARY KEY,
    rating INTEGER NOT NULL,
    comment TEXT NOT NULL DEFAULT '',
    user_id BIGINT NOT NULL,
    listing_id BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    FOREIGN KEY (user_id) REFERENCES users_customuser(id) ON DELETE CASCADE,
    FOREIGN KEY (listing_id) REFERENCES listings_listing(id) ON DELETE CASCADE
);

-- Listings: Favorite
CREATE TABLE listings_favorite (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    listing_id BIGINT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users_customuser(id) ON DELETE CASCADE,
    FOREIGN KEY (listing_id) REFERENCES listings_listing(id) ON DELETE CASCADE,
    UNIQUE (user_id, listing_id)
);

-- Orders: Order
CREATE TABLE orders_order (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    listing_id BIGINT NOT NULL,
    city VARCHAR(100) NOT NULL,
    delivery_price INTEGER NOT NULL DEFAULT 0,
    final_price INTEGER NOT NULL DEFAULT 0,
    card_number VARCHAR(20) NOT NULL,
    card_expiry VARCHAR(5) NOT NULL,
    card_cvc VARCHAR(4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    paid BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users_customuser(id) ON DELETE CASCADE,
    FOREIGN KEY (listing_id) REFERENCES listings_listing(id) ON DELETE CASCADE
);

-- Users: Visit
CREATE TABLE users_visit (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    path VARCHAR(255) NOT NULL DEFAULT '',
    ip VARCHAR(45) NOT NULL DEFAULT '',
    user_agent TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    FOREIGN KEY (user_id) REFERENCES users_customuser(id) ON DELETE CASCADE
);
CREATE INDEX users_visit_created_at_idx ON users_visit(created_at);

-- Chat: Message
CREATE TABLE chat_message (
    id BIGSERIAL PRIMARY KEY,
    listing_id BIGINT,
    sender_id BIGINT NOT NULL,
    receiver_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    FOREIGN KEY (listing_id) REFERENCES listings_listing(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users_customuser(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users_customuser(id) ON DELETE CASCADE
);

