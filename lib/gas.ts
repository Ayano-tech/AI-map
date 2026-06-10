const GAS_URL = process.env.GAS_WEB_APP_URL!;

export async function gasGet(params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${GAS_URL}?${query}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GAS GET failed: ${res.status}`);
  return res.json();
}

export async function gasPost(body: Record<string, unknown>) {
  const res = await fetch(GAS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GAS POST failed: ${res.status}`);
  return res.json();
}
