window.addEventListener('load', function () {

    // Lokale Modelle aus der IndexedDb laden und anzeigen
    LocalDb.listModels().then(function (localModels) {
        // Erst mal alle lokalen Modelle anzeigen
        localModels.forEach(function(localModel) {
            addModelToList(localModel);
        });
        // Anschließend Modelle vom Server laden und dabei den Ladespinner anzeigen
        showProgressBar();
        var db = firebase.database();
        // Erst mal die Metadaten aus der Datenbank holen. Id und Zeitpunkt der letzten Änderung
        db.ref('/modelmetas/').once('value').then(async function (metasnapshot) {
            // Diese Methode ist nach dem async/await Schema, weil wir nach den ganzen asynchronen Aufrufen
            // aller Modelle den Ladespinner wieder ausmachen müssen.
            var modelmetas = metasnapshot.val();
            var storage = firebase.storage(); // Storage-API zum Laden der Vorschaubilder vom Server
            var entries = Object.entries(modelmetas);
            for (var i = 0; i < entries.length; i++) {
                [id, modelmeta] = entries[i];
                // Modelle, die noch nicht veröffentlicht sind, sollen auch nicht angezeigt werden
                if (!modelmeta.published) continue;
                // Prüfen, ob das Modell bereits lokal vorhanden ist
                var localModelIndex = localModels.findIndex(function (m) { return m._id === id });
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
                var model = {
                    _id: id, // Wird als Key in lokaler IndexedDB verwendet
                    lastmodified: modelmeta.lastmodified
                };
                // Vorschaubild per Storage API laden
                var url = await storage.ref('/modelthumbnails/' + id + '.jpg').getDownloadURL();
                // Lokal wird das Vorschaubild als Base64 Zeichenkette in der IndexedDB gespeichert.
                var base64 = await getBase64ImageFromUrl(url);
                // Vorschaubild im lokalen Modell speichern.
                model.thumbnail = base64;
                // Details des Modells vom Server laden: Szene, Farbpalette, etc.
                var detailssnapshot = await db.ref('/modeldetails/' + id).once('value');
                var modeldetail = detailssnapshot.val();
                // Relevante Daten vom Server im lokalen Modell speichern
                model.scene = modeldetail.scene;
                model.pos = modeldetail.pos;
                model.colorpalette = modeldetail.colorpalette;
                model.target = modeldetail.target;
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