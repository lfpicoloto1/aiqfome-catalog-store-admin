/**
 * Faixa de entrega por raio.
 * - POST (criar): sem `id`.
 * - PUT (atualizar): com `id` retornado pelo GET ([Update store delivery cost](https://developer.aiqfome.com/docs/api/v2/update-store-delivery-cost)).
 */

export type DeliveryRadiusRow = {
  /** Identificador da faixa na plataforma (obrigatório no PUT). */
  id?: number;
  distance_km: number;
  value: number;
  return_tax_value: number;
  delivery_code: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function asFiniteNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function parseOptionalId(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return Math.trunc(v);
  if (typeof v === "string" && /^\d+$/.test(v.trim())) return parseInt(v.trim(), 10);
  return undefined;
}

/** Extrai o array `radius` do JSON da API (várias formas comuns). */
export function extractRadiusArray(payload: unknown): unknown[] | undefined {
  if (!isRecord(payload)) return undefined;
  if (Array.isArray(payload.radius)) return payload.radius;
  const data = payload.data;
  if (isRecord(data)) {
    if (Array.isArray(data.radius)) return data.radius;
    const inner = data.data;
    if (isRecord(inner) && Array.isArray(inner.radius)) return inner.radius;
  }
  return undefined;
}

/** Indica se o payload declara a propriedade `radius` (mesmo que vazia ou null). */
export function radiusKeyPresentInPayload(payload: unknown): boolean {
  if (!isRecord(payload)) return false;
  if ("radius" in payload) return true;
  const data = payload.data;
  if (!isRecord(data)) return false;
  if ("radius" in data) return true;
  const inner = data.data;
  return isRecord(inner) && "radius" in inner;
}

export function parseDeliveryRadiusRows(payload: unknown): DeliveryRadiusRow[] {
  const raw = extractRadiusArray(payload);
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => isRecord(x))
    .map((x) => ({
      id: parseOptionalId(x.id),
      distance_km: asFiniteNumber(x.distance_km),
      value: asFiniteNumber(x.value),
      return_tax_value: asFiniteNumber(x.return_tax_value),
      delivery_code: typeof x.delivery_code === "string" ? x.delivery_code : String(x.delivery_code ?? ""),
    }));
}

export function emptyRadiusRow(): DeliveryRadiusRow {
  return { distance_km: 0, value: 0, return_tax_value: 0, delivery_code: "" };
}

/** Corpo POST — itens sem `id`. */
export function buildRadiusCreatePayload(rows: DeliveryRadiusRow[]): { radius: object[] } {
  return {
    radius: rows.map((r) => ({
      distance_km: r.distance_km,
      value: r.value,
      return_tax_value: r.return_tax_value,
      delivery_code: r.delivery_code.trim(),
    })),
  };
}

/** Corpo PUT — cada item deve incluir `id` (faixas já existentes na plataforma). */
export function buildRadiusPutPayload(rows: Array<DeliveryRadiusRow & { id: number }>): { radius: object[] } {
  return {
    radius: rows.map((r) => ({
      id: r.id,
      distance_km: r.distance_km,
      value: r.value,
      return_tax_value: r.return_tax_value,
      delivery_code: r.delivery_code.trim(),
    })),
  };
}
