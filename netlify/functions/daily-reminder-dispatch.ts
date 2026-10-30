import { createClient } from '@supabase/supabase-js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-cron-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

async function verifyAdminNetlifyRequest(event: any, supabaseUrl: string, supabaseAnonKey: string): Promise<boolean> {
  const headers = event.headers || {};
  const authHeader = headers.authorization || headers.Authorization || '';
  const cronSecretHeader = headers['x-cron-secret'] || headers['X-Cron-Secret'] || '';
  const expectedCronSecret = process.env.CRON_SECRET || '';

  if (expectedCronSecret && cronSecretHeader === expectedCronSecret) {
    return true;
  }

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
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, error: 'Method Not Allowed' }),
    };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
  const resendApiKey = process.env.RESEND_API_KEY || '';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const appBaseUrl = process.env.APP_URL || 'https://manacarrier.netlify.app';

  // Server-side Admin Verification
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

  let body: any = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    body = {};
  }

  const { test_email, is_test } = body;

  try {
    // 1. Fetch active jobs from Supabase
    let activeJobs: any[] = [];
    if (supabaseUrl && supabaseAnonKey) {
      const jobsRes = await fetch(`${supabaseUrl}/rest/v1/jobs?status=eq.active&order=created_at.desc&limit=6`, {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      });
      if (jobsRes.ok) {
        activeJobs = await jobsRes.json();
      }
    }

    const todayStr = new Date().toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const todayYmd = new Date().toISOString().split('T')[0];

    // 2. Send Test Email
    if (is_test) {
      const recipient = (test_email || '').trim().toLowerCase();
      if (!recipient || !recipient.includes('@')) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: false, error: 'Valid test email address is required.' }),
        };
      }

      if (!resendApiKey) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: false, error: 'RESEND_API_KEY is not configured in Netlify environment variables.' }),
        };
      }

      const jobsListHtml = activeJobs.length > 0
        ? activeJobs.map((job) => `
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: start; gap: 8px;">
              <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: #0f172a;">${job.title}</h4>
              <span style="font-size: 11px; font-weight: 700; color: #2563eb; background: #eff6ff; padding: 2px 8px; border-radius: 9999px;">${job.category || 'General'}</span>
            </div>
            <p style="margin: 4px 0 10px 0; font-size: 13px; color: #475569; font-weight: 600;">🏢 ${job.company || 'Company'}</p>
            <a href="${job.apply_link || `${appBaseUrl}/jobs/${job.id}`}" target="_blank" style="display: inline-block; background: #2563eb; color: #ffffff; font-size: 12px; font-weight: 700; padding: 8px 16px; border-radius: 8px; text-decoration: none;">Apply Now ↗</a>
          </div>
        `).join('')
        : '<p style="font-size: 14px; color: #64748b;">No active jobs currently in database.</p>';

      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<body style="font-family: system-ui, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 28px; border: 1px solid #e2e8f0;">
    <h2 style="color: #2563eb; margin: 0 0 4px 0;">Mana Career</h2>
    <span style="font-size: 11px; font-weight: 700; color: #15803d; background: #f0fdf4; padding: 2px 8px; border-radius: 9999px;">Daily Job Digest - ${todayStr}</span>
    <p style="margin-top: 16px; font-size: 14px;">Here are today's top genuine job openings curated for you on Mana Career:</p>
    ${jobsListHtml}
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
    <p style="font-size: 11px; color: #94a3b8; text-align: center;">You are receiving this test email from Mana Career Admin. <a href="${appBaseUrl}/unsubscribe?email=${encodeURIComponent(recipient)}" style="color: #2563eb;">Unsubscribe</a></p>
  </div>
