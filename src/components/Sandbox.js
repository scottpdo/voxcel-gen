// @flow

import React, { Component, SyntheticEvent } from 'react';

import Manager from './Manager';
import stage from './scene/stage';
import _Camera from './scene/Camera';
import VoxelizerCtr from './scene/Voxelizer';
import MeshData from './scene/MeshData';
import Objects from './scene/Objects';

const THREE = require('three');

const Voxelizer = new VoxelizerCtr();

type Props = {
  manager: Manager
};

type State = {
  action: ?string,
  color: number,
  exists: number,
  type: number,
};

export default class Sandbox extends Component<Props, State> {

  camera: THREE.PerspectiveCamera;
  canvas: HTMLCanvasElement;
  draw: Function;
  init: Function;
  mouse: THREE.Vector2;
  mouseDownCoords: THREE.Vector2;
  objects: Objects;
  onMouseDown: Function;
  onMouseMove: Function;
  onMouseUp: Function;
  onResize: Function;
  raycaster: THREE.Raycaster;
  renderer: THREE.WebGlRenderer;
  renderVoxel: Function;
  rolloverMesh: THREE.Mesh;
  scene: THREE.Scene;
  typeChange: Function;
  unrenderVoxel: Function;
  update: Function;
  world: string;

  constructor() {

    super();
  
    this.state = {
      action: null,
      color: 0x666666,
      type: MeshData.VOXEL,
    };

    this.objects = new Objects();

    this.draw = this.draw.bind(this);
    this.init = this.init.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onResize = this.onResize.bind(this);
    this.renderVoxel = this.renderVoxel.bind(this);
    this.typeChange = this.typeChange.bind(this);
    this.unrenderVoxel = this.unrenderVoxel.bind(this);
  }

  componentDidMount() {
    
    // trigger worldChange for admin
    this.props.manager.trigger('worldChange', this);

    // add managerial listeners
    this.props.manager.on('colorChange', c => {
      this.setState({ color: c.color });
    })
    .on('chooseColor', c => {
      this.setState({ action: 'chooseColor' });
    })
    .on('typeChange', this.typeChange);

    this.init();

    window.addEventListener('resize', this.onResize);
  }

  componentWillUnmount() {
    
    // remove colorChange listener
    this.props.manager
      .off('colorChange')
      .off('chooseColor')
      .off('typeChange');

    window.removeEventListener('resize', this.onResize);
    
    this.refs.canvas.removeEventListener('wheel', this.draw);
  }

  init() {

    // set up reference to this world and canvas
    this.canvas = this.refs.canvas;

    this.scene = new THREE.Scene();
    stage(this);

    this.rolloverMesh = Voxelizer.voxel(0x5555ff, 0.5);
    this.rolloverMesh.visible = false;
    this.scene.add(this.rolloverMesh);

    this.renderer = new THREE.WebGLRenderer({
			antialias: true,
      canvas: this.refs.canvas,
      preserveDrawingBuffer: true
    });
    
		this.renderer.shadowMap.enabled = true;
		// TODO: this.renderer.setPixelRatio( window.devicePixelRatio );
    
    this.camera = _Camera(this.scene, this.renderer);
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-2, -2); // mouse off canvas by default
    this.mouseDownCoords = new THREE.Vector2(-2, -2);
    
    this.onResize();

    // not sure why, but can't add this to <canvas> in render()
    this.refs.canvas.addEventListener('wheel', this.draw);

		this.draw();
    
  }

  draw() {
    
    this.renderer.render(this.scene, this.camera);
    this.raycaster.setFromCamera( this.mouse, this.camera );
  }

  renderVoxel(mesh: THREE.Mesh) {

    this.scene.add(mesh);
    this.objects.add(mesh);

    this.draw();
  }

  unrenderVoxel(mesh: THREE.Mesh) {

    mesh.geometry.dispose();
    mesh.material.dispose();
    this.scene.remove(mesh);
    this.objects.remove(mesh);

    this.draw();
  }

  onResize() {
    
    const WIDTH = this.refs.container.clientWidth;
    const HEIGHT = this.refs.container.clientHeight;

		this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;

    this.camera.aspect = WIDTH / HEIGHT;
		this.camera.updateProjectionMatrix();
    this.renderer.setSize( WIDTH, HEIGHT );
    
    this.draw();
  }

  onMouseMove(e: SyntheticEvent) {

    const rect = this.canvas.getBoundingClientRect();

    // $FlowFixMe
    this.mouse.x = ( (e.clientX - rect.x ) / this.canvas.width ) * 2 - 1;
    // $FlowFixMe
    this.mouse.y = -( (e.clientY - rect.y ) / this.canvas.height ) * 2 + 1;

    if ( this.state.action === 'chooseColor' ) {
      this.rolloverMesh.visible = false;
      return this.draw();
    }

    let dist = Infinity;
    let closestObj = null;

    // calculate objects intersecting the picking ray
    const intersects = [];
    this.raycaster.intersectObjects( this.objects.all() ).forEach(intersect => {
      intersects.push(intersect);
    });

    intersects.forEach(intersect => {
      if ( intersect.distance < dist ) {
        dist = intersect.distance;
        closestObj = intersect;
      }
    });

    // just moving around, show the rolloverMesh
    if ( closestObj !== null && !e.shiftKey ) {

      this.rolloverMesh.visible = true;

      // Beams: TODO
      if (this.state.type === MeshData.BEAM) {

        const closestPt = closestObj.point.clone().add(closestObj.face.normal);
        
        closestPt.divideScalar( Voxelizer.UNIT )
          .round()
          .multiplyScalar( Voxelizer.UNIT );

        let angle = Infinity;
        let closestNeighbor = null;
        Voxelizer.neighbors(closestPt).forEach(pt => {

          const closestProj = closestPt.clone().project(this.camera);

          const tmp = pt.clone().project(this.camera);
          const proj = new THREE.Vector2(tmp.x, tmp.y);

          // normalize neighbor point and mouse relative to projected closest point
          const normalizedMouse = this.mouse.clone().sub(closestProj);
          const normalizedProj = proj.sub(closestProj);
          const a = Math.abs(normalizedMouse.angle() - normalizedProj.angle());

          if (a < angle) {
            angle = a;
            closestNeighbor = pt;
          }
        });

        if (closestNeighbor === null) return;

        // TODO: this is a bit messy...
        if (closestNeighbor.y !== closestPt.y) {
          this.rolloverMesh.rotation.x = 0;
          this.rolloverMesh.rotation.z = 0;
          closestPt.y += (closestNeighbor.y - closestPt.y) / 2;
        } else if (closestNeighbor.x !== closestPt.x) {
          this.rolloverMesh.rotation.x = 0;
          this.rolloverMesh.rotation.z = Math.PI / 2;
          closestPt.x += (closestNeighbor.x - closestPt.x) / 2;
        } else if (closestNeighbor.z !== closestPt.z) {
          this.rolloverMesh.rotation.x = Math.PI / 2;
          this.rolloverMesh.rotation.z = 0;
          closestPt.z += (closestNeighbor.z - closestPt.z) / 2;
        }

        this.rolloverMesh.position.copy(closestPt);

      // Voxels or Spheres
      } else {
        
        const closestPt = closestObj.point.clone().add(closestObj.face.normal);

        closestPt.divideScalar( Voxelizer.UNIT )
          .floor()
          .multiplyScalar( Voxelizer.UNIT )
          .addScalar( Voxelizer.UNIT / 2 );
          
        if (closestPt.y < 0) closestPt.y += Voxelizer.UNIT;

        this.rolloverMesh.position.copy(closestPt);
      }

    } else {
      this.rolloverMesh.visible = false;
    }

    this.draw();
  }

  onMouseDown(e: MouseEvent) {
    this.mouseDownCoords.x = this.mouse.x;
    this.mouseDownCoords.y = this.mouse.y;
  }

  onMouseUp(e: MouseEvent) {
    
    if ( this.mouseDownCoords.x !== this.mouse.x || this.mouseDownCoords.y !== this.mouse.y ) return;

    // deleting or choosing color -- find closest
    if ( e.shiftKey || this.state.action === 'chooseColor' ) {

      // find closest
      // calculate objects intersecting the picking ray
      let dist = Infinity;
      let closestObj = null;
      const intersects = [];

      this.raycaster.intersectObjects( this.objects.all() ).forEach(intersect => {
        intersects.push(intersect);
      });

      intersects.forEach(intersect => {
        if ( intersect.distance < dist ) {
          dist = intersect.distance;
          closestObj = intersect;
        }
      });

      if ( closestObj === null ) {
        // no object selected, just revert to normal
        if (this.state.action === 'chooseColor') this.setState({ action: null });
        return;
      }

      if ( this.state.action === 'chooseColor' ) {

        const color = closestObj.object.material.color.getHex();

        this.setState({ 
          action: null,
          color 
        });

        this.props.manager.trigger('colorChosen', { color });

        return;
      }

      // otherwise, we are deleting
      const mesh = closestObj.object;
      if (mesh.name === 'groundPlane') return; // don't delete the ground plane!
      return this.unrenderVoxel(mesh);
    }

    // if not deleting, and the rolloverMesh is not visible,
    // don't do anything
    if ( this.rolloverMesh.visible === false ) return;
    
    let mesh;
    if (this.state.type === MeshData.SPHERE) {
      mesh = Voxelizer.sphere(this.state.color);
    } else if (this.state.type === MeshData.BEAM) {
      mesh = Voxelizer.beam(this.state.color);
    } else {
      mesh = Voxelizer.voxel(this.state.color);
    }

    const p = this.rolloverMesh.position;
    const r = this.rolloverMesh.rotation;
    
    mesh.position.copy(p);
    mesh.rotation.copy(r);

    this.renderVoxel(mesh);

    // hide rolloverMesh to prevent placing multiple in same position
    this.rolloverMesh.visible = false;
  }

  typeChange(c: Object) {

    if (!c.hasOwnProperty('type')) throw new Error("Can't change type if no type given.");

    if (c.type === MeshData.BEAM) {

      this.scene.remove(this.rolloverMesh);
      this.rolloverMesh = Voxelizer.beam(0x5555ff, 0.5);
      this.scene.add(this.rolloverMesh);

    } else {
      this.scene.remove(this.rolloverMesh);
      this.rolloverMesh = Voxelizer.voxel(0x5555ff, 0.5);
      this.scene.add(this.rolloverMesh);
    }

    this.setState({ type: c.type });
  }

  render() {

    const textStyle = { 
      fontSize: 24,
      textAlign: 'center',
      top: '50%',
      transform: 'translateY(-50%)'
    };

    if (this.state.exists === 0) 
      return <div style={textStyle}>Loading...</div>;
    if (this.state.exists === -1) 
      return <div style={textStyle}>404 - Couldn't find world.</div>;
    
    const style = {
      cursor: this.state.action === 'chooseColor' ? 'copy' : 'default',
      height: '100%',
      width: '100%'
    };

    const nameStyle = {
      color: '#fff',
      position: 'absolute',
      fontWeight: 'normal',
      top: 20,
      left: 20,
      margin: 0,
      userSelect: 'none'
    };
    
    return (
      <div style={style} ref="container">
        <canvas ref="canvas" 
          onMouseDown={this.onMouseDown} 
          onMouseMove={this.onMouseMove}
          onMouseUp={this.onMouseUp} />
        <h1 style={nameStyle}>Sandbox</h1>
      </div>
    );
  }
};