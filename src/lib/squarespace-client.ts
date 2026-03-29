const API_VERSION = "1.0";
const BASE = `https://api.squarespace.com/${API_VERSION}`;

export type SquarespaceOrder = {
  id: string;
  fulfillmentStatus: string;
  grandTotal?: { value: string; currency: string };
  refundedTotal?: { value: string; currency: string };
  testmode?: boolean;
  lineItems?: { productName?: string; sku?: string | null }[];
};

export class SquarespaceClient {
  constructor(
    private readonly apiKey: string,
    private readonly userAgent: string
  ) {}

  async getOrder(orderId: string): Promise<SquarespaceOrder | null> {
    const url = `${BASE}/commerce/orders/${encodeURIComponent(orderId)}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "User-Agent": this.userAgent,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Squarespace Orders API ${res.status}: ${text.slice(0, 200)}`
      );
    }
    const data = await res.json();
    return data as SquarespaceOrder;
  }

  async listOrders(params: {
    modifiedAfter: string;
    modifiedBefore: string;
  }): Promise<{ result: SquarespaceOrder[] }> {
    const q = new URLSearchParams({
      modifiedAfter: params.modifiedAfter,
      modifiedBefore: params.modifiedBefore,
    });
    const url = `${BASE}/commerce/orders?${q}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "User-Agent": this.userAgent,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Squarespace list orders ${res.status}: ${text.slice(0, 200)}`
      );
    }
    return (await res.json()) as { result: SquarespaceOrder[] };
  }
}
