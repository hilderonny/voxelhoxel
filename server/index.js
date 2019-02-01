const arrange = require('@hilderonny/arrange');
const express = require('express');

const server = new arrange.Server(
    process.env.PORT || 8080, 
    process.env.DBURL || '127.0.0.1:27017/voxelhoxel',
    process.env.SECRET || 'sachichnich'
);
server.app.use(express.static(__dirname + '/../client'));
server.start();
