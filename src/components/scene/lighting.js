import _ from 'lodash';

const THREE = require('three');

export default function lighting(Scene) {

    // SKYDOME

    let vertexShader = require('./shaders/vertexShader.js'),
        fragmentShader = require('./shaders/fragmentShader.js');

    let uniforms = {
        topColor: 	 { type: "c", value: new THREE.Color( '#07f' ) },
        bottomColor: { type: "c", value: new THREE.Color( '#ccc' ) },
        offset:		 { type: "f", value: 400 },
        exponent:	 { type: "f", value: 0.6 }
    };

    let skyGeo = new THREE.SphereGeometry( 20000, 32, 15 ),
        skyMat = new THREE.ShaderMaterial({
            uniforms,
            vertexShader,
            fragmentShader,
            side: THREE.BackSide
        });

    let sky = new THREE.Mesh( skyGeo, skyMat );
    Scene.add( sky );

    let Light = new THREE.DirectionalLight(0xffffff);
    Light.position.set(-500, 2500, 3400);
    Scene.add(Light);

    let Light2 = new THREE.AmbientLight(0xffffff, 0.75);
    Scene.add(Light2);
};