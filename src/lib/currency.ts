export function fmt(amount: number | string | null | undefined, currency = "EGP") {
  const n = Number(amount ?? 0);
  return `${n.toLocaleString("en-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

export function priceOf(p: any): number {
  if (p?.is_offer && p?.offer_price) return Number(p.offer_price);
  return Number(p?.retail_price ?? 0);
}
