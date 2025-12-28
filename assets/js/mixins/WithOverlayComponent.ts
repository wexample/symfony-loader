import Component from "../Class/Component";
import { domReplaceByOneClass } from "@wexample/js-helpers/Helper/Dom";

export class WithOverlayComponent {
  component: Component;

  // Initial attachment of the overlay element
  public attachElOverlay() {
    this.component = this as unknown as Component;
    this.component.elements.overlay = this.component.el.querySelector('.component-overlay');
  }

  public overlayShow() {
    // Here, we assume 'visible' is the only class we want to ensure is present
    domReplaceByOneClass(this.component.elements.overlay, 'visible', ['closing', 'closed']);
  }

  public overlayClosing() {
    // Transitioning to 'closing', we remove 'visible' and 'closed'
    domReplaceByOneClass(this.component.elements.overlay, 'closing', ['visible', 'closed']);
  }

  public overlayClosed() {
    // Transitioning to 'closed', we remove 'visible' and 'closing'
    domReplaceByOneClass(this.component.elements.overlay, 'closed', ['visible', 'closing']);
  }
}
