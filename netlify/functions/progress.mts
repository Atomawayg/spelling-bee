import { getStore } from "@netlify/blobs";

const clean = (s: string) => s.normalize("NFC").trim().replace(/\s+/g, " ");
const keyOf = (cls: string, name: string) =>
  `${encodeURIComponent(clean(cls))}/${encodeURIComponent(clean(name).toLowerCase())}`;
const CLASSES = ["ม.1", "ม.2", "ม.3", "ครู/อื่นๆ"];

export default async (req: Request) => {
  const store = getStore({ name: "students", consistency: "strong" });

  if (req.method === "GET") {
    const u = new URL(req.url);
    const cls = u.searchParams.get("cls") || "";
    const name = clean(u.searchParams.get("name") || "");
    if (!CLASSES.includes(cls) || name.length < 2) return Response.json({ error: "bad name" }, { status: 400 });
    const rec = (await store.get(keyOf(cls, name), { type: "json" })) as any;
    return Response.json({ state: rec?.state ?? null }, { headers: { "cache-control": "no-store" } });
  }

  if (req.method === "POST") {
    let b: any;
    try { b = JSON.parse(await req.text()); } catch { return Response.json({ error: "bad json" }, { status: 400 }); }
    const cls = String(b?.cls || ""), name = clean(String(b?.name || ""));
    const state = b?.state;
    if (!CLASSES.includes(cls) || name.length < 2 || name.length > 60) return Response.json({ error: "bad name" }, { status: 400 });
    if (!state || typeof state !== "object" || Array.isArray(state)) return Response.json({ error: "bad state" }, { status: 400 });
    if (JSON.stringify(state).length > 300_000) return Response.json({ error: "too large" }, { status: 413 });
    const key = keyOf(cls, name);
    const cur = (await store.get(key, { type: "json" })) as any;
    // keep whichever copy is newer, so an old device cannot overwrite newer progress
    if (cur?.state?.u && (state.u || 0) < cur.state.u) return Response.json({ ok: false, stale: true });
    await store.setJSON(key, { cls, name, state, updated: Date.now() });
    return Response.json({ ok: true });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config = { path: "/api/progress" };
