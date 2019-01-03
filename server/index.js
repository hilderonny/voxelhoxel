const api = require('./api');
const bodyParser = require('body-parser');
const compression = require('compression');
const express = require('express');
const http = require('http');

const app = express();
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/../client'));
app.use('/api', api);

const port = process.env.PORT || 8080;

const server = http.createServer(app);
server.listen(port, function () {
    console.log('Server running at port ' + port);
});
