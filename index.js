var express = require('express');
var app = express();
var http = require('http').createServer(app);

// Statische HTML Dateien
app.use(express.static('public'));

// Server starten und an PORT lauschen lassen
http.listen(process.env.PORT, function () {
    console.log('listening on http://localhost:' + process.env.PORT);
});
