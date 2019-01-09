
var localModels;

document.addEventListener('deviceready', async function () {

    localModels = await LocalDb.listModels();

    try {
        const modelsFromServer = await get('https://www.voxelhoxel.de/api/publishedModels');
        // Save models in local database
        for (var i = 0; i < modelsFromServer.length; i++) {
            const model = modelsFromServer[i];
            const localModelIndex = localModels.findIndex(function (m) { return m._id === model._id });
            if (localModelIndex < 0) {
                const modelFromServer = await get('https://www.voxelhoxel.de/api/model/' + model._id);
                LocalDb.saveModel(modelFromServer);
                localModels.push(modelFromServer);
            } else {
                const localModel = localModels[localModelIndex];
                if (Object.keys(localModel.painted).length < 1 && (!localModel.version || model.version > localModel.version)) {
                    const modelFromServer = await get('https://www.voxelhoxel.de/api/model/' + model._id);
                    LocalDb.saveModel(modelFromServer);
                    localModels[localModelIndex] = modelFromServer;
                }
            }
        }
    } catch (ex) {
        console.log('We are offline because ', ex);
    }

    const list = document.querySelector('.list');
    localModels.sort(function (a, b) {
        if (a.complete && !b.complete) return 1;
        if (!a.complete && b.complete) return -1;
        return 0;
    });
    localModels.forEach(function (model) {
        const el = document.createElement('div');
        if (Object.keys(model.painted).length < 1) {
            el.innerHTML = '<img src="' + model.thumbnail + '" style="filter:grayscale(100%);"/><span class="new">Neu</span>';
        } else {
            el.innerHTML = '<img src="' + model.thumbnail + '"/>' + (model.complete ? '<span class="complete">&#10004;</span>' : '');
        }
        el.addEventListener('click', function () {
            location.href = 'play.html?_id=' + model._id;
        });
        list.appendChild(el);
    });

});


/*
var app = {
    // Application Constructor
    initialize: function() {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
    },

    // deviceready Event Handler
    //
    // Bind any cordova events here. Common events are:
    // 'pause', 'resume', etc.
    onDeviceReady: function() {
        this.receivedEvent('deviceready');
    },

    // Update DOM on a Received Event
    receivedEvent: function(id) {
        var parentElement = document.getElementById(id);
        var listeningElement = parentElement.querySelector('.listening');
        var receivedElement = parentElement.querySelector('.received');

        listeningElement.setAttribute('style', 'display:none;');
        receivedElement.setAttribute('style', 'display:block;');

        console.log('Received Event: ' + id);
    }
};

app.initialize();
*/