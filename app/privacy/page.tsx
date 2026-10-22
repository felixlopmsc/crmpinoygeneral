import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, Section } from '@/components/legal/legal-page';

/* ---------------------------------------------------------------------------
 * BOILERPLATE — NOT REVIEWED BY A LAWYER.
 *
 * Written from the actual schema rather than a template: every category below
 * was read off information_schema for the live project on the date in UPDATED.
 * That makes it accurate about what is collected. It does not make it legally
 * sufficient. A California attorney should review before this is relied on.
 *
 * Known open decisions, called out in the PR rather than papered over here:
 *   - the legal entity name and mailing address for notices
 *   - a definite retention schedule (there is no automated deletion today)
 *   - whether the business meets a CCPA/CPRA applicability threshold
 * ------------------------------------------------------------------------ */

const UPDATED = 'September 25, 2026';
const CONTACT = 'info@pinoygeneralinsurance.com';

export const metadata: Metadata = {
  title: 'Privacy Policy — Agila Management Systems',
  description:
    'What Agila Management Systems collects, where it is stored, how long it is kept, and the rights California residents have over it.',
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" updated={UPDATED}>
      <p>
        Agila Management Systems (“Agila”, “we”) provides agency management software to independent
        insurance agencies. This policy explains what we collect, where it lives, how long we keep
        it, and what you can ask us to do with it.
      </p>

      <p className="rounded-lg border border-[#B8962E]/40 bg-[#B8962E]/10 p-4 text-[#1B2A4A]">
        <strong>Two kinds of people appear in this policy.</strong> <em>Customers</em> are the
        agencies and their staff who hold Agila accounts. <em>Client records</em> are the
        policyholders whose information a customer stores in Agila. We process client records{' '}
        <strong>on the customer’s behalf</strong> — the agency decides what goes in and what comes
        out. If you are a policyholder, contact your insurance agency first; we will refer your
        request to them.
      </p>

      <Section id="collect" heading="What we collect">
        <p><strong>From agency staff who hold an account:</strong></p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Name, email address and phone number</li>
          <li>Insurance producer license number and expiration date</li>
          <li>Authentication data — a password hash, session tokens, sign-in timestamps</li>
          <li>Notification and display preferences</li>
        </ul>

        <p className="pt-2"><strong>From visitors to agilams.com:</strong></p>
        <ul className="list-disc space-y-1 pl-5">
          <li>What you submit on the demo-request form: name, work email, phone, and your message</li>
          <li>Standard server and delivery logs kept by our hosting provider</li>
        </ul>

        <p className="pt-2">
          <strong>Client records a customer stores in Agila</strong> — entered by the agency, not by
          us. Depending on how the agency uses the product these can include policyholder names,
          postal addresses, email addresses, telephone numbers, dates of birth, policy and quote
          details, claims information, commission records, uploaded documents, and free-text notes.
        </p>

        <p>
          <strong>We do not run advertising or third-party analytics trackers</strong>, and we do not
          sell or share personal information for cross-context behavioral advertising.
        </p>

        <p>
          <strong>Payments.</strong> Subscription payments are taken by Stripe on Stripe’s own hosted
          pages. Card numbers never reach Agila’s servers and we never store them.
        </p>
      </Section>

      <Section id="storage" heading="Where it is stored">
        <p>
          Application data is stored in a <strong>Supabase</strong> Postgres database and Supabase
          Storage bucket hosted in a <strong>United States</strong> region (AWS <code>us-west-2</code>,
          Oregon). The application itself is served by <strong>Vercel</strong> from its US edge
          network. Data is encrypted in transit with TLS and at rest by the storage provider.
        </p>
        <p>
          Access inside the database is constrained by row-level security policies, so an account can
          reach only the records its role permits. Staff access is limited to the people who need it
          to operate and support the product.
        </p>
      </Section>

      <Section id="retention" heading="How long we keep it">
        <p>
          We keep customer account data and client records for as long as the account is active, and
          afterwards only as long as we need them to meet legal, tax, accounting and insurance
          record-keeping obligations. Insurance and financial records often carry statutory retention
          periods that are longer than a customer’s subscription.
        </p>
        <p>
          A customer may ask us in writing to delete or de-identify their data. We will do so except
          where the law requires us to keep it, and we will tell you which category applies and for
          how long. Backups roll off on their own schedule, so deleted records can persist in backup
          media for a limited period after removal from the live system.
        </p>
      </Section>

      <Section id="subprocessors" heading="Subprocessors">
        <p>These are the third parties that process data on our behalf.</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#1B2A4A]/20 text-left">
                <th className="py-2 pr-4 font-semibold text-[#1B2A4A]">Subprocessor</th>
                <th className="py-2 pr-4 font-semibold text-[#1B2A4A]">Purpose</th>
                <th className="py-2 font-semibold text-[#1B2A4A]">Location</th>
              </tr>
            </thead>
            <tbody className="align-top">
              <tr className="border-b border-[#1B2A4A]/10">
                <td className="py-2 pr-4">Supabase</td>
                <td className="py-2 pr-4">Database, file storage, authentication</td>
                <td className="py-2">United States</td>
              </tr>
              <tr className="border-b border-[#1B2A4A]/10">
                <td className="py-2 pr-4">Vercel</td>
                <td className="py-2 pr-4">Application hosting and delivery</td>
                <td className="py-2">United States</td>
              </tr>
              <tr className="border-b border-[#1B2A4A]/10">
                <td className="py-2 pr-4">Stripe</td>
                <td className="py-2 pr-4">Subscription payment processing</td>
                <td className="py-2">United States</td>
              </tr>
              <tr className="border-b border-[#1B2A4A]/10">
                <td className="py-2 pr-4">Sentry</td>
                <td className="py-2 pr-4">
                  Error reporting. Reports are scrubbed before they leave the browser or server:
                  user identity is removed, request bodies and cookies are dropped, and email
                  addresses, telephone numbers, dates of birth, licence numbers, record identifiers
                  and invite tokens are redacted from messages.
                </td>
                <td className="py-2">United States</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Dreamlit</td>
                <td className="py-2 pr-4">Internal application tooling</td>
                <td className="py-2">United States</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          We will update this list before a new subprocessor begins handling customer data. Ask us at{' '}
          <a className="underline" href={`mailto:${CONTACT}`}>{CONTACT}</a> to be told when it changes.
        </p>
      </Section>

      <Section id="ccpa" heading="California privacy rights">
        <p>
          Agila is operated from California. If you are a California resident, the California
          Consumer Privacy Act as amended by the CPRA gives you the right to:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Know</strong> what personal information we have collected about you, where we got it, why we collected it, and who we disclosed it to</li>
          <li><strong>Access</strong> a copy of that information in a portable form</li>
          <li><strong>Correct</strong> information that is inaccurate</li>
          <li><strong>Delete</strong> it, subject to the legal exceptions described under retention above</li>
          <li><strong>Limit</strong> the use of sensitive personal information</li>
          <li><strong>Not be discriminated against</strong> for exercising any of these rights — we will not deny service, charge a different price, or reduce quality because you asked</li>
        </ul>
        <p>
          <strong>We do not sell personal information, and we do not share it for cross-context
          behavioral advertising.</strong>
        </p>
        <p>
          To make a request, email{' '}
          <a className="underline" href={`mailto:${CONTACT}`}>{CONTACT}</a> with enough detail to
          identify your records. We will verify your identity before we act, because acting on an
          unverified request is itself a disclosure. You may use an authorised agent; we will ask for
          proof of their authority. We aim to respond within 45 days and will tell you if we need the
          extension the statute allows.
        </p>
        <p>
          If you are a policyholder whose record an agency keeps in Agila, we act on that agency’s
          instructions. Send your request to the agency; if it reaches us first we will pass it on and
          tell you we have.
        </p>
      </Section>

      <Section id="security" heading="Security">
        <p>
          We use TLS in transit, encryption at rest, row-level access control in the database,
          scoped service credentials, and error reports scrubbed of personal information. No system
          is perfectly secure. If we learn of a breach affecting your personal information we will
          notify you and the authorities as California law requires.
        </p>
      </Section>

      <Section id="children" heading="Children">
        <p>
          Agila is a business tool and is not directed at children. We do not knowingly collect
          personal information from anyone under 16. If you believe a child’s information has reached
          us through an agency’s records, contact us and we will work with that agency to remove it.
        </p>
      </Section>

      <Section id="changes" heading="Changes to this policy">
        <p>
          We will update the date at the top when this policy changes. For changes that materially
          affect how we handle personal information we will notify account holders by email before
          the change takes effect.
        </p>
      </Section>

      <Section id="contact" heading="Contact">
        <p>
          Questions, requests, or complaints:{' '}
          <a className="underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
        <p>
          See also our <Link href="/terms" className="underline">Terms of Service</Link>.
        </p>
      </Section>
    </LegalPage>
  );
}
