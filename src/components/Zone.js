// @flow

import React, { Component } from 'react';
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
      zone: string
    }
  }
};

type State = {
  color: number,
  exists: number
}

export default class Zone extends Component<Props, State> {

  camera: THREE.PerspectiveCamera;
  canvas: HTMLCanvasElement;
  destroy: Function;
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
  zone: string;

  constructor() {

    super();
  
    this.state = {
      color: 0x666666,
      exists: 0, // indeterminate... -1 = does not exist, 1 = exists
    };

    this.objects = [];

    this.destroy = this.destroy.bind(this);
    this.init = this.init.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onResize = this.onResize.bind(this);
  }

  componentDidMount() {
    
    // trigger zoneChange for admin
    this.props.manager.trigger('zoneChange', this);

    // add colorChange listener
    this.props.manager.on('colorChange', c => {
      console.log('colorChange triggered', c);
      this.setState({ color: c.color })
    });

    this.zone = this.props.match.params.zone;

    this.props.db.ref('zoneIndex/' + this.zone).on('value', (snapshot) => {
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
    if (this.state.exists === 1) this.destroy();
  }

  destroy() {
    this.refs.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.refs.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.refs.canvas.removeEventListener('mouseup', this.onMouseUp);
  }

  init() {

    // set up reference to this zone and canvas
    this.ref = this.props.db.ref('zones/' + this.zone);
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

    this.refs.canvas.addEventListener('mousedown', this.onMouseDown);
    this.refs.canvas.addEventListener('mousemove', this.onMouseMove);
    this.refs.canvas.addEventListener('mouseup', this.onMouseUp);
    
  }

  onResize() {
    
    // only run if we've found a zone
    if (this.state.exists < 1) return;
    
    const WIDTH = this.refs.container.clientWidth;
    const HEIGHT = this.refs.container.clientHeight;

		this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;

    this.camera.aspect = WIDTH / HEIGHT;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize( WIDTH, HEIGHT );
  }

  onMouseMove(e: MouseEvent) {

    // for some reason Flow isn't recognizing layerX/layerY on MouseEvent :-(
    // $FlowFixMe
    this.mouse.x = ( e.layerX / this.canvas.width ) * 2 - 1;
    // $FlowFixMe
    this.mouse.y = -( e.layerY / this.canvas.height ) * 2 + 1;

    let dist = Infinity;
    let closestObj = null;

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

    if ( closestObj !== null ) {

      this.rolloverMesh.visible = true;;
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
      return <div style={textStyle}>404 - Couldn't find zone.</div>;
    
    const style = {
      height: '100%',
      width: '100%'
    };
    
    return (
      <div style={style} ref="container">
        <canvas ref="canvas" />
      </div>
    );
  }
};