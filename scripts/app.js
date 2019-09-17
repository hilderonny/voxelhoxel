window.addEventListener('load', function () {

    // Lokale Modelle aus der IndexedDb laden und anzeigen
    // Das wird bewusst mit then() ausgeführt, damit weiter unten während des Ladens die Liste bereits angezeigt werden kann
    LocalDb.listModels().then(async function (localModels) {
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
            }
            // Alle Modelle sortiert nach letztem Änderungsdatum anzeigen
            localModels.sort(function(a, b) { return a.lastmodified > b.lastmodified ? 1 : -1; }).forEach(function(localModel) {
                addModelToList(localModel);
            });
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

// Lädt ein Modell in den Spielemodus und zeigt die Spielseite an
// Wird asynchron ausgeführt, weil das Laden eine Weile dauern kann
function showPlayModel(model) {
    Player.loadModel(model);
    // Farbpalette erstellen
    setupColorBar(model);
    UTILS.showElement('#playpage');
}

// Füllt die Farbpalette mit den gegebenen Farben und Texturen
// Wenn die Farbe länger als 9 Zeichen ist, wird sie als Textur-URL interpretiert
// Es werden nur die Farben angezeigt, die auch verwendet werden
// Hier gehört auch der Farbzähler dazu
function setupColorBar(model) {
    // Farben zählen
    var colorsUsed = {};
    Object.values(model.scene).forEach(function(z) {
        Object.values(z).forEach(function(y) {
            Object.values(y).forEach(function(paletteIndex) {
                colorsUsed[paletteIndex] = colorsUsed[paletteIndex] ? colorsUsed[paletteIndex] + 1 : 1;
            });
        });
    });
    var colorbar = document.querySelector('#playpage .content .colorbar');
    colorbar.innerHTML = '';
    var labels = {};
    model.colorpalette.forEach(function(colorOrUrl, index) {
        if (!colorsUsed[index]) return;
        var label = document.createElement('label');
        label.innerHTML = '<input type="radio" name="colorbarinput" value="' + index + '"/><span>' + (index + 1) + '</span>';
        label.querySelector('input').addEventListener('change', function(evt) {
            var paletteIndex = parseInt(evt.target.value);
            Player.selectColor(paletteIndex);
        });
        if (colorOrUrl.length < 10) {
            label.style.backgroundColor = colorOrUrl;
        } else {
            label.style.backgroundImage = 'url(' + colorOrUrl + ')';
        }
        colorbar.appendChild(label);
        labels[index] = label;
    });
    var colorCount = Object.values(colorsUsed).reduce(function(a, b) { return a + b; });
    // Event handler für ausgemalte Boxen zum runterzählen
    Player.onBoxPainted = function(paletteIndex) {
        colorsUsed[paletteIndex]--;
        colorCount--;
        if (colorsUsed[paletteIndex] < 1) {
            labels[paletteIndex].classList.add('complete');
        }
        if (colorCount < 1) {
            document.querySelector('#playpage .content > .complete').classList.remove('invisible');
        }
    }
}

// Wenn auf den Backbutton gedrückt wurde, woll das Modell lokal gespeichert und danach die Liste angezeigt werden
function goBack() {
    UTILS.hideElement('#playpage');
}

function resetModel() {
    console.log('CLEAR');
}

// Erzeugt ein Material mit einer Farbe (wenn als Hex gegeben) oder einer Bildtexture (wenn URL angegeben)
function createStandardMaterial(hexColorOrUrl) {
    if (hexColorOrUrl.length > 9) { // Hexadezimal mit Transparenz
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
