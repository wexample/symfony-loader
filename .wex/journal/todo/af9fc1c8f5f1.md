# Performance du board : regrouper les assets, layout.js, appels API

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
6. **Deux appels API après chargement** : arbre de la documentation (0,32 s) et subscribe-info (0,26 s) — en parallèle, ou arbre inclus dans la page (board).

## Fait

- **Point 2, double chargement des CSS : abandonné, il n'existait pas.** Les 103 « requêtes » de l'agent comptaient les demandes du navigateur, dont 49 servies depuis les preload sans téléchargement ; 54 téléchargements réels. Les `ERR_ABORTED` n'ont pas été reproduits (froid/chaud, clair/sombre, 400 à 1920 px).
- **Preload redondants retirés** (symfony-loader 3f811b3) : `assets/macros/assets.html.twig` déclarait un `<link rel="preload">` juste avant chaque balise d'asset de même URL.
- **Point 4, police d'icônes** :
  - Seule la graisse bold sert (2 510 `ph:bold/…`, aucune autre). Les règles regular visaient `.ph.ph-<nom>`, classe qu'aucune icône ne porte : 1 530 règles mortes dans chaque CSS de layout, retirées (symfony-template 3f987f0 ; la CSS de layout de design-system passe à 160 Ko).
  - Preload de `Phosphor-Bold.woff2` dans le `<head>`, avant les assets, avec `crossorigin` : nouvelle `HeadLinkProviderInterface` (symfony-helpers 0cb926f), rendue par `base_template_render_head_links()` (symfony-loader 834e03d), fournie par `PhosphorFontPreloadProvider` (symfony-template, parti dans la publication 2.0.5). Mesuré sur design-system : la police part avec la première feuille de style au lieu d'après les scripts, téléchargée une fois. Banc front du loader vert.
  - À publier : symfony-template requiert l'interface, donc une version de symfony-helpers qui la contient (contrainte actuelle `>=13.0.0`).
- **Point 5, redirection 302 `/app/<id>/` → `/general`** : fait (par l'opérateur).

Le board de doc manager tourne sur une image de release : effets visibles après publication.
