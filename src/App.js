// @flow

import React, { Component } from 'react';
import * as firebase from 'firebase';

import CONFIG from './config';
import Admin from './components/Admin';
import Main from './components/Main';
import './css/App.css';

const app = firebase.initializeApp(CONFIG.firebase);
const db = app.database();

type Props = {};
type State = {};

class App extends Component<Props, State> {
  render() {
    return (
      <div className="app__container">
        <Admin />
        <Main db={db} />
      </div>
    );
  }
}

export default App;