</body>
</html>`;

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: recipient,
          subject: `Daily Job Reminder - Mana Career (${todayStr}) [Test]`,
          html: htmlContent,
        }),
      });

      const resData = await resendRes.json();
      if (!resendRes.ok) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ success: false, error: resData.message || 'Resend error sending test email' }),
        };
      }

      // Record test run & delivery log
      if (supabaseUrl && supabaseServiceKey) {
        try {
          const runRes = await fetch(`${supabaseUrl}/rest/v1/daily_job_reminder_runs`, {
            method: 'POST',
            headers: {
              apikey: supabaseServiceKey,
              Authorization: `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
              Prefer: 'return=representation',
            },
            body: JSON.stringify({
              run_date: todayYmd,
              status: 'completed',
              total_subscribers: 1,
              emails_sent: 1,
              emails_failed: 0,
              jobs_included_count: activeJobs.length,
              is_test: true,
              started_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
            }),
          });

          let runId = null;
          if (runRes.ok) {
            const runArr = await runRes.json();
            if (runArr && runArr[0]) runId = runArr[0].id;
          }

          await fetch(`${supabaseUrl}/rest/v1/daily_job_reminder_logs`, {
            method: 'POST',
            headers: {
              apikey: supabaseServiceKey,
              Authorization: `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              run_id: runId,
              run_date: todayYmd,
              recipient_email: recipient,
              status: 'sent',
              resend_id: resData.id,
              created_at: new Date().toISOString(),
            }),
          });
        } catch (dbErr) {
          console.warn('[daily-reminder-dispatch] Log write warning:', dbErr);
        }
      }

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          message: 'Test daily job reminder email sent!',
          jobs_count: activeJobs.length,
          resend_id: resData.id,
        }),
      };
    }

    // 3. Batch Dispatch
    let subscribers: any[] = [];
    if (supabaseUrl && supabaseServiceKey) {
      const subRes = await fetch(`${supabaseUrl}/rest/v1/job_alert_subscribers?is_active=neq.false`, {
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
      });
      if (subRes.ok) {
        subscribers = await subRes.json();
      }
    }

    let sentCount = 0;
    let failedCount = 0;

    if (resendApiKey && subscribers.length > 0) {
      for (const sub of subscribers) {
        const recipient = (sub.email || '').trim().toLowerCase();
        if (!recipient) continue;

        const userCategories = Array.isArray(sub.categories) ? sub.categories : [];
        const matchedJobs = activeJobs.filter((j) =>
          userCategories.length === 0 ||
          userCategories.includes('All') ||
          userCategories.some((c: string) => c.toLowerCase() === (j.category || '').toLowerCase())
        );

        const jobsListHtml = (matchedJobs.length > 0 ? matchedJobs : activeJobs).map((job) => `
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: start; gap: 8px;">
              <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: #0f172a;">${job.title}</h4>
              <span style="font-size: 11px; font-weight: 700; color: #2563eb; background: #eff6ff; padding: 2px 8px; border-radius: 9999px;">${job.category || 'General'}</span>
            </div>
            <p style="margin: 4px 0 10px 0; font-size: 13px; color: #475569; font-weight: 600;">🏢 ${job.company || 'Company'}</p>
            <a href="${job.apply_link || `${appBaseUrl}/jobs/${job.id}`}" target="_blank" style="display: inline-block; background: #2563eb; color: #ffffff; font-size: 12px; font-weight: 700; padding: 8px 16px; border-radius: 8px; text-decoration: none;">Apply Now ↗</a>
          </div>
        `).join('');

        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<body style="font-family: system-ui, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 28px; border: 1px solid #e2e8f0;">
    <h2 style="color: #2563eb; margin: 0 0 4px 0;">Mana Career</h2>
    <span style="font-size: 11px; font-weight: 700; color: #15803d; background: #f0fdf4; padding: 2px 8px; border-radius: 9999px;">Daily Job Digest - ${todayStr}</span>
    <p style="margin-top: 16px; font-size: 14px;">Here are today's top genuine job openings curated for you on Mana Career:</p>
    ${jobsListHtml}
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
    <p style="font-size: 11px; color: #94a3b8; text-align: center;">You are receiving this daily job digest from Mana Career. <a href="${appBaseUrl}/unsubscribe?email=${encodeURIComponent(recipient)}" style="color: #2563eb;">Unsubscribe</a></p>
  </div>
</body>
</html>`;

        try {
          const dispatchRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey.trim()}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: fromEmail,
              to: recipient,
              subject: `Daily Job Digest - Mana Career (${todayStr})`,
              html: htmlContent,
            }),
          });

          const dispatchData = await dispatchRes.json();
          if (dispatchRes.ok) {
            sentCount++;
            if (supabaseUrl && supabaseServiceKey) {
              await fetch(`${supabaseUrl}/rest/v1/daily_job_reminder_logs`, {
                method: 'POST',
                headers: {
                  apikey: supabaseServiceKey,
                  Authorization: `Bearer ${supabaseServiceKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  run_date: todayYmd,
                  recipient_email: recipient,
                  status: 'sent',
                  resend_id: dispatchData.id,
                  created_at: new Date().toISOString(),
                }),
              });
            }
          } else {
            failedCount++;
          }
        } catch {
          failedCount++;
        }
      }
    }

    if (supabaseUrl && supabaseServiceKey) {
      await fetch(`${supabaseUrl}/rest/v1/daily_job_reminder_runs`, {
        method: 'POST',
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          run_date: todayYmd,
          status: 'completed',
          total_subscribers: subscribers.length,
          emails_sent: sentCount,
          emails_failed: failedCount,
          jobs_included_count: activeJobs.length,
          is_test: false,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        }),
      });
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        message: `Batch dispatch finished: ${sentCount} sent, ${failedCount} failed.`,
        total_subscribers: subscribers.length,
        emails_sent: sentCount,
        emails_failed: failedCount,
        jobs_count: activeJobs.length,
        skipped: false,
      }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, error: err.message || 'Failed to dispatch daily reminder.' }),
    };
  }
};
