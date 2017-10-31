// @flow

import MeshData from './MeshData';

const UNIT = 50;

const THREE = require('three');

export default class Voxelizer {

  materials: Object;
  UNIT: number;
  user: string;

  static VOX_GEO = new THREE.BoxGeometry(UNIT, UNIT, UNIT);

  static SPHERE_GEO = new THREE.SphereGeometry(UNIT * 0.75, 12, 12);

  static BEAM_GEO = new THREE.BoxGeometry(UNIT / 8, 5 * UNIT / 4, UNIT / 8);

  constructor() {

    this.UNIT = UNIT;
    
    this.materials = {
      // 6710886 = 0x666666 in dec
      '6710886': new THREE.MeshLambertMaterial({
        color: 0x666666
      })
    };
  }

  setUser(user: string) {
    this.user = user;
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
    const mesh = new THREE.Mesh(geo, mat);

    mesh.userData.type = MeshData.VOXEL;
    mesh.userData.defaultMaterial = mat;

    return mesh;
  }

  sphere(color: number, opacity:number = 1) {
    
    const geo = Voxelizer.SPHERE_GEO;
    const mat = this.getMaterial(color, opacity);
    const mesh = new THREE.Mesh(geo, mat);

    mesh.userData.type = MeshData.SPHERE;
    mesh.userData.defaultMaterial = mat;

    return mesh;
  }

  beam(color: number, opacity:number = 1) {

    const geo = Voxelizer.BEAM_GEO;
    const mat = this.getMaterial(color, opacity);
    const mesh = new THREE.Mesh(geo, mat);

    mesh.userData.type = MeshData.BEAM;
    mesh.userData.defaultMaterial = mat;

    return mesh;
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
      } else if (data.type === MeshData.BEAM) {
        mesh = this.beam(color);
      } else {
        mesh = this.voxel(color);
      }
    // default to voxel
    } else {
      mesh = this.voxel(color);
    }

    mesh.position.set(x, y, z);

    // carry through user
    mesh.userData.user = data.user;
    
    return mesh;
  }

  meshToData(mesh: THREE.Mesh): MeshData {

    const p = mesh.position;
    const x = (p.x - UNIT / 2) / UNIT;
    const y = (p.y - UNIT / 2) / UNIT;
    const z = (p.z - UNIT / 2) / UNIT;

    const result = new MeshData(x, y, z);

    const color = mesh.material.color.getHex();
    result.color = color;

    const type = mesh.userData.type;
    result.type = type;

    const user = mesh.userData.user;
    result.user = user;

    return result;
  }

  /**
   * For a given point, get its 6 neighbors (north south east west up down)
   * @param {*} pt 
   */
  neighbors(pt: THREE.Vector3): Array<THREE.Vector3> {
    
    const pts = [];
    
    // dumb
    pts.push(pt.clone().set(pt.x + UNIT, pt.y, pt.z));
    pts.push(pt.clone().set(pt.x - UNIT, pt.y, pt.z));
    pts.push(pt.clone().set(pt.x, pt.y + UNIT, pt.z));
    pts.push(pt.clone().set(pt.x, pt.y - UNIT, pt.z));
    pts.push(pt.clone().set(pt.x, pt.y, pt.z + UNIT));
    pts.push(pt.clone().set(pt.x, pt.y, pt.z - UNIT));

    return pts;
  }
};