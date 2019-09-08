// Fügt das Bild eines Modells in die Liste ein und verlinkt es mit der Detailansicht.
function addModelToList(model) {
    var list = document.querySelector('#listpage .grid');
    var el = document.createElement('li');
    el.innerHTML = '<img src="' + model.thumbnail + '" class="' + ((!model.painted || Object.keys(model.painted).length < 1) ? 'new' : '') + (model.complete ? ' complete' : '') + '"/><span class="new">Neu</span><span class="complete">&#10004;</span>';
    el.addEventListener('click', function () {
        showPlayModel(model);
    });
    // Beim Speichern wird eine Referenz auf das HTML Element benötigt, damit das Vorschaubild und der Status aktualisiert werden können.
    model.listEl = el;
    list.appendChild(el);
}

// Von https://staxmanade.com/2017/02/how-to-download-and-convert-an-image-to-base64-data-url/
// Blob in Base64 Zeichenkette umwandelt
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

// Lädt ein Modell in den Spielemodus und zeigt die Spielseite an
function showPlayModel(model) {
    // TODO: Modell laden
    showPage('playpage');
}

// Wenn auf den Backbutton gedrückt wurde, woll das Modell lokal gespeichert und danach die Liste angezeigt werden
function goBack() {
    hidePage('playpage');
}

function showPage(pageId) {
    document.getElementById(pageId).classList.remove('invisible');
}

function hidePage(pageId) {
    document.getElementById(pageId).classList.add('invisible');
}

function showProgressBar() {
    document.querySelector('.progressbar').classList.remove('invisible');
}

function hideProgressBar() {
    document.querySelector('.progressbar').classList.add('invisible');
}
