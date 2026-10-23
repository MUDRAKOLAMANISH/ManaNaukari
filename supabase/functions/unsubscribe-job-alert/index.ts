// @ts-nocheck
// Supabase Edge Function: unsubscribe-job-alert
// Validates token against job_alert_subscribers.unsubscribe_token
// Marks subscription as inactive (is_active = false) and sets unsubscribed_at
// Location: supabase/functions/unsubscribe-job-alert/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UnsubscribeRequest {
  token?: string;
  email?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, message: "Server configuration error: Supabase service key missing." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase Client with Service Role Key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body: UnsubscribeRequest = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const rawToken = (body.token || "").trim();
    const rawEmail = (body.email || "").trim().toLowerCase();

    if (!rawToken && !rawEmail) {
      return new Response(
        JSON.stringify({
          success: false,
          status: "missing_token",
          message: "Unsubscribe token or email is required. Please use the link provided at the bottom of your email.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let subscriber: any = null;

    // Strategy 1: Find subscriber by unsubscribe_token
    if (rawToken) {
      const { data, error } = await supabase
        .from("job_alert_subscribers")
        .select("id, email, is_active, unsubscribe_token, created_at")
        .eq("unsubscribe_token", rawToken)
        .maybeSingle();

      if (error) {
        console.error("[Unsubscribe Edge Function] Database error looking up token:", error);
      } else if (data) {
        subscriber = data;
      }
    }

    // Strategy 2: Fallback lookup by email if token matched nothing or was not provided
    if (!subscriber && rawEmail) {
      const { data, error } = await supabase
        .from("job_alert_subscribers")
        .select("id, email, is_active, unsubscribe_token, created_at")
        .ilike("email", rawEmail)
        .maybeSingle();

      if (!error && data) {
        subscriber = data;
      }
    }

    // Handle Token / Subscriber Not Found
    if (!subscriber) {
      return new Response(
        JSON.stringify({
          success: false,
          status: "invalid_token",
          message: "Invalid, expired, or unknown unsubscribe token. Please make sure you clicked the full link from your latest email.",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const nowIso = new Date().toISOString();

    // Handle Already Unsubscribed
    if (subscriber.is_active === false) {
      return new Response(
        JSON.stringify({
          success: true,
          status: "already_unsubscribed",
          email: subscriber.email,
          message: "You have already unsubscribed from Mana Naukari job alerts.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark as inactive (is_active = false) & set unsubscribed_at
    let updatePayload: Record<string, any> = {
      is_active: false,
      unsubscribed_at: nowIso,
    };

    let { error: updateErr } = await supabase
      .from("job_alert_subscribers")
      .update(updatePayload)
      .eq("id", subscriber.id);

    // Fallback if unsubscribed_at column does not exist in schema cache
    if (updateErr && (updateErr.code === "42703" || updateErr.message?.includes("unsubscribed_at"))) {
      console.warn("[Unsubscribe Edge Function] Column unsubscribed_at missing, falling back to updating is_active only.");
      const fallbackRes = await supabase
        .from("job_alert_subscribers")
        .update({ is_active: false })
        .eq("id", subscriber.id);
      
      updateErr = fallbackRes.error;
    }

    if (updateErr) {
      console.error("[Unsubscribe Edge Function] Failed to update subscription status:", updateErr);
      return new Response(
        JSON.stringify({
          success: false,
          status: "update_failed",
          message: `Failed to update subscription status: ${updateErr.message}`,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Unsubscribe Edge Function] Successfully unsubscribed user: ${subscriber.email} (token: ${rawToken})`);

    return new Response(
      JSON.stringify({
        success: true,
        status: "unsubscribed",
        email: subscriber.email,
        message: "You have successfully unsubscribed from Mana Naukari job alerts.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("[Unsubscribe Edge Function] Uncaught Exception:", err);
    return new Response(
      JSON.stringify({
        success: false,
        status: "error",
        message: err?.message || "An unexpected error occurred while processing your unsubscribe request.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
