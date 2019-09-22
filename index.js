var express = require('express');
var app = express();
var http = require('http').createServer(app);
var mysql = require('mysql');

// Datenbank
var db = mysql.createConnection({
    host: process.env.DBHOST,
    user: process.env.DBUSER,
    password: process.env.DBPASSWORD,
    database: process.env.DB
});
db.connect(function (err) {
    if (err) throw err;

    // Server starten und an PORT lauschen lassen
    http.listen(process.env.PORT, function () {
        console.log('listening on http://localhost:' + process.env.PORT);
    });

    merge();
});

// Statische HTML Dateien
app.use(express.static('public'));

// Daten aus JSON-Dateien in die Datenbank bringen
function merge() {

    var fs = require('fs');

    var models = JSON.parse(fs.readFileSync('./public/data/models.json'));
    models.forEach(function(model) {
        model.data = JSON.parse(fs.readFileSync('./public/data/' + model._id + '.json'));
    });
    console.log(models);

    db.query('select * from modelinfos;', function (err, res) {
        console.log(res);
    });

}