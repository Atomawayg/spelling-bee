"""Build public/index.html from src/template.html.

Single source of word data: netlify/functions/lib/words.json
(the server uses the same file to generate the Jenny voice).
Run from the repo root:  python3 src/build.py
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
tpl = (ROOT / 'src/template.html').read_text(encoding='utf8')
words = (ROOT / 'netlify/functions/lib/words.json').read_text(encoding='utf8').replace('</', '<\\/')
kokoro = (ROOT / 'src/kokoro-index.json').read_text(encoding='utf8')   # fallback voice index (files in public/a/)
silent = (ROOT / 'src/silent.b64').read_text().strip()

page = tpl.replace('__DATA__', words).replace('__AUDIO__', kokoro).replace('__SILENT__', silent).replace('__MODE__', 'cloud')
html = ('<!doctype html><html lang="th"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>'
        + page + '</body></html>')
(ROOT / 'public/index.html').write_text(html, encoding='utf8')
print('public/index.html', len(html) // 1024, 'KB,', len(json.loads(words.replace('<\\/', '</'))), 'words')
