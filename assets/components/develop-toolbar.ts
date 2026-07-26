import Component from '../js/Class/Component';

export default class extends Component {
  private onTabClick = (e: Event) => {
    const tab = (e.target as Element).closest('.develop-toolbar__tab') as HTMLElement;
    if (!tab) return;
    this.el.querySelectorAll('.develop-toolbar__tab').forEach(t => t.classList.remove('develop-toolbar__tab--active'));
    tab.classList.add('develop-toolbar__tab--active');
  };

  protected async activateListeners(): Promise<void> {
    this.el.querySelector('.develop-toolbar__tabs')?.addEventListener('click', this.onTabClick);
  }

  protected async deactivateListeners(): Promise<void> {
    this.el.querySelector('.develop-toolbar__tabs')?.removeEventListener('click', this.onTabClick);
  }
}
