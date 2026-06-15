import express from 'express';
import path from 'path';
import fs from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';
import cors from 'cors';
import { queueBookingConfirmation, queueBookingAcceptance, queueBookingCancellation, processEmailQueue, sendEmail } from './server/email.js';

if (!process.env.VERCEL) {
  dotenv.config();
}

// Fatal startup checks — fail immediately if required secrets are absent.
const _missingVars = ['JWT_SECRET', 'ADMIN_MASTER_PASSWORD'].filter(k => !process.env[k]);
if (_missingVars.length > 0) {
  throw new Error(`FATAL: Missing required environment variables: ${_missingVars.join(', ')}. Set them in .env or your hosting provider's secret manager.`);
}
const ADMIN_MASTER_PASSWORD = process.env.ADMIN_MASTER_PASSWORD as string;

export const app = express();
// Railway (and most PaaS) inject the port to bind via process.env.PORT.
// Fall back to 3000 for local development.
const PORT = Number(process.env.PORT) || 3000;

const _allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
  origin: _allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-id', 'x-admin-email', 'x-admin-name', 'x-admin-role'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Database configuration
const dbUrl = process.env.DATABASE_URL;
const isDbConfigured = Boolean(dbUrl && !dbUrl.includes('[YOUR-PASSWORD]'));

if (!isDbConfigured) {
  console.log('⚠️ DATABASE_URL not set. Running in mock mode.');
}

// TLS policy for the database connection.
// Railway's private network (*.railway.internal) and local Postgres speak plain
// TCP with no TLS, whereas external managed Postgres (Supabase, Railway's public
// proxy) requires it. Auto-detect from the host; override with DATABASE_SSL=true|false.
const dbSsl: false | { rejectUnauthorized: boolean } = (() => {
  if (process.env.DATABASE_SSL === 'false') return false;
  if (process.env.DATABASE_SSL === 'true') return { rejectUnauthorized: false };
  if (!dbUrl) return false;
  if (/\.railway\.internal|localhost|127\.0\.0\.1/.test(dbUrl)) return false;
  return { rejectUnauthorized: false };
})();

const pool = isDbConfigured
  ? new pg.Pool({
      connectionString: dbUrl,
      ssl: dbSsl,
      connectionTimeoutMillis: 10000,
      max: 10,
      idleTimeoutMillis: 30000, // Keep database connections warm for up to 30 seconds of inactivity to support fast loading
      allowExitOnIdle: true,
    })
  : null;

if (pool && process.env.VERCEL) {
  // Override pool.connect to return a direct, transient client rather than a pooled connection
  pool.connect = async function() {
    console.log('🔌 [Serverless] Opening direct database connection...');
    const client = new pg.Client({
      connectionString: dbUrl,
      ssl: dbSsl
    });
    await client.connect();
    
    // Override release to close connection immediately
    (client as any).release = function() {
      console.log('🔌 [Serverless] Closing direct database connection...');
      client.end().catch((err: any) => console.error('Error closing database client:', err));
    };
    
    return client as any;
  };

  // Override pool.query to use a transient connection that is closed of guaranteed immediately
  pool.query = async function(...args: any[]) {
    console.log('🔌 [Serverless] Executing direct query...');
    const client = new pg.Client({
      connectionString: dbUrl,
      ssl: dbSsl
    });
    await client.connect();
    try {
      return await (client as any).query(...args);
    } finally {
      await client.end().catch(() => {});
    }
  } as any;
}

// Mock Data for Fallback
const MOCK_HOTELS = [
  {
    id: 'h1',
    name: 'Heritage Ahungalla',
    location: 'Ahungalla',
    description: 'A legendary 5-star resort designed by Geoffrey Bawa, offering ultimate barefoot luxury in a tropical paradise.',
    imageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=2070&auto=format&fit=crop',
    createdAt: new Date().toISOString(),
    type: 'Hotel'
  },
  {
    id: 'h2',
    name: 'Blaze Bolgoda',
    location: 'Bolgoda',
    description: 'A serene luxury boutique villa set on the banks of the Bolgoda Lake, perfect for a private getaway.',
    imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=2070&auto=format&fit=crop',
    createdAt: new Date().toISOString(),
    type: 'Villa'
  },
  {
    id: 'h3',
    name: 'Hikka Hikkaduwa',
    location: 'Hikkaduwa',
    description: 'Vibrant and modern accommodation in the heart of Hikkaduwa, offering easy access to the reef and surf.',
    imageUrl: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?q=80&w=2070&auto=format&fit=crop',
    createdAt: new Date().toISOString(),
    type: 'Bungalow'
  }
];

const MOCK_ROOMS = [
  {
    id: 'r1',
    hotelId: 'h1',
    name: 'Standard Room',
    type: 'Room',
    location: 'Ahungalla',
    rating: 4.5,
    price: 150,
    maxGuests: 2,
    isAvailable: true,
    description: 'Comfortable room for two.',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop',
    amenities: ['Wifi', 'TV'],
    createdAt: new Date().toISOString(),
    quantity: 5
  },
  {
    id: 'r2',
    hotelId: 'h2',
    name: 'Luxury Suite',
    type: 'Suite',
    location: 'Bolgoda',
    rating: 4.9,
    price: 350,
    maxGuests: 4,
    isAvailable: true,
    description: 'Spacious suite with lake view.',
    imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=2070&auto=format&fit=crop',
    amenities: ['Jacuzzi', 'Mini bar'],
    createdAt: new Date().toISOString(),
    quantity: 1
  },
  {
    id: 'r3',
    hotelId: 'h3',
    name: 'Beach Bungalow',
    type: 'Bungalow',
    location: 'Hikkaduwa',
    rating: 4.7,
    price: 220,
    maxGuests: 3,
    isAvailable: true,
    description: 'Right on the beach.',
    imageUrl: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?q=80&w=2070&auto=format&fit=crop',
    amenities: ['Air Conditioning', 'Breakfast'],
    createdAt: new Date().toISOString(),
    quantity: 1
  }
];

const MOCK_BOOKINGS = [
  {
    id: 'b1',
    userId: 'mock-user-1',
    roomId: 'r1',
    hotelId: 'h1',
    fullName: 'John Doe',
    email: 'john@example.com',
    phone: '+94 77 123 4567',
    checkIn: '2024-06-01',
    checkOut: '2024-06-05',
    guests: 2,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
    roomCount: 1
  }
];

let isDbInitialized = false;

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    dbConfigured: isDbConfigured,
    dbInitialized: isDbInitialized,
    vercel: !!process.env.VERCEL,
    node: process.version
  });
});

// Helper for queries to handle missing DB
async function query(text: string, params?: any[]) {
  if (!pool) {
    const err = new Error('Database not configured. Please set DATABASE_URL (e.g. from Supabase) in Settings -> Secrets.');
    (err as any).isConfigError = true;
    throw err;
  }
  
  if (!isDbInitialized) {
    try {
      await initDb();
    } catch (e) {
      console.error('Lazy initDb failed:', e);
    }
  }

  try {
    return await pool.query(text, params);
  } catch (dbErr: any) {
    console.error('Query Error:', dbErr.message);
    if (dbErr.message?.includes('authentication failed')) {
      const err = new Error('Database authentication failed. Please check your DB password.');
      (err as any).isConfigError = true;
      throw err;
    }
    throw dbErr;
  }
}

