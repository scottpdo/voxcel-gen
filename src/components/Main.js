// @flow

import React, { Component } from 'react';
import * as firebase from 'firebase';
import { Route } from 'react-router-dom';

import Worlds from './Worlds';
import World from './World';
import Manager from './Manager';
import '../css/Main.css';

type Props = {
	db: firebase.database,
	manager: Manager,
	storage: firebase.storage
};

type State = {};

export default class Main extends Component<Props, State> {

	worlds: Array<String>;

	constructor() {

		super();

		this.worlds = [];

	}

	render() {
		
		return (
			<div className="main">
				<Route exact path="/" render={() => <Worlds db={this.props.db} storage={this.props.storage} />} />
				<Route path="/world/:world" render={(props) => <World db={this.props.db} manager={this.props.manager} storage={this.props.storage} {...props} />} />
			</div>
		);
	}
};