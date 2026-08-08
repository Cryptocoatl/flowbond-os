// ============================================================================
// PaymentAdapter — §6. El resto del sistema solo conoce esta interfaz. Cambiar
// de proveedor (o encender Mercado Pago) es implementar tres métodos + poner el
// token. La cadencia decide el instrumento: 'unica' = pago único (Checkout Pro),
// 'mensual' = suscripción (preapproval).
// ============================================================================

export type Cadencia = "unica" | "mensual";

export interface Charge {
  id: string;
  status: "pending" | "paid" | "failed" | "refunded";
  amountMxn: number;
  provider: string;
  cadencia: Cadencia;
  /** URL de pago hospedado si el proveedor la da; null si es manual */
  checkoutUrl: string | null;
  /** id externo (preference/preapproval) para conciliar el webhook */
  externalRef: string | null;
}

export interface CreateChargeInput {
  orderId: string;
  amountMxn: number;
  cadencia: Cadencia;
  /** riel A cobra BrandMark; riel B cobra la A.C. Determina la cuenta destino. */
  riel: "A" | "B";
  concept: string;
  email?: string;
  /** a dónde vuelve el pagador tras Checkout Pro */
  backUrl?: string;
}

export interface PaymentAdapter {
  readonly provider: string;
  createCharge(input: CreateChargeInput): Promise<Charge>;
  getStatus(chargeId: string): Promise<Charge>;
  refund(chargeId: string): Promise<Charge>;
}

/**
 * Transferencia / CFDI manual. No mueve dinero en línea; deja la orden 'pending'
 * para conciliación humana (o el endpoint admin /payment/manual). Adaptador real,
 * no un stub que lanza: el checkout funciona de punta a punta sin proveedor en línea.
 */
export class ManualTransferAdapter implements PaymentAdapter {
  readonly provider = "manual_transfer";
  async createCharge(i: CreateChargeInput): Promise<Charge> {
    return {
      id: `manual:${i.orderId}`,
      status: "pending",
      amountMxn: i.amountMxn,
      provider: this.provider,
      cadencia: i.cadencia,
      checkoutUrl: null,
      externalRef: null,
    };
  }
  async getStatus(id: string): Promise<Charge> {
    return { id, status: "pending", amountMxn: 0, provider: this.provider, cadencia: "unica", checkoutUrl: null, externalRef: null };
  }
  async refund(id: string): Promise<Charge> {
    return { id, status: "refunded", amountMxn: 0, provider: this.provider, cadencia: "unica", checkoutUrl: null, externalRef: null };
  }
}

/**
 * Mercado Pago. Esqueleto LISTO PARA CONECTAR: las llamadas reales a la API van
 * escritas y solo corren si hay MP_ACCESS_TOKEN. Sin token, degrada a 'pending'
 * con checkoutUrl null (igual que manual) — nunca rompe el checkout.
 *   - 'unica'   → POST /checkout/preferences  → init_point
 *   - 'mensual' → POST /preapproval           → init_point (suscripción)
 * Lo único que falta para cobrar de verdad: poner el token y dar de alta el
 * webhook a /webhook/mercadopago. La dispersión a los splits se conecta aparte
 * (ledger sanitemplo_disbursements ya deja cada beneficiario 'pending').
 */
export class MercadoPagoAdapter implements PaymentAdapter {
  readonly provider = "mercadopago";
  constructor(private token: string) {}

  private headers() {
    return { authorization: `Bearer ${this.token}`, "content-type": "application/json" };
  }

  async createCharge(i: CreateChargeInput): Promise<Charge> {
    if (!this.token) {
      return { id: `mp:unconfigured:${i.orderId}`, status: "pending", amountMxn: i.amountMxn, provider: this.provider, cadencia: i.cadencia, checkoutUrl: null, externalRef: null };
    }
    const back = i.backUrl ?? "https://reciprociudad.lat/sanitemplo/sponsors/gracias";

    if (i.cadencia === "mensual") {
      const res = await fetch("https://api.mercadopago.com/preapproval", {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          reason: i.concept,
          external_reference: i.orderId,
          payer_email: i.email,
          back_url: back,
          auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: i.amountMxn, currency_id: "MXN" },
          status: "pending",
        }),
      });
      const data = (await res.json()) as { id?: string; init_point?: string };
      return { id: data.id ?? "", status: "pending", amountMxn: i.amountMxn, provider: this.provider, cadencia: "mensual", checkoutUrl: data.init_point ?? null, externalRef: data.id ?? null };
    }

    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        items: [{ title: i.concept, quantity: 1, unit_price: i.amountMxn, currency_id: "MXN" }],
        external_reference: i.orderId,
        payer: i.email ? { email: i.email } : undefined,
        back_urls: { success: back, pending: back, failure: back },
        auto_return: "approved",
      }),
    });
    const data = (await res.json()) as { id?: string; init_point?: string };
    return { id: data.id ?? "", status: "pending", amountMxn: i.amountMxn, provider: this.provider, cadencia: "unica", checkoutUrl: data.init_point ?? null, externalRef: data.id ?? null };
  }

  async getStatus(paymentId: string): Promise<Charge> {
    if (!this.token) return { id: paymentId, status: "pending", amountMxn: 0, provider: this.provider, cadencia: "unica", checkoutUrl: null, externalRef: null };
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, { headers: this.headers() });
    const p = (await res.json()) as { status?: string; transaction_amount?: number; external_reference?: string };
    const status = p.status === "approved" ? "paid" : p.status === "refunded" ? "refunded" : p.status === "rejected" ? "failed" : "pending";
    return { id: paymentId, status, amountMxn: p.transaction_amount ?? 0, provider: this.provider, cadencia: "unica", checkoutUrl: null, externalRef: p.external_reference ?? null };
  }

  async refund(paymentId: string): Promise<Charge> {
    if (this.token) await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}/refunds`, { method: "POST", headers: this.headers() });
    return { id: paymentId, status: "refunded", amountMxn: 0, provider: this.provider, cadencia: "unica", checkoutUrl: null, externalRef: null };
  }
}

/** Elige el adaptador por entorno. MP si hay token; si no, transferencia manual. */
export function selectAdapter(env: { MP_ACCESS_TOKEN?: string }): PaymentAdapter {
  return env.MP_ACCESS_TOKEN ? new MercadoPagoAdapter(env.MP_ACCESS_TOKEN) : new ManualTransferAdapter();
}
