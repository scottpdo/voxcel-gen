// @flow

type Pair = {
  evt: string,
  cb: Function
};

type Data = {
  color: number
};

export default class Manager {

  events: Array<Pair>;
  data: Data;

  constructor() {

    this.events = [];

    this.data = {
      color: 0x666666
    };
  }

  on(evt: string, cb: Function) {
    this.events.push({ evt, cb });
    return this; // allow chaining for conciseness
  }

  off(evt: string) {
    const matches = e => e.evt === evt;
    const idx = this.events.findIndex(matches);
    if (idx >= 0) this.events.splice(idx, 1);
  }

  trigger(evt: string, params: Object = {}) {
    this.events.filter(obj => obj.evt === evt).forEach(obj => obj.cb(params));
  }

  set(key: string, value: any) {
    if (this.data.hasOwnProperty(key)) {
      this.data[key] = value;
    } else {
      throw new Error("Can't set property of manager -- key doesn't exist");
    }
  }

  get(key: string) {
    if (this.data.hasOwnProperty(key)) {
      return this.data[key];
    } else {
      throw new Error("Can't get property of manager -- key doesn't exist");
    }
  }
};