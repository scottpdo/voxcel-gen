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

type Pair = {
  name: string,
  screenshot: string
};

type State = {
  worlds: Array<Pair>
};

export default class Worlds extends Component<Props, State> {

  dataRef: firebase.ref;
  showWorlds: Function;

  constructor() {
    
    super();
    
    this.state = {
      worlds: []
    };

    this.showWorlds = this.showWorlds.bind(this);
  }

  showWorlds(snapshot: firebase.snapshot) {
    const worlds = [];
    snapshot.forEach(child => {
      worlds.push({
        name: child.key,
        screenshot: child.val()
      });
    });
    this.setState({ worlds });
  }

  componentDidMount() {
    this.dataRef = this.props.db.ref('worldIndex');
    this.dataRef.on('value', this.showWorlds);
  }

  componentWillUnMount() {
    this.dataRef.off();
  }

  addWorld() {

    const adj1 = _.sample(adjs).toLowerCase();
    const adj2 = _.sample(adjs).toLowerCase();
    const noun = _.sample(nouns).toLowerCase();
    
    const text = adj1 + "-" + adj2 + "-" + noun;

    this.dataRef.child(text).set(1);
  }

  render() {

    const worlds = this.state.worlds.map((world, i) => {
      return (
      <li className="worlds__world" key={"world-" + i}>
        <img src={world.screenshot} />
        <Link to={"/world/" + world.name}>{world.name}</Link>
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