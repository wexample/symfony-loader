# Chargement initial des assets du loader : état, causes, refonte proposée

## Ce qui a été observé

Page `/app/<id>/documentation` du board de doc manager. Tailles du build de **production** (image de release), réseau du build local.

- **Balises initiales** : 23 CSS et 24 JS réels, dont 15 CSS et 22 JS de composants, plus `runtime.js`.
- **JS initial en production : 2,46 Mo bruts, 448 Ko gzip.** `layout.js` en fait 693 Ko, et les 22 composants environ 1,76 Mo. Un composant aussi simple que `toast.js` pèse 97 Ko minifiés, `embed.js` 214 Ko, `button-menu.js` 230 Ko.
- **Contenu de ces bundles** (vu dans le build de dev, qui garde les chemins) : `toast.js` contient 24 modules de `symfony-loader` (Component, RenderNode, mixins…) pour 1 module du design system. `embed.js` en contient 61. Ces modules sont déjà dans `layout.js`. Vue, lui, n'est présent qu'une fois.
- **Pas de `splitChunks`** (`encore.manifest.js` n'active que `enableSingleRuntimeChunk()`) : chaque entrée embarque ses propres copies des modules partagés. Avec un runtime unique, un module n'est exécuté qu'une fois, mais il est **téléchargé et parsé autant de fois qu'il est embarqué**. `code-input` (JS) et son jumeau vue embarquent chacun CodeMirror en entier.
- **Le `<head>` pèse 135 Ko, pour 28 Ko de `<body>`** : `layoutRenderData` 77 Ko et `assetsRegistry` 29 Ko, inline et en littéraux JS. S'y ajoutent 84 paires de marqueurs `<!--USAGE[...]-->` et 38 balises placeholders vides (`href=""`, `src=""`).
- **Les 24 scripts du `<head>` sont synchrones** : chacun bloque le parseur. L'app attend de toute façon `DOMContentLoaded` (`App.ts`, l. 102-110).
- **Le `<body>` reste masqué** (`.layout-loading { visibility: hidden }`) jusqu'à la fin du JS, au plus 1 s. Le HTML rendu par le serveur n'est donc pas visible avant que le JS ait tourné.
- **Les CSS responsive ne sont jamais rendues par le serveur quand le JS est actif** (`ResponsiveAssetUsageService::assetNeedsInitialRender`). Elles arrivent après le montage de chaque composant.
- **Mesure biaisée** : en local, `watch-bundles.sh` relance `encore dev --watch` par-dessus l'image, et le benchmark a mesuré des builds de dev (`layout.js` à 2 Mo). Les « ~3 s » du rapport initial sont surtout du parsing de dev.

## Pourquoi

- **Duplication** : la philosophie « un fichier par composant » est saine. Le problème n'est pas le découpage, mais l'absence de chunk partagé : chaque fichier de composant rapporte le cœur du loader avec lui.
- **Marqueurs** : l'ordre de la cascade CSS est porté par la *position* des balises dans le `<head>` (usage, puis contexte). Les marqueurs et les placeholders existent pour qu'un asset chargé plus tard s'insère au bon endroit (`AssetsService.addAssetEl`). C'est aussi ce qui rendait l'agrégation fragile : concaténer des fichiers, c'est changer l'ordre.
- **L'ancienne agrégation** (`AssetsAggregationService`, retirée dans `cf3e033`, le 27 juillet) concaténait les fichiers *à la requête*, en PHP. Elle écrivait un fichier par vue dans `public/` : écriture disque à l'exécution (impossible sur un système de fichiers en lecture seule, exposée aux courses), un fichier différent par page (cache navigateur perdu d'une page à l'autre), et un ordre approximatif (`insertNewAfterKey`, « Try to keep an order »).

## Options

### A. Chunk partagé (le gain principal, et sans conflit avec la philosophie composant)

Configurer `splitChunks` avec un `cacheGroup` forcé qui sort le code commun (`symfony-loader`, les helpers du design system et `node_modules` utilisés par au moins deux entrées) dans un `shared.js`. Il serait toujours rendu dans le layout, comme `runtime.js` aujourd'hui. Les composants restent un fichier chacun, mais ne contiennent plus que leur propre code. Le runtime unique retarde déjà l'exécution d'une entrée jusqu'à ce que ses chunks soient là ; il suffit que `shared.js` soit toujours présent.

- **Gain attendu** : les composants passent de ~100 Ko à quelques Ko. Le JS initial devrait tomber de 2,46 Mo vers ~0,8 Mo bruts, à mesurer.
- **Coût** : de la config webpack, plus une balise fixe côté PHP. À vérifier : le chargement dynamique d'un composant dont un module partagé ne serait *pas* dans `shared.js` (le `cacheGroup` doit être exhaustif, ou le JS doit lire `entrypoints.json`).

### B. `defer` sur les scripts

Compatible avec le démarrage actuel, puisque l'app attend `DOMContentLoaded`. Le parseur cesse d'être bloqué 24 fois. Le gain perçu reste plafonné tant que le `<body>` est masqué par `layout-loading` jusqu'à la fin du JS. Décision liée : peut-on afficher le rendu serveur avant le JS, quitte à masquer seulement ce qui doit être mesuré ?

### C. Agrégation, refaite au build plutôt qu'à la requête

À faire après A, et seulement si le nombre de requêtes coûte encore une fois les fichiers allégés. En production, sous HTTP/2, 40 petits fichiers coûtent peu ; c'est à vérifier sur l'infra réelle, la mesure locale était en HTTP/1.1.
- **CSS de layout** : fondre à la compilation les usages *non commutables* d'une app (densité, skin, police, palette si l'app n'en change pas) dans `layout.css`. Les usages commutables restent séparés : thème clair/sombre, et le changement de thème à chaud du DS de mojoe. C'est ta piste « désactiver les usages commutables par app ». Elle se décide au niveau de la config des usages (`allow_switch`), et le build n'émet plus que ce qui peut changer.
- **Groupes par layout** : un fichier commun des composants toujours présents dans un layout (toast-stack, tooltip, banner, confirm…). On le connaît au build en partant du template du layout, pas de la page.
- **L'ordre de chargement des composants entre eux** : ta lecture est juste. Des CSS de composants scopées ne dépendent pas de leur ordre relatif. Ce qui dépend de l'ordre, c'est usage contre usage (`default` < `color_scheme` < `palette` < `responsive`…) et contexte contre contexte (layout < page < composant). Le point D règle cette dépendance.

### D. Refonte des marqueurs : cascade layers CSS

Déclarer l'ordre une seule fois, en tête de document : `@layer default, color-scheme, palette, responsive, density, skin, animations, fonts;`, éventuellement imbriqué par contexte. Le build emballe chaque fichier dans la couche de son usage, et l'usage est déjà connu par le nom du fichier (`.color-scheme.dark.css`, `-s.css`…). L'ordre ne dépend plus de la position des balises :
- les marqueurs `USAGE[...]`, les 38 placeholders et l'insertion positionnelle de `addAssetEl` disparaissent : le JS ajoute simplement en fin de `<head>` ;
- l'agrégation (C) cesse d'être fragile, puisque l'ordre de concaténation n'a plus d'effet sur la cascade ;
- côté JS, l'ordre n'a déjà aucune importance (registre `bundles.add` et runtime webpack) : les marqueurs et placeholders JS sont simplement à supprimer.

Risque : entre deux couches, c'est l'ordre des couches qui gagne, plus la spécificité. Le sens est le même qu'aujourd'hui (un usage plus tardif l'emporte), mais une règle `default` très spécifique qui battait une règle `skin` peu spécifique perdrait désormais. Les styles hors couche (inline, tiers) battent toutes les couches. Il faut le tester sur le DS de mojoe avant de généraliser.

### E. Responsive : container queries

Le responsive des composants dépend de la largeur de l'*élément*, mesurée en JS (classes `responsive-<taille>`, une feuille par taille, chargée après le montage). C'est exactement ce que font nativement les container queries (`@container (min-width: …)`). Une seule feuille par composant, appliquée dès le premier rendu et sans JS : on supprime le chargement tardif des feuilles responsive, la mécanique de partage entre instances corrigée récemment, et le rendu sans JS (`! isUseJs()`) devient le cas général. C'est un chantier plus long, mais c'est la vraie modernisation de cette partie. Les hooks JS par taille (`PageResponsiveDisplay`, `onResponsiveEnter`) restent possibles via `ResizeObserver`.

### F. Le `<head>` de 135 Ko

- **Déplacer `layoutRenderData` et `assetsRegistry`** en fin de `<body>`, ou dans un `<script type="application/json">` lu par `JSON.parse` (plus rapide à parser qu'un littéral JS de cette taille).
- **Mesurer ce que contiennent les 77 Ko** (traductions, vars, render data de tous les composants) avant de les réduire.

## Recommandation

1. **A d'abord** : le chunk partagé. C'est le plus gros gain, il ne touche pas au modèle « un fichier par composant », et il se mesure facilement : JS initial avant/après, sur un build de prod.
2. **Puis D** : les cascade layers, qui sont la refonte des marqueurs que tu veux, et le prérequis qui rend C sûr.
3. **B ensuite**, en tranchant d'abord la question du `<body>` masqué jusqu'au JS.
4. **C seulement si le nombre de requêtes compte encore** une fois A en place, mesuré en HTTP/2. Commencer par les usages non commutables, déclarés par app.
5. **E en chantier séparé.** F au passage.

Chaque étape doit se valider sur le banc de tests front du loader (`/loader/test/`, vert à ce jour) et se mesurer sur un build de production, pas sur le watcher.
