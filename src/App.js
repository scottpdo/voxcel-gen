// @flow

import React, { Component } from 'react';
import * as firebase from 'firebase';

import CONFIG from './config';
import Admin from './components/Admin';
import Main from './components/Main';
import Manager from './components/Manager';
import './css/App.css';

const app = firebase.initializeApp(CONFIG.firebase);
const db = app.database();

const mgr = new Manager();

type Props = {};
type State = {};

class App extends Component<Props, State> {

  render() {
    return (
      <div className="app__container">
        <Admin db={db} manager={mgr} />
        <Main db={db} manager={mgr} />
      </div>
    );
  }
}

export default App;
