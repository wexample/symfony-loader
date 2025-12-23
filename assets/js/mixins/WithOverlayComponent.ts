import Component from "../class/Component";
import { replaceByOneClass } from "../helpers/DomHelper";

export class WithOverlayComponent {
  component: Component;

  // Initial attachment of the overlay element
  public attachElOverlay() {
    this.component = this as unknown as Component;
    this.component.elements.overlay = this.component.el.querySelector('.component-overlay');
  }

  public overlayShow() {
    // Here, we assume 'visible' is the only class we want to ensure is present
    replaceByOneClass(this.component.elements.overlay, 'visible', ['closing', 'closed']);
  }

  public overlayClosing() {
    // Transitioning to 'closing', we remove 'visible' and 'closed'
    replaceByOneClass(this.component.elements.overlay, 'closing', ['visible', 'closed']);
  }

  public overlayClosed() {
    // Transitioning to 'closed', we remove 'visible' and 'closing'
    replaceByOneClass(this.component.elements.overlay, 'closed', ['visible', 'closing']);
  }
}