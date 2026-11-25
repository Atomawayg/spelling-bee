// Defines every audio clip the app needs and how clips are grouped into downloadable bundles.
import W from "./words.json" with { type: "json" };

export const VOICE = "en-US-JennyNeural";
export const RATE = "-10%";
export const VERSION = "jenny-10"; // change to regenerate everything into fresh stores

const POSN: Record<string, string> = { "n.": "noun", "v.": "verb", "adj.": "adjective", "adv.": "adverb", "prep.": "preposition", "conj.": "conjunction" };
const posName = (p: string) => p.split("/").map((s) => POSN[s.trim()] ?? s).join(" or ");
const splitTip = (s: string) => {
  if (!s.startsWith("Remember")) return s;
  const i = s.indexOf(". ");
  return i > 0 && i < s.length - 2 ? s.slice(i + 2) : "";
};
const posKey = (p: string) => "P_" + p.toLowerCase().replace(/[^a-z]/g, "");

const words = W as unknown as [string, string, string, string, string, string][];

export const CLIPS: { name: string; text: string }[] = [];
const seenPos = new Set<string>();
for (const p of [...new Set(words.map((x) => x[1]))].sort()) {
  if (seenPos.has(posKey(p))) continue;
  seenPos.add(posKey(p));
  const n = posName(p);
  CLIPS.push({ name: posKey(p), text: `It is ${/^[aeiou]/.test(n) ? "an" : "a"} ${n}.` });
}
words.forEach((x, i) => {
  CLIPS.push({ name: `w${i}`, text: `${x[0]}.` });
  CLIPS.push({ name: `s${i}`, text: splitTip(x[4]) || `The word is ${x[0]}.` });
});

export const BUNDLES: { file: string; names: string[] }[] = [{ file: "c.mp3", names: [...seenPos] }];
for (const lv of ["X", "B2", "C1", "B1"]) {
  const idx = words.map((x, i) => (x[5] === lv ? i : -1)).filter((i) => i >= 0);
  for (let k = 0; k < idx.length; k += 100) {
    BUNDLES.push({ file: `${lv.toLowerCase()}${k / 100}.mp3`, names: idx.slice(k, k + 100).flatMap((i) => [`w${i}`, `s${i}`]) });
  }
}
