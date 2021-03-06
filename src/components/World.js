// @flow

import React, { Component, SyntheticEvent } from 'react';
import * as firebase from 'firebase';
import * as THREE from 'three';
import _ from 'lodash';
import md5 from 'md5';

import Manager from './Manager';
import stage from './scene/stage';
import _Camera from './scene/Camera';
import VoxelizerCtr from './scene/Voxelizer';
import MeshData from './scene/MeshData';
import Objects from './scene/Objects';
import WorldHistory from './WorldHistory';

import '../css/World.css';

let Voxelizer = new VoxelizerCtr();

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
  i: number,
  type: number,
  viewingByPlayer: boolean,
  viewingHistory: boolean
};

export default class World extends Component<Props, State> {

  camera: THREE.PerspectiveCamera;
  canvas: HTMLCanvasElement;
  dataRef: firebase.ref;
  draw: Function;
  goToHistory: Function;
  History: WorldHistory = new WorldHistory();
  init: Function;
  iter: Function;
  mouse: THREE.Vector2;
  mouseDownCoords: THREE.Vector2 = new THREE.Vector2(-2, -2);
  objects: Objects = new Objects();
  onMouseDown: Function;
  onMouseMove: Function;
  onMouseUp: Function;
  onResize: Function;
  raycaster: THREE.Raycaster;
  renderer: THREE.WebGlRenderer;
  renderVoxel: Function;
  resetHistory: Function;
  rolloverMesh: THREE.Mesh = Voxelizer.voxel(0x5555ff, 0.5);
  scene: THREE.Scene;
  screenshot: Function;
  screenshotInterval: number;
  toggleHistory: Function;
  toggleHistoryPaused: Function;
  typeChange: Function;
  unRenderVoxel: Function;
  update: Function;
  viewByPlayer: Function;
  viewHistory: Function;
  world: string;

  static BAD_PASSWORD = -2;
  static NOT_FOUND = -1;
  static INDETERMINATE = 0;
  static FOUND = 1;

  constructor() {

    super();
  
    this.state = {
      action: null,
      color: 0x666666,
      displayName: "",
      exists: World.INDETERMINATE,
      i: 0,
      type: MeshData.VOXEL,
      viewingByPlayer: false,
      viewingHistory: false
    };

    this.draw = this.draw.bind(this);
    this.goToHistory = this.goToHistory.bind(this);
    this.init = this.init.bind(this);
    this.iter = this.iter.bind(this);
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onResize = this.onResize.bind(this);
    this.renderVoxel = this.renderVoxel.bind(this);
    this.resetHistory = this.resetHistory.bind(this);
    this.screenshot = this.screenshot.bind(this);
    this.toggleHistory = this.toggleHistory.bind(this);
    this.toggleHistoryPaused = this.toggleHistoryPaused.bind(this);
    this.typeChange = this.typeChange.bind(this);
    this.unRenderVoxel = this.unRenderVoxel.bind(this);
    this.update = this.update.bind(this);
    this.viewByPlayer = this.viewByPlayer.bind(this);
    this.viewHistory = this.viewHistory.bind(this);

    this.History.setAdded((data) => {
      this.renderVoxel(data, true);
    });

    this.History.setDeleted((data) => {
      this.unRenderVoxel(data, true);
    });
  }

  componentDidMount() {

    // (re)set Voxelizer, set user
    Voxelizer = new VoxelizerCtr();
    Voxelizer.setUser(this.props.manager.get('user'));

    this.world = this.props.match.params.world;

    this.props.db.ref('worldIndex/' + this.world).once('value', (snapshot) => {

      const value = snapshot.val();
      
      // if no value, then it doesn't exist, serve 404
      if (_.isNil(value)) return this.setState({ exists: World.NOT_FOUND });
      
      const displayName = value.name;
      const password = value.password;

      if (!_.isNil(password)) {
        const message = "This world is password protected. Enter the password to access this world:";
        const pw = prompt(message);

        // if a bad password, exit
        if (_.isNil(pw) || md5(pw) !== password) return this.setState({ exists: World.BAD_PASSWORD });
      }

      // if it exists, we're good to go and initialize
      this.setState({ 
        displayName,
        exists: World.FOUND
      }, this.init);
    });
  }

