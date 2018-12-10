
// Palette by Arne http://androidarts.com/palette/Famicube.htm
const palette64 = ['#000000', '#00177D', '#024ACA', '#0084FF', '#5BA8FF', '#98DCFF', '#9BA0EF', '#6264DC', '#3D34A5', '#211640', '#5A1991', '#6A31CA', '#A675FE', '#E2C9FF', '#FEC9ED', '#D59CFC', '#CC69E4', '#A328B3', '#871646', '#CF3C71', '#FF82CE', '#FFE9C5', '#F5B784', '#E18289', '#DA655E', '#823C3D', '#4F1507', '#E03C28', '#E2D7B5', '#C59782', '#AE6C37', '#5C3C0D', '#231712', '#AD4E1A', '#F68F37', '#FFE737', '#FFBB31', '#CC8F15', '#939717', '#B6C121', '#EEFFA9', '#BEEB71', '#8CD612', '#6AB417', '#376D03', '#172808', '#004E00', '#139D08', '#58D332', '#20B562', '#00604B', '#005280', '#0A98AC', '#25E2CD', '#BDFFCA', '#71A6A1', '#415D66', '#0D2030', '#151515', '#343434', '#7B7B7B', '#A8A8A8', '#D7D7D7', '#FFFFFF'];
const dbName = 'voxelhoxel', collectionName = 'models';

var arrangeClient, listLoginForm, listRegisterForm, list, listToolbar, rendering, toolbar, colorpalette, colorbar, user, _id, model;


/******* LISTE **********/

async function login() {
    // For login password store we need an iframe hack: https://gist.github.com/kostiklv/968927
    document.getElementById('loginfailed').style.display = 'none';
    const username = listLoginForm.querySelector('[name="username"]').value;
    const password = listLoginForm.querySelector('[name="password"]').value;
    const loginResult = await arrangeClient.login('voxelhoxel', username, password);
    if (!loginResult._id) {
        document.getElementById('loginfailed').style.display = 'initial';
    } else {
        user = loginResult;
        showList();
    }
}

async function register() {
    const rf1 = document.getElementById('registrationfailed1');
    const rf2 = document.getElementById('registrationfailed2');
    rf1.style.display = 'none';
    rf2.style.display = 'none';
    const username = listRegisterForm.querySelector('[name="username"]').value;
    const password1 = listRegisterForm.querySelector('[name="password1"]').value;
    const password2 = listRegisterForm.querySelector('[name="password2"]').value;
    if (!password1 || !password2 || password1 !== password2) {
        rf2.style.display = 'initial';
        return;
    }
    const registerResult = await arrangeClient.register('voxelhoxel', username, password1);
    if (!registerResult._id) {
        rf1.style.display = 'initial';
    } else {
        user = registerResult;
        showList();
    }
}

function goBack() {
    if (model) {
        showList();
    } else if (user) {
        location.reload();
    } else {
        location.href = '../';
    }
}

async function showList() {
    model = null;
    const models = await arrangeClient.search('voxelhoxel', 'models', { _ownerId: user._id }, '_id name thumbnail isPublished');
    list.innerHTML = "";
    models.forEach(function (model) {
        const el = document.createElement('div');
        if (model.isPublished) {
            el.innerHTML = '<img src="' + model.thumbnail + '" /><span class="published">Veröffentlicht</span>';
        } else {
            el.innerHTML = '<img src="' + model.thumbnail + '"/>';
        }
        el.addEventListener('click', function () {
            showModel(model._id);
        });
        list.appendChild(el);
    });
    listLoginForm.style.display = 'none';
    listRegisterForm.style.display = 'none';
    list.style.display = 'block';
    listToolbar.style.display = 'flex';
    rendering.style.display = 'none';
    toolbar.style.display = 'none';
    colorpalette.classList.remove('visible');
    colorbar.style.display = 'none';
}

function showRegistrationForm() {
    listLoginForm.style.display = 'none';
    listRegisterForm.style.display = 'flex';
}

/******* EDITOR **********/

async function showModel(id) {
    if (id) {
        _id = id;
        model = await arrangeClient.read(dbName, collectionName, id);
    } else {
        _id = null;
        model = {
            colorpalette: ['#000000', '#000080', '#008000', '#008080', '#800000', '#800080', '#808000', '#C0C0C0', '#808080', '#0000FF', '#00FF00', '#00FFFF', '#FF0000', '#FF00FF', '#FFFF00', '#FFFFFF'],
            pos: { x: 2, y: 4, z: 5 },
            target: { x: 0, y: 0, z: 0 },
            scene: { 0: { 0: { 0: 0 } } },
            painted: {},
            complete: false,
            version: 1
        };
    };

    listLoginForm.style.display = 'none';
    listRegisterForm.style.display = 'none';
    list.style.display = 'none';
    listToolbar.style.display = 'none';
    rendering.style.display = 'flex';
    toolbar.style.display = model.isPublished ? 'none' : 'flex';
    colorpalette.classList.remove('visible');
    colorbar.style.display = 'flex';

    const renderer = Editor.init();
    rendering.innerHTML = "";
    rendering.appendChild(renderer);

    Editor.loadModel(model);
    createColorPalette();
    createColorBar();

    setMode('add');
    document.getElementsByName('mode')[2].checked = 'checked';
    selectColor(0);

    Editor.start();

}

function createColorBar() {
    colorbar.innerHTML = "";
    model.colorpalette.forEach(function (color, index) {
        colorbar.innerHTML += '<label><input type="radio" name="color"' + (index === 0 ? ' checked' : '') + ' onchange="selectColor(' + index + ');" /><div style="background-color:' + color + '">' + index + '</div></label>';
    });
}

function createColorPalette() {
    colorpalette.innerHTML = "";
    palette64.forEach(function (color, index) {
        colorpalette.innerHTML += '<label><input type="radio" name="colorpalette"' + (index === 0 ? ' checked' : '') + ' onchange="setPaletteColor(' + index + ');" /><div style="background-color:' + color + '"></div></label>';
    });
}

async function deleteModel() {
    if (confirm('Soll das Modell wirklich gelöscht werden?')) {
        if (_id) await arrangeClient.delete(dbName, collectionName, _id);
        showList();
    }
}

async function duplicate() {
    model.thumbnail = Editor.makeScreenshot();
    model.painted = {}; // In creative mode we do not store painted voxels in the database
    model.version = model.version ? model.version + 1 : 1; // Increment version
    delete model._id;
    const result = await arrangeClient.create(dbName, collectionName, model);
    _id = result._id;
    model._id = _id;
    alert('Dupliziert');
}

async function save() {
    model.thumbnail = Editor.makeScreenshot();
    model.painted = {}; // In creative mode we do not store painted voxels in the database
    model.version = model.version ? model.version + 1 : 1; // Increment version
    if (_id) {
        const result = await arrangeClient.update(dbName, collectionName, _id, model);
    } else {
        const result = await arrangeClient.create(dbName, collectionName, model);
        _id = result._id;
        model._id = _id;
    }
    alert('Gespeichert');
}

function selectColor(colorIndex) {
    Editor.selectColor(colorIndex);
    event.preventDefault();
}

function setMode(mode) {
    Editor.setMode(mode);
    colorbar.style.display = (['add', 'paint', 'play'].indexOf(mode) >= 0) ? 'flex' : 'none';
    Editor.forceResize();
}

function setPaletteColor(paletteIndex) {
    const color = palette64[paletteIndex];
    document.getElementsByName('color').forEach(function (input) {
        if (!input.checked) return;
        input.nextElementSibling.style.backgroundColor = color;
    });
    Editor.setCurrentColor(color);
    event.preventDefault();
}

function toggleColorPalette() {
    colorpalette.classList.toggle('visible');
    Editor.forceResize();
}

async function publish() {
    if (!confirm('Wirklich veröffentlichen? Das Model kann danach nicht mehr geändert oder gelöscht werden.')) return;
    model.isPublished = true;
    toolbar.style.display = 'none';
    await save();
}

/******* ALLGEMEIN **********/

window.addEventListener('load', async function () {

    arrangeClient = await ArrangeClient().connect('wss://arrange.avorium.de:42001');

    listLoginForm = document.getElementById('listloginform');
    listRegisterForm = document.getElementById('listregisterform');
    list = document.getElementById('list');
    listToolbar = document.getElementById('listtoolbar');
    rendering = document.getElementById('rendering');
    toolbar = document.getElementById('toolbar');
    colorpalette = document.getElementById('colorpalette');
    colorbar = document.getElementById('colorbar');

    colorpalette.addEventListener('touchmove', function (e) { e.stopPropagation() }, false);
    colorbar.addEventListener('touchmove', function (e) { e.stopPropagation() }, false);

});

