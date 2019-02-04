import {Dirt} from './Dirt';

/** @internal */
/** @hidden */
export class DirtTrace {
  constructor(
      public enabled: boolean, private parent: Dirt, private scope: string) {
    this.enabled = enabled;
  }

  message(message: string): DirtTrace {
    if (!this.enabled) {
      return this;
    }

    console.log(this.prefix() + (message == null ? '<null>' : message));
    return this;
  }

  object(object: any): DirtTrace {
    if (!this.enabled) {
      return this;
    }

    if (typeof object == 'string') {
      this.message(object);
    }

    console.log(this.prefix());
    console.dir(object == null ? '<null>' : object);
    return this;
  }

  error(error: any): DirtTrace {
    if (!this.enabled) {
      return this;
    }

    console.error(this.prefix());
    console.error(error == null ? '<null error>' : error);
    return this;
  }

  async promise(promise: () => Promise<any>): Promise<DirtTrace> {
    if (!this.enabled) {
      return this;
    }

    let res = null;
    try {
      res = await promise();
    } catch (e) {
      this.error(e);
      return this;
    }

    this.object(res);
    return this;
  }

  function(func: Function): DirtTrace {
    if (!this.enabled) {
      return this;
    }

    const res = func();
    this.object(res);

    return this;
  }

  private prefix(): string {
    const date = new Date();
    const dateString = date.toLocaleTimeString();
    return `[${dateString}] ${this.scope} [From=${
        this.parent.defaultAccount()}] `;
  }

  create(scope: string): DirtTrace {
    return new DirtTrace(this.enabled, this.parent, scope);
  }
}
