// @flow

import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import * as firebase from 'firebase';
import _ from 'lodash';
import slugify from 'slugify';
import md5 from 'md5';

import '../css/Worlds.css';

type Props = {
  db: firebase.database,
  storage: firebase.storage
};

type Pair = {
  name: string,
  screenshot: ?string,
  slug: string
};

type State = {
  isShiftDown: boolean,
  worlds: Array<Pair>
};

export default class Worlds extends Component<Props, State> {

  dataRef: firebase.ref;
  onKeyDown: Function;
  onKeyUp: Function;
  showWorlds: Function;

  static SHIFT = 16;

  constructor() {
    
    super();
    
    this.state = {
      isShiftDown: false,
      worlds: []
    };

    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.showWorlds = this.showWorlds.bind(this);
  }

  showWorlds(snapshot: firebase.snapshot) {

    const worlds = [];

    snapshot.forEach(child => {

      const value = child.val();
      const slug = child.key;
      const name = _.isString(value) ? value : value.name;

      worlds.push({
        name,
        screenshot: null,
        slug
      });
    });

    worlds.forEach(world => {

      const ref = this.props.storage.ref('images/' + world.slug);

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

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  componentWillUnMount() {
    this.dataRef.off();
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  onKeyDown(e: KeyboardEvent) {
    if (e.keyCode === Worlds.SHIFT) this.setState({ isShiftDown: true });
  }

  onKeyUp(e: KeyboardEvent) {
    if (e.keyCode === Worlds.SHIFT) this.setState({ isShiftDown: false });
  }

  addWorld(message: string, e: MouseEvent) {

    const name = prompt(message);
    let password = null;

    if (name === "" || _.isNil(name)) return;

    const slug = slugify(name, {
      replacement: '-',    // replace spaces with replacement 
      remove: /[$*_+~.()'"!\-:@]/g,        // regex to remove characters 
      lower: true          // result in lower case 
    });

    if (slug === "") return;

    if (e.shiftKey) {
      password = prompt("What is the password to your world?");
      
      if (password === "" || _.isNil(password)) 
        return alert("That's not a valid password. Please try again.");
      
      password = md5(password);
    }

    this.dataRef.child(slug).once('value', snapshot => {
      
      const val = snapshot.val();

      // if name not taken, add it to the worlds and redirect
      if (_.isNil(val)) {
        this.dataRef.child(slug).set({ name, password });
        window.location.href = '/world/' + slug;
      // otherwise, ask for a new name
      } else {
        this.addWorld("There is already a world with that name. Try another!", e);
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
          <Link to={"/world/" + world.slug}>
            <div className="worlds__img" style={style}></div>
            <span>{world.name || "(Unnamed)"}</span>
          </Link>
        </li>
      );
    });

    let addNewText = "Add New";
    if (this.state.isShiftDown)
      addNewText += " [with Password]";

    return (
      <div className="worlds">
        <h2>
          Worlds: (<span onClick={this.addWorld.bind(this, "What is your world's name?")} className="worlds__addnew">{addNewText}</span>)
          <Link to="/instructions" className="worlds__instructions">Instructions</Link>
        </h2>
        <ul className="worlds__ul">{worlds}</ul>
      </div>
    );
  }
};