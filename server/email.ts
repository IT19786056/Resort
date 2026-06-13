import nodemailer from 'nodemailer';

export interface BookingDetails {
  fullName: string;
  email: string;
  phone?: string;
  hotelName: string;
  roomName: string;
  roomImageUrl?: string;
  checkIn: string | Date;
  checkOut: string | Date;
  guests: number;
  id: string;
  specialRequests?: string;
  placedAt?: string | Date;
  price?: number;
  roomCount?: number;
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

const getEmailTemplate = (details: BookingDetails, type: 'initial' | 'confirmed' | 'cancelled' = 'initial') => {
  const primaryColor = '#8D7B68';
  const bgColor = '#FDFCFB';
  const textColor = '#2D2D2D';
  const mutedColor = '#808080';
  const accentColor = '#EEEEEE';
  const lightBg = '#F8F5F2';

  const formatDate = (dateStr: string | Date) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  };

  const calculateNights = (inDate: string | Date, outDate: string | Date) => {
    const d1 = new Date(inDate);
    const d2 = new Date(outDate);
    const diff = Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    return isNaN(diff) || diff === 0 ? 1 : diff;
  };

  const formatTime = (dateVal: string | Date, defaultTime: string) => {
    if (!dateVal) return defaultTime;
    
    // Safely convert to string if it's a Date object
    const dateStr = dateVal instanceof Date ? dateVal.toISOString() : String(dateVal);

    if (dateStr.includes('T')) {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    return defaultTime;
  };

  const placedAt = details.placedAt ? new Date(details.placedAt).toLocaleString('en-US', { 
    month: 'numeric', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true 
  }) : formatDate(new Date().toISOString());

  let headerTitle = 'Reservation Details';
  let bottomMessage = 'Your reservation is confirmed. We look forward to welcoming you to Amadiya Leisure.';

  if (type === 'confirmed') {
    headerTitle = 'Reservation Confirmed';
    bottomMessage = 'Great news! Your reservation has been accepted and confirmed by our staff. We look forward to welcoming you to Amadiya Leisure.';
  } else if (type === 'cancelled') {
    headerTitle = 'Reservation Cancelled';
    bottomMessage = 'Your reservation has been cancelled. If you believe this is in error, or if you need help rescheduling, please reach out to us.';
  }

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Inter', -apple-system, sans-serif; background-color: white; color: ${textColor}; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
          .wrapper { width: 100%; table-layout: fixed; background-color: #f6f6f6; padding: 20px 0; }
          .container { width: 100%; max-width: 700px; margin: 0 auto; background-color: white; }
          
          .header { padding: 40px 40px 20px 40px; border-bottom: 1px solid ${accentColor}; }
          .title { font-family: 'Playfair Display', 'Times New Roman', serif; font-style: italic; font-size: 32px; color: ${textColor}; margin: 0; }
          .meta { font-size: 11px; color: ${mutedColor}; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 10px; }
          
          .content { padding: 40px; }
          .section-label { font-size: 11px; font-weight: bold; color: ${mutedColor}; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 25px; padding-bottom: 5px; }
          
          .field-label { font-size: 10px; font-weight: 600; color: ${mutedColor}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
          .field-value { font-size: 18px; font-weight: 500; color: ${textColor}; margin-bottom: 20px; }
          
          .schedule-box { margin-bottom: 30px; }
          .schedule-grid { width: 100%; }
          .schedule-col { width: 50%; vertical-align: top; }
          
          .property-card { display: flex; align-items: center; gap: 15px; margin-bottom: 20px; }
          .property-thumb { width: 48px; height: 48px; border-radius: 8px; object-fit: cover; background-color: ${lightBg}; }
          .property-info { flex: 1; }
          .property-name { font-size: 15px; font-weight: 600; color: ${textColor}; }
          .room-name { font-size: 13px; color: ${mutedColor}; }
          
          .guests-row { font-size: 18px; font-weight: 500; text-align: right; }
          
          .request-box { background-color: ${lightBg}; padding: 25px; border-radius: 20px; color: ${mutedColor}; font-style: italic; font-size: 14px; margin-top: 10px; }
          
          .footer { padding: 30px 40px; border-top: 1px solid ${accentColor}; font-size: 12px; color: ${mutedColor}; text-align: center; }
          
          @media screen and (max-width: 600px) {
            .content { padding: 25px; }
            .schedule-col { width: 100%; display: block; margin-bottom: 20px; }
            .header { padding: 30px 25px; }
            .title { font-size: 26px; }
            .field-value { font-size: 16px; }
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <h1 class="title">${headerTitle}</h1>
              <div class="meta">
                ID: ${details.id} &nbsp; | &nbsp; PLACED: ${placedAt}
              </div>
            </div>
            
            <div class="content">
              <!-- Guest Info and Property Info in two columns for desktop -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 40px;">
                <tr>
                  <td width="55%" valign="top" style="padding-right: 20px;" class="schedule-col">
                    <div class="section-label">Guest Information</div>
                    
                    <div class="field-label">Full Name</div>
                    <div class="field-value">${details.fullName}</div>
                    
                    <div class="field-label">Email Address</div>
                    <div class="field-value" style="word-break: break-all;">${details.email}</div>
                    
                    <div class="field-label">Phone Number</div>
                    <div class="field-value">${details.phone || 'Not provided'}</div>
                  </td>
                  <td width="45%" valign="top" class="schedule-col">
                    <div class="section-label">Property & Room</div>
                    
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
                      <tr>
                        <td width="60" valign="middle">
                          <img src="${details.roomImageUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=100&h=100&fit=crop'}" class="property-thumb" width="48" height="48" alt="Property">
                        </td>
                        <td valign="middle">
                          <div class="property-name">${details.hotelName}</div>
                          <div class="room-name">${details.roomName}</div>
                        </td>
                      </tr>
                    </table>
                    
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top: 1px solid ${accentColor}; padding-top: 15px;">
                      <tr>
                        <td class="field-label" valign="middle">Guests</td>
                        <td class="guests-row" valign="middle">${details.guests} People</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 40px;">
                <tr>
                  <td width="55%" valign="top" style="padding-right: 20px;" class="schedule-col">
                    <div class="section-label">Stay Schedule</div>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="50%" valign="top">
                          <div class="field-label">Check In</div>
                          <div class="field-value" style="margin-bottom: 5px;">${formatDate(details.checkIn)}</div>
                          <div style="font-size: 11px; font-weight: bold; color: ${textColor};">2:00 PM</div>
                        </td>
                        <td width="50%" valign="top">
                          <div class="field-label">Check Out</div>
                          <div class="field-value" style="margin-bottom: 5px;">${formatDate(details.checkOut)}</div>
                          <div style="font-size: 11px; font-weight: bold; color: ${textColor};">11:00 AM</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="45%" valign="top" class="schedule-col">
                    <div class="section-label">Special Requests</div>
                    <div class="request-box">
                      ${details.specialRequests || 'No special requests were noted for this reservation.'}
                    </div>
                  </td>
                </tr>
              </table>
              
              ${details.price ? (() => {
                const nights = calculateNights(details.checkIn, details.checkOut);
                const rooms = details.roomCount || 1;
                const total = details.price * nights * rooms;
                return `
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 30px; background-color: ${lightBg}; border-radius: 16px; overflow: hidden;">
                <tr>
                  <td style="padding: 25px;">
                    <div class="section-label" style="margin-bottom: 16px;">Pricing Summary</div>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-size: 12px; color: ${mutedColor}; padding-bottom: 8px;">Price per night</td>
                        <td style="font-size: 12px; color: ${textColor}; text-align: right; padding-bottom: 8px;">LKR ${details.price.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 12px; color: ${mutedColor}; padding-bottom: 8px;">Rooms / Units</td>
                        <td style="font-size: 12px; color: ${textColor}; text-align: right; padding-bottom: 8px;">${rooms}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 12px; color: ${mutedColor}; padding-bottom: 16px;">Nights</td>
                        <td style="font-size: 12px; color: ${textColor}; text-align: right; padding-bottom: 16px;">${nights}</td>
                      </tr>
                      <tr style="border-top: 1px solid ${accentColor};">
                        <td style="font-size: 15px; font-weight: 700; color: ${textColor}; padding-top: 14px;">Total Amount</td>
                        <td style="font-size: 18px; font-weight: 700; color: ${primaryColor}; text-align: right; padding-top: 14px;">LKR ${total.toLocaleString()}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>`;
              })() : ''}

              <div style="text-align: center; margin-top: 20px;">
                <p style="font-size: 14px; color: ${mutedColor}; line-height: 1.6;">${bottomMessage}</p>
              </div>
            </div>
            
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Amadiya Leisure. Handcrafted Hospitality in Sri Lanka.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
};

export const queueBookingConfirmation = async (dbQuery: any, details: BookingDetails) => {
  try {
    const html = getEmailTemplate(details, 'initial');
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

export const queueBookingAcceptance = async (dbQuery: any, details: BookingDetails) => {
  try {
    const html = getEmailTemplate(details, 'confirmed');
    const subject = `Reservation Confirmed: Your Sanctuary at ${details.hotelName}`;
    
    await dbQuery(
      'INSERT INTO email_queue (recipient, subject, body, status) VALUES ($1, $2, $3, $4)',
      [details.email, subject, html, 'pending']
    );
    console.log(`Acceptance email queued for ${details.email}`);
  } catch (error) {
    console.error('Failed to queue acceptance email:', error);
  }
};

export const queueBookingCancellation = async (dbQuery: any, details: BookingDetails) => {
  try {
    const html = getEmailTemplate(details, 'cancelled');
    const subject = `Reservation Cancelled: ${details.hotelName}`;
    
    await dbQuery(
      'INSERT INTO email_queue (recipient, subject, body, status) VALUES ($1, $2, $3, $4)',
      [details.email, subject, html, 'pending']
    );
    console.log(`Cancellation email queued for ${details.email}`);
  } catch (error) {
    console.error('Failed to queue cancellation email:', error);
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
        
        const attachments: any[] = [];
        let htmlBody = email.body;

        // Custom base64 image extractor to attach images properly for email clients (Gmail)
        const base64Regex = /src="data:(image\/[^;]+);base64,([^"]+)"/g;
        let cidCounter = 1;

        htmlBody = htmlBody.replace(base64Regex, (match: string, mimeType: string, base64Data: string) => {
          const cid = `embedded_img_${cidCounter++}`;
          const extension = mimeType.split('/')[1] || 'png';
          attachments.push({
            filename: `image_${cidCounter - 1}.${extension}`,
            content: Buffer.from(base64Data, 'base64'),
            cid: cid
          });
          return `src="cid:${cid}"`;
        });

        await transporter.sendMail({
          from: `"Amadiya Leisure" <${process.env.SMTP_USER}>`,
          to: email.recipient,
          subject: email.subject,
          html: htmlBody,
          attachments: attachments.length > 0 ? attachments : undefined
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
