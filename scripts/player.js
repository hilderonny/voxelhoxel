// Globales Objekt, welches den 3D Player beinhaltet und managet
var Player = (function () {

    var threeScene; // Referenz auf ThreeJS Szene
    var renderer; // Referenz auf den ThreeJS renderer
    var camera; // Aktuell angezeigte ThreeJS Kamera
    var objects; // Liste aller ThreeJS Objekte, die aktuell in der Szene enthalten sind
    var raycastablePlanes; // Liste aller Flächen, die als Raycasting-Ziel dienen können
    var controls; // Oribit Controls zum Festlegen der Initialien Ausrichtung
    var standardMaterials; // Ausgemalte Materialien mit Farben und Texturen
    var numberMaterials; // Zahlenmaterialien als Platzhalter für noch nicht ausgemalte Würfel
    var currentColor; // Aktuell selektierte Palettennummer zum Ausmalen

    // Objekt zurück geben, welche irgendwelche Instanzmethoden bereit stellt.
    return {

        // Player initialisieren und ThreeJS starten, vorher müssen Event listener angehängt werden
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
            // Szene bereinigen und alle alten Objekte entfernen
            if (objects) {
                objects.forEach(function (obj) {
                    threeScene.remove(obj);
                });
            }
            objects = []; // Einfach leer machen
            raycastablePlanes = [];
            // Materialien vorbereiten
            createMaterials(model.colorpalette);
            // Würfel erstellen
            var boxes = createBoxesForModel(model);
            // Würfel in Objektliste speichern und der Szene hinzufügen
            boxes.forEach(function (box) {
                objects.push(box);
                threeScene.add(box);
            });
            // Kameraposition und -ausrichtung für Modell festlegen
            camera.position.set(model.pos.x, model.pos.y, model.pos.z);
            controls.target.set(model.target.x, model.target.y, model.target.z);
            // Kameraposition und Ziel an Modell binden, damit es auch gespeichert wird
            model.pos = camera.position;
            model.target = controls.target;
        },

        // Legt eine Farbe als diejenige fest, die ausgemalt wird.
        // Die entsprechenden Würfel werden markiert und können ausgemalt werden
        selectColor: function(paletteIndex) {
            currentColor = paletteIndex;
            // Vorschaumaterial farblich hervorheben, damit man erkennt, was man ausmalen muss
            numberMaterials.forEach(function (numberMaterial, index) {
                numberMaterial.color.setHex(index === paletteIndex ? 0x666666 : 0xFFFFFF);
                numberMaterial.emissive.setHex(index === paletteIndex ? 0x0000FF : 0x000000);
            });
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
    }

    // Registriert Event Listener für Maus und Touch-Eingaben.
    function registerInputListener() {
        var isMoving = true; // Bestimmt, ob die Maus oder der Finger gerade bewegt wird. Hat Einfluss auf Ausmal-Wischen.
        var isPainting = false; // Bestimmt, ob man gerade malt, also alle derselben Farbe auch anpinselt bei Bewegung
        var raycaster = new THREE.Raycaster();
        var mousePosition = new THREE.Vector2();
        // Maus runter oder Touch Beginn
        var handleDown = function () {
            isMoving = false; // Bewegung erst mal prinzipiell ausschalten
            raycaster.setFromCamera(mousePosition, camera);
            const intersects = raycaster.intersectObjects(raycastablePlanes);
            if (intersects.length > 0) {
                const box = intersects[0].object.parent;
                if (!box.userData.isPainted && box.userData.paletteIndex === currentColor) {
                    isPainting = true; // Wir beginnen zu malen
                    paintBox(box);
                } else {
                    isMoving = true; // Wenn wir auf einen Würfel klicken, der schon ausgemalt ist, bewegen wir das Objekt
                }
            } else {
                isMoving = true; // Daneben geklickt, ganzes Objekt bewegen
            }
            if (!isMoving) controls.enabled = false; // Orbit Controls ausschalten, wenn wir im Malen-Modus sind, damit das Objekt nicht gedreht wird
        };
        // Maus hoch oder Touch loslassen
        var handleUp = function() {
            // Bewegungsmodus prinzipiell wieder einschalten
            isMoving = true;
            // Malmodus ausschalten
            isPainting = false;
            // Orbit Controls wieder einschalten
            controls.enabled = true; // Nicht erst bei Bewegung, sonst hat man Sprünge in der Bewegung
        }
        // Maus bewegen
        renderer.domElement.addEventListener('mousemove', function () {
            event.preventDefault();
            // Wenn man das Modell weder dreht noch gerade malt, dann soll nix weiter gemacht werden
            if (isMoving && !isPainting) return;
            var parentNode = renderer.domElement.parentNode;
            mousePosition.set((event.offsetX / parentNode.clientWidth) * 2 - 1, - (event.offsetY / parentNode.clientHeight) * 2 + 1);
            raycaster.setFromCamera(mousePosition, camera);
            var intersects = raycaster.intersectObjects(raycastablePlanes);
            // Wenn nichts angezielt wird, nix weiter tun
            if (intersects.length < 1) return;
            paintBox(intersects[0].object.parent);
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
            if (!isPainting) return;
            var x = event.changedTouches[0].clientX - event.target.offsetParent.offsetLeft;
            var y = event.changedTouches[0].clientY - event.target.offsetParent.offsetTop;
            mousePosition.set((x / renderer.domElement.parentNode.clientWidth) * 2 - 1, -(y / renderer.domElement.parentNode.clientHeight) * 2 + 1);
            raycaster.setFromCamera(mousePosition, camera);
            const intersects = raycaster.intersectObjects(raycastablePlanes);
            if (intersects.length < 1) return;
            paintBox(intersects[0].object.parent);
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
        var painted = model.painted;
        var boxes = [];
        Object.keys(scene).forEach(function (zKey) {
            const bz = scene[zKey];
            Object.keys(bz).forEach(function (yKey) {
                const by = bz[yKey];
                Object.keys(by).forEach(function (xKey) {
                    var x = parseInt(xKey);
                    var y = parseInt(yKey);
                    var z = parseInt(zKey);
                    // Je nachdem, ob der Würfel schon ausgemalt wurde, wird daas Platzhaltermaterial oder das richtige verwendet
                    var isPainted = painted && painted[z] && painted[z][y] && painted[z][y][x];
                    var paletteIndex = by[xKey];
                    // Würfel erzeugen, dabei die angrenzenden Würfel beachten, damit nur die sichtbaren Flächen erzeugt werden
                    var box = createPlayBox(
                        isPainted ? standardMaterials[paletteIndex] : numberMaterials[paletteIndex],
                        x,
                        y,
                        z,
                        !(scene[z][y + 1] !== undefined && scene[z][y + 1][x] !== undefined), // top (+y)
                        !(scene[z][y - 1] !== undefined && scene[z][y - 1][x] !== undefined), // bottom (-y)
                        !(scene[z][y][x - 1] !== undefined), // left (-x)
                        !(scene[z][y][x + 1] !== undefined), // right (+x)
                        !(scene[z + 1] !== undefined && scene[z + 1][y] !== undefined && scene[z + 1][y][x] !== undefined), // front (+z)
                        !(scene[z - 1] !== undefined && scene[z - 1][y] !== undefined && scene[z - 1][y][x] !== undefined) // back (-z)
                    );
                    // Metainformationen an Würfel speichern, wird für das Malen benötigt
                    box.userData = {
                        x: x,
                        y: y,
                        z: z,
                        paletteIndex: paletteIndex,
                        isPainted: isPainted
                    };
                    boxes.push(box);
                    // Wenn die Box bereits gemalt ist, die App informieren
                    if (isPainted && Player.onBoxPainted) Player.onBoxPainted(box);
                });
            });
        });
        return boxes;
    }

    // Erzeugt einen Würfel an einer bestimmten Position mittels einzelner Flächen
    // Dabei wird angegeben, ob bestimmte Flächen erszeugt werden sollen, oder nicht
    // Wird für Play Modus verwendet
    function createPlayBox(standardMaterial, x, y, z, top, bottom, left, right, front, back) {
        var boxMesh = new THREE.Group();
        // Nur die Flächen erzeugen, die auch wirklich sichtbar sind
        if (top) boxMesh.add(createPlane(standardMaterial, [0, .5, 0], [-1.5708, 0, 0]));
        if (bottom) boxMesh.add(createPlane(standardMaterial, [0, -.5, 0], [1.5708, 0, 0]));
        if (left) boxMesh.add(createPlane(standardMaterial, [-.5, 0, 0], [0, -1.5708, 0]));
        if (right) boxMesh.add(createPlane(standardMaterial, [.5, 0, 0], [0, 1.5708, 0]));
        if (front) boxMesh.add(createPlane(standardMaterial, [0, 0, .5], [0, 0, 0]));
        if (back) boxMesh.add(createPlane(standardMaterial, [0, 0, -.5], [0, 3.14159, 0]));
        // Würfel positionieren
        boxMesh.position.x = x;
        boxMesh.position.y = y;
        boxMesh.position.z = z;
        boxMesh.updateMatrix();
        boxMesh.matrixAutoUpdate = false;
        return boxMesh;
    }

    // Erzeugt eine einzelne Fläche für einen Würfel
    function createPlane(material, position, rotation) {
        var geometry = new THREE.PlaneBufferGeometry(1, 1, 1, 1);
        var planeMesh = new THREE.Mesh(geometry, material);
        planeMesh.position.x = position[0];
        planeMesh.position.y = position[1];
        planeMesh.position.z = position[2];
        if (rotation[0]) planeMesh.setRotationFromAxisAngle(new THREE.Vector3(1, 0, 0), rotation[0]);
        if (rotation[1]) planeMesh.setRotationFromAxisAngle(new THREE.Vector3(0, 1, 0), rotation[1]);
        if (rotation[2]) planeMesh.setRotationFromAxisAngle(new THREE.Vector3(0, 0, 1), rotation[2]);
        planeMesh.updateMatrix();
        planeMesh.matrixAutoUpdate = false;
        raycastablePlanes.push(planeMesh); // Für Raycasting merken
        return planeMesh;
    }

    // Malt einen Würfel aus, indem sein Standardmaterial gesetzt wird
    function paintBox(box) {
        // Box nur dann ausmalen, wenn die nicht schon gemalt wurde oder die falsche Farbe hat
        if (box.userData.isPainted ||  box.userData.paletteIndex !== currentColor) return;
        var standardMaterial = standardMaterials[currentColor];
        // Über alle Flächen des Würfels gehen und deren Material setzen
        box.children.forEach(function(plane) {
            plane.material = standardMaterial;
        });
        box.userData.isPainted = true; // Box als gemalt markieren
        // Anwendung benachrichtigen, damit sie die übrigen Farben zählen kann
        if (Player.onBoxPainted) Player.onBoxPainted(box);
    }

})();