import Component from '../js/class/Component';
import { MDCRipple } from '@material/ripple/index';

export default class extends Component {
  async mount() {
    await super.mount();

    new MDCRipple(this.el);
  }
}
