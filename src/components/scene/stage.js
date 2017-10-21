import lighting from './lighting';

const THREE = require('three');

export default function stage(Scene) {

	let groundPlane = new THREE.Mesh(
		new THREE.PlaneGeometry(100000, 100000),
		new THREE.MeshLambertMaterial({
			color: '#888'
		})
	);
	groundPlane.receiveShadow = true;
	groundPlane.position.y = -2;
	groundPlane.rotation.x -= Math.PI / 2;
	Scene.add(groundPlane);

	let gridPlane = new THREE.Mesh(
		new THREE.PlaneGeometry(100, 100),
		new THREE.MeshLambertMaterial({
			color: 0xcccccc
		})
	);
	gridPlane.receiveShadow = true;
	gridPlane.rotation.x -= Math.PI / 2;
	Scene.add(gridPlane);

	let Lighting = lighting(Scene);
	Lighting.setTime(0.333);

	Scene.setTime = Lighting.setTime;
	Scene.getTime = Lighting.getTime;

	return Scene;

};