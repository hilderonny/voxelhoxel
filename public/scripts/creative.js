var currentModel; // Merken, um beim Zurück gehen dieses zu speichern
var allModels = []; // Liste aller Modelle

// Kreativmodus
// Dieser funktioniert derzeit nur mit Netzverbindung ohne lokalen Speicher
window.addEventListener('load', function () {

    // Anschließend Modelle vom Server laden und dabei den Ladespinner anzeigen
    UTILS.showElement('.progressbar');
    // Erst mal die Metadaten aus der models.json holen. Id und Zeitpunkt der letzten Änderung
    fetch('api/modelinfos', { cache: 'reload' }).then(async function (modelsresponse) {
        var modelmetas = await modelsresponse.json();
        // Diese Methode ist nach dem async/await Schema, weil wir nach den ganzen asynchronen Aufrufen
        // aller Modelle den Ladespinner wieder ausmachen müssen.
        for (var i = 0; i < modelmetas.length; i++) {
            var modelmeta = modelmetas[i];
            // Modelle, die noch nicht veröffentlicht sind, sollen auch nicht angezeigt werden
            if (!modelmeta.published) continue;
            // Detaillierte Modellinfos vom Server laden
            var modeldetailresponse = await fetch('/api/modeldetails/' + modelmeta.modelid, { cache: 'reload' });
            var model = await modeldetailresponse.json();
            model._id = modelmeta.modelid;
            model.lastmodified = modelmeta.lastmodified;
            // An dieser Stelle ist das Modell vom Server fertig geladen.
            // Es ist noch nicht in der lokalen Datenbank, also speichern wir es dort rein.
            allModels.push(model);
        }
        // Alle Modelle sortiert nach letztem Änderungsdatum anzeigen
        allModels.sort(function (a, b) { return a.lastmodified < b.lastmodified ? 1 : -1; }).forEach(function (model) {
            addModelToList(model);
        });
        UTILS.hideElement('.progressbar');
    });

    // Editor initialisieren. Der wird in allen Modellansichten wiederverwendet
    Editor.init(document.querySelector('#editpage .canvas'));
});

// Fügt das Bild eines Modells in die Liste ein und verlinkt es mit der Detailansicht.
function addModelToList(model) {
    var list = document.querySelector('#listpage .grid');
    var el = document.createElement('li');
    el.setAttribute('id', 'model_' + model._id);
    el.model = model;
    el.innerHTML = '<img src="' + model.thumbnail + '"/>';
    el.addEventListener('click', function () {
        el.classList.add('progressspinner');
        showEditModel(el.model); // Aus Element auslesen, weil es durch Speichern zwischendurch aktualisiert sein kann
        el.classList.remove('progressspinner');
    });
    list.appendChild(el);
}

// Lädt ein Modell in den Kreativmodus und zeigt die Editierseite an
// Wird asynchron ausgeführt, weil das Laden eine Weile dauern kann
function showEditModel(model) {
    currentModel = model;
    setupColorBar(model);
    Editor.loadModel(model);
    UTILS.showElement('#editpage');
    // Erste Farbe vorauswählen
    document.querySelector('#editpage .colorbar input').click();
    // Hinzufügen Modus vorauswählen
    document.querySelector('#editpage .toolbar .addmode').click();
    // Resize Event triggern, damit die Colorbar richtig skaliert wird
    window.dispatchEvent(new Event('resize'));
}

// Wenn auf den Backbutton gedrückt wurde, prüfen, ob es Änderungen gibt und ob diese verworfen werden sollen
async function goBack() {
    currentModel = undefined;
    UTILS.hideElement('#editpage');
}

// Füllt die Farbpalette mit den gegebenen Farben und Texturen
// Wenn die Farbe länger als 9 Zeichen ist, wird sie als Textur-URL interpretiert
function setupColorBar() {
    var colorbar = document.querySelector('#editpage .content .colorbar');
    colorbar.innerHTML = '';
    currentModel.colorpalette.forEach(function (colorOrUrl, index) {
        var label = document.createElement('label');
        label.innerHTML = '<input type="radio" name="colorbarinput" value="' + index + '"/><span>' + (index + 1) + '</span>';
        label.querySelector('input').addEventListener('change', function (evt) {
            var paletteIndex = parseInt(evt.target.value);
            Editor.selectColor(paletteIndex);
        });
        if (colorOrUrl.length < 10) {
            label.style.backgroundColor = colorOrUrl;
        } else {
            label.style.backgroundImage = 'url(' + colorOrUrl + ')';
        }
        colorbar.appendChild(label);
    });
}

// Zeigt den Farbänder-Dialog an
function showChangeColorDialog() {
    var input = document.querySelector('#changecolordialog input');
    var color = currentModel.colorpalette[document.querySelector('#editpage .content .colorbar input:checked').value];
    input.value = color;
    UTILS.showElement('#changecolordialog');
    input.focus();
    input.select();
}

// Ändert die aktuell gewählte Farbe durch den Dialog und schließt den Dialog
function changeColor() {
    var color = document.querySelector('#changecolordialog input').value;
    Editor.setPaletteColor(color);
    var label = document.querySelector('#editpage .content .colorbar input:checked').parentNode;
    if (color.length < 10) {
        label.style.backgroundColor = color;
    } else {
        label.style.backgroundImage = 'url(' + color + ')';
    }
    UTILS.hideElement('#changecolordialog');
}

// Speichert das Modell auf dem Server.
// Dazu wird das Thumbnail aktualisiert, das Änderungsdatum geändert und die Listenansicht aktualisiert
async function save() {
    var index = allModels.indexOf(currentModel);
    currentModel = Editor.getCurrentModel();
    currentModel.thumbnail = Editor.makeScreenshot();
    await fetch('/api/savemodel/' + currentModel._id, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(currentModel)    
    });
    // Modelliste aktualisieren
    allModels[index] = currentModel;
    document.querySelector('#listpage .grid li[id=model_' + currentModel._id + ']').model = currentModel;
    document.querySelector('#listpage .grid li[id=model_' + currentModel._id + '] img').src = currentModel.thumbnail;
    alert('Modell gespeichert.');
}

// Setzt den Status des Modells auf veröffentlicht.
async function publish() {
    Editor.getCurrentModel().published = 1;
    await save();
}