// @flow

import MeshData from './MeshData';

const THREE = require('three');

const UNIT = 50;

const Voxelizer = {

  UNIT,

  voxel(color: number, opacity:number = 1) {

    const geo = new THREE.BoxGeometry(UNIT, UNIT, UNIT);
    const mat = opacity < 1 ? new THREE.MeshBasicMaterial({
      color,
      opacity,
      transparent: true
    }) : new THREE.MeshLambertMaterial({ color });

    return new THREE.Mesh(geo, mat);
  },

  sphere(color: number, opacity:number = 1) {
    
    const geo = new THREE.SphereGeometry(UNIT * 0.75, 12, 12);
    const mat = opacity < 1 ? new THREE.MeshBasicMaterial({
      color,
      opacity,
      transparent: true
    }) : new THREE.MeshLambertMaterial({ color });

    return new THREE.Mesh(geo, mat);
  },

  dataToMesh(data: MeshData): THREE.Mesh {
    
    const x = (data.x * UNIT) + UNIT / 2;
    const y = (data.y * UNIT) + UNIT / 2;
    const z = (data.z * UNIT) + UNIT / 2;
    const color = data.hasOwnProperty('color') ? data.color : 0x666666;

    let mesh;

    if (data.hasOwnProperty('type')) {
      if (data.type === MeshData.SPHERE) {
        mesh = this.sphere(color);
      } else {
        mesh = this.voxel(color);
      }
    // default to voxel
    } else {
      mesh = this.voxel(color);
    }

    mesh.position.set(x, y, z);
    
    return mesh;
  },

  meshToData(mesh: THREE.Mesh): MeshData {

    const p = mesh.position;
    const x = (p.x - UNIT / 2) / UNIT;
    const y = (p.y - UNIT / 2) / UNIT;
    const z = (p.z - UNIT / 2) / UNIT;
    const color = mesh.material.color.getHex();

    const result = new MeshData(x, y, z);
    result.color = color;

    let type = MeshData.VOXEL;
    if (mesh.geometry instanceof THREE.SphereGeometry) type = MeshData.SPHERE;
    result.type = type;

    return result;
  }
};

export default Voxelizer;