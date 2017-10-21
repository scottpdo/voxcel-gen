// @flow

import React, { Component } from 'react';
import * as firebase from 'firebase';
import { Route } from 'react-router-dom';

import Zones from './Zones';
import Zone from './Zone';
import '../css/Main.css';

type Props = {
	db: firebase.database
};

type State = {};

export default class Main extends Component<Props, State> {

	zones: Array<String>;

	constructor() {

		super();

		this.zones = [];

	}

	render() {
		
		return (
			<div className="main">
				<Route exact path="/" render={() => <Zones db={this.props.db} />} />
				<Route path="/zone/:zone" render={(props) => <Zone db={this.props.db} {...props} />} />
			</div>
		);
	}
};