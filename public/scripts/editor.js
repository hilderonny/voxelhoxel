// Globales Objekt, welches den 3D Editor beinhaltet und managet
var Editor = (function () {

    var threeScene; // Referenz auf ThreeJS Szene
    var renderer; // Referenz auf den ThreeJS renderer
    var camera; // Aktuell angezeigte ThreeJS Kamera
    var objects; // Liste aller ThreeJS Objekte, die aktuell in der Szene enthalten sind
    var controls; // Orbit Controls zum Festlegen der Initialien Ausrichtung
    var standardMaterials; // Ausgemalte Materialien mit Farben und Texturen
    var numberMaterials; // Zahlenmaterialien als Platzhalter für noch nicht ausgemalte Würfel
    var currentMode; // Aktueller Modus
    var rollOverMesh; // Box, die im Hinzufügenmodus die aktuelle Mausposition zeigt
    var previousIntersection; // Zeiger auf zuletzt angezieltes Objekt. Für Entfernen-Modus relevant
    var removeMaterial; // Material, das benutzt wird, um eine Box zum Entfernen zu markieren
    var currentModel; // Referenz auf aktuelles Modell
    var currentPaletteIndex; // Aktuell ausgewählter Paletteneintrag

    // Objekt zurück geben, welche irgendwelche Instanzmethoden bereit stellt.
    return {

        // Editor initialisieren und ThreeJS starten, vorher müssen Event listener angehängt werden
        // targetElement gibt das DOM Element an, an welches der Renderer als Kind angehängt wird
        init: function (targetElement) {
            // Initialize ThreeJS
            threeScene = new THREE.Scene();
            threeScene.background = new THREE.Color(0xd5aeb0);
            renderer = new THREE.WebGLRenderer({
                antialias: true,
                preserveDrawingBuffer: true // Für Thumbnailerstellung wichtig
            });
            renderer.setPixelRatio(window.devicePixelRatio);
            camera = new THREE.PerspectiveCamera(60, 1, 1, 1000);
            camera.position.set(400, 200, 0);
            // Orbit Controls vorbereiten, benötigen Animation loop
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.25;
            controls.rotateSpeed = 0.1;
            controls.panSpeed = 0.1;
            controls.screenSpacePanning = true;
            controls.minDistance = 5;
            controls.maxDistance = 100;
            controls.keys = { LEFT: 65, UP: 87, RIGHT: 68, BOTTOM: 83 };
            // Umgebungslicht
            threeScene.add(new THREE.AmbientLight(0x222222));
            // Taschenlampe
            var pointLight = new THREE.PointLight(0xeeeeee);
            pointLight.position.set(0, 0, 0);
            camera.add(pointLight);
            // Die Kamera darf erst dann zur Szene hinzugefügt werden, wenn alle Kindelemente angehängt sind
            threeScene.add(camera);
            // Box zum Hinzufügen vorbereiten
            rollOverMesh = new THREE.Mesh(
                new THREE.BoxBufferGeometry(1, 1, 1),
                new THREE.MeshBasicMaterial({ color: 0x0000ff, opacity: 0.5, transparent: true })
            );
            // Material zum Entfernen
            removeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, opacity: 0.5, transparent: true });
            // Event Listener für Fenstergröße, Maus und Touch registrieren
            window.addEventListener('resize', onWindowResize, false);
            window.addEventListener("orientationchange", onWindowResize, false);
            registerInputListener();
            // Renderer in DOM einfügen
            targetElement.appendChild(renderer.domElement);
            // Animation loop starten und Renderer-Größe ermitteln lassen
            onWindowResize();
            renderer.setAnimationLoop(function () {
                controls.update();
                renderer.render(threeScene, camera);
            });
        },

        // Bereinigt die Szene und lädt das angegebene Modell
        loadModel: function (model) {
            currentModel = JSON.parse(JSON.stringify(model)); // Klonen, um bei Bedarf verwerfen zu können
            // Szene bereinigen und alle alten Objekte entfernen
            if (objects) {
                objects.forEach(function (obj) {
                    threeScene.remove(obj);
                });
            }
            objects = []; // Einfach leer machen
            // Materialien vorbereiten
            createMaterials(model.colorpalette);
            // Würfel erstellen
            createBoxesForModel(model);
            // Kameraposition und -ausrichtung für Modell festlegen
            camera.position.set(model.pos.x, model.pos.y, model.pos.z);
            controls.target.set(model.target.x, model.target.y, model.target.z);
            // Kameraposition und Ziel an Modell binden, damit es auch gespeichert wird
            model.pos = camera.position;
            model.target = controls.target;
        },

        // Macht ein Foto der aktuellen Ansicht
        makeScreenshot: function () {
            var canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            var tempRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, preserveDrawingBuffer: true });
            tempRenderer.setSize(256, 256);
            var oldAspect = camera.aspect;
            camera.aspect = 1;
            camera.updateProjectionMatrix();
            var oldBackground = threeScene.background;
            threeScene.background = new THREE.Color(0xFFFFFF);
            tempRenderer.render(threeScene, camera);
            var data = tempRenderer.domElement.toDataURL('image/jpeg');
            camera.aspect = oldAspect;
            camera.updateProjectionMatrix();
            threeScene.background = oldBackground;
            return data;
        },

        // Legt eine Farbe als diejenige fest, die ab sofort verwendet wird.
        // Wirkt sich auf Add- und Paint Modus aus
        selectColor: function(paletteIndex) {
            currentPaletteIndex = paletteIndex;
        },

        // Legt den aktuellen Modus fest
        setMode: function (mode) {
            currentMode = mode;
        },

    }

    // Registriert Event Listener für Maus und Touch-Eingaben.
    function registerInputListener() {
        var raycaster = new THREE.Raycaster();
        var mousePosition = new THREE.Vector2();
        // Maus runter oder Touch Beginn
        var handleDown = function () {
        };
        // Maus hoch oder Touch loslassen
        var handleUp = function () {
            if (currentMode === 'add' && rollOverMesh.parent) {
                var x = rollOverMesh.position.x;
                var y = rollOverMesh.position.y;
                var z = rollOverMesh.position.z;
                if (!currentModel.scene[z]) currentModel.scene[z] = {};
                if (!currentModel.scene[z][y]) currentModel.scene[z][y] = {};
                currentModel.scene[z][y][x] = currentPaletteIndex;
                createEditBox(currentPaletteIndex, x, y, z);
                threeScene.remove(rollOverMesh);
            } else if (currentMode === 'remove' && previousIntersection) {
                var x = previousIntersection.position.x;
                var y = previousIntersection.position.y;
                var z = previousIntersection.position.z;
                delete currentModel.scene[z][y][x];
                // Modell aufräumen
                if (Object.keys(currentModel.scene[z][y]).length < 1) delete currentModel.scene[z][y];
                if (Object.keys(currentModel.scene[z]).length < 1) delete currentModel.scene[z];
                objects.splice(objects.indexOf(previousIntersection), 1);
                threeScene.remove(previousIntersection);
                previousIntersection = undefined;
            }
        }
        // Maus bewegen
        renderer.domElement.addEventListener('mousemove', function () {
            event.preventDefault();
            var parentNode = renderer.domElement.parentNode;
            mousePosition.set((event.offsetX / parentNode.clientWidth) * 2 - 1, - (event.offsetY / parentNode.clientHeight) * 2 + 1);
            raycaster.setFromCamera(mousePosition, camera);
            // Im Hinzufügen-Modus den Rollover an die Mausposition setzen
            if (currentMode === 'add') {
                var intersects = raycaster.intersectObjects(objects);
                if (intersects.length > 0) {
                    var intersect = intersects[0];
                    rollOverMesh.position.copy(intersect.object.position).add(intersect.face.normal);
                    if (!rollOverMesh.parent) threeScene.add(rollOverMesh);
                } else {
                    threeScene.remove(rollOverMesh);
                }
            } else if (currentMode === 'remove') {
                if (previousIntersection) {
                    previousIntersection.material = previousIntersection.originalMaterial;
                    previousIntersection = undefined; // Damit MouseUp nicht irgendwas blödes macht
                }
                var intersects = raycaster.intersectObjects(objects);
                if (intersects.length > 0) {
                    var obj = intersects[0].object;
                    obj.originalMaterial = obj.material;
                    obj.material = removeMaterial;
                    previousIntersection = obj;
                }
            }
        }, false);
        renderer.domElement.addEventListener('mouseup', function () { handleUp(); }, false);
        renderer.domElement.addEventListener('touchend', function () { handleUp(); }, false);
        renderer.domElement.addEventListener('mousedown', function () {
            event.preventDefault();
            mousePosition.set(
                (event.offsetX / renderer.domElement.parentNode.clientWidth) * 2 - 1,
                - (event.offsetY / renderer.domElement.parentNode.clientHeight) * 2 + 1
            );
            handleDown();
        }, false);
        renderer.domElement.addEventListener('touchstart', function () {
            var x = event.changedTouches[0].clientX - event.target.offsetParent.offsetLeft;
            var y = event.changedTouches[0].clientY - event.target.offsetParent.offsetTop;
            mousePosition.set((x / renderer.domElement.parentNode.clientWidth) * 2 - 1, -(y / renderer.domElement.parentNode.clientHeight) * 2 + 1);
            handleDown();
        }, false);
        renderer.domElement.addEventListener('touchmove', function () {
            var x = event.changedTouches[0].clientX - event.target.offsetParent.offsetLeft;
            var y = event.changedTouches[0].clientY - event.target.offsetParent.offsetTop;
            mousePosition.set((x / renderer.domElement.parentNode.clientWidth) * 2 - 1, -(y / renderer.domElement.parentNode.clientHeight) * 2 + 1);
        }, { passive: false }); // https://stackoverflow.com/a/49582193/5964970
    }

    // Berechnet die Projektsionsmatrix und das Screen-Verhältnis neu, wenn sich die Fenstergröße ändert
    function onWindowResize() {
        renderer.setSize(100, 100); // Nur so wird die Größe des übergeordneten Elements richtig brechnet
        const width = renderer.domElement.parentNode.offsetWidth;
        const height = renderer.domElement.parentNode.offsetHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }

    // Bereitet anhand der Palette die Standard- und Platzhaltermatierialien vor
    function createMaterials(palette) {
        // Erst mal leer machen
        standardMaterials = [];
        numberMaterials = [];
        palette.forEach(function (paletteEntry, index) {
            // Standardmaterial erzeugen
            standardMaterials[index] = createStandardMaterial(paletteEntry);
            // Platzhaltermaterial erzeugen
            numberMaterials[index] = createNumberMaterial(index + 1);
        });
    }

    // Erstellt eine Liste von ThreeJS Objekten aus der gegebenen Szene
    function createBoxesForModel(model) {
        var scene = model.scene;
        Object.keys(scene).forEach(function (zKey) {
            const bz = scene[zKey];
            Object.keys(bz).forEach(function (yKey) {
                const by = bz[yKey];
                Object.keys(by).forEach(function (xKey) {
                    var x = parseInt(xKey);
                    var y = parseInt(yKey);
                    var z = parseInt(zKey);
                    var paletteIndex = by[xKey];
                    createEditBox(paletteIndex, x, y, z);
                });
            });
        });
    }

    // Erzeugt einen Würfel an einer bestimmten Position für Editiermodus.
    // Auf Performance wird hier nicht geachtet, es werden einfache Würfel verwendet
    function createEditBox(paletteIndex, x, y, z) {
        var boxMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), standardMaterials[paletteIndex]);
        // Würfel positionieren
        boxMesh.position.x = x;
        boxMesh.position.y = y;
        boxMesh.position.z = z;
        boxMesh.updateMatrix();
        boxMesh.matrixAutoUpdate = false;
        // Metainformationen an Würfel speichern, wird für das Malen benötigt
        boxMesh.userData = {
            x: x,
            y: y,
            z: z,
            paletteIndex: paletteIndex
        };
        objects.push(boxMesh);
        threeScene.add(boxMesh);
    }

    // Erzeugt ein Material mit einer Farbe (wenn als Hex gegeben) oder einer Bildtexture (wenn URL angegeben)
    function createStandardMaterial(hexColorOrUrl) {
        if (hexColorOrUrl.length > 9) { // Hexadezimal mit Transparenz
            // Parameter enthält URL für Textur, z.B. https://i.imgur.com/iy50ZFn.png
            // Meine Bilder liegen bei https://hilderonny.imgur.com/all/?third_party=1
            var texture = new THREE.TextureLoader().load(hexColorOrUrl);
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.LinearMipMapLinearFilter;
            return new THREE.MeshLambertMaterial({ map: texture });
        } else {
            return new THREE.MeshLambertMaterial({ color: hexColorOrUrl });
        }
    }

    // Erzeugt ein Material mit einer Textur, die einen Text enthält
    function createNumberMaterial(number) {
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
        context.fillText(number, 64, 64);
        const texture = new THREE.Texture(bitmap);
        texture.needsUpdate = true;
        return new THREE.MeshLambertMaterial({ map: texture });
    }

})();