// Initialize Database Tables
let initPromise: Promise<void> | null = null;
async function initDb() {
  if (isDbInitialized) return;
  if (!pool) {
    console.warn('⚠️  DATABASE_URL not set or invalid. App will run in Mock Mode for data endpoints.');
    return;
  }
  
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    let client;
    try {
      client = await pool.connect();
      console.log('✅ Connected to Database');
      await client.query(`
      CREATE TABLE IF NOT EXISTS hotels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        description TEXT,
        "imageUrl" TEXT,
        "hasBanquetHall" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS rooms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "hotelId" UUID REFERENCES hotels(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        price DECIMAL NOT NULL,
        rating DECIMAL,
        "imageUrl" TEXT,
        amenities TEXT[],
        "maxGuests" INTEGER,
        "isAvailable" BOOLEAN DEFAULT true,
        location TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY, -- Supabase UID
        email TEXT UNIQUE NOT NULL,
        "displayName" TEXT,
        "photoURL" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY, -- Supabase UID
        email TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        "displayName" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" TEXT,
        "roomId" UUID REFERENCES rooms(id),
        "hotelId" UUID REFERENCES hotels(id),
        "fullName" TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        "checkIn" TIMESTAMP WITH TIME ZONE NOT NULL,
        "checkOut" TIMESTAMP WITH TIME ZONE NOT NULL,
        guests INTEGER,
        "specialRequests" TEXT,
        status TEXT DEFAULT 'confirmed',
        "cancellationReason" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Add dynamic scheme-level support columns if they don't exist
      ALTER TABLE hotels ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'Hotel';
      ALTER TABLE hotels ADD COLUMN IF NOT EXISTS email TEXT;
      ALTER TABLE hotels ADD COLUMN IF NOT EXISTS phone TEXT;
      ALTER TABLE rooms ADD COLUMN IF NOT EXISTS "quantity" INTEGER DEFAULT 1;
      UPDATE rooms SET quantity = 1 WHERE quantity IS NULL;
      ALTER TABLE rooms ALTER COLUMN quantity SET DEFAULT 1;
      ALTER TABLE rooms ALTER COLUMN quantity SET NOT NULL;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "roomCount" INTEGER DEFAULT 1;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "paymentSlipUrl" TEXT;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP WITH TIME ZONE;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS "password" TEXT;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS "phone" TEXT;
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS "password" TEXT;
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS "requiresPasswordChange" BOOLEAN DEFAULT false;

      -- Robust cleanup of any existing foreign keys on bookings.userId
      DO $$
      DECLARE
          r RECORD;
      BEGIN
          -- Find and drop ANY foreign key constraint on bookings("userId")
          FOR r IN (
              SELECT tc.constraint_name
              FROM information_schema.table_constraints AS tc
              JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
              WHERE tc.table_name = 'bookings' 
                AND kcu.column_name = 'userId'
                AND tc.constraint_type = 'FOREIGN KEY'
          ) LOOP
              EXECUTE 'ALTER TABLE bookings DROP CONSTRAINT ' || quote_ident(r.constraint_name);
          END LOOP;
          
          -- Ensure the customers table exists (it's created above, but for safety in this block)
          -- Adding the correct reference to customers
          ALTER TABLE bookings ADD CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY ("userId") REFERENCES customers(id);
      EXCEPTION
          WHEN OTHERS THEN
              RAISE NOTICE 'Skipping constraint fix: %', SQLERRM;
      END $$;

      CREATE TABLE IF NOT EXISTS email_queue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        recipient TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        status TEXT DEFAULT 'pending', -- pending, processing, sent, failed
        attempts INTEGER DEFAULT 0,
        "lastError" TEXT,
        "processedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS media (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "parentId" UUID NOT NULL,
        "parentType" TEXT NOT NULL,
        "data" TEXT NOT NULL,
        "order" INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_otps (
        email TEXT PRIMARY KEY,
        otp TEXT NOT NULL,
        password TEXT NOT NULL,
        "displayName" TEXT,
        "phone" TEXT,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS admin_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "adminId" TEXT,
        "adminEmail" TEXT NOT NULL,
        "adminName" TEXT,
        action TEXT NOT NULL,
        "targetId" TEXT,
        "targetName" TEXT,
        details TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status) WHERE status = 'pending';
      CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings("userId");
      CREATE INDEX IF NOT EXISTS idx_bookings_room_id ON bookings("roomId");
      CREATE INDEX IF NOT EXISTS idx_rooms_hotel_id ON rooms("hotelId");
      CREATE INDEX IF NOT EXISTS idx_rooms_availability ON rooms("isAvailable") WHERE "isAvailable" = true;
      CREATE INDEX IF NOT EXISTS idx_media_parent_id ON media("parentId");
      CREATE INDEX IF NOT EXISTS idx_admin_logs_createdAt ON admin_logs("createdAt" DESC);
    `);
    console.log('Database tables initialized');

    // Check for initial data and seed if empty
    const hotelCheck = await client.query('SELECT COUNT(*) FROM hotels');
    if (parseInt(hotelCheck.rows[0].count) === 0) {
      console.log('Seeding initial data...');
      const h1Result = await client.query(
        'INSERT INTO hotels (name, location, description, "imageUrl") VALUES ($1, $2, $3, $4) RETURNING id',
        ['Heritage Ahungalla', 'Ahungalla', 'A legendary 5-star resort designed by Geoffrey Bawa, offering ultimate barefoot luxury in a tropical paradise.', 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=2070&auto=format&fit=crop']
      );
      const h2Result = await client.query(
        'INSERT INTO hotels (name, location, description, "imageUrl") VALUES ($1, $2, $3, $4) RETURNING id',
        ['Blaze Bolgoda', 'Bolgoda', 'A serene luxury boutique villa set on the banks of the Bolgoda Lake, perfect for a private getaway.', 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=2070&auto=format&fit=crop']
      );
      const h3Result = await client.query(
        'INSERT INTO hotels (name, location, description, "imageUrl") VALUES ($1, $2, $3, $4) RETURNING id',
        ['Hikka Hikkaduwa', 'Hikkaduwa', 'Vibrant and modern accommodation in the heart of Hikkaduwa, offering easy access to the reef and surf.', 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?q=80&w=2070&auto=format&fit=crop']
      );

      const h1 = h1Result.rows[0].id;
      const h2 = h2Result.rows[0].id;
      const h3 = h3Result.rows[0].id;

      await client.query(
        `INSERT INTO rooms ("hotelId", name, type, location, rating, price, "maxGuests", "isAvailable", description, "imageUrl", amenities) 
         VALUES 
         ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11),
         ($12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22),
         ($23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33)`,
        [
          h1, 'Standard Room', 'Room', 'Ahungalla', 4.5, 150, 2, true, 'Comfortable room for two.', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop', ['Wifi', 'TV'],
          h2, 'Luxury Suite', 'Suite', 'Bolgoda', 4.9, 350, 4, true, 'Spacious suite with lake view.', 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=2070&auto=format&fit=crop', ['Jacuzzi', 'Mini bar'],
          h3, 'Beach Bungalow', 'Bungalow', 'Hikkaduwa', 4.7, 220, 3, true, 'Right on the beach.', 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?q=80&w=2070&auto=format&fit=crop', ['Air Conditioning', 'Breakfast']
        ]
      );
      console.log('Seed data inserted');
    }
    isDbInitialized = true;
  } catch (err: any) {
    initPromise = null; // Allow retry on next request
    console.error('\n❌ Database initialization error:');
    if (err.message?.includes('authentication failed')) {
      console.error('Password authentication failed. Please check your DB password in the DATABASE_URL.');
    } else {
      console.error(err.message || err);
    }
    console.warn('App will continue in Mock Mode for public data.\n');
  } finally {
    if (client) client.release();
  }
  })();

  return initPromise;
}

// API Routes
app.get('/api/ping', (req, res) => res.send('pong'));

// Database Status
app.get('/api/db-status', (req, res) => {
  res.json({
    configured: isDbConfigured,
    connected: pool !== null && isDbConfigured,
    mode: isDbConfigured ? 'production' : 'mock'
  });
});

// Customers
app.get('/api/customers', requireAdmin, async (req, res) => {
  try {
    const result = await query('SELECT id, email, "displayName", "photoURL", phone, "createdAt" FROM customers ORDER BY "createdAt" DESC');
    res.json(result.rows);
  } catch (err: any) {
    res.status(err.isConfigError ? 403 : 500).json({ error: err.message });
  }
});

app.get('/api/customers/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    // Try by id first
    let result = await query('SELECT * FROM customers WHERE id = $1', [uid]);
    let customer = result.rows[0] || null;

    // Fallback: if uid looks like an email and id lookup missed, try by email
    if (!customer && uid.includes('@')) {
      const emailResult = await query('SELECT * FROM customers WHERE LOWER(email) = LOWER($1)', [uid]);
      customer = emailResult.rows[0] || null;
    }

    // If customer has no phone, backfill from their most recent booking
    if (customer && !customer.phone) {
      try {
        const bResult = await query(
          `SELECT phone FROM bookings WHERE "userId" = $1 AND phone IS NOT NULL AND phone != '' ORDER BY "createdAt" DESC LIMIT 1`,
          [customer.id]
        );
        if (bResult.rows[0]?.phone) {
          customer.phone = bResult.rows[0].phone;
          await query('UPDATE customers SET phone = $1 WHERE id = $2', [customer.phone, customer.id]);
        }
      } catch (_) { /* non-fatal */ }
    }

    if (customer) delete customer.password;
    res.json(customer);
  } catch (err: any) {
    res.status(err.isConfigError ? 403 : 500).json({ error: err.message });
  }
});

app.post('/api/customers/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { email, displayName, photoURL, phone } = req.body;

    // Normalise: treat empty-string phone as null so COALESCE can preserve an existing value
    const phoneVal = (phone && phone.trim()) ? phone.trim() : null;

    let result = await query(
      `INSERT INTO customers (id, email, "displayName", "photoURL", "phone")
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET
         "displayName" = EXCLUDED."displayName",
         "photoURL"    = EXCLUDED."photoURL",
         "phone"       = COALESCE(EXCLUDED."phone", customers."phone")
       RETURNING *`,
      [uid, email, displayName, photoURL, phoneVal]
    );

    // If ON CONFLICT (email) left the row with a different primary key, the above may
    // have thrown a PK violation instead. Catch that with a direct UPDATE by email.
    if (!result.rows[0]) {
      result = await query(
        `UPDATE customers SET "displayName" = $1, "photoURL" = $2,
           "phone" = COALESCE($3, "phone")
         WHERE LOWER(email) = LOWER($4) RETURNING *`,
        [displayName, photoURL, phoneVal, email]
      );
    }

    if (result.rows[0]) delete result.rows[0].password;
    res.json(result.rows[0]);
  } catch (err: any) {
    // PK violation: a row with this id already exists under a different email — update by email instead
    if ((err as any).code === '23505' && (err as any).constraint === 'customers_pkey') {
      try {
        const phoneVal2 = (req.body.phone && req.body.phone.trim()) ? req.body.phone.trim() : null;
        const fallback = await query(
          `UPDATE customers SET "displayName" = $1, "photoURL" = $2,
             "phone" = COALESCE($3, "phone")
           WHERE LOWER(email) = LOWER($4) RETURNING *`,
          [req.body.displayName, req.body.photoURL, phoneVal2, req.body.email]
        );
        if (fallback.rows[0]) delete fallback.rows[0].password;
        return res.json(fallback.rows[0] || null);
      } catch (inner: any) {
        return res.status(500).json({ error: inner.message });
      }
    }
    res.status(err.isConfigError ? 403 : 500).json({ error: err.message });
  }
});

// Admins
app.get('/api/admins', requireAdmin, async (req, res) => {
  try {
    const result = await query('SELECT id, email, role, "displayName", "requiresPasswordChange", "createdAt" FROM admins ORDER BY "createdAt" DESC');
    res.json(result.rows);
  } catch (err: any) {
    res.status(err.isConfigError ? 403 : 500).json({ error: err.message });
  }
});

app.get('/api/admins/:uid', requireAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    const result = await query('SELECT id, email, role, "displayName", "requiresPasswordChange", "createdAt" FROM admins WHERE id = $1', [uid]);
    res.json(result.rows[0] || null);
  } catch (err: any) {
    res.status(err.isConfigError ? 403 : 500).json({ error: err.message });
  }
});

app.post('/api/admins/:uid', requireAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    const { email, role, displayName } = req.body;
    
    // Check if an admin with the same email already exists
    const existing = await query('SELECT * FROM admins WHERE LOWER(email) = LOWER($1)', [email]);
    if (existing.rows.length > 0) {
      // Update existing record by email with the new id and options
      const result = await query(
        'UPDATE admins SET id = $1, role = $2, "displayName" = $3 WHERE LOWER(email) = LOWER($4) RETURNING *',
        [uid, role || 'admin', displayName, email]
      );
      if (result.rows[0]) delete result.rows[0].password;
      return res.json(result.rows[0]);
    }

    // Otherwise, perform safe ON CONFLICT (id) upsert
    const result = await query(
      'INSERT INTO admins (id, email, role, "displayName") VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, role = EXCLUDED.role, "displayName" = EXCLUDED."displayName" RETURNING *',
      [uid, email, role || 'admin', displayName]
    );
    if (result.rows[0]) delete result.rows[0].password;
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(err.isConfigError ? 403 : 500).json({ error: err.message });
  }
});

app.delete('/api/admins/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM admins WHERE id = $1', [id]);
    res.sendStatus(204);
  } catch (err: any) {
    res.status(err.isConfigError ? 403 : 500).json({ error: err.message });
  }
});

// In-Memory Cache for public data to enable sub-millisecond tab switching and page load
let cachedHotels: any[] | null = null;
let cachedHotelsTime = 0;
let cachedRooms: any[] | null = null;
let cachedRoomsTime = 0;
const CACHE_TTL = 5000; // 5-second transient cache for fast UI tab switching without locking actual DB updates

// Extract and verify the signed session JWT from the Authorization header.
// Returns the decoded payload ({ id, email, role, exp }) or null.
function getVerifiedToken(req: express.Request): any | null {
  const header = req.headers['authorization'];
  if (!header || Array.isArray(header) || !header.startsWith('Bearer ')) return null;
  return verifyJwt(header.slice(7));
}

// Authorization middleware: only allow requests carrying a valid admin JWT.
// Identity/role come exclusively from the cryptographically verified token —
// the x-admin-* headers are never trusted for access control.
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const payload = getVerifiedToken(req);
  if (!payload || payload.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator authentication required.' });
  }
  (req as any).admin = payload;
  next();
}

const getAdminInfo = (req: express.Request) => {
  const verified = (req as any).admin || getVerifiedToken(req);
  return {
    // Identity + role are taken from the verified token; the display name is
    // a non-security UI hint that may come from a header.
    id: verified?.id || (req.headers['x-admin-id'] as string) || null,
    email: verified?.email || (req.headers['x-admin-email'] as string) || null,
    name: req.headers['x-admin-name'] as string || null,
    role: verified?.role || null,
  };
};

async function logAdminAction(dbQuery: any, adminInfo: any, action: string, targetId: string, targetName: string, details: string) {
  try {
    if (!adminInfo || !adminInfo.email) {
      console.log(`Skipping admin audit log because no admin context was provided (Action: ${action})`);
      return;
    }
    const adminId = adminInfo.id || null;
    const adminEmail = adminInfo.email;
    const adminName = adminInfo.name || adminEmail.split('@')[0];
    await dbQuery(
      `INSERT INTO admin_logs ("adminId", "adminEmail", "adminName", action, "targetId", "targetName", details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [adminId, adminEmail, adminName, action, targetId, targetName, details]
    );
    console.log(`[AUDIT LOG] ${adminName} executed ${action} on ${targetName} (${targetId})`);
  } catch (err) {
    console.error('Error writing admin audit log to DB:', err);
  }
}

app.get('/api/admin/logs', requireAdmin, async (req, res) => {
  if (!pool) {
    return res.json([]);
  }

  try {
    const result = await query('SELECT * FROM admin_logs ORDER BY "createdAt" DESC LIMIT 1000');
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch transaction logs' });
  }
});

const clearCache = () => {
  cachedHotels = null;
  cachedRooms = null;
  cachedHotelsTime = 0;
  cachedRoomsTime = 0;
  _heroCache = null;
};

// Hotels
app.get('/api/hotels', async (req, res) => {
  const forceRefresh = req.query.refresh === 'true';
  const now = Date.now();
  if (cachedHotels && !forceRefresh && (now - cachedHotelsTime < CACHE_TTL)) {
    return res.json(cachedHotels);
  }
  try {
    const result = await query('SELECT * FROM hotels ORDER BY "createdAt" DESC');
    const hotels = result.rows;
    const hotelsToFetch = hotels.filter((h: any) => !h.imageUrl || h.imageUrl.startsWith('https://images.unsplash.com') || h.imageUrl === '');
    if (hotelsToFetch.length > 0) {
      const ids = hotelsToFetch.map((h: any) => h.id);
      const mediaResult = await query(
        `SELECT DISTINCT ON ("parentId") "parentId", data 
         FROM media 
         WHERE "parentId" = ANY($1::uuid[]) 
         ORDER BY "parentId", "order" ASC, id ASC`,
        [ids]
      );
      const mediaMap = new Map();
      for (const row of mediaResult.rows) {
        mediaMap.set(row.parentId, row.data);
      }
      for (const h of hotelsToFetch) {
        if (mediaMap.has(h.id)) {
          h.imageUrl = mediaMap.get(h.id);
        }
      }
    }
    cachedHotels = hotels;
    cachedHotelsTime = Date.now();
    res.json(hotels);
  } catch (err: any) {
    if (err.isConfigError || err.message?.includes('does not exist')) {
      console.warn('Using Mock Hotels (DB fallback)');
      return res.json(MOCK_HOTELS);
    }
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/hotels', requireAdmin, async (req, res) => {
  if (!pool) {
    const { name, location, description, imageUrl, hasBanquetHall, email, phone, type } = req.body;
    const newHotel = {
      id: 'h_' + Math.random().toString(36).substring(2, 11),
      name,
      location,
      description,
      imageUrl,
      hasBanquetHall: hasBanquetHall || false,
      email,
      phone,
      type: type || 'Hotel',
      createdAt: new Date().toISOString()
    };
    MOCK_HOTELS.push(newHotel);
    return res.json(newHotel);
  }
  try {
    const { name, location, description, imageUrl, hasBanquetHall, email, phone, type } = req.body;
    const result = await query(
      'INSERT INTO hotels (name, location, description, "imageUrl", "hasBanquetHall", email, phone, "type") VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [name, location, description, imageUrl, hasBanquetHall || false, email, phone, type || 'Hotel']
    );
    clearCache();

    const adminInfo = getAdminInfo(req);
    if (adminInfo.email) {
      const hotelObj = result.rows[0];
      await logAdminAction(query, adminInfo, 'ADD_HOTEL', hotelObj.id, hotelObj.name, `Added hotel / resource ${hotelObj.name} (${hotelObj.type || 'Hotel'})`);
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(err.isConfigError ? 403 : 500).json({ error: err.message });
  }
});

app.patch('/api/hotels/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const ALLOWED_HOTEL_FIELDS = new Set(['name', 'location', 'description', 'imageUrl', 'type', 'hasBanquetHall', 'email', 'phone']);
    const keys = Object.keys(updates).filter(k => ALLOWED_HOTEL_FIELDS.has(k) && updates[k] !== undefined);
    if (keys.length === 0) return res.status(400).json({ error: 'No valid fields to update.' });
    const setClause = keys.map((key, i) => `"${key}" = $${i + 2}`).join(', ');
    const values = keys.map(key => updates[key]);

    const result = await query(
      `UPDATE hotels SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    clearCache();

    const adminInfo = getAdminInfo(req);
    if (adminInfo.email && result.rows[0]) {
      const hotelObj = result.rows[0];
      await logAdminAction(query, adminInfo, 'UPDATE_HOTEL', hotelObj.id, hotelObj.name, `Updated details of hotel / resource ${hotelObj.name} (${hotelObj.type || 'Hotel'})`);
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(err.isConfigError ? 403 : 500).json({ error: err.message });
  }
});

app.delete('/api/hotels/:id', requireAdmin, async (req, res) => {
  try {
    const adminInfo = getAdminInfo(req);
    let hotelName = 'Hotel';
    let hotelType = 'Location';
    
    try {
      const hCheck = await query('SELECT name, type FROM hotels WHERE id = $1', [req.params.id]);
      if (hCheck.rows[0]) {
        hotelName = hCheck.rows[0].name;
        hotelType = hCheck.rows[0].type || 'Hotel';
      }
    } catch (e) {
      console.error('Error fetching hotel before delete:', e);
    }

    await query('DELETE FROM hotels WHERE id = $1', [req.params.id]);
    clearCache();

    if (adminInfo.email) {
      await logAdminAction(query, adminInfo, 'DELETE_HOTEL', req.params.id, hotelName, `Deleted hotel / resource ${hotelName} (${hotelType})`);
    }

    res.sendStatus(204);
  } catch (err: any) {
    res.status(err.isConfigError ? 403 : 500).json({ error: err.message });
  }
});

// Rooms
app.get('/api/rooms', async (req, res) => {
  const { hotelId, refresh } = req.query;
  const forceRefresh = refresh === 'true';
  const now = Date.now();
  if (cachedRooms && !forceRefresh && (now - cachedRoomsTime < CACHE_TTL)) {
    if (hotelId) {
      return res.json(cachedRooms.filter((r: any) => r.hotelId === hotelId));
    }
    return res.json(cachedRooms);
  }
  try {
    let queryText = 'SELECT * FROM rooms ORDER BY "createdAt" DESC';
    const result = await query(queryText);
    // Convert string ratings/prices back to numbers if needed
    const rooms = result.rows.map(r => ({
       ...r,
       price: parseFloat(r.price),
       rating: r.rating ? parseFloat(r.rating) : null
    }));
    const roomsToFetch = rooms.filter(r => !r.imageUrl || r.imageUrl.startsWith('https://images.unsplash.com') || r.imageUrl === '');
    if (roomsToFetch.length > 0) {
      const ids = roomsToFetch.map(r => r.id);
      const mediaResult = await query(
        `SELECT DISTINCT ON ("parentId") "parentId", data 
         FROM media 
         WHERE "parentId" = ANY($1::uuid[]) 
         ORDER BY "parentId", "order" ASC, id ASC`,
        [ids]
      );
      const mediaMap = new Map();
      for (const row of mediaResult.rows) {
        mediaMap.set(row.parentId, row.data);
      }
      for (const r of roomsToFetch) {
        if (mediaMap.has(r.id)) {
          r.imageUrl = mediaMap.get(r.id);
        }
      }
    }
    cachedRooms = rooms;
    cachedRoomsTime = Date.now();
    if (hotelId) {
      return res.json(rooms.filter((r: any) => r.hotelId === hotelId));
    }
    res.json(rooms);
  } catch (err: any) {
    if (err.isConfigError || err.message?.includes('does not exist')) {
      console.warn('Using Mock Rooms (DB fallback)');
      const fallbackRooms = hotelId ? MOCK_ROOMS.filter(r => r.hotelId === hotelId) : MOCK_ROOMS;
      return res.json(fallbackRooms);
    }
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rooms', requireAdmin, async (req, res) => {
  if (!pool) {
    const { 
      hotelId, name, type, description, price, rating, imageUrl, amenities, maxGuests, 
      isAvailable = true, location, quantity
    } = req.body;
    const newRoom = {
      id: 'r_' + Math.random().toString(36).substring(2, 11),
      hotelId,
      name,
      type,
      description,
      price: Number(price),
      rating: rating ? Number(rating) : 5,
      imageUrl,
      amenities: amenities || [],
      maxGuests: Number(maxGuests),
      isAvailable: isAvailable !== false,
      location,
      quantity: quantity ? Number(quantity) : 1,
      createdAt: new Date().toISOString()
    };
    MOCK_ROOMS.push(newRoom);
    return res.json(newRoom);
  }
  try {
    const { 
      hotelId, name, type, description, price, rating, imageUrl, amenities, maxGuests, 
      isAvailable = true, location, quantity 
    } = req.body;
    const result = await query(
      `INSERT INTO rooms ("hotelId", name, type, description, price, rating, "imageUrl", amenities, "maxGuests", "isAvailable", location, quantity) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [hotelId, name, type, description, price, rating, imageUrl, amenities, maxGuests, isAvailable, location, quantity || 1]
    );
    clearCache();

    const adminInfo = getAdminInfo(req);
    if (adminInfo.email) {
      const roomObj = result.rows[0];
      await logAdminAction(query, adminInfo, 'ADD_ROOM', roomObj.id, roomObj.name, `Added accommodation / room ${roomObj.name} (${roomObj.type})`);
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error(err);
    res.status(err.isConfigError ? 403 : 500).json({ error: err.message || 'Failed to add room' });
  }
});

app.patch('/api/rooms/:id', requireAdmin, async (req, res) => {
  if (!pool) {
    const { id } = req.params;
    const updates = req.body;
    const room = MOCK_ROOMS.find(r => r.id === id);
    if (room) {
      Object.assign(room, updates);
      return res.json(room);
    }
    return res.status(404).json({ error: 'Mock room not found' });
  }
  try {
    const { id } = req.params;
    const updates = req.body;
    const ALLOWED_ROOM_FIELDS = new Set(['name', 'type', 'description', 'price', 'rating', 'imageUrl', 'amenities', 'maxGuests', 'isAvailable', 'location', 'quantity']);
    const keys = Object.keys(updates).filter(k => ALLOWED_ROOM_FIELDS.has(k));
    if (keys.length === 0) return res.status(400).json({ error: 'No valid fields to update.' });
    const setClause = keys.map((key, i) => `"${key}" = $${i + 2}`).join(', ');
    const values = keys.map(key => updates[key]);

    const result = await query(
      `UPDATE rooms SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    clearCache();

    const adminInfo = getAdminInfo(req);
    if (adminInfo.email && result.rows[0]) {
      const roomObj = result.rows[0];
      await logAdminAction(query, adminInfo, 'UPDATE_ROOM', roomObj.id, roomObj.name, `Updated details of accommodation / room ${roomObj.name} (${roomObj.type})`);
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(err.isConfigError ? 403 : 500).json({ error: err.message || 'Failed to update room' });
  }
});

app.delete('/api/rooms/:id', requireAdmin, async (req, res) => {
  try {
    const adminInfo = getAdminInfo(req);
    let roomName = 'Accommodation';
    let roomType = 'Room';

    try {
      const rCheck = await query('SELECT name, type FROM rooms WHERE id = $1', [req.params.id]);
      if (rCheck.rows[0]) {
        roomName = rCheck.rows[0].name;
        roomType = rCheck.rows[0].type || 'Room';
      }
    } catch (e) {
      console.error('Error fetching room before delete:', e);
    }

    await query('DELETE FROM rooms WHERE id = $1', [req.params.id]);
    clearCache();

    if (adminInfo.email) {
      await logAdminAction(query, adminInfo, 'DELETE_ROOM', req.params.id, roomName, `Deleted accommodation / room ${roomName} (${roomType})`);
    }

    res.sendStatus(204);
  } catch (err: any) {
    res.status(err.isConfigError ? 403 : 500).json({ error: err.message || 'Failed to delete room' });
  }
});

app.get('/api/rooms/:id/availability', async (req, res) => {
  const { id } = req.params;
  const { checkIn, checkOut } = req.query;
  
  if (!checkIn || !checkOut) {
    return res.status(400).json({ error: 'checkIn and checkOut dates are required' });
  }

  if (!pool) {
    const room = MOCK_ROOMS.find(r => r.id === id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const reqIn = new Date(checkIn as string);
    const reqOut = new Date(checkOut as string);
    
    let sumBooked = 0;
    for (const b of MOCK_BOOKINGS) {
      if (b.roomId === id && b.status !== 'cancelled') {
        const bIn = new Date(b.checkIn);
        const bOut = new Date(b.checkOut);
        if (bIn < reqOut && bOut > reqIn) {
          sumBooked += (b.roomCount || 1);
        }
      }
    }
    
    const remainingQuantity = Math.max(0, (room.quantity || 1) - sumBooked);
    return res.json({ remainingQuantity });
  }
  
  try {
    const roomRes = await query('SELECT quantity FROM rooms WHERE id = $1', [id]);
    if (!roomRes.rows[0]) {
      return res.status(404).json({ error: 'Room not found' });
    }
    const totalQty = parseInt(roomRes.rows[0].quantity);
    
    const bookingsRes = await query(
      `SELECT COALESCE(SUM(COALESCE("roomCount", 1)), 0) as booked_count 
       FROM bookings 
       WHERE "roomId" = $1 
         AND status != 'cancelled' 
         AND "checkIn" < $3 
         AND "checkOut" > $2`,
      [id, checkIn, checkOut]
    );
    
    const bookedCount = parseInt(bookingsRes.rows[0].booked_count);
    const remainingQuantity = Math.max(0, totalQty - bookedCount);
    
    res.json({ remainingQuantity });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch availability' });
  }
});

// Bookings
app.get('/api/bookings', async (req, res) => {
  try {
    const { userId, limit, offset } = req.query;

    // Fetching the full bookings list (no userId filter) is an admin-only
    // operation. Customers may only request their own bookings via ?userId=.
    if (!userId) {
      const payload = getVerifiedToken(req);
      if (!payload || payload.role !== 'admin') {
        return res.status(403).json({ error: 'Administrator authentication required to list all bookings.' });
      }
    }

    let queryText = 'SELECT * FROM bookings';
    const params = [];
    let paramIndex = 1;
    
    if (userId) {
      queryText += ` WHERE "userId" = $${paramIndex++}`;
      params.push(userId);
    }
    
    queryText += ' ORDER BY "createdAt" DESC';
    
    if (limit) {
      queryText += ` LIMIT $${paramIndex++}`;
      params.push(parseInt(limit as string));
    }
    
    if (offset) {
      queryText += ` OFFSET $${paramIndex++}`;
      params.push(parseInt(offset as string));
    }
    
    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (err: any) {
    if (err.isConfigError || err.message?.includes('does not exist')) {
      console.warn('Using Mock Bookings (DB fallback)');
      return res.json(MOCK_BOOKINGS);
    }
    res.status(err.isConfigError ? 403 : 500).json({ error: err.message || 'Failed to fetch bookings' });
  }
});

app.post('/api/bookings', async (req, res) => {
  const { userId, roomId, hotelId, fullName, email, phone, checkIn, checkOut, guests, specialRequests, status, roomCount = 1 } = req.body;
  const requestedRoomCount = parseInt(roomCount as string) || 1;

  if (!pool) {
    const room = MOCK_ROOMS.find(r => r.id === roomId);
    if (!room) {
      return res.status(404).json({ error: 'Accommodation not found' });
    }

    const reqIn = new Date(checkIn as string);
    const reqOut = new Date(checkOut as string);
    
    let sumBooked = 0;
    for (const b of MOCK_BOOKINGS) {
      if (b.roomId === roomId && b.status !== 'cancelled') {
        const bIn = new Date(b.checkIn);
        const bOut = new Date(b.checkOut);
        if (bIn < reqOut && bOut > reqIn) {
          sumBooked += (b.roomCount || 1);
        }
      }
    }
    
    const remainingQuantity = Math.max(0, (room.quantity || 1) - sumBooked);
    if (requestedRoomCount > remainingQuantity) {
      return res.status(409).json({ error: `Not enough rooms available for these dates! Only ${remainingQuantity} available.` });
    }

    const newBooking = {
      id: 'b_' + Math.random().toString(36).substring(2, 11),
      userId: userId || 'mock-user-rand',
      roomId,
      hotelId,
      fullName,
      email,
      phone,
      checkIn,
      checkOut,
      guests: guests || 2,
      specialRequests,
      status: status || 'pending',
      roomCount: requestedRoomCount,
      createdAt: new Date().toISOString()
    };
    MOCK_BOOKINGS.push(newBooking);
    return res.json(newBooking);
  }
  
  if (!isDbInitialized && process.env.VERCEL) {
    await initDb();
  }
  
  const client = await pool.connect();
  let isClientReleased = false;
  
  try {
    await client.query('BEGIN');
    
    // Lock the room categories to serialize booking confirmations of this card type
    const roomCheck = await client.query(
      'SELECT quantity, name, "imageUrl", price FROM rooms WHERE id = $1 FOR UPDATE',
      [roomId]
    );

    if (!roomCheck.rows[0]) {
      throw new Error('Accommodation not found');
    }

    const totalQty = parseInt(roomCheck.rows[0].quantity);
    
    // Query booked count for this room category in overlapping overlapping intervals
    const bookingsRes = await client.query(
      `SELECT COALESCE(SUM(COALESCE("roomCount", 1)), 0) as booked_count 
       FROM bookings 
       WHERE "roomId" = $1 
         AND status != 'cancelled' 
         AND "checkIn" < $3 
         AND "checkOut" > $2`,
      [roomId, checkIn, checkOut]
    );
    
    const bookedCount = parseInt(bookingsRes.rows[0].booked_count);
    const remainingQuantity = Math.max(0, totalQty - bookedCount);
    
    if (requestedRoomCount > remainingQuantity) {
      throw new Error(`Only ${remainingQuantity} units of this accommodation are available for your selected dates.`);
    }
    
    const result = await client.query(
      `INSERT INTO bookings ("userId", "roomId", "hotelId", "fullName", email, phone, "checkIn", "checkOut", guests, "specialRequests", status, "roomCount") 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [userId, roomId, hotelId, fullName, email, phone, checkIn, checkOut, guests, specialRequests, status || 'pending', requestedRoomCount]
    );

    await client.query(
      `UPDATE rooms SET "isAvailable" = (
        quantity > COALESCE((
          SELECT SUM(COALESCE("roomCount", 1)) FROM bookings
          WHERE "roomId" = $1 AND status != 'cancelled'
        ), 0)
      ) WHERE id = $1`,
      [roomId]
    );

    const booking = result.rows[0];
    const hotelResult = await client.query('SELECT name FROM hotels WHERE id = $1', [hotelId]);

    let roomImageUrl = roomCheck.rows[0]?.imageUrl || roomCheck.rows[0]?.["imageUrl"];
    try {
      const mediaResult = await client.query(
        'SELECT data FROM media WHERE "parentId" = $1 ORDER BY "order" ASC, id ASC LIMIT 1',
        [roomId]
      );
      if (mediaResult.rows[0]?.data) {
        roomImageUrl = mediaResult.rows[0].data;
      }
    } catch (mediaErr) {
      console.warn('Could not query dynamic media for initial booking email:', mediaErr);
    }

    await queueBookingConfirmation(client.query.bind(client), {
      id: booking.id,
      fullName: booking.fullName,
      email: booking.email,
      phone: booking.phone,
      hotelName: hotelResult.rows[0]?.name || 'Amadiya Leisure',
      roomName: roomCheck.rows[0].name,
      roomImageUrl: roomImageUrl,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      guests: booking.guests,
      specialRequests: booking.specialRequests,
      placedAt: booking.createdAt,
      price: roomCheck.rows[0].price ? Number(roomCheck.rows[0].price) : undefined,
      roomCount: booking.roomCount || 1
    });

    await client.query('COMMIT');
    isClientReleased = true;
    
    // --- NEW: Trigger email processing immediately for Vercel ---
    await processEmailQueue(pool).catch(err => {
      console.error('Immediate email processing failed:', err);
    });
    // ------------------------------------------------------------

    res.json(booking);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Booking Error:', err);
    res.status(err.isConfigError ? 403 : 409).json({ error: err.message || 'Failed to create booking' });
  } finally {
    client.release();
  }
});

app.patch('/api/bookings/:id', requireAdmin, async (req, res) => {
  if (!pool) {
    const { id } = req.params;
    const { status, ...updates } = req.body;
    const booking = MOCK_BOOKINGS.find(b => b.id === id);
    if (booking) {
      if (status === 'confirmed' && !(booking as any).paymentSlipUrl) {
        return res.status(409).json({ error: 'Cannot confirm: no payment slip has been uploaded for this booking.' });
      }
      if (status !== undefined) booking.status = status;
      Object.assign(booking, updates);
      return res.json(booking);
    }
    return res.status(404).json({ error: 'Mock booking not found' });
  }
  
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { status, ...updates } = req.body;
    
    await client.query('BEGIN');
    
    // Get the current booking to know the roomId / payment slip
    const currentBooking = await client.query('SELECT "roomId", "paymentSlipUrl" FROM bookings WHERE id = $1 FOR UPDATE', [id]);
    const roomId = currentBooking.rows[0]?.roomId;

    if (!currentBooking.rows[0]) {
      throw new Error('Booking not found');
    }

    // Guard: a booking can never be confirmed without a payment slip on record.
    if (status === 'confirmed' && !currentBooking.rows[0].paymentSlipUrl) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Cannot confirm: no payment slip has been uploaded for this booking.' });
    }

    const ALLOWED_BOOKING_FIELDS = new Set(['status', 'specialRequests', 'fullName', 'phone', 'guests', 'roomCount', 'checkIn', 'checkOut', 'paymentSlipUrl', 'paidAt']);
    const allUpdates: any = { status, ...updates };
    // Stamp the verification time automatically when staff confirm a booking.
    if (status === 'confirmed' && allUpdates.paidAt === undefined) {
      allUpdates.paidAt = new Date().toISOString();
    }
    const keys = Object.keys(allUpdates).filter(k => ALLOWED_BOOKING_FIELDS.has(k));
    if (keys.length > 0) {
      const setClause = keys.map((key, i) => `"${key}" = $${i + 2}`).join(', ');
      const values = keys.map(key => allUpdates[key as keyof typeof allUpdates]);
      
      const result = await client.query(
        `UPDATE bookings SET ${setClause} WHERE id = $1 RETURNING *`,
        [id, ...values]
      );

      if ((status === 'cancelled' || status === 'confirmed') && roomId) {
        await client.query(
          `UPDATE rooms SET "isAvailable" = (
            quantity > COALESCE((
              SELECT SUM(COALESCE("roomCount", 1)) FROM bookings
              WHERE "roomId" = $1 AND status != 'cancelled'
            ), 0)
          ) WHERE id = $1`,
          [roomId]
        );
      }

      // Send status transition email if accepted (confirmed) or cancelled
      if (status === 'confirmed' || status === 'cancelled') {
        const detailResult = await client.query(
          `SELECT 
             b.id,
             b."fullName",
             b.email,
             b.phone,
             b."checkIn",
             b."checkOut",
             b.guests,
             b."specialRequests",
             b."createdAt",
             r.name AS "roomName",
             r."imageUrl" AS "roomImageUrl",
             r.price AS "roomPrice",
             b."roomCount",
             h.name AS "hotelName"
           FROM bookings b
           JOIN rooms r ON b."roomId" = r.id
           JOIN hotels h ON b."hotelId" = h.id
           WHERE b.id = $1`,
          [id]
        );

        if (detailResult.rows[0]) {
          const det = detailResult.rows[0];
          
          let roomImageUrl = det.roomImageUrl;
          try {
            const mediaResult = await client.query(
              'SELECT data FROM media WHERE "parentId" = $1 ORDER BY "order" ASC, id ASC LIMIT 1',
              [roomId]
            );
            if (mediaResult.rows[0]?.data) {
              roomImageUrl = mediaResult.rows[0].data;
            }
          } catch (mediaErr) {
            console.warn('Could not query dynamic media for updated booking email:', mediaErr);
          }

          const bookingDetails = {
            id: det.id,
            fullName: det.fullName,
            email: det.email,
            phone: det.phone || undefined,
            hotelName: det.hotelName || 'Amadiya Leisure',
            roomName: det.roomName,
            roomImageUrl: roomImageUrl,
            checkIn: det.checkIn,
            checkOut: det.checkOut,
            guests: det.guests,
            specialRequests: det.specialRequests || undefined,
            placedAt: det.createdAt,
            price: det.roomPrice ? Number(det.roomPrice) : undefined,
            roomCount: det.roomCount || 1
          };

          if (status === 'confirmed') {
            await queueBookingAcceptance(client.query.bind(client), bookingDetails);
          } else {
            await queueBookingCancellation(client.query.bind(client), bookingDetails);
          }

          const adminInfo = getAdminInfo(req);
          if (adminInfo.email) {
            const logAction = status === 'confirmed' ? 'CONFIRM_BOOKING' : 'CANCEL_BOOKING';
            const logDetails = status === 'confirmed'
              ? `Confirmed booking for guest ${det.fullName} at ${det.hotelName || 'Amadiya Leisure'} (${det.roomName})`
              : `Cancelled booking for guest ${det.fullName} at ${det.hotelName || 'Amadiya Leisure'} (${det.roomName})`;
            await logAdminAction(client.query.bind(client), adminInfo, logAction, det.id, det.fullName, logDetails);
          }
        }
      }

      await client.query('COMMIT');

      // Processing queue fast to make status changes send immediately
      await processEmailQueue(pool).catch(err => {
        console.error('Immediate email queue processing failed after booking status change:', err);
      });

      res.json(result.rows[0]);
    } else {
      await client.query('COMMIT');
      res.sendStatus(200);
    }
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(err.isConfigError ? 403 : 500).json({ error: err.message || 'Failed to update booking' });
  } finally {
    client.release();
  }
});

// Customer payment-slip upload: a guest attaches the bank-transfer slip to their
// own booking. Auth is the customer JWT (NOT admin); ownership is verified by
// matching the booking's userId/email to the verified token.
app.post('/api/bookings/:id/slip', async (req, res) => {
  const { id } = req.params;
  const { slipUrl } = req.body;

  const payload = getVerifiedToken(req);
  if (!payload || payload.role !== 'customer') {
    return res.status(403).json({ error: 'Please sign in to upload your payment slip.' });
  }
  if (!slipUrl || typeof slipUrl !== 'string') {
    return res.status(400).json({ error: 'A payment slip file is required.' });
  }

  if (!pool) {
    const booking = MOCK_BOOKINGS.find(b => b.id === id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    (booking as any).paymentSlipUrl = slipUrl;
    if (booking.status === 'pending' || booking.status === 'payment_review') {
      booking.status = 'payment_review';
    }
    return res.json(booking);
  }

  try {
    // Only let the owner of the booking attach a slip to it.
    const ownerCheck = await query('SELECT "userId", email, status FROM bookings WHERE id = $1', [id]);
    const row = ownerCheck.rows[0];
    if (!row) return res.status(404).json({ error: 'Booking not found' });

    const ownsBooking = (row.userId && row.userId === payload.id) ||
      (row.email && payload.email && row.email.toLowerCase() === String(payload.email).toLowerCase());
    if (!ownsBooking) {
      return res.status(403).json({ error: 'You can only upload a slip for your own booking.' });
    }

    // Don't reopen already-finalized bookings.
    const nextStatus = (row.status === 'pending' || row.status === 'payment_review') ? 'payment_review' : row.status;

    const result = await query(
      'UPDATE bookings SET "paymentSlipUrl" = $1, status = $2 WHERE id = $3 RETURNING *',
      [slipUrl, nextStatus, id]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(err.isConfigError ? 403 : 500).json({ error: err.message || 'Failed to attach payment slip' });
  }
});

// Media
const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

app.get('/api/media/:parentId', async (req, res) => {
  try {
    const { parentId } = req.params;
    if (!isValidUUID(parentId)) {
      return res.json([]);
    }
    const result = await query(
      'SELECT * FROM media WHERE "parentId" = $1 ORDER BY "order" ASC',
      [parentId]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/media', requireAdmin, async (req, res) => {
  try {
    const { parentId, parentType, data, order = 0 } = req.body;
    if (!isValidUUID(parentId)) {
      return res.status(400).json({ error: 'Invalid parentId format. Must be a valid UUID.' });
    }
    const result = await query(
      'INSERT INTO media ("parentId", "parentType", "data", "order") VALUES ($1, $2, $3, $4) RETURNING *',
      [parentId, parentType, data, order]
    );
    clearCache();
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/media/reparent', requireAdmin, async (req, res) => {
  try {
    const { oldParentId, newParentId } = req.body;
    if (!isValidUUID(oldParentId) || !isValidUUID(newParentId)) {
      return res.json({ success: true, message: 'Invalid UUID format, skipped reparenting.' });
    }
    await query(
      'UPDATE media SET "parentId" = $1 WHERE "parentId" = $2',
      [newParentId, oldParentId]
    );
    clearCache();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/media/parent/:parentId', requireAdmin, async (req, res) => {
  try {
    const { parentId } = req.params;
    if (!isValidUUID(parentId)) {
      return res.sendStatus(204);
    }
    await query('DELETE FROM media WHERE "parentId" = $1', [parentId]);
    clearCache();
    res.sendStatus(204);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/media/:id', requireAdmin, async (req, res) => {
  try {
    await query('DELETE FROM media WHERE id = $1', [req.params.id]);
    clearCache();
    res.sendStatus(204);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Custom password cryptographic hashing using PBKDF2 with custom salting to prevent dictionary / brute-force attacks
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `pbkdf2_10000$${salt}$${hash}`;
}

// Timing-safe password confirmation protecting against side-channel analysis
function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;
  if (storedHash.startsWith('pbkdf2_10000$')) {
    const parts = storedHash.split('$');
    if (parts.length === 3) {
      const salt = parts[1];
      const hash = parts[2];
      const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
      const hashBuffer = Buffer.from(hash, 'hex');
      const verifyBuffer = Buffer.from(verifyHash, 'hex');
      if (hashBuffer.length === verifyBuffer.length) {
        return crypto.timingSafeEqual(hashBuffer, verifyBuffer);
      }
      return hash === verifyHash;
    }
  }
  return password === storedHash;
}

const JWT_SECRET = process.env.JWT_SECRET as string;

function base64UrlEncode(str: string | Buffer): string {
  const buf = typeof str === 'string' ? Buffer.from(str) : str;
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString();
}

function signJwt(payload: any): string {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  
  const hmac = crypto.createHmac("sha256", JWT_SECRET);
  hmac.update(`${encodedHeader}.${encodedPayload}`);
  const signature = base64UrlEncode(hmac.digest());
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifyJwt(token: string): any {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    const [encodedHeader, encodedPayload, signaturePart] = parts;
    const hmac = crypto.createHmac("sha256", JWT_SECRET);
    hmac.update(`${encodedHeader}.${encodedPayload}`);
    const verifiedSignature = base64UrlEncode(hmac.digest());
    
    if (signaturePart !== verifiedSignature) return null;
    
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch (err) {
    return null;
  }
}

// Custom Node In-Memory cache fallback for mock mode OTPs
const mockOtps = new Map<string, { otp: string, password: string, displayName: string, phone: string, expiresAt: Date }>();

app.post('/api/auth/send-otp', async (req, res) => {
  const { email, displayName, password, phone } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Generate 6 digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  const hashedPassword = hashPassword(password);

  console.log(`[OTP DEBUG] Generating OTP ${otp} for ${email}`);

  // Save OTP with hashed password
  if (!pool) {
    mockOtps.set(email.toLowerCase(), { otp, password: hashedPassword, displayName, phone, expiresAt });
  } else {
    try {
      await query(
        `INSERT INTO user_otps (email, otp, password, "displayName", phone, "expiresAt")
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email) DO UPDATE 
         SET otp = EXCLUDED.otp, password = EXCLUDED.password, "displayName" = EXCLUDED."displayName", phone = EXCLUDED.phone, "expiresAt" = EXCLUDED."expiresAt"`,
        [email.toLowerCase(), otp, hashedPassword, displayName, phone, expiresAt]
      );
    } catch (err: any) {
      console.error('Failed to store OTP in database:', err);
      return res.status(500).json({ error: 'Server database error while registering OTP' });
    }
  }

  // Send the OTP via email
  const emailConfigured = !!process.env.BREVO_API_KEY || !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

  const subject = `${otp} is your Amadiya Leisure Verification Code`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8F5F2; padding: 40px; border-radius: 20px; max-width: 500px; margin: 40px auto; border: 1px solid #EEEEEE; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <span style="font-family: Georgia, serif; font-size: 24px; font-style: italic; color: #8D7B68; letter-spacing: 0.1em; text-transform: uppercase;">Amadiya Leisure</span>
      </div>
      <h2 style="color: #2D2D2D; font-weight: normal; margin-bottom: 16px; font-size: 18px;">Confirm Your Email Address</h2>
      <p style="font-size: 14px; color: #666666; line-height: 1.6; margin-bottom: 24px;">Hello ${displayName || 'Valued Guest'},</p>
      <p style="font-size: 14px; color: #666666; line-height: 1.6; margin-bottom: 24px;">Thank you for initiating your reservation at Amadiya Leisure. Please enter the verification code below on the signup page to secure your account and confirm your sanctuary booking:</p>
      <div style="background-color: #FFFFFF; font-size: 32px; font-weight: bold; letter-spacing: 0.25em; text-align: center; padding: 20px; border-radius: 12px; margin: 24px 0; color: #8D7B68; border: 1px solid #EAE5E0; box-shadow: inset 0 1px 3px rgba(0,0,0,0.02);">
        ${otp}
      </div>
      <p style="font-size: 12px; color: #999999; text-align: center; margin-top: 24px;">This code expires in 5 minutes.</p>
      <div style="border-top: 1px solid #EAE5E0; padding-top: 20px; margin-top: 30px; text-align: center; font-size: 11px; color: #999999; font-style: italic;">
        &copy; ${new Date().getFullYear()} Amadiya Leisure. Handcrafted Sri Lankan hospitality.
      </div>
    </div>
  `;

  if (emailConfigured) {
    try {
      await sendEmail({ to: email, subject, html });
      console.log(`OTP email successfully sent to ${email}`);
    } catch (mailErr: any) {
      console.error('OTP email sending failed:', mailErr);
    }
  } else {
    console.warn(`Email not configured. OTP EMAIL NOT SENT. [OTP PIN IS: ${otp}]`);
  }

  return res.json({ success: true, message: 'OTP sent successfully' });
});

app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP code are required' });
  }

  let dbOtpRecord: any = null;

  if (!pool) {
    const cached = mockOtps.get(email.toLowerCase());
    if (cached) {
      dbOtpRecord = {
        email: email.toLowerCase(),
        otp: cached.otp,
        password: cached.password,
        displayName: cached.displayName,
        phone: cached.phone,
        expiresAt: cached.expiresAt
      };
    }
  } else {
    try {
      const result = await query(
        'SELECT * FROM user_otps WHERE email = $1',
        [email.toLowerCase()]
      );
      if (result.rows[0]) {
        dbOtpRecord = {
          email: result.rows[0].email,
          otp: result.rows[0].otp,
          password: result.rows[0].password,
          displayName: result.rows[0].displayName,
          phone: result.rows[0].phone,
          expiresAt: new Date(result.rows[0].expiresAt)
        };
      }
    } catch (err) {
      console.error('Database query error on verify OTP:', err);
      return res.status(500).json({ error: 'Database verification failed' });
    }
  }

  if (!dbOtpRecord) {
    return res.status(400).json({ error: 'No verification request found for this email.' });
  }

  if (dbOtpRecord.otp !== otp.trim()) {
    return res.status(400).json({ error: 'Invalid verification code. Please check your email and try again.' });
  }

  if (new Date() > dbOtpRecord.expiresAt) {
    return res.status(400).json({ error: 'This verification code has expired (validity 5 minutes). Please request a new one.' });
  }

  // Clear OTP on success
  if (!pool) {
    mockOtps.delete(email.toLowerCase());
  } else {
    await query('DELETE FROM user_otps WHERE email = $1', [email.toLowerCase()]).catch(() => {});
  }

  // Create our customer in our local customers table on backend verification success
  const customId = 'cust_' + Math.random().toString(36).substring(2, 11);
  const displayName = dbOtpRecord.displayName || email.split('@')[0];
  const phone = dbOtpRecord.phone || '';
  const password = dbOtpRecord.password || '';

  let finalUser: any = null;

  if (!pool) {
    finalUser = {
      id: customId,
      email: email.toLowerCase(),
      displayName: displayName,
      phone: phone,
      createdAt: new Date().toISOString()
    };
  } else {
    try {
      const result = await query(
        `INSERT INTO customers (id, email, "displayName", "password", "phone")
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE 
         SET "displayName" = EXCLUDED."displayName", "password" = EXCLUDED."password", "phone" = EXCLUDED."phone"
         RETURNING *`,
        [customId, email.toLowerCase(), displayName, password, phone]
      );
      const row = result.rows[0];
      finalUser = {
        id: row.id,
        email: row.email,
        displayName: row.displayName,
        phone: row.phone,
        createdAt: row.createdAt
      };
    } catch (err: any) {
      console.error('Failed to save verified user profile to customer DB:', err);
      return res.status(500).json({ error: 'OTP is verified but profile storage failed. Please contact support.' });
    }
  }

  const tokenPayload = {
    id: finalUser.id,
    email: finalUser.email,
    role: 'customer',
    exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
  };
  const token = signJwt(tokenPayload);

  return res.json({
    success: true,
    message: 'OTP verified successfully and user account synchronized.',
    token,
    user: {
      id: finalUser.id,
      email: finalUser.email,
      user_metadata: {
        full_name: finalUser.displayName,
        phone: finalUser.phone
      },
      email_confirmed_at: new Date().toISOString()
    }
  });
});

// Brute force protection state map (persists in-memory during continuous app execution)
const loginBruteForceTracker = new Map<string, { attempts: number, lockoutUntil: number }>();

// Custom customer and admin credentials login endpoint (completely bypassing Supabase unconfirmed emails error)
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const emailKey = email.toLowerCase().trim();
  
  // Rate limits check protecting against brute-force account credential guessing
  const tracker = loginBruteForceTracker.get(emailKey);
  if (tracker && Date.now() < tracker.lockoutUntil) {
    const minutesRemaining = Math.ceil((tracker.lockoutUntil - Date.now()) / 1000 / 60);
    return res.status(429).json({ 
      error: `Too many failed attempts. This account is temporarily locked for security. Please try again in ${minutesRemaining} minutes.` 
    });
  }

  try {
    if (!pool) {
      const tokenPayload = {
        id: 'mock_cust_' + Math.random().toString(36).substring(2, 9),
        email: email.toLowerCase(),
        role: 'customer',
        exp: Math.floor(Date.now() / 1000) + 3600
      };
      const token = signJwt(tokenPayload);

      return res.json({
        success: true,
        token,
        user: {
          id: tokenPayload.id,
          email: email.toLowerCase(),
          user_metadata: {
            full_name: email.split('@')[0],
            phone: ''
          }
        }
      });
    }

    // 1. Try Admin tables first (so staff can authenticate effortlessly)
    const adminResult = await query(
      'SELECT * FROM admins WHERE LOWER(email) = $1',
      [emailKey]
    );

    if (adminResult.rows.length > 0) {
      const admin = adminResult.rows[0];
      
      const isPasswordValid = admin.password
        ? verifyPassword(password, admin.password)
        : password === ADMIN_MASTER_PASSWORD;
      
      if (!isPasswordValid) {
        const attempts = (tracker?.attempts || 0) + 1;
        const lockoutUntil = attempts >= 5 ? Date.now() + 15 * 60 * 1000 : 0;
        loginBruteForceTracker.set(emailKey, { attempts, lockoutUntil });
        return res.status(400).json({ error: 'Incorrect password for admin/staff account. Please try again.' });
      }

      // Success: delete tracking record and authenticate
      loginBruteForceTracker.delete(emailKey);

      const tokenPayload = {
        id: admin.id,
        email: admin.email,
        role: 'admin',
        exp: Math.floor(Date.now() / 1000) + 3600
      };
      const token = signJwt(tokenPayload);

      return res.json({
        success: true,
        token,
        user: {
          id: admin.id,
          email: admin.email,
          user_metadata: {
            full_name: admin.displayName || admin.email.split('@')[0],
            phone: '',
            role: admin.role,
            requiresPasswordChange: admin.requiresPasswordChange || false
          }
        }
      });
    }

    // 2. Try Customer tables next
    const customerResult = await query(
      'SELECT * FROM customers WHERE LOWER(email) = $1',
      [emailKey]
    );

    if (customerResult.rows.length === 0) {
      // Record a failed attempt to prevent brute force harvesting profile check
      const attempts = (tracker?.attempts || 0) + 1;
      const lockoutUntil = attempts >= 5 ? Date.now() + 15 * 60 * 1000 : 0;
      loginBruteForceTracker.set(emailKey, { attempts, lockoutUntil });
      return res.status(400).json({ error: 'No account found with this email address.' });
    }

    const customer = customerResult.rows[0];
    if (!verifyPassword(password, customer.password)) {
      // Increment failed password matching count
      const attempts = (tracker?.attempts || 0) + 1;
      const lockoutUntil = attempts >= 5 ? Date.now() + 15 * 60 * 1000 : 0;
      loginBruteForceTracker.set(emailKey, { attempts, lockoutUntil });
      return res.status(400).json({ error: 'Incorrect password. Please try again.' });
    }

    // Success: delete tracking record and authenticate
    loginBruteForceTracker.delete(emailKey);

    const tokenPayload = {
      id: customer.id,
      email: customer.email,
      role: 'customer',
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    const token = signJwt(tokenPayload);

    return res.json({
      success: true,
      token,
      user: {
        id: customer.id,
        email: customer.email,
        user_metadata: {
          full_name: customer.displayName,
          phone: customer.phone
        }
      }
    });

  } catch (err: any) {
    console.error('Auth login error:', err);
    return res.status(500).json({ error: 'Server authentication database error' });
  }
});

// Custom admin creator / registration endpoint (completely bypassing Supabase Auth)
app.post('/api/auth/signup-admin', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const emailKey = email.toLowerCase().trim();

  // Special check for master admin or authorized staff email on registration
  if (emailKey !== 'jasonlawrene23@gmail.com' && !emailKey.endsWith('@ahsellresorts.com')) {
    return res.status(400).json({ error: 'Only authorized staff emails can register here.' });
  }

  try {
    const adminId = 'admin_' + Math.random().toString(36).substring(2, 11);
    const displayName = emailKey.split('@')[0];
    const hashedPassword = hashPassword(password);

    if (!pool) {
      // Mock-mode registration
      const tokenPayload = {
        id: adminId,
        email: emailKey,
        role: 'admin',
        exp: Math.floor(Date.now() / 1000) + 3600
      };
      const token = signJwt(tokenPayload);

      return res.json({
        success: true,
        token,
        user: {
          id: adminId,
          email: emailKey,
          user_metadata: {
            full_name: displayName,
            phone: ''
          }
        }
      });
    }

    // Check if admin already exists
    const existing = await query('SELECT * FROM admins WHERE LOWER(email) = LOWER($1)', [emailKey]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'An admin account with this email already exists.' });
    }

    // Insert new admin record
    const result = await query(
      `INSERT INTO admins (id, email, role, "displayName", password)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password, "displayName" = EXCLUDED."displayName"
       RETURNING *`,
      [adminId, emailKey, 'admin', displayName, hashedPassword]
    );

    const row = result.rows[0];
    const tokenPayload = {
      id: row.id,
      email: row.email,
      role: row.role,
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    const token = signJwt(tokenPayload);

    return res.json({
      success: true,
      token,
      user: {
        id: row.id,
        email: row.email,
        user_metadata: {
          full_name: row.displayName,
          phone: ''
        }
      }
    });

  } catch (err: any) {
    console.error('Admin signup error:', err);
    return res.status(500).json({ error: 'Server administrator registration error' });
  }
});

// Send 6-digit OTP to invite prospective admin limit check
app.post('/api/auth/send-admin-otp', requireAdmin, async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  const emailKey = email.toLowerCase().trim();

  try {
    if (pool) {
      const existing = await query('SELECT * FROM admins WHERE LOWER(email) = $1', [emailKey]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'An admin/staff member account with this email already exists.' });
      }
    }
  } catch (err: any) {
    console.error('Error checking existing admin:', err);
  }

  // Generate 6 digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // Save OTP in database or mock caching
  if (!pool) {
    mockOtps.set(emailKey, { otp, password: '', displayName: '', phone: '', expiresAt });
  } else {
    try {
      await query(
        `INSERT INTO user_otps (email, otp, password, "displayName", phone, "expiresAt")
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email) DO UPDATE 
         SET otp = EXCLUDED.otp, "expiresAt" = EXCLUDED."expiresAt"`,
        [emailKey, otp, '', '', '', expiresAt]
      );
    } catch (err: any) {
      console.error('Failed to store admin invite OTP in database:', err);
      return res.status(500).json({ error: 'Database storage error while initiating OTP verification' });
    }
  }

  // Send the OTP via email
  const emailConfigured = !!process.env.BREVO_API_KEY || !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

  const subject = `${otp} is your Amadiya Staff Promotion Verification Code`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8F5F2; padding: 40px; border-radius: 20px; max-width: 500px; margin: 40px auto; border: 1px solid #EEEEEE; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <span style="font-family: Georgia, serif; font-size: 24px; font-style: italic; color: #8D7B68; letter-spacing: 0.1em; text-transform: uppercase;">Amadiya Leisure</span>
      </div>
      <h2 style="color: #2D2D2D; font-weight: normal; margin-bottom: 16px; font-size: 18px;">Staff Administration Onboarding</h2>
      <p style="font-size: 14px; color: #666666; line-height: 1.6; margin-bottom: 24px;">Hello,</p>
      <p style="font-size: 14px; color: #666666; line-height: 1.6; margin-bottom: 24px;">You have been invited to join the Amadiya Leisure administration and management team.</p>
      <p style="font-size: 14px; color: #666666; line-height: 1.6; margin-bottom: 24px;">Please provide the following 6-digit confirmation code to the system administrator to verify your email and activate your staff coordinates:</p>
      <div style="background-color: #FFFFFF; font-size: 32px; font-weight: bold; letter-spacing: 0.25em; text-align: center; padding: 20px; border-radius: 12px; margin: 24px 0; color: #8D7B68; border: 1px solid #EAE5E0; box-shadow: inset 0 1px 3px rgba(0,0,0,0.02);">
        ${otp}
      </div>
      <p style="font-size: 12px; color: #999999; text-align: center; margin-top: 24px;">This code is valid for 5 minutes.</p>
      <div style="border-top: 1px solid #EAE5E0; padding-top: 20px; margin-top: 30px; text-align: center; font-size: 11px; color: #999999; font-style: italic;">
        &copy; ${new Date().getFullYear()} Amadiya Leisure. All rights reserved.
      </div>
    </div>
  `;

  if (emailConfigured) {
    try {
      await sendEmail({ to: emailKey, subject, html });
      console.log(`Admin OTP email successfully sent to ${emailKey}`);
    } catch (mailErr: any) {
      console.error('Admin OTP email sending failed:', mailErr);
    }
  } else {
    console.warn(`Email not configured. OTP EMAIL NOT SENT. [OTP PIN IS: ${otp}]`);
  }

  return res.json({ success: true, message: 'OTP sent successfully' });
});

// Verify Admin OTP and automatically generate a Temporary Password for them
app.post('/api/auth/verify-admin-otp', requireAdmin, async (req, res) => {
  const { email, otp, role } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Email and OTP code are required' });
  }
  const emailKey = email.toLowerCase().trim();
  const targetRole = role || 'staff';

  let dbOtpRecord: any = null;

  if (!pool) {
    const cached = mockOtps.get(emailKey);
    if (cached) {
      dbOtpRecord = cached;
    }
  } else {
    try {
      const result = await query(
        'SELECT * FROM user_otps WHERE email = $1',
        [emailKey]
      );
      if (result.rows[0]) {
        dbOtpRecord = {
          otp: result.rows[0].otp,
          expiresAt: new Date(result.rows[0].expiresAt)
        };
      }
    } catch (err) {
      console.error('Database query error on verify admin OTP:', err);
      return res.status(500).json({ error: 'Database verification failed' });
    }
  }

  if (!dbOtpRecord) {
    return res.status(400).json({ error: 'No verification request found for this email.' });
  }

  if (dbOtpRecord.otp !== otp.trim()) {
    return res.status(400).json({ error: 'Invalid verification code. Please check your email and try again.' });
  }

  if (new Date() > dbOtpRecord.expiresAt) {
    return res.status(400).json({ error: 'This verification code has expired (validity 5 minutes). Please request a new one.' });
  }

  // Clear OTP
  if (!pool) {
    mockOtps.delete(emailKey);
  } else {
    await query('DELETE FROM user_otps WHERE email = $1', [emailKey]).catch(() => {});
  }

  // Generate temporary password
  const randomSuffix = Math.floor(100000 + Math.random() * 900000).toString();
  const tempPassword = `Amadiya@Temp${randomSuffix}`;
  const hashedPassword = hashPassword(tempPassword);

  const adminId = 'admin_' + Math.random().toString(36).substring(2, 11);
  const displayName = emailKey.split('@')[0];

  try {
    if (!pool) {
      // Mock-mode registration of admin
      return res.json({
        success: true,
        tempPassword,
        message: 'Admin account created successfully with temporary password.'
      });
    }

    // Insert new admin record with requiresPasswordChange set to true
    await query(
      `INSERT INTO admins (id, email, role, "displayName", password, "requiresPasswordChange")
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO UPDATE 
       SET role = EXCLUDED.role, password = EXCLUDED.password, "requiresPasswordChange" = EXCLUDED."requiresPasswordChange"`,
      [adminId, emailKey, targetRole, displayName, hashedPassword, true]
    );

    return res.json({
      success: true,
      tempPassword,
      message: 'Admin account created successfully with temporary password.'
    });
  } catch (err: any) {
    console.error('Failed to create admin from OTP:', err);
    return res.status(500).json({ error: 'Failed to save admin profile.' });
  }
});

// Update the user's temporary password on first sign in
app.post('/api/auth/change-admin-password', async (req, res) => {
  const { email, currentPassword, newPassword } = req.body;
  if (!email || !currentPassword || !newPassword) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  const emailKey = email.toLowerCase().trim();

  try {
    if (!pool) {
      return res.json({ success: true, message: 'Password changed successfully in mock mode.' });
    }

    const adminResult = await query(
      'SELECT * FROM admins WHERE LOWER(email) = $1',
      [emailKey]
    );

    if (adminResult.rows.length === 0) {
      return res.status(400).json({ error: 'Account not found.' });
    }

    const admin = adminResult.rows[0];
    const isPasswordValid = admin.password
      ? verifyPassword(currentPassword, admin.password)
      : currentPassword === ADMIN_MASTER_PASSWORD;

    if (!isPasswordValid) {
      return res.status(400).json({ error: 'The current temporary password you entered is incorrect.' });
    }

    const newHashedPassword = hashPassword(newPassword);
    await query(
      'UPDATE admins SET password = $1, "requiresPasswordChange" = false WHERE LOWER(email) = $2',
      [newHashedPassword, emailKey]
    );

    res.json({ success: true, message: 'Your password has been updated. You can now access the staff portal.' });
  } catch (err: any) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Server database error' });
  }
});

// ─── Demo Environment Password Gate ─────────────────────────────────────────
// POST /api/demo-auth  — verify password, return a signed JWT
// GET  /api/demo-auth  — verify an existing JWT is still valid
// The ADMIN_MASTER_PASSWORD never leaves the server. The React client only
// ever sees the opaque JWT that it stores in localStorage for 1 hour.

const demoGateBruteForce = new Map<string, { attempts: number; lockoutUntil: number }>();

app.post('/api/demo-auth', (req, res) => {
  // Use the real IP when behind Vercel / a reverse proxy
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';

  const tracker = demoGateBruteForce.get(ip);
  if (tracker && Date.now() < tracker.lockoutUntil) {
    const mins = Math.ceil((tracker.lockoutUntil - Date.now()) / 60000);
    return res.status(429).json({ error: `Too many attempts. Try again in ${mins} minute${mins !== 1 ? 's' : ''}.` });
  }

  const { password } = req.body;
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Password is required.' });
  }

  // Timing-safe comparison — hash both sides with HMAC so lengths always match
  // and no early-exit branching reveals whether characters are correct.
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(ADMIN_MASTER_PASSWORD).digest();
  const submitted = crypto.createHmac('sha256', JWT_SECRET).update(password).digest();
  const isCorrect = crypto.timingSafeEqual(expected, submitted);

  if (!isCorrect) {
    const attempts = (tracker?.attempts || 0) + 1;
    const lockoutUntil = attempts >= 5 ? Date.now() + 15 * 60 * 1000 : 0;
    demoGateBruteForce.set(ip, { attempts, lockoutUntil });
    return res.status(401).json({ error: 'Incorrect password.' });
  }

  demoGateBruteForce.delete(ip);
  const now = Math.floor(Date.now() / 1000);
  const token = signJwt({ role: 'demo', iat: now, exp: now + 3600 });
  return res.json({ token, issuedAt: Date.now() });
});

app.get('/api/demo-auth', (req, res) => {
  const { token } = req.query;
  if (!token || typeof token !== 'string') {
    return res.json({ valid: false });
  }
  const payload = verifyJwt(token);
  return res.json({ valid: payload?.role === 'demo' });
});
// ─────────────────────────────────────────────────────────────────────────────

// Hero media is fetched client-side by <Hero/>, which means a fresh device
// shows the default image until JS loads + the API round-trip completes. To
// kill that flash we inject the current hero media into the HTML on the server
// so the browser knows the real URL on first paint (and can preload it).
const HERO_MEDIA_PARENT_ID = '00000000-0000-4000-8000-000000000001';

// Short in-memory cache so we don't hit the DB on every page load. Admin edits
// still show immediately in-session via <Hero/>'s background re-fetch; this
// only affects the very first paint on a fresh device, so a small TTL is fine.
let _heroCache: { media: any | null; at: number } | null = null;
const HERO_CACHE_TTL_MS = 60_000;

async function getHeroMedia(): Promise<any | null> {
  if (_heroCache && Date.now() - _heroCache.at < HERO_CACHE_TTL_MS) {
    return _heroCache.media;
  }
  try {
    const result = await query(
      'SELECT * FROM media WHERE "parentId" = $1 ORDER BY "order" ASC LIMIT 1',
      [HERO_MEDIA_PARENT_ID],
    );
    const media = result.rows[0] || null;
    _heroCache = { media, at: Date.now() };
    return media;
  } catch {
    // DB unavailable — fall back to the client-side fetch (no injection).
    return null;
  }
}

async function injectHeroMedia(html: string): Promise<string> {
  const media = await getHeroMedia();
  if (!media?.data) return html;

  const isVideo =
    media.data.includes('/video/upload/') ||
    /\.(mp4|webm|mov|m4v|ogv)(\?|$)/i.test(media.data);

  // Escape "<" so the JSON can't break out of the <script> tag.
  const payload = JSON.stringify(media).replace(/</g, '\\u003c');
  const seed = `<script>window.__HERO_MEDIA__=${payload}</script>`;

  // Preload the image so it downloads in parallel with the JS bundle. Videos
  // stream and use a poster frame, so a preload hint isn't worthwhile there.
  const preload = isVideo
    ? ''
    : `<link rel="preload" as="image" href="${media.data.replace(/"/g, '&quot;')}">`;

  return html.replace('</head>', `${preload}${seed}</head>`);
}

