-- Supabase PostgreSQL Schema for Heritage Hotels Booking System

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Hotels Table
CREATE TABLE IF NOT EXISTS hotels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT,
    "imageUrl" TEXT,
    "hasBanquetHall" BOOLEAN DEFAULT false,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Rooms (Accommodations) Table
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "hotelId" UUID REFERENCES hotels(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'Room', 'Suite', 'Villa', 'Bungalow'
    location TEXT NOT NULL,
    rating DECIMAL(3,2),
    price DECIMAL(10,2) NOT NULL,
    "maxGuests" INTEGER NOT NULL DEFAULT 2,
    "isAvailable" BOOLEAN DEFAULT true,
    "manualStopSell" BOOLEAN DEFAULT false, -- staff close-out switch, independent of bookings
    description TEXT,
    "imageUrl" TEXT,
    amenities TEXT[],
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY, -- UID from Supabase Auth
    email TEXT UNIQUE NOT NULL,
    "displayName" TEXT,
    "photoURL" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Admins Table
CREATE TABLE IF NOT EXISTS admins (
    id TEXT PRIMARY KEY, -- UID from Supabase Auth
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin', -- 'admin', 'staff'
    "displayName" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" TEXT REFERENCES customers(id), -- References customers table now
    "roomId" UUID REFERENCES rooms(id) ON DELETE SET NULL,
    "hotelId" UUID REFERENCES hotels(id) ON DELETE SET NULL,
    "fullName" TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    "checkIn" DATE NOT NULL,
    "checkOut" DATE NOT NULL,
    guests INTEGER NOT NULL,
    "specialRequests" TEXT,
    status TEXT NOT NULL DEFAULT 'confirmed', -- 'confirmed', 'cancelled', 'completed'
    "source" TEXT DEFAULT 'direct', -- 'direct', 'booking_com', 'agoda', ... (channel-manager readiness)
    "channelId" UUID, -- set for OTA-sourced bookings once a channel manager is integrated
    "externalRef" TEXT, -- the channel's reservation id (idempotency key for inbound webhooks)
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Media Table
CREATE TABLE IF NOT EXISTS media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "parentId" UUID NOT NULL, -- References hotels or rooms
    "parentType" TEXT NOT NULL, -- 'hotel' or 'room'
    "data" TEXT NOT NULL, -- Base64 data (compressed)
    "order" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Sync Queue (channel-manager readiness; dormant until OTA integration)
-- Records that a room's availability changed over a date window so a future sync
-- worker can push the delta to the channel manager.
CREATE TABLE IF NOT EXISTS inventory_sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "roomId" UUID,
    "fromDate" DATE,
    "toDate" DATE,
    status TEXT DEFAULT 'pending', -- pending, processing, sent, failed
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed Data (Optional)
-- INSERT INTO hotels (name, location, description, "imageUrl") VALUES ('Heritage Ahungalla', 'Ahungalla', 'Legendary 5-star resort.', '...');
