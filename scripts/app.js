window.addEventListener('load', function () {

    // Lokale Modelle aus der IndexedDb laden und anzeigen
    // Das wird bewusst mit then() ausgeführt, damit weiter unten während des Ladens die Liste bereits angezeigt werden kann
    LocalDb.listModels().then(async function (localModels) {
        // Erst mal alle lokalen Modelle anzeigen
        localModels.forEach(function(localModel) {
            addModelToList(localModel);
        });
        // Anschließend Modelle vom Server laden und dabei den Ladespinner anzeigen
        UTILS.showElement('.progressbar');
        // Erst mal die Metadaten aus der models.json holen. Id und Zeitpunkt der letzten Änderung
        fetch('data/models.json', { cache: 'reload'}).then(async function(modelsresponse) {
            var modelmetas = await modelsresponse.json();
            // Diese Methode ist nach dem async/await Schema, weil wir nach den ganzen asynchronen Aufrufen
            // aller Modelle den Ladespinner wieder ausmachen müssen.
            for (var i = 0; i < modelmetas.length; i++) {
                var modelmeta = modelmetas[i];
                // Modelle, die noch nicht veröffentlicht sind, sollen auch nicht angezeigt werden
                if (!modelmeta.published) continue;
                // Prüfen, ob das Modell bereits lokal vorhanden ist
                var localModelIndex = localModels.findIndex(function (m) { return m._id === modelmeta._id });
                if (localModelIndex >= 0) {
                    var localModel = localModels[localModelIndex];
                    // Wenn das lokale Modell genauso alt ist oder bereits daran gemalt wurde, soll das lokale genommen werden
                    if ((localModel.painted && localModel.painted.length > 0) || (localModel.lastmodified >= modelmeta.lastmodified)) {
                        // When the local model is already painted, or local model is newer, ignore the server model
                        continue;
                    }
                }
                // Hier gibt es entweder kein lokales Modell, oder es wurde noch nicht bearbeitet und auf dem Server gibt es ein Update.
                // In diesem Falle soll es erneut vom Server geladen werden.
                // Detaillierte Modellinfos vom Server laden
                var modeldetailresponse = await fetch('data/' + modelmeta._id + '.json', { cache: 'reload' });
                var model = await modeldetailresponse.json();
                // Das hier kommt aus der models.json und steckt in den einzelnen Modelldateien nicht drin. Wird aber für Local Storage benötigt
                model._id = modelmeta._id;
                model.lastmodified = modelmeta.lastmodified;
                // An dieser Stelle ist das Modell vom Server fertig geladen.
                // Es ist noch nicht in der lokalen Datenbank, also speichern wir es dort rein.
                await LocalDb.saveModel(model);
                localModels.push(model);
                // Now model is ready to be shown in list
                addModelToList(model);
            }
            UTILS.hideElement('.progressbar');
        });
    });

    // Player initialisieren. Der wird in allen Modellansichten wiederverwendet
    Player.init(document.querySelector('#playpage .canvas'));

});

// Fügt das Bild eines Modells in die Liste ein und verlinkt es mit der Detailansicht.
function addModelToList(model) {
    var list = document.querySelector('#listpage .grid');
    var el = document.createElement('li');
    el.innerHTML = '<img src="' + model.thumbnail + '" class="' + ((!model.painted || Object.keys(model.painted).length < 1) ? 'new' : '') + (model.complete ? ' complete' : '') + '"/><span class="new">Neu</span><span class="complete">&#10004;</span>';
    el.addEventListener('click', function () {
        el.classList.add('progressspinner');
        showPlayModel(model);
        el.classList.remove('progressspinner');
    });
    // Beim Speichern wird eine Referenz auf das HTML Element benötigt, damit das Vorschaubild und der Status aktualisiert werden können.
    model.listEl = el;
    list.appendChild(el);
}

// Von https://staxmanade.com/2017/02/how-to-download-and-convert-an-image-to-base64-data-url/
// Blob in Base64 Zeichenkette umwandelt
async function getBase64ImageFromUrl(imageUrl) {
    var res = await fetch(imageUrl);
    var blob = await res.blob();
    return new Promise((resolve, reject) => {
        var reader = new FileReader();
        reader.addEventListener("load", function () {
            resolve(reader.result);
        }, false);
        reader.onerror = () => {
            return reject(this);
        };
        reader.readAsDataURL(blob);
    })
}

// Lädt ein Modell in den Spielemodus und zeigt die Spielseite an
// Wird asynchron ausgeführt, weil das Laden eine Weile dauern kann
function showPlayModel(model) {
    Player.loadModel(model);
    UTILS.showElement('#playpage');
}

// Wenn auf den Backbutton gedrückt wurde, woll das Modell lokal gespeichert und danach die Liste angezeigt werden
function goBack() {
    UTILS.hideElement('#playpage');
}

function resetModel() {
    console.log('CLEAR');
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
    return planeMesh;
}

// Erzeugt ein Material mit einer Farbe (wenn als Hex gegeben) oder einer Bildtexture (wenn URL angegeben)
function createStandardMaterial(hexColorOrUrl) {
    if (hexColorOrUrl.length > 7) {
        // Parameter enthält URL für Textur, z.B. https://i.imgur.com/iy50ZFn.png
        // Meine Bilder liegen bei https://hilderonny.imgur.com/all/?third_party=1
        var texture = new THREE.TextureLoader().load(hexColorOrUrl);
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.LinearMipMapLinearFilter;
        return new THREE.MeshLambertMaterial( { map: texture } );
    } else {
        return new THREE.MeshLambertMaterial( { color: hexColorOrUrl } );
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
