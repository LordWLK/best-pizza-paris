# Best Pizza Paris — bestpizzaparis.com

Site vitrine statique (une page + pages légales) : top 5 des pizzerias de Paris avec carte interactive.
Aucun framework, aucun build : HTML + CSS + JS servis tels quels.

## Structure

| Fichier | Rôle |
|---|---|
| `index.html` | Page d'accueil (classement, carte, à propos). Les données des restaurants (adresse, coordonnées, note, liens) sont portées par les attributs `data-*` des cartes `<article class="card">` **et** par le bloc JSON-LD du `<head>` : mettre à jour les deux. |
| `styles.css` | Toute la CSS. Aucun style inline dans le HTML (bloqué par la CSP). |
| `main.js` | Navigation, menu mobile accessible, apparition au défilement, carte Leaflet chargée à la demande (lit les `data-*` des cartes). |
| `mentions-legales.html`, `confidentialite.html` | Pages légales (LCEN / RGPD). **Les zones jaunes « À compléter » doivent être renseignées avant mise en ligne.** |
| `404.html` | Page d'erreur (déclarée dans `.htaccess`). |
| `.htaccess` | En-têtes de sécurité (CSP…), cache, compression, redirections HTTPS/apex, page 404, blocage des fichiers cachés. |
| `robots.txt`, `sitemap.xml`, `site.webmanifest` | Fichiers de service SEO / PWA. |
| `favicon.ico`, `favicon-32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` | Icônes (générées depuis `logo.png`). |
| `logo-120.png`, `logo-240.png` | Logo affiché (1x / 2x). `logo.png` est la source haute définition, elle n'est plus référencée par les pages. |
| `og-image.jpg` | Image de partage 1200×630 (Open Graph / X). |

## Hébergement et déploiement

- Hébergeur : **Hostinger** (hPanel, serveur LiteSpeed, `.htaccess` pris en charge). DNS chez Hostinger.
- Dépôt : `https://github.com/LordWLK/best-pizza-paris` (branche `main`).
- Déploiement : **automatique**. Un `git push` sur `main` met le site en production en quelques secondes (déploiement Git de hPanel, vérifié le 17 septembre 2026). Tout ce qui est poussé sur `main` est donc public immédiatement : tester en local avant de pousser, ou travailler sur une autre branche. Les fichiers internes du dépôt (`README.md`, `.gitignore`, `.git/`) sont bloqués par le `.htaccess` ou par l'hébergeur.

### Contrôles après chaque mise en ligne

```bash
curl -sI https://bestpizzaparis.com/ | grep -iE "^(HTTP|content-security-policy|strict-transport|cache-control)"
curl -sI https://bestpizzaparis.com/xyz-inexistant | head -1        # attendu : 404 + en-têtes de sécurité
curl -sIL http://www.bestpizzaparis.com/ | grep -c "^HTTP"           # attendu : 3 (Hostinger force HTTPS avant le .htaccess, puis www -> apex) ; 2 pour http://bestpizzaparis.com/ et https://www…
curl -sI https://bestpizzaparis.com/.claude/launch.json | head -1    # attendu : 404
curl -sI https://bestpizzaparis.com/index.html | head -1             # attendu : 301 vers /
```

Puis ouvrir la page dans un navigateur et vérifier la console : aucune erreur « Content Security Policy ».

## Règles à respecter en modifiant le site

1. **Pas de `style="…"`, pas de `onclick="…"`, pas de `<script>` inline** : la CSP (`.htaccess`) les bloque. Écrire la CSS dans `styles.css` et le JS dans `main.js`. Seul le script `document.documentElement.classList.replace('no-js','js')` du `<head>` est autorisé, par hash : ne pas le modifier (sinon recalculer le hash : `printf "%s" "<contenu exact du script>" | openssl dgst -sha256 -binary | openssl base64 -A`).
2. **Versionner les assets** après modification : changer `?v=20260917` dans les balises `<link>`/`<script>` des quatre pages (cache navigateur d'un an, immuable). Les images sont en cache 30 jours sans `immutable` : un logo ou une icône remplacés en place sont visibles au plus tard un mois après (ou immédiatement si on renomme le fichier).
3. **Nouvelle origine tierce** (police, image, script) : l'ajouter dans la directive correspondante de la CSP, et dans le tableau de `confidentialite.html`.
4. **Adresses des restaurants** : vérifier sur le site officiel de chaque établissement (elles changent). Coordonnées GPS : `https://nominatim.openstreetmap.org/search?format=json&q=<adresse>`.

## Régénérer les icônes et le logo (Python + Pillow)

```bash
python - <<'EOF'
from PIL import Image
src = Image.open('logo.png').convert('RGBA')
def q(i): return i.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
def fit_h(i, h): return i.resize((round(i.width * h / i.height), h), Image.LANCZOS)
def square(i, s, bg=None, pad=0.0):
    inner = round(s * (1 - 2 * pad)); t = i.copy(); t.thumbnail((inner, inner), Image.LANCZOS)
    c = Image.new('RGBA', (s, s), bg or (0, 0, 0, 0)); c.paste(t, ((s - t.width) // 2, (s - t.height) // 2), t); return c
q(fit_h(src, 120)).save('logo-120.png', optimize=True); q(fit_h(src, 240)).save('logo-240.png', optimize=True)
q(square(src, 180, (243, 241, 236, 255), 0.08)).save('apple-touch-icon.png', optimize=True)
q(square(src, 192, None, 0.04)).save('icon-192.png', optimize=True); q(square(src, 512, None, 0.04)).save('icon-512.png', optimize=True)
q(square(src, 32)).save('favicon-32.png', optimize=True)
square(src, 48).save('favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
EOF
```

## Développement local

`python -m http.server 3210` suffit pour voir les pages, mais n'envoie pas les en-têtes du `.htaccess`.
Pour tester la CSP en conditions réelles, servir le dossier avec un petit serveur qui relit les directives `Header set` du `.htaccess` (voir `.claude/launch.json`, non versionné) ou déployer sur un sous-domaine de test.

## Pistes d'amélioration (par ordre de valeur)

1. **Photos des restaurants** : remplacer les photos hotlinkées depuis des sites tiers (droit d'auteur, disponibilité, poids) par des photos prises par l'équipe ou autorisées, hébergées localement en WebP (640 px et 960 px) avec `srcset`.
2. **Auto-héberger la police Inter et Leaflet** (`/fonts/`, `/vendor/leaflet-1.9.4/`) : supprime Google Fonts et unpkg de la CSP et de la politique de confidentialité, améliore le LCP.
3. **Contenu** : fiches plus riches (pizza signature, prix, réservation, métro, horaires vérifiés), section « Comment nous classons », auteur identifié, source des notes.
4. **Contact** : adresse e-mail (ou formulaire) → réactiver un lien « Contact » et créer `/.well-known/security.txt`.
5. **Réseaux sociaux** : liens réels dans le footer (bloc commenté dans `index.html`) et `sameAs` dans le JSON-LD.
6. **Carte** : bouton « Afficher la carte » avant de charger CARTO (confidentialité), ou fond de carte auto-hébergé.
7. **Mesure d'audience** sans cookie (Plausible, Umami) et monitoring de disponibilité / expiration TLS (UptimeRobot).
8. **DNS** : DMARC `p=quarantine` avec `rua`, enregistrement CAA, DNSSEC (hPanel).
9. **Traductions** EN / IT avec `hreflang` (le faux sélecteur de langue a été retiré).
