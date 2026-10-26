// Supabase Edge Function: score-transaction
// Deploy with: supabase functions deploy score-transaction
// This is an illustrative rule-based score, not a trained fraud model.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Use POST" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const amount = Number(body.amount);
    const hour = Number(body.hour);
    const frequency = Number(body.frequency);
    const international = Boolean(body.international);
    const threshold = body.threshold === undefined ? 0.5 : Number(body.threshold);

    if (
      !Number.isFinite(amount) || amount < 0 || amount > 10000000 ||
      !Number.isInteger(hour) || hour < 0 || hour > 23 ||
      !Number.isInteger(frequency) || frequency < 0 || frequency > 100 ||
      !Number.isFinite(threshold) || threshold < 0.1 || threshold > 0.9
    ) {
      return new Response(JSON.stringify({ error: "Invalid transaction fields." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let score = 0.05;
    score += Math.min(amount / 100000, 1) * 0.35;
    score += hour <= 4 ? 0.20 : 0;
    score += Math.min(frequency / 15, 1) * 0.25;
    score += international ? 0.20 : 0;
    score = Math.max(0, Math.min(score, 0.99));

    return new Response(JSON.stringify({
      risk_score: Number(score.toFixed(4)),
      flagged: score >= threshold,
      threshold,
      message: "Educational rule-based score only; not proof or a calibrated probability of fraud."
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON request." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
