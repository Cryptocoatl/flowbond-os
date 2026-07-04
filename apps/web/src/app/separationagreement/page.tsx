// Drop this at: app/separationagreement/page.tsx   (App Router)
// If the repo uses the pages router instead, save as: pages/separationagreement.tsx
// Self-contained. No imports beyond React. No Supabase, no flowscrow, no external components.

export const metadata = { title: "Separation Agreement — FlowBond Tech Inc." };

export default function SeparationAgreement() {
  return (
    <main style={{
      maxWidth: 820, margin: "0 auto", padding: "48px 22px 96px",
      fontFamily: "-apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      color: "#0f1115", lineHeight: 1.6, background: "#fff"
    }}>
      <p style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: "#7a869a", margin: 0 }}>
        Private — please do not share publicly
      </p>
      <h1 style={{ fontSize: 30, margin: "8px 0 4px", fontWeight: 800 }}>
        Mutual Dissolution, Wind-Up &amp; Release
      </h1>
      <p style={{ color: "#59647a", marginTop: 0 }}>FlowBond Tech Inc. (a Texas corporation)</p>

      {/* THE NOTE */}
      <section style={{ margin: "32px 0", padding: "22px 24px", background: "#f6f8fb", borderRadius: 14, border: "1px solid #e6ebf2" }}>
        <p style={{ marginTop: 0 }}>
          Thank you for the openness in where we landed. I think dissolving the company together is the
          cleanest and kindest way to close this chapter — no drawn-out transfer, no lingering ties, just a
          clear ending we can both walk away from with respect.
        </p>
        <p>This agreement reflects exactly that. In short:</p>
        <ul style={{ margin: "0 0 12px", paddingLeft: 20 }}>
          <li>We voluntarily dissolve FlowBond Tech Inc. together and wind it down properly.</li>
          <li>The FlowBond and DANZ domains, code, and names come to Estefanía to carry forward.</li>
          <li>You sign a straightforward commitment not to use the FlowBond or DANZ names going forward.</li>
          <li>We give each other a full mutual release, close the accounts, and we&rsquo;re both free and clear.</li>
        </ul>
        <p style={{ margin: 0 }}>
          Wallet keys and seeds stay out of the document and are handled securely. The FlowScrow checklist
          below shows the order of steps so nothing is left hanging. I genuinely wish you well in what comes
          next. If this reflects your understanding, I&rsquo;m ready to sign and get it done quickly.
        </p>
        <p style={{ margin: "14px 0 0", fontWeight: 600 }}>— Estefanía</p>
      </section>

      {/* AGREEMENT */}
      <Section n="Parties">
        <p>This Agreement is made as of <b>July 4, 2026</b> between <b>Estefanía Ferrera</b>, Founder &amp; CEO
        (&ldquo;Estefanía&rdquo;), and <b>Russell Alan Herod</b>, also known as koH Russell Herod (&ldquo;Russell&rdquo;),
        the founders and shareholders of FlowBond Tech Inc. (the &ldquo;Company&rdquo;).</p>
      </Section>

      <Section n="Recitals">
        <p>The Parties have jointly and voluntarily decided to dissolve and wind up the Company and to
        separate cleanly and permanently. As part of the wind-up they will transfer certain assets to
        Estefanía, confirm the disposition of the FlowBond and DANZ Brand, close the Company&rsquo;s accounts,
        and grant mutual releases. Harmonik Habitats and anything outside the FlowBond / DANZ / FlowB
        workstreams (the &ldquo;Scope&rdquo;) are expressly excluded.</p>
      </Section>

      <Section n="1 · Definitions">
        <p><b>Brand</b> — the names, trademarks, service marks, logos, trade dress, domain-associated identity,
        and goodwill of &ldquo;FlowBond&rdquo; and &ldquo;DANZ,&rdquo; and any confusingly similar name or mark.</p>
        <p><b>Domains</b> — flowbond.tech, danz.now, flowb.me, pee.network, and any other Scope domain held by
        or for the Company or Russell.</p>
        <p><b>Closing</b> — when this Agreement is executed and delivered by both Parties.</p>
        <p><b>Dissolution</b> — voluntary termination of the Company under the Texas Business Organizations
        Code, completed by filing a Certificate of Termination with the Texas Secretary of State after tax
        clearance.</p>
      </Section>

      <Section n="2 · Consent to Dissolution &amp; Wind-Up">
        <p>Each Party, as shareholder and director, consents to the voluntary Dissolution. The Parties will
        cooperate to wind up the Company: settle or provide for known liabilities, file final federal and
        Texas franchise tax returns, obtain a Certificate of Account Status (tax clearance) from the Texas
        Comptroller, and file the Certificate of Termination with the Texas Secretary of State. Russell
        resigns from all positions effective at Closing and confirms no claim for compensation or fees.</p>
      </Section>

      <Section n="3 · Transfer of Assets to Estefanía">
        <p>Effective at Closing, the Company and Russell transfer to Estefanía all right, title, and interest
        in: the Domains; all Company code, repositories, and product IP; and the Brand. Domains transfer to
        Estefanía&rsquo;s Namecheap account &ldquo;stepbysteph&rdquo; with auth/EPP codes and full DNS control.
        The GitHub user &ldquo;cryptocoatl&rdquo; and the organization &ldquo;FlowBond HQ&rdquo; are Estefanía&rsquo;s and
        are not subject to this Agreement; the former &ldquo;FlowBond Tech&rdquo; organization is transferred to
        Estefanía, or otherwise archived and clearly marked as deprecated, non-living code. Mercury, Stripe,
        and Coinbase are closed or transferred as Estefanía directs, with Russell removed from each.</p>
      </Section>

      <Section n="4 · FlowBond &amp; DANZ Brand">
        <p>Russell irrevocably waives and assigns to Estefanía all interest in the Brand, including goodwill
        and any trademark rights, and covenants — perpetually and in every jurisdiction — never to use,
        adopt, register, or claim any right in &ldquo;FlowBond&rdquo; or &ldquo;DANZ&rdquo; or any confusingly similar
        name or mark. Estefanía may freely use, develop, license, and register the Brand (including with the
        USPTO and IMPI) without any further consent from Russell. This Section survives the Dissolution
        indefinitely.</p>
      </Section>

      <Section n="5 · Sequencing">
        <p>This Agreement is executed and delivered by both Parties before any transfer, resignation, account
        change, or Dissolution filing occurs, per the FlowScrow plan below.</p>
      </Section>

      <Section n="6–13 · Release &amp; Protections">
        <p><b>Mutual release</b> at Closing of all Scope claims arising on or before Closing (excluding breach
        of this Agreement and anything outside the Scope). Russell <b>represents</b> he has disclosed all known
        Company liabilities and holds no undisclosed claims. Russell <b>indemnifies</b> Estefanía for breach of
        this Agreement, breach of the Brand covenant, or any undisclosed liability he created. <b>Mutual
        non-disparagement, no-reference, and confidentiality</b> apply. Wallet seeds and keys are delivered
        only through a secure channel and never recorded in this Agreement.</p>
      </Section>

      <Section n="14–19 · General">
        <p>Notices by email — Estefanía: stepbystephbtm@gmail.com; Russell: cryptokoh@gmail.com. This is the
        entire agreement, amendable only in writing signed by both Parties, severable, governed by the laws
        of the State of Texas with exclusive venue in Travis County, and may be signed in counterparts
        including by electronic signature.</p>
      </Section>

      {/* FLOWSCROW */}
      <h2 style={{ fontSize: 20, marginTop: 40, fontWeight: 800 }}>Exhibit 3 — FlowScrow Closing Plan</h2>
      <p style={{ color: "#59647a", marginTop: 0 }}>A conditional, phased close. Each phase completes only after the prior phase is verified.</p>

      <Phase title="Phase A — Execution (into escrow)" items={[
        "Both Parties e-sign the Agreement.",
        "Russell signs the Consent to Dissolution and resignation.",
        "Russell signs the Brand waiver/assignment (Section 4).",
        "Witnesses recorded; tracking opened.",
      ]} />
      <Phase title="Phase B — Transfers & Covenants (verified by Estefanía)" items={[
        "Domains (flowbond.tech, danz.now, flowb.me, pee.network) transferred to “stepbysteph” + auth codes; DNS confirmed.",
        "Former FlowBond Tech GitHub org transferred to Estefanía (or archived + marked non-living).",
        "Mercury — Russell removed. Stripe — ownership to Estefanía. Coinbase — Russell removed; keys via secure channel.",
        "Telegram / Base App / Farcaster / social profiles transferred or de-identified.",
        "Estefanía confirms all Phase B items complete.",
      ]} />
      <Phase title="Phase C — Dissolution & Clearing" items={[
        "Final federal (1120) and Texas final franchise tax reports filed.",
        "Certificate of Account Status (tax clearance) obtained from the Texas Comptroller.",
        "Certificate of Termination filed with the Texas Secretary of State (only after tax clearance).",
        "All remaining Company accounts closed.",
        "Dissolution effective; mutual release effective; witnesses attest completion.",
      ]} />

      <p style={{ marginTop: 32, fontSize: 13, color: "#7a869a" }}>
        Texas requires the Comptroller&rsquo;s tax-clearance certificate before the Secretary of State will
        accept the Certificate of Termination. Phase C is a sequence of filings, not a single signature.
      </p>
    </main>
  );
}

function Section({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 26 }}>
      <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 6px" }} dangerouslySetInnerHTML={{ __html: n }} />
      <div>{children}</div>
    </section>
  );
}

function Phase({ title, items }: { title: string; items: string[] }) {
  return (
    <div style={{ marginTop: 18, padding: "16px 18px", border: "1px solid #e6ebf2", borderRadius: 12 }}>
      <p style={{ fontWeight: 700, margin: "0 0 10px" }}>{title}</p>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        {items.map((t, i) => <li key={i} style={{ margin: "0 0 6px" }}>{t}</li>)}
      </ul>
    </div>
  );
}
