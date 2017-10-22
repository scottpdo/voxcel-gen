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

  trigger(evt: string, params: Object = {}) {
    this.events.filter(obj => obj.evt === evt).forEach(obj => obj.cb(params));
  }
};