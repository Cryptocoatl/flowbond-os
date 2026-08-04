import type { Metadata } from 'next'
import { PageShell } from '@/components/PageShell'

export const metadata: Metadata = {
  title: 'Terms of Service — FlowBond',
  description:
    'Terms governing access to and use of the FlowBond platform, SDK, APIs, and related services. B2B developer infrastructure, non-custodial by design.',
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
  return (
    <PageShell eyebrow="Legal" title="Terms of Service" updated="August 3, 2026">
      <p>
        These Terms of Service (“Terms”) govern access to and use of the FlowBond platform, SDK, APIs, documentation, and
        related services (the “Services”) provided by FlowBond (“FlowBond,” “we,” “us”). By accessing or using the
        Services, or by signing an order form referencing these Terms, you (“Customer,” “you”) agree to them. If you are
        agreeing on behalf of an organization, you represent that you have authority to bind it.
      </p>

      <h2>1. The Services</h2>
      <p>
        FlowBond provides business-to-business developer infrastructure: identity (FBID), user onboarding, non-custodial
        wallet tooling, attestations, and related APIs and SDKs. The Services are licensed for integration into your own
        applications. We may also provide implementation, integration, and advisory services under a separate statement
        of work.
      </p>
      <p>
        The Services are intended for business use by organizations. They are not offered to consumers and are not
        intended for individuals under 18.
      </p>

      <h2>2. Accounts and credentials</h2>
      <p>
        You must provide accurate registration information and keep it current. You are responsible for all activity
        under your account and for safeguarding your API keys and credentials. Notify us at{' '}
        <a href="mailto:security@flowbond.life">security@flowbond.life</a> immediately if you suspect unauthorized
        access. Do not share credentials or embed secret keys in client-side code.
      </p>

      <h2>3. Acceptable use</h2>
      <p>You may not, and may not permit any third party to:</p>
      <ul>
        <li>
          Use the Services in violation of any applicable law or regulation, including sanctions, export control,
          anti-money-laundering, and data protection laws
        </li>
        <li>
          Use the Services to facilitate money laundering, terrorist financing, fraud, or the evasion of sanctions
        </li>
        <li>
          Reverse engineer, decompile, or attempt to derive the source code of the Services, except to the extent that
          restriction is unenforceable under applicable law
        </li>
        <li>
          Resell, sublicense, or provide the Services to third parties except as expressly permitted in an order form
        </li>
        <li>
          Circumvent rate limits, usage quotas, or access controls, or interfere with the integrity or performance of the
          Services
        </li>
        <li>Upload malicious code, or use the Services to transmit unlawful, infringing, or harmful content</li>
        <li>
          Use the Services to build a competing product, or to benchmark for public disclosure without our prior written
          consent
        </li>
      </ul>
      <p>
        We may suspend access without prior notice where we reasonably believe continued access poses a security, legal,
        or operational risk. Where practicable we will notify you first.
      </p>

      <h2>4. Customer data and privacy</h2>
      <p>
        You retain all rights in the data you and your end users submit to the Services (“Customer Data”). You grant us a
        limited license to host, process, and transmit Customer Data solely to provide the Services and as permitted by
        our <a href="/privacy">Privacy Policy</a>.
      </p>
      <p>
        You are the controller of end-user personal data processed through the Services, and we act as your processor.
        You are responsible for providing lawful notice to your end users, obtaining any required consent, and
        maintaining your own privacy policy. You represent that you have the necessary rights and lawful basis for all
        Customer Data you submit.
      </p>

      <h2>5. Non-custodial nature of wallet features — important</h2>
      <div className="doc-note">
        <p>
          FlowBond’s wallet infrastructure is <b>non-custodial</b>. We do not hold, control, or have access to private
          keys, seed phrases, or recovery material, and we do not take custody of or control any funds or digital assets
          belonging to you or your end users. FlowBond is not a bank, money transmitter, money services business, broker,
          exchange, custodian, or investment adviser, and provides no financial, investment, tax, or legal advice.
        </p>
      </div>
      <p>
        You and your end users are solely responsible for the security of keys and assets. Loss of a key means permanent,
        irreversible loss of the associated assets, and we cannot recover them.
      </p>
      <p>
        Blockchain networks are independent, public, permissionless systems that we do not operate or control.
        Transactions submitted to them are irreversible. Network congestion, forks, protocol changes, validator behavior,
        and network fees are outside our control, and we are not responsible for losses arising from them.
      </p>
      <p>
        Where your application involves digital assets or tokens, you are solely responsible for determining and
        satisfying your own regulatory obligations, including any licensing, registration, or reporting requirements in
        your jurisdiction.
      </p>

      <h2>6. Fees and payment</h2>
      <p>
        Fees are set out in your order form or applicable plan. Subscriptions bill in advance and renew automatically for
        successive terms unless cancelled before the renewal date. Payments are processed by Stripe; you agree to
        Stripe’s terms in connection with payment.
      </p>
      <p>
        Fees are non-refundable except where expressly stated or required by law. Overdue amounts may accrue interest at
        1.5% per month or the maximum permitted by law, whichever is lower, and we may suspend the Services for
        non-payment after written notice. Fees are exclusive of taxes; you are responsible for all applicable taxes other
        than taxes on our net income.
      </p>
      <p>We may change pricing on at least 30 days’ written notice, effective at your next renewal term.</p>

      <h2>7. Intellectual property</h2>
      <p>
        FlowBond and its licensors retain all right, title, and interest in the Services, including all software, APIs,
        SDKs, documentation, designs, and the FlowBond name and marks. Subject to these Terms and payment of applicable
        fees, we grant you a non-exclusive, non-transferable, revocable license to access and use the Services during
        your subscription term for your internal business purposes and integration into your applications.
      </p>
      <p>Feedback you provide may be used by us without restriction or obligation.</p>

      <h2>8. Third-party services</h2>
      <p>
        The Services may interoperate with third-party services and networks. Your use of those is governed by their own
        terms, and we are not responsible for their availability, security, or conduct.
      </p>

      <h2>9. Availability</h2>
      <p>
        We aim for high availability but do not guarantee uninterrupted service unless a written service level agreement
        is in place. We may perform maintenance, and will use reasonable efforts to give advance notice of planned
        downtime.
      </p>

      <h2>10. Beta features</h2>
      <p>
        Features labeled beta, preview, or experimental are provided as-is, may be modified or discontinued at any time,
        and are excluded from any availability commitment or warranty.
      </p>

      <h2>11. Disclaimer of warranties</h2>
      <p className="doc-caps">
        EXCEPT AS EXPRESSLY STATED, THE SERVICES ARE PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY KIND,
        WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
        PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, ERROR-FREE, OR
        SECURE, OR THAT DEFECTS WILL BE CORRECTED.
      </p>

      <h2>12. Limitation of liability</h2>
      <p className="doc-caps">
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEITHER PARTY WILL BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL,
        CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, REVENUE, DATA, OR GOODWILL, EVEN IF ADVISED
        OF THE POSSIBILITY.
      </p>
      <p className="doc-caps">
        OUR TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATING TO THESE TERMS WILL NOT EXCEED THE AMOUNTS YOU PAID US
        IN THE TWELVE MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM.
      </p>
      <p className="doc-caps">
        WE HAVE NO LIABILITY FOR ANY LOSS OF DIGITAL ASSETS, PRIVATE KEYS, OR FUNDS, OR FOR ANY BLOCKCHAIN TRANSACTION,
        GIVEN THE NON-CUSTODIAL NATURE OF THE SERVICES DESCRIBED IN SECTION 5.
      </p>
      <p>
        These limitations do not apply to either party’s liability for fraud, willful misconduct, or any liability that
        cannot be limited under applicable law.
      </p>

      <h2>13. Indemnification</h2>
      <p>
        You will defend, indemnify, and hold us harmless from third-party claims arising out of your Customer Data, your
        applications, your use of the Services in breach of these Terms, or your violation of law or third-party rights.
      </p>
      <p>
        We will defend you against third-party claims that the Services as provided infringe a US patent, copyright, or
        trademark, and pay damages finally awarded, provided you notify us promptly and allow us to control the defense.
      </p>

      <h2>14. Term and termination</h2>
      <p>
        These Terms apply for as long as you use the Services. Either party may terminate for convenience at the end of
        the then-current subscription term with written notice, or immediately for material breach not cured within 30
        days of notice.
      </p>
      <p>
        On termination, your license ends and you must cease use of the Services. You may export Customer Data for 30
        days following termination, after which we may delete it. Sections that by their nature should survive —
        including intellectual property, fees accrued, disclaimers, limitation of liability, and indemnification —
        survive termination.
      </p>

      <h2>15. Changes to these Terms</h2>
      <p>
        We may update these Terms. Material changes take effect 30 days after we post them and notify you by email, and
        apply from your next renewal term. Continued use after that date constitutes acceptance.
      </p>

      <h2>16. Governing law and disputes</h2>
      <p>
        These Terms are governed by the laws of the State of Delaware, without regard to conflict-of-laws rules. The
        parties submit to the exclusive jurisdiction of the state and federal courts located in Delaware. The UN
        Convention on Contracts for the International Sale of Goods does not apply.
      </p>

      <h2>17. General</h2>
      <p>
        These Terms, together with any order form and our <a href="/privacy">Privacy Policy</a>, constitute the entire
        agreement between the parties and supersede all prior discussions. Neither party may assign these Terms without
        the other’s consent, except in connection with a merger or sale of substantially all assets. If any provision is
        held unenforceable, the remainder stays in effect. Failure to enforce a provision is not a waiver. Nothing
        creates a partnership, joint venture, or agency relationship. Neither party is liable for delays caused by events
        beyond its reasonable control.
      </p>

      <h2>18. Contact</h2>
      <p>
        Questions about these Terms:{' '}
        <a href="mailto:legal@flowbond.life">
          <b>legal@flowbond.life</b>
        </a>
      </p>
    </PageShell>
  )
}
