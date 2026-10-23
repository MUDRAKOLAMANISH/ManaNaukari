// @ts-nocheck
// Supabase Edge Function: daily-job-reminder
// Automatically invoked daily at 9:00 AM IST via pg_cron or manually via Admin UI
// Location: supabase/functions/daily-job-reminder/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  test_email?: string;
  is_test?: boolean;
  force_run?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const cronSecret = Deno.env.get("CRON_SECRET")?.trim() || "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
    const appUrl = Deno.env.get("APP_URL") || "https://mana-naukari.netlify.app";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Supabase environment variables missing." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fail closed: Require dedicated high-entropy CRON_SECRET
    if (!cronSecret) {
      console.error("[Daily Job Reminder] CRON_SECRET environment variable is missing.");
      return new Response(
        JSON.stringify({ error: "Server Configuration Error: CRON_SECRET is not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Strict Authorization Check: Validate incoming Authorization header strictly against CRON_SECRET
    const authHeader = req.headers.get("Authorization") || "";
    const incomingToken = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!incomingToken || incomingToken !== cronSecret) {
      console.warn("[Daily Job Reminder] Unauthorized invocation attempt blocked.");
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid or missing Bearer CRON_SECRET." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body: RequestBody = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const { test_email, is_test = false, force_run = false } = body;

    // Calculate today's date in IST (Asia/Kolkata timezone: UTC + 5:30)
    const nowUtc = new Date();
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(nowUtc.getTime() + istOffsetMs);
    const runDate = istDate.toISOString().split("T")[0]; // YYYY-MM-DD

    console.log(`[Daily Job Reminder] Starting run for date: ${runDate} (is_test: ${is_test}, test_email: ${test_email || 'none'})`);

    // Step 1: Idempotency Check (Skip if already completed for today unless forced or test run)
    if (!is_test && !force_run) {
      const { data: existingRun } = await supabase
        .from("daily_job_reminder_runs")
        .select("id, status")
        .eq("run_date", runDate)
        .eq("status", "completed")
        .maybeSingle();

      if (existingRun) {
        console.log(`[Daily Job Reminder] Already completed run for ${runDate}. Skipping duplicate execution.`);
        return new Response(
          JSON.stringify({
            success: true,
            message: `Daily job reminder already completed for ${runDate}. Duplicate run prevented.`,
            skipped: true,
            run_date: runDate,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Step 2: Fetch Active Genuine Jobs from `jobs` table
    const { data: activeJobs, error: jobsErr } = await supabase
      .from("jobs")
      .select("id, title, company, location, salary, experience, job_type, category, description, apply_link, posted_date, created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(10);

    if (jobsErr) {
      console.error("[Daily Job Reminder] Error fetching active jobs:", jobsErr);
      return new Response(
        JSON.stringify({ error: `Failed to fetch active jobs: ${jobsErr.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!activeJobs || activeJobs.length === 0) {
      console.log("[Daily Job Reminder] No active jobs found. Skipping email sending.");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No active jobs found in jobs table today.",
          jobs_count: 0,
          run_date: runDate,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Daily Job Reminder] Found ${activeJobs.length} active jobs.`);

    // Step 3: Fetch Subscribers
    let subscribers: Array<{ id?: string; email: string; categories?: string[]; frequency?: string }> = [];

    if (is_test && test_email) {
      // Test Mode: Send only to designated test_email
      subscribers = [{ email: test_email.trim().toLowerCase(), categories: ["All"], frequency: "daily" }];
    } else {
      // Production Mode: Fetch active subscribers
      const { data: subData, error: subErr } = await supabase
        .from("job_alert_subscribers")
        .select("id, email, categories, frequency, is_active, unsubscribe_token")
        .eq("is_active", true);

      if (subErr) {
        console.error("[Daily Job Reminder] Error fetching subscribers:", subErr);
        return new Response(
          JSON.stringify({ error: `Failed to fetch subscribers: ${subErr.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      subscribers = subData || [];
    }

    if (!subscribers || subscribers.length === 0) {
      console.log("[Daily Job Reminder] No active subscribers found.");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No active subscribers found.",
          subscribers_count: 0,
          run_date: runDate,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Daily Job Reminder] Processing ${subscribers.length} subscriber(s)...`);

    // Log Run Start into daily_job_reminder_runs table
    let runId: string | null = null;
    if (!is_test) {
      const { data: runRecord } = await supabase
        .from("daily_job_reminder_runs")
        .insert({
          run_date: runDate,
          status: "running",
          total_subscribers: subscribers.length,
          jobs_included_count: activeJobs.length,
          jobs_summary: activeJobs.map(j => ({ id: j.id, title: j.title, company: j.company })),
          started_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (runRecord) runId = runRecord.id;
    }

    // Step 4: Dispatch Emails via Resend API
    let sentCount = 0;
    let failedCount = 0;
    const deliveryLogs: any[] = [];

    for (const sub of subscribers) {
      const recipientEmail = sub.email.trim().toLowerCase();
      const token = sub.unsubscribe_token || sub.id;
      const unsubscribeUrl = token
        ? `${appUrl}/unsubscribe?token=${encodeURIComponent(token)}`
        : `${appUrl}/unsubscribe`;

      // Filter jobs matching subscriber categories if specific categories are set
      let matchedJobs = activeJobs;
      if (sub.categories && sub.categories.length > 0 && !sub.categories.includes("All")) {
        const lowerCats = sub.categories.map((c: string) => c.toLowerCase());
        const filtered = activeJobs.filter(j => 
          lowerCats.some((cat: string) => 
            j.category?.toLowerCase().includes(cat) || 
            j.job_type?.toLowerCase().includes(cat) || 
            j.title?.toLowerCase().includes(cat)
          )
        );
        if (filtered.length > 0) {
          matchedJobs = filtered;
        }
      }

      // Limit to top 5 most relevant jobs per email
      const jobsToInclude = matchedJobs.slice(0, 5);

      // Construct HTML Content with Mana Career Branding
      const jobsHtml = jobsToInclude.map(j => `
        <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
            <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #0f172a;">${j.title}</h3>
            <span style="background-color: #eff6ff; color: #2563eb; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 6px;">
              ${j.job_type || 'Fresher'}
            </span>
          </div>
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #475569; font-weight: 600;">
            🏢 ${j.company} &nbsp;•&nbsp; 📍 ${j.location || 'Pan India'} ${j.salary ? `&nbsp;•&nbsp; 💰 ${j.salary}` : ''}
          </p>
          <a href="${j.apply_link}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 700; padding: 8px 16px; border-radius: 8px;">
            Apply Directly ↗
          </a>
        </div>
      `).join('');

      const plainTextJobs = jobsToInclude.map(j => 
        `• ${j.title} at ${j.company}\n  Location: ${j.location || 'Pan India'} | Type: ${j.job_type || 'Fresher'}\n  Apply Link: ${j.apply_link}\n`
      ).join('\n');

      const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Daily Job Openings – Mana Career</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 24px; margin: 0; line-height: 1.5;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 28px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
    
    <!-- Brand Header -->
    <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 20px;">
      <h2 style="color: #1e3a8a; margin: 0; font-size: 24px; font-weight: 800;">
        Mana<span style="color: #2563eb;">Career</span>
      </h2>
      <p style="margin: 2px 0 0 0; font-size: 12px; font-weight: 600; color: #64748b;">
        Your Career. Your Future. &nbsp;•&nbsp; Daily Verified Job Digest
      </p>
    </div>

    <p style="font-size: 15px; margin-top: 0; margin-bottom: 16px; font-weight: 600;">
      Hello Job Seeker,
    </p>

    <p style="font-size: 14px; color: #334155; margin-bottom: 20px;">
      Here are today's top genuine fresher, internship, and technology job openings curated for you:
    </p>

    <!-- Job Cards -->
    ${jobsHtml}

    <div style="background-color: #f1f5f9; border-radius: 12px; padding: 16px; margin-top: 24px; text-align: center;">
      <p style="font-size: 13px; color: #475569; margin: 0 0 10px 0;">
        Looking for more opportunities? Browse all verified jobs on Mana Career.
      </p>
      <a href="${appUrl}/jobs" target="_blank" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 700; padding: 10px 20px; border-radius: 8px;">
        Explore All ${activeJobs.length}+ Jobs
      </a>
    </div>

    <!-- Unsubscribe Footer -->
    <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
      <p style="margin: 0 0 4px 0;">
        You received this email because you subscribed to daily job alerts on Mana Career.
      </p>
      <p style="margin: 0;">
        <a href="${unsubscribeUrl}" target="_blank" style="color: #64748b; text-decoration: underline;">
          Unsubscribe from Daily Job Alerts
        </a>
      </p>
    </div>

  </div>
</body>
</html>`;

      const plainTextBody = `Mana Career – Daily Verified Job Digest
Your Career. Your Future.

Hello Job Seeker,

Here are today's top genuine job openings curated for you:

${plainTextJobs}

Browse all active jobs: ${appUrl}/jobs

To unsubscribe from daily alerts, click here: ${unsubscribeUrl}

Best regards,
Team Mana Career`;

      if (resendApiKey) {
        try {
          const resendRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendApiKey.trim()}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Mana Career <onboarding@resend.dev>",
              to: recipientEmail,
              subject: `⚡ Daily Job Alerts: ${jobsToInclude[0]?.title || 'Fresh Openings'} & More - Mana Career`,
              text: plainTextBody,
              html: htmlBody,
            }),
          });

          const resendData = await resendRes.json();

          if (resendRes.ok) {
            sentCount++;
            deliveryLogs.push({
              run_date: runDate,
              recipient_email: recipientEmail,
              status: "sent",
              resend_id: resendData.id || null,
              created_at: new Date().toISOString(),
            });
          } else {
            failedCount++;
            deliveryLogs.push({
              run_date: runDate,
              recipient_email: recipientEmail,
              status: "failed",
              error_message: resendData?.message || "Resend API error",
              created_at: new Date().toISOString(),
            });
          }
        } catch (sendErr: any) {
          failedCount++;
          deliveryLogs.push({
            run_date: runDate,
            recipient_email: recipientEmail,
            status: "failed",
            error_message: sendErr?.message || "Fetch exception",
            created_at: new Date().toISOString(),
          });
        }
      } else {
        // RESEND_API_KEY not present: simulate or log
        sentCount++;
        deliveryLogs.push({
          run_date: runDate,
          recipient_email: recipientEmail,
          status: "sent",
          error_message: "Simulated send (RESEND_API_KEY not configured)",
          created_at: new Date().toISOString(),
        });
      }
    }

    // Save Delivery Logs & Complete Run Record in Database
    if (!is_test) {
      if (deliveryLogs.length > 0) {
        await supabase.from("daily_job_reminder_logs").insert(deliveryLogs);
      }

      if (runId) {
        await supabase
          .from("daily_job_reminder_runs")
          .update({
            status: "completed",
            emails_sent: sentCount,
            emails_failed: failedCount,
            completed_at: new Date().toISOString(),
          })
          .eq("id", runId);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Daily job reminder dispatch completed for ${runDate}.`,
        run_date: runDate,
        total_subscribers: subscribers.length,
        emails_sent: sentCount,
        emails_failed: failedCount,
        jobs_count: activeJobs.length,
        is_test,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[Daily Job Reminder] Uncaught Exception:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error during daily job reminder dispatch." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
