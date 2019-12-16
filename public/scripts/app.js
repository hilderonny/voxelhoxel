var currentModel, currentEl, localModels;

window.addEventListener('load', function () {
    // Lokale Modelle aus der IndexedDb laden und anzeigen
    // Das wird bewusst mit then() ausgeführt, damit weiter unten während des Ladens die Liste bereits angezeigt werden kann
    return LocalDb.listModels().then(function (models) {
        localModels = models;
        // Anschließend Modelle vom Server laden und dabei den Ladespinner anzeigen
        UTILS.showElement('.progressbar');
        // Erst mal die Metadaten holen, dabei nur veröffentlichte beachten. Id und Zeitpunkt der letzten Änderung
        return fetch('api/modelinfos/published', { cache: 'reload' });
    }).then(function (modelsresponse) {
        return modelsresponse.json();
    }).then(function (modelmetas) {
        var promises = [];
        for (var i = 0; i < modelmetas.length; i++) {
            var modelmeta = modelmetas[i];
            // Modelle, die noch nicht veröffentlicht sind, sollen auch nicht angezeigt werden
            if (!modelmeta.published) continue;
            // Prüfen, ob das Modell bereits lokal vorhanden ist
            var localModelIndex = localModels.findIndex(function (m) { return m._id === modelmeta.modelid });
            if (localModelIndex >= 0) {
                var localModel = localModels[localModelIndex];
                localModel.modelmeta = modelmeta; // Muss sein für vorhergehende Versionen
                // Wenn das lokale Modell genauso alt ist oder bereits daran gemalt wurde, soll das lokale genommen werden
                if ((localModel.painted && localModel.painted.length > 0) || (localModel.lastmodified >= modelmeta.lastmodified)) {
                    continue;
                }
            }
            // Hier gibt es entweder kein lokales Modell, oder es wurde noch nicht bearbeitet und auf dem Server gibt es ein Update.
            // In diesem Falle soll es erneut vom Server geladen werden.
            promises.push(loadModelDetails(modelmeta).then(function (model) {
                localModels.push(model);
            }));
        }
        return Promise.all(promises);
    }).then(function () {
        // Alle Modelle sortiert nach letztem Änderungsdatum anzeigen
        localModels.sort(function (a, b) { return a.lastmodified < b.lastmodified ? 1 : -1; }).forEach(function (localModel) {
            addModelToList(localModel);
        });
        UTILS.hideElement('.progressbar');
        // Player initialisieren. Der wird in allen Modellansichten wiederverwendet
        Player.init(document.querySelector('#playpage .canvas'));
    });
});

// Lädt Modelldetails vom Server
function loadModelDetails(modelmeta) {
    var model;
    // Detaillierte Modellinfos vom Server laden
    return fetch('/api/modeldetails/' + modelmeta.modelid, { cache: 'reload' }).then(function (modeldetailresponse) {
        return modeldetailresponse.json();
    }).then(function (m) {
        model = m;
        // Das hier kommt aus der modelsinfos und steckt in den einzelnen Modelldateien nicht drin. Wird aber für Local Storage benötigt
        model._id = modelmeta.modelid;
        model.lastmodified = modelmeta.lastmodified;
        model.modelmeta = modelmeta;
        // An dieser Stelle ist das Modell vom Server fertig geladen.
        // Es ist noch nicht in der lokalen Datenbank, also speichern wir es dort rein.
        return LocalDb.saveModel(model);
    }).then(function () {
        return model;
    });
}

// Fügt das Bild eines Modells in die Liste ein und verlinkt es mit der Detailansicht.
function addModelToList(model) {
    var list = document.querySelector('#listpage .grid');
    var el = document.createElement('li');
    el.setAttribute('id', 'model_' + model._id);
    if (model.lastmodified <= model.modelmeta.lastmodified && (!model.painted || Object.keys(model.painted).length < 1)) el.classList.add('new');
    el.innerHTML = '<img src="' + model.thumbnail + '" class="' + (model.complete ? ' complete' : '') + '"/><span class="new">Neu</span><span class="complete">&#10004;</span>';
    el.model = model;
    el.addEventListener('click', function () {
        currentEl = el;
        el.classList.add('progressspinner');
        showPlayModel(el.model); // Muss von hier genmommen werden, da es beim Reset aktualisiert wird
    });
    list.appendChild(el);
}

function showCurrentModel() {
    currentEl.classList.remove('progressspinner');
    // Farbpalette erstellen, muss vor dem Modell erstellen geschehen, um die bereits gemalten Farben zu erkennen
    setupColorBar(currentModel);
    Player.loadModel(currentModel);
    // Erste Farbe selektieren
    document.querySelector('#playpage .content .colorbar input').click();
    UTILS.showElement('#playpage');
    // Resize Event triggern, damit die Colorbar richtig skaliert wird
    window.dispatchEvent(new Event('resize'));
}

// Lädt ein Modell in den Spielemodus und zeigt die Spielseite an
function showPlayModel(model) {
    currentModel = model;
    showCurrentModel();
}

