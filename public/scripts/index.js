window.addEventListener('load', function () {

    // Lokale Modelle aus der IndexedDb laden und anzeigen
    LocalDb.listModels().then(function (localModels) {
        console.log(localModels);
        // TODO: Anzeigen

        // Anschließend Modelle vom Server laden und dabei den Ladespinner anzeigen
        

    });

});