import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';
import { queueBookingConfirmation, processEmailQueue } from './server/email';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Database configuration
const dbUrl = process.env.DATABASE_URL;
const isDbConfigured = Boolean(dbUrl && !dbUrl.includes('[YOUR-PASSWORD]'));

if (!isDbConfigured) {
  console.error('\n⚠️  DATABASE_URL is not configured correctly.');
  console.error('Please set a valid DATABASE_URL in the Settings -> Secrets menu.');
  console.error('Format: postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres\n');
}

const pool = isDbConfigured 
  ? new pg.Pool({
      connectionString: dbUrl,
      ssl: {
        rejectUnauthorized: false
      }
    })
  : null;

// Mock Data for Fallback
const MOCK_HOTELS = [
  {
    id: 'h1',
    name: 'Heritage Ahungalla',
    location: 'Ahungalla',
    description: 'A legendary 5-star resort designed by Geoffrey Bawa, offering ultimate barefoot luxury in a tropical paradise.',
    imageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=2070&auto=format&fit=crop',
    createdAt: new Date().toISOString()
  },
  {
    id: 'h2',
    name: 'Blaze Bolgoda',
    location: 'Bolgoda',
    description: 'A serene luxury boutique villa set on the banks of the Bolgoda Lake, perfect for a private getaway.',
    imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=2070&auto=format&fit=crop',
    createdAt: new Date().toISOString()
  },
  {
    id: 'h3',
    name: 'Hikka Hikkaduwa',
    location: 'Hikkaduwa',
    description: 'Vibrant and modern accommodation in the heart of Hikkaduwa, offering easy access to the reef and surf.',
    imageUrl: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?q=80&w=2070&auto=format&fit=crop',
    createdAt: new Date().toISOString()
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
    createdAt: new Date().toISOString()
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
    createdAt: new Date().toISOString()
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
    createdAt: new Date().toISOString()
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
    createdAt: new Date().toISOString()
  }
];

// Helper for queries to handle missing DB
async function query(text: string, params?: any[]) {
  if (!pool) {
    const err = new Error('Database not configured. Please set DATABASE_URL in Settings -> Secrets.');
    (err as any).isConfigError = true;
    throw err;
  }
  try {
    return await pool.query(text, params);
  } catch (dbErr: any) {
    if (dbErr.message?.includes('authentication failed')) {
      const err = new Error('Database authentication failed. Please check your DB password in your DATABASE_URL secret.');
      (err as any).isConfigError = true;
      throw err;
    }
    throw dbErr;
  }
}

// Initialize Database Tables
async function initDb() {
  if (!pool) {
    console.warn('⚠️  DATABASE_URL not set or invalid. App will run in Mock Mode for data endpoints.');
    return;
  }
  
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

      CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status) WHERE status = 'pending';
      CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings("userId");
      CREATE INDEX IF NOT EXISTS idx_bookings_room_id ON bookings("roomId");
      CREATE INDEX IF NOT EXISTS idx_rooms_hotel_id ON rooms("hotelId");
      CREATE INDEX IF NOT EXISTS idx_rooms_availability ON rooms("isAvailable") WHERE "isAvailable" = true;
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
  } catch (err: any) {
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
}

// API Routes
// Database Status
app.get('/api/db-status', (req, res) => {
  res.json({
    configured: isDbConfigured,
    connected: pool !== null && isDbConfigured,
    mode: isDbConfigured ? 'production' : 'mock'
  });
});

// Customers
app.get('/api/customers', async (req, res) => {
  try {
    const result = await query('SELECT * FROM customers ORDER BY "createdAt" DESC');
    res.json(result.rows);
  } catch (err: any) {
    res.status(err.isConfigError ? 403 : 500).json({ error: err.message });
  }
});

app.get('/api/customers/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const result = await query('SELECT * FROM customers WHERE id = $1', [uid]);
    res.json(result.rows[0] || null);
  } catch (err: any) {
    res.status(err.isConfigError ? 403 : 500).json({ error: err.message });
  }
});

app.post('/api/customers/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { email, displayName, photoURL } = req.body;
    const result = await query(
      'INSERT INTO customers (id, email, "displayName", "photoURL") VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, "displayName" = EXCLUDED."displayName", "photoURL" = EXCLUDED."photoURL" RETURNING *',
      [uid, email, displayName, photoURL]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(err.isConfigError ? 403 : 500).json({ error: err.message });
  }
});

// Admins
app.get('/api/admins', async (req, res) => {
  try {
    const result = await query('SELECT * FROM admins ORDER BY "createdAt" DESC');
    res.json(result.rows);
  } catch (err: any) {
    res.status(err.isConfigError ? 403 : 500).json({ error: err.message });
  }
});

app.get('/api/admins/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const result = await query('SELECT * FROM admins WHERE id = $1', [uid]);
    res.json(result.rows[0] || null);
  } catch (err: any) {
    res.status(err.isConfigError ? 403 : 500).json({ error: err.message });
  }
});

app.post('/api/admins/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { email, role, displayName } = req.body;
    const result = await query(
      'INSERT INTO admins (id, email, role, "displayName") VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, role = EXCLUDED.role, "displayName" = EXCLUDED."displayName" RETURNING *',
      [uid, email, role, displayName]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(err.isConfigError ? 403 : 500).json({ error: err.message });
  }
});

app.delete('/api/admins/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM admins WHERE id = $1', [id]);
    res.sendStatus(204);
  } catch (err: any) {
    res.status(err.isConfigError ? 403 : 500).json({ error: err.message });
  }
});

// Hotels
app.get('/api/hotels', async (req, res) => {
  try {
    const result = await query('SELECT * FROM hotels ORDER BY "createdAt" DESC');
    res.json(result.rows);
  } catch (err: any) {
    if (err.isConfigError || err.message?.includes('does not exist')) {
      console.warn('Using Mock Hotels (DB fallback)');
      return res.json(MOCK_HOTELS);
    }
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/hotels', async (req, res) => {
  try {
    const { name, location, description, imageUrl, hasBanquetHall, email, phone } = req.body;
    const result = await query(
      'INSERT INTO hotels (name, location, description, "imageUrl", "hasBanquetHall", email, phone) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, location, description, imageUrl, hasBanquetHall || false, email, phone]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(err.isConfigError ? 403 : 500).json({ error: err.message });
  }
});

app.patch('/api/hotels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const keys = Object.keys(updates);
    const setClause = keys.map((key, i) => `"${key}" = $${i + 2}`).join(', ');
    const values = keys.map(key => updates[key]);
    
    const result = await query(
      `UPDATE hotels SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(err.isConfigError ? 403 : 500).json({ error: err.message });
  }
});

app.delete('/api/hotels/:id', async (req, res) => {
  try {
    await query('DELETE FROM hotels WHERE id = $1', [req.params.id]);
    res.sendStatus(204);
  } catch (err: any) {
    res.status(err.isConfigError ? 403 : 500).json({ error: err.message });
  }
});

// Rooms
app.get('/api/rooms', async (req, res) => {
  try {
    const { hotelId } = req.query;
    let queryText = 'SELECT * FROM rooms';
    const params = [];
    if (hotelId) {
      queryText += ' WHERE "hotelId" = $1';
      params.push(hotelId);
    }
    queryText += ' ORDER BY "createdAt" DESC';
    const result = await query(queryText, params);
    // Convert string ratings/prices back to numbers if needed
    const rooms = result.rows.map(r => ({
       ...r,
       price: parseFloat(r.price),
       rating: r.rating ? parseFloat(r.rating) : null
    }));
    res.json(rooms);
  } catch (err: any) {
    if (err.isConfigError || err.message?.includes('does not exist')) {
      console.warn('Using Mock Rooms (DB fallback)');
      return res.json(MOCK_ROOMS);
    }
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rooms', async (req, res) => {
  try {
    const { hotelId, name, type, description, price, rating, imageUrl, amenities, maxGuests, isAvailable, location } = req.body;
    const result = await query(
      `INSERT INTO rooms ("hotelId", name, type, description, price, rating, "imageUrl", amenities, "maxGuests", "isAvailable", location) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [hotelId, name, type, description, price, rating, imageUrl, amenities, maxGuests, isAvailable, location]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error(err);
    res.status(err.isConfigError ? 403 : 500).json({ error: err.message || 'Failed to add room' });
  }
});

app.patch('/api/rooms/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const keys = Object.keys(updates);
    const setClause = keys.map((key, i) => `"${key}" = $${i + 2}`).join(', ');
    const values = keys.map(key => updates[key]);
    
    const result = await query(
      `UPDATE rooms SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(err.isConfigError ? 403 : 500).json({ error: err.message || 'Failed to update room' });
  }
});

app.delete('/api/rooms/:id', async (req, res) => {
  try {
    await query('DELETE FROM rooms WHERE id = $1', [req.params.id]);
    res.sendStatus(204);
  } catch (err: any) {
    res.status(err.isConfigError ? 403 : 500).json({ error: err.message || 'Failed to delete room' });
  }
});

// Bookings
app.get('/api/bookings', async (req, res) => {
  try {
    const { userId } = req.query;
    let queryText = 'SELECT * FROM bookings';
    const params = [];
    if (userId) {
      queryText += ' WHERE "userId" = $1';
      params.push(userId);
    }
    queryText += ' ORDER BY "createdAt" DESC';
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
  if (!pool) return res.status(503).json({ error: 'Database unavailable' });
  const client = await pool.connect();
  
  try {
    const { userId, roomId, hotelId, fullName, email, phone, checkIn, checkOut, guests, specialRequests, status } = req.body;
    
    await client.query('BEGIN');
    
    // IMPORTANT: Row-level lock on the room to prevent race conditions
    // Using FOR UPDATE ensures that only one transaction can touch this room at a time
    const roomCheck = await client.query(
      'SELECT "isAvailable", name FROM rooms WHERE id = $1 FOR UPDATE',
      [roomId]
    );

    if (!roomCheck.rows[0]) {
      throw new Error('Accommodation not found');
    }

    if (!roomCheck.rows[0].isAvailable) {
      throw new Error('This accommodation was just booked by another user. Please choose another.');
    }
    
    const result = await client.query(
      `INSERT INTO bookings ("userId", "roomId", "hotelId", "fullName", email, phone, "checkIn", "checkOut", guests, "specialRequests", status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [userId, roomId, hotelId, fullName, email, phone, checkIn, checkOut, guests, specialRequests, status || 'pending']
    );

    // Update availability
    await client.query('UPDATE rooms SET "isAvailable" = false WHERE id = $1', [roomId]);

    const booking = result.rows[0];
    const hotelResult = await client.query('SELECT name FROM hotels WHERE id = $1', [hotelId]);

    // Queue email confirmation *inside* the same transaction for reliability
    await queueBookingConfirmation(client.query.bind(client), {
      id: booking.id,
      fullName: booking.fullName,
      email: booking.email,
      hotelName: hotelResult.rows[0]?.name || 'Ahsell Resort',
      roomName: roomCheck.rows[0].name,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      guests: booking.guests
    });

    await client.query('COMMIT');
    res.json(booking);
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Booking Error:', err);
    res.status(err.isConfigError ? 403 : 409).json({ error: err.message || 'Failed to create booking' });
  } finally {
    client.release();
  }
});

