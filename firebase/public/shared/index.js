/** When app starts, initialize connection to firebase and local storage and load models */
window.addEventListener('DOMContentLoaded', async function () {

    // Connect to database
    var realtimedb = firebase.database();

    // Storage for thumbnails
    var storageRef = firebase.storage().ref();

    /* For reference
    async function saveModelTheNewWay(id, completeModel) {
        var modelmeta = { lastmodified: Date.now(), complete: true };
        var modeldetail = {
            colorpalette: completeModel.colorpalette,
            pos: completeModel.pos,
            scene: completeModel.scene,
            target: completeModel.target,
        };
        var modelthumbnail = completeModel.thumbnail;
        realtimedb.ref('modelmetas/' + id).set(modelmeta);
        realtimedb.ref('modeldetails/' + id).set(modeldetail);
        var fileRef = storageRef.child('modelthumbnails/' + id + '.jpg');
        await fileRef.putString(modelthumbnail, 'data_url');
        console.log(completeModel, modelmeta, modeldetail, modelthumbnail);
    }
    */

    // Prepare models
    var localModels = await LocalDb.listModels();
    try {
        // Fetch all models from database
        // TODO: Auf modelmetas, modeldetails und storage umschwenken
        var realtimeresult = await realtimedb.ref('/models/').once('value');
        // Save models in local database
        realtimeresult.forEach(function (element) {
            var modelFromServer = element.val();
            var modelId = element.key;
            //saveModelTheNewWay(modelId, modelFromServer);
            modelFromServer._id = modelId; // For local storage
            var localModelIndex = localModels.findIndex(function (m) { return m._id === modelId });
            if (localModelIndex < 0) {
                modelFromServer._id = modelId;
                modelFromServer.painted = [];
                LocalDb.saveModel(modelFromServer);
                localModels.push(modelFromServer);
            } else {
                var localModel = localModels[localModelIndex];
                if (!localModel.painted) localModel.painted = []; // painted may not be stored at server but we need it in the editor
                if (Object.keys(localModel.painted).length < 1) {
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
        el.innerHTML = '<img src="' + model.thumbnail + '" class="' + ((!model.painted || Object.keys(model.painted).length < 1) ? 'new' : '')  + (model.complete ? ' complete' : '') + '"/><span class="new">Neu</span><span class="complete">&#10004;</span>';
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