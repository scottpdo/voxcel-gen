// @flow

const THREE = require('three');

const UNIT = 50;

type meshData = {
  x: number,
  y: number,
  z: number
};

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

  dataToMesh(data: meshData): THREE.Mesh {
    const x = (data.x * UNIT) + UNIT / 2;
    const y = (data.y * UNIT) + UNIT / 2;
    const z = (data.z * UNIT) + UNIT / 2;

    const mesh = this.voxel(0x666666);
    mesh.position.set(x, y, z);
    
    return mesh;
  },

  meshToData(mesh: THREE.Mesh): meshData {
    const p = mesh.position;
    const x = (p.x - UNIT / 2) / UNIT;
    const y = (p.y - UNIT / 2) / UNIT;
    const z = (p.z - UNIT / 2) / UNIT;
    return { x, y, z };
  }
};

export default Voxelizer;