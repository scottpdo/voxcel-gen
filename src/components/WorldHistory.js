// @flow

import _ from 'lodash';
import MeshData from './scene/MeshData';

type Action = {
  key: string,
  time: number,
  type: number
};

export default class WorldHistory {

  added: Function;
  data: Array<Action> = [];
  delay: number = 100;
  deleted: Function;
  execute: Function;
  index: number = 0;
  lookup: Object = {}; // { [key: string]: MeshData }
  paused: boolean = false;
  replay: Function;
  timeout: number = -1;
  update: Function;

  static ADDED:number = 1;
  static DELETED:number = 0;

  constructor() {

    this.execute = this.execute.bind(this);
    this.replay = this.replay.bind(this);
    this.update = this.update.bind(this);
  }

  setAdded(added: Function) {
    this.added = added;
  }

  setDeleted(deleted: Function) {
    this.deleted = deleted;
  }

  update(data: MeshData, type: number) {
    
    const key = data.key;
    const time = (type === WorldHistory.ADDED) ? data.time : data.deleted;

    // This is throwing a Flow warning but data.deleted is guaranteed
    // to exist if we are deleting the object
    // $FlowFixMe
    this.push({ key, time, type });
      
    this.lookup[key] = data;
  }

  inProgress(): boolean {
    return this.index > 0 && this.index <= this.data.length;
  }

  push(a: Action) {
    this.data.push(a);
  }

  sort() {
    this.data = _.sortBy(this.data, [o => o.time]);
  }

  goto(index: number) {
    
    if (!_.isFunction(this.added) || !_.isFunction(this.deleted)) {
      throw new Error("Need added and deleted functions to goto history!");
    }

    let action = _.noop;

    // if going to an index that's less than the current index,
    // then we're going back in time! so need to add deleted actions
    // and delete added actions
    if (index < this.index) {
      while (this.index > index) {
        const data = this.data[this.index - 1];
        action = data.type === WorldHistory.ADDED ? this.deleted : this.added;
        action(this.lookup[data.key]);
        this.index--;
      }
    // otherwise, it's traveling through time as usual
    } else {
      while (this.index < index) {
        const data = this.data[this.index];
        action = data.type === WorldHistory.ADDED ? this.added : this.deleted;
        action(this.lookup[data.key]);
        this.index++;
      }
    }
  }

  execute(index: number, done: Function) {
    
    if (!_.isFunction(this.added) || !_.isFunction(this.deleted)) {
      throw new Error("Need added and deleted functions to execute history!");
    }
    
    if (index === 0 || index > this.data.length || this.paused) {
      if (index > this.data.length) {
        this.paused = true;
        done();
      }
      return;
    }
    
    this.index = index;
    
    if (index > 0) {
      const data = this.data[index - 1];
      let action = data.type === WorldHistory.ADDED ? this.added : this.deleted;
      action(this.lookup[data.key]);
    }
    
    this.timeout = setTimeout(() => {
      this.execute(index + 1, done);
    }, this.delay);
  }

  /**
   * Replay the history.
   * @param {Function} done Called after the last action
   */
  replay(done: Function = _.noop) {
    
    if (!_.isFunction(this.added) || !_.isFunction(this.deleted)) {
      throw new Error("Need added and deleted functions to replay history!");
    }

    this.sort();
    this.execute(this.index + 1, done);
  }

  /**
   * Like .replay(), but no delay.
   * @param {*} done Called after the last action
   */
  reset(done: Function = _.noop) {

    if (!_.isFunction(this.added) || !_.isFunction(this.deleted)) {
      throw new Error("Need added and deleted functions to reset history!");
    }
    
    this.sort();
    
    this.data.forEach((data) => {
      let action = data.type === WorldHistory.ADDED ? this.added : this.deleted;
      action(this.lookup[data.key]);
    });

    this.index = 0;

    // clear timeout if it exists
    clearTimeout(this.timeout);

    done();
  }
  
};