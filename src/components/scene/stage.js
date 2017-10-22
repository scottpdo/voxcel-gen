// @flow

import Zone from '../Zone';
import lighting from './lighting';

const THREE = require('three');

export default function stage(zone: Zone) {

	const geo = new THREE.PlaneGeometry(100000, 100000);
	const mat = new THREE.MeshLambertMaterial({
		color: 0x888888
	});

	let groundPlane = new THREE.Mesh(geo, mat);
	groundPlane.rotation.x -= Math.PI / 2;

	zone.scene.add(groundPlane);
	zone.objects.push(groundPlane);

	lighting(zone.scene);
};