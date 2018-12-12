/**
 * Based on PointerLockControls from https://github.com/mrdoob/three.js/blob/master/examples/js/controls/PointerLockControls.js
 * @author mrdoob / http://mrdoob.com/
 * @author Mugen87 / https://github.com/Mugen87
 */
class FirstPersonControls {


	constructor(camera, domElement, rotationSpeed) {

		this.domElement = domElement;
		this.isLocked = false;

		this.pitchObject = new THREE.Object3D();
		this.pitchObject.add(camera);

		this.yawObject = new THREE.Object3D();
		this.yawObject.add(this.pitchObject);

		this.PI_2 = Math.PI / 2;

		this.rotationSpeed = rotationSpeed || 0.002;

		camera.rotation.set(0, 0, 0);

		document.addEventListener('pointerlockchange', this.onPointerlockChange.bind(this));
		document.addEventListener('mousemove', this.onMouseMove.bind(this));

	}

	getObject() {
		return this.yawObject;
	}

	lock() {
		this.domElement.requestPointerLock();
	}

	onMouseMove(event) {
		if (!this.isLocked) return;
		const movementX = event.movementX;
		const movementY = event.movementY;
		this.yawObject.rotation.y -= movementX * this.rotationSpeed;
		this.pitchObject.rotation.x -= movementY * this.rotationSpeed;
		this.pitchObject.rotation.x = Math.max(- this.PI_2, Math.min(this.PI_2, this.pitchObject.rotation.x));
	}

	onPointerlockChange() {
		this.isLocked = (document.pointerLockElement === this.domElement);
	}

}
