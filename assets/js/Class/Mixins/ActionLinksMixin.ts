import AbstractMixin from '@wexample/js-helpers/Helper/AbstractMixin';

export default class ActionLinksMixin extends AbstractMixin {
  static apply(instance: any) {
    this.applyOnce(instance, (target: any) => {
      if (!target.actionLinkHandlers) {
        target.actionLinkHandlers = [];
      }

      if (!target.buildActionLinksHtml) {
        target.buildActionLinksHtml = (message: string) => {
          const escapeHtml = (value: string): string => {
            return value
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#39;');
          };

          const regex = /@action:([a-zA-Z0-9_-]+)\(([^)]*)\)/g;
          let lastIndex = 0;
          let result = '';
          let match: RegExpExecArray | null;

          while ((match = regex.exec(message)) !== null) {
            const [fullMatch, key, label] = match;
            const start = match.index;
            result += escapeHtml(message.slice(lastIndex, start));
            result += `<a href="#" class="action-link" data-action-link="${escapeHtml(key)}">${escapeHtml(label)}</a>`;
            lastIndex = start + fullMatch.length;
          }

          result += escapeHtml(message.slice(lastIndex));
          return result;
        };
      }

      if (!target.bindActionLinks) {
        target.bindActionLinks = (rootEl: HTMLElement, actions: Record<string, () => void>) => {
          const links = Array.from(rootEl.querySelectorAll('[data-action-link]')) as HTMLElement[];
          links.forEach((link) => {
            const key = link.getAttribute('data-action-link') || '';
            const handler = (event: Event) => {
              event.preventDefault();
              const action = actions[key];
              if (action) {
                action();
              }
            };
            link.addEventListener('click', handler);
            target.actionLinkHandlers.push({ el: link, handler });
          });
        };
      }

      if (!target.unbindActionLinks) {
        target.unbindActionLinks = () => {
          target.actionLinkHandlers.forEach(({ el, handler }: { el: HTMLElement; handler: EventListener }) => {
            el.removeEventListener('click', handler);
          });
          target.actionLinkHandlers = [];
        };
      }
    }, '__actionLinksMixinApplied');
  }
}
