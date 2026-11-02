import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, Section } from '@/components/legal/legal-page';

/* ---------------------------------------------------------------------------
 * BOILERPLATE — NOT REVIEWED BY A LAWYER.
 *
 * Open decisions are called out in the PR rather than invented here:
 *   - legal entity name, form and address for notices
 *   - governing-law county
 *   - whether a signed DPA / BAA is offered to agency customers
 *   - refund and cancellation terms beyond what Stripe enforces
 * ------------------------------------------------------------------------ */

const UPDATED = 'September 25, 2026';
const CONTACT = 'info@pinoygeneralinsurance.com';

export const metadata: Metadata = {
  title: 'Terms of Service — Agila Management Systems',
  description:
    'The terms on which Agila Management Systems provides agency management software to independent insurance agencies.',
};

export default function TermsOfServicePage() {
  return (
    <LegalPage title="Terms of Service" updated={UPDATED}>
      <p>
        These terms govern your use of Agila Management Systems (“Agila”, “we”), the agency
        management software available at agilams.com. By creating an account, paying a
        subscription, or using the product, you agree to them. If you are agreeing on behalf of an
        agency, you confirm you are authorised to bind it.
      </p>

      <Section id="service" heading="What the service is">
        <p>
          Agila is software for running an independent insurance agency: client and policy records,
          renewals, leads, quote requests, commissions, reporting and related tooling. We provide the
          software. <strong>We are not an insurance agency, broker or carrier, we do not give
          insurance, legal, tax or financial advice, and nothing the software outputs is a
          professional opinion.</strong> You remain responsible for your own licensing, your
          regulatory obligations, and every decision you take about a client.
        </p>
      </Section>

      <Section id="accounts" heading="Accounts">
        <p>
          You are responsible for the accuracy of your account information, for keeping credentials
          secret, and for everything done under your accounts. Tell us promptly at{' '}
          <a className="underline" href={`mailto:${CONTACT}`}>{CONTACT}</a> if you believe an account
          has been compromised. You must be at least 18 and using Agila for business purposes.
        </p>
      </Section>

      <Section id="your-data" heading="Your data stays yours">
        <p>
          The client and policy records you put into Agila are <strong>your data</strong>. You keep
          all rights in them. You grant us only the licence we need to host, process, back up and
          display that data in order to run the service for you, and to support you when you ask.
        </p>
        <p>
          <strong>We do not sell your data, and we do not use your client records to advertise to
          anyone.</strong> How we handle personal information is described in our{' '}
          <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
        <p>
          You are responsible for having the right to put that data into Agila — including any
          consent or notice your clients are owed — and for its accuracy.
        </p>
      </Section>

      <Section id="export" heading="Getting your data out">
        <p>
          You may request an export of your data at any time while your account is active, and for{' '}
          <strong>30 days</strong> after it is cancelled. Email{' '}
          <a className="underline" href={`mailto:${CONTACT}`}>{CONTACT}</a> and we will provide it in
          a machine-readable format. After that window we may delete it, subject to the retention
          rules in the Privacy Policy.
        </p>
      </Section>

      <Section id="acceptable-use" heading="Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Use Agila unlawfully, or in breach of insurance regulation or your licensing terms</li>
          <li>Upload data you have no right to hold or share</li>
          <li>Attempt to access another customer’s data, or probe, scan or test our security without written permission</li>
          <li>Reverse engineer, resell, sublicense or white-label the service without our agreement</li>
          <li>Interfere with the service’s operation or load it in a way designed to degrade it for others</li>
        </ul>
      </Section>

      <Section id="fees" heading="Fees and billing">
        <p>
          Subscription fees and any one-time setup fee are those shown at the time you subscribe.
          Payments are processed by <strong>Stripe</strong>; we do not store card details. Fees are
          billed in advance and, except where stated below or required by law,{' '}
          <strong>are not refundable</strong> for a period already begun.
        </p>
        <p>
          <strong>Founding-agency pricing.</strong> Where a founding rate is offered as locked for the
          life of the subscription, we will honour that rate for as long as the subscription remains
          continuously active. Cancelling and later re-subscribing does not restore it.
        </p>
        <p>
          We may change standard pricing with at least <strong>30 days’</strong> notice by email. A
          price change never applies to a locked founding rate.
        </p>
      </Section>

      <Section id="term" heading="Cancellation and suspension">
        <p>
          You may cancel at any time; cancellation takes effect at the end of the paid period. We may
          suspend or terminate an account that breaches these terms, that we are required to
          terminate by law, or that has not paid. Except in cases of serious or unlawful misuse, we
          will give you notice and a chance to put it right first, and we will honour the 30-day
          export window above.
        </p>
      </Section>

      <Section id="availability" heading="Availability">
        <p>
          We work to keep Agila available and to give notice of planned maintenance, but{' '}
          <strong>we do not commit to a specific uptime percentage in these terms.</strong> The
          service is provided as-is and as-available. Any service-level commitment has to be a
          separate written agreement.
        </p>
      </Section>

      <Section id="warranty" heading="Disclaimers and limits">
        <p>
          To the fullest extent the law allows, Agila is provided <strong>without warranties of any
          kind</strong>, express or implied, including merchantability, fitness for a particular
          purpose and non-infringement.
        </p>
        <p>
          To the fullest extent the law allows, we are not liable for indirect, incidental, special,
          consequential or punitive damages, or for lost profits, revenue, goodwill or data. Our
          total liability arising out of or relating to the service is limited to{' '}
          <strong>the amount you paid us in the twelve months before the event giving rise to the
          claim</strong>.
        </p>
        <p>
          Nothing here excludes liability that cannot lawfully be excluded.
        </p>
      </Section>

      <Section id="changes" heading="Changes to these terms">
        <p>
          We may update these terms. For material changes we will give account holders at least{' '}
          <strong>30 days’</strong> notice by email before they take effect. Continuing to use Agila
          after that means you accept the updated terms; if you do not, cancel before they take
          effect and ask for your export.
        </p>
      </Section>

      <Section id="law" heading="Governing law">
        <p>
          These terms are governed by the laws of the State of California, without regard to its
          conflict-of-laws rules. The courts serving the State of California have exclusive
          jurisdiction over any dispute, and both sides consent to that venue.
        </p>
      </Section>

      <Section id="contact" heading="Contact">
        <p>
          <a className="underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>
        </p>
        <p>
          See also our <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </Section>
    </LegalPage>
  );
}
