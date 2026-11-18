// What lets node run the assets as they are written for the bundler: an
// import without its `.ts` finds it, and the app — the whole framework behind
// it — is stood in for by an empty class: a service is tested on a fake app
// handed to its constructor, which keeps it as every child of the app does.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const STUBS = {
  App: 'data:text/javascript,export default class {}',
  AppChild: 'data:text/javascript,export default class { constructor(app) { this.app = app; } }',
};

export async function resolve(specifier, context, next) {
  const stubbed = specifier.match(/(?:^|\/)(App|AppChild)$/);

  if (stubbed) {
    return { url: STUBS[stubbed[1]], shortCircuit: true };
  }

  if (specifier.startsWith('.') && !/\.[a-z]+$/.test(specifier) && context.parentURL) {
    const url = new URL(specifier + '.ts', context.parentURL);

    if (existsSync(fileURLToPath(url))) {
      return { url: url.href, shortCircuit: true };
    }
  }

  return next(specifier, context);
}