  componentWillUnmount() {

    // if the world wasn't found, we don't need to unmount anything
    if (this.state.exists !== World.FOUND) return;

    clearInterval(this.screenshotInterval);

    this.dataRef.off();
    
    // remove manageriallisteners
    this.props.manager
      .off('colorChange')
      .off('chooseColor')
      .off('toggleHistory')
      .off('typeChange')
      .off('viewByPlayer');

    this.setState({ exists: World.INDETERMINATE });

    window.removeEventListener('resize', this.onResize);
    
    this.refs.canvas.removeEventListener('wheel', this.draw);
  }

  init() {
    
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
    .on('toggleHistory', this.toggleHistory);

    // set up reference to this world and canvas
    this.dataRef = this.props.db.ref('worlds/' + this.world);
    this.canvas = this.refs.canvas;

    this.scene = new THREE.Scene();
    stage(this);

    this.rolloverMesh.visible = false;
    this.scene.add(this.rolloverMesh);

    this.renderer = new THREE.WebGLRenderer({
			antialias: true,
      canvas: this.refs.canvas,
      preserveDrawingBuffer: true
    });
    
		this.renderer.shadowMap.enabled = true;
		this.renderer.setPixelRatio( window.devicePixelRatio );
    
    this.camera = _Camera(this.scene, this.renderer);
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-2, -2); // mouse off canvas by default
    
    this.onResize();

    // on subsequent new voxels
    this.dataRef.on('child_added', child => {
      
      const data = MeshData.fromObject(child.key, child.val());
      
      if (!this.state.viewingHistory) this.renderVoxel(data); 
      
      this.History.update(data, WorldHistory.ADDED);
      if (data.deleted) this.History.update(data, WorldHistory.DELETED);
      
      this.iter();
    });

    // on deleted voxels
    this.dataRef.on('child_changed', child => {

      const data = MeshData.fromObject(child.key, child.val());

      if (!this.state.viewingHistory) this.unRenderVoxel(data);

      this.History.update(data, WorldHistory.DELETED);

      this.iter();
    });

    // not sure why, but can't add this to <canvas> in render()
    this.refs.canvas.addEventListener('wheel', this.draw);
    
    setTimeout(this.screenshot, 5000);

    this.screenshotInterval = setInterval(this.screenshot, 30 * 1000);

    window.addEventListener('resize', this.onResize);

