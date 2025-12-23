import AbstractTest from "./AbstractTest";
import { createHtmlDocumentFromHtml } from "../../../js/helpers/DomHelper";

export default class LayoutTest extends AbstractTest {
  public getTestMethods() {
    return [
      this.testNotEmpty
    ];
  }

  private testNotEmpty() {
    this.fetchAdaptiveHtmlPage().then((html: string) => {
      let elHtml = createHtmlDocumentFromHtml(html);

      this.assertEquals(
        elHtml.querySelector('head').querySelector('title').innerText,
        'ADAPTIVE_DOCUMENT_TITLE'
      );

      this.assertEquals(
        (elHtml.querySelector('head').querySelector('meta[name=description]') as HTMLMetaElement).content,
        'DOCUMENT_META_DESCRIPTION'
      );
    })
  }
}