// Füllt die Farbpalette mit den gegebenen Farben und Texturen
// Wenn die Farbe länger als 9 Zeichen ist, wird sie als Textur-URL interpretiert
// Es werden nur die Farben angezeigt, die auch verwendet werden
// Hier gehört auch der Farbzähler dazu
function setupColorBar(model) {
    // Vollständig Marker erst mal ausblenden
    document.querySelector('#playpage .content > .complete').classList.add('invisible');
    // Farben zählen
    var colorsUsed = {};
    Object.values(model.scene).forEach(function (z) {
        Object.values(z).forEach(function (y) {
            Object.values(y).forEach(function (paletteIndex) {
                colorsUsed[paletteIndex] = colorsUsed[paletteIndex] ? colorsUsed[paletteIndex] + 1 : 1;
            });
        });
    });
    var colorbar = document.querySelector('#playpage .content .colorbar');
    colorbar.innerHTML = '';
    var labels = {};
    model.colorpalette.forEach(function (colorOrUrl, index) {
        if (!colorsUsed[index]) return;
        var label = document.createElement('label');
        label.innerHTML = '<input type="radio" name="colorbarinput" value="' + index + '"/><span>' + (index + 1) + '</span>';
        label.querySelector('input').addEventListener('change', function (evt) {
            var paletteIndex = parseInt(evt.target.value);
            Player.selectColor(paletteIndex);
            document.querySelector('#playpage .content > .colorcounter .number').innerHTML = colorsUsed[index];
            var counterColorBubble = document.querySelector('#playpage .content > .colorcounter .color');
            if (colorOrUrl.length < 10) {
                counterColorBubble.style.backgroundImage = '';
                counterColorBubble.style.backgroundColor = colorOrUrl;
            } else {
                counterColorBubble.style.backgroundColor = '';
                counterColorBubble.style.backgroundImage = 'url(' + colorOrUrl + ')';
            }
        });
        if (colorOrUrl.length < 10) {
            label.style.backgroundColor = colorOrUrl;
        } else {
            label.style.backgroundImage = 'url(' + colorOrUrl + ')';
        }
        colorbar.appendChild(label);
        labels[index] = label;
    });
    var colorCount = Object.values(colorsUsed).reduce(function (a, b) { return a + b; });
    // Event handler für ausgemalte Boxen zum runterzählen
    Player.onBoxPainted = function (box) {
        // Modell aktualisieren
        var userData = box.userData;
        var x = userData.x;
        var y = userData.y;
        var z = userData.z;
        if (!model.painted) model.painted = {};
        if (!model.painted[z]) model.painted[z] = {};
        if (!model.painted[z][y]) model.painted[z][y] = {};
        model.painted[z][y][x] = 1; // 1 braucht weniger Speicherplatz als true
        // Farben herunter zählen
        var paletteIndex = userData.paletteIndex;
        colorsUsed[paletteIndex]--;
        colorCount--;
        var currentColorCount = colorsUsed[paletteIndex];
        if (currentColorCount < 1) {
            labels[paletteIndex].classList.add('complete');
        }
        if (colorCount < 1) {
            model.complete = true;
            document.querySelector('#playpage .content > .complete').classList.remove('invisible');
        }
        document.querySelector('#playpage .content > .colorcounter .number').innerHTML = currentColorCount;
    }
}

// Wenn auf den Backbutton gedrückt wurde, woll das Modell lokal gespeichert und danach die Liste angezeigt werden
function goBack() {
    return (function() {
        // Speichern nur, wenn bereits gemalt wurde
        if (currentModel.painted) {
            // Thumbnail erstellen
            currentModel.thumbnail = Player.makeScreenshot();
            // Letzte Änderung
            currentModel.lastmodified = Date.now();
            // Modell lokal speichern
            return LocalDb.saveModel(currentModel).then(function () {
                // Thumbnail auf Liste aktualisieren
                var listtag = document.querySelector('#model_' + currentModel._id);
                var imagetag = listtag.querySelector('img');
                imagetag.setAttribute('src', currentModel.thumbnail);
                listtag.classList.remove('new'); // Gemalt ist halt nicht neu
                // Vervollständigung in Liste anzeigen
                if (currentModel.complete) listtag.classList.add('complete');
            });
        }
        return Promise.resolve();
    })().then(function () {
        // Spieleseite verbergen
        currentModel = undefined;
        UTILS.hideElement('#playpage');
    });
}

function doResetModel() {
    return loadModelDetails(currentModel.modelmeta).then(function(model) {
        localModels.splice(localModels.findIndex(function(m) { return m._id === model._id; }), 1, model);
        var listtag = document.querySelector('#model_' + model._id);
        listtag.classList.add('new');
        listtag.model = model; // Für das Listenklicken wichtig, damit nicht das alte Modell genommen wird
        var imagetag = listtag.querySelector('img');
        imagetag.setAttribute('src', model.thumbnail);
        listtag.classList.remove('complete');
        showPlayModel(model); // Einfach neu laden
    });
}

// Leert das Modell indem alle gemalten Teile vergessen und das Modell neu geladen wird.
function resetModel() {
    if (confirm('Soll das Modell wirklich geleert werden?')) doResetModel();
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
