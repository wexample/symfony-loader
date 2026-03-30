import AppService from '../Class/AppService';

type IconOptions = {
  name: string;
  className?: string;
  tagName?: string;
  type?: string | null;
};

export default class IconService extends AppService {
  public static serviceName: string = 'icon';

  private buildTag(tagName: string, className: string, content: string): string {
    return `<${tagName} class="${className}">${content}</${tagName}>`;
  }

  private getBaseClass(className: string): string {
    const trimmed = className.trim();
    return trimmed !== '' ? `${trimmed} icon` : 'icon';
  }

  private iconFa(name: string, baseClass: string, tagName: string): string {
    const classes = `fa-${name.replace(/\//g, ' fa-')}`;
    const inner = `<i class="fa ${classes}"></i>`;
    return this.buildTag(tagName, baseClass, inner);
  }

  private iconMaterial(name: string, baseClass: string, tagName: string): string {
    return this.buildTag(tagName, `${baseClass} material-icons`, name);
  }

  private iconPhosphor(name: string, baseClass: string, tagName: string): string {
    const [style, icon] = name.split('/', 2);
    const classes = [baseClass];
    if (style) {
      classes.push(`ph-${style}`);
    }
    if (icon) {
      classes.push(`ph-${icon}`);
    }
    return this.buildTag(tagName, classes.join(' '), '');
  }

  icon(name: string, className = '', tagName = 'i', type: string | null = null): string {
    const [prefix, icon] = name.split(':', 2);
    const lib = type ?? (icon ? prefix : null);
    const iconName = icon ?? name;
    const baseClass = this.getBaseClass(className);

    if (lib === 'ph') {
      return this.iconPhosphor(iconName, baseClass, tagName);
    }

    if (lib === 'material') {
      return this.iconMaterial(iconName, baseClass, tagName);
    }

    if (lib === 'fa') {
      return this.iconFa(iconName, baseClass, tagName);
    }

    return this.buildTag(tagName, 'icon', name);
  }

  iconWith(options: IconOptions): string {
    return this.icon(
      options.name,
      options.className ?? '',
      options.tagName ?? 'i',
      options.type ?? null
    );
  }
}
