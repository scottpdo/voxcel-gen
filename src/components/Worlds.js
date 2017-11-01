// @flow

import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import * as firebase from 'firebase';
import _ from 'lodash';
import slugify from 'slugify';

import '../css/Worlds.css';

type Props = {
  db: firebase.database,
  storage: firebase.storage
};

type Pair = {
  name: string,
  screenshot: ?string
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
        screenshot: null
      });
    });

    worlds.forEach(world => {

      const ref = this.props.storage.ref('images/' + world.name);

      ref.getDownloadURL().then(url => {
        world.screenshot = url;
        this.setState({ worlds });
      }).catch(err => {
        this.setState({ worlds });
      });
    });
  }

  componentDidMount() {
    this.dataRef = this.props.db.ref('worldIndex');
    this.dataRef.on('value', this.showWorlds);
  }

  componentWillUnMount() {
    this.dataRef.off();
  }

  addWorld(message: string) {

    const name = prompt(message);

    if (name === "" || _.isNil(name)) return;

    const slug = slugify(name, {
      replacement: '-',    // replace spaces with replacement 
      remove: /[$*_+~.()'"!\-:@]/g,        // regex to remove characters 
      lower: true          // result in lower case 
    });

    if (slug === "") return;

    this.dataRef.child(slug).once('value', snapshot => {
      
      const val = snapshot.val();

      // if name not taken, add it to the worlds
      if (_.isNil(val)) {
        this.dataRef.child(slug).set(name);
      // otherwise, ask for a new name
      } else {
        this.addWorld("There is already a world with that name. Try another!");
      }
    });
  }

  render() {

    const worlds = this.state.worlds.map((world, i) => {
      
      const style = {};
      if ( world.screenshot !== null ) {
        const img = world.screenshot || "";
        style.backgroundImage = "url(" + img + ")";
      }

      return (
      <li className="worlds__world" key={"world-" + i}>
        <Link to={"/world/" + world.name}>
          <div className="worlds__img" style={style}></div>
          <span>{world.name}</span>
        </Link>
      </li>
      );
    });

    return (
      <div className="worlds">
        <h2>
          Worlds: (<span onClick={this.addWorld.bind(this, "What is your world's name?")} className="worlds__addnew">Add New</span>)
          <Link to="/instructions" className="worlds__instructions">Instructions</Link>
        </h2>
        <ul className="worlds__ul">{worlds}</ul>
      </div>
    );
  }
};