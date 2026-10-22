# Responsive : rendre le mécanisme par taille utilisable par le design system

Opened: 2026-10-07
Updated: 2026-10-07
Author: agent:main (symfony-design-system)

## Contexte

Le design system a rendu son layout dashboard utilisable sur téléphone (`symfony-design-system`
`f7e24023`, `07703aa8`) : menus latéraux en tiroir sous `l`, contrôles du header réduits à
leur icône sous `m`. Il l'a fait en media queries (`assets/css/mixins/_window.scss`, qui
recopie les tailles par défaut de `loader.usages.responsive`) et non avec le mécanisme du
loader (`name-m.scss`, `name-m.ts`, classes `responsive-*`), pour quatre raisons relevées en
le lisant. weeger souhaite que le mécanisme du loader devienne le bon outil pour ça :
chacune est une piste.

## Pistes

1. **CSS par taille au premier rendu, scripts actifs.**
   `ResponsiveAssetUsageService::assetNeedsInitialRender()` ne rend les CSS par taille qu'avec
   les scripts coupés ; sinon `ResponsiveService` les charge après avoir mesuré. Un téléphone
   reçoit donc d'abord la mise en page large, puis la voit basculer, à chaque page. Le service
   calcule déjà le `media` de chaque fichier (`screen and (min-width…) and (max-width…)`) :
   les rendre tous au premier rendu, avec ce `media`, laisse le navigateur appliquer le bon dès
   le premier affichage — un `<link>` dont le `media` ne correspond pas est téléchargé en basse
   priorité et ne bloque pas le rendu. Le script garde les classes et les displays.
   À trancher : le poids téléchargé en plus sur bureau contre la bascule sur téléphone.

2. **Des plages ouvertes, pas seulement des bandes.**
   Chaque fichier vaut pour une bande (`-m` : de 768 à 992). « Sous `l` » demande trois fichiers
   (`-xs`, `-s`, `-m`) qui incluent le même partial. Une convention pour les plages ouvertes —
   par exemple `name-to-m.scss` (sous `l`… à nommer) et `name-from-m.scss` (dès `m`) — dirait
   en un fichier ce que les media queries disent en une ligne.

3. ~~**Les fichiers par taille d'un layout, cherchés aussi dans les layouts qu'il étend.**~~
   Déjà le cas, relevé à tort au départ : le layout dashboard du design system s'inscrit dans
   la pile d'héritage du layout (`setDefaultView(_self)`), et `AssetsService::assetsDetect()` la
   parcourt du plus proche au plus lointain. Le design system peut donc livrer
   `layouts/dashboard/layout-m.scss`, reçu par toute application qui l'étend. Seule réserve :
   sur l'axe responsive la vue la plus proche l'emporte pour tout l'axe — une application qui
   livre un seul fichier par taille à elle masque ceux du design system. Un héritage valeur par
   valeur (`inheritsPerValue()`, comme la palette) la lèverait.

4. **Un composant mesuré à sa largeur, ou à celle de la fenêtre.**
   `RenderNode::getElWidth()` mesure l'élément du composant : un menu latéral (220 px, 0 replié)
   est toujours `xs`, il ne peut pas dire « fenêtre sous 992 px ». C'est la sémantique d'une
   container query, utile en soi ; laisser un composant choisir l'une ou l'autre
   (`responsive: window`), ou le documenter et renvoyer aux `@container` natifs pour ce cas.

5. **Displays par taille pour les composants.**
   `name-m.ts` (`PageResponsiveDisplay`, `onResponsiveEnter` / `onResponsiveExit`) n'existe
   que pour les pages (`ResponsiveService`, branche `object instanceof Page`). Le tiroir lit
   à la place une variable CSS (`--menu-drawer`) posée par sa media query.

6. **Les tailles de la config jusqu'au SCSS.**
   `_window.scss` recopie 576 / 768 / 992 / 1200 : une application qui change
   `loader.usages.responsive` désaccorde ses media queries. Écrire les tailles configurées dans
   un fichier SCSS généré (comme le manifeste encore) donnerait une seule source.

## Ordre proposé

1 d'abord : avec lui, le design system peut déplacer le repli du header dans des fichiers par
taille du layout dashboard (le 3 n'en est pas un, voir plus haut). 2 rend la chose légère.
4, 5 et 6 ensuite, selon le besoin.
