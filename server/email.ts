import nodemailer from 'nodemailer';

export interface BookingDetails {
  fullName: string;
  email: string;
  hotelName: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  id: string;
}

const createTransporter = () => {
  // Try to use environment variables for SMTP
  // If not provided, it will fail gracefully or log a warning
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('Email configuration missing (SMTP_HOST, SMTP_USER, SMTP_PASS). Emails will not be sent.');
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 10000, // 10s
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
};

const getEmailTemplate = (details: BookingDetails) => {
  const primaryColor = '#C5A28E';
  const bgColor = '#F9F7F2';
  const textColor = '#2D2D2D';
  const accentColor = '#D9D2C6';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background-color: ${bgColor}; color: ${textColor}; margin: 0; padding: 40px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 40px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid ${accentColor}; }
          .header { padding: 60px 40px; text-align: center; background-color: white; border-bottom: 1px solid ${accentColor}; }
          .header h1 { font-family: serif; font-style: italic; font-size: 32px; margin: 0; color: ${textColor}; }
          .content { padding: 40px; }
          .section { margin-bottom: 30px; }
          .label { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; color: ${primaryColor}; margin-bottom: 8px; }
          .value { font-size: 16px; font-weight: 500; }
          .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; }
          .details-box { background-color: ${bgColor}; padding: 24px; border-radius: 24px; margin-top: 20px; }
          .footer { padding: 40px; text-align: center; border-top: 1px solid ${accentColor}; font-size: 12px; color: ${primaryColor}; }
          .button { display: inline-block; padding: 16px 32px; background-color: ${primaryColor}; color: white; text-decoration: none; border-radius: 100px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; font-size: 10px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Ahsell Resorts</h1>
            <p style="margin-top: 10px; color: ${primaryColor}; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.2em;">Booking Confirmation</p>
          </div>
          <div class="content">
            <p>Dear ${details.fullName},</p>
            <p>Your sanctuary is secured at Ahsell Resorts. We are delighted to confirm your upcoming stay.</p>
            
            <div class="details-box">
              <div class="section">
                <div class="label">Reservation ID</div>
                <div class="value">${details.id}</div>
              </div>
              
              <div style="display: flex; justify-content: space-between; gap: 20px;">
                <div style="flex: 1;">
                  <div class="label">Property</div>
                  <div class="value">${details.hotelName}</div>
                </div>
                <div style="flex: 1;">
                  <div class="label">Accommodation</div>
                  <div class="value">${details.roomName}</div>
                </div>
              </div>

              <div style="display: flex; justify-content: space-between; gap: 20px; margin-top: 20px;">
                <div style="flex: 1;">
                  <div class="label">Check In (2:00 PM)</div>
                  <div class="value">${new Date(details.checkIn).toLocaleDateString()}</div>
                </div>
                <div style="flex: 1;">
                  <div class="label">Check Out (11:00 AM)</div>
                  <div class="value">${new Date(details.checkOut).toLocaleDateString()}</div>
                </div>
              </div>

              <div class="section" style="margin-top: 20px; margin-bottom: 0;">
                <div class="label">Guests</div>
                <div class="value">${details.guests} People</div>
              </div>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.VITE_APP_URL || '#'}" class="button">Manage Booking</a>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Ahsell Resorts. Handcrafted Hospitality.</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

export const queueBookingConfirmation = async (dbQuery: any, details: BookingDetails) => {
  try {
    const html = getEmailTemplate(details);
    const subject = `Your Sanctuary Awaits: Confirmation for ${details.hotelName}`;
    
    await dbQuery(
      'INSERT INTO email_queue (recipient, subject, body, status) VALUES ($1, $2, $3, $4)',
      [details.email, subject, html, 'pending']
    );
    console.log(`Confirmation email queued for ${details.email}`);
  } catch (error) {
    console.error('Failed to queue confirmation email:', error);
  }
};

export const processEmailQueue = async (pool: any) => {
  const transporter = createTransporter();
  if (!transporter) {
    // Only log once to avoid spamming
    if (!(global as any)._smtp_warn_logged) {
      console.warn('Email worker: SMTP transporter not configured (missing env vars). Skipping queue processing.');
      (global as any)._smtp_warn_logged = true;
    }
    return;
  }

  // Verify connection once at start of each run to catch credential issues early
  try {
    await transporter.verify();
  } catch (verifyErr) {
    console.error('SMTP Connection Verification Failed:', verifyErr);
    return;
  }

  let client;
  try {
    client = await pool.connect();
    
    // Pick up pending emails OR emails that have been 'processing' for more than 5 minutes (stuck)
    const result = await client.query(
      `UPDATE email_queue 
       SET status = 'processing', "processedAt" = CURRENT_TIMESTAMP
       WHERE id IN (
         SELECT id FROM email_queue 
         WHERE (status = 'pending' OR (status = 'processing' AND "processedAt" < CURRENT_TIMESTAMP - INTERVAL '5 minutes'))
         AND attempts < 3
         LIMIT 5 
         FOR UPDATE SKIP LOCKED
       )
       RETURNING *`
    );

    if (result.rows.length > 0) {
      console.log(`Email worker: Processing ${result.rows.length} emails...`);
    }

    for (const email of result.rows) {
      try {
        console.log(`Sending email to ${email.recipient} (Subject: ${email.subject})...`);
        await transporter.sendMail({
          from: `"Ahsell Resorts" <${process.env.SMTP_USER}>`,
          to: email.recipient,
          subject: email.subject,
          html: email.body,
        });

        await client.query(
          'UPDATE email_queue SET status = $1, "processedAt" = CURRENT_TIMESTAMP WHERE id = $2',
          ['sent', email.id]
        );
        console.log(`Successfully sent email to ${email.recipient}`);
      } catch (err: any) {
        console.error(`Failed to send queued email to ${email.recipient}:`, err);
        const attempts = (email.attempts || 0) + 1;
        const newStatus = attempts >= 3 ? 'failed' : 'pending';
        
        await client.query(
          'UPDATE email_queue SET status = $1, attempts = $2, "lastError" = $3 WHERE id = $4',
          [newStatus, attempts, err.message, email.id]
        );
      }
    }
  } catch (error) {
    if ((error as any).code === '08006' || (error as any).message?.includes('timeout')) {
      console.error('Database connection timeout in processEmailQueue. Skipping this run.');
    } else {
      console.error('Error processing email queue:', error);
    }
  } finally {
    if (client) client.release();
  }
};
