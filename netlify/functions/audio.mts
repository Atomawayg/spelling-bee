// Serves the generated voice: /api/audio/index.json (current index), /api/audio/status.json, /api/audio/<version>/<bundle>.mp3
import { getStore } from "@netlify/blobs";
import { VERSION } from "./lib/clips.mts";
import type { Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  const parts = (context.params["0"] ?? new URL(req.url).pathname.replace(/^\/api\/audio\//, "")).split("/");
  if (parts.length === 1 && (parts[0] === "index.json" || parts[0] === "status.json")) {
    const v = await getStore(`audio-${VERSION}`).get(parts[0], { type: "json" });
    if (!v) return Response.json({ error: "not ready" }, { status: 404, headers: { "cache-control": "no-store" } });
    return Response.json(v, { headers: { "cache-control": "public, max-age=60" } });
  }
  if (parts.length === 2 && /^[a-z0-9-]+$/.test(parts[0]) && /^[a-z0-9]+\.mp3$/.test(parts[1])) {
    const b = await getStore(`audio-${parts[0]}`).get(`bundle/${parts[1]}`, { type: "arrayBuffer" });
    if (!b) return new Response("not found", { status: 404 });
    return new Response(b, { headers: { "content-type": "audio/mpeg", "cache-control": "public, max-age=31536000, immutable" } });
  }
  return new Response("not found", { status: 404 });
};

export const config = { path: "/api/audio/*" };
