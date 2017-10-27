// @flow

import MeshData from './MeshData';

const UNIT = 50;

const THREE = require('three');

export default class Voxelizer {

  materials: Object;
  UNIT: number;

  static VOX_GEO = new THREE.BoxGeometry(UNIT, UNIT, UNIT);

  static SPHERE_GEO = new THREE.SphereGeometry(UNIT * 0.75, 12, 12);

  constructor() {

    this.UNIT = UNIT;
    
    this.materials = {
      // 6710886 = 0x666666 in dec
      '6710886': new THREE.MeshLambertMaterial({
        color: 0x666666
      })
    };
  }

  getMaterial(color: number, opacity:number = 1): THREE.Material {

    let mat: THREE.Material;

    // if material not in library, add a new one
    if (!this.materials.hasOwnProperty(color.toString()) && opacity === 1) {
      
      mat = this.materials[color.toString()] = new THREE.MeshLambertMaterial({ color });

    // not storing transparent materials for now...
    } else if ( opacity < 1 ) {
      
      mat = new THREE.MeshBasicMaterial({
        color,
        opacity,
        transparent: true
      });

    // if it is in the library, reference it
    } else {
      
      mat = this.materials[color.toString()];
    }

    return mat;
  }

  voxel(color: number, opacity:number = 1) {

    const geo = Voxelizer.VOX_GEO;
    const mat = this.getMaterial(color, opacity);

    return new THREE.Mesh(geo, mat);
  }

  sphere(color: number, opacity:number = 1) {
    
    const geo = Voxelizer.SPHERE_GEO;
    const mat = this.getMaterial(color, opacity);

    return new THREE.Mesh(geo, mat);
  }

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
  }

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