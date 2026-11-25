import { EdgeTTS } from "edge-tts-universal";
import { getStore } from "@netlify/blobs";

// Voice samples for the teacher to choose from. Only these voices and short texts are allowed.
const VOICES = ["en-US-JennyNeural", "en-US-AndrewNeural", "en-GB-SoniaNeural", "en-US-AvaNeural"];
const RATES = ["-20%", "-15%", "-10%", "+0%"];

export default async (req: Request) => {
  const u = new URL(req.url);
  const v = u.searchParams.get("v") || "";
  const r = u.searchParams.get("r") || "-15%";
  const t = (u.searchParams.get("t") || "").slice(0, 160);
  if (!VOICES.includes(v) || !RATES.includes(r) || !t.trim()) return new Response("bad request", { status: 400 });
  const store = getStore("tts-samples");
  const key = encodeURIComponent(`${v}|${r}|${t}`);
  const cached = await store.get(key, { type: "arrayBuffer" });
  if (cached) return new Response(cached, { headers: { "content-type": "audio/mpeg", "cache-control": "public, max-age=86400" } });
  try {
    const res = await new EdgeTTS(t, v, { rate: r }).synthesize();
    const buf = await res.audio.arrayBuffer();
    await store.set(key, buf);
    return new Response(buf, { headers: { "content-type": "audio/mpeg", "cache-control": "public, max-age=86400" } });
  } catch (e) {
    return new Response("tts failed: " + String(e), { status: 502 });
  }
};

export const config = { path: "/api/tts-sample" };
