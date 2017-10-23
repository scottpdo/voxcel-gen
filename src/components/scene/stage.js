// @flow

import World from '../World';
import lighting from './lighting';

const THREE = require('three');

export default function stage(world: World) {

	const geo = new THREE.PlaneGeometry(100000, 100000);
	const mat = new THREE.MeshLambertMaterial({
		color: 0x888888
	});

	let groundPlane = new THREE.Mesh(geo, mat);
	groundPlane.rotation.x -= Math.PI / 2;

	world.scene.add(groundPlane);
	world.objects.push(groundPlane);

	lighting(world.scene);
};