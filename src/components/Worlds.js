// @flow

import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import * as firebase from 'firebase';
import _ from 'lodash';
import slugify from 'slugify';
import md5 from 'md5';

import Manager from './Manager';
import '../css/Worlds.css';

type Props = {
  db: firebase.database,
  storage: firebase.storage,
  manager: Manager
};

type WorldData = {
  name: string,
  screenshot: ?string,
  slug: string,
  password: boolean,
  user: ?string
};

type State = {
  display: number,
  isShiftDown: boolean,
  worlds: Array<WorldData>
};

export default class Worlds extends Component<Props, State> {

  dataRef: firebase.ref;
  destroyWorld: Function;
  onKeyDown: Function;
  onKeyUp: Function;
  setDisplay: Function;
  showWorlds: Function;

  static ROWS = 0;
  static BLOCKS = 1;
  static SHIFT = 16;

  constructor() {
    
    super();
    
    this.state = {
      display: Worlds.BLOCKS,
      isShiftDown: false,
      worlds: []
    };

    this.destroyWorld = this.destroyWorld.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.setDisplay = this.setDisplay.bind(this);
    this.showWorlds = this.showWorlds.bind(this);
  }

  destroyWorld(world: WorldData, e: SyntheticEvent<HTMLElement>) {
    e.nativeEvent.stopImmediatePropagation();
    e.preventDefault();
    
    const really = window.confirm("Destroying a world is irreversible. Are you absolutely sure you want to destroy this world?");
    if (!really) return;
    
    // remove from worldIndex
    this.dataRef.child(world.slug).remove();

    // remove world data and chat data
    this.props.db.ref('worlds/' + world.slug).remove();
    this.props.db.ref('chats/' + world.slug).remove();
  }

  setDisplay(display: number) {
    this.setState({ display });
  }

  showWorlds(snapshot: firebase.snapshot) {

    const worlds = [];

    snapshot.forEach(child => {

      const value = child.val();
      const slug = child.key;

      const name = _.isString(value) ? value : value.name;
      const password = _.isString(value) ? false : _.isString(value.password) ? true : false;
      const user = _.isString(value) ? null : _.isString(value.user) ? value.user : null;

      worlds.push({
        name,
        screenshot: null,
        password,
        slug,
        user
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
      remove: /[$*_+~.()'"!\-/:@]/g,        // regex to remove characters 
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
        this.dataRef.child(slug).set({ 
          name, 
          password,
          user: this.props.manager.get('user')
        });
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

      const del = <span className="worlds__delete" onClick={this.destroyWorld.bind(this, world)}>✖</span>;

      return (
        <li className="worlds__world" key={"world-" + i}>
          <Link to={"/world/" + world.slug}>
            <div className="worlds__img" style={style}></div>
            <span>{world.name + (world.password ? "*" : "") || "(Unnamed)"}</span>
            {world.user === this.props.manager.get('user') ? del : null}
          </Link>
        </li>
      );
    });

    let addNewText = "Add New";
    if (this.state.isShiftDown) addNewText += " [with Password]";

    const displayClass = 'worlds__ul--' + (this.state.display === Worlds.ROWS ? 'rows' : 'blocks');

    return (
      <div className="worlds">
        <h2>
          Worlds: (<span onClick={this.addWorld.bind(this, "What is your world's name?")} className="worlds__addnew">{addNewText}</span>)
          <Link to="/instructions" className="worlds__instructions">Instructions</Link>
        </h2>

        <div className="worlds__options">
          <span className="icon-rows" onClick={this.setDisplay.bind(this, Worlds.ROWS)}></span>
          <span className="icon-blocks" onClick={this.setDisplay.bind(this, Worlds.BLOCKS)}></span>
        </div>

        <ul className={"worlds__ul " + displayClass}>{worlds}</ul>
      </div>
    );
  }
};