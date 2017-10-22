// @flow

import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import * as firebase from 'firebase';
import _ from 'lodash';

import adjs from '../data/adjs';
import nouns from '../data/nouns';

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

    const adj1 = _.sample(adjs).toLowerCase();
    const adj2 = _.sample(adjs).toLowerCase();
    const noun = _.sample(nouns).toLowerCase();
    
    const text = adj1 + "-" + adj2 + "-" + noun;

    this.ref.child(text).set(1);
  }

  render() {

    const zones = this.state.zones.map((zone, i) => {
      return (
      <li className="zones__zone" key={"zone-" + i}>
        <Link to={"/zone/" + zone}>{zone}</Link>
      </li>
      );
    });

    zones.push(<li key="addzone" className="zones__zone zones__zone--add" onClick={this.addZone.bind(this)}><span>ADD NEW +</span></li>);

    return (
      <div className="zones">
        <h2>Zones:</h2>
        <ul className="zones__ul">{zones}</ul>
      </div>
    );
  }
};