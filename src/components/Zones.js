// @flow

import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import * as firebase from 'firebase';

import '../css/Zones.css';

type Props = {
  db: firebase.database
};

type State = {
  zones: Array<string>
};

export default class Zones extends Component<Props, State> {

  ref: firebase.ref;

  constructor() {
    
    super();
    
    this.state = {
      zones: []
    };
  }

  componentDidMount() {
    
    this.ref = this.props.db.ref('zoneIndex');

    this.ref.once('value', snapshot => {
      snapshot.forEach(child => {
        const zone = child.key;
        this.setState({
          zones: this.state.zones.concat(zone)
        });
      });
    });
  }

  addZone() {

    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  
    for (var i = 0; i < 12; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    this.ref.push(text);
  }

  render() {

    const zones = this.state.zones.map((zone, i) => {
      return (
      <li className="zones__zone" key={"zone-" + i}>
        <Link to={"/zone/" + zone}>{zone}</Link>
      </li>);
    });

    zones.push(<li className="zones__zone zones__zone--add" onClick={this.addZone.bind(this)}>ADD NEW +</li>);

    return <ul className="zones">{zones}</ul>;
  }
};