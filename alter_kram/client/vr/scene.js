class Scene {

    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.animate((function () {
            this.renderer.render(this.scene, this.camera);
        }).bind(this));


        this.camera = new THREE.PerspectiveCamera(60, 1, .1, 1000);
        this.scene.add(this.camera);

        this.cameraLight = new THREE.PointLight(0xffffff);
        this.cameraLight.position.set(1, 1, 2);
        this.camera.add(this.cameraLight);

        this.ambientLight = new THREE.AmbientLight(0x444444);
        this.scene.add(this.ambientLight);

        window.addEventListener('resize', this.resize.bind(this));
    }

    /**
     * Show a grid around the camera for visualizing the environment
     */
    addDebugRoom() {
        this.debugRoom = new THREE.Mesh(
            new THREE.BoxBufferGeometry(10, 10, 10, 8, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0x008000, wireframe: true })
        );
        this.scene.add(this.debugRoom);
    }

    /**
     * Add controls for mouse and WASD movement.
     * Click on canvas triggers pointer lock.
     * Need to include firstpersoncontrols.js
     */
    addFirstPersonControls() {
        this.firstPersonControls = new FirstPersonControls(this.camera, this.renderer.domElement);
        this.scene.add(this.firstPersonControls.getObject());
        this.renderer.domElement.addEventListener('click', (function () { this.firstPersonControls.lock(); }).bind(this));
    }

    addDemoParticles() {
        var light = new THREE.PointLight(0xffffff);
        light.position.set(0, 250, 0);
        this.scene.add(light);

        //var cubeGeometry = new THREE.CubeGeometry(1, 1, 1, 20, 20, 20);

        var cubeGeometry = new THREE.Geometry();
        var c = 20;
        var f = 1 / c;
        for (var z = 0; z < c; z++) {
            for (var y = 0; y < c; y++) {
                for (var x = 0; x < c; x++) {
                    cubeGeometry.vertices.push(new THREE.Vector3(x * f, y * f, z * f));
                }
            }
        }
        var vsc = document.getElementById('vertexshader').textContent;
        var fsc = document.getElementById('fragmentshader').textContent;
        var shaderMaterial = new THREE.ShaderMaterial(
            {
                uniforms: {},
                vertexShader: vsc,
                fragmentShader: fsc,
                transparent: true, alphaTest: 0.5,  // if having transparency issues, try including: alphaTest: 0.5, 
                // blending: THREE.AdditiveBlending, depthTest: false,
                // I guess you don't need to do a depth test if you are alpha blending?
                // 
            });

        var particleCube = new THREE.ParticleSystem(cubeGeometry, shaderMaterial);
        particleCube.position.set(-.5, -.5, -1);
        particleCube.dynamic = true;
        particleCube.sortParticles = true;
        this.scene.add(particleCube);

    }

    addVRControls() {
        this.vrControls = new VRControls(this.renderer);
        this.renderer.domElement.addEventListener('click', (function () { this.vrControls.enterVR(); }).bind(this));
        this.renderer.vr.enabled = true;
    }

    /**
     * Us this method to attach the scene to the DOM. This makes sure that the canvas is
     * initially resized to the parent element's size.
     */
    attachTo(parentDomElement) {
        parentDomElement.appendChild(this.renderer.domElement);
        this.resize();
    }

    resize() {
        const width = this.renderer.domElement.parentNode.clientWidth;
        const height = this.renderer.domElement.parentNode.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

}


