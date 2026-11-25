import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { getStore } from "@netlify/blobs";

// Voice samples for the teacher to choose from. Only these voices and short texts are allowed.
const VOICES = ["en-US-JennyNeural", "en-US-AndrewNeural", "en-GB-SoniaNeural", "en-US-AvaNeural"];
const RATES = ["-20%", "-15%", "-10%", "+0%"];

async function synth(text: string, voice: string, rate: string): Promise<Buffer> {
  const tts = new MsEdgeTTS({ connectionTimeoutMs: 6000, synthesisTimeoutMs: 6000 });
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text, { rate });
  const chunks: Buffer[] = [];
  await new Promise<void>((res, rej) => {
    audioStream.on("data", (d: Buffer) => chunks.push(d));
    audioStream.on("close", () => res());
    audioStream.on("error", rej);
  });
  try { tts.close(); } catch {}
  return Buffer.concat(chunks);
}

export default async (req: Request) => {
  const u = new URL(req.url);
  if (u.searchParams.get("diag") === "1") {
    const out: any = {};
    try { const r = await fetch("https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list?trustedclienttoken=6A5AA1D4EAFF4E9FB37E23D68491D6F4"); out.voicesHttp = r.status; } catch (e) { out.voicesHttp = String(e); }
    const t0 = Date.now();
    try { const b = await synth("Hello.", "en-US-JennyNeural", "+0%"); out.synthBytes = b.length; } catch (e) { out.synthError = String((e as any)?.message || e).slice(0, 400); }
    out.ms = Date.now() - t0;
    return Response.json(out);
  }
  const v = u.searchParams.get("v") || "";
  const r = u.searchParams.get("r") || "-15%";
  const t = (u.searchParams.get("t") || "").slice(0, 160);
  if (!VOICES.includes(v) || !RATES.includes(r) || !t.trim()) return new Response("bad request", { status: 400 });
  const store = getStore("tts-samples");
  const key = encodeURIComponent(`${v}|${r}|${t}`);
  const cached = await store.get(key, { type: "arrayBuffer" });
  const headers = { "content-type": "audio/mpeg", "cache-control": "public, max-age=86400" };
  if (cached) return new Response(cached, { headers });
  try {
    const buf = await synth(t, v, r);
    if (!buf.length) throw new Error("empty audio");
    await store.set(key, buf);
    return new Response(buf, { headers });
  } catch (e) {
    return new Response("tts failed: " + String((e as any)?.message || e).slice(0, 400), { status: 502 });
  }
};

export const config = { path: "/api/tts-sample" };
