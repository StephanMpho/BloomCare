export function rand(cents: number | null | undefined) {
  if (cents == null) return "—";
  const neg = cents < 0;
  const [whole, dec] = (Math.abs(cents) / 100).toFixed(2).split(".");
  return (neg ? "−R" : "R") + groupThousands(whole) + "." + dec;
}

export function randShort(cents: number) {
  const neg = cents < 0;
  return (neg ? "−R" : "R") + groupThousands(String(Math.round(Math.abs(cents) / 100)));
}

function groupThousands(s: string) {
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** Parse a user-entered rand amount ("45", "45.50", "R 45,50") to cents. */
export function parseRand(input: string | null | undefined): number | null {
  if (input == null) return null;
  const cleaned = String(input).replace(/[Rr\s]/g, "").replace(",", ".");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
