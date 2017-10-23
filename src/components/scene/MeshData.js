// @flow

import _ from 'lodash';

export default class MeshData {

  x: number;
  y: number;
  z: number;
  color: ?number;

  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  static fromObject(obj: Object): MeshData {
    
    const result = new MeshData(0, 0, 0);
    
    if (obj.hasOwnProperty('x') && _.isNumber(obj.x)) result.x = obj.x;
    if (obj.hasOwnProperty('y') && _.isNumber(obj.y)) result.y = obj.y;
    if (obj.hasOwnProperty('z') && _.isNumber(obj.z)) result.z = obj.z;
    if (obj.hasOwnProperty('color') && _.isNumber(obj.color)) result.color = obj.color;
    
    return result;
  }

  clone(): MeshData {
    
    const result = new MeshData(this.x, this.y, this.z);
    
    if (!_.isNil(this.color)) result.color = this.color;
    
    return result;
  }

  matches(other: MeshData): boolean {
    
    if (this.x !== other.x) return false;
    if (this.y !== other.y) return false;
    if (this.z !== other.z) return false;

    if (!_.isNil(this.color) && !_.isNil(other.color)) {
      if (this.color !== other.color) return false;
    }
    
    return true;
  }
};