# Best Pizza Paris — bestpizzaparis.com

Site vitrine statique : top 5 des pizzerias de Paris avec carte interactive, page Palmarès des guides et pages légales.
Aucun framework, aucun build : HTML + CSS + JS servis tels quels.

## Structure

| Fichier | Rôle |
|---|---|
| `index.html` | Page d'accueil (classement, carte, « Comment lire ce classement », FAQ). Les données des restaurants (adresse, coordonnées, note, liens) sont portées par les attributs `data-*` des cartes `<article class="card">` **et** par le bloc JSON-LD `ItemList` du `<head>` : mettre à jour les deux. |
| `palmares-pizzerias-paris.html` | Page Palmarès : adresses parisiennes distinguées par les guides (50 Top Pizza, Time Out, Gault&Millau, Yonder), année par année, avec sources. |
| `styles.css` | Toute la CSS. Aucun style inline dans le HTML (bloqué par la CSP). |
| `main.js` | Navigation, menu mobile accessible, apparition au défilement (pose la classe `js-ready`), carte Leaflet chargée à la demande (lit les `data-*` des cartes). |
| `mentions-legales.html`, `confidentialite.html` | Pages légales (LCEN / RGPD), formule du particulier non professionnel (art. 6-III-2 LCEN). **L'adresse `contact@bestpizzaparis.com` doit être créée dans hPanel** et la mention « en cours d'activation » retirée. |
| `404.html` | Page d'erreur (déclarée dans `.htaccess`). |
| `.htaccess` | En-têtes de sécurité (CSP…), cache, compression, redirections HTTPS/apex, page 404, blocage des fichiers et dossiers cachés (`.data/`, `.outils/`, `.git/`…). |
| `.data/restaurants.json` | Fiche de données unique des pizzerias : adresses, métro, prix, horaires, réservation, distinctions sourcées, points à vérifier. Non servi, mais versionné et public. |
| `.outils/devserver.py` | Serveur de test local qui rejoue les en-têtes du `.htaccess` (CSP, cache, 404). |
| `.outils/verifier.py` | Contrôles avant commit : `?v=` identique partout, script no-js intact, canonical, zéro inline, JSON-LD valide, liens internes, sitemap, mots visibles. |
| `.outils/gabarits/fiche.html` | Gabarit d'une fiche `/pizzeria-<slug>.html` (fil d'Ariane, L'essentiel, visite, que commander, guides, FAQ, JSON-LD). |
| `robots.txt`, `sitemap.xml`, `site.webmanifest` | Fichiers de service SEO / PWA. |
| `favicon.ico`, `favicon-32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` | Icônes (générées depuis `logo.png`). |
| `logo-120.png`, `logo-240.png` | Logo affiché (1x / 2x). `logo.png` est la source haute définition, non référencée par les pages. |
| `og-image.jpg` | Image de partage 1200×630 (Open Graph / X). |

## Hébergement et déploiement

- Hébergeur : **Hostinger** (hPanel, serveur LiteSpeed, `.htaccess` pris en charge). DNS chez Hostinger.
- Dépôt : `https://github.com/LordWLK/best-pizza-paris` (public). Branche de production : `main`.
- Déploiement : **automatique**. Un `git push` sur `main` met le site en production en quelques secondes (déploiement Git de hPanel). Tout ce qui est poussé sur `main` est donc public immédiatement : travailler sur une branche, tester en local, puis fusionner.
- Le dépôt étant public, `README.md`, `.data/` et `.outils/` sont lisibles par tous sur GitHub même s'ils ne sont pas servis par le site : n'y écrire que des informations publiables.

### Avant chaque fusion dans `main`

```bash
python .outils/verifier.py                 # doit se terminer par « Tous les contrôles passent. »
python .outils/devserver.py 3210 .         # puis ouvrir http://127.0.0.1:3210/ et vérifier la console (0 violation CSP)
```

### Contrôles après chaque mise en ligne

```bash
curl -sI https://bestpizzaparis.com/ | grep -iE "^(HTTP|content-security-policy|strict-transport|cache-control)"
curl -sI https://bestpizzaparis.com/xyz-inexistant | head -1        # attendu : 404 + en-têtes de sécurité
curl -sIL http://www.bestpizzaparis.com/ | grep -c "^HTTP"           # attendu : 3 (Hostinger force HTTPS avant le .htaccess, puis www -> apex) ; 2 pour http://bestpizzaparis.com/ et https://www…
curl -sI https://bestpizzaparis.com/.data/restaurants.json | head -1 # attendu : 404
curl -sI https://bestpizzaparis.com/index.html | head -1             # attendu : 301 vers /
curl -sI https://bestpizzaparis.com/palmares-pizzerias-paris.html | head -1   # attendu : 200
```

Puis ouvrir la page dans un navigateur et vérifier la console : aucune erreur « Content Security Policy ».

## Règles à respecter en modifiant le site

1. **Pas de `style="…"`, pas de `onclick="…"`, pas de `<script>` inline** : la CSP (`.htaccess`) les bloque. Écrire la CSS dans `styles.css` et le JS dans `main.js`. Seul le script `document.documentElement.classList.replace('no-js','js')` du `<head>` est autorisé, par hash : ne pas le modifier (sinon recalculer le hash : `printf "%s" "<contenu exact du script>" | openssl dgst -sha256 -binary | openssl base64 -A`).
2. **Versionner les assets** après modification de `styles.css` ou `main.js` : changer `?v=20261102` dans les balises `<link>`/`<script>` de **toutes** les pages HTML (cache navigateur d'un an, immuable). `verifier.py` signale toute incohérence. Les images sont en cache 30 jours sans `immutable` : un logo, une icône ou une photo remplacés en place sont visibles au plus tard un mois après (ou immédiatement si on renomme le fichier).
3. **Nouvelle origine tierce** (police, image, script) : l'ajouter dans la directive correspondante de la CSP, et dans le tableau de `confidentialite.html`.
4. **Données des restaurants** : la source est `.data/restaurants.json`. Ne publier sur le site qu'une donnée datée et sourcée (visite, appel, site officiel) ; reporter dans `index.html` (`data-*` et JSON-LD) et dans la fiche. Coordonnées GPS : `https://nominatim.openstreetmap.org/search?format=json&q=<adresse>`.
5. **Formulations** : le site n'affirme une visite, une note ou un prix que lorsqu'ils sont datés. Les distinctions des guides sont citées avec lien et date.

## Créer une page

1. Copier `.outils/gabarits/fiche.html` vers la racine (`/pizzeria-<slug>.html`) et remplacer chaque `{{…}}`.
2. `lang="fr"`, `title` ≤ 65 caractères commençant par la requête visée, `meta description` de 140 à 155 caractères, `canonical` absolu, Open Graph propre, `meta robots` `index, follow`.
3. Conserver le script no-js **à l'identique** (hash CSP) et le même `?v=` que les autres pages.
4. Aucun style, script ou gestionnaire d'événement inline.
5. Nav et pied de page identiques aux autres pages (liens en `/#…` vers l'accueil).
6. Fil d'Ariane visible + `BreadcrumbList` en JSON-LD.
7. Carte facultative : un `<div id="map">` et des `<article class="card" data-lat data-lng data-address data-rating>` avec `.card__name`, `.card__link--site`, `.card__link--maps` suffisent, `main.js` fait le reste (sans `data-rating`, la popup n'affiche pas de note).
8. Entrée dans `sitemap.xml` avec `lastmod` réel ; lien depuis l'accueil (carte « Lire notre avis complet ») et depuis la page Palmarès si pertinent.
9. Photos : locales, dans `/img/`, WebP 640/960/1280 px + `og.jpg` 1200×630, `width`/`height`, `alt` descriptif, droits détenus.
10. `python .outils/verifier.py`, puis test local avec la CSP et console du navigateur.
11. Relecture des faits (prix, horaires, adresse) par le propriétaire avant fusion.
12. Après mise en ligne : demander l'indexation dans la Search Console et tester les résultats enrichis.

## Plan de contenu (proposé, par ordre de priorité)

| URL | Requête visée | Statut |
|---|---|---|
| `/` | meilleure pizza Paris, meilleures pizzerias Paris | en ligne |
| `/palmares-pizzerias-paris.html` | 50 top pizza Paris, pizzerias Paris Time Out, Gault&Millau pizza Paris | en ligne |
| `/pizzeria-mangioni.html` | mangioni pizza Paris | à écrire après visite |
| `/pizzeria-guillaume-grasso.html` | guillaume grasso pizza, pizzeria AVPN Paris | à écrire après visite |
| `/pizzeria-oobatz.html` | oobatz paris, oobatz réservation | à écrire après visite |
| `/pizzeria-dalmata.html` | dalmata pizza paris | à écrire après visite |
| `/pizzeria-peppe.html` | peppe pizzeria paris, peppe cutraro | à écrire après visite |
| `/methode.html` | comment nous classons | après décision des critères |
| `/a-propos.html` | auteur, E-E-A-T | après décision sur l'auteur |
| `/pizza-napolitaine-paris.html` | pizza napolitaine Paris, pizzeria AVPN Paris | après ≥ 50 % d'adresses visitées |
| `/pizzeria-paris-11.html` | pizzeria Paris 11, Oberkampf, Charonne | après visites complémentaires |
| `/en/` | best pizza in Paris | après les fiches, ou dès que la Search Console montre ≥ 20 % d'impressions hors France |

## Check-list de cohérence des données

Pour chaque pizzeria, les valeurs suivantes doivent être identiques dans `.data/restaurants.json`, dans les `data-*` de la carte et dans le JSON-LD de `index.html` (et, plus tard, dans la fiche et dans `/en/`) : nom affiché (`<h3 class="card__name">` sans son préfixe `.sr-only`), adresse, code postal, latitude/longitude, note, URL du site officiel, lien Itinéraire (`destination=lat,lng`).

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

`python .outils/devserver.py 3210 .` sert le dossier avec les en-têtes du `.htaccess` (CSP, cache, page 404, blocage des fichiers cachés, redirection `/index.html`). `python -m http.server` suffit pour voir les pages mais n'envoie pas la CSP.

## Pistes d'amélioration (par ordre de valeur)

1. **Visites et fiches** : appeler puis visiter les cinq pizzerias, remplir `.data/restaurants.json`, publier une fiche par adresse avec photos propres, prix et horaires datés.
2. **Photos** : remplacer les photos hotlinkées depuis des sites tiers (droit d'auteur, disponibilité, poids) par des photos prises sur place, en WebP avec `srcset`, puis retirer leurs origines de la CSP et du tableau RGPD.
3. **Identité** : auteur nommé, page « À propos », méthode de classement, logo corrigé (le logo actuel contient une faute), e-mail de contact actif.
4. **Mesure** : Search Console (propriété Domaine), Bing Webmaster Tools, statistiques hPanel ; outil d'audience tiers seulement après vérification de sa conformité CNIL.
5. **Auto-héberger la police Inter et l'image d'en-tête** (accord du propriétaire requis) : supprime Google Fonts et Unsplash de la CSP et de la politique de confidentialité.
6. **Version anglaise** `/en/` avec `hreflang` (le domaine est anglais, forte demande touristique).
7. **Publicité** : seulement après les points 1 à 4, sur un sous-domaine de test non indexé (CSP élargie en Report-Only, consentement TCF, `ads.txt`, politique cookies), puis candidature.
8. **DNS** : DMARC `p=quarantine` avec `rua`, SPF/DKIM pour l'adresse de contact, enregistrement CAA, DNSSEC (hPanel).
