// @flow

import React, { Component } from 'react';
import * as firebase from 'firebase';
import { Link } from 'react-router-dom';

import World from './World';
import Manager from './Manager';
import MeshData from './scene/MeshData';

import '../css/Admin.css';

type Props = {
  db: firebase.database,
  manager: Manager
};

type State = {
  color: number,
  world: ?World
};

export default class Admin extends Component<Props, State> {

  chooseColor: Function;
  colorChange: Function;
  leaveWorld: Function;
  typeChange: Function;

  constructor() {

    super();

    this.state = {
      color: 0x666666,
      world: null
    };

    this.chooseColor = this.chooseColor.bind(this);
    this.colorChange = this.colorChange.bind(this);
    this.leaveWorld = this.leaveWorld.bind(this);
    this.typeChange = this.typeChange.bind(this);
  }

  componentDidMount() {

    this.props.manager.on('worldChange', world => {
      this.setState({ world });
    });

    this.props.manager.on('colorChosen', c => {
      this.refs.colorpicker.value = '#' + c.color.toString(16);
    });
  }

  leaveWorld() {
    this.setState({ world: null });
  }

  colorChange(e: Event) {
    const color = parseInt(this.refs.colorpicker.value.slice(1), 16);
    this.props.manager.trigger('colorChange', { color });
  }

  typeChange(e: Event) {
    const type = parseInt(this.refs.typeSelect.value, 10);
    this.props.manager.trigger('typeChange', { type });
  }

  chooseColor(e: Event) {
    this.props.manager.trigger('chooseColor');
  }

  render() {

    const colorpicker = (
      <div>
        <label htmlFor="admin__colorpicker" className="admin__label">Color</label>
        <input 
          className="admin__button admin__button--colorpicker" 
          id="admin__colorpicker"
          type="color" 
          ref="colorpicker" 
          defaultValue={'#' + this.state.color.toString(16)}
          onChange={this.colorChange} />
      </div>
    );

    const eyeDropper = (
      <button 
        className="admin__button admin__button--small" 
        onClick={this.chooseColor}>Choose Color</button>
    );

    const typeSelect = (
      <div>
        <label htmlFor="admin__select" className="admin__label">Type</label>
        <select 
          defaultValue={MeshData.VOXEL}
          onChange={this.typeChange} 
          ref="typeSelect" 
          className="admin__select" 
          id="admin_select">
          
          <option value={MeshData.VOXEL}>Voxel</option>
          <option value={MeshData.SPHERE}>Sphere</option>
        </select>
      </div>
    );

    const exists = this.state.world !== null;

    return (
      <div className="admin">
        <Link to="/" className="admin__button" onClick={this.leaveWorld}>Main</Link>
        {exists ? <hr /> : null}
        {exists ? colorpicker : null}
        {exists ? eyeDropper : null}
        {exists ? typeSelect : null}
      </div>
    );
  }
}