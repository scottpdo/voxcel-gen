// @flow

import React, { Component, SyntheticEvent } from 'react';
import * as firebase from 'firebase';
import _ from 'lodash';

// import CONFIG from '../config';
import Manager from './Manager';
import stage from './scene/stage';
import _Camera from './scene/Camera';
import VoxelizerCtr from './scene/Voxelizer';
import MeshData from './scene/MeshData';
import Objects from './scene/Objects';

const THREE = require('three');

const Voxelizer = new VoxelizerCtr();

type Props = {
  db: firebase.database,
  manager: Manager,
  storage: firebase.storage,
  match: {
    params: {
      world: string
    }
  }
};

type State = {
  action: ?string,
  color: number,
  displayName: string,
  exists: number,
  type: number,
  viewingByPlayer: boolean,
  viewingHistory: boolean
};

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
  screenshotInterval: number;
  typeChange: Function;
  update: Function;
  userLookup: Object;
  viewByPlayer: Function;
  viewHistory: Function;
  world: string;

  constructor() {

    super();
  
    this.state = {
      action: null,
      color: 0x666666,
      displayName: "",
      exists: 0, // indeterminate... -1 = does not exist, 1 = exists
      type: MeshData.VOXEL,
      viewingByPlayer: false,
      viewingHistory: false
    };

    this.objects = new Objects();
    this.userLookup = {};

    this.draw = this.draw.bind(this);
    this.init = this.init.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onResize = this.onResize.bind(this);
    this.screenshot = this.screenshot.bind(this);
    this.typeChange = this.typeChange.bind(this);
    this.update = this.update.bind(this);
    this.viewByPlayer = this.viewByPlayer.bind(this);
    this.viewHistory = this.viewHistory.bind(this);
  }

  componentDidMount() {
    
    // set user
    Voxelizer.setUser(this.props.manager.get('user'));
    
    // trigger worldChange for admin
    this.props.manager.trigger('worldChange', this);

    // add managerial listeners
    this.props.manager.on('colorChange', c => {
      this.setState({ color: c.color });
    })
    .on('chooseColor', c => {
      this.setState({ action: 'chooseColor' });
    })
    .on('typeChange', this.typeChange)
    .on('viewByPlayer', this.viewByPlayer)
    .on('viewHistory', this.viewHistory);

    this.world = this.props.match.params.world;

    this.props.db.ref('worldIndex/' + this.world).once('value', (snapshot) => {
      // if no value, then it doesn't exist, serve 404
      if (_.isNil(snapshot.val())) return this.setState({ exists: -1 });
      // if it exists, we're good to go and initialize
      this.setState({ 
        displayName: snapshot.val(),
        exists: 1 
      }, this.init);
    });

    setTimeout(this.screenshot, 5000);

    this.screenshotInterval = setInterval(this.screenshot, 30 * 1000);

    window.addEventListener('resize', this.onResize);
  }

  componentWillUnmount() {

    clearInterval(this.screenshotInterval);

    // TODO: destroy scene, objects, etc.
    this.dataRef.off();
    
    // remove colorChange listener
    this.props.manager
      .off('colorChange')
      .off('chooseColor')
      .off('typeChange')
      .off('viewByPlayer')
      .off('viewHistory');

    this.setState({ exists: 0 });

    window.removeEventListener('resize', this.onResize);
    
    this.refs.canvas.removeEventListener('wheel', this.draw);
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

    let colorIndex = 0;
    // hex strings
    const colors = [
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

    const renderVoxel = (child) => {

      const mesh = Voxelizer.dataToMesh(child.val());
      
      const user = child.val().user;

      // always be checking if user is in lookup
      // and if not, add it with a corresponding material
      if (!_.isNil(user) && !this.userLookup.hasOwnProperty(user)) {
        const color = parseInt(colors[colorIndex], 16);
        this.userLookup[user] = new THREE.MeshLambertMaterial({ color });
        colorIndex++;
        if (colorIndex === colors.length) {
          console.warn("Number of users exceeded number of colors");
          colorIndex = 0;
        }
      }
  
      this.scene.add(mesh);
      this.objects.add(mesh);

      this.draw();
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

      this.draw();
      
    };

    // on subsequent new voxels
    this.dataRef.on('child_added', renderVoxel);

    // on deleted voxels
    this.dataRef.on('child_removed', unRenderVoxel);

    // not sure why, but can't add this to <canvas> in render()
    this.refs.canvas.addEventListener('wheel', this.draw);

		this.draw();
    
  }

  draw() {
    
    this.renderer.render(this.scene, this.camera);
    this.raycaster.setFromCamera( this.mouse, this.camera );
  }

  /**
   * Update all the objects in the scene (for viewing by player, etc.)
   * DOES NOT CALL .draw()
   */
  update() {
    
    this.objects.all().forEach(object => {

      if (object.name === 'groundPlane') return;

      const user = object.userData.user;

      // if viewing by user, switch out the material
      if (this.state.viewingByPlayer) {
        if (!_.isNil(user)) {
          object.material = this.userLookup[user];
        } else {
          object.visible = false;
        }
      // reset
      } else {
        object.material = object.userData.defaultMaterial;
        object.visible = true;
      }
    });
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
    
    this.draw();
  }

  onMouseMove(e: SyntheticEvent) {

    if (this.state.viewingHistory || this.state.viewingByPlayer) return this.draw();

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
    
    if ( this.state.viewingHistory || this.state.viewingByPlayer ) return;

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
    } else if (this.state.type === MeshData.BEAM) {
      mesh = Voxelizer.beam(this.state.color);
    } else {
      mesh = Voxelizer.voxel(this.state.color);
    }

    const p = this.rolloverMesh.position;
    const r = this.rolloverMesh.rotation;
    
    mesh.position.copy(p);
    mesh.rotation.copy(r);

    mesh.userData.user = this.props.manager.get('user');

    this.dataRef.push(Voxelizer.meshToData(mesh));

    // hide rolloverMesh to prevent placing multiple in same position
    this.rolloverMesh.visible = false;
  }

  screenshot() {

    const storage = this.props.storage.ref('images/' + this.world);

    if (this.state.exists < 1) return;

    // don't take screenshot if viewing history or viewing by player --
    // will not represent the world as it `is`
    if (this.state.viewingHistory || this.state.viewingByPlayer) return;

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

    const data = canvas.toDataURL();

    storage.putString(data, 'data_url');

    // restore everything
    this.rolloverMesh.visible = prevRolloverState;
    this.camera.copy(prevCamera);
    this.draw();
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

  viewByPlayer() {
    this.setState({
      viewingByPlayer: !this.state.viewingByPlayer
    }, () => {
      if (this.state.viewingByPlayer) this.rolloverMesh.visible = false;
      this.update();
      this.draw();
    });
  }

  viewHistory() {

    this.rolloverMesh.visible = false;

    this.setState({ viewingHistory: true }, () => {

      // remove all scene objects except groundPlane
      this.objects.all()
        .filter(obj => obj.name !== 'groundPlane')
        .forEach(obj => { this.scene.remove(obj) });

      this.dataRef.once('value', snapshot => {
        
        const n = snapshot.numChildren();
        if (n === 0) return this.setState({ viewingHistory: false });

        let i = 0;
        // timeout() references an external i that increments
        // so that we can increase the timeout with each iteration
        let timeout = ():number => i * 250;
        
        snapshot.forEach(child => {
          
          i++;
          
          setTimeout(() => {

            const meshData = MeshData.fromObject(child.val());
            const mesh = Voxelizer.dataToMesh(meshData);
            
            this.scene.add(mesh);
            this.objects.add(mesh);

            this.update();
            this.draw();

          }, timeout());
        });

        setTimeout(() => {
          this.setState({ viewingHistory: false });
        }, timeout());
      });

      this.draw();

    });
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
        <h1 style={nameStyle}>{this.state.displayName}</h1>
      </div>
    );
  }
};