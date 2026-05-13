import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FLOOD_PRONE_ZIPS = [
  "90703", "90650", "90706", "90805", "90002",
  "90631", "90680", "90701", "90712",
  "90715", "90716", "90723", "90745", "90810", "90813",
];

interface ClientRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  address_state: string | null;
  address_zip: string | null;
  tags: string[] | null;
  notes: string | null;
  status: string;
}

interface PolicyRow {
  id: string;
  client_id: string;
  policy_type: string;
  carrier: string;
  annual_premium: number;
  status: string;
  insured_items: Record<string, unknown> | null;
}

interface Opportunity {
  client_id: string;
  opportunity_type: string;
  recommended_coverage: string;
  current_policies: string[];
  missing_coverage: string[];
  estimated_value: number;
  priority: string;
  pitch_message: string;
  status: string;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let targetClientId: string | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        targetClientId = body.client_id || null;
      } catch {
        // no body is fine
      }
    }

    let clientsQuery = supabase
      .from("clients")
      .select("id, first_name, last_name, email, address_state, address_zip, tags, notes, status")
      .in("status", ["Active", "Lead"]);

    if (targetClientId) {
      clientsQuery = clientsQuery.eq("id", targetClientId);
    }

    const { data: clients, error: clientsError } = await clientsQuery;
    if (clientsError) {
      return new Response(
        JSON.stringify({ error: clientsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const clientIds = (clients || []).map((c: ClientRow) => c.id);
    if (clientIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, clients_analyzed: 0, opportunities_created: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Batch queries to avoid PostgREST URL length limits
    const BATCH_SIZE = 200;
    const clientIdBatches = chunk(clientIds, BATCH_SIZE);

    const allPolicies: PolicyRow[] = [];
    for (const batch of clientIdBatches) {
      const { data } = await supabase
        .from("policies")
        .select("id, client_id, policy_type, carrier, annual_premium, status, insured_items")
        .in("client_id", batch)
        .eq("status", "Active");
      if (data) allPolicies.push(...(data as PolicyRow[]));
    }

    const policiesByClient: Record<string, PolicyRow[]> = {};
    allPolicies.forEach((p) => {
      if (!policiesByClient[p.client_id]) policiesByClient[p.client_id] = [];
      policiesByClient[p.client_id].push(p);
    });

    const existingSet = new Set<string>();
    for (const batch of clientIdBatches) {
      const { data } = await supabase
        .from("cross_sell_opportunities")
        .select("client_id, opportunity_type")
        .eq("status", "open")
        .in("client_id", batch);
      if (data) {
        data.forEach((o: { client_id: string; opportunity_type: string }) => {
          existingSet.add(`${o.client_id}::${o.opportunity_type}`);
        });
      }
    }

    let opportunitiesCreated = 0;
    const toInsert: Opportunity[] = [];

    for (const client of (clients || []) as ClientRow[]) {
      const activePolicies = policiesByClient[client.id] || [];
      if (activePolicies.length === 0) continue;

      const policyTypes = new Set(activePolicies.map((p) => p.policy_type));
      const opportunities: Opportunity[] = [];

      // RULE 1: Auto + Home Bundle (has Auto, missing Home)
      if (policyTypes.has("Auto") && !policyTypes.has("Home")) {
        opportunities.push({
          client_id: client.id,
          opportunity_type: "auto_home_bundle",
          recommended_coverage: "Home Insurance",
          current_policies: ["Auto"],
          missing_coverage: ["Home"],
          estimated_value: 1600,
          priority: "high",
          pitch_message: "Save 15-25% by bundling your auto and home insurance.",
          status: "open",
        });
      }

      // RULE 1b: Home + Auto Bundle (has Home, missing Auto)
      if (policyTypes.has("Home") && !policyTypes.has("Auto")) {
        opportunities.push({
          client_id: client.id,
          opportunity_type: "home_auto_bundle",
          recommended_coverage: "Auto Insurance",
          current_policies: ["Home"],
          missing_coverage: ["Auto"],
          estimated_value: 1600,
          priority: "high",
          pitch_message: "Save 15-25% by bundling your home and auto insurance.",
          status: "open",
        });
      }

      // RULE 2: Home + Umbrella (has Home, missing Umbrella)
      if (policyTypes.has("Home") && !policyTypes.has("Umbrella")) {
        opportunities.push({
          client_id: client.id,
          opportunity_type: "home_umbrella",
          recommended_coverage: "Umbrella Policy",
          current_policies: ["Home"],
          missing_coverage: ["Umbrella"],
          estimated_value: 400,
          priority: "high",
          pitch_message: "Protect your assets with $1M-$2M umbrella coverage for extra liability protection.",
          status: "open",
        });
      }

      // RULE 3: Auto + Umbrella (has Auto but not Home, missing Umbrella)
      if (policyTypes.has("Auto") && !policyTypes.has("Home") && !policyTypes.has("Umbrella")) {
        opportunities.push({
          client_id: client.id,
          opportunity_type: "auto_umbrella",
          recommended_coverage: "Umbrella Policy",
          current_policies: ["Auto"],
          missing_coverage: ["Umbrella"],
          estimated_value: 400,
          priority: "medium",
          pitch_message: "Extra liability protection for your vehicles with umbrella coverage.",
          status: "open",
        });
      }

      // RULE 4: Homeowner without Flood (flood-prone ZIP)
      if (policyTypes.has("Home") && !policyTypes.has("Flood") && client.address_zip && FLOOD_PRONE_ZIPS.includes(client.address_zip)) {
        opportunities.push({
          client_id: client.id,
          opportunity_type: "flood",
          recommended_coverage: "Flood Insurance",
          current_policies: ["Home"],
          missing_coverage: ["Flood"],
          estimated_value: 600,
          priority: "high",
          pitch_message: "28% of flood claims are in low-risk areas. Protect your home.",
          status: "open",
        });
      }

      // RULE 5: Homeowner without Earthquake
      if (policyTypes.has("Home") && !policyTypes.has("Earthquake") && (client.address_state === "CA" || client.address_state === "" || !client.address_state)) {
        opportunities.push({
          client_id: client.id,
          opportunity_type: "earthquake",
          recommended_coverage: "Earthquake Insurance",
          current_policies: ["Home"],
          missing_coverage: ["Earthquake"],
          estimated_value: 1200,
          priority: "medium",
          pitch_message: "Standard home policies don't cover earthquakes. California requires separate coverage.",
          status: "open",
        });
      }

      // RULE 5b: Business without Earthquake
      if (policyTypes.has("Business") && !policyTypes.has("Earthquake") && (client.address_state === "CA" || client.address_state === "" || !client.address_state)) {
        opportunities.push({
          client_id: client.id,
          opportunity_type: "business_earthquake",
          recommended_coverage: "Earthquake Insurance (Business)",
          current_policies: ["Business"],
          missing_coverage: ["Earthquake"],
          estimated_value: 1200,
          priority: "medium",
          pitch_message: "Your business property needs earthquake protection. Standard policies don't cover it.",
          status: "open",
        });
      }

      // RULE 6: Business Owner without Commercial policy
      const isBusinessOwner =
        client.tags?.some((t) => t.toLowerCase().includes("business owner") || t.toLowerCase().includes("owner") || t.toLowerCase().includes("llc")) ||
        client.notes?.toLowerCase().includes("business owner") ||
        client.notes?.toLowerCase().includes("self-employed") ||
        client.notes?.toLowerCase().includes("owns a business") ||
        client.notes?.toLowerCase().includes("llc");
      if (isBusinessOwner && !policyTypes.has("Business")) {
        opportunities.push({
          client_id: client.id,
          opportunity_type: "business",
          recommended_coverage: "Business Insurance",
          current_policies: Array.from(policyTypes),
          missing_coverage: ["Business"],
          estimated_value: 2250,
          priority: "high",
          pitch_message: "Your personal policies don't protect your business assets.",
          status: "open",
        });
      }

      // RULE 7: Renter with Auto but no Renters or Home
      if (policyTypes.has("Auto") && !policyTypes.has("Home") && !policyTypes.has("Renters")) {
        opportunities.push({
          client_id: client.id,
          opportunity_type: "renters",
          recommended_coverage: "Renters Insurance",
          current_policies: ["Auto"],
          missing_coverage: ["Renters"],
          estimated_value: 240,
          priority: "low",
          pitch_message: "Protect your belongings for as little as $15/month.",
          status: "open",
        });
      }

      // RULE 8: Homeowner without Life Insurance
      if (policyTypes.has("Home") && !policyTypes.has("Life")) {
        opportunities.push({
          client_id: client.id,
          opportunity_type: "life",
          recommended_coverage: "Life Insurance",
          current_policies: Array.from(policyTypes),
          missing_coverage: ["Life"],
          estimated_value: 900,
          priority: "medium",
          pitch_message: "Protect your family's ability to keep their home if something happens to you.",
          status: "open",
        });
      }

      // RULE 9: Business owner without Cyber Liability
      if (policyTypes.has("Business") && !policyTypes.has("Cyber Liability")) {
        opportunities.push({
          client_id: client.id,
          opportunity_type: "cyber_liability",
          recommended_coverage: "Cyber Liability Insurance",
          current_policies: ["Business"],
          missing_coverage: ["Cyber Liability"],
          estimated_value: 1000,
          priority: "medium",
          pitch_message: "1 in 5 small businesses are hit by a cyberattack. Average cost: $200K.",
          status: "open",
        });
      }

      // RULE 10: 3+ policies without Umbrella
      if (policyTypes.size >= 3 && !policyTypes.has("Umbrella")) {
        opportunities.push({
          client_id: client.id,
          opportunity_type: "personal_umbrella",
          recommended_coverage: "Personal Umbrella Policy",
          current_policies: Array.from(policyTypes),
          missing_coverage: ["Umbrella"],
          estimated_value: 400,
          priority: "high",
          pitch_message: "You have significant coverage - an umbrella policy ties it all together.",
          status: "open",
        });
      }

      // Commercial Auto: Business + Auto but no Commercial Auto
      const usesVehiclesForBusiness =
        policyTypes.has("Business") &&
        policyTypes.has("Auto") &&
        !policyTypes.has("Commercial Auto");
      if (usesVehiclesForBusiness) {
        opportunities.push({
          client_id: client.id,
          opportunity_type: "commercial_auto",
          recommended_coverage: "Commercial Auto Insurance",
          current_policies: ["Business", "Auto"],
          missing_coverage: ["Commercial Auto"],
          estimated_value: 2000,
          priority: "medium",
          pitch_message: "Personal auto doesn't cover business use. Protect your company vehicles.",
          status: "open",
        });
      }

      for (const opp of opportunities) {
        const key = `${opp.client_id}::${opp.opportunity_type}`;
        if (!existingSet.has(key)) {
          toInsert.push(opp);
          existingSet.add(key);
          opportunitiesCreated++;
        }
      }
    }

    if (toInsert.length > 0) {
      const batchSize = 50;
      for (let i = 0; i < toInsert.length; i += batchSize) {
        const batch = toInsert.slice(i, i + batchSize);
        await supabase.from("cross_sell_opportunities").insert(batch);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        clients_analyzed: (clients || []).length,
        opportunities_created: opportunitiesCreated,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
