// @flow

import React, { Component } from 'react';
import * as firebase from 'firebase';
import _ from 'lodash';
import store from 'store';

import CONFIG from './config';
import Admin from './components/Admin';
import Main from './components/Main';
import Manager from './components/Manager';
import DirectoryCtr from './components/Directory';
import './css/App.css';

const THREE = require('three');
const uuid = THREE.Math.generateUUID;

const app = firebase.initializeApp(CONFIG.isDev ? CONFIG.firebaseDev : CONFIG.firebase);
const db = app.database();
const storage = firebase.storage(app);

const Directory = new DirectoryCtr();
const mgr = new Manager();

type Props = {};
type State = {};

class App extends Component<Props, State> {

  constructor() {

    super();

    // at top level, set a user ID if there isn't one
    let id = store.get('user.id');
    
    if (_.isNil(id)) {
      id = uuid();
      store.set('user.id', id);
    }

    // now store that id in the manager
    mgr.set('user', id);

    const updateDirectory = child => {
      const id = child.key;
      const name = child.val();
      Directory.set(id, name);
      mgr.trigger('updateDirectory');
    };

    db.ref('users').on('child_added', updateDirectory);
    db.ref('users').on('child_changed', updateDirectory);
    // mgr.on('updateDirectory', updateDirectory);
  }

  render() {
    return (
      <div className="app__container">
        <Admin db={db} manager={mgr} directory={Directory} />
        <Main db={db} manager={mgr} storage={storage} />
      </div>
    );
  }
}

export default App;
