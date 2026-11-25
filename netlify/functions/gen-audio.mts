// Background job: synthesizes every clip with the chosen voice into Blobs, then packs bundles + index.
// Re-invokes itself before the 15-minute limit until everything is done. Protected by the teacher PIN.
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { getStore } from "@netlify/blobs";
import { CLIPS, BUNDLES, VOICE, RATE, VERSION } from "./lib/clips.mts";

async function connect() {
  const tts = new MsEdgeTTS({ connectionTimeoutMs: 8000, synthesisTimeoutMs: 10000 });
  await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  return tts;
}
function synth(tts: MsEdgeTTS, text: string): Promise<Buffer> {
  const { audioStream } = tts.toStream(text, { rate: RATE });
  const chunks: Buffer[] = [];
  return new Promise((res, rej) => {
    audioStream.on("data", (d: Buffer) => chunks.push(d));
    audioStream.on("close", () => (chunks.length ? res(Buffer.concat(chunks)) : rej(new Error("empty audio"))));
    audioStream.on("error", rej);
  });
}

export default async (req: Request) => {
  const pin = Netlify.env.get("TEACHER_PIN");
  if (!pin || req.headers.get("x-pin") !== pin) return;
  const clips = getStore(`clips-${VERSION}`);
  const out = getStore(`audio-${VERSION}`);
  const status = async (s: object) => out.setJSON("status.json", { ...s, updated: Date.now() });
  const deadline = Date.now() + 12 * 60 * 1000;

  const { blobs } = await clips.list();
  const have = new Set(blobs.map((b) => b.key));
  const todo = CLIPS.filter((c) => !have.has(c.name));
  let done = CLIPS.length - todo.length, failed: string[] = [];
  let tts: MsEdgeTTS | null = null;

  for (const c of todo) {
    if (Date.now() > deadline) {
      await status({ phase: "generating", done, total: CLIPS.length, failed: failed.length });
      await fetch(new URL("/api/gen-audio", req.url), { method: "POST", headers: { "x-pin": pin } });
      return;
    }
    let ok = false;
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      try {
        if (!tts) tts = await connect();
        const buf = await synth(tts, c.text);
        await clips.set(c.name, buf);
        ok = true;
      } catch {
        try { tts?.close(); } catch {}
        tts = null;
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
    if (ok) done++; else failed.push(c.name);
    if (done % 100 === 0) await status({ phase: "generating", done, total: CLIPS.length, failed: failed.length });
  }
  try { tts?.close(); } catch {}
  if (failed.length) {
    // try the failures again on a fresh run
    await status({ phase: "retrying", done, total: CLIPS.length, failed: failed.length, failedNames: failed.slice(0, 50) });
    await fetch(new URL("/api/gen-audio", req.url), { method: "POST", headers: { "x-pin": pin } });
    return;
  }

  await status({ phase: "packing", done, total: CLIPS.length, failed: 0 });
  const index: { f: string[]; c: Record<string, [number, number, number]>; common: number } = { f: [], c: {}, common: 0 };
  for (const b of BUNDLES) {
    const fi = index.f.length;
    index.f.push(`api/audio/${VERSION}/${b.file}`);
    const parts: Buffer[] = [];
    let off = 0;
    for (const n of b.names) {
      const ab = await clips.get(n, { type: "arrayBuffer" });
      if (!ab) continue;
      const buf = Buffer.from(ab);
      parts.push(buf);
      index.c[n] = [fi, off, buf.length];
      off += buf.length;
    }
    await out.set(`bundle/${b.file}`, Buffer.concat(parts));
  }
  await out.setJSON("index.json", index);
  await status({ phase: "ready", done, total: CLIPS.length, failed: 0, bundles: index.f.length });
};

export const config = { path: "/api/gen-audio", background: true };
