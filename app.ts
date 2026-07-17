import express from 'express';
import path from 'path';
import fs from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { promisify } from 'util';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
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
// Railway/Vercel (and most PaaS) sit behind a reverse proxy that forwards the
// original request via X-Forwarded-* headers. Trusting the proxy makes
// req.hostname / req.protocol / req.ip reflect the real client-facing values —
// critical for multi-tenant resolution, which keys off req.hostname (the public
// domain) to map a request to its hotel. Without this, a proxied Host rewrite
// could break per-domain isolation.
// NOTE: this is a hop *count*, not `true`. `true` trusts the entire X-Forwarded-For
// chain, which lets any client prepend a forged entry and become an arbitrary req.ip —
// that would make the IP-keyed rate limiters below trivially bypassable (and
// express-rate-limit refuses to start against a permissive setting). A count means
// Express walks back exactly that many entries from the right, landing on the value
// our own edge wrote, which a client cannot influence.
// Railway's proxy is a single hop. Putting a CDN (e.g. Cloudflare) in front adds one:
// set TRUST_PROXY_HOPS=2 at that point, or req.ip becomes the CDN's IP and every
// visitor shares one rate-limit bucket.
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS) || 1);
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

// Gzip/brotli all responses (HTML, JS, CSS, JSON). The biggest single transfer
// win — the public JS bundle compresses ~70%. compression skips already-tiny
// or pre-compressed payloads automatically.
app.use(compression());

// Body parsing runs before any auth middleware, so the limit here bounds what an
// unauthenticated caller can make this process parse on the event loop. Every
// upload goes browser -> Cloudinary directly (src/lib/cloudinary.ts); the API only
// ever receives the returned URL, so no route needs a large body. 1mb leaves ample
// headroom over the biggest real payload (a few KB of JSON).
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// ---------------------------------------------------------------------------
// Rate limiting
//
// This process is single-threaded, so CPU exhaustion is an availability problem,
// not just a cost one: a saturated event loop stalls *every* concurrent request,
// latency climbs until Railway's edge times them out, and the site is effectively
// down while the process still looks "up". Railway does not health-poll a live
// deployment, so nothing intervenes — it just stays slow. These limiters bound how
// much work an anonymous caller can queue onto that single thread.
//
// Stores are in-memory and therefore PER-PROCESS. That is correct at
// numReplicas: 1 (see railway.json). Raising numReplicas silently multiplies every
// limit here by the replica count, because each replica counts only what it sees —
// moving to multiple replicas means moving these to a shared store (e.g. Redis).
//
// Keys come from clientIp() below, NOT req.ip — see the reasoning there.

// The identity we rate limit and lock out against.
//
// Railway's edge strips any client-supplied X-Forwarded-For and writes the true
// client IP as the LEFTMOST entry, and Railway's own guidance is to use XFF[0] for
// access-control logic because it is stable "regardless of which routing path your
// traffic takes". Their proxy hop count, by contrast, is explicitly NOT a documented
// guarantee — so req.ip (which is derived from the 'trust proxy' hop count) is the
// riskier choice here. If that count is ever wrong, req.ip collapses to a constant
// internal Railway address and EVERY visitor shares a single rate-limit bucket,
// which would take the whole platform down. Keying on XFF[0] fails safe instead:
// the worst case is a limiter that under-counts, not a site-wide outage.
//
// trust proxy is still set (as a hop count) at the top of this file, because
// req.hostname drives multi-tenant resolution and express-rate-limit refuses to run
// against a permissive `true`.
//
// IMPORTANT when Cloudflare goes in front (planned): Cloudflare terminates first, so
// XFF[0] will become a Cloudflare address rather than the visitor. Switch this to
// the CF-Connecting-IP header at the same time, or all traffic will share one bucket.
// Verify against the real deployment before trusting either.
const clientIp = (req: express.Request): string => {
  const xff = req.headers['x-forwarded-for'];
  const first = typeof xff === 'string' ? xff.split(',')[0]?.trim() : undefined;
  return first || req.ip || req.socket.remoteAddress || 'unknown';
};

// Login/credential endpoints: the expensive ones. Each call can trigger a pbkdf2
// (~10-20ms of threadpool work) plus a DB lookup. The existing per-email lockout
// further down only fires after 5 attempts *on a single known account*; it does
// nothing against one IP spraying many different addresses, and its tracker Map
// grows per unique email seen. This bounds that by source instead.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: clientIp,
  // We key on XFF[0] deliberately (see clientIp), so express-rate-limit's check that
  // req.ip agrees with the forwarded chain is not meaningful for us and would only
  // emit noise. The permissive-trust-proxy check stays on.
  validate: { xForwardedForHeader: false },
  // A legitimate user never burns 20 logins in 15 minutes; an attacker needs
  // thousands. Successful logins still count — that keeps the accounting simple
  // and the ceiling is far above real usage.
  message: { error: 'Too many authentication attempts from this address. Please try again later.' },
});

// Everything else under /api. Generous enough to be invisible to real traffic
// (a page load fans out to a handful of these), low enough to stop a scraper
// from pinning the event loop.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: clientIp,
  validate: { xForwardedForHeader: false },
  // Never rate limit the healthcheck. Railway polls railway.json's healthcheckPath
  // at DEPLOY time to decide whether to cut traffic over to a new deployment (it
  // does not poll a live one). A 429 there fails the deploy rather than the request.
  // Note this reads originalUrl, not req.path — Express strips the '/api' mount
  // prefix from req.path inside this middleware, so req.path is '/health' here and
  // an '/api/health' test would never match.
  skip: (req) => req.originalUrl.split('?')[0] === '/api/health',
  message: { error: 'Too many requests. Please slow down.' },
});

// ---------------------------------------------------------------------------
// TEMPORARY diagnostic — safe to delete once client-IP handling is confirmed.
//
// Purpose: clientIp() above keys every rate limit and lockout, and it rests on
// Railway writing the true visitor IP as X-Forwarded-For[0]. Railway's own docs
// contradict each other on this and don't guarantee their proxy hop count, so this
// endpoint reports what the running container actually sees. One request from a
// phone (i.e. off the office network) settles it.
//
// Deliberately registered BEFORE the limiters below: if clientIp() were wrong in the
// way we're worried about, every visitor would collapse into one bucket and the
// limiter could 429 the very endpoint meant to diagnose that.
//
// Disabled unless DIAG_TOKEN is set. Wrong/absent token returns 404, not 403, so the
// route is indistinguishable from one that doesn't exist. Reveals only the caller's
// own request metadata — no DB, no secrets, no other user's data.
if (process.env.DIAG_TOKEN) {
  const diagToken = process.env.DIAG_TOKEN;
  app.get('/api/_diag/client-ip', (req, res) => {
    const provided = req.get('x-diag-token') || '';
    // Compare digests so timingSafeEqual gets equal-length buffers and the check
    // can't be walked character by character.
    const a = crypto.createHash('sha256').update(provided).digest();
    const b = crypto.createHash('sha256').update(diagToken).digest();
    if (!crypto.timingSafeEqual(a, b)) return res.status(404).end();

    res.json({
      // THE ANSWER: this must be your real public IP (check at e.g. ifconfig.me).
      // If it is instead a Railway-internal address (100.x / 10.x) that stays the
      // same from a different network, clientIp() is wrong and every visitor is
      // sharing one rate-limit bucket — revert to req.ip or switch header.
      clientIp_used_for_limits: clientIp(req),

      // Supporting evidence for choosing a different source if the above is wrong.
      req_ip: req.ip,
      req_ips_trusted_chain: req.ips,
      raw_x_forwarded_for: req.headers['x-forwarded-for'] ?? null,
      x_real_ip: req.headers['x-real-ip'] ?? null,
      cf_connecting_ip: req.headers['cf-connecting-ip'] ?? null, // set once Cloudflare fronts this
      socket_remote_address: req.socket.remoteAddress,

      // Multi-tenant resolution keys off hostname, so confirm the proxy setting
      // isn't breaking that either.
      trust_proxy_setting: app.get('trust proxy'),
      req_hostname: req.hostname,
      req_protocol: req.protocol,
    });
  });
}

app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// Database configuration
const dbUrl = process.env.DATABASE_URL;
const isDbConfigured = Boolean(dbUrl && !dbUrl.includes('[YOUR-PASSWORD]'));

if (!isDbConfigured) {
  console.log('⚠️ DATABASE_URL not set. Running in mock mode.');
}

// TLS policy for the database connection.
// Railway's private network (*.railway.internal) and local Postgres speak plain
// TCP with no TLS, whereas external managed Postgres (e.g. Railway's public
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

// In-memory stop-sells for mock mode (mirrors the room_stop_sells table).
const MOCK_STOP_SELLS: { id: string; roomId: string; fromDate: string; toDate: string; reason?: string; createdAt: string }[] = [];

// Half-open overlap between a stay [checkIn, checkOut) and a closure [fromDate, toDate).
const rangesOverlap = (aFrom: string, aTo: string, bFrom: string, bTo: string) => aFrom < bTo && aTo > bFrom;

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
    const err = new Error('Database not configured. Please set DATABASE_URL (your Railway Postgres connection string) in Settings -> Secrets.');
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

// Single source of truth for the "how many units are taken" calculation used by
// the availability endpoint, the calendar, and the booking transaction. Counts
// every non-cancelled booking (incl. pending holds) that overlaps [checkIn, checkOut).
// `dbQuery` may be the pooled `query` helper or a transaction client's query fn.
async function getBookedCount(dbQuery: any, roomId: string, checkIn: string, checkOut: string): Promise<number> {
  // Count bookings for this room OR any room that shares its groupId (villa group blocking).
  // If groupId is NULL the subquery returns only the room itself — identical to the old behaviour.
  const bookingsRes = await dbQuery(
    `SELECT COALESCE(SUM(COALESCE(b."roomCount", 1)), 0) AS booked_count
     FROM bookings b
     WHERE b.status != 'cancelled'
       AND b."checkIn" < $3
       AND b."checkOut" > $2
       AND b."roomId" IN (
         SELECT id FROM rooms
         WHERE id = $1
            OR (
              "groupId" IS NOT NULL
              AND "groupId" = (SELECT "groupId" FROM rooms WHERE id = $1)
            )
       )`,
    [roomId, checkIn, checkOut]
  );
  return parseInt(bookingsRes.rows[0].booked_count);
}

// True when a staff stop-sell closes any night in [checkIn, checkOut) for a room.
// Mirrors getBookedCount's overlap rule so closures and bookings agree.
async function isRoomStopped(dbQuery: any, roomId: string, checkIn: string, checkOut: string): Promise<boolean> {
  const r = await dbQuery(
    `SELECT 1 FROM room_stop_sells WHERE "roomId" = $1 AND "fromDate" < $3 AND "toDate" > $2 LIMIT 1`,
    [roomId, checkIn, checkOut]
  );
  return r.rows.length > 0;
}

