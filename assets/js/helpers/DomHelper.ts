export class Attribute {
  public static HREF: string = 'href';

  public static ID: string = 'id';

  public static REL: string = 'rel';

  public static SRC: string = 'src';
}

export class AttributeValue {
  public static STYLESHEET: string = 'stylesheet';
}

export class InsertPosition {
  public static BEFORE_END: string = 'beforeend';
}

export class TagName {
  public static A: string = 'a';

  public static DIV: string = 'div';

  public static LINK: string = 'link';

  public static SCRIPT: string = 'script';
}

export function appendInnerHtml(el: HTMLElement, html: string) {
  // Using innerHTML will break dom structure.
  el.insertAdjacentHTML(InsertPosition.BEFORE_END as any, html);
}

export function findPreviousNode(el: HTMLElement) {
  // Search for previous non text node.
  do {
    el = el.previousSibling as HTMLElement;
  } while (el && el.nodeType === Node.TEXT_NODE);
  return el;
}

/**
 * Return first scrollable parent.
 *
 * @see https://stackoverflow.com/a/42543908/2057976
 * @param element
 * @param includeHidden
 * @returns {HTMLElement}
 */
export function findScrollParent(element, includeHidden) {
  let style = getComputedStyle(element);
  let excludeStaticParent = style.position === 'absolute';
  let overflowRegex = includeHidden
    ? /(auto|scroll|hidden)/
    : /(auto|scroll)/;

  if (style.position === 'fixed') return document.body;
  for (let parent = element; (parent = parent.parentElement);) {
    style = getComputedStyle(parent);
    if (excludeStaticParent && style.position === 'static') {
      continue;
    }
    if (
      overflowRegex.test(
        style.overflow + style.overflowY + style.overflowX
      )
    )
      return parent;
  }

  return document.body;
}

export function toggleMainOverlay(bool = null) {
  let classList = document.getElementById('main-overlay').classList;

  // Detect toggle direction.
  bool = bool !== null ? bool : !classList.contains('visible');

  classList[bool ? 'add' : 'remove']('visible');
}

export function createHtmlDocumentFromHtml(html: string) {
  let elHtml = document.createElement('html');
  elHtml.innerHTML = html;

  return elHtml;
}

export function removeAllClasses(el: HTMLElement, classesToRemove: string[]) {
  classesToRemove.forEach(className => el.classList.remove(className));
}

export function replaceByOneClass(el: HTMLElement, newState: string, classesToRemove: string[]) {
  removeAllClasses(el, classesToRemove);
  el.classList.add(newState);
}