// @flow

const THREE = require('three');

export default class Objects {

  objects: Array<THREE.Object3D>;

  constructor() {
    this.objects = [];
  }

  add(obj: THREE.Object3D) {
    this.objects.push(obj);
  }

  remove(obj: THREE.Object3D) {
    const idx = this.objects.indexOf(obj);
    if (idx < 0) return;
    this.objects.splice(idx, 1);
  }

  all(): Array<THREE.Object3D> {
    return this.objects;
  }
}