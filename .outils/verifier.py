#!/usr/bin/env python3
"""Contrôles avant chaque commit / pull request (à lancer depuis la racine du site).

    python .outils/verifier.py

Vérifie, sur toutes les pages HTML servies :
  - même paramètre ?v= sur styles.css et main.js dans toutes les pages ;
  - script inline no-js strictement identique (hash CSP) ;
  - canonical absolu en https://bestpizzaparis.com/… (sauf 404.html) ;
  - aucun style="", onclick="" ni <script> inline autre que la bascule no-js et le JSON-LD ;
  - JSON-LD valide (parse JSON) ;
  - liens internes pointant vers des fichiers existants ;
  - URL du sitemap existantes, et pages indexables présentes dans le sitemap ;
  - nombre de mots visibles par page (hors scripts, JSON-LD, .sr-only).
Code de sortie 1 si un contrôle échoue.
"""
import glob
import html
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NOJS = "<script>document.documentElement.classList.replace('no-js','js')</script>"
SITE = 'https://bestpizzaparis.com/'
errors = []
pages = sorted(p for p in glob.glob(os.path.join(ROOT, '*.html')))


def visible_words(src):
    body = src.split('<body', 1)[1] if '<body' in src else src
    body = re.sub(r'<script.*?</script>', ' ', body, flags=re.S)
    body = re.sub(r'<!--.*?-->', ' ', body, flags=re.S)
    body = re.sub(r'<[^>]+class="[^"]*\bsr-only\b[^"]*"[^>]*>.*?</[a-z0-9]+>', ' ', body, flags=re.S)
    text = html.unescape(re.sub(r'<[^>]+>', ' ', body))
    return len(re.findall(r"[\w’'-]+", text))


versions = {}
for path in pages:
    name = os.path.basename(path)
    src = open(path, encoding='utf-8').read()
    vs = set(re.findall(r'/(?:styles\.css|main\.js)\?v=(\d+)', src))
    versions[name] = vs
    if len(vs) != 1:
        errors.append(f'{name}: versions ?v= incohérentes dans la page : {vs or "aucune"}')
    if src.count(NOJS) != 1:
        errors.append(f'{name}: script no-js absent ou modifié (hash CSP)')
    if name != '404.html':
        m = re.search(r'<link rel="canonical" href="([^"]+)">', src)
        if not m or not m.group(1).startswith(SITE):
            errors.append(f'{name}: canonical absent ou non absolu')
    if re.search(r'\sstyle="', src):
        errors.append(f'{name}: attribut style="" inline (bloqué par la CSP)')
    if re.search(r'\son[a-z]+="', src, flags=re.I):
        errors.append(f'{name}: gestionnaire d’événement inline (bloqué par la CSP)')
    for m in re.finditer(r'<script(?![^>]*\bsrc=)([^>]*)>(.*?)</script>', src, flags=re.S):
        attrs, content = m.group(1), m.group(2)
        if 'application/ld+json' in attrs:
            try:
                json.loads(content)
            except ValueError as e:
                errors.append(f'{name}: JSON-LD invalide ({e})')
        elif m.group(0) != NOJS:
            errors.append(f'{name}: script inline non autorisé par la CSP')
    for href in re.findall(r'href="(/[^"#?]*)', src):
        target = os.path.join(ROOT, href.lstrip('/'))
        if href.endswith('/'):
            target = os.path.join(target, 'index.html')
        if not os.path.exists(target):
            errors.append(f'{name}: lien interne cassé vers {href}')
    print(f'{name:32s} {visible_words(src):5d} mots visibles')

allv = set().union(*versions.values()) if versions else set()
if len(allv) > 1:
    errors.append(f'?v= différent selon les pages : {allv}')

sitemap = open(os.path.join(ROOT, 'sitemap.xml'), encoding='utf-8').read()
locs = re.findall(r'<loc>([^<]+)</loc>', sitemap)
for loc in locs:
    rel = loc.replace(SITE, '') or 'index.html'
    if not os.path.exists(os.path.join(ROOT, rel)):
        errors.append(f'sitemap.xml: URL inexistante {loc}')
for path in pages:
    src = open(path, encoding='utf-8').read()
    name = os.path.basename(path)
    indexable = not re.search(r'<meta name="robots" content="noindex', src)
    url = SITE + ('' if name == 'index.html' else name)
    if indexable and name != '404.html' and url not in locs:
        errors.append(f'sitemap.xml: page indexable absente {url}')

if errors:
    print('\nERREURS :')
    for e in errors:
        print(' -', e)
    sys.exit(1)
print('\nTous les contrôles passent.')
