// @flow

type Pair = {
  evt: string,
  cb: Function
};

export default class Manager {

  events: Array<Pair>;

  constructor() {
    this.events = [];
  }

  on(evt: string, cb: Function) {
    this.events.push({ evt, cb });
  }

  off(evt: string) {
    const matches = e => e.evt === evt;
    const idx = this.events.findIndex(matches);
    if (idx >= 0) this.events.splice(idx, 1);
  }

  trigger(evt: string, params: Object = {}) {
    this.events.filter(obj => obj.evt === evt).forEach(obj => obj.cb(params));
  }
};