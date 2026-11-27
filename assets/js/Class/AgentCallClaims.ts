// Which page runs a call, when the conversation is open in several — two
// tabs, two windows —: each hears the call on the live topic, one alone runs
// it. Two would act twice, and answer from pages that are not the same: the
// pieces one names (`find_nodes`) are not the other's, and the next call,
// taken by the other, finds none of them.
//
// The page the user looks at takes it first; a hidden one waits a moment,
// and takes it only when no other did. The claim is kept where every page of
// the site reads it (localStorage), set under a lock of the browser — the
// check and the mark one step, two pages never both taking it. Without locks
// (a page served over plain http), each page writes its own token, waits,
// and reads back: the last written stands, its page alone runs the call.
export default class AgentCallClaims {
  // How long a hidden page leaves a shown one to take the call.
  public static readonly HIDDEN_DELAY_MS: number = 400;

  // How long a claim is kept: a call is heard within moments, never later.
  public static readonly KEPT_MS: number = 10 * 60 * 1000;

  // How long a page waits for another's token to reach it, without locks.
  public static readonly SETTLE_MS: number = 60;

  private static readonly PREFIX: string = 'wexample-agent-call:';

  // Whether this page runs the call: true once, for one page only.
  async claim(callId: string): Promise<boolean> {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      await new Promise((resolve) => window.setTimeout(resolve, AgentCallClaims.HIDDEN_DELAY_MS));
    }

    const storage = this.storage();

    // No storage shared: this page alone is known, it runs the call.
    if (!storage) {
      return true;
    }

    const key = `${AgentCallClaims.PREFIX}${callId}`;
    const locks = (navigator as any).locks;

    if (locks?.request) {
      return locks.request(key, () => this.mark(storage, key, this.token()) !== null);
    }

    const token = this.mark(storage, key, this.token());

    if (token === null) {
      return false;
    }

    await new Promise((resolve) => window.setTimeout(resolve, AgentCallClaims.SETTLE_MS));

    return storage.getItem(key)?.startsWith(`${token}:`) ?? false;
  }

  // The page's token written under the call, null when another's is there.
  private mark(storage: Storage, key: string, token: string): string | null {
    if (storage.getItem(key) !== null) {
      return null;
    }

    storage.setItem(key, `${token}:${Date.now()}`);
    this.forgetOld(storage);

    return token;
  }

  private token(): string {
    return Math.random().toString(36).slice(2);
  }

  private storage(): Storage | null {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }

  private forgetOld(storage: Storage): void {
    const before = Date.now() - AgentCallClaims.KEPT_MS;

    for (let index = storage.length - 1; index >= 0; index--) {
      const key = storage.key(index);

      if (key?.startsWith(AgentCallClaims.PREFIX) && Number(storage.getItem(key)?.split(':')[1]) < before) {
        storage.removeItem(key);
      }
    }
  }
}
