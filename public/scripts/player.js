// Globales Objekt, welches den 3D Player beinhaltet und managet
var Player = (function () {

    var threeScene; // Referenz auf ThreeJS Szene
    var renderer; // Referenz auf den ThreeJS renderer
    var camera; // Aktuell angezeigte ThreeJS Kamera
    var objects; // Liste aller ThreeJS Objekte, die aktuell in der Szene enthalten sind
    var controls; // Oribit Controls zum Festlegen der Initialien Ausrichtung
    var standardMaterials; // Ausgemalte Materialien mit Farben und Texturen
    var numberMaterials; // Zahlenmaterialien als Platzhalter für noch nicht ausgemalte Würfel

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
            window.addEventListener('resize', onWindowResize, false);
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
                objects.forEach(function(obj) {
                    threeScene.remove(obj);
                });
            }
            objects = []; // Einfach leer machen
            // Materialien vorbereiten
            createMaterials(model.colorpalette);
            // Würfel erstellen
            var boxes = createBoxesForScene(model.scene);
            // Würfel in Objektliste speichern und der Szene hinzufügen
            boxes.forEach(function(box) {
                objects.push(box);
                threeScene.add(box);
            });
            // Kameraposition und -ausrichtung für Modell festlegen
            camera.position.set(model.pos.x, model.pos.y, model.pos.z);
            controls.target.set(model.target.x, model.target.y, model.target.z);
        }
    }

    // Berechnet die Projektsionsmatrix und das Screen-Verhältnis neu, wenn sich die Fenstergröße ändert
    function onWindowResize() {
        const width = renderer.domElement.parentNode.clientWidth;
        const height = renderer.domElement.parentNode.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }

    // Bereitet anhand der Palette die Standard- und Platzhaltermatierialien vor
    function createMaterials(palette) {
        // Erst mal leer machen
        standardMaterials = [];
        numberMaterials = [];
        Object.keys(palette).forEach(function(key) {
            var paletteEntry = palette[key];
            // Standardmaterial erzeugen
            standardMaterials[key] = createStandardMaterial(paletteEntry);
            // Platzhaltermaterial erzeugen
            numberMaterials[key] = createNumberMaterial(key);
        });
    }

    // Erstellt eine Liste von ThreeJS Objekten aus der gegebenen Szene
    function createBoxesForScene(scene) {
        var boxes = [];
        Object.keys(scene).forEach(function (zKey) {
            const bz = scene[zKey];
            Object.keys(bz).forEach(function (yKey) {
                const by = bz[yKey];
                Object.keys(by).forEach(function (xKey) {
                    var x = parseInt(xKey);
                    var y = parseInt(yKey);
                    var z = parseInt(zKey);
                    // Würfel erzeugen, dabei die angrenzenden Würfel beachten, damit nur die sichtbaren Flächen erzeugt werden
                    boxes.push(createPlayBox(
                        standardMaterials[by[xKey]],
                        x,
                        y,
                        z,
                        !(scene[z][y + 1] !== undefined && scene[z][y + 1][x] !== undefined), // top (+y)
                        !(scene[z][y - 1] !== undefined && scene[z][y - 1][x] !== undefined), // bottom (-y)
                        !(scene[z][y][x - 1] !== undefined), // left (-x)
                        !(scene[z][y][x + 1] !== undefined), // right (+x)
                        !(scene[z + 1] !== undefined && scene[z + 1][y] !== undefined && scene[z + 1][y][x] !== undefined), // front (+z)
                        !(scene[z - 1] !== undefined && scene[z - 1][y] !== undefined && scene[z - 1][y][x] !== undefined) // back (-z)
                    ));
                });
            });
        });
        return boxes;
    }

})();