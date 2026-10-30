const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

async function verifyAdminNetlifyRequest(event: any, supabaseUrl: string, supabaseAnonKey: string): Promise<boolean> {
  const headers = event.headers || {};
  const authHeader = headers.authorization || headers.Authorization || '';

  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return false;
  }

  const token = authHeader.substring(7).trim();
  if (!token || !supabaseUrl || !supabaseAnonKey) return false;

  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!userRes.ok) return false;
    const userData = await userRes.json();
    const email = userData?.email?.toLowerCase();
    if (!email) return false;

    const adminRes = await fetch(`${supabaseUrl}/rest/v1/admin_users?email=eq.${encodeURIComponent(email)}&select=id`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    });

    if (!adminRes.ok) return false;
    const adminData = await adminRes.json();
    return Array.isArray(adminData) && adminData.length > 0;
  } catch {
    return false;
  }
}

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  const path = event.path || '';
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

  // 1. Delivery Stats
  if (event.httpMethod === 'GET' || path.endsWith('delivery-stats')) {
    const isAdmin = await verifyAdminNetlifyRequest(event, supabaseUrl, supabaseAnonKey);
    if (!isAdmin) {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          error: 'Forbidden: Access restricted strictly to verified ManaCarrier administrators.',
        }),
      };
    }

    let totalSubscribers = 0;
    let activeSubscribers = 0;
    let logs: any[] = [];

    if (supabaseUrl && supabaseServiceKey) {
      try {
        const [subRes, logRes] = await Promise.all([
          fetch(`${supabaseUrl}/rest/v1/job_alert_subscribers?select=id,is_active`, {
            headers: {
              apikey: supabaseServiceKey,
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
          }),
          fetch(`${supabaseUrl}/rest/v1/daily_job_reminder_logs?select=*&order=created_at.desc&limit=50`, {
            headers: {
              apikey: supabaseServiceKey,
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
          }),
        ]);

        if (subRes.ok) {
          const subs = await subRes.json();
          totalSubscribers = subs.length;
          activeSubscribers = subs.filter((s: any) => s.is_active !== false).length;
        }

        if (logRes.ok) {
          logs = await logRes.json();
        }
      } catch (err) {
        console.warn('[alerts.ts delivery-stats] Supabase fetch warning:', err);
      }
    }

    const successfulDeliveries = logs.filter((l) => l.status === 'sent' || l.status === 'delivered').length;
    const actualDeliveredCount = logs.filter((l) => l.status === 'delivered').length;
    const bouncedCount = logs.filter((l) => l.status === 'bounced').length;
    const failedDeliveries = logs.filter((l) => l.status === 'failed' || l.status === 'bounced').length;

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        data: {
          totalAlertsSent: logs.length,
          totalSubscribers,
          activeSubscribers,
          successfulDeliveries,
          actualDeliveredCount,
          bouncedCount,
          failedDeliveries,
          recentDeliveries: logs,
        },
      }),
    };
  }

  // 2. Public Subscribe Endpoint
  if (path.endsWith('/subscribe') || path.includes('subscribe')) {
    try {
      const { email, categories, frequency } = JSON.parse(event.body || '{}');
      const cleanEmail = (email || '').trim().toLowerCase();

      if (!cleanEmail || !cleanEmail.includes('@')) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: false, message: 'Valid email address is required.' }),
        };
      }

      if (supabaseUrl && supabaseAnonKey) {
        const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/subscribe_job_alerts`, {
          method: 'POST',
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            p_email: cleanEmail,
            p_categories: Array.isArray(categories) ? categories : ['Freshers'],
            p_frequency: frequency || 'daily',
          }),
        });

        if (rpcRes.ok) {
          const rpcData = await rpcRes.json();
          return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify(rpcData),
          };
        }
      }

      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, message: 'Unable to save subscription.' }),
      };
    } catch (err: any) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, message: err.message }),
      };
    }
  }

  // 3. Welcome Email Dispatch
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
          subject: 'Welcome to ManaCarrier Job Alerts 🚀',
          text: `Hello,\n\nThank you for subscribing to ManaCarrier Job Alerts.\n\nPreferences: ${selectedPrefs} (${alertFrequency})\n\nBest regards,\nTeam ManaCarrier`,
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

  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ success: true, message: 'Processed' }),
  };
};
