/**
 * https://gist.github.com/videlais/0a3cb2ca815422ab84442ce6c3c08f83
 *  * FirstPersonControls
 * @author videlais / videlais.com
 *
 * Based heavily on PointerLockControls from
 * https://github.com/mrdoob/three.js/blob/master/examples/js/controls/PointerLockControls.js
 * @author mrdoob / http://mrdoob.com/
 */

THREE.FirstPersonControls = function ( camera ) {

	var scope = this;

	camera.rotation.set( 0, 0, 0 );

	var pitchObject = new THREE.Object3D();
	pitchObject.add( camera );

	var yawObject = new THREE.Object3D();
	yawObject.position.y = 10;
	yawObject.add( pitchObject );

	var PI_2 = Math.PI / 2;

	var onMouseMove = function ( event ) {

		var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
		var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

		yawObject.rotation.y -= movementX * 0.002;
		pitchObject.rotation.x -= movementY * 0.002;

		pitchObject.rotation.x = Math.max( - PI_2, Math.min( PI_2, pitchObject.rotation.x ) );

	};

	this.enabled = false;

	this.getObject = function () {

		return yawObject;

	};

	this.moveForward = false;
	this.moveBackward = false;
	this.moveLeft = false;
	this.moveRight = false;

	var onKeyDown = function ( event ) {
					switch ( event.keyCode ) {
						case 38: // up
						case 87: // w
							scope.moveForward = true;
							break;
						case 37: // left
						case 65: // a
							scope.moveLeft = true;
							break;
						case 40: // down
						case 83: // s
							scope.moveBackward = true;
							break;
						case 39: // right
						case 68: // d
							scope.moveRight = true;
							break;
					}
	};

	var onKeyUp = function ( event ) {
					switch( event.keyCode ) {
						case 38: // up
						case 87: // w
							scope.moveForward = false;
							break;
						case 37: // left
						case 65: // a
							scope.moveLeft = false;
							break;
						case 40: // down
						case 83: // s
							scope.moveBackward = false;
							break;
						case 39: // right
						case 68: // d
							scope.moveRight = false;
							break;
					}
	};

	document.addEventListener( 'keydown', onKeyDown, false );
	document.addEventListener( 'keyup', onKeyUp, false );

	var havePointerLock = 'pointerLockElement' in document ||
	 											'mozPointerLockElement' in document ||
	  										'webkitPointerLockElement' in document;

			if ( havePointerLock ) {
				var element = document.body;
				var pointerlockchange = function ( event ) {
					if ( document.pointerLockElement === element ||
						 	 document.mozPointerLockElement === element ||
							 document.webkitPointerLockElement === element ) {
						scope.controlsEnabled = true;
						document.addEventListener( 'mousemove', onMouseMove, false );
					} else {
						scope.controlsEnabled = false;
					}
				};
				var pointerlockerror = function ( event ) {
					//There was an error
				};
				// Hook pointer lock state change events
				document.addEventListener( 'pointerlockchange', pointerlockchange, false );
				document.addEventListener( 'mozpointerlockchange', pointerlockchange, false );
				document.addEventListener( 'webkitpointerlockchange', pointerlockchange, false );
				document.addEventListener( 'pointerlockerror', pointerlockerror, false );
				document.addEventListener( 'mozpointerlockerror', pointerlockerror, false );
				document.addEventListener( 'webkitpointerlockerror', pointerlockerror, false );

			} else {
				document.body.innerHTML = 'Your browser doesn\'t seem to support Pointer Lock API';
			}

	this.getDirection = function() {

		// assumes the camera itself is not rotated

		var direction = new THREE.Vector3( 0, 0, - 1 );
		var rotation = new THREE.Euler( 0, 0, 0, "YXZ" );

		return function( v ) {

			rotation.set( pitchObject.rotation.x, yawObject.rotation.y, 0 );

			v.copy( direction ).applyEuler( rotation );

			return v;

		};

	}();

	//var newDiv = document.createElement("div");
	//newDiv.innerHTML = "Click to play";
	//document.body.appendChild (newDiv);
	document.body.addEventListener("click", function() {
		var element = document.body;
		element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;
		element.requestPointerLock();
	});

};