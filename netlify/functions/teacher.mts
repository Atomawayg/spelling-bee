import { getStore } from "@netlify/blobs";

export default async (req: Request) => {
  const pin = Netlify.env.get("TEACHER_PIN");
  if (!pin || req.headers.get("x-pin") !== pin) return Response.json({ error: "wrong pin" }, { status: 401 });
  const store = getStore({ name: "students", consistency: "strong" });
  if (req.method === "DELETE") {
    const k = new URL(req.url).searchParams.get("key");
    if (!k) return Response.json({ error: "no key" }, { status: 400 });
    await store.delete(k);
    return Response.json({ ok: true });
  }
  const { blobs } = await store.list();
  const rows = await Promise.all(blobs.map(async (b) => {
    const r = (await store.get(b.key, { type: "json" })) as any;
    return r ? { key: b.key, cls: r.cls, name: r.name, updated: r.updated, state: r.state } : null;
  }));
  return Response.json({ students: rows.filter(Boolean) }, { headers: { "cache-control": "no-store" } });
};

export const config = { path: "/api/teacher", method: ["GET", "DELETE"] };
