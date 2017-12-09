// @flow

import * as THREE from 'three';
import MeshData from './MeshData';

const UNIT = 50;

export default class Voxelizer {

  colorIndex: number = 0;
  materials: Object;
  UNIT: number;
  user: string;
  userLookup: Object = {};
  
  static COLORS = [
    '4DCCBD', // medium turquoise
    '231651', // russian violet
    '2374AB', // lapis lazuli
    'FF8484', // tulip
    '5BC0EB', // blue jeans
    'FDE74C', // "gargoyle gas" (!)
    '9BC53D', // android green
    'C3423F', // english vermilion
    '211A1E', // eerie black
  ];

  static VOX_GEO = new THREE.BoxGeometry(UNIT, UNIT, UNIT);

  static SPHERE_GEO = new THREE.SphereGeometry(UNIT * 0.75, 12, 12);

  static BEAM_GEO = new THREE.BoxGeometry(UNIT / 5, 6 * UNIT / 5, UNIT / 5);

  constructor() {

    this.UNIT = UNIT;
    
    this.materials = {
      // 6710886 = 0x666666 in dec
      '6710886': new THREE.MeshLambertMaterial({
        color: 0x666666
      })
    };
  }

  addUser(user: string) {
    const color = parseInt(Voxelizer.COLORS[this.colorIndex], 16);
    this.userLookup[user] = new THREE.MeshLambertMaterial({ color });
    this.colorIndex++;
    if (this.colorIndex === Voxelizer.COLORS.length) {
      console.warn("Number of users exceeded number of colors");
      this.colorIndex = 0;
    }
  }

  hasUser(user: string): boolean {
    return this.userLookup.hasOwnProperty(user);
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

  /**
   * Convert data into a mesh, ready to be placed into the scene.
   * @param {*} data 
   */
  dataToMesh(data: MeshData, viewingByPlayer: boolean): THREE.Mesh {
    
    const x = (data.x * UNIT) + UNIT / 2;
    const y = (data.y * UNIT) + UNIT / 2;
    const z = (data.z * UNIT) + UNIT / 2;

    let color = data.hasOwnProperty('color') ? data.color : 0x666666;

    const rotation = data.rotation;

    let mesh: THREE.Mesh;

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

    if (viewingByPlayer) mesh.material = this.userLookup[data.user];

    mesh.position.set(x, y, z);

    if (rotation === "x") mesh.rotation.x = Math.PI / 2;
    if (rotation === "y") mesh.rotation.y = Math.PI / 2;
    if (rotation === "z") mesh.rotation.z = Math.PI / 2;

    // carry through key, user, and time
    mesh.name = data.key;
    mesh.userData.key = data.key;
    mesh.userData.user = data.user;
    mesh.userData.time = data.time || -1;
    
    return mesh;
  }

  /**
   * Convert a mesh into data, to modify in database.
   * @param {*} mesh 
   */
  meshToData(mesh: THREE.Mesh): MeshData {

    const p = mesh.position;
    const r = mesh.rotation;

    const x = (p.x - UNIT / 2) / UNIT;
    const y = (p.y - UNIT / 2) / UNIT;
    const z = (p.z - UNIT / 2) / UNIT;

    const result = new MeshData(x, y, z);

    result.color = mesh.material.color.getHex();
    if (mesh.userData.key) result.key = mesh.userData.key;
    result.time = mesh.userData.time || -1;
    result.type = mesh.userData.type;
    result.user = mesh.userData.user;

    if (r.x !== 0) result.rotation = "x";
    if (r.y !== 0) result.rotation = "y";
    if (r.z !== 0) result.rotation = "z";

    return result;
  }

  /**
   * For a given point, get its 6 neighbors (north south east west up down).
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