/*
var clock = new THREE.Clock();

var container;
var camera, scene, ray, raycaster, renderer;
var gamepad;

var room;

var INTERSECTED;

init();
animate();

function init() {

    container = document.createElement('div');
    document.body.appendChild(container);

    var info = document.createElement('div');
    info.style.position = 'absolute';
    info.style.top = '10px';
    info.style.width = '100%';
    info.style.textAlign = 'center';
    info.innerHTML = '<a href="https://threejs.org" target="_blank" rel="noopener">three.js</a> webvr - daydream';
    container.appendChild(info);

    var background = new THREE.CubeTextureLoader()
        .setPath('textures/cube/MilkyWay/')
        .load(['dark-s_px.jpg', 'dark-s_nx.jpg', 'dark-s_py.jpg', 'dark-s_ny.jpg', 'dark-s_pz.jpg', 'dark-s_nz.jpg']);
    background.format = THREE.RGBFormat;

    scene = new THREE.Scene();
    scene.background = background;

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 10);

    room = new THREE.Mesh(
        new THREE.BoxGeometry(6, 6, 6, 8, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x808080, wireframe: true })
    );
    scene.add(room);

    scene.add(new THREE.HemisphereLight(0x606060, 0x404040));

    var light = new THREE.DirectionalLight(0xffffff);
    light.position.set(1, 1, 1).normalize();
    scene.add(light);

    var geometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);

    for (var i = 0; i < 200; i++) {

        var object = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: Math.random() * 0xffffff }));

        object.position.x = Math.random() * 4 - 2;
        object.position.y = Math.random() * 4 - 2;
        object.position.z = Math.random() * 4 - 2;

        object.rotation.x = Math.random() * 2 * Math.PI;
        object.rotation.y = Math.random() * 2 * Math.PI;
        object.rotation.z = Math.random() * 2 * Math.PI;

        object.scale.x = Math.random() + 0.5;
        object.scale.y = Math.random() + 0.5;
        object.scale.z = Math.random() + 0.5;

        object.userData.velocity = new THREE.Vector3();
        object.userData.velocity.x = Math.random() * 0.01 - 0.005;
        object.userData.velocity.y = Math.random() * 0.01 - 0.005;
        object.userData.velocity.z = Math.random() * 0.01 - 0.005;

        room.add(object);

    }

    //

    raycaster = new THREE.Raycaster();

    //

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    renderer.vr.enabled = true;

    //

    WEBVR.getVRDisplay(function (device) {

        renderer.vr.setDevice(device);
        document.body.appendChild(WEBVR.getButton(device, renderer.domElement));

    });

    //

    gamepad = new THREE.DaydreamController();
    gamepad.position.set(0.25, - 0.5, 0);
    scene.add(gamepad);

    //

    var gamepadHelper = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ linewidth: 4 }));
    gamepadHelper.geometry.addAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, - 10], 3));
    gamepad.add(gamepadHelper);

    renderer.domElement.addEventListener('click', function (event) {

        gamepadHelper.material.color.setHex(Math.random() * 0xffffff);

    });

    //

    window.addEventListener('resize', onWindowResize, false);

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

//

function animate() {

    renderer.animate(function() {
        gamepad.update();
        renderer.render(scene, camera);
    });

}

function render() {

    gamepad.update();
    renderer.render(scene, camera);
    return;

    var delta = clock.getDelta() * 60;

    // find intersections

    raycaster.ray.origin.copy(gamepad.position);
    raycaster.ray.direction.set(0, 0, - 1).applyQuaternion(gamepad.quaternion);

    var intersects = raycaster.intersectObjects(room.children);

    if (intersects.length > 0) {

        if (INTERSECTED != intersects[0].object) {

            if (INTERSECTED) INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex);

            INTERSECTED = intersects[0].object;
            INTERSECTED.currentHex = INTERSECTED.material.emissive.getHex();
            INTERSECTED.material.emissive.setHex(0xff0000);

        }

    } else {

        if (INTERSECTED) INTERSECTED.material.emissive.setHex(INTERSECTED.currentHex);

        INTERSECTED = undefined;

    }

    // keep cubes inside room

    for (var i = 0; i < room.children.length; i++) {

        var cube = room.children[i];

        cube.position.add(cube.userData.velocity);

        if (cube.position.x < - 3 || cube.position.x > 3) {

            cube.position.x = THREE.Math.clamp(cube.position.x, - 3, 3);
            cube.userData.velocity.x = - cube.userData.velocity.x;

        }

        if (cube.position.y < - 3 || cube.position.y > 3) {

            cube.position.y = THREE.Math.clamp(cube.position.y, - 3, 3);
            cube.userData.velocity.y = - cube.userData.velocity.y;

        }

        if (cube.position.z < - 3 || cube.position.z > 3) {

            cube.position.z = THREE.Math.clamp(cube.position.z, - 3, 3);
            cube.userData.velocity.z = - cube.userData.velocity.z;

        }

        cube.rotation.x += cube.userData.velocity.x * 2 * delta;
        cube.rotation.y += cube.userData.velocity.y * 2 * delta;
        cube.rotation.z += cube.userData.velocity.z * 2 * delta;

    }

    renderer.render(scene, camera);

}
*/