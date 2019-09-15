window.addEventListener('load', function () {

    // Lokale Modelle aus der IndexedDb laden und anzeigen
    // Das wird bewusst mit then() ausgeführt, damit weiter unten während des Ladens die Liste bereits angezeigt werden kann
    LocalDb.listModels().then(async function (localModels) {
        // Erst mal alle lokalen Modelle anzeigen
        localModels.forEach(function(localModel) {
            addModelToList(localModel);
        });
        // Anschließend Modelle vom Server laden und dabei den Ladespinner anzeigen
        showProgressBar();
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
            hideProgressBar();
        });
    });

    // Player initialisieren. Der wird in allen Modellansichten wiederverwendet
    Player.init(document.querySelector('#playpage .canvas'));

});
