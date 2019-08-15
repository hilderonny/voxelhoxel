/** When app starts, initialize connection to firebase and local storage and load models */
window.addEventListener('DOMContentLoaded', async function () {

    // Connect to database
    var db = firebase.firestore();
    // Enable offline caching of models
    await db.enablePersistence();

    // Prepare models
    var localModels = await LocalDb.listModels();
    try {
        // Fetch all models from database
        var result = await db.collection('models').get();
        // Save models in local database
        result.forEach(function (element) {
            var modelFromServer = element.data();
            var modelId = modelFromServer._id;
            var localModelIndex = localModels.findIndex(function (m) { return m._id === modelId });
            if (localModelIndex < 0) {
                LocalDb.saveModel(modelFromServer);
                localModels.push(modelFromServer);
            } else {
                var localModel = localModels[localModelIndex];
                if (Object.keys(localModel.painted).length < 1 && localModel.version !== modelFromServer.version) {
                    LocalDb.saveModel(modelFromServer);
                    localModels[localModelIndex] = modelFromServer;
                }
            }
        });
    } catch (ex) {
        console.log('We are offline because ', ex);
    }

    // Fill play model list
    const list = document.querySelector('v-play-list .list');
    localModels.sort(function (a, b) {
        if (a.complete && !b.complete) return 1;
        if (!a.complete && b.complete) return -1;
        return 0;
    });
    localModels.forEach(function (model) {
        const el = document.createElement('div');
        el.innerHTML = '<img src="' + model.thumbnail + '" class="' + ((Object.keys(model.painted).length < 1) ? 'new' : '')  + (model.complete ? ' complete' : '') + '"/><span class="new">Neu</span><span class="complete">&#10004;</span>';
        el.addEventListener('click', function () {
            showPlayModel(model);
        });
        model.listEl = el; // For later reference;
        list.appendChild(el);
    });

    // Prepare play editor
    var colorbar = document.querySelector('v-play-normal v-colorbar');
    colorbar.addEventListener('touchmove', function(e){e.stopPropagation()}, false);
    var renderer = Editor.init({
        colorbar: colorbar,
        colorcounternumber: document.querySelector('v-play-normal v-colorcounternumber'),
        colorcounterblock: document.querySelector('v-play-normal v-colorcounterblock'),
        completion: document.querySelector('v-play-normal .completion')
    });
    document.querySelector('v-play-normal v-rendering').appendChild(renderer.domElement);
    Editor.start();
});

// Show the list of playable models
function showPlayList(model) {
    document.body.setAttribute('class', 'play-list');
    if (model) {
        // We came from playing and need to update the thumbnail and classes
        var img = model.listEl.querySelector('img');
        img.setAttribute('src', model.thumbnail);
        if (Object.keys(model.painted).length > 0) img.classList.remove('new');
        if (model.complete) {
            img.classList.add('complete');
        } else {
            img.classList.remove('complete');
        }
    }
}

// Play a model
async function showPlayModel(model) {
    Editor.setMode('play');
    document.body.setAttribute('class', 'play-normal');
    Editor.loadModel(model);
}