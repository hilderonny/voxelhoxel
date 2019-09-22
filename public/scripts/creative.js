// Kreativmodus
// Dieser funktioniert derzeit nur mit Netzverbindung ohne lokalen Speicher
window.addEventListener('load', function () {

    var currentModel; // Merken, um beim Zurück gehen dieses zu speichern

    // Anschließend Modelle vom Server laden und dabei den Ladespinner anzeigen
    UTILS.showElement('.progressbar');
    // Erst mal die Metadaten aus der models.json holen. Id und Zeitpunkt der letzten Änderung
    fetch('api/modelinfos', { cache: 'reload' }).then(async function (modelsresponse) {
        var allModels = [];
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
    el.innerHTML = '<img src="' + model.thumbnail + '"/>';
    el.addEventListener('click', function () {
        el.classList.add('progressspinner');
        showEditModel(model);
        el.classList.remove('progressspinner');
    });
    list.appendChild(el);
}

// Lädt ein Modell in den Kreativmodus und zeigt die Editierseite an
// Wird asynchron ausgeführt, weil das Laden eine Weile dauern kann
function showEditModel(model) {
    currentModel = model;
    Editor.loadModel(model);
    UTILS.showElement('#editpage');
    // Hinzufügen Modus vorauswählen
    document.querySelector('#editpage .toolbar .addmode').click();
}

// Wenn auf den Backbutton gedrückt wurde, prüfen, ob es Änderungen gibt und ob diese verworfen werden sollen
async function goBack() {
    currentModel = undefined;
    UTILS.hideElement('#editpage');
}
