// @flow

import React, { Component } from 'react';
import * as firebase from 'firebase';
import { Link } from 'react-router-dom';

import Chat from './Chat';
import World from './World';
import Manager from './Manager';
import MeshData from './scene/MeshData';

import '../css/Admin.css';

type Props = {
  db: firebase.database,
  directory: Object,
  manager: Manager
};

type State = {
  color: number,
  world: ?World
};

export default class Admin extends Component<Props, State> {

  chooseColor: Function;
  colorChange: Function;
  displayName: Function;
  leaveWorld: Function;
  typeChange: Function;
  updateName: Function;
  viewByPlayer: Function;
  viewHistory: Function;

  constructor() {

    super();

    this.state = {
      color: 0x666666,
      displayName: "",
      world: null
    };

    this.chooseColor = this.chooseColor.bind(this);
    this.colorChange = this.colorChange.bind(this);
    this.displayName = this.displayName.bind(this);
    this.leaveWorld = this.leaveWorld.bind(this);
    this.typeChange = this.typeChange.bind(this);
    this.updateName = this.updateName.bind(this);
    this.viewByPlayer = this.viewByPlayer.bind(this);
    this.viewHistory = this.viewHistory.bind(this);
  }

  componentDidMount() {

    this.props.manager.on('worldChange', world => {
      this.setState({ world });
    }).on('colorChosen', c => {
      this.refs.colorpicker.value = '#' + c.color.toString(16);
    }).on('updateDirectory', this.displayName);
  }

  leaveWorld() {
    this.setState({ world: null });
  }
  
  displayName() {
    
    const userId = this.props.manager.get('user');
    const directory = this.props.directory;

    this.refs.displayName.value = directory.get(userId);
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

  updateName() {

    const name = this.refs.displayName.value;
    const id = this.props.manager.get('user');

    this.props.db.ref('users/').child(id).set(name);
  }

  viewByPlayer(e: Event) {
    this.props.manager.trigger('viewByPlayer');
  }

  viewHistory(e: Event) {
    this.props.manager.trigger('viewHistory');
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

    const viewHistory = (
      <button className="admin__button admin__button--small" onClick={this.viewHistory}>View History</button>
    );

    const viewByPlayer = (
      <div>
        <label className="admin__label">
          View By Player
          <input type="checkbox" className="admin__checkbox" onChange={this.viewByPlayer} />
        </label>
      </div>
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

    const worldName = exists ? this.state.world.world : "";

    return (
      <div className="admin">
        <Link to="/" className="admin__button" onClick={this.leaveWorld}>Main</Link>
        <label className="admin__label" htmlFor="display-name">Your name:</label>
        <input 
          className="admin__input" 
          id="display-name"
          ref="displayName" 
          onKeyUp={this.updateName} />
        {exists ? <hr /> : null}
        {exists ? colorpicker : null}
        {exists ? eyeDropper : null}
        {exists ? typeSelect : null}
        {exists ? viewHistory : null}
        {exists ? viewByPlayer : null}
        {exists ? <Chat db={this.props.db} world={worldName} directory={this.props.directory} /> : null}
      </div>
    );
  }
}