/* global THREE, emit */

// Orbit controls:  https://github.com/mrdoob/three.js/blob/master/examples/misc_controls_orbit.html
// Voxel painter: https://github.com/mrdoob/three.js/blob/master/examples/webgl_interactive_voxelpainter.html
// GL picker: https://github.com/mrdoob/three.js/blob/master/examples/webgl_interactive_cubes_gpu.html
// Screenshot: https://stackoverflow.com/a/26197858
// Ortho und Interection https://github.com/mrdoob/three.js/blob/master/examples/webgl_interactive_cubes_ortho.html

const Editor = (function () {

    var camera, controls, scene, renderer, currentMode, currentColorIndex, model, rollOverMesh, raycaster, mouse, objects = [], boxes = {}, previousIntersection, numberMaterials = [], isMoving, isBlocked, isPainting, config, colorsLeft;
    var standardMaterials = {};

    // Einzelne Seite eines Wuerfels erzeugen
    function createPlane(paletteNumber, material, position, rotation) {
        var geometry = new THREE.PlaneBufferGeometry(1, 1, 1, 1);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.paletteNumber = paletteNumber;
        mesh.position.x = position[0];
        mesh.position.y = position[1];
        mesh.position.z = position[2];
        if (rotation[0]) mesh.setRotationFromAxisAngle(new THREE.Vector3(1, 0, 0), rotation[0]);
        if (rotation[1]) mesh.setRotationFromAxisAngle(new THREE.Vector3(0, 1, 0), rotation[1]);
        if (rotation[2]) mesh.setRotationFromAxisAngle(new THREE.Vector3(0, 0, 1), rotation[2]);
        mesh.updateMatrix();
        mesh.matrixAutoUpdate = false;
        return mesh;
    }

    // Erzeugt einen Wuerfel. Erstellt aber nur die Seiten, die auch wirklich sichtbar sind
    function addBox(pos, paletteNumber) {
        var x = pos.x, y = pos.y, z = pos.z;
        var mesh = new THREE.Group();
        var color = model.colorpalette[paletteNumber];
        var standardMaterial = standardMaterials[color];
        if (!standardMaterial) {
            if (color.length > 7) {
                // Color enthält URL für Textur, z.B. https://i.imgur.com/iy50ZFn.png
                // Meine Bilder liegen bei https://hilderonny.imgur.com/all/?third_party=1
                var texture = new THREE.TextureLoader().load(color);
                texture.magFilter = THREE.NearestFilter;
                texture.minFilter = THREE.LinearMipMapLinearFilter;
                standardMaterial = new THREE.MeshLambertMaterial( { map: texture } );
            } else {
                standardMaterial = new THREE.MeshLambertMaterial({ color: color });
            }
            standardMaterials[color] = standardMaterial;
        }
        mesh.numbersMaterial = numberMaterials[paletteNumber];
        mesh.standardMaterial = standardMaterial;
        mesh.planes = {
            top: createPlane(paletteNumber, standardMaterial, [0, .5, 0], [-1.5708, 0, 0]),
            bottom: createPlane(paletteNumber, standardMaterial, [0, -.5, 0], [1.5708, 0, 0]),
            left: createPlane(paletteNumber, standardMaterial, [-.5, 0, 0], [0, -1.5708, 0]),
            right: createPlane(paletteNumber, standardMaterial, [.5, 0, 0], [0, 1.5708, 0]),
            front: createPlane(paletteNumber, standardMaterial, [0, 0, .5], [0, 0, 0]),
            back: createPlane(paletteNumber, standardMaterial, [0, 0, -.5], [0, 3.14159, 0]),
        }
        Object.values(mesh.planes).forEach(function(plane) {
            mesh.add(plane);
        });
        mesh.paletteNumber = paletteNumber;
        mesh.position.x = x;
        mesh.position.y = y;
        mesh.position.z = z;
        mesh.updateMatrix();
        mesh.matrixAutoUpdate = false;
        // Set material for plane
        mesh.setMaterial = function(material) {
            Object.values(mesh.planes).forEach(plane => plane.material = material);
        }
        // Remove a plane
        mesh.hidePlane = function(dir) {
            var plane = mesh.planes[dir];
            if (plane) {
                mesh.remove(plane);
            }
        }
        // Remember box for later access
        if (!boxes[z]) boxes[z] = {};
        if (!boxes[z][y]) boxes[z][y] = {};
        boxes[z][y][x] = mesh;
        objects.push(mesh);
        scene.add(mesh);
    }

    // Orbit-Target stets auf den Voxel ausrichten, den man gerade anguckt, wenn man einen anguckt
    function updateViewTarget() {
        raycaster.setFromCamera(new THREE.Vector2(), camera);
        const intersects = raycaster.intersectObjects(objects);
        if (intersects.length < 1) return;
        controls.target = intersects[0].point.clone();
    }

    // Erzeugt eine Textur mit einer gegebenen Nummer
    function createTextTexture(text) {
        const bitmap = document.createElement('canvas');
        bitmap.width = 128;
        bitmap.height = 128;
        const context = bitmap.getContext('2d');
        context.fillStyle = '#000000';
        context.fillRect(0, 0, 128, 128);
        context.fillStyle = '#eeeeee';
        context.fillRect(1, 1, 126, 126);
        context.font = 'Bold 64px sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = '#444444';
        context.fillText(text, 64, 64);
        const texture = new THREE.Texture(bitmap);
        texture.needsUpdate = true;
        return new THREE.MeshLambertMaterial({ map: texture });
    }

    // Behandelt Beginn des Ausmalens oder das Rotieren beim Tippen oder Mausklick
    function handleMouseDown() {
        if (isBlocked) return;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(objects, true);
        if (intersects.length > 0) {
            const mesh = intersects[0].object.parent;
            if (!mesh.isPainted && mesh.paletteNumber === currentColorIndex) {
                isPainting = true;
            } else {
                isMoving = true;
            }
        } else {
            isMoving = true;
        }
        if (!isMoving) controls.enabled = false;
    }

    function handleMouseUp() {
        if (isBlocked) return;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(objects, true);
        if (intersects.length > 0) {
            const intersect = intersects[0];
            if (!isMoving && currentMode === 'play') {
                playPaintBox(intersect.object.parent); // object is here a plane, we need the parent box
            }
        }
        updateViewTarget();
        isMoving = false;
        isPainting = false;
        controls.enabled = true;
    }

    function highlightPlayNumber() {
        numberMaterials.forEach(function (numberMaterial, index) {
            numberMaterial.color.setHex(index === currentColorIndex ? 0x666666 : 0xFFFFFF);
            numberMaterial.emissive.setHex(index === currentColorIndex ? 0x0000FF : 0x000000);
        });
    }

    function onDocumentMouseMove() {
        event.preventDefault();
        if (isMoving && !isPainting) return;
        mouse.set((event.clientX / renderer.domElement.parentNode.clientWidth) * 2 - 1, - (event.clientY / renderer.domElement.parentNode.clientHeight) * 2 + 1);
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(objects, true);
        if (intersects.length > 0) {
            if (currentMode === 'play' && isPainting) {
                playPaintBox(intersects[0].object.parent); // object is here a plane, we need the parent box
            }
        } else {
            if (rollOverMesh.visible) scene.remove(rollOverMesh);
            rollOverMesh.visible = false;
            if (previousIntersection) previousIntersection.material.emissive.setHex(0x000000);
        }
    }

    function onDocumentMouseDown() {
        event.preventDefault();
        mouse.set(
            (event.clientX / renderer.domElement.parentNode.clientWidth) * 2 - 1,
            - (event.clientY / renderer.domElement.parentNode.clientHeight) * 2 + 1
        );
        handleMouseDown();
    }

    function onDocumentMouseUp() {
        event.preventDefault();
        mouse.set(
            (event.clientX / renderer.domElement.parentNode.clientWidth) * 2 - 1,
            - (event.clientY / renderer.domElement.parentNode.clientHeight) * 2 + 1
        );
        handleMouseUp();
    }

    function onDocumentTouchEnd() {
        mouse.set(
            (event.changedTouches[0].clientX / renderer.domElement.parentNode.clientWidth) * 2 - 1,
            -(event.changedTouches[0].clientY / renderer.domElement.parentNode.clientHeight) * 2 + 1
        );
        handleMouseUp();
    }

    function onDocumentTouchMove() {
        if (currentMode !== 'play' || !isPainting) return;
        mouse.set((event.changedTouches[0].clientX / renderer.domElement.parentNode.clientWidth) * 2 - 1, - (event.changedTouches[0].clientY / renderer.domElement.parentNode.clientHeight) * 2 + 1);
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(objects, true);
        if (intersects.length > 0) {
            playPaintBox(intersects[0].object.parent);
        }
    }

    function onDocumentTouchStart() {
        mouse.set(
            (event.changedTouches[0].clientX / renderer.domElement.parentNode.clientWidth) * 2 - 1,
            -(event.changedTouches[0].clientY / renderer.domElement.parentNode.clientHeight) * 2 + 1
        );
        handleMouseDown();
    }

    function onWindowResize() {
        const width = renderer.domElement.parentNode.clientWidth;
        const height = renderer.domElement.parentNode.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }

    function playPaintBox(mesh) {
        if (mesh.paletteNumber !== currentColorIndex) return;
        const painted = model.painted;
        if (!painted[mesh.position.z]) painted[mesh.position.z] = {};
        const z = painted[mesh.position.z];
        if (!z[mesh.position.y]) z[mesh.position.y] = {};
        const y = z[mesh.position.y];
        if (!y[mesh.position.x]) {
            y[mesh.position.x] = true;
            mesh.setMaterial(mesh.standardMaterial);
            mesh.isPainted = true;
            emit('painted', mesh);
            // Handle left colors
            colorsLeft[currentColorIndex]--;
            checkColor(currentColorIndex);
            config.colorcounternumber.innerHTML = colorsLeft[currentColorIndex];
        }
    }

    function updateColorBar() {
        const scene = model.scene;
        Object.keys(scene).forEach(function (zKey) {
            const bz = scene[zKey];
            Object.keys(bz).forEach(function (yKey) {
                const by = bz[yKey];
                Object.keys(by).forEach(function (xKey) {
                    const actualValue = colorsLeft[by[xKey]];
                    colorsLeft[by[xKey]] = (actualValue ? actualValue : 0) + 1;
                });
            });
        });
        var html = '';
        model.colorpalette.forEach(function (color, index) {
            console.log(color);
            var colorhtml = '<label' + (colorsLeft[index] ? '' : ' class="invisible"') + '><input type="radio" name="color" colorIndex="' + index + '" />';
            colorhtml += color.length > 7 ? '<div style="background-image:url(' + color + ')">' : '<div style="background-color:' + color + '">';
            colorhtml += '<span class="unchecked">' + index + '</span><img class="checked" src="../images/checkmark.png"/></div></label>';
            html += colorhtml;
        });
        config.colorbar.innerHTML = html;
        config.colorbar.querySelectorAll('input').forEach(function (input) {
            input.addEventListener('change', function () {
                Editor.selectColor(parseInt(this.getAttribute('colorIndex')));
            });
        });
        checkAllColors();
    }

    function checkAllColors() {
        config.completion.classList.remove('complete');
        if (!model.painted) model.painted = {};
        const painted = model.painted;
        Object.keys(painted).forEach(function (zKey) {
            const bz = painted[zKey];
            Object.keys(bz).forEach(function (yKey) {
                const by = bz[yKey];
                Object.keys(by).forEach(function (xKey) {
                    const colorIndex = model.scene[zKey][yKey][xKey];
                    colorsLeft[colorIndex]--;
                    if (colorsLeft[colorIndex] < 1) checkColor(colorIndex);
                });
            });
        });
    }

    function checkColor(colorIndex) {
        if (colorsLeft[colorIndex] < 1) {
            document.getElementsByName('color')[colorIndex].classList.add('complete');
            if (Object.values(colorsLeft).reduce(function (pv, cv) { return pv + cv; }, 0) < 1) {
                model.complete = true;
                config.completion.classList.add('complete');
            }
        }
    }

    return {

        init: function (cfg) {
            config = cfg; // For colorbar
            objects = [];
            // Create scene
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0xA37F81);
            // Setup scene renderer and add it to the document body
            renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); // preserveDrawingBuffer for screenshots
            renderer.setPixelRatio(window.devicePixelRatio);
            // Setup camera
            camera = new THREE.PerspectiveCamera(60, 1, 1, 1000);
            camera.position.set(400, 200, 0); // TODO: Set to initial position on new scene
            // Setup orbit controls
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
            controls.dampingFactor = 0.25;
            controls.rotateSpeed = 0.1;
            controls.panSpeed = 0.1;
            controls.screenSpacePanning = true; // For panning vertically
            controls.minDistance = 5;
            controls.maxDistance = 100;
            controls.keys = { LEFT: 65, UP: 87, RIGHT: 68, BOTTOM: 83 };
            // Add mouse hover template
            const rollOverGeo = new THREE.BoxBufferGeometry(1, 1, 1);
            const rollOverMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, opacity: 0.5, transparent: true });
            rollOverMesh = new THREE.Mesh(rollOverGeo, rollOverMaterial);
            // Setup input handling
            raycaster = new THREE.Raycaster();
            mouse = new THREE.Vector2();
            renderer.domElement.addEventListener('mousemove', onDocumentMouseMove, false);
            renderer.domElement.addEventListener('mouseup', onDocumentMouseUp, false);
            renderer.domElement.addEventListener('touchend', onDocumentTouchEnd, false);
            renderer.domElement.addEventListener('mousedown', onDocumentMouseDown, false);
            renderer.domElement.addEventListener('touchstart', onDocumentTouchStart, false);
            renderer.domElement.addEventListener('touchmove', onDocumentTouchMove, { passive: false }); // https://stackoverflow.com/a/49582193/5964970
            // Setup lights
            const pointLight = new THREE.PointLight(0xeeeeee);
            pointLight.position.set(0, 0, 0);
            camera.add(pointLight);
            scene.add(camera); // Need to add camera to scene when it has childs attached
            const ambientLight = new THREE.AmbientLight(0x222222);
            scene.add(ambientLight);
            // Handle window resize
            window.addEventListener('resize', onWindowResize, false);
            // Return domElement so that the caller can put it into the DOM
            return renderer;
        },

        clear: async function () {
            if (!confirm('Soll das Modell wirklich geleert werden?')) return;
            model.painted = {};
            delete model.complete;
            await Editor.save(model);
            await Editor.loadModel(model);
        },

        forceResize: function () {
            onWindowResize();
        },

        /**
         * model = {
         *   scene: Array[][][] of color indexes
         *   painted: Array[][][] of already painted voxels (true)
         *   colorpalette: Array of HTML colors
         *   thumbnail: Image Base64 data
         *   pos: Vector3 of camera position
         *   target: Vector3 of camera target
         */
        loadModel: function (m) {
            // Clear previous model if there is anything
            objects.forEach(function (obj) {
                scene.remove(obj);
            });
            objects = [];
            // Set the new model to the current one
            model = m;
            // Prepare materials
            model.colorpalette.forEach(function (color, index) {
                numberMaterials.push(createTextTexture(index));
            });
            // Create boxes
            const modelScene = model.scene;
            boxes = {}; // Clear boxes from previous model
            Object.keys(modelScene).forEach(function (zKey) {
                const bz = modelScene[zKey];
                Object.keys(bz).forEach(function (yKey) {
                    const by = bz[yKey];
                    Object.keys(by).forEach(function (xKey) {
                        addBox({ x: parseInt(xKey), y: parseInt(yKey), z: parseInt(zKey) }, by[xKey]);
                    });
                });
            });
            // Hide planes which touch other boxes
            Object.keys(boxes).forEach(function (zKey) {
                const bz = boxes[zKey];
                var z = parseInt(zKey);
                Object.keys(bz).forEach(function (yKey) {
                    const by = bz[yKey];
                    var y = parseInt(yKey);
                    Object.keys(by).forEach(function (xKey) {
                        var x = parseInt(xKey);
                        if (boxes[z] && boxes[z][y + 1] && boxes[z][y + 1][x]) { boxes[z][y][x].hidePlane('top'); boxes[z][y + 1][x].hidePlane('bottom'); }
                        if (boxes[z] && boxes[z][y] && boxes[z][y][x + 1]) { boxes[z][y][x].hidePlane('right'); boxes[z][y][x + 1].hidePlane('left'); }
                        if (boxes[z + 1] && boxes[z + 1][y] && boxes[z + 1][y][x]) { boxes[z][y][x].hidePlane('front'); boxes[z + 1][y][x].hidePlane('back'); }
                    });
                });
            });
            // Set camera to stored position
            camera.position.set(model.pos.x, model.pos.y, model.pos.z);
            controls.target.set(model.target.x, model.target.y, model.target.z);
            // Link camera position and target to model for later saving
            model.pos = camera.position;
            model.target = controls.target;
            // Update color bar
            colorsLeft = {};
            updateColorBar();
            var selectedColorIndex = parseInt(Object.keys(colorsLeft)[0]);
            document.getElementsByName('color')[selectedColorIndex].checked = true;
            Editor.selectColor(selectedColorIndex);
            // Re-init play mode
            Editor.setMode(currentMode);
            // Force resize of canvas, can be that the model was loaded after the canvas was initialized
            onWindowResize();
        },

        makeScreenshot: function () {
            isBlocked = true;
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            const tempRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, preserveDrawingBuffer: true });
            tempRenderer.setSize(256, 256);
            const oldAspect = camera.aspect;
            camera.aspect = 1;
            camera.updateProjectionMatrix();
            scene.background = new THREE.Color(0xFFFFFF);
            tempRenderer.render(scene, camera);
            const data = tempRenderer.domElement.toDataURL('image/jpeg');
            camera.aspect = oldAspect;
            camera.updateProjectionMatrix();
            isBlocked = false;
            scene.background = new THREE.Color(0xA37F81);
            return data;
        },

        save: async function () {
            model.thumbnail = Editor.makeScreenshot();
            var listEl = model.listEl;
            delete model.listEl; // Cannot save HTML in local storage
            await LocalDb.saveModel(model);
            model.listEl = listEl;
            return model;
        },

        selectColor: function (colorIndex) {
            currentColorIndex = colorIndex;
            if (currentMode === 'play') highlightPlayNumber();
            config.colorcounternumber.innerHTML = colorsLeft[colorIndex];
            config.colorcounterblock.style.backgroundColor = model.colorpalette[colorIndex];
        },

        setCurrentColor: function (color) {
            model.colorpalette[currentColorIndex] = color;
            objects.forEach(function (obj) {
                if (obj.paletteNumber === currentColorIndex) {
                    obj.standardMaterial.color.set(color);
                }
            });
        },

        setMode: function (mode) {
            currentMode = mode;
            const isNumber = (mode === 'play');
            if (isNumber) highlightPlayNumber();
            objects.forEach(function (obj) {
                const z = obj.position.z, y = obj.position.y, x = obj.position.x;
                const isPainted = model.painted[z] && model.painted[z][y] && model.painted[z][y][x];
                if (isPainted) obj.isPainted = true;
                obj.setMaterial((!isPainted && isNumber) ? obj.numbersMaterial : obj.standardMaterial);
            });
        },

        start: function () {
            onWindowResize(); // Let the canvas resize itself on startup
            renderer.setAnimationLoop(function () {
                controls.update();
                renderer.render(scene, camera);
            });
        }

    }

}());