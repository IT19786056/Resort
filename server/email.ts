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
  total?: string; // Added to support the new "Total: [Amount]" requirement
}

const createTransporter = () => {
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
    auth: { user, pass }
  });
};

const getEmailTemplate = (details: BookingDetails) => {
  const primaryColor = '#C5A28E'; // Muted Gold
  const bgColor = '#F9F7F2';      // Warm off-white
  const textColor = '#2D2D2D';    // Charcoal
  const accentColor = '#D9D2C6';  // Light Beige/Grey

  // Formatting dates beautifully
  const checkInDate = new Date(details.checkIn).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const checkOutDate = new Date(details.checkOut).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          /* Reset and Base Styles */
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: ${bgColor}; color: ${textColor}; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
          table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
          a { text-decoration: none; color: ${primaryColor}; }
          
          /* Typography */
          h1, h2, h3 { font-family: 'Georgia', 'Times New Roman', serif; font-weight: normal; margin: 0; }
          p { line-height: 1.6; margin: 0 0 20px 0; color: #4A4A4A; }
          
          /* Layout */
          .wrapper { width: 100%; table-layout: fixed; background-color: ${bgColor}; padding: 40px 20px; }
          .main { background: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border: 1px solid ${accentColor}; }
          
          /* Sections */
          .header { padding: 50px 40px; text-align: center; border-bottom: 1px solid ${accentColor}; }
          .header h1 { font-size: 36px; color: ${textColor}; letter-spacing: 1px; }
          .content { padding: 50px 40px; }
          
          /* Utilities */
          .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: ${primaryColor}; font-weight: bold; margin-bottom: 25px; text-align: center; }
          .divider { border-bottom: 1px solid ${accentColor}; margin: 40px 0; }
          
          /* Buttons */
          .btn-container { text-align: center; margin-top: 40px; }
          .btn { display: inline-block; background-color: ${textColor}; color: #ffffff; text-decoration: none; padding: 16px 40px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.15em; transition: background-color 0.3s; }
          
          /* Footer */
          .footer { padding: 40px; background-color: ${bgColor}; text-align: center; border-top: 1px solid ${accentColor}; }
          .footer p { font-size: 11px; color: #888888; text-transform: uppercase; letter-spacing: 0.1em; margin: 0; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <table class="main" align="center" width="100%" cellpadding="0" cellspacing="0">
            <!-- Header -->
            <tr>
              <td class="header">
                <h1>${details.hotelName}</h1>
              </td>
            </tr>
            
            <!-- Body Content -->
            <tr>
              <td class="content">
                <p style="font-family: 'Georgia', serif; font-size: 20px; color: ${textColor}; margin-bottom: 25px;">
                  Dear ${details.fullName},
                </p>
                <p>
                  Your reservation at ${details.hotelName} is confirmed, and we’re already getting everything ready for your stay.
                </p>
                
                <div class="divider"></div>
                
                <!-- Your Stay Details -->
                <div class="section-title">Your Stay</div>
                
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                  <tr>
                    <td style="padding: 15px 0; border-bottom: 1px solid #F0ECE4; font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 0.05em;" width="35%">Confirmation</td>
                    <td style="padding: 15px 0; border-bottom: 1px solid #F0ECE4; font-size: 15px; color: ${textColor}; text-align: right;">${details.id}</td>
                  </tr>
                  <tr>
                    <td style="padding: 15px 0; border-bottom: 1px solid #F0ECE4; font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 0.05em;">Arrival</td>
                    <td style="padding: 15px 0; border-bottom: 1px solid #F0ECE4; font-size: 15px; color: ${textColor}; text-align: right;">${checkInDate}<br><span style="font-size: 13px; color: #888;">from 3:00 PM</span></td>
                  </tr>
                  <tr>
                    <td style="padding: 15px 0; border-bottom: 1px solid #F0ECE4; font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 0.05em;">Departure</td>
                    <td style="padding: 15px 0; border-bottom: 1px solid #F0ECE4; font-size: 15px; color: ${textColor}; text-align: right;">${checkOutDate}<br><span style="font-size: 13px; color: #888;">by 11:00 AM</span></td>
                  </tr>
                  <tr>
                    <td style="padding: 15px 0; border-bottom: 1px solid #F0ECE4; font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 0.05em;">Accommodation</td>
                    <td style="padding: 15px 0; border-bottom: 1px solid #F0ECE4; font-size: 15px; color: ${textColor}; text-align: right;">${details.roomName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 15px 0; ${details.total ? 'border-bottom: 1px solid #F0ECE4;' : ''} font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 0.05em;">Guests</td>
                    <td style="padding: 15px 0; ${details.total ? 'border-bottom: 1px solid #F0ECE4;' : ''} font-size: 15px; color: ${textColor}; text-align: right;">${details.guests}</td>
                  </tr>
                  ${details.total ? `
                  <tr>
                    <td style="padding: 15px 0; font-size: 13px; color: ${primaryColor}; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;">Total</td>
                    <td style="padding: 15px 0; font-size: 16px; color: ${textColor}; font-weight: bold; text-align: right;">${details.total}</td>
                  </tr>
                  ` : ''}
                </table>

                <div class="divider"></div>

                <!-- Elevate Your Experience -->
                <div class="section-title">Elevate your experience</div>
                <p style="text-align: center; margin-bottom: 30px;">
                  Our concierge has curated these additions to make your stay even more memorable:
                </p>

                <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 auto; max-width: 450px;">
                  <tr>
                    <td width="30" valign="top" style="padding-bottom: 15px; color: ${primaryColor}; font-size: 14px;">✦</td>
                    <td style="padding-bottom: 15px; font-size: 14px; color: #4A4A4A;">Private airport transfer in our luxury vehicle fleet</td>
                  </tr>
                  <tr>
                    <td width="30" valign="top" style="padding-bottom: 15px; color: ${primaryColor}; font-size: 14px;">✦</td>
                    <td style="padding-bottom: 15px; font-size: 14px; color: #4A4A4A;">In-room champagne and delicate canapés on arrival</td>
                  </tr>
                  <tr>
                    <td width="30" valign="top" style="padding-bottom: 15px; color: ${primaryColor}; font-size: 14px;">✦</td>
                    <td style="padding-bottom: 15px; font-size: 14px; color: #4A4A4A;">Couples spa treatment at our award-winning wellness center</td>
                  </tr>
                </table>
                
                <div class="btn-container">
                  <a href="${process.env.VITE_APP_URL || '#'}" class="btn">Manage Your Stay</a>
                </div>

              </td>
            </tr>
            
            <!-- Footer -->
            <tr>
              <td class="footer">
                <p>&copy; ${new Date().getFullYear()} ${details.hotelName}. Handcrafted Hospitality.</p>
              </td>
            </tr>
          </table>
        </div>
      </body>
    </html>
  `;
};

export const queueBookingConfirmation = async (dbQuery: any, details: BookingDetails) => {
  try {
    const html = getEmailTemplate(details);
    // Updated subject line per your requirements
    const subject = `We're preparing for your arrival – ${details.hotelName} #${details.id}`;
    
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
  if (!transporter) return;

  let client;
  try {
    client = await pool.connect();
    
    const result = await client.query(
      `UPDATE email_queue 
       SET status = 'processing', "processedAt" = CURRENT_TIMESTAMP
       WHERE id IN (
         SELECT id FROM email_queue 
         WHERE status = 'pending' 
         AND attempts < 3
         LIMIT 5 
         FOR UPDATE SKIP LOCKED
       )
       RETURNING *`
    );

    for (const email of result.rows) {
      try {
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
        console.log(`Email sent from queue: ${email.recipient}`);
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