import OrbitControls from 'three-orbit-controls';

const THREE = require('three');

export default function Camera(Scene, Renderer) {

	let cam = new THREE.PerspectiveCamera( 
		45, 
		Renderer.domElement.width / Renderer.domElement.height, 
		0.1, 
		100000
  );

	cam.position.set(-700, 350, 1100);

	let ThreeOrbitControls = OrbitControls(THREE);
	let controls = new ThreeOrbitControls( cam, Renderer.domElement );
	controls.mouseButtons = {
    ORBIT: THREE.MOUSE.LEFT,
    PAN: THREE.MOUSE.RIGHT
  };

  controls.maxPolarAngle = Math.PI / 2;
  controls.maxDistance = 8000;
  controls.damping = 0.5;

  Scene.add(cam);

	return cam;
};