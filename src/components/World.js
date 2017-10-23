// @flow

import React, { Component, SyntheticEvent } from 'react';
import * as firebase from 'firebase';
import _ from 'lodash';

import Manager from './Manager';
import stage from './scene/stage';
import _Camera from './scene/Camera';
import Voxelizer from './scene/Voxelizer';

const THREE = require('three');

type Props = {
  db: firebase.database,
  manager: Manager,
  match: {
    params: {
      world: string
    }
  }
};

type State = {
  color: number,
  exists: number
}

export default class World extends Component<Props, State> {

  camera: THREE.PerspectiveCamera;
  canvas: HTMLCanvasElement;
  init: Function;
  mouse: THREE.Vector2;
  mouseDownCoords: THREE.Vector2;
  objects: Array<THREE.Object>;
  onMouseDown: Function;
  onMouseMove: Function;
  onMouseUp: Function;
  onResize: Function;
  raycaster: THREE.Raycaster;
  ref: firebase.ref;
  renderer: THREE.WebGlRenderer;
  rolloverMesh: THREE.Mesh;
  scene: THREE.Scene;
  world: string;

  constructor() {

    super();
  
    this.state = {
      color: 0x666666,
      exists: 0, // indeterminate... -1 = does not exist, 1 = exists
    };

    this.objects = [];

    this.init = this.init.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onResize = this.onResize.bind(this);
  }

  componentDidMount() {
    
    // trigger worldChange for admin
    this.props.manager.trigger('worldChange', this);

    // add colorChange listener
    this.props.manager.on('colorChange', c => {
      this.setState({ color: c.color })
    });

    this.world = this.props.match.params.world;

    this.props.db.ref('worldIndex/' + this.world).on('value', (snapshot) => {
      // if no value, then it doesn't exist, serve 404
      if (_.isNil(snapshot.val())) return this.setState({ exists: -1 });
      // if it exists, we're good to go and initialize
      this.setState({ exists: 1 }, this.init);
    });

    window.addEventListener('resize', this.onResize);
  }

  componentWillUnmount() {
    // TODO: destroy scene, objects, etc.
    window.removeEventListener('resize', this.onResize);
  }

  init() {

    // set up reference to this world and canvas
    this.ref = this.props.db.ref('worlds/' + this.world);
    this.canvas = this.refs.canvas;

    this.scene = new THREE.Scene();
    stage(this);

    this.rolloverMesh = Voxelizer.voxel(0x5555ff, 0.5);
    this.rolloverMesh.visible = false;
    this.scene.add(this.rolloverMesh);

    this.renderer = new THREE.WebGLRenderer({
			antialias: true,
      canvas: this.refs.canvas,
    });
    
		this.renderer.shadowMap.enabled = true;
		// TODO: this.renderer.setPixelRatio( window.devicePixelRatio );
    
    this.camera = _Camera(this.scene, this.renderer);
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-2, -2); // mouse off canvas by default
    this.mouseDownCoords = new THREE.Vector2(-2, -2);
    
    this.onResize();

    const renderVoxel = (child) => {

      const mesh = Voxelizer.dataToMesh(child.val());
  
      this.scene.add(mesh);
      this.objects.push(mesh);
    };

    this.ref.once('value', snapshot => snapshot.forEach(renderVoxel));

    this.ref.on('child_added', renderVoxel);

		let _render = () => {
      
      this.renderer.render(this.scene, this.camera);
      this.raycaster.setFromCamera( this.mouse, this.camera );

      window.requestAnimationFrame(_render);
    };    

    _render();
    
  }

  onResize() {
    
    // only run if we've found a world
    if (this.state.exists < 1) return;
    
    const WIDTH = this.refs.container.clientWidth;
    const HEIGHT = this.refs.container.clientHeight;

		this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;

    this.camera.aspect = WIDTH / HEIGHT;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize( WIDTH, HEIGHT );
  }

  onMouseMove(e: SyntheticEvent) {

    const rect = this.canvas.getBoundingClientRect();

    // $FlowFixMe
    this.mouse.x = ( (e.clientX - rect.x ) / this.canvas.width ) * 2 - 1;
    // $FlowFixMe
    this.mouse.y = -( (e.clientY - rect.y ) / this.canvas.height ) * 2 + 1;

    let dist = Infinity;
    let closestObj = null;

    this.objects.forEach(object => {
      object.scale.set(1, 1, 1);
    });

    // calculate objects intersecting the picking ray
    const intersects = [];
    this.raycaster.intersectObjects( this.objects ).forEach(intersect => {
      intersects.push(intersect);
    });

    intersects.forEach(intersect => {
      if ( intersect.distance < dist ) {
        dist = intersect.distance;
        closestObj = intersect;
      }
    });

    if ( closestObj === null ) return;

    if ( !e.shiftKey ) {

      this.rolloverMesh.visible = true;
      this.rolloverMesh.position.copy( closestObj.point ).add( closestObj.face.normal );
      this.rolloverMesh.position
        .divideScalar( Voxelizer.UNIT )
        .floor()
        .multiplyScalar( Voxelizer.UNIT )
        .addScalar( Voxelizer.UNIT / 2 );
      
        if ( this.rolloverMesh.position.y < 0 ) {
        this.rolloverMesh.position.y += Voxelizer.UNIT;
      }

    } else {
      this.rolloverMesh.visible = false;
    }
  }

  onMouseDown(e: MouseEvent) {
    this.mouseDownCoords.x = this.mouse.x;
    this.mouseDownCoords.y = this.mouse.y;
  }

  onMouseUp(e: MouseEvent) {
    
    if ( this.mouseDownCoords.x !== this.mouse.x || this.mouseDownCoords.y !== this.mouse.y ) return;
    if ( this.rolloverMesh.visible === false ) return;

    // TODO: delete voxel
    
    const mesh = Voxelizer.voxel(this.state.color);
    const p = this.rolloverMesh.position;
    mesh.position.set(p.x, p.y, p.z);

    this.scene.add(mesh);
    this.objects.push(mesh);

    this.ref.push(Voxelizer.meshToData(mesh));
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
      height: '100%',
      width: '100%'
    };
    
    return (
      <div style={style} ref="container">
        <canvas ref="canvas" 
          onMouseDown={this.onMouseDown} 
          onMouseMove={this.onMouseMove}
          onMouseUp={this.onMouseUp} />
      </div>
    );
  }
};