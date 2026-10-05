# Performance du board : regrouper les assets, police et layout.js

Opened: 2026-10-05
Updated: 2026-10-05
Author: agent:main

## Contexte

Benchmark du board (doc manager, `board.doc-manager.wex`) en local, par un agent, Chrome headless sans session, machine chargée (load 4,4 / 8 cœurs).

| | Accueil | /app/<id>/general | /app/<id>/documentation |
|---|---|---|---|
| DOMContentLoaded | 0,9 s à chaud (2,2 s à froid) | 1,5 à 3,7 s | 3,7 s |
| Téléchargements réels | 40 | 44 | 54-56 |
| Poids | 1,2 Mo | 1,25 Mo | 1,5 Mo |

Écartés par la mesure :
- HTTP/1.1 n'est pas le goulot (attente de connexion < 0,08 s) ; HTTP/2 ne servirait qu'au temps réel (Mercure, autre chantier).
- Serveur : 0,26 à 0,32 s par page, correct.

Non mesuré dans le navigateur : panneaux, /files, page process (temps serveur seul, 0,26 à 0,29 s).

## Reste à discuter, puis décider

1. **Trop de petits fichiers** (loader / DS) — la page documentation déclare 39 CSS et 47 JS séparés, beaucoup d'1 Ko ; ~3 s sur 3,7. Piste : regrouper par layout ou par page. À peser contre le chargement à la demande des assets par render node (usages responsive, color scheme…), qui repose sur un fichier par vue.
3. **layout.js = 362 Ko** sur 1,25 Mo de scripts — vérifier la minification en prod, sinon découper.
4. **Police Phosphor (150 Ko) demandée à 3,5 s**, après exécution du JS — piste : preload dans le `<head>`.
6. **Deux appels API après chargement** : arbre de la documentation (0,32 s) et subscribe-info (0,26 s) — en parallèle, ou arbre inclus dans la page (board).

## Fait

- **Point 2, double chargement des CSS : abandonné, il n'existait pas.** Les 103 « requêtes » de l'agent comptaient les demandes du navigateur, dont 49 servies depuis les preload sans téléchargement ; 54 téléchargements réels. Les `ERR_ABORTED` (5 `layout.*.css`, un seul passage) n'ont pas été reproduits, ni par l'agent ni ici (froid/chaud, clair/sombre, 400 à 1920 px).
- **Preload redondants retirés** (symfony-loader, non commité) : `assets/macros/assets.html.twig` déclarait un `<link rel="preload">` juste avant chaque `<link rel="stylesheet">` / `<script>` de même URL ; supprimé, ainsi que le nettoyage de l'élément `-preload` dans `AssetsService.removeAsset()`. Vérifié sur design-system : plus aucun preload dans le HTML, banc de tests front du loader vert, aucune URL téléchargée deux fois. Le board de doc manager tourne sur une image de release : effet visible après publication.
- **Point 5, redirection 302 `/app/<id>/` → `/general`** : fait (par l'opérateur).
