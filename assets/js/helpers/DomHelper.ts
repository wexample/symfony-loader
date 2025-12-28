import {
  DOM_ATTRIBUTE,
  DOM_ATTRIBUTE_VALUE,
  DOM_INSERT_POSITION,
  DOM_TAG_NAME,
  domAppendInnerHtml,
  domCreateHtmlDocumentFromHtml,
  domFindPreviousNode,
  domFindScrollParent,
  domRemoveAllClasses,
  domReplaceByOneClass,
  domToggleMainOverlay,
} from '@wexample/js-helpers/Helper/Dom';

export class Attribute {
  public static HREF: string = DOM_ATTRIBUTE.HREF;
  public static ID: string = DOM_ATTRIBUTE.ID;
  public static REL: string = DOM_ATTRIBUTE.REL;
  public static SRC: string = DOM_ATTRIBUTE.SRC;
}

export class AttributeValue {
  public static STYLESHEET: string = DOM_ATTRIBUTE_VALUE.STYLESHEET;
}

export class InsertPosition {
  public static BEFORE_END: string = DOM_INSERT_POSITION.BEFORE_END;
}

export class TagName {
  public static A: string = DOM_TAG_NAME.A;
  public static DIV: string = DOM_TAG_NAME.DIV;
  public static LINK: string = DOM_TAG_NAME.LINK;
  public static SCRIPT: string = DOM_TAG_NAME.SCRIPT;
}

export function appendInnerHtml(el: HTMLElement, html: string): void {
  domAppendInnerHtml(el, html);
}

export function findPreviousNode(el: HTMLElement): HTMLElement | null {
  return domFindPreviousNode(el);
}

export function findScrollParent(element: HTMLElement, includeHidden = false): HTMLElement {
  return domFindScrollParent(element, includeHidden);
}

export function toggleMainOverlay(visible: boolean | null = null): void {
  domToggleMainOverlay(visible);
}

export function createHtmlDocumentFromHtml(html: string): HTMLHtmlElement {
  return domCreateHtmlDocumentFromHtml(html);
}

export function removeAllClasses(el: HTMLElement, classesToRemove: Iterable<string>): void {
  domRemoveAllClasses(el, classesToRemove);
}

export function replaceByOneClass(el: HTMLElement, newState: string, classesToRemove: Iterable<string>): void {
  domReplaceByOneClass(el, newState, classesToRemove);
}