// Vite Setup
async function startServer() {
  await initDb();

  // Background Email Worker (ONLY run locally, skip on Vercel)
  if (pool && !process.env.VERCEL) {
    const runWorker = async () => {
      try {
        await processEmailQueue(pool);
      } catch (err) {
        console.error('Email worker error:', err);
      } finally {
        setTimeout(runWorker, 15000); 
      }
    };
    runWorker();
    console.log('Background email worker started (Local Mode)');
  } else if (process.env.VERCEL) {
    console.log('Running on Vercel: Background worker disabled. Emails will process synchronously.');
  }

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.get('*', async (req, res, next) => {
      // Exclude API requests and paths with file extensions
      if (req.originalUrl.startsWith('/api') || req.originalUrl.includes('.')) {
        return next();
      }
      try {
        const url = req.originalUrl;
        const indexHtml = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        const transformed = await vite.transformIndexHtml(url, indexHtml);
        const html = await injectHeroMedia(transformed);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const indexHtmlPath = path.join(distPath, 'index.html');
    app.use(express.static(distPath));
    app.get('*', async (req, res) => {
      try {
        const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
        const html = await injectHeroMedia(indexHtml);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e) {
        // If injection fails for any reason, still serve the app.
        res.sendFile(indexHtmlPath);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  startServer();
}

const _gracefulShutdown = async (signal: string) => {
  console.log(`${signal} received — closing database pool.`);
  if (pool) await pool.end().catch(() => {});
  process.exit(0);
};
process.on('SIGTERM', () => _gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => _gracefulShutdown('SIGINT'));
