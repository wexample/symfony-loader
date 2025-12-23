let paramsHash;

export function paramReload() {
  paramsHash = new URLSearchParams(document.location.hash.substr(1));

  return paramsHash;
}

export function hashParamGet(name: string, defaultValue: string = ''): string {
  paramReload();

  let value = paramsHash.get(name);
  // Support "false" value in query string, but not "null".
  return value !== null ? value : defaultValue;
}

export function hashParamSet(
  name: string,
  value: string,
  ignoreHistory = false
) {
  let location = document.location;
  paramsHash.set(name, value);

  updateLocation(
    location.pathname + location.search + '#' + paramsHash.toString(),
    ignoreHistory
  );
}

export function appendQueryString(
  path: string,
  params: Record<string, string | number | boolean | undefined | null>
): string {
  const url = new URL(path, 'http://dummy');

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });

  return url.pathname + url.search + url.hash;
}


export function updateLocation(href, ignoreHistory = false) {
  // Cleanup href if no more hash.
  if (href[href.length - 1] === '#') {
    href = href.substr(0, href.length - 1);
  }

  // Choose between push or replace.
  window.history[ignoreHistory ? 'replaceState' : 'pushState'](
    {manualState: true},
    document.title,
    href
  );
}

export function parseUrl(url: string): URL {
  // Not absolute.
  if (url.substr(0, 4) !== 'http') {
    // Append root slash.
    if (url[0] !== '/') {
      url = '/' + url;
    }
    url = document.location.origin + url;
  }
  return new URL(url);
}


/**
 * Detects user's language and redirects to the appropriate URL
 * @param config - Language redirection configuration
 *                 Keys are language codes, with '_default' as the fallback value
 */
export function detectLanguageAndRedirect(config: { [key: string]: string, _default: string }) {
  // Get browser language
  const userLanguage = (navigator.language || (navigator as any).userLanguage || '').toLowerCase();

  // Check if user is already on a page with a language prefix
  const currentPath = window.location.pathname;

  // Create a regex to check if current path starts with one of the redirect URLs
  const redirectUrls = Object.values(config);
  const redirectUrlsPattern = new RegExp(`^(${redirectUrls.map(url => url.replace(/\//g, '\\/')).join('|')})`);

  if (currentPath.match(redirectUrlsPattern)) {
    // Already on a page with language prefix, don't redirect
    return;
  }

  // Determine redirect URL based on language
  let redirectUrl = config._default; // Default URL

  // Loop through language codes in configuration
  for (const langCode in config) {
    if (langCode !== '_default' && userLanguage.startsWith(langCode)) {
      redirectUrl = config[langCode];
      break;
    }
  }

  // Add the rest of the current path to the redirect URL
  const restOfPath = currentPath.replace(/^\//, '');
  window.location.href = redirectUrl + restOfPath;
}