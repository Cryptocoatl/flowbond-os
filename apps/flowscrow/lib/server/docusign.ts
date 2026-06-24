import 'server-only';
import crypto from 'node:crypto';

// DocuSign eSignature via JWT grant (server-side only). All secrets come from env
// and never reach the client. The binding signature is DocuSign's; FlowScrow only
// orchestrates envelopes and records their status + sha256.

export interface DocusignConfig {
  baseUrl: string; // REST base, e.g. https://demo.docusign.net/restapi
  oauthBase: string; // account-d.docusign.com (demo) | account.docusign.com (prod)
  integrationKey: string;
  userId: string;
  accountId: string;
  privateKey: string;
}

export function docusignConfig(): DocusignConfig | null {
  const {
    DOCUSIGN_BASE_URL,
    DOCUSIGN_OAUTH_BASE,
    DOCUSIGN_INTEGRATION_KEY,
    DOCUSIGN_USER_ID,
    DOCUSIGN_ACCOUNT_ID,
    DOCUSIGN_PRIVATE_KEY,
  } = process.env;
  if (
    !DOCUSIGN_BASE_URL ||
    !DOCUSIGN_OAUTH_BASE ||
    !DOCUSIGN_INTEGRATION_KEY ||
    !DOCUSIGN_USER_ID ||
    !DOCUSIGN_ACCOUNT_ID ||
    !DOCUSIGN_PRIVATE_KEY
  ) {
    return null;
  }
  return {
    baseUrl: DOCUSIGN_BASE_URL,
    oauthBase: DOCUSIGN_OAUTH_BASE,
    integrationKey: DOCUSIGN_INTEGRATION_KEY,
    userId: DOCUSIGN_USER_ID,
    accountId: DOCUSIGN_ACCOUNT_ID,
    // Support both raw PEM and \n-escaped single-line env values.
    privateKey: DOCUSIGN_PRIVATE_KEY.includes('\\n')
      ? DOCUSIGN_PRIVATE_KEY.replace(/\\n/g, '\n')
      : DOCUSIGN_PRIVATE_KEY,
  };
}

export const isDocusignConfigured = () => docusignConfig() !== null;

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/** Sign a JWT (RS256) with Node crypto — no external dependency. */
function signJwt(payload: Record<string, unknown>, privateKey: string): string {
  const header = { alg: 'RS256', typ: 'JWT' };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(signingInput), privateKey);
  return `${signingInput}.${b64url(signature)}`;
}

/** Exchange the JWT assertion for an access token (impersonated user). */
export async function getAccessToken(cfg: DocusignConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const assertion = signJwt(
    {
      iss: cfg.integrationKey,
      sub: cfg.userId,
      aud: cfg.oauthBase,
      iat: now,
      exp: now + 3600,
      scope: 'signature impersonation',
    },
    cfg.privateKey,
  );

  const res = await fetch(`https://${cfg.oauthBase}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!res.ok) {
    throw new Error(`docusign token error ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

export interface EnvelopeRecipient {
  email: string;
  name: string;
  recipientId: string;
  routingOrder?: number;
}

export interface CreateEnvelopeInput {
  emailSubject: string;
  /** base64-encoded PDF */
  documentBase64: string;
  documentName: string;
  recipients: EnvelopeRecipient[];
  /** 'sent' to send immediately, 'created' to keep as draft */
  status?: 'sent' | 'created';
}

/**
 * Create an envelope. One envelope carries the agreement (both recipients); a
 * second carries the courtesy letter (Ferrera only). Returns the envelope id.
 */
export async function createEnvelope(input: CreateEnvelopeInput): Promise<string> {
  const cfg = docusignConfig();
  if (!cfg) throw new Error('docusign_not_configured');
  const token = await getAccessToken(cfg);

  const body = {
    emailSubject: input.emailSubject,
    status: input.status ?? 'sent',
    documents: [
      {
        documentBase64: input.documentBase64,
        name: input.documentName,
        fileExtension: 'pdf',
        documentId: '1',
      },
    ],
    recipients: {
      signers: input.recipients.map((r) => ({
        email: r.email,
        name: r.name,
        recipientId: r.recipientId,
        routingOrder: String(r.routingOrder ?? 1),
        tabs: {
          signHereTabs: [
            { anchorString: '/sig/', anchorUnits: 'pixels', anchorXOffset: '0', anchorYOffset: '0' },
          ],
        },
      })),
    },
  };

  const res = await fetch(`${cfg.baseUrl}/v2.1/accounts/${cfg.accountId}/envelopes`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`docusign envelope error ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as { envelopeId: string };
  return json.envelopeId;
}

/**
 * Generate a recipient view (embedded signing) URL for a given signer. The page
 * embeds this in an iframe so the party signs without leaving FlowScrow.
 */
export async function createRecipientView(
  envelopeId: string,
  recipient: { email: string; name: string; recipientId: string; clientUserId?: string },
  returnUrl: string,
): Promise<string> {
  const cfg = docusignConfig();
  if (!cfg) throw new Error('docusign_not_configured');
  const token = await getAccessToken(cfg);

  const res = await fetch(
    `${cfg.baseUrl}/v2.1/accounts/${cfg.accountId}/envelopes/${envelopeId}/views/recipient`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        returnUrl,
        authenticationMethod: 'none',
        email: recipient.email,
        userName: recipient.name,
        recipientId: recipient.recipientId,
        clientUserId: recipient.clientUserId ?? recipient.recipientId,
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`docusign recipient view error ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as { url: string };
  return json.url;
}

/**
 * Verify the HMAC signature DocuSign Connect attaches to webhook deliveries.
 * Returns true if no HMAC key is configured (so non-prod still works) — set
 * DOCUSIGN_CONNECT_HMAC_KEY to enforce.
 */
export function verifyConnectHmac(rawBody: string, signatureHeader: string | null): boolean {
  const key = process.env.DOCUSIGN_CONNECT_HMAC_KEY;
  if (!key) return true;
  if (!signatureHeader) return false;
  const computed = crypto.createHmac('sha256', key).update(rawBody, 'utf8').digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
}
