// @flow

import React, { Component } from 'react';
import * as firebase from 'firebase';
import _ from 'lodash';

import stage from './scene/stage';
import _Camera from './scene/Camera';

const THREE = require('three');

type Props = {
  db: firebase.database,
  match: {
    params: {
      zone: string
    }
  }
};

type State = {
  exists: number
}

export default class Zone extends Component<Props, State> {

  camera: THREE.PerspectiveCamera;
  canvas: HTMLCanvasElement;
  init: Function;
  mouse: THREE.Vector2;
  mouseDownCoords: THREE.Vector2;
  onResize: Function;
  raycaster: THREE.Raycaster;
  ref: firebase.ref;
  renderer: THREE.WebGlRenderer;
  scene: THREE.Scene;
  zone: string;

  constructor() {
    super();
  
    this.state = {
      exists: 0, // indeterminate... -1 = does not exist, 1 = exists
    };

    this.init = this.init.bind(this);
    this.onResize = this.onResize.bind(this);
  }

  componentDidMount() {

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
  }

  init() {

    // set up reference to this zone and canvas
    this.ref = this.props.db.ref('zones/' + this.zone);
    this.canvas = this.refs.canvas;
    
    this.scene = stage(new THREE.Scene());

    this.renderer = new THREE.WebGLRenderer({
			antialias: true,
      canvas: this.refs.canvas,
    });
    
		this.renderer.shadowMap.enabled = true;
		this.renderer.setPixelRatio( window.devicePixelRatio );
    
    this.camera = _Camera(this.scene, this.renderer);
    this.raycaster = new THREE.Raycaster(),
    this.mouse = new THREE.Vector2(-2, -2), // mouse off canvas by default
    this.mouseDownCoords = new THREE.Vector2(-2, -2);

    this.onResize();

		let _render = () => {
      
      this.renderer.render(this.scene, this.camera);
      this.raycaster.setFromCamera( this.mouse, this.camera );

      window.requestAnimationFrame(_render);
    };    

    _render();
    
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