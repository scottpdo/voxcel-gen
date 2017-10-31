// @flow

export default class Directory {

  entries: Object;

  constructor() {
    this.entries = {};
  }

  get(id: string) {
    return (this.entries[id]) ? this.entries[id] : "";
  }

  set(id: string, displayName: string) {
    this.entries[id] = displayName;
  }

  serialize(): string {
    let output = "";
    for (let id in this.entries) {
      output += id + ": " + this.entries[id] + "\n";
    }
    return output;
  }
}