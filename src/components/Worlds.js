// @flow

import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import * as firebase from 'firebase';
import _ from 'lodash';

import adjs from '../data/adjs';
import nouns from '../data/nouns';

import '../css/Worlds.css';

type Props = {
  db: firebase.database
};

type State = {
  worlds: Array<string>
};

export default class Worlds extends Component<Props, State> {

  ref: firebase.ref;

  constructor() {
    
    super();
    
    this.state = {
      worlds: []
    };
  }

  componentDidMount() {
    
    this.ref = this.props.db.ref('worldIndex');

    this.ref.on('child_added', child => {
      const world = child.key;
      this.setState({
        worlds: this.state.worlds.concat(world)
      });
    });
  }

  addWorld() {

    const adj1 = _.sample(adjs).toLowerCase();
    const adj2 = _.sample(adjs).toLowerCase();
    const noun = _.sample(nouns).toLowerCase();
    
    const text = adj1 + "-" + adj2 + "-" + noun;

    this.ref.child(text).set(1);
  }

  render() {

    const worlds = this.state.worlds.map((world, i) => {
      return (
      <li className="worlds__world" key={"world-" + i}>
        <Link to={"/world/" + world}>{world}</Link>
      </li>
      );
    });

    worlds.push(<li key="addworld" className="worlds__world worlds__world--add" onClick={this.addWorld.bind(this)}><span>ADD NEW +</span></li>);

    return (
      <div className="worlds">
        <h2>Worlds:</h2>
        <ul className="worlds__ul">{worlds}</ul>
      </div>
    );
  }
};