import type { Metadata } from 'next'
import { PageShell } from '@/components/PageShell'

export const metadata: Metadata = {
  title: 'Privacy Policy — FlowBond',
  description:
    'How FlowBond collects, uses, discloses, and protects information. FlowBond is a business-to-business company and does not sell personal information.',
  alternates: { canonical: '/privacy' },
}

const SUBPROCESSORS = [
  { p: 'Cloudflare, Inc.', purpose: 'Hosting, CDN, DNS, DDoS protection, email routing', loc: 'Global edge' },
  { p: 'Supabase, Inc.', purpose: 'Application database and authentication', loc: 'United States' },
  { p: 'Stripe, Inc.', purpose: 'Payment processing and subscription billing', loc: 'United States' },
  { p: 'Anthropic PBC', purpose: 'AI processing for FlowMe OS features', loc: 'United States' },
]

export default function PrivacyPage() {
  return (
    <PageShell eyebrow="Legal" title="Privacy Policy" updated="August 3, 2026">
      <p>
        FlowBond (“FlowBond,” “we,” “us”) provides identity, onboarding, and non-custodial wallet infrastructure as
        licensed software to business customers. This policy explains what information we collect, how we use it, who we
        share it with, how we share it, and how we protect it.
      </p>
      <p>
        FlowBond is a business-to-business company. <b>We do not operate a consumer product and we do not sell personal
        information.</b>
      </p>

      <h2>1. Two categories of data, two different roles</h2>
      <p>Our obligations differ depending on whose data is involved.</p>
      <p>
        <b>Customer data (we are the controller).</b> Information about the businesses that license our software, their
        personnel, and visitors to this website. We decide how this information is used.
      </p>
      <p>
        <b>End-user data (we are the processor).</b> Information about the users of our customers’ applications, which
        passes through our identity and onboarding infrastructure. We process this only on our customer’s documented
        instructions. Our customer is the controller of that data and is responsible for its own privacy notice and
        lawful basis for processing. If you are an end user of an application built on FlowBond, contact that
        application’s operator first — they control your data.
      </p>

      <h2>2. Information we collect</h2>
      <p>
        <b>From business customers and prospects:</b> name, business email, company name, role, billing and tax details,
        support correspondence, and account credentials.
      </p>
      <p>
        <b>From website visitors:</b> IP address, browser and device type, pages viewed, referring URL, and approximate
        location derived from IP. Collected through server logs and privacy-respecting analytics.
      </p>
      <p>
        <b>From end users, on behalf of our customers:</b> account identifiers such as email address or phone number, a
        FlowBond identity identifier (FBID), authentication events and timestamps, public blockchain addresses,
        attestation records, and application activity our customer chooses to record through our SDK.
      </p>
      <p>
        <b>What we do not collect:</b> we do not collect or store private keys, seed phrases, or wallet recovery
        material. Our wallet infrastructure is non-custodial. We do not hold or control customer or end-user funds. We do
        not knowingly collect information from children under 13.
      </p>

      <h2>3. How we use information</h2>
      <ul>
        <li>To provide, operate, secure, and improve the FlowBond platform and SDK</li>
        <li>To authenticate users and maintain identity continuity across connected applications</li>
        <li>To bill customers, manage subscriptions, and collect payment</li>
        <li>To provide technical support and respond to inquiries</li>
        <li>To detect, investigate, and prevent fraud, abuse, and security incidents</li>
        <li>To comply with legal obligations and enforce our Terms of Service</li>
        <li>
          To send service and security notices, and — for business contacts only — occasional product updates you can opt
          out of at any time
        </li>
      </ul>
      <p>
        We do not use end-user data to train machine learning models. We do not use end-user data for advertising, and we
        do not sell or rent personal information to anyone.
      </p>

      <h2>4. Who we disclose information to, and how</h2>
      <p>
        We disclose information only in the circumstances below. All disclosures to service providers are made over
        encrypted connections (TLS 1.2 or higher) via authenticated APIs, and each provider is bound by a written
        agreement limiting use of the data to providing services to us.
      </p>
      <h3>Service providers (sub-processors)</h3>
      <div className="doc-table-wrap">
        <table className="doc-table">
          <thead>
            <tr>
              <th>Provider</th>
              <th>Purpose</th>
              <th>Data location</th>
            </tr>
          </thead>
          <tbody>
            {SUBPROCESSORS.map((s) => (
              // data-label carries the column header down to the stacked
              // one-card-per-row layout phones get (see .doc-table in globals).
              <tr key={s.p}>
                <td data-label="Provider">{s.p}</td>
                <td data-label="Purpose">{s.purpose}</td>
                <td data-label="Data location">{s.loc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Stripe processes payment card details directly; FlowBond never receives or stores full card numbers.
      </p>
      <p>
        <b>Our business customers.</b> Where we process end-user data as a processor, that data is disclosed to and
        accessible by the customer whose application collected it.
      </p>
      <div className="doc-note">
        <p>
          <b>Public blockchain networks.</b> Where a customer uses our wallet or attestation features, certain data —
          wallet addresses, transaction records, on-chain attestations — is written to public, permissionless networks.
          This information is public, permanent, and outside our control. It cannot be deleted or amended by us or by
          you. Consider carefully before writing anything on-chain.
        </p>
      </div>
      <p>
        <b>Legal and safety.</b> We may disclose information where required by law, subpoena, court order, or other valid
        legal process, or where necessary to protect the rights, property, or safety of FlowBond, our customers, or the
        public. Where legally permitted, we will notify the affected customer before disclosing.
      </p>
      <p>
        <b>Corporate transactions.</b> In a merger, acquisition, financing, or sale of assets, information may transfer
        to the successor entity, subject to this policy.
      </p>
      <p>We do not disclose personal information to third parties for their own marketing purposes.</p>

      <h2>5. Security practices</h2>
      <ul>
        <li>Encryption in transit using TLS 1.2 or higher on all connections</li>
        <li>Encryption at rest for all stored data</li>
        <li>
          Row-level security enforced at the database layer on every table, so access is restricted per-identity rather
          than per-application
        </li>
        <li>Scoped, revocable API keys; credentials are never embedded in client-side code</li>
        <li>Append-only audit ledgers for sensitive operations, providing a tamper-evident record</li>
        <li>Least-privilege access controls with regular review of who holds production access</li>
        <li>
          Non-custodial architecture: we hold no private keys and no customer funds, which removes an entire class of risk
        </li>
      </ul>
      <p>
        No system is perfectly secure. If we become aware of a breach affecting personal information, we will notify
        affected customers without undue delay and in accordance with applicable law.
      </p>

      <h2>6. Data retention</h2>
      <p>
        We retain customer account and billing records for the life of the account and for as long afterward as required
        for tax, accounting, and legal purposes. End-user data is retained according to our customer’s configuration and
        instructions; on termination we delete or return it within 30 days unless retention is legally required. Server
        logs are retained for up to 90 days. Data written to public blockchains cannot be deleted.
      </p>

      <h2>7. Your rights</h2>
      <p>
        Depending on your jurisdiction, you may have the right to access, correct, delete, or export your personal
        information, to object to or restrict processing, and to withdraw consent. California residents have rights under
        the CCPA/CPRA, including the right not to be discriminated against for exercising them. We do not sell personal
        information as that term is defined under California law.
      </p>
      <p>
        To exercise these rights as a business customer, email{' '}
        <a href="mailto:privacy@flowbond.life">
          <b>privacy@flowbond.life</b>
        </a>
        . If you are an end user of an application built on FlowBond, contact that application’s operator — we will refer
        your request to them, as they control your data.
      </p>

      <h2>8. International transfers</h2>
      <p>
        FlowBond is based in the United States and our infrastructure is primarily hosted in the United States. If you
        access our services from outside the United States, your information will be transferred to and processed there.
        Where required, we rely on Standard Contractual Clauses or another lawful transfer mechanism.
      </p>

      <h2>9. Changes to this policy</h2>
      <p>
        We may update this policy. Material changes will be announced on this page with a revised “Last updated” date,
        and business customers will be notified by email at least 14 days before the change takes effect.
      </p>

      <h2>10. Contact</h2>
      <p>
        Privacy questions and requests:{' '}
        <a href="mailto:privacy@flowbond.life">
          <b>privacy@flowbond.life</b>
        </a>
      </p>
    </PageShell>
  )
}
