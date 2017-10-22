// @flow

import React, { Component } from 'react';
import * as firebase from 'firebase';
import { Link, Route } from 'react-router-dom';

import Zone from './Zone';
import Manager from './Manager';

import '../css/Admin.css';

type Props = {
  db: firebase.database,
  manager: Manager
};

type State = {
  zone: ?Zone
};

export default class Admin extends Component<Props, State> {

  colorChange: Function;
  leaveZone: Function;

  constructor() {

    super();

    this.state = {
      zone: null
    };

    this.colorChange = this.colorChange.bind(this);
    this.leaveZone = this.leaveZone.bind(this);
  }

  componentDidMount() {
    this.props.manager.on('zoneChange', zone => {
      this.setState({ zone });
    });
  }

  leaveZone() {
    this.setState({ zone: null });
  }

  colorChange(e: Event) {
    const color = parseInt(this.refs.colorpicker.value.slice(1), 16);
    this.props.manager.trigger('colorChange', { color });
  }

  render() {

    const colorpicker = <input 
      className="admin__button" 
      type="color" 
      ref="colorpicker" 
      onInput={this.colorChange} />;

    return (
      <div className="admin">
        <Link to="/" className="admin__button" onClick={this.leaveZone}>Main</Link>
        {this.state.zone !== null ? colorpicker : null}
      </div>
    );
  }
}