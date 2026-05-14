import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const FLOOD_PRONE_ZIPS = [
  "90703", "90650", "90631", "90680", "90701", "90706", "90712",
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

    const { data: allPolicies } = await supabase
      .from("policies")
      .select("id, client_id, policy_type, carrier, annual_premium, status, insured_items")
      .in("client_id", clientIds)
      .eq("status", "Active");

    const policiesByClient: Record<string, PolicyRow[]> = {};
    (allPolicies || []).forEach((p: PolicyRow) => {
      if (!policiesByClient[p.client_id]) policiesByClient[p.client_id] = [];
      policiesByClient[p.client_id].push(p);
    });

    const { data: existingOpps } = await supabase
      .from("cross_sell_opportunities")
      .select("client_id, opportunity_type")
      .eq("status", "open")
      .in("client_id", clientIds);

    const existingSet = new Set(
      (existingOpps || []).map((o: { client_id: string; opportunity_type: string }) =>
        `${o.client_id}::${o.opportunity_type}`
      ),
    );

    let opportunitiesCreated = 0;
    const toInsert: Opportunity[] = [];

    for (const client of (clients || []) as ClientRow[]) {
      const activePolicies = policiesByClient[client.id] || [];
      const policyTypes = new Set(activePolicies.map((p) => p.policy_type));
      const opportunities: Opportunity[] = [];

      if (policyTypes.has("Auto") && !policyTypes.has("Home")) {
        opportunities.push({
          client_id: client.id,
          opportunity_type: "auto_home_bundle",
          recommended_coverage: "Home Insurance",
          current_policies: ["Auto"],
          missing_coverage: ["Home"],
          estimated_value: 1600,
          priority: "high",
          pitch_message: "Save 15-25% by bundling auto and home insurance. Get a quote today!",
          status: "open",
        });
      }

      const homePolicies = activePolicies.filter((p) => p.policy_type === "Home");
      const highValueHome = homePolicies.some((p) => p.annual_premium > 1500);
      if (policyTypes.has("Home") && !policyTypes.has("Umbrella") && highValueHome) {
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

      const autoPolicies = activePolicies.filter((p) => p.policy_type === "Auto");
      if (autoPolicies.length >= 2 && !policyTypes.has("Umbrella")) {
        opportunities.push({
          client_id: client.id,
          opportunity_type: "auto_umbrella",
          recommended_coverage: "Umbrella Policy",
          current_policies: ["Auto (Multiple)"],
          missing_coverage: ["Umbrella"],
          estimated_value: 400,
          priority: "medium",
          pitch_message: "With multiple vehicles, umbrella coverage provides extra peace of mind.",
          status: "open",
        });
      }

      if (policyTypes.has("Home") && !policyTypes.has("Flood") && client.address_zip && FLOOD_PRONE_ZIPS.includes(client.address_zip)) {
        opportunities.push({
          client_id: client.id,
          opportunity_type: "flood",
          recommended_coverage: "Flood Insurance",
          current_policies: ["Home"],
          missing_coverage: ["Flood"],
          estimated_value: 600,
          priority: "high",
          pitch_message: "28% of flood claims are in low-risk areas. Protect your home today.",
          status: "open",
        });
      }

      if (policyTypes.has("Home") && !policyTypes.has("Earthquake") && (client.address_state === "CA" || !client.address_state)) {
        opportunities.push({
          client_id: client.id,
          opportunity_type: "earthquake",
          recommended_coverage: "Earthquake Insurance",
          current_policies: ["Home"],
          missing_coverage: ["Earthquake"],
          estimated_value: 1200,
          priority: "medium",
          pitch_message: "California homeowners are 15-20% underinsured for earthquake risk. Get protected.",
          status: "open",
        });
      }

      const isBusinessOwner =
        client.tags?.some((t) => t.toLowerCase().includes("business owner")) ||
        client.notes?.toLowerCase().includes("business owner") ||
        client.notes?.toLowerCase().includes("owns a business");
      if (isBusinessOwner && !policyTypes.has("Business")) {
        opportunities.push({
          client_id: client.id,
          opportunity_type: "business",
          recommended_coverage: "Business Insurance",
          current_policies: Array.from(policyTypes),
          missing_coverage: ["Business"],
          estimated_value: 3000,
          priority: "high",
          pitch_message: "Protect your business with General Liability and E&O coverage. Required by most leases!",
          status: "open",
        });
      }

      if (policyTypes.has("Auto") && !policyTypes.has("Home") && !policyTypes.has("Renters")) {
        opportunities.push({
          client_id: client.id,
          opportunity_type: "renters",
          recommended_coverage: "Renter's Insurance",
          current_policies: ["Auto"],
          missing_coverage: ["Renters"],
          estimated_value: 200,
          priority: "low",
          pitch_message: "Protect your belongings for less than $25/month. Bundle with auto to save even more!",
          status: "open",
        });
      }

      const hasDependents =
        client.tags?.some((t) => t.toLowerCase().includes("dependents") || t.toLowerCase().includes("family")) ||
        client.notes?.toLowerCase().includes("kids") ||
        client.notes?.toLowerCase().includes("children") ||
        client.notes?.toLowerCase().includes("family") ||
        client.notes?.toLowerCase().includes("married");
      if ((policyTypes.has("Home") || hasDependents) && !policyTypes.has("Life") && policyTypes.size > 0) {
        opportunities.push({
          client_id: client.id,
          opportunity_type: "life",
          recommended_coverage: "Life Insurance",
          current_policies: Array.from(policyTypes),
          missing_coverage: ["Life"],
          estimated_value: 1000,
          priority: hasDependents ? "high" : "medium",
          pitch_message: "Protect your family's financial future with term life insurance.",
          status: "open",
        });
      }

      if (policyTypes.has("Business") && !policyTypes.has("Cyber Liability")) {
        opportunities.push({
          client_id: client.id,
          opportunity_type: "cyber_liability",
          recommended_coverage: "Cyber Liability Insurance",
          current_policies: ["Business"],
          missing_coverage: ["Cyber Liability"],
          estimated_value: 1500,
          priority: "medium",
          pitch_message: "Average data breach costs $200K. Protect your business from cyber threats.",
          status: "open",
        });
      }

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
