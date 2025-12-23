import Component from '../js/class/Component';

export default class extends Component {
  async mounted() {
    await super.mounted();

    console.log('Server side rendered component mounted.')
  }
}
