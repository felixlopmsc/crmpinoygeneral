import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RenewalCandidate {
  id: string;
  policy_id: string;
  client_id: string;
  renewal_date: string;
  reminder_90_days: boolean;
  reminder_60_days: boolean;
  reminder_30_days: boolean;
  reminder_7_days: boolean;
  status: string;
  policy: {
    id: string;
    policy_number: string;
    carrier: string;
    policy_type: string;
    annual_premium: number;
    expiration_date: string;
  };
  client: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface ReminderCheck {
  days: number;
  field: "reminder_90_days" | "reminder_60_days" | "reminder_30_days" | "reminder_7_days";
  type: "90_day" | "60_day" | "30_day" | "7_day";
  label: string;
}

const REMINDER_CHECKS: ReminderCheck[] = [
  { days: 90, field: "reminder_90_days", type: "90_day", label: "90-Day" },
  { days: 60, field: "reminder_60_days", type: "60_day", label: "60-Day" },
  { days: 30, field: "reminder_30_days", type: "30_day", label: "30-Day" },
  { days: 7, field: "reminder_7_days", type: "7_day", label: "7-Day" },
];

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00Z");
  const now = new Date();
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  return Math.ceil(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00Z").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function buildEmailHtml(
  candidate: RenewalCandidate,
  reminder: ReminderCheck,
): string {
  const days = daysUntil(candidate.policy.expiration_date);
  const urgencyColor =
    days <= 7 ? "#DC2626" : days <= 30 ? "#D97706" : "#1E40AF";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color:#1E40AF;padding:24px 32px;">
              <h1 style="color:#ffffff;margin:0;font-size:20px;font-weight:600;">Pinoy General Insurance Services</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <div style="background-color:${urgencyColor}10;border-left:4px solid ${urgencyColor};padding:16px;border-radius:0 8px 8px 0;margin-bottom:24px;">
                <p style="margin:0;color:${urgencyColor};font-weight:600;font-size:16px;">
                  ${reminder.label} Renewal Reminder
                </p>
                <p style="margin:4px 0 0;color:#64748b;font-size:14px;">
                  Your policy expires in ${days} day${days !== 1 ? "s" : ""}
                </p>
              </div>

              <p style="color:#334155;font-size:15px;line-height:1.6;">
                Dear ${candidate.client.first_name},
              </p>
              <p style="color:#334155;font-size:15px;line-height:1.6;">
                This is a friendly reminder that your insurance policy is coming up for renewal. Here are the details:
              </p>

              <table width="100%" cellpadding="12" cellspacing="0" style="background-color:#f8fafc;border-radius:8px;margin:20px 0;">
                <tr>
                  <td style="color:#64748b;font-size:13px;border-bottom:1px solid #e2e8f0;">Policy Type</td>
                  <td style="color:#1e293b;font-size:13px;font-weight:600;border-bottom:1px solid #e2e8f0;text-align:right;">${candidate.policy.policy_type}</td>
                </tr>
                <tr>
                  <td style="color:#64748b;font-size:13px;border-bottom:1px solid #e2e8f0;">Carrier</td>
                  <td style="color:#1e293b;font-size:13px;font-weight:600;border-bottom:1px solid #e2e8f0;text-align:right;">${candidate.policy.carrier}</td>
                </tr>
                <tr>
                  <td style="color:#64748b;font-size:13px;border-bottom:1px solid #e2e8f0;">Policy Number</td>
                  <td style="color:#1e293b;font-size:13px;font-weight:600;border-bottom:1px solid #e2e8f0;text-align:right;">${candidate.policy.policy_number || "N/A"}</td>
                </tr>
                <tr>
                  <td style="color:#64748b;font-size:13px;border-bottom:1px solid #e2e8f0;">Annual Premium</td>
                  <td style="color:#1e293b;font-size:13px;font-weight:600;border-bottom:1px solid #e2e8f0;text-align:right;">${formatCurrency(candidate.policy.annual_premium)}</td>
                </tr>
                <tr>
                  <td style="color:#64748b;font-size:13px;">Expiration Date</td>
                  <td style="color:${urgencyColor};font-size:13px;font-weight:600;text-align:right;">${formatDate(candidate.policy.expiration_date)}</td>
                </tr>
              </table>

              <p style="color:#334155;font-size:15px;line-height:1.6;">
                To ensure continuous coverage, please contact us to discuss your renewal options. We can help you find the best rates and coverage for your needs.
              </p>

              <div style="text-align:center;margin:28px 0;">
                <a href="mailto:info@pinoygeneralinsurance.com?subject=Policy%20Renewal%20-%20${encodeURIComponent(candidate.policy.policy_number || candidate.policy.policy_type)}" style="display:inline-block;background-color:#1E40AF;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px;">
                  Contact Us About Renewal
                </a>
              </div>

              <p style="color:#94a3b8;font-size:12px;line-height:1.5;margin-top:32px;border-top:1px solid #e2e8f0;padding-top:16px;">
                This is an automated reminder from Pinoy General Insurance Services. If you have already renewed your policy, please disregard this message.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  resendApiKey: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Pinoy General Insurance <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      return { success: false, error: `Resend API error: ${response.status} - ${errorData}` };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown email error",
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let policyId: string | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        policyId = body.policy_id || null;
      } catch {
        // no body is fine for cron calls
      }
    }

    let query = supabase
      .from("renewals")
      .select(
        `
        id, policy_id, client_id, renewal_date,
        reminder_90_days, reminder_60_days, reminder_30_days, reminder_7_days, status,
        policy:policies(id, policy_number, carrier, policy_type, annual_premium, expiration_date),
        client:clients(id, first_name, last_name, email)
      `,
      )
      .in("status", ["Upcoming", "Pending", "Contacted"]);

    if (policyId) {
      query = query.eq("policy_id", policyId);
    }

    const { data: renewals, error: renewalsError } = await query;

    if (renewalsError) {
      return new Response(
        JSON.stringify({ error: renewalsError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const results = {
      checked: 0,
      emails_sent: 0,
      emails_failed: 0,
      skipped: 0,
      details: [] as Array<{
        client: string;
        policy_type: string;
        reminder: string;
        status: string;
      }>,
    };

    for (const renewal of (renewals || []) as unknown as RenewalCandidate[]) {
      if (!renewal.policy || !renewal.client) {
        results.skipped++;
        continue;
      }

      const days = daysUntil(renewal.policy.expiration_date);
      if (days < 0) {
        results.skipped++;
        continue;
      }

      results.checked++;

      for (const check of REMINDER_CHECKS) {
        if (days > check.days) continue;
        if (renewal[check.field]) continue;

        const clientEmail = renewal.client.email;
        if (!clientEmail) {
          results.skipped++;
          continue;
        }

        const subject = `${check.label} Renewal Reminder - ${renewal.policy.policy_type} Policy`;
        const html = buildEmailHtml(renewal, check);

        let emailResult = { success: false, error: "No Resend API key configured" };
        if (resendApiKey) {
          emailResult = await sendEmail(clientEmail, subject, html, resendApiKey);
        }

        await supabase.from("renewal_log").insert({
          renewal_id: renewal.id,
          policy_id: renewal.policy_id,
          client_id: renewal.client_id,
          reminder_type: check.type,
          email_sent_to: clientEmail,
          email_status: emailResult.success ? "sent" : "failed",
          email_subject: subject,
          error_message: emailResult.error || null,
        });

        await supabase
          .from("renewals")
          .update({ [check.field]: true })
          .eq("id", renewal.id);

        if (emailResult.success) {
          results.emails_sent++;
        } else {
          results.emails_failed++;
        }

        results.details.push({
          client: `${renewal.client.first_name} ${renewal.client.last_name}`,
          policy_type: renewal.policy.policy_type,
          reminder: check.label,
          status: emailResult.success ? "sent" : "failed",
        });

        break;
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