// Records that a room's availability changed over a date window so a future
// channel-manager worker can push the delta. Non-fatal — never blocks a booking.
async function enqueueInventorySync(dbQuery: any, roomId: string, fromDate: any, toDate: any): Promise<void> {
  if (!roomId) return;
  try {
    await dbQuery(
      `INSERT INTO inventory_sync_queue ("roomId", "fromDate", "toDate") VALUES ($1, $2, $3)`,
      [roomId, fromDate || null, toDate || null]
    );
  } catch (e: any) {
    console.warn('Failed to enqueue inventory sync (non-fatal):', e?.message);
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
        id TEXT PRIMARY KEY, -- app-generated user UID
        email TEXT UNIQUE NOT NULL,
        "displayName" TEXT,
        "photoURL" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY, -- app-generated user UID
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
      -- Villa group booking: rooms sharing a groupId are mutually exclusive.
      -- Booking any room in the group blocks all others for the same dates.
      ALTER TABLE rooms ADD COLUMN IF NOT EXISTS "groupId" TEXT;
      CREATE INDEX IF NOT EXISTS idx_rooms_group_id ON rooms("groupId") WHERE "groupId" IS NOT NULL;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "roomCount" INTEGER DEFAULT 1;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "paymentSlipUrl" TEXT;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP WITH TIME ZONE;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS "password" TEXT;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS "phone" TEXT;
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS "password" TEXT;
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS "requiresPasswordChange" BOOLEAN DEFAULT false;
      -- Multi-tenant: scope an admin to a single property. NULL = unscoped.
      -- A 'superadmin' role ignores this scope and manages every hotel/tenant.
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS "hotelId" UUID REFERENCES hotels(id) ON DELETE SET NULL;

      -- Channel-manager readiness (additive; dormant until OTA integration).
      -- Existing bookings default to source='direct'; no behavior change today.
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "source" TEXT DEFAULT 'direct';
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "channelId" UUID;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "externalRef" TEXT;
      -- Manual close-out switch: lets staff stop-sell a room independent of bookings.
      ALTER TABLE rooms ADD COLUMN IF NOT EXISTS "manualStopSell" BOOLEAN DEFAULT false;

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

      -- Records that a room's availability changed over a date window so a future
      -- channel-manager sync worker can push the delta. Dormant until integration.
      CREATE TABLE IF NOT EXISTS inventory_sync_queue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "roomId" UUID,
        "fromDate" DATE,
        "toDate" DATE,
        status TEXT DEFAULT 'pending', -- pending, processing, sent, failed
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Staff-applied per-date close-outs (stop-sell). A row closes nights in
      -- [fromDate, toDate) for a room, independent of bookings. Enforced by every
      -- availability path so a closed range cannot be booked.
      CREATE TABLE IF NOT EXISTS room_stop_sells (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "roomId" UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        "fromDate" DATE NOT NULL,
        "toDate" DATE NOT NULL,
        reason TEXT,
        "createdBy" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Seasonal / date-range price overrides (Phase 8 rate management).
      -- When multiple overrides cover the same night, the most recently created wins.
      CREATE TABLE IF NOT EXISTS rate_overrides (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "roomId"  UUID NOT NULL REFERENCES rooms(id)  ON DELETE CASCADE,
        "hotelId" UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
        "fromDate" DATE NOT NULL,
        "toDate"   DATE NOT NULL,
        price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
        label VARCHAR(120),
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CHECK ("toDate" >= "fromDate")
      );
      CREATE INDEX IF NOT EXISTS idx_rate_overrides_room ON rate_overrides ("roomId", "fromDate", "toDate");
      CREATE INDEX IF NOT EXISTS idx_rate_overrides_hotel ON rate_overrides ("hotelId");

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

      -- Multi-tenant: one row per public domain. Maps an incoming Host header to
      -- the hotel it serves and carries that site's branding/contact overrides.
      -- The app resolves the tenant per-request; the frontend reads it via /api/config.
      CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        domain TEXT UNIQUE NOT NULL,            -- e.g. heritageahungalla.com (lowercase, no scheme)
        "hotelId" UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
        name TEXT NOT NULL,                     -- site/brand display name
        "logoUrl" TEXT,                         -- header logo
        "markLogoUrl" TEXT,                     -- compact mark/favicon-style logo
        "primaryColor" TEXT,                    -- theme override; falls back to CSS default
        "accentColor" TEXT,
        phone TEXT,                             -- shown in navbar/footer/contact
        email TEXT,                             -- public contact address
        "emailFrom" TEXT,                       -- outbound sender label; falls back to EMAIL_FROM
        "bankDetails" JSONB,                    -- per-site payment instructions
        "smtpConfig" JSONB,                     -- optional per-site SMTP override
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status) WHERE status = 'pending';
      CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings("userId");
      CREATE INDEX IF NOT EXISTS idx_bookings_room_id ON bookings("roomId");
      CREATE INDEX IF NOT EXISTS idx_rooms_hotel_id ON rooms("hotelId");
      CREATE INDEX IF NOT EXISTS idx_rooms_availability ON rooms("isAvailable") WHERE "isAvailable" = true;
      CREATE INDEX IF NOT EXISTS idx_media_parent_id ON media("parentId");
      CREATE INDEX IF NOT EXISTS idx_admin_logs_createdAt ON admin_logs("createdAt" DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_domain ON tenants(LOWER(domain));
      CREATE INDEX IF NOT EXISTS idx_tenants_hotel_id ON tenants("hotelId");
      CREATE INDEX IF NOT EXISTS idx_admins_hotel_id ON admins("hotelId");
      CREATE INDEX IF NOT EXISTS idx_inventory_sync_status ON inventory_sync_queue(status) WHERE status = 'pending';
      CREATE INDEX IF NOT EXISTS idx_stop_sells_room ON room_stop_sells("roomId");
      -- Idempotency guard for inbound OTA reservations (dormant until integration).
      CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_external ON bookings("channelId", "externalRef") WHERE "externalRef" IS NOT NULL;
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
  // A superadmin is a strict superset of admin, so it passes every admin gate.
  if (!payload || (payload.role !== 'admin' && payload.role !== 'superadmin')) {
    return res.status(403).json({ error: 'Administrator authentication required.' });
  }
  (req as any).admin = payload;
  next();
}

// Gate for cross-property/global operations (managing tenants, hotels, assigning
// admins to properties). Only a 'superadmin' token may pass. Used in Phase 4.
function requireSuperAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const payload = getVerifiedToken(req);
  if (!payload || payload.role !== 'superadmin') {
    return res.status(403).json({ error: 'Super administrator authentication required.' });
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

// Returns the hotelId a property-scoped admin is restricted to, or null for
// superadmins / legacy unscoped admins. Use as a WHERE "hotelId" = $X guard
// on admin routes (after requireAdmin has run and set req.admin).
function getAdminHotelScope(req: express.Request): string | null {
  const admin = (req as any).admin;
  if (!admin || admin.role === 'superadmin' || !admin.hotelId) return null;
  return admin.hotelId as string;
}

// Effective scope for read endpoints (public + admin). Priority:
// 1. Scoped admin JWT (admin with a non-null hotelId and non-superadmin role)
// 2. Tenant resolved from the incoming domain (req.tenant from resolveTenant)
// 3. null — no filter; return all data (demo / superadmin)
function getEffectiveHotelScope(req: express.Request): string | null {
  const token = (req as any).admin || getVerifiedToken(req);
  if (token) {
    if (token.role === 'superadmin') return null;
    if (token.hotelId) return token.hotelId as string;
  }
  const tenant = (req as any).tenant;
  return tenant?.hotelId || null;
}

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

// Phase 2: per-hostname tenant cache (1 min TTL) + resolution middleware.
// In the demo environment the tenants table is empty, so req.tenant is always
// null and every request falls through normally — no behaviour change.
const _tenantCache = new Map<string, { row: any; ts: number }>();
const TENANT_CACHE_TTL = 60_000;

async function resolveTenant(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!pool) { (req as any).tenant = null; return next(); }
  const host = req.hostname.toLowerCase();
  const cached = _tenantCache.get(host);
  if (cached && Date.now() - cached.ts < TENANT_CACHE_TTL) {
    (req as any).tenant = cached.row;
    return next();
  }
  try {
    const r = await query('SELECT * FROM tenants WHERE LOWER(domain) = $1 AND "isActive" = true', [host]);
    const row = r.rows[0] || null;
    _tenantCache.set(host, { row, ts: Date.now() });
    (req as any).tenant = row;
  } catch {
    (req as any).tenant = null;
  }
  next();
}

app.use(resolveTenant);

// Per-domain branding and config for the frontend React app.
// Returns null fields when no tenant matches (demo / single-hotel mode) so the
// frontend can fall back gracefully to its built-in defaults.
app.get('/api/config', async (req, res) => {
  const tenant = (req as any).tenant;
  if (!tenant) {
    return res.json({
      tenant: null, hotelId: null, name: null, logoUrl: null, markLogoUrl: null,
      primaryColor: null, accentColor: null, phone: null, email: null,
      emailFrom: null, bankDetails: null,
    });
  }
  res.json({
    tenant: tenant.id,
    hotelId: tenant.hotelId,
    name: tenant.name,
    logoUrl: tenant.logoUrl || null,
    markLogoUrl: tenant.markLogoUrl || null,
    primaryColor: tenant.primaryColor || null,
    accentColor: tenant.accentColor || null,
    phone: tenant.phone || null,
    email: tenant.email || null,
    emailFrom: tenant.emailFrom || null,
    bankDetails: tenant.bankDetails || null,
  });
});

// Hotels
app.get('/api/hotels', async (req, res) => {
  const forceRefresh = req.query.refresh === 'true';
  const hotelScope = getEffectiveHotelScope(req);
  const now = Date.now();
  // Skip the in-memory cache for scoped requests so scoped admins / tenant
  // domains never accidentally receive another hotel's data from the cache.
  if (!hotelScope && cachedHotels && !forceRefresh && (now - cachedHotelsTime < CACHE_TTL)) {
    return res.json(cachedHotels);
  }
  try {
    const result = hotelScope
      ? await query('SELECT * FROM hotels WHERE id = $1::uuid', [hotelScope])
      : await query('SELECT * FROM hotels ORDER BY "createdAt" DESC');
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
    if (!hotelScope) {
      cachedHotels = hotels;
      cachedHotelsTime = Date.now();
    }
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
    const hotelScope = getAdminHotelScope(req);
    if (hotelScope && hotelScope !== id) {
      return res.status(403).json({ error: 'Access denied: you can only update your assigned hotel.' });
    }
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
    const hotelScope = getAdminHotelScope(req);
    if (hotelScope && hotelScope !== req.params.id) {
      return res.status(403).json({ error: 'Access denied: you can only delete your assigned hotel.' });
    }
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
  const { refresh } = req.query;
  // Effective scope takes priority over the client-supplied ?hotelId= so a
  // scoped admin or tenant domain cannot query another hotel's rooms.
  const hotelScope = getEffectiveHotelScope(req);
  const hotelId = hotelScope || (req.query.hotelId as string | undefined);
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
  const {
    hotelId, name, type, description, price, rating, imageUrl, amenities, maxGuests,
    isAvailable = true, location, quantity
  } = req.body;
  const hotelScope = getAdminHotelScope(req);
  if (hotelScope && hotelScope !== hotelId) {
    return res.status(403).json({ error: 'Access denied: you can only add rooms to your assigned hotel.' });
  }
  if (!pool) {
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
  const hotelScope = getAdminHotelScope(req);
  if (!pool) {
    const { id } = req.params;
    const updates = req.body;
    const room = MOCK_ROOMS.find(r => r.id === id);
    if (!room) return res.status(404).json({ error: 'Mock room not found' });
    if (hotelScope && room.hotelId !== hotelScope) {
      return res.status(403).json({ error: 'Access denied: room does not belong to your assigned hotel.' });
    }
    Object.assign(room, updates);
    return res.json(room);
  }
  try {
    const { id } = req.params;
    const updates = req.body;
    if (hotelScope) {
      const ownerCheck = await query('SELECT "hotelId" FROM rooms WHERE id = $1', [id]);
      if (!ownerCheck.rows[0] || ownerCheck.rows[0].hotelId !== hotelScope) {
        return res.status(403).json({ error: 'Access denied: room does not belong to your assigned hotel.' });
      }
    }
    const ALLOWED_ROOM_FIELDS = new Set(['name', 'type', 'description', 'price', 'rating', 'imageUrl', 'amenities', 'maxGuests', 'isAvailable', 'location', 'quantity', 'manualStopSell']);
    const keys = Object.keys(updates).filter(k => ALLOWED_ROOM_FIELDS.has(k));
    if (keys.length === 0) return res.status(400).json({ error: 'No valid fields to update.' });

    // Guard: never let quantity drop below units already committed on overlapping
    // dates, which would silently oversell. `peak` is the max concurrent booked count.
    if (updates.quantity !== undefined) {
      const newQty = parseInt(updates.quantity);
      const peakRes = await query(
        `SELECT COALESCE(MAX(concurrent), 0) AS peak FROM (
           SELECT b1.id, SUM(COALESCE(b2."roomCount", 1)) AS concurrent
           FROM bookings b1
           JOIN bookings b2 ON b2."roomId" = b1."roomId"
             AND b2.status != 'cancelled'
             AND b2."checkIn" < b1."checkOut"
             AND b2."checkOut" > b1."checkIn"
           WHERE b1."roomId" = $1 AND b1.status != 'cancelled' AND b1."checkOut" > NOW()
           GROUP BY b1.id
         ) sub`,
        [id]
      );
      const peak = parseInt(peakRes.rows[0].peak);
      if (!Number.isNaN(newQty) && newQty < peak) {
        return res.status(409).json({ error: `Cannot reduce quantity to ${newQty}: ${peak} unit(s) are already booked on overlapping dates.` });
      }
    }

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
    const hotelScope = getAdminHotelScope(req);
    const adminInfo = getAdminInfo(req);
    let roomName = 'Accommodation';
    let roomType = 'Room';

    try {
      const rCheck = await query('SELECT name, type, "hotelId" FROM rooms WHERE id = $1', [req.params.id]);
      if (rCheck.rows[0]) {
        if (hotelScope && rCheck.rows[0].hotelId !== hotelScope) {
          return res.status(403).json({ error: 'Access denied: room does not belong to your assigned hotel.' });
        }
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
    
    // A staff stop-sell over these dates closes the room entirely.
    if (MOCK_STOP_SELLS.some(s => s.roomId === id && rangesOverlap(checkIn as string, checkOut as string, s.fromDate, s.toDate))) {
      return res.json({ remainingQuantity: 0 });
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
    const roomRes = await query('SELECT quantity, "manualStopSell" FROM rooms WHERE id = $1', [id]);
    if (!roomRes.rows[0]) {
      return res.status(404).json({ error: 'Room not found' });
    }
    // A manually closed room is unavailable regardless of remaining stock.
    if (roomRes.rows[0].manualStopSell === true) {
      return res.json({ remainingQuantity: 0 });
    }
    // A date-range stop-sell over the requested stay closes the room too.
    if (await isRoomStopped(query, id, checkIn as string, checkOut as string)) {
      return res.json({ remainingQuantity: 0 });
    }
    const totalQty = parseInt(roomRes.rows[0].quantity);
    const bookedCount = await getBookedCount(query, id, checkIn as string, checkOut as string);
    const remainingQuantity = Math.max(0, totalQty - bookedCount);

    res.json({ remainingQuantity });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch availability' });
  }
});

// Per-date availability calendar over a window — the read shape a channel
// manager pulls. Same availability rules as the single-date check above.
app.get('/api/rooms/:id/calendar', async (req, res) => {
  const { id } = req.params;
  const { from, to } = req.query;

  if (!from || !to) {
    return res.status(400).json({ error: 'from and to dates are required' });
  }

  if (!pool) {
    const room = MOCK_ROOMS.find(r => r.id === id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    const days: any[] = [];
    const cur = new Date(from as string);
    const end = new Date(to as string);
    while (cur < end) {
      const nextDay = new Date(cur);
      nextDay.setDate(nextDay.getDate() + 1);
      let booked = 0;
      for (const b of MOCK_BOOKINGS) {
        if (b.roomId === id && b.status !== 'cancelled') {
          if (new Date(b.checkIn) < nextDay && new Date(b.checkOut) > cur) {
            booked += (b.roomCount || 1);
          }
        }
      }
      days.push({ date: cur.toISOString().slice(0, 10), available: Math.max(0, (room.quantity || 1) - booked) });
      cur.setDate(cur.getDate() + 1);
    }
    return res.json(days);
  }

  try {
    const roomRes = await query('SELECT quantity, "manualStopSell" FROM rooms WHERE id = $1', [id]);
    if (!roomRes.rows[0]) {
      return res.status(404).json({ error: 'Room not found' });
    }
    const totalQty = parseInt(roomRes.rows[0].quantity);
    const stopSell = roomRes.rows[0].manualStopSell === true;

    const calRes = await query(
      `SELECT to_char(d, 'YYYY-MM-DD') AS date,
              COALESCE(SUM(CASE WHEN b.id IS NOT NULL THEN COALESCE(b."roomCount", 1) ELSE 0 END), 0) AS booked
       FROM generate_series($2::date, $3::date - interval '1 day', interval '1 day') AS d
       LEFT JOIN bookings b
         ON b."roomId" = $1
         AND b.status != 'cancelled'
         AND b."checkIn" < d + interval '1 day'
         AND b."checkOut" > d
       GROUP BY d
       ORDER BY d`,
      [id, from, to]
    );

    const days = calRes.rows.map((row: any) => ({
      date: row.date,
      available: stopSell ? 0 : Math.max(0, totalQty - parseInt(row.booked)),
    }));
    res.json(days);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch availability calendar' });
  }
});

// Batch availability for the storefront search: remaining units per room for a
// date range, in a single query. Returns a { [roomId]: remainingQuantity } map.
// A manually closed room reports 0. This is what the front-end uses to hide
// rooms that are sold out *for the chosen dates* (not via the dateless flag).
app.get('/api/availability', async (req, res) => {
  const { checkIn, checkOut } = req.query;

  if (!checkIn || !checkOut) {
    return res.status(400).json({ error: 'checkIn and checkOut dates are required' });
  }

  if (!pool) {
    const reqIn = new Date(checkIn as string);
    const reqOut = new Date(checkOut as string);
    const map: Record<string, number> = {};
    for (const room of MOCK_ROOMS) {
      let booked = 0;
      for (const b of MOCK_BOOKINGS) {
        if (b.roomId === room.id && b.status !== 'cancelled') {
          if (new Date(b.checkIn) < reqOut && new Date(b.checkOut) > reqIn) {
            booked += (b.roomCount || 1);
          }
        }
      }
      const stopped = MOCK_STOP_SELLS.some(s => s.roomId === room.id && rangesOverlap(checkIn as string, checkOut as string, s.fromDate, s.toDate));
      map[room.id] = ((room as any).manualStopSell || stopped) ? 0 : Math.max(0, (room.quantity || 1) - booked);
    }
    return res.json(map);
  }

  try {
    // Group-aware batch availability: for rooms that share a groupId, any booking
    // in the group blocks all members. The subquery aggregates by group first, then
    // joins back to individual rooms so that a "Full Villa" booking blocks "Room A"
    // and vice versa, using the same overlap rule as getBookedCount.
    const result = await query(
      `SELECT r.id, r.quantity, r."manualStopSell", COALESCE(gb.booked, 0) AS booked,
              EXISTS (
                SELECT 1 FROM room_stop_sells s
                WHERE s."roomId" = r.id AND s."fromDate" < $2 AND s."toDate" > $1
              ) AS stopped
       FROM rooms r
       LEFT JOIN (
         SELECT r2."groupId", SUM(COALESCE(b."roomCount", 1)) AS booked
         FROM bookings b
         JOIN rooms r2 ON b."roomId" = r2.id
         WHERE b.status != 'cancelled'
           AND b."checkIn" < $2 AND b."checkOut" > $1
           AND r2."groupId" IS NOT NULL
         GROUP BY r2."groupId"
       ) gb ON gb."groupId" = r."groupId" AND r."groupId" IS NOT NULL
       LEFT JOIN (
         SELECT "roomId", SUM(COALESCE("roomCount", 1)) AS booked
         FROM bookings
         WHERE status != 'cancelled' AND "checkIn" < $2 AND "checkOut" > $1
         GROUP BY "roomId"
       ) sb ON sb."roomId" = r.id AND r."groupId" IS NULL`,
      [checkIn, checkOut]
    );
    const map: Record<string, number> = {};
    for (const row of result.rows) {
      const booked = parseInt(row.booked ?? '0');
      map[row.id] = (row.manualStopSell === true || row.stopped === true)
        ? 0
        : Math.max(0, parseInt(row.quantity) - booked);
    }
    res.json(map);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch availability' });
  }
});

// Admin occupancy calendar: per-room, per-night availability over a window.
// Read-only and uses the exact same overlap rule as the storefront availability
// so the two can never disagree. `to` is exclusive. The window is capped to keep
// the rooms × days expansion bounded. Admin/staff only.
app.get('/api/calendar', requireAdmin, async (req, res) => {
  const { from, to, hotelId: _requestedHotelId } = req.query as { from?: string; to?: string; hotelId?: string };
  // Scoped admin overrides the client-supplied ?hotelId= so they can't view
  // another hotel's calendar by passing a different id.
  const hotelId = getAdminHotelScope(req) || _requestedHotelId;

  if (!from || !to) {
    return res.status(400).json({ error: 'from and to dates are required' });
  }

  const fromDate = new Date(from + 'T00:00:00Z');
  const toDate = new Date(to + 'T00:00:00Z');
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime()) || toDate <= fromDate) {
    return res.status(400).json({ error: 'Invalid date range' });
  }
  const MAX_DAYS = 92;
  const dayCount = Math.round((toDate.getTime() - fromDate.getTime()) / 86400000);
  if (dayCount > MAX_DAYS) {
    return res.status(400).json({ error: `Date range too large (max ${MAX_DAYS} days)` });
  }

  if (!pool) {
    const mockRooms = hotelId ? MOCK_ROOMS.filter(r => r.hotelId === hotelId) : MOCK_ROOMS;
    const result = mockRooms.map(room => {
      const days: any[] = [];
      const cur = new Date(fromDate);
      while (cur < toDate) {
        const nextDay = new Date(cur);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        let booked = 0;
        for (const b of MOCK_BOOKINGS) {
          if (b.roomId === room.id && b.status !== 'cancelled') {
            if (new Date(b.checkIn) < nextDay && new Date(b.checkOut) > cur) {
              booked += (b.roomCount || 1);
            }
          }
        }
        const total = room.quantity || 1;
        const stopSell = (room as any).manualStopSell === true;
        const dateStr = cur.toISOString().slice(0, 10);
        const nightStopped = MOCK_STOP_SELLS.some(s => s.roomId === room.id && s.fromDate <= dateStr && s.toDate > dateStr);
        days.push({
          date: dateStr,
          booked,
          available: (stopSell || nightStopped) ? 0 : Math.max(0, total - booked),
          stopped: nightStopped,
        });
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
      return {
        roomId: room.id,
        name: room.name,
        hotelId: room.hotelId,
        quantity: room.quantity || 1,
        manualStopSell: (room as any).manualStopSell === true,
        days,
      };
    });
    return res.json(result);
  }

  try {
    const calRes = await query(
      `SELECT r.id AS "roomId", r.name, r."hotelId", r.quantity, r."manualStopSell",
              to_char(d, 'YYYY-MM-DD') AS date,
              COALESCE(SUM(CASE WHEN b.id IS NOT NULL THEN COALESCE(b."roomCount", 1) ELSE 0 END), 0) AS booked
       FROM rooms r
       CROSS JOIN generate_series($1::date, $2::date - interval '1 day', interval '1 day') AS d
       LEFT JOIN bookings b
         ON b."roomId" = r.id
         AND b.status != 'cancelled'
         AND b."checkIn" < d + interval '1 day'
         AND b."checkOut" > d
       WHERE ($3::uuid IS NULL OR r."hotelId" = $3::uuid)
       GROUP BY r.id, r.name, r."hotelId", r.quantity, r."manualStopSell", d
       ORDER BY r.name, d`,
      [from, to, hotelId || null]
    );

    const byRoom = new Map<string, any>();
    for (const row of calRes.rows) {
      let entry = byRoom.get(row.roomId);
      if (!entry) {
        entry = {
          roomId: row.roomId,
          name: row.name,
          hotelId: row.hotelId,
          quantity: parseInt(row.quantity),
          manualStopSell: row.manualStopSell === true,
          days: [],
        };
        byRoom.set(row.roomId, entry);
      }
      const booked = parseInt(row.booked);
      entry.days.push({
        date: row.date,
        booked,
        available: entry.manualStopSell ? 0 : Math.max(0, entry.quantity - booked),
        stopped: false,
      });
    }

    // Overlay staff stop-sells: close the affected nights for each room.
    const stopRes = await query(
      `SELECT s."roomId",
              to_char(s."fromDate", 'YYYY-MM-DD') AS "fromDate",
              to_char(s."toDate", 'YYYY-MM-DD') AS "toDate"
       FROM room_stop_sells s
       JOIN rooms r ON r.id = s."roomId"
       WHERE s."fromDate" < $2::date AND s."toDate" > $1::date
         AND ($3::uuid IS NULL OR r."hotelId" = $3::uuid)`,
      [from, to, hotelId || null]
    );
    for (const s of stopRes.rows) {
      const entry = byRoom.get(s.roomId);
      if (!entry) continue;
      for (const day of entry.days) {
        if (day.date >= s.fromDate && day.date < s.toDate) {
          day.stopped = true;
          day.available = 0;
        }
      }
    }

    res.json(Array.from(byRoom.values()));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch calendar' });
  }
});

// --- Stop-sell management: per-date room close-outs (admin/staff) ---

// List the stop-sells configured for a room.
app.get('/api/rooms/:id/stop-sells', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!pool) {
    return res.json(MOCK_STOP_SELLS.filter(s => s.roomId === id));
  }
  try {
    const result = await query(
      `SELECT id, "roomId",
              to_char("fromDate", 'YYYY-MM-DD') AS "fromDate",
              to_char("toDate", 'YYYY-MM-DD') AS "toDate",
              reason, "createdAt"
       FROM room_stop_sells WHERE "roomId" = $1 ORDER BY "fromDate"`,
      [id]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch stop-sells' });
  }
});

// Create a stop-sell (close a date range for a room). `toDate` is exclusive.
app.post('/api/stop-sells', requireAdmin, async (req, res) => {
  const { roomId, fromDate, toDate, reason } = req.body || {};
  if (!roomId || !fromDate || !toDate) {
    return res.status(400).json({ error: 'roomId, fromDate and toDate are required' });
  }
  const f = new Date(fromDate + 'T00:00:00Z');
  const t = new Date(toDate + 'T00:00:00Z');
  if (isNaN(f.getTime()) || isNaN(t.getTime()) || t <= f) {
    return res.status(400).json({ error: 'Invalid date range: the end date must be after the start date.' });
  }

  if (!pool) {
    const room = MOCK_ROOMS.find(r => r.id === roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    const row = {
      id: 's_' + Math.random().toString(36).slice(2, 11),
      roomId, fromDate, toDate,
      reason: reason || undefined,
      createdAt: new Date().toISOString(),
    };
    MOCK_STOP_SELLS.push(row);
    return res.json(row);
  }

  try {
    const roomCheck = await query('SELECT id FROM rooms WHERE id = $1', [roomId]);
    if (!roomCheck.rows[0]) return res.status(404).json({ error: 'Room not found' });

    const adminInfo = getAdminInfo(req);
    const result = await query(
      `INSERT INTO room_stop_sells ("roomId", "fromDate", "toDate", reason, "createdBy")
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, "roomId",
                 to_char("fromDate", 'YYYY-MM-DD') AS "fromDate",
                 to_char("toDate", 'YYYY-MM-DD') AS "toDate",
                 reason, "createdAt"`,
      [roomId, fromDate, toDate, reason || null, adminInfo.email]
    );
    await enqueueInventorySync(query, roomId, fromDate, toDate);
    await logAdminAction(query, adminInfo, 'STOP_SELL', roomId, `${fromDate} → ${toDate}`, reason || '');
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create stop-sell' });
  }
});

// Remove a stop-sell (re-open the dates).
app.delete('/api/stop-sells/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!pool) {
    const idx = MOCK_STOP_SELLS.findIndex(s => s.id === id);
    if (idx >= 0) MOCK_STOP_SELLS.splice(idx, 1);
    return res.sendStatus(204);
  }
  try {
    const result = await query(
      `DELETE FROM room_stop_sells WHERE id = $1
       RETURNING "roomId",
                 to_char("fromDate", 'YYYY-MM-DD') AS "fromDate",
                 to_char("toDate", 'YYYY-MM-DD') AS "toDate"`,
      [id]
    );
    if (result.rows[0]) {
      const row = result.rows[0];
      await enqueueInventorySync(query, row.roomId, row.fromDate, row.toDate);
      await logAdminAction(query, getAdminInfo(req), 'OPEN_SELL', row.roomId, `${row.fromDate} → ${row.toDate}`, '');
    }
    res.sendStatus(204);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete stop-sell' });
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
      if (!payload || (payload.role !== 'admin' && payload.role !== 'superadmin')) {
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

// Server-side paginated + filtered bookings list for the admin panel. Keeps the
// browser from ever loading the full bookings table. Returns { items, total }.
// Scope encodes the active/past split; status/hotelId/search/from/to are optional.
app.get('/api/admin/bookings', requireAdmin, async (req, res) => {
  const scope = (req.query.scope as string) === 'past' ? 'past' : 'active';
  const status = req.query.status as string | undefined;
  // Scoped admin: ignore the client's ?hotelId= and force their assigned hotel.
  const hotelId = getAdminHotelScope(req) || (req.query.hotelId as string | undefined);
  const search = ((req.query.search as string) || '').trim();
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 10));
  const offset = (page - 1) * pageSize;

  if (!pool) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const term = search.toLowerCase();
    let filtered = MOCK_BOOKINGS.filter(b => {
      const isPast = new Date(b.checkOut) < today;
      const cancelled = b.status === 'cancelled';
      if (scope === 'past' ? !(cancelled || isPast) : (cancelled || isPast)) return false;
      if (status && status !== 'all' && b.status !== status) return false;
      if (hotelId && hotelId !== 'all' && b.hotelId !== hotelId) return false;
      if (from && new Date(b.checkIn) < new Date(from + 'T00:00:00')) return false;
      if (to) { const t = new Date(to + 'T00:00:00'); t.setDate(t.getDate() + 1); if (new Date(b.checkIn) >= t) return false; }
      if (term) {
        const room = MOCK_ROOMS.find(r => r.id === b.roomId);
        const hotel = MOCK_HOTELS.find(h => h.id === b.hotelId);
        const hay = [b.fullName, b.email, b.phone, b.id, (b as any).specialRequests, b.status, room?.name, hotel?.name]
          .map(x => (x || '').toString().toLowerCase());
        if (!hay.some(x => x.includes(term))) return false;
      }
      return true;
    });
    filtered = filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return res.json({ items: filtered.slice(offset, offset + pageSize), total: filtered.length, page, pageSize });
  }

  try {
    const conds: string[] = [];
    const params: any[] = [];
    let i = 1;

    conds.push(scope === 'past'
      ? `(b.status = 'cancelled' OR b."checkOut" < CURRENT_DATE)`
      : `(b.status != 'cancelled' AND b."checkOut" >= CURRENT_DATE)`);

    if (status && status !== 'all') { conds.push(`b.status = $${i++}`); params.push(status); }
    if (hotelId && hotelId !== 'all') { conds.push(`b."hotelId" = $${i++}::uuid`); params.push(hotelId); }
    if (from) { conds.push(`b."checkIn" >= $${i++}::date`); params.push(from); }
    if (to) { conds.push(`b."checkIn" < ($${i++}::date + interval '1 day')`); params.push(to); }
    if (search) {
      conds.push(`(b."fullName" ILIKE $${i} OR b.email ILIKE $${i} OR COALESCE(b.phone,'') ILIKE $${i}
                   OR b.id::text ILIKE $${i} OR COALESCE(b."specialRequests",'') ILIKE $${i}
                   OR b.status ILIKE $${i} OR COALESCE(r.name,'') ILIKE $${i} OR COALESCE(h.name,'') ILIKE $${i})`);
      params.push(`%${search}%`);
      i++;
    }

    const where = `WHERE ${conds.join(' AND ')}`;
    const joins = `LEFT JOIN rooms r ON r.id = b."roomId" LEFT JOIN hotels h ON h.id = b."hotelId"`;

    const countRes = await query(`SELECT COUNT(*) AS total FROM bookings b ${joins} ${where}`, params);
    const total = parseInt(countRes.rows[0].total);

    const itemsRes = await query(
      `SELECT b.* FROM bookings b ${joins} ${where} ORDER BY b."createdAt" DESC LIMIT $${i++} OFFSET $${i++}`,
      [...params, pageSize, offset]
    );
    res.json({ items: itemsRes.rows, total, page, pageSize });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch bookings' });
  }
});

// Lightweight counts for the sidebar badges — avoids loading rows just to count.
app.get('/api/admin/bookings/stats', requireAdmin, async (req, res) => {
  const hotelScope = getAdminHotelScope(req);
  if (!pool) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let active = 0, past = 0;
    for (const b of MOCK_BOOKINGS) {
      if (hotelScope && b.hotelId !== hotelScope) continue;
      const isPast = new Date(b.checkOut) < today;
      (b.status === 'cancelled' || isPast) ? past++ : active++;
    }
    return res.json({ active, past });
  }
  try {
    const r = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status != 'cancelled' AND "checkOut" >= CURRENT_DATE) AS active,
         COUNT(*) FILTER (WHERE status = 'cancelled' OR "checkOut" < CURRENT_DATE) AS past
       FROM bookings
       WHERE ($1::uuid IS NULL OR "hotelId" = $1::uuid)`,
      [hotelScope]
    );
    res.json({ active: parseInt(r.rows[0].active), past: parseInt(r.rows[0].past) });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch booking stats' });
  }
});

// Active bookings awaiting staff action (pending / payment_review) for the
// "new booking" alerts banner. Bounded so it scales.
app.get('/api/admin/bookings/alerts', requireAdmin, async (req, res) => {
  const hotelScope = getAdminHotelScope(req);
  if (!pool) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const items = MOCK_BOOKINGS
      .filter(b => (b.status === 'pending' || b.status === 'payment_review')
        && new Date(b.checkOut) >= today
        && (!hotelScope || b.hotelId === hotelScope))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50);
    return res.json(items);
  }
  try {
    const r = await query(
      `SELECT * FROM bookings
       WHERE status IN ('pending', 'payment_review') AND "checkOut" >= CURRENT_DATE
         AND ($1::uuid IS NULL OR "hotelId" = $1::uuid)
       ORDER BY "createdAt" DESC LIMIT 50`,
      [hotelScope]
    );
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch booking alerts' });
  }
});

// ── Today dashboard (Phase 6) ─────────────────────────────────────────────────
// Returns arrivals, departures, in-house guests, and pending-action bookings
// for the current calendar day, scoped to the admin's property if applicable.
app.get('/api/admin/today', requireAdmin, async (req, res) => {
  const hotelScope = getAdminHotelScope(req);
  const today = new Date().toISOString().split('T')[0];

  if (!pool) {
    const confirmed = MOCK_BOOKINGS.filter((b: any) =>
      b.status === 'confirmed' && (!hotelScope || b.hotelId === hotelScope)
    );
    return res.json({
      date: today,
      arrivals:    confirmed.filter((b: any) => (b.checkIn  || '').startsWith(today)),
      departures:  confirmed.filter((b: any) => (b.checkOut || '').startsWith(today)),
      inHouse:     confirmed.filter((b: any) => b.checkIn < today && b.checkOut > today),
      pendingActions: MOCK_BOOKINGS.filter((b: any) =>
        ['pending', 'payment_review'].includes(b.status) &&
        b.checkIn >= today &&
        (!hotelScope || b.hotelId === hotelScope)
      ).slice(0, 20),
    });
  }

  try {
    // Shared JOIN + scope filter reused across all four queries.
    const base = `
      SELECT b.id, b."fullName", b.email, b.phone,
             b."checkIn", b."checkOut", b.guests, b."roomCount",
             b.status, b."specialRequests", b."createdAt",
             r.name AS "roomName", h.name AS "hotelName"
      FROM bookings b
      JOIN rooms r ON b."roomId" = r.id
      JOIN hotels h ON b."hotelId" = h.id
      WHERE ($1::uuid IS NULL OR b."hotelId" = $1::uuid)
    `;
    const p = [hotelScope];

    const [arr, dep, inh, pend] = await Promise.all([
      query(`${base} AND b.status = 'confirmed'
             AND DATE(b."checkIn")  = CURRENT_DATE
             ORDER BY b."checkIn"  ASC`, p),
      query(`${base} AND b.status = 'confirmed'
             AND DATE(b."checkOut") = CURRENT_DATE
             ORDER BY b."checkOut" ASC`, p),
      // In-house: arrived before today, checking out after today (staying over)
      query(`${base} AND b.status = 'confirmed'
             AND DATE(b."checkIn")  < CURRENT_DATE
             AND DATE(b."checkOut") > CURRENT_DATE
             ORDER BY b."checkOut" ASC`, p),
      query(`${base} AND b.status IN ('pending', 'payment_review')
             AND b."checkIn" >= CURRENT_DATE
             ORDER BY b."checkIn" ASC LIMIT 20`, p),
    ]);

    res.json({
      date: today,
      arrivals:       arr.rows,
      departures:     dep.rows,
      inHouse:        inh.rows,
      pendingActions: pend.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Guest directory (Phase 7) ─────────────────────────────────────────────────
// Deduplicated guest list grouped by email, with stay stats and search.
app.get('/api/admin/guests', requireAdmin, async (req, res) => {
  const hotelScope = getAdminHotelScope(req);
  const { search, hotelId, page = '1', pageSize = '20' } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const size    = Math.min(50, Math.max(1, parseInt(pageSize) || 20));
  const offset  = (pageNum - 1) * size;
  // Admin JWT scope beats query-param filter
  const effectiveHotel = hotelScope ?? (hotelId && hotelId !== 'all' ? hotelId : null);

  if (!pool) {
    const grouped: Record<string, any> = {};
    for (const b of MOCK_BOOKINGS as any[]) {
      if (effectiveHotel && b.hotelId !== effectiveHotel) continue;
      const key = (b.email || '').toLowerCase();
      if (!key) continue;
      if (!grouped[key]) grouped[key] = { email: key, fullName: b.fullName, phone: b.phone, bookings: [], inHouseNow: false };
      grouped[key].bookings.push(b);
      const now = new Date();
      if (b.status === 'confirmed' && new Date(b.checkIn) <= now && new Date(b.checkOut) > now)
        grouped[key].inHouseNow = true;
    }
    let items = Object.values(grouped).map((g: any) => ({
      email: g.email, fullName: g.fullName, phone: g.phone, inHouseNow: g.inHouseNow,
      totalBookings: g.bookings.length,
      confirmedBookings: g.bookings.filter((b: any) => b.status === 'confirmed').length,
      totalNights: g.bookings.filter((b: any) => b.status === 'confirmed').reduce((sum: number, b: any) => {
        return sum + Math.max(0, Math.round((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / 86400000));
      }, 0),
      firstSeen: g.bookings.map((b: any) => b.createdAt).sort()[0],
      lastCheckIn: g.bookings.map((b: any) => b.checkIn).sort().at(-1),
      hotels: [...new Set(g.bookings.map((b: any) => b.hotelId))],
    }));
    if (search) {
      const s = search.toLowerCase();
      items = items.filter((g: any) =>
        g.fullName?.toLowerCase().includes(s) || g.email.includes(s) || g.phone?.includes(s)
      );
    }
    items.sort((a: any, b: any) => new Date(b.firstSeen).getTime() - new Date(a.firstSeen).getTime());
    return res.json({ items: items.slice(offset, offset + size), total: items.length, page: pageNum, pageSize: size });
  }

  try {
    const params: any[] = [effectiveHotel];
    let searchClause = '';
    if (search?.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      const n = params.length;
      searchClause = `AND (LOWER(b."fullName") LIKE $${n} OR LOWER(b.email) LIKE $${n} OR b.phone LIKE $${n})`;
    }

    const whereClause = `
      FROM bookings b
      LEFT JOIN hotels h ON b."hotelId" = h.id
      WHERE ($1::uuid IS NULL OR b."hotelId" = $1::uuid)
      ${searchClause}
    `;

    const [countRes, dataRes] = await Promise.all([
      query(`SELECT COUNT(DISTINCT LOWER(b.email)) AS total ${whereClause}`, params),
      query(
        `SELECT
           LOWER(b.email) AS email,
           (ARRAY_AGG(b."fullName" ORDER BY b."createdAt" DESC))[1] AS "fullName",
           (ARRAY_AGG(b.phone ORDER BY b."createdAt" DESC)
             FILTER (WHERE b.phone IS NOT NULL AND b.phone != ''))[1] AS phone,
           COUNT(*)::int AS "totalBookings",
           SUM(CASE WHEN b.status = 'confirmed' THEN 1 ELSE 0 END)::int AS "confirmedBookings",
           SUM(CASE WHEN b.status = 'confirmed'
             THEN GREATEST(0, EXTRACT(EPOCH FROM
               (b."checkOut"::timestamptz - b."checkIn"::timestamptz)) / 86400)
             ELSE 0 END)::int AS "totalNights",
           MIN(b."createdAt") AS "firstSeen",
           MAX(b."checkIn") AS "lastCheckIn",
           BOOL_OR(b.status = 'confirmed'
             AND b."checkIn" <= NOW() AND b."checkOut" > NOW()) AS "inHouseNow",
           ARRAY_AGG(DISTINCT h.name) FILTER (WHERE h.name IS NOT NULL) AS hotels
         ${whereClause}
         GROUP BY LOWER(b.email)
         ORDER BY MAX(b."createdAt") DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, size, offset]
      ),
    ]);

    res.json({
      items: dataRes.rows,
      total: parseInt(countRes.rows[0]?.total || '0'),
      page: pageNum,
      pageSize: size,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Full booking history for a single guest email (used by guest detail modal).
app.get('/api/admin/guests/:email/bookings', requireAdmin, async (req, res) => {
  const hotelScope = getAdminHotelScope(req);
  const email = decodeURIComponent(req.params.email).toLowerCase();

  if (!pool) {
    return res.json(
      (MOCK_BOOKINGS as any[])
        .filter(b => (b.email || '').toLowerCase() === email &&
          (!hotelScope || b.hotelId === hotelScope))
        .sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime())
    );
  }

  try {
    const r = await query(
      `SELECT b.*, r.name AS "roomName", h.name AS "hotelName"
       FROM bookings b
       JOIN rooms r ON b."roomId" = r.id
       JOIN hotels h ON b."hotelId" = h.id
       WHERE LOWER(b.email) = $1
         AND ($2::uuid IS NULL OR b."hotelId" = $2::uuid)
       ORDER BY b."checkIn" DESC`,
      [email, hotelScope]
    );
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Rate overrides / seasonal pricing (Phase 8) ───────────────────────────────
app.get('/api/admin/rate-overrides', requireAdmin, async (req, res) => {
  const hotelScope = getAdminHotelScope(req);
  const { roomId, hotelId } = req.query as Record<string, string>;
  const effectiveHotel = hotelScope ?? (hotelId && hotelId !== 'all' ? hotelId : null);

  if (!pool) return res.json([]);

  try {
    const r = await query(
      `SELECT ro.*, rm.name AS "roomName", h.name AS "hotelName"
       FROM rate_overrides ro
       JOIN rooms rm ON ro."roomId" = rm.id
       JOIN hotels h  ON ro."hotelId" = h.id
       WHERE ($1::uuid IS NULL OR ro."hotelId" = $1::uuid)
         AND ($2::uuid IS NULL OR ro."roomId"  = $2::uuid)
       ORDER BY ro."fromDate" ASC, ro."createdAt" DESC`,
      [effectiveHotel, roomId || null]
    );
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/rate-overrides', requireAdmin, async (req, res) => {
  const hotelScope = getAdminHotelScope(req);
  const { roomId, hotelId, fromDate, toDate, price, label } = req.body;

  if (!roomId || !fromDate || !toDate || price == null)
    return res.status(400).json({ error: 'roomId, fromDate, toDate, and price are required.' });
  if (new Date(toDate) < new Date(fromDate))
    return res.status(400).json({ error: 'toDate must be on or after fromDate.' });

  const effectiveHotel = hotelScope ?? hotelId;
  if (!effectiveHotel) return res.status(400).json({ error: 'hotelId is required.' });

  if (!pool) return res.status(201).json({ id: 'mock-rate', roomId, hotelId: effectiveHotel, fromDate, toDate, price, label });

  try {
    const roomCheck = await query(
      `SELECT id FROM rooms WHERE id = $1 AND "hotelId" = $2`, [roomId, effectiveHotel]
    );
    if (roomCheck.rows.length === 0)
      return res.status(403).json({ error: 'Room not found in your property.' });

    const r = await query(
      `INSERT INTO rate_overrides ("roomId", "hotelId", "fromDate", "toDate", price, label)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [roomId, effectiveHotel, fromDate, toDate, Number(price), label?.trim() || null]
    );
    const adminInfo = getAdminInfo(req);
    await logAdminAction(query, adminInfo, 'CREATE_RATE_OVERRIDE', r.rows[0].id, label?.trim() || 'Rate Override',
      `Created rate override of LKR ${Number(price)} for room ${roomId} (${fromDate} → ${toDate})`);
    res.status(201).json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/rate-overrides/:id', requireAdmin, async (req, res) => {
  const hotelScope = getAdminHotelScope(req);
  const { id } = req.params;
  const { fromDate, toDate, price, label } = req.body;

  if (!pool) return res.json({ id });

  try {
    const check = await query(`SELECT "hotelId" FROM rate_overrides WHERE id = $1`, [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Rate override not found.' });
    if (hotelScope && check.rows[0].hotelId !== hotelScope)
      return res.status(403).json({ error: 'Access denied.' });

    const ALLOWED = { fromDate, toDate, price: price != null ? Number(price) : undefined, label: label !== undefined ? (label?.trim() || null) : undefined };
    const entries = Object.entries(ALLOWED).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return res.status(400).json({ error: 'No fields to update.' });

    const setClauses = entries.map(([k], i) => `"${k}" = $${i + 2}`).join(', ');
    const r = await query(
      `UPDATE rate_overrides SET ${setClauses} WHERE id = $1 RETURNING *`,
      [id, ...entries.map(([, v]) => v)]
    );
    const adminInfo = getAdminInfo(req);
    await logAdminAction(query, adminInfo, 'UPDATE_RATE_OVERRIDE', id, 'Rate Override',
      `Updated rate override ${id}: ${entries.map(([k, v]) => `${k}=${v}`).join(', ')}`);
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/rate-overrides/:id', requireAdmin, async (req, res) => {
  const hotelScope = getAdminHotelScope(req);
  const { id } = req.params;

  if (!pool) return res.status(204).send();

  try {
    const check = await query(`SELECT "hotelId" FROM rate_overrides WHERE id = $1`, [id]);
    if (check.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    if (hotelScope && check.rows[0].hotelId !== hotelScope)
      return res.status(403).json({ error: 'Access denied.' });

    await query(`DELETE FROM rate_overrides WHERE id = $1`, [id]);
    const adminInfo = getAdminInfo(req);
    await logAdminAction(query, adminInfo, 'DELETE_RATE_OVERRIDE', id, 'Rate Override', `Deleted rate override ${id}`);
    res.status(204).send();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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

    // A staff stop-sell over these dates blocks the booking.
    if (MOCK_STOP_SELLS.some(s => s.roomId === roomId && rangesOverlap(checkIn as string, checkOut as string, s.fromDate, s.toDate))) {
      return res.status(409).json({ error: 'This accommodation is closed for the selected dates.' });
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
      'SELECT quantity, name, "imageUrl", price, "manualStopSell" FROM rooms WHERE id = $1 FOR UPDATE',
      [roomId]
    );

    if (!roomCheck.rows[0]) {
      throw new Error('Accommodation not found');
    }

    // A manually closed room cannot be booked, even if stock remains.
    if (roomCheck.rows[0].manualStopSell === true) {
      throw new Error('This accommodation is currently not available for booking.');
    }

    // A date-range stop-sell over the requested stay blocks the booking.
    if (await isRoomStopped(client.query.bind(client), roomId, checkIn, checkOut)) {
      throw new Error('This accommodation is closed for the selected dates.');
    }

    const totalQty = parseInt(roomCheck.rows[0].quantity);

    // Booked count for this room category over the overlapping interval.
    const bookedCount = await getBookedCount(client.query.bind(client), roomId, checkIn, checkOut);
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

    // Availability for this room/date-range changed — record it for future OTA sync.
    await enqueueInventorySync(client.query.bind(client), roomId, checkIn, checkOut);

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
      hotelName: hotelResult.rows[0]?.name || (req as any).tenant?.name || 'Resort',
      roomName: roomCheck.rows[0].name,
      roomImageUrl: roomImageUrl,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      guests: booking.guests,
      specialRequests: booking.specialRequests,
      placedAt: booking.createdAt,
      price: roomCheck.rows[0].price ? Number(roomCheck.rows[0].price) : undefined,
      roomCount: booking.roomCount || 1
    }, (req as any).tenant || {});

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

// ── Admin-created bookings (Phase 5) ─────────────────────────────────────────
// Staff can create bookings on behalf of guests (walk-ins, phone bookings, etc.).
// Unlike the public POST /api/bookings, this endpoint:
//   - Requires an admin JWT
//   - Allows status='confirmed' without a payment slip (cash / card in person)
//   - Stamps paidAt automatically for confirmed bookings
//   - Logs the creation in admin_logs
//   - Sends a confirmation email only when sendEmail=true (default false)
app.post('/api/admin/bookings', requireAdmin, async (req, res) => {
  const {
    roomId, hotelId, fullName, email, phone,
    checkIn, checkOut, guests = 2, specialRequests,
    status = 'pending', roomCount = 1, sendEmail = false,
  } = req.body;
  const requestedRoomCount = parseInt(roomCount) || 1;

  if (!roomId || !hotelId || !fullName || !email || !checkIn || !checkOut) {
    return res.status(400).json({ error: 'roomId, hotelId, fullName, email, checkIn, and checkOut are required.' });
  }

  if (!pool) {
    const newBooking: any = {
      id: 'b_' + Math.random().toString(36).substring(2, 11),
      roomId, hotelId, fullName, email, phone: phone || null, checkIn, checkOut,
      guests: Number(guests) || 2, specialRequests: specialRequests || null,
      status, roomCount: requestedRoomCount,
      paidAt: status === 'confirmed' ? new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
    };
    MOCK_BOOKINGS.push(newBooking);
    return res.status(201).json(newBooking);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const roomCheck = await client.query(
      'SELECT quantity, name, "imageUrl", price, "manualStopSell" FROM rooms WHERE id = $1 FOR UPDATE',
      [roomId]
    );
    if (!roomCheck.rows[0]) throw new Error('Room not found.');
    if (roomCheck.rows[0].manualStopSell) throw new Error('This room is not currently available for booking.');

    if (await isRoomStopped(client.query.bind(client), roomId, checkIn, checkOut)) {
      throw new Error('This room has a stop-sell applied for the requested dates.');
    }

    const totalQty = parseInt(roomCheck.rows[0].quantity);
    const bookedCount = await getBookedCount(client.query.bind(client), roomId, checkIn, checkOut);
    const remaining = Math.max(0, totalQty - bookedCount);
    if (requestedRoomCount > remaining) {
      throw new Error(`Only ${remaining} unit(s) available for the requested dates.`);
    }

    const paidAt = status === 'confirmed' ? new Date().toISOString() : null;
    const result = await client.query(
      `INSERT INTO bookings ("roomId", "hotelId", "fullName", email, phone, "checkIn", "checkOut",
         guests, "specialRequests", status, "roomCount", "paidAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [roomId, hotelId, fullName, email, phone || null, checkIn, checkOut,
       Number(guests) || 2, specialRequests || null, status, requestedRoomCount, paidAt]
    );
    const booking = result.rows[0];

    await client.query(
      `UPDATE rooms SET "isAvailable" = (
        quantity > COALESCE((
          SELECT SUM(COALESCE("roomCount", 1)) FROM bookings
          WHERE "roomId" = $1 AND status != 'cancelled'
        ), 0)
      ) WHERE id = $1`,
      [roomId]
    );

    await enqueueInventorySync(client.query.bind(client), roomId, checkIn, checkOut);

    const hotelResult = await client.query('SELECT name FROM hotels WHERE id = $1', [hotelId]);
    const hotelName = hotelResult.rows[0]?.name || (req as any).tenant?.name || 'Resort';
    const adminInfo = getAdminInfo(req);
    await logAdminAction(
      client.query.bind(client), adminInfo, 'CREATE_BOOKING', booking.id, fullName,
      `Admin created booking for ${fullName} at ${hotelName} (${roomCheck.rows[0].name}): ${new Date(checkIn).toLocaleDateString()} – ${new Date(checkOut).toLocaleDateString()}, status: ${status}`
    );

    if (sendEmail) {
      let roomImageUrl = roomCheck.rows[0].imageUrl;
      try {
        const mediaRes = await client.query(
          'SELECT data FROM media WHERE "parentId" = $1 ORDER BY "order" ASC, id ASC LIMIT 1',
          [roomId]
        );
        if (mediaRes.rows[0]?.data) roomImageUrl = mediaRes.rows[0].data;
      } catch { /* non-fatal */ }
      await queueBookingConfirmation(client.query.bind(client), {
        id: booking.id, fullName, email, phone: phone || undefined,
        hotelName, roomName: roomCheck.rows[0].name, roomImageUrl,
        checkIn, checkOut, guests: Number(guests) || 2,
        specialRequests: specialRequests || undefined,
        placedAt: booking.createdAt,
        price: roomCheck.rows[0].price ? Number(roomCheck.rows[0].price) : undefined,
        roomCount: requestedRoomCount,
      }, (req as any).tenant || {});
    }

    await client.query('COMMIT');

    if (sendEmail) {
      await processEmailQueue(pool).catch(err =>
        console.error('Email queue failed after admin booking creation:', err)
      );
    }

    res.status(201).json(booking);
  } catch (err: any) {
    await client.query('ROLLBACK');
    res.status(409).json({ error: err.message || 'Failed to create booking.' });
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
    const currentBooking = await client.query(
      'SELECT "roomId", "paymentSlipUrl", "checkIn", "checkOut", "roomCount" FROM bookings WHERE id = $1 FOR UPDATE',
      [id]
    );
    const roomId = currentBooking.rows[0]?.roomId;

    if (!currentBooking.rows[0]) {
      throw new Error('Booking not found');
    }

    // Guard: a booking can only be confirmed without a payment slip when the admin
    // explicitly overrides (cash/card payment collected in person).
    if (status === 'confirmed' && !currentBooking.rows[0].paymentSlipUrl && !req.body.adminConfirm) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Cannot confirm: no payment slip has been uploaded for this booking.' });
    }

    const ALLOWED_BOOKING_FIELDS = new Set(['status', 'specialRequests', 'fullName', 'email', 'phone', 'guests', 'roomCount', 'checkIn', 'checkOut', 'paymentSlipUrl', 'paidAt']);
    const allUpdates: any = { status, ...updates };
    // Stamp the verification time automatically when staff confirm a booking.
    if (status === 'confirmed' && allUpdates.paidAt === undefined) {
      allUpdates.paidAt = new Date().toISOString();
    }
    const keys = Object.keys(allUpdates).filter(k => ALLOWED_BOOKING_FIELDS.has(k));

    // Re-check availability when dates or roomCount are being changed so that
    // editing a booking never creates an overbook. Exclude the current booking's
    // own contribution from the count before comparing against total capacity.
    const isDateOrCountChange = 'checkIn' in allUpdates || 'checkOut' in allUpdates || 'roomCount' in allUpdates;
    if (isDateOrCountChange && roomId) {
      const cur = currentBooking.rows[0];
      const newCheckIn  = allUpdates.checkIn  ?? cur.checkIn;
      const newCheckOut = allUpdates.checkOut ?? cur.checkOut;
      const newRoomCount = Number(allUpdates.roomCount ?? cur.roomCount ?? 1);
      const availRes = await client.query(
        `SELECT COALESCE(SUM(COALESCE("roomCount", 1)), 0) AS booked
         FROM bookings
         WHERE "roomId" = $1 AND id != $2 AND status != 'cancelled'
           AND "checkIn" < $3 AND "checkOut" > $4`,
        [roomId, id, newCheckOut, newCheckIn]
      );
      const booked = parseInt(availRes.rows[0].booked, 10);
      const roomQtyRes = await client.query('SELECT quantity FROM rooms WHERE id = $1', [roomId]);
      const totalQty = roomQtyRes.rows[0]?.quantity || 1;
      if (booked + newRoomCount > totalQty) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: `Only ${Math.max(0, totalQty - booked)} unit(s) available for the requested dates.`,
        });
      }
    }

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

      // Any status/date/roomCount edit can change availability — record for OTA sync.
      if (roomId) {
        await enqueueInventorySync(client.query.bind(client), roomId, result.rows[0]?.checkIn, result.rows[0]?.checkOut);
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
            hotelName: det.hotelName || (req as any).tenant?.name || 'Resort',
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
          const tenantBranding = (req as any).tenant || {};

          if (status === 'confirmed') {
            await queueBookingAcceptance(client.query.bind(client), bookingDetails, tenantBranding);
          } else {
            await queueBookingCancellation(client.query.bind(client), bookingDetails, tenantBranding);
          }

          const adminInfo = getAdminInfo(req);
          if (adminInfo.email) {
            const logAction = status === 'confirmed' ? 'CONFIRM_BOOKING' : 'CANCEL_BOOKING';
            const logDetails = status === 'confirmed'
              ? `Confirmed booking for guest ${det.fullName} at ${det.hotelName || 'Resort'} (${det.roomName})`
              : `Cancelled booking for guest ${det.fullName} at ${det.hotelName || 'Resort'} (${det.roomName})`;
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

// Custom password cryptographic hashing using PBKDF2 with custom salting to prevent dictionary / brute-force attacks.
// pbkdf2 is deliberately expensive (10k SHA-512 rounds ~= 10-20ms). The async form
// hands that work to libuv's threadpool; the *Sync form would run it on the event
// loop, where every concurrent login would serialise and stall every other request
// on this process — including the Railway healthcheck. Never reintroduce pbkdf2Sync.
const _pbkdf2 = promisify(crypto.pbkdf2);

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = (await _pbkdf2(password, salt, 10000, 64, 'sha512')).toString('hex');
  return `pbkdf2_10000$${salt}$${hash}`;
}

// Timing-safe password confirmation protecting against side-channel analysis
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash) return false;
  if (storedHash.startsWith('pbkdf2_10000$')) {
    const parts = storedHash.split('$');
    if (parts.length === 3) {
      const salt = parts[1];
      const hash = parts[2];
      const verifyHash = (await _pbkdf2(password, salt, 10000, 64, 'sha512')).toString('hex');
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
  const hashedPassword = await hashPassword(password);

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

  const _otpBrandName = (req as any).tenant?.name || 'Resort';
  const subject = `${otp} is your ${_otpBrandName} Verification Code`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8F5F2; padding: 40px; border-radius: 20px; max-width: 500px; margin: 40px auto; border: 1px solid #EEEEEE; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <span style="font-family: Georgia, serif; font-size: 24px; font-style: italic; color: #8D7B68; letter-spacing: 0.1em; text-transform: uppercase;">${_otpBrandName}</span>
      </div>
      <h2 style="color: #2D2D2D; font-weight: normal; margin-bottom: 16px; font-size: 18px;">Confirm Your Email Address</h2>
      <p style="font-size: 14px; color: #666666; line-height: 1.6; margin-bottom: 24px;">Hello ${displayName || 'Valued Guest'},</p>
      <p style="font-size: 14px; color: #666666; line-height: 1.6; margin-bottom: 24px;">Thank you for initiating your reservation at ${_otpBrandName}. Please enter the verification code below on the signup page to secure your account and confirm your sanctuary booking:</p>
      <div style="background-color: #FFFFFF; font-size: 32px; font-weight: bold; letter-spacing: 0.25em; text-align: center; padding: 20px; border-radius: 12px; margin: 24px 0; color: #8D7B68; border: 1px solid #EAE5E0; box-shadow: inset 0 1px 3px rgba(0,0,0,0.02);">
        ${otp}
      </div>
      <p style="font-size: 12px; color: #999999; text-align: center; margin-top: 24px;">This code expires in 5 minutes.</p>
      <div style="border-top: 1px solid #EAE5E0; padding-top: 20px; margin-top: 30px; text-align: center; font-size: 11px; color: #999999; font-style: italic;">
        &copy; ${new Date().getFullYear()} ${_otpBrandName}. Handcrafted Sri Lankan hospitality.
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
// Bounded, self-expiring brute-force counter, shared by the login route (keyed by
// email) and the demo gate (keyed by IP). Both previously kept a plain Map that only
// ever shrank on a *successful* auth, which had two problems:
//
//  1. Unbounded growth. The login tracker records a miss even for addresses that
//     don't exist, so spraying unique emails grew the Map until the process ran out
//     of memory — and an OOM *does* restart the service, unlike CPU saturation.
//  2. Attempts never decayed. A real user's typos accumulated forever, so five
//     mistakes spread over a year locked them out as surely as five in a row.
//
// Entries now carry an expiry and the Map is capped.
function createBruteForceTracker(opts: {
  maxEntries: number;
  windowMs: number;   // how long a failed attempt counts against a key
  maxAttempts: number;
  lockoutMs: number;
}) {
  const entries = new Map<string, { attempts: number; lockoutUntil: number; expiresAt: number }>();

  const prune = (now: number) => {
    for (const [key, rec] of entries) {
      if (rec.expiresAt <= now) entries.delete(key);
    }
    if (entries.size <= opts.maxEntries) return;
    // Still over cap: evict the entries closest to expiring. Note the excess is
    // computed before the loop — entries.size changes as we delete.
    const byExpiry = [...entries.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    const excess = entries.size - opts.maxEntries;
    for (let i = 0; i < excess; i++) entries.delete(byExpiry[i][0]);
  };

  return {
    // Remaining lockout in ms, or 0 when the key is free to try again.
    lockedFor(key: string): number {
      const rec = entries.get(key);
      if (!rec) return 0;
      const now = Date.now();
      if (rec.expiresAt <= now) {
        entries.delete(key);
        return 0;
      }
      return Math.max(0, rec.lockoutUntil - now);
    },
    recordFailure(key: string): void {
      const now = Date.now();
      const prev = entries.get(key);
      // An expired record is treated as absent, so the count restarts at 1.
      const live = prev && prev.expiresAt > now ? prev : undefined;
      const attempts = (live?.attempts ?? 0) + 1;
      const lockoutUntil = attempts >= opts.maxAttempts ? now + opts.lockoutMs : 0;
      entries.set(key, {
        attempts,
        lockoutUntil,
        // Never expire a record before its own lockout has elapsed, or the lockout
        // could be dropped early and reset the count.
        expiresAt: Math.max(now + opts.windowMs, lockoutUntil),
      });
      // Amortised: only walks the Map once it is actually oversized.
      if (entries.size > opts.maxEntries) prune(now);
    },
    reset(key: string): void {
      entries.delete(key);
    },
    get size() {
      return entries.size;
    },
  };
}

// Per-process, like the rate limiters above: correct at numReplicas: 1, needs a
// shared store before scaling out.
const loginBruteForceTracker = createBruteForceTracker({
  maxEntries: 10_000,
  windowMs: 15 * 60 * 1000,
  maxAttempts: 5,
  lockoutMs: 15 * 60 * 1000,
});

// Customer and admin credentials login endpoint (self-hosted auth against Postgres)
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const emailKey = email.toLowerCase().trim();
  
  // Rate limits check protecting against brute-force account credential guessing
  const lockedForMs = loginBruteForceTracker.lockedFor(emailKey);
  if (lockedForMs > 0) {
    const minutesRemaining = Math.ceil(lockedForMs / 1000 / 60);
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
        ? await verifyPassword(password, admin.password)
        : password === ADMIN_MASTER_PASSWORD;
      
      if (!isPasswordValid) {
        loginBruteForceTracker.recordFailure(emailKey);
        return res.status(400).json({ error: 'Incorrect password for admin/staff account. Please try again.' });
      }

      // Success: delete tracking record and authenticate
      loginBruteForceTracker.reset(emailKey);

      const tokenPayload = {
        id: admin.id,
        email: admin.email,
        // Existing 'admin'/'staff' rows keep their current full-admin token role;
        // only a 'superadmin' DB row is elevated so it can manage tenants/all hotels.
        role: admin.role === 'superadmin' ? 'superadmin' : 'admin',
        // Carry the admin's property scope so tenant-aware endpoints can filter by it.
        hotelId: admin.hotelId || null,
        exp: Math.floor(Date.now() / 1000) + 86400 // 24 hours
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
      loginBruteForceTracker.recordFailure(emailKey);
      return res.status(400).json({ error: 'No account found with this email address.' });
    }

    const customer = customerResult.rows[0];
    if (!(await verifyPassword(password, customer.password))) {
      // Increment failed password matching count
      loginBruteForceTracker.recordFailure(emailKey);
      return res.status(400).json({ error: 'Incorrect password. Please try again.' });
    }

    // Success: delete tracking record and authenticate
    loginBruteForceTracker.reset(emailKey);

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

// Admin creator / registration endpoint (self-hosted auth against Postgres)
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
    const hashedPassword = await hashPassword(password);

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

  const _inviteBrandName = (req as any).tenant?.name || 'Resort';
  const subject = `${otp} is your ${_inviteBrandName} Staff Promotion Verification Code`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8F5F2; padding: 40px; border-radius: 20px; max-width: 500px; margin: 40px auto; border: 1px solid #EEEEEE; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <span style="font-family: Georgia, serif; font-size: 24px; font-style: italic; color: #8D7B68; letter-spacing: 0.1em; text-transform: uppercase;">${_inviteBrandName}</span>
      </div>
      <h2 style="color: #2D2D2D; font-weight: normal; margin-bottom: 16px; font-size: 18px;">Staff Administration Onboarding</h2>
      <p style="font-size: 14px; color: #666666; line-height: 1.6; margin-bottom: 24px;">Hello,</p>
      <p style="font-size: 14px; color: #666666; line-height: 1.6; margin-bottom: 24px;">You have been invited to join the ${_inviteBrandName} administration and management team.</p>
      <p style="font-size: 14px; color: #666666; line-height: 1.6; margin-bottom: 24px;">Please provide the following 6-digit confirmation code to the system administrator to verify your email and activate your staff coordinates:</p>
      <div style="background-color: #FFFFFF; font-size: 32px; font-weight: bold; letter-spacing: 0.25em; text-align: center; padding: 20px; border-radius: 12px; margin: 24px 0; color: #8D7B68; border: 1px solid #EAE5E0; box-shadow: inset 0 1px 3px rgba(0,0,0,0.02);">
        ${otp}
      </div>
      <p style="font-size: 12px; color: #999999; text-align: center; margin-top: 24px;">This code is valid for 5 minutes.</p>
      <div style="border-top: 1px solid #EAE5E0; padding-top: 20px; margin-top: 30px; text-align: center; font-size: 11px; color: #999999; font-style: italic;">
        &copy; ${new Date().getFullYear()} ${_inviteBrandName}. All rights reserved.
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
  const hashedPassword = await hashPassword(tempPassword);

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
      ? await verifyPassword(currentPassword, admin.password)
      : currentPassword === ADMIN_MASTER_PASSWORD;

    if (!isPasswordValid) {
      return res.status(400).json({ error: 'The current temporary password you entered is incorrect.' });
    }

    const newHashedPassword = await hashPassword(newPassword);
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

const demoGateBruteForce = createBruteForceTracker({
  maxEntries: 10_000,
  windowMs: 15 * 60 * 1000,
  maxAttempts: 5,
  lockoutMs: 15 * 60 * 1000,
});

app.post('/api/demo-auth', (req, res) => {
  // Same identity the rate limiters use — see clientIp() for why XFF[0] rather than
  // req.ip. (This route originally read XFF[0] directly, which was right for Railway;
  // the shared helper just adds the local/non-proxied fallbacks.)
  const ip = clientIp(req);

  const lockedForMs = demoGateBruteForce.lockedFor(ip);
  if (lockedForMs > 0) {
    const mins = Math.ceil(lockedForMs / 60000);
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
    demoGateBruteForce.recordFailure(ip);
    return res.status(401).json({ error: 'Incorrect password.' });
  }

  demoGateBruteForce.reset(ip);
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

// ── Superadmin: Tenant management (Phase 4) ──────────────────────────────────

app.get('/api/superadmin/tenants', requireSuperAdmin, async (req, res) => {
  try {
    const r = await query(
      `SELECT t.*, h.name AS "hotelName"
       FROM tenants t
       LEFT JOIN hotels h ON h.id = t."hotelId"
       ORDER BY t."createdAt" DESC`
    );
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/superadmin/tenants', requireSuperAdmin, async (req, res) => {
  try {
    const {
      domain, hotelId, name, logoUrl, markLogoUrl, primaryColor, accentColor,
      phone, email, emailFrom, bankDetails, smtpConfig, isActive = true,
    } = req.body;
    if (!domain || !hotelId || !name) {
      return res.status(400).json({ error: 'domain, hotelId, and name are required.' });
    }
    const r = await query(
      `INSERT INTO tenants
         (domain, "hotelId", name, "logoUrl", "markLogoUrl", "primaryColor", "accentColor",
          phone, email, "emailFrom", "bankDetails", "smtpConfig", "isActive")
       VALUES (LOWER(TRIM($1)), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [domain, hotelId, name,
       logoUrl || null, markLogoUrl || null, primaryColor || null, accentColor || null,
       phone || null, email || null, emailFrom || null,
       bankDetails || null, smtpConfig || null, isActive]
    );
    _tenantCache.delete(domain.trim().toLowerCase());
    res.status(201).json(r.rows[0]);
  } catch (err: any) {
    if ((err as any).code === '23505') return res.status(409).json({ error: 'A tenant with this domain already exists.' });
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/superadmin/tenants/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const ALLOWED = new Set(['domain', 'hotelId', 'name', 'logoUrl', 'markLogoUrl',
      'primaryColor', 'accentColor', 'phone', 'email', 'emailFrom',
      'bankDetails', 'smtpConfig', 'isActive']);
    const keys = Object.keys(req.body).filter(k => ALLOWED.has(k));
    if (keys.length === 0) return res.status(400).json({ error: 'No valid fields to update.' });
    const setClause = keys.map((k, i) => `"${k}" = $${i + 2}`).join(', ');
    const r = await query(
      `UPDATE tenants SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...keys.map(k => req.body[k])]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Tenant not found.' });
    if (r.rows[0].domain) _tenantCache.delete((r.rows[0].domain as string).toLowerCase());
    res.json(r.rows[0]);
  } catch (err: any) {
    if ((err as any).code === '23505') return res.status(409).json({ error: 'A tenant with this domain already exists.' });
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/superadmin/tenants/:id', requireSuperAdmin, async (req, res) => {
  try {
    const r = await query('DELETE FROM tenants WHERE id = $1 RETURNING domain', [req.params.id]);
    if (r.rows[0]?.domain) _tenantCache.delete((r.rows[0].domain as string).toLowerCase());
    res.sendStatus(204);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/superadmin/admins', requireSuperAdmin, async (req, res) => {
  try {
    const r = await query(
      `SELECT a.id, a.email, a."displayName", a.role, a."hotelId",
              h.name AS "hotelName", a."createdAt"
       FROM admins a
       LEFT JOIN hotels h ON h.id = a."hotelId"
       ORDER BY a."createdAt" DESC`
    );
    res.json(r.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/superadmin/admins/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const self = (req as any).admin;
    if (id === self?.id && req.body.role && req.body.role !== 'superadmin') {
      return res.status(400).json({ error: 'You cannot change your own role.' });
    }
    const ALLOWED_ROLES = new Set(['admin', 'staff', 'superadmin']);
    const updates: Record<string, any> = {};
    if ('hotelId' in req.body) updates['hotelId'] = req.body.hotelId || null;
    if (req.body.role !== undefined && ALLOWED_ROLES.has(req.body.role)) updates['role'] = req.body.role;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid fields to update.' });
    const keys = Object.keys(updates);
    const setClause = keys.map((k, i) => `"${k}" = $${i + 2}`).join(', ');
    const r = await query(
      `UPDATE admins SET ${setClause} WHERE id = $1
       RETURNING id, email, "displayName", role, "hotelId"`,
      [id, ...keys.map(k => updates[k])]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Admin not found.' });
    res.json(r.rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
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

  // Apply a Cloudinary delivery transform server-side (mirrors src/lib/cloudinary
  // cld()) so the preload requests the exact same URLs the Hero <img> will render.
  const cldUrl = (url: string, transform: string): string => {
    if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
    const [head, tail] = url.split('/upload/');
    if (tail === undefined) return url;
    if (/(^|,)[a-z]{1,4}_/.test(tail.split('/')[0])) return url; // already transformed
    return `${head}/upload/${transform}/${tail}`;
  };
  const esc = (s: string) => s.replace(/"/g, '&quot;');

  // Preload the image so it downloads in parallel with the JS bundle. We mirror
  // the Hero's responsive srcset + sizes here so the browser preloads the right
  // device-sized candidate (not a 2000px image on a phone) and the <img> reuses
  // it. Videos stream with a poster frame, so a preload hint isn't worthwhile.
  let preload = '';
  if (!isVideo) {
    const isCld = media.data.includes('res.cloudinary.com') && media.data.includes('/upload/');
    if (isCld) {
      const srcset = [640, 1024, 1600, 2000]
        .map(w => `${cldUrl(media.data, `f_auto,q_auto,w_${w}`)} ${w}w`)
        .join(', ');
      preload = `<link rel="preload" as="image" href="${esc(cldUrl(media.data, 'f_auto,q_auto,w_2000'))}" imagesrcset="${esc(srcset)}" imagesizes="100vw">`;
    } else {
      preload = `<link rel="preload" as="image" href="${esc(media.data)}">`;
    }
  }

  return html.replace('</head>', `${preload}${seed}</head>`);
}

// index.html is immutable for the life of the deploy, and injectHeroMedia's output
// varies only with the hero media — so both the disk read and the string assembly
// are memoized rather than repeated on every page load. The rendered shell is keyed
// on the hero media object identity, which getHeroMedia keeps stable for its TTL, so
// this refreshes on exactly the same schedule as before.
let _rawIndexHtml: string | null = null;
let _shellCache: { media: any | null; html: string } | null = null;

async function renderIndexShell(indexHtmlPath: string): Promise<string> {
  const media = await getHeroMedia();
  if (_shellCache && _shellCache.media === media) {
    return _shellCache.html;
  }
  if (_rawIndexHtml === null) {
    _rawIndexHtml = await fs.promises.readFile(indexHtmlPath, 'utf-8');
  }
  const html = await injectHeroMedia(_rawIndexHtml);
  _shellCache = { media, html };
  return html;
}

// Map of URL path -> which precompressed variants exist on disk for it, e.g.
// '/assets/index-CxGSHxUe.js' -> { br: true, gzip: true }.
//
// Built once at startup and held in memory. The alternative — stat()-ing for a
// '.br' on each request — would swap the gzip CPU we're removing for filesystem
// I/O on every asset hit, which defeats the point. dist/ is baked into the image
// and cannot change while the process runs, so a snapshot is safe here.
function buildVariantIndex(distPath: string): Map<string, { br: boolean; gzip: boolean }> {
  const index = new Map<string, { br: boolean; gzip: boolean }>();
  const walk = (dir: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // dist/ absent (e.g. tests) — the caller falls back to plain static.
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      const match = /\.(br|gz)$/.exec(entry.name);
      if (!match) continue;
      // Map the variant back to the URL path of the file it encodes.
      const originalPath = full.slice(0, -match[0].length);
      const urlPath = '/' + path.relative(distPath, originalPath).split(path.sep).join('/');
      const existing = index.get(urlPath) ?? { br: false, gzip: false };
      if (match[1] === 'br') existing.br = true;
      else existing.gzip = true;
      index.set(urlPath, existing);
    }
  };
  walk(distPath);
  return index;
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
    // dist/client, not dist/: the server bundle and its sourcemap live in dist/ and
    // must never be inside the static root. See build.outDir in vite.config.ts.
    const distPath = path.join(process.cwd(), 'dist', 'client');
    const indexHtmlPath = path.join(distPath, 'index.html');

    // Serve the .br/.gz variants written by scripts/precompress.mjs at build time,
    // instead of letting the global compression() middleware re-compress the same
    // immutable bytes on the event loop for every cache miss.
    //
    // This must be mounted BEFORE express.static. It doesn't send anything itself:
    // it rewrites req.url to point at the variant and lets express.static do the
    // actual serving, so range requests, ETags, Content-Length and the caching
    // options below all keep working, computed against the file actually sent.
    //
    // compression() further up then leaves the response alone: it skips any
    // response that already carries a Content-Encoding (compression/index.js:183).
    const variantIndex = buildVariantIndex(distPath);
    if (variantIndex.size > 0) {
      app.use((req, res, next) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') return next();

        const variants = variantIndex.get(req.path);
        if (!variants) return next();

        // Let Express negotiate: it honours the client's q-values and ordering.
        // Listing identity last means a client that refuses both encodings
        // (or sends br;q=0) correctly falls through to the raw file.
        const candidates = [
          ...(variants.br ? ['br'] : []),
          ...(variants.gzip ? ['gzip'] : []),
          'identity',
        ];
        const chosen = req.acceptsEncodings(candidates);
        if (chosen !== 'br' && chosen !== 'gzip') return next();

        // Content-Type must be derived from the ORIGINAL extension and set now:
        // express.static would otherwise infer it from the '.br'/'.gz' suffix and
        // label our JavaScript as application/octet-stream, which browsers refuse
        // to execute. send() leaves Content-Type alone once it's already set.
        res.type(path.extname(req.path));
        res.setHeader('Content-Encoding', chosen);
        // Without Vary, a shared cache could hand a brotli body to a client that
        // never asked for one.
        res.setHeader('Vary', 'Accept-Encoding');

        const suffix = chosen === 'br' ? '.br' : '.gz';
        const queryAt = req.url.indexOf('?');
        req.url = queryAt === -1
          ? req.url + suffix
          : req.url.slice(0, queryAt) + suffix + req.url.slice(queryAt);
        next();
      });
    }

    // Vite gives every JS/CSS file a content hash in its name, so the bytes for a
    // given URL never change — cache them for a year. index.html is the pointer to
    // those hashed files and is served fresh via the '*' route below, so a new
    // deploy is always picked up immediately. `index: false` stops this middleware
    // from serving index.html itself (we render it with hero injection instead).
    app.use(express.static(distPath, {
      maxAge: '1y',
      immutable: true,
      index: false,
    }));
    app.get('*', async (req, res) => {
      try {
        const html = await renderIndexShell(indexHtmlPath);
        // Never cache the HTML shell: it must always reflect the latest asset
        // hashes and the freshly-injected hero media.
        res.status(200).set({
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache',
        }).end(html);
      } catch (e) {
        // If injection fails for any reason, still serve the app.
        res.set('Cache-Control', 'no-cache');
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