app.patch('/api/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, ...updates } = req.body;
    
    await query('BEGIN');
    
    // Get the current booking to know the roomId
    const currentBooking = await query('SELECT "roomId" FROM bookings WHERE id = $1', [id]);
    const roomId = currentBooking.rows[0]?.roomId;

    const keys = Object.keys({ status, ...updates });
    const setClause = keys.map((key, i) => `"${key}" = $${i + 2}`).join(', ');
    const values = keys.map(key => ({ status, ...updates }[key as any]));
    
    const result = await query(
      `UPDATE bookings SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...values]
    );

    // If cancelled, make the room available again
    if (status === 'cancelled' && roomId) {
      await query('UPDATE rooms SET "isAvailable" = true WHERE id = $1', [roomId]);
    } else if (status === 'confirmed' && roomId) {
      // Re-confirming might happen, ensure it's unavailable
      await query('UPDATE rooms SET "isAvailable" = false WHERE id = $1', [roomId]);
    }

    await query('COMMIT');
    res.json(result.rows[0]);
  } catch (err: any) {
    await query('ROLLBACK');
    res.status(err.isConfigError ? 403 : 500).json({ error: err.message || 'Failed to update booking' });
  }
});

// Vite Setup
async function startServer() {
  await initDb();

  // Background Email Worker
  if (pool) {
    const runWorker = async () => {
      try {
        await processEmailQueue(pool);
      } catch (err) {
        console.error('Email worker error:', err);
      } finally {
        setTimeout(runWorker, 15000); // Wait 15s AFTER completion before next run
      }
    };
    runWorker();
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();