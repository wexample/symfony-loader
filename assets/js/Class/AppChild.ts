import App from './App';
import AsyncConstructor from './AsyncConstructor';

export default class extends AsyncConstructor {

  constructor(protected readonly app: App) {
    super();

    this.app = app;
  }
}
