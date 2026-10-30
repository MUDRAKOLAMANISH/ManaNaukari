const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

// In-memory idempotency tracker for function warm state
const sentWelcomeEmails = new Set<string>();

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const { email, name } = JSON.parse(event.body || '{}');

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Valid email address is required.' }),
      };
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name || '').trim();
    const greetingName = cleanName ? cleanName : 'there';

    // Check duplicate welcome email prevention (idempotency)
    if (sentWelcomeEmails.has(cleanEmail)) {
      console.log(`[Welcome Email] Already sent welcome email to ${cleanEmail}. Skipping duplicate request.`);
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          message: 'Welcome email already sent for this account.',
          skipped: true,
        }),
      };
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.warn('[Welcome Email] RESEND_API_KEY is not configured in Netlify environment. Account created successfully without email.');
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          message: 'RESEND_API_KEY not configured in environment settings.',
          skipped: true,
        }),
      };
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    const plainTextContent = `Hi ${greetingName},

Welcome to ManaCarrier!

We're excited to help you take the next step in your career.

With ManaCarrier, you can explore:
• Job opportunities for freshers and experienced candidates.
• Internships and work-from-home opportunities.
• Career development resources.
• Resume and portfolio services.
• AI-powered career planning and interview preparation, where available.

Visit ManaCarrier to explore the opportunities and services available to you.

Website: https://manacarrier.netlify.app/

Wishing you success in your career journey!

Best regards,
Team ManaCarrier`;

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Welcome to ManaCarrier</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 24px; margin: 0; line-height: 1.6;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="margin-bottom: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px;">
      <h2 style="color: #2563eb; margin: 0 0 6px 0; font-size: 24px; font-weight: 800;">ManaCarrier</h2>
      <span style="display: inline-block; background-color: #eff6ff; color: #1d4ed8; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px;">
        Career Account Activated 🚀
      </span>
    </div>

    <p style="font-size: 15px; margin-top: 0; margin-bottom: 16px; font-weight: 600;">
      Hi ${greetingName},
    </p>

    <p style="font-size: 15px; margin-bottom: 20px; color: #334155;">
      Welcome to <strong>ManaCarrier</strong>! We're excited to help you take the next step in your career.
    </p>

    <p style="font-size: 15px; margin-bottom: 12px; font-weight: 700; color: #0f172a;">
      With ManaCarrier, you can explore:
    </p>

    <ul style="padding-left: 0; list-style: none; margin: 0 0 24px 0;">
      <li style="padding: 8px 0; font-size: 14px; border-bottom: 1px border-dashed #f1f5f9;">• Job opportunities for freshers and experienced candidates.</li>
      <li style="padding: 8px 0; font-size: 14px; border-bottom: 1px border-dashed #f1f5f9;">• Internships and work-from-home opportunities.</li>
      <li style="padding: 8px 0; font-size: 14px; border-bottom: 1px border-dashed #f1f5f9;">• Career development resources.</li>
      <li style="padding: 8px 0; font-size: 14px; border-bottom: 1px border-dashed #f1f5f9;">• Resume and portfolio services.</li>
      <li style="padding: 8px 0; font-size: 14px;">• AI-powered career planning and interview preparation, where available.</li>
    </ul>

    <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 14px; padding: 20px; margin-bottom: 24px; text-align: center;">
      <p style="font-size: 14px; color: #334155; margin: 0 0 14px 0;">
        Visit ManaCarrier to explore the opportunities and services available to you.
      </p>
      <a href="https://manacarrier.netlify.app/" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 12px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
        Explore ManaCarrier ↗
      </a>
    </div>

    <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 14px;">
      <p style="margin: 0 0 4px 0; color: #64748b;">Wishing you success in your career journey!</p>
      <p style="margin: 0; font-weight: 700; color: #0f172a;">Best regards,<br>Team ManaCarrier</p>
    </div>
  </div>
</body>
</html>`;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: cleanEmail,
        subject: 'Welcome to ManaCarrier – Your Career Journey Starts Here!',
        text: plainTextContent,
        html: htmlContent,
      }),
    });

    const responseText = await resendResponse.text();
    let resendData: any = null;
    try {
      resendData = JSON.parse(responseText);
    } catch {
      resendData = { raw: responseText };
    }

    if (!resendResponse.ok) {
      console.warn('[Welcome Email Warning] Resend status:', resendResponse.status, resendData?.message || responseText);
      
      // Sandbox testing domain notice
      if (resendResponse.status === 403 && responseText.includes('resend.com/domains')) {
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            success: false,
            warning: 'Resend domain verification required for arbitrary recipients. Account created successfully.',
            skipped: true,
          }),
        };
      }

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          error: `Email delivery warning: ${resendData?.message || responseText}`,
        }),
      };
    }

    sentWelcomeEmails.add(cleanEmail);
    console.log(`[Welcome Email Success] Dispatched welcome email to ${cleanEmail}`);

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        data: resendData,
      }),
    };
  } catch (err: any) {
    console.error('[Welcome Email Exception]:', err?.message || err);
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        error: err?.message || 'Error executing welcome email request.',
      }),
    };
  }
};