		this.draw();
    
  }

  iter() {
    this.setState({ i: this.state.i + 1 });
  }

  renderVoxel(data: MeshData, force: boolean = false) {
    
    // don't render deleted voxels
    // (unless forcing a render)
    if (!force && _.isNumber(data.deleted)) return;

    const mesh = Voxelizer.dataToMesh(data, this.state.viewingByPlayer);
    const user = data.user;

    // always be checking if user is in lookup
    // and if not, add it with a corresponding material

    // (Flow doesn't handle this well but guaranteed user is a String here)
    // $FlowFixMe
    if (_.isString(user) && !Voxelizer.hasUser(user)) Voxelizer.addUser(user);

    this.scene.add(mesh);
    this.objects.add(mesh);

    this.draw();
  }

  unRenderVoxel(data: MeshData, force: boolean = false) {

    // unrender only if deleting
    // (unless forcing a delete from history)
    if (!force && !_.isNumber(data.deleted)) return;

    const mesh = this.scene.getObjectByName(data.key);

    mesh.geometry.dispose();
    mesh.material.dispose();
    this.scene.remove(mesh);
    this.objects.remove(mesh);

    this.draw();
    
  }

  draw() {
    
    this.iter();
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
          object.material = Voxelizer.userLookup[user];
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
    if (this.state.exists !== World.FOUND) return;
    
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

      const key = Voxelizer.meshToData(closestObj.object).key;

      this.dataRef.child(key).update({ 
        deleted: new Date().getTime()
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
    mesh.userData.time = new Date().getTime();

    this.dataRef.push(Voxelizer.meshToData(mesh));

    // hide rolloverMesh to prevent placing multiple in same position
    this.rolloverMesh.visible = false;
  }

  screenshot() {

    const storage = this.props.storage.ref('images/' + this.world);

    if (this.state.exists !== World.FOUND) return;

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

  goToHistory(e: SyntheticEvent<HTMLInputElement>) {
    
    const index = +e.target.value;

    this.History.paused = true;

    this.History.goto(index);

    this.iter();
    this.update();
    this.draw();
  }

  toggleHistory(params: Object) {

    const viewingHistory = !this.state.viewingHistory;

    this.setState({ viewingHistory }, () => {
      viewingHistory ? this.viewHistory() : this.resetHistory();
      params.cb();
    });
  }

  viewHistory() {

    // remove all scene objects except groundPlane
    if (!this.History.inProgress()) {
      this.objects.all()
        .filter(obj => obj.name !== 'groundPlane')
        .forEach(obj => { this.scene.remove(obj) });
    }

    this.rolloverMesh.visible = false;

    this.History.replay(this.iter);
    
    this.update();
    this.draw();
  }

  resetHistory() {
    // remove all scene objects except groundPlane
    this.objects.all()
      .filter(obj => obj.name !== 'groundPlane')
      .forEach(obj => { this.scene.remove(obj) });

    this.History.reset();

    this.update();
    this.draw();
  }

  toggleHistoryPaused(startIndex: number) {

    this.History.paused = !this.History.paused;
    if (!this.History.paused) this.viewHistory();
    this.iter();
  }

  render() {

    if (this.state.exists !== World.FOUND) {
      let texts = {};
      texts[World.INDETERMINATE] = "Loading...";
      texts[World.NOT_FOUND] = "404 - Couldn't find world.";
      texts[World.BAD_PASSWORD] = "That is not the password to this world. Refresh the page if you would like to try again."
      return <div className="world__text">{texts[this.state.exists]}</div>;
    }

    let containerClass = "world world__container";
    if (this.state.action === "chooseColor") containerClass += " world__container--copy";
    if (this.state.viewingHistory) containerClass += " world__container--history";

    const worldHistoryStyle = {
      display: this.state.viewingHistory ? 'block' : 'none'
    };
    
    // TODO:
    // break out world history controls into separate component
    return (
      <div ref="container" className={containerClass}>
        <canvas ref="canvas" 
          onMouseDown={this.onMouseDown} 
          onMouseMove={this.onMouseMove}
          onMouseUp={this.onMouseUp} />
        <h1 className="world__name">{this.state.displayName}</h1>
        <div className="world__history__controls" style={worldHistoryStyle}>
          <label htmlFor="replaySpeed">Replay Speed:</label><br />
          <input 
            className="world__history__speed" 
            id="replaySpeed"
            type="range" min="20" max="500" 
            defaultValue={this.History.delay} 
            onChange={(e) => { this.History.delay = +e.target.value; }}/>
          <div 
            className={"world__history--playpause icon-" + (this.History.paused ? "play" : "pause")} 
            onClick={this.toggleHistoryPaused}></div>
        </div>
        <div className="world__history__container" style={worldHistoryStyle}>
          <input 
            className="world__history" 
            type="range" 
            min="0" 
            max={this.History.data.length} 
            step="1"
            style={worldHistoryStyle} 
            value={this.History.index} 
            onChange={this.goToHistory} />
        </div>
      </div>
    );
  }
};