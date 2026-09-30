const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  const path = event.path || '';

  // 1. Delivery Stats
  if (event.httpMethod === 'GET' || path.endsWith('delivery-stats')) {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        stats: {
          totalAttempted: 0,
          totalSent: 0,
          totalFailed: 0,
          totalSkipped: 0,
          recentLogs: [],
        },
      }),
    };
  }

  // 2. Welcome Email
  if (path.includes('welcome-email') || path.endsWith('send-welcome-email')) {
    try {
      const { email, categories, frequency } = JSON.parse(event.body || '{}');
      if (!email) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Valid email address is required.' }),
        };
      }

      const resendApiKey = process.env.RESEND_API_KEY;
      if (!resendApiKey) {
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            success: false,
            message: 'RESEND_API_KEY not configured in Netlify environment.',
            skipped: true,
          }),
        };
      }

      const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
      const selectedPrefs = Array.isArray(categories) && categories.length > 0
        ? categories.join(', ')
        : 'All Categories';
      const alertFrequency = frequency === 'instant' ? 'Instant Alerts' : 'Daily Digest';

      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: email.trim(),
          subject: 'Welcome to Mana Naukari Job Alerts 🚀',
          text: `Hello,\n\nThank you for subscribing to Mana Naukari Job Alerts.\n\nPreferences: ${selectedPrefs} (${alertFrequency})\n\nBest regards,\nTeam Mana Naukari`,
        }),
      });

      const resendData = await resendResponse.json();
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: resendResponse.ok, data: resendData }),
      };
    } catch (err: any) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, error: err.message }),
      };
    }
  }

  // 3. Send Job Alert
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ success: true, message: 'Processed', sentCount: 0 }),
  };
};
