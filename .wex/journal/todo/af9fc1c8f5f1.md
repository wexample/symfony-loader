# Performance du board : regrouper les assets, supprimer le double chargement CSS

Opened: 2026-10-05
Updated: 2026-10-05
Author: agent:main

## Contexte

Benchmark du board (doc manager, `board.doc-manager.wex`) en local, par un agent, Chrome headless, machine chargée (load 4,4 / 8 cœurs) : les temps varient d'un passage à l'autre.

| | Accueil | /app/<id>/general | /app/<id>/documentation |
|---|---|---|---|
| DOMContentLoaded | 0,9 s à chaud (2,2 s à froid) | 1,5 à 3,7 s | 3,7 s |
| Requêtes | 40 | ~47 (90 une fois) | 103 |
| Poids | 1,2 Mo | 1,25 Mo | 1,5 Mo |

Écartés par la mesure :
- HTTP/1.1 n'est pas le goulot (attente de connexion < 0,08 s) ; HTTP/2 ne servirait qu'au temps réel (Mercure, autre chantier).
- Serveur : 0,26 à 0,32 s par page, correct.

Non mesuré dans le navigateur : panneaux, /files, page process (temps serveur seul, 0,26 à 0,29 s).

## Points à discuter, puis décider

1. **Trop de petits fichiers** (loader / DS) — la page documentation déclare 39 CSS et 47 JS séparés, beaucoup d'1 Ko ; ~3 s sur 3,7. Piste : regrouper par layout ou par page. À peser contre le chargement à la demande des assets par render node (usages responsive, color scheme…), qui repose sur un fichier par vue.
2. **CSS de layout chargées deux fois** — voir « Vérification du point 2 » : non reproduit.
3. **layout.js = 362 Ko** sur 1,25 Mo de scripts — vérifier la minification en prod, sinon découper.
4. **Police Phosphor (150 Ko) demandée à 3,5 s**, après exécution du JS — piste : preload dans le `<head>`.
5. ~~Redirection 302 `/app/<id>/` → `/general`~~ — fait (par l'opérateur).
6. **Deux appels API après chargement** : arbre de la documentation (0,32 s) et subscribe-info (0,26 s) — en parallèle, ou arbre inclus dans la page (board).

## Vérification du point 2 (2026-10-05)

Capture réseau CDP (`/tmp/loadertest/net.mjs`, hors dépôt), sans session, sur `/`, `/app/<id>/general`, `/app/<id>/documentation` : à froid, à chaud, `prefers-color-scheme` dark et light, largeurs 400 / 800 / 1280 / 1920.

- Aucune URL demandée deux fois, aucun `ERR_ABORTED`, dans tous les cas.
- Documentation : 56 requêtes, pas 103. Accueil 40, general 44.
- Chaque `layout.*.css` est demandée une fois, par le parser. Chrome fusionne le `<link rel="preload">` avec la balise qui le suit.
- Le schéma de couleurs est choisi côté serveur (`layout.color-scheme.dark.css`), le JS ne le remplace pas au chargement.

Le doublon `preload` + `stylesheet`/`script` existe bien dans `assets/macros/assets.html.twig`, mais il ne coûte pas de téléchargement : il est seulement inutile (balise suivie immédiatement de la vraie).

Hypothèse non vérifiée pour les 103 requêtes et les abandons : une session connectée dont les usages enregistrés (schéma, palette, densité…) diffèrent de ce que le serveur a rendu, ce qui ferait remplacer les feuilles par le JS au démarrage. À reproduire avec une session.

## Décisions

- Point 5 : fait.

## Fait

- Point 2 mesuré, non reproduit sans session.
