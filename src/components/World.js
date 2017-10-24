// @flow

import React, { Component, SyntheticEvent } from 'react';
import * as firebase from 'firebase';
import _ from 'lodash';

import CONFIG from '../config';
import Manager from './Manager';
import stage from './scene/stage';
import _Camera from './scene/Camera';
import Voxelizer from './scene/Voxelizer';
import MeshData from './scene/MeshData';
import Objects from './scene/Objects';

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
  exists: number,
  type: number
}

export default class World extends Component<Props, State> {

  camera: THREE.PerspectiveCamera;
  canvas: HTMLCanvasElement;
  dataRef: firebase.ref;
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
  rolloverMesh: THREE.Mesh;
  scene: THREE.Scene;
  screenshot: Function;
  screenshotInterval: number
  world: string;

  constructor() {

    super();
  
    this.state = {
      color: 0x666666,
      exists: 0, // indeterminate... -1 = does not exist, 1 = exists
      type: MeshData.VOXEL,
    };

    this.objects = new Objects();

    this.draw = this.draw.bind(this);
    this.init = this.init.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onResize = this.onResize.bind(this);
    this.screenshot = this.screenshot.bind(this);
  }

  componentDidMount() {
    
    // trigger worldChange for admin
    this.props.manager.trigger('worldChange', this);

    // add colorChange listener
    this.props.manager.on('colorChange', c => {
      this.setState({ color: c.color })
    });

    // add typeChange listener
    this.props.manager.on('typeChange', c => {
      this.setState({ type: c.type })
    });

    this.world = this.props.match.params.world;

    this.props.db.ref('worldIndex/' + this.world).once('value', (snapshot) => {
      // if no value, then it doesn't exist, serve 404
      if (_.isNil(snapshot.val())) return this.setState({ exists: -1 });
      // if it exists, we're good to go and initialize
      this.setState({ exists: 1 }, this.init);
    });

    setTimeout(this.screenshot, 5000);

    this.screenshotInterval = setInterval(this.screenshot, 60 * 1000);

    window.addEventListener('resize', this.onResize);
  }

  componentWillUnmount() {

    clearInterval(this.screenshotInterval);

    // TODO: destroy scene, objects, etc.
    this.dataRef.off();
    
    // remove colorChange listener
    this.props.manager.off('colorChange');

    // remove typeChange listener
    this.props.manager.off('typeChange');

    this.setState({ exists: 0 });

    window.removeEventListener('resize', this.onResize);
  }

  init() {

    // set up reference to this world and canvas
    this.dataRef = this.props.db.ref('worlds/' + this.world);
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

    const renderVoxel = (child) => {

      const mesh = Voxelizer.dataToMesh(child.val());
  
      this.scene.add(mesh);
      this.objects.add(mesh);
    };

    const unRenderVoxel = (child) => {

      const data = MeshData.fromObject(child.val());
      const mesh = Voxelizer.dataToMesh(data);
      let match = null;

      for (let obj of this.objects.all()) {
        if (obj.position.equals(mesh.position)) {
          match = obj;
          break;
        }
      }

      if (match !== null) {
        match.geometry.dispose();
        match.material.dispose();
        this.scene.remove(match);
        this.objects.remove(match);
      }
    };

    // on subsequent new voxels
    this.dataRef.on('child_added', renderVoxel);

    // on deleted voxels
    this.dataRef.on('child_removed', unRenderVoxel);

		this.draw();
    
  }

  draw() {
    
    this.renderer.render(this.scene, this.camera);
    this.raycaster.setFromCamera( this.mouse, this.camera );

    if (this.state.exists > 0) window.requestAnimationFrame(this.draw);
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

    // delete voxel
    if (e.shiftKey) {
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

      if ( closestObj === null ) return;

      const data = Voxelizer.meshToData(closestObj.object);
      
      // find matching data from ref
      this.dataRef.once('value', snapshot => {
        snapshot.forEach(child => {
          const test = MeshData.fromObject(child.val());
          if (test.matches(data)) this.dataRef.child(child.key).remove();
        });
      });

      return;
    }

    // if not deleting, and the rolloverMesh is not visible,
    // don't do anything
    if ( this.rolloverMesh.visible === false ) return;
    
    let mesh;
    if (this.state.type === MeshData.SPHERE) {
      mesh = Voxelizer.sphere(this.state.color);
      console.log(Voxelizer.meshToData(mesh));
    } else {
      mesh = Voxelizer.voxel(this.state.color);
    }
    const p = this.rolloverMesh.position;
    mesh.position.set(p.x, p.y, p.z);

    this.dataRef.push(Voxelizer.meshToData(mesh));

    // hide rolloverMesh to prevent placing multiple in same position
    this.rolloverMesh.visible = false;
  }

  screenshot() {

    if (this.state.exists < 1) return;

    const request = new XMLHttpRequest();

    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 600 * this.canvas.height / this.canvas.width;

    // save state of rolloverMesh and camera
    const prevRolloverState = this.rolloverMesh.visible;
    const prevCamera = this.camera.clone();

    // hide rolloverMesh, look top down
    this.rolloverMesh.visible = false;
    this.camera.position.set(0, 1000, 0);
    this.camera.lookAt(new THREE.Vector3());

    this.draw();

    canvas.getContext('2d').drawImage(this.canvas, 0, 0, canvas.width, canvas.height);

    const data = canvas.toDataURL().split(',')[1];

    request.open('POST', CONFIG.imgurEndpoint, true);
    request.setRequestHeader('Authorization', 'Client-ID ' + CONFIG.imgurId);
    request.setRequestHeader('Accept', 'application/json');
    request.send(data);

    request.onreadystatechange = () => {

      if (request.status !== 200) return console.log(request.responseText);
      if (request.responseText.length === 0) return;

      const res = JSON.parse(request.responseText);
      const url = res.data.link;
      this.props.db.ref('worldIndex').child(this.world).set(url);
    };

    // restore everything
    this.rolloverMesh.visible = prevRolloverState;
    this.camera.copy(prevCamera);
    this.draw();
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