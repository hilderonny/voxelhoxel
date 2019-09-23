var express = require('express');
var app = express();
var http = require('http').createServer(app);
var mysql = require('mysql');
var bodyParser = require('body-parser');

// Datenbank verbinden, bleibt ewig offen
var db = mysql.createConnection({
    host: process.env.DBHOST,
    user: process.env.DBUSER,
    password: process.env.DBPASSWORD,
    database: process.env.DB,
    multipleStatements: true
});
db.connect(function (err) {
    if (err) throw err;

    // Server starten und an PORT lauschen lassen
    http.listen(process.env.PORT, function () {
        console.log('listening on http://localhost:' + process.env.PORT);
    });

    //merge();
});

// APIs

// Modellinfos der veröffentlichten Modelle für Übersicht im Spielemodus
app.get('/api/modelinfos/published', function(req, res) {
    db.query('select * from modelinfos where published = 1 order by lastmodified desc', function (err, infos) {
        res.send(infos);
    });
});

// Modellinfos aller Modelle für Übersicht im Kreativmodus
app.get('/api/modelinfos', function(req, res) {
    db.query('select * from modelinfos order by lastmodified desc', function (err, infos) {
        res.send(infos);
    });
});

// Details zu einem Modell holen
app.get('/api/modeldetails/:id', function(req, res) {
    db.query('select * from models where id = ?', req.params.id, function(err, details) {
        res.send(details.length > 0 ? JSON.parse(details[0].data) : undefined);
    });
});

// JSON als POST-Body akzeptieren
app.use(bodyParser.json());

// Bestehendes Modell speichern
app.post('/api/savemodel/:id', function(req, res) {
    var model = req.body;
    // Manchmal ist die _id noch dran
    delete model._id;
    var id = req.params.id;
    // Änderungszeitpunkt merken
    model.lastmodified = Date.now();
    db.query('update models set data = ? where id = ?;update modelinfos set lastmodified = ? where modelid = ?;', [JSON.stringify(model), id, model.lastmodified, id], function(err, result) {
        if (err) return res.status(400).send(err);
        res.sendStatus(200);
    });
});

// Statische HTML Dateien
app.use(express.static('public'));

/*
// Daten aus JSON-Dateien in die Datenbank bringen
function merge() {

    var fs = require('fs');

    var query = 'delete from models;';
    var params = [];

    var models = JSON.parse(fs.readFileSync('./public/data/models.json'));
    models.forEach(function(model) {
        var data = JSON.parse(fs.readFileSync('./public/data/' + model._id + '.json'));
        query += 'insert into models (data) values (?);';
        params.push(JSON.stringify(data));
    });
    console.log(models, query, params);

    // Alle Modelle einfügen
    db.query(query, params, function (err, res) {
        var infoquery = 'delete from modelinfos;';
        for (var i = 1; i < res.length; i++) {
            var id = res[i].insertId;
            var model = models[i - 1];
            infoquery += 'insert into modelinfos (modelid, name, published, lastmodified) values(' + id + ', "' + model._id.substr(1) + '", 1, ' + model.lastmodified + ');';
        }
        infoquery += 'select * from modelinfos;';
        db.query(infoquery, function (err, infores) {
            console.log(err, infores);
        });
    });

}
*/