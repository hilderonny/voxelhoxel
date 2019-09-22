var express = require('express');
var app = express();
var http = require('http').createServer(app);
var mysql = require('mysql');

// Datenbank
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