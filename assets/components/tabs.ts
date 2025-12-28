import Component from '../js/Class/Component';
import { locationHashParamGet, locationHashParamSet } from '@wexample/js-helpers/Helper/Location';
import { urlParse } from '@wexample/js-helpers/Helper/Url';
import { DOM_ATTRIBUTE } from '@wexample/js-helpers/Helper/Dom';

export default class extends Component {
  protected elTabCurrent?: HTMLElement;
  protected elContentCurrent?: HTMLElement;
  protected group: string;

  protected async activateListeners(): Promise<void> {
    this.group = this.options.group;

    this.el.querySelectorAll('a.tab-internal').forEach((elTab) => {
      if (this.isCurrentPageTab(elTab)) {
        elTab.addEventListener('click', this.clickInternal.bind(this));
      }
      // Disable all tabs first.
      elTab.classList.remove('active');
    });

    // React to history changes.
    window.addEventListener('hashchange', this.onHistoryChange.bind(this));

    // Search into hash query string
    let opened = locationHashParamGet('tab-' + this.group);

    // There is no tab specified in url hash.
    if (!opened) {
      let elActive = this.el.querySelectorAll('.active');

      // There is no active tabs;
      if (!elActive.length) {
        let elTabs = this.el.querySelectorAll('.tab');

        elTabs.forEach((elTab) => {
          if (!opened) {
            // There is an internal tab pointing into the current route (or to /).
            if (
              elTab.classList.contains('tab-internal') &&
              this.isCurrentPageTab(elTab)
            ) {
              opened = elTab.getAttribute('data-tab');
            }
          }
        });
      }
    }

    opened && this.enable(opened, true);
  }

  isCurrentPageTab(elTab) {
    return urlParse(elTab.getAttribute(DOM_ATTRIBUTE.HREF)).pathname === window.location.pathname;
  }

  onHistoryChange() {
    let opened = locationHashParamGet('tab-' + this.group);
    opened && this.enable(opened, true);
  }

  clickInternal(e) {
    e.preventDefault();
    this.enable(e.target.getAttribute('data-tab'));
  }

  enable(tabName, ignoreHistory = false) {
    let id = 'tab-' + this.group + '-' + tabName;
    let elTab = document.getElementById(id);
    let elContent = document.getElementById(id + '-content');

    locationHashParamSet('tab-' + this.group, tabName, ignoreHistory);

    // Clear previous.
    if (this.elTabCurrent) {
      this.elTabCurrent.classList.remove('active');
    }

    // Support missing tabs.
    if (!elTab) {
      return;
    }

    this.elTabCurrent = elTab;
    this.elTabCurrent.classList.add('active');

    // Having a content is optional.
    if (!elContent) {
      return;
    }

    // Clear previous.
    if (this.elContentCurrent) {
      this.elContentCurrent.classList.remove('tab-content-active');
    }

    this.elContentCurrent = elContent;
    this.elContentCurrent.classList.add('tab-content-active');
  }
}
