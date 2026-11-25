# Spelling Bee ม.ต้น — project notes for Claude

Practice web app for Thai lower-secondary (ม.1–3) students preparing for Spelling Bee contests.
Owner: ครู Atom (โรงเรียนอนุบาลรัตนบัณฑิต). Reply to him in Thai, keep replies short,
agree on the approach before building, and test for bugs before pushing.

Live: https://spellingbee-rattanabundit.netlify.app  ·  teacher page: /teacher.html
Hosting: Netlify project `spellingbee-rattanabundit` (team `atomawayg`), auto-deploys from `main` of
github.com/Atomawayg/spelling-bee (repo is public so the free plan accepts the commits).

## Layout
- `src/template.html` — the whole app (HTML + CSS + JS, one file). Placeholders: `__DATA__`, `__AUDIO__`, `__SILENT__`, `__MODE__`.
- `src/build.py` — builds `public/index.html` from the template. **Always run `python3 src/build.py` after editing the template or the word list, and commit the built file.**
- `netlify/functions/lib/words.json` — the single word list: `[word, pos, thai_reading, thai_meaning, example_sentence, set]`.
  set = `K` (คำแข่ง), `B1`, `B2`, `C1`, `X` (คำสะกดยาก). **Only append new words at the end** — clip names use the array index (`w{i}`, `s{i}`).
  A sentence starting with "Remember…" is a spelling tip; the part after the first ". " is the spoken sentence.
- `netlify/functions/progress.mts` — `/api/progress` GET/POST one student's saved state (Netlify Blobs store `students`, key = class/name).
- `netlify/functions/teacher.mts` — `/api/teacher` list/delete students; needs header `x-pin` = env `TEACHER_PIN`.
- `netlify/functions/gen-audio.mts` — background job `/api/gen-audio` (POST, header `x-pin`): makes every missing clip with
  Microsoft Edge neural voice **en-US-JennyNeural, rate -10%** (npm `msedge-tts`), stores clips in Blobs, then packs bundles
  and `index.json`. Re-invokes itself until done. Progress: `/api/audio/status.json`.
- `netlify/functions/audio.mts` — serves `/api/audio/index.json` and `/api/audio/<VERSION>/<bundle>.mp3` (cached forever;
  bundle names include the clip count so a changed bundle gets a new URL).
- `netlify/functions/lib/clips.mts` — which clips exist and how they are bundled. `VERSION` change = regenerate everything.
- `public/a/*.mp3` + `src/kokoro-index.json` — old Kokoro voice, only a fallback if the Jenny index cannot load.
- `public/teacher.html` — teacher dashboard (PIN).

## App model (src/template.html)
- Login = class + name (no password). State per student syncs to `/api/progress`; localStorage is a cache.
- Word sets chips: K, B1, B2, C1, X, ALL. Two tabs: 🏠 ฝึกรอบนี้ and 📋 คำศัพท์.
- Rounds of 20 words per set: ① learn → ② handwritten test (self-marked against the answer, out of 20) → ③ write the missed words until correct → round summary → next round.
- Word state: new / wrong / learning (correct once after a miss; due again `rc+1`, i.e. skips one round) / known.
  Round = up to 5 due "learning" + up to 5 wrong + new words, then others. Sets with ≤20 words (K) use all words every round.
- Stored keys: `wrong`, `seen`, `learning`, `rc`, `rounds`, `tests`, `tot`, `level`, `rate`, `voice3`, `seenHelp`.

## After adding words
1. Append rows to `netlify/functions/lib/words.json`, run `python3 src/build.py`, commit, push (wait ~1 min for deploy).
2. Generate their audio: `POST https://spellingbee-rattanabundit.netlify.app/api/gen-audio` with header `x-pin: <TEACHER_PIN>`,
   then poll `/api/audio/status.json` until `"phase":"ready"` (~200 clips/min).
   This sandbox cannot reach netlify.app / api.netlify.com directly; use the user's Chrome (Claude in Chrome) to send it.

## Testing
No Netlify CLI dev here (edge runtime download is blocked). A small Node mock of the functions + Playwright was used:
serve `public/`, route `/api/progress|teacher|audio` to the `.mts` handlers with an in-memory `getStore`.
Check: login, all 3 round steps, list filters, teacher page, phone (390px) and iPad widths, no horizontal scroll, no page errors.
