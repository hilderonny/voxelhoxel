function addModelToList(model) {
    var list = document.querySelector('v-play-list .list');
    var el = document.createElement('div');
    el.innerHTML = '<img src="' + model.thumbnail + '" class="' + ((!model.painted || Object.keys(model.painted).length < 1) ? 'new' : '') + (model.complete ? ' complete' : '') + '"/><span class="new">Neu</span><span class="complete">&#10004;</span>';
    el.addEventListener('click', function () {
        showPlayModel(model);
    });
    model.listEl = el; // For later reference;
    list.appendChild(el);
}

// From https://staxmanade.com/2017/02/how-to-download-and-convert-an-image-to-base64-data-url/
async function getBase64ImageFromUrl(imageUrl) {
    var res = await fetch(imageUrl);
    var blob = await res.blob();

    return new Promise((resolve, reject) => {
        var reader = new FileReader();
        reader.addEventListener("load", function () {
            resolve(reader.result);
        }, false);

        reader.onerror = () => {
            return reject(this);
        };
        reader.readAsDataURL(blob);
    })
}

window.addEventListener('DOMContentLoaded', function () {

    // Load local models asynchronously
    LocalDb.listModels().then(function (localModels) {
        // Load models from server asynchronously
        var models = {};
        var db = firebase.database();
        var storage = firebase.storage();
        db.ref('/modelmetas/').once('value').then(function (metasnapshot) {
            var modelmetas = metasnapshot.val();
            Object.entries(modelmetas).forEach(function ([id, modelmeta]) {
                if (!modelmeta.published) return; // Show only published models
                // Compare server model to local one
                var localModelIndex = localModels.findIndex(function (m) { return m._id === id });
                if (localModelIndex >= 0) {
                    // There is a local model
                    var localModel = localModels[localModelIndex];
                    if ((localModel.painted && localModel.painted.length > 0) || (localModel.lastmodified >= modelmeta.lastmodified)) {
                        // When the local model is already painted, or local model is newer, ignore the server model and use the local one
                        addModelToList(localModel);
                        return;
                    }
                }
                // Load detailed model data from server
                var model = { _id: id, lastmodified: modelmeta.lastmodified }; // The model must have a property "_id" for storing into local IndexDB, see localdb.js:7
                models[id] = model;
                // Fetch model thumbnail
                storage.ref('/modelthumbnails/' + id + '.jpg').getDownloadURL().then(function (url) {
                    // Load the thumbnail image
                    getBase64ImageFromUrl(url).then(function (base64) {
                        model.thumbnail = base64;
                        // Fetch model details
                        db.ref('/modeldetails/' + id).once('value').then(function (detailssnapshot) {
                            var modeldetail = detailssnapshot.val();
                            model.scene = modeldetail.scene;
                            model.pos = modeldetail.pos;
                            model.colorpalette = modeldetail.colorpalette;
                            model.target = modeldetail.target;
                            // Model is fully loaded here, store it locally
                            LocalDb.saveModel(model);
                            localModels.push(model);
                            // Now model is ready to be shown in list
                            addModelToList(model);
                        });
                    });
                });
            });
        });
    });

    // Prepare play editor
    var colorbar = document.querySelector('v-play-normal v-colorbar');
    colorbar.addEventListener('touchmove', function (e) { e.stopPropagation() }, false);
    var renderer = Editor.init({
        colorbar: colorbar,
        colorcounternumber: document.querySelector('v-play-normal v-colorcounternumber'),
        colorcounterblock: document.querySelector('v-play-normal v-colorcounterblock'),
        completion: document.querySelector('v-play-normal .completion')
    });
    document.querySelector('v-play-normal v-rendering').appendChild(renderer.domElement);
    Editor.start();

});

/** When app starts, initialize connection to firebase and local storage and load models */
window.addEventListener('DOMContentLoadedXYZ', async function () {

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
        var modelmetas = await realtimedb.ref('/modelmetas/').once('value');
        modelmetas.forEach(function (result) {
            var id = result.key;
            var modelmeta = result.val();
            console.log(modelmeta);
        });
        /*
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
        */
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
        el.innerHTML = '<img src="' + model.thumbnail + '" class="' + ((!model.painted || Object.keys(model.painted).length < 1) ? 'new' : '') + (model.complete ? ' complete' : '') + '"/><span class="new">Neu</span><span class="complete">&#10004;</span>';
        el.addEventListener('click', function () {
            showPlayModel(model);
        });
        model.listEl = el; // For later reference;
        list.appendChild(el);
    });

    // Prepare play editor
    var colorbar = document.querySelector('v-play-normal v-colorbar');
    colorbar.addEventListener('touchmove', function (e) { e.stopPropagation() }, false);
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