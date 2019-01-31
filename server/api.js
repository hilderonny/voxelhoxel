const router = require('express').Router();

module.exports = function (server) {

    // Muss separate API sein, die keine Authentifizierung benötigt.
    router.get('/publishedModel/:id', async function (request, response) {
        const model = await server.db('models').findOne(request.params.id);
        delete model._ownerid;
        delete model._publiclyreadable;
        delete model._publiclywritable;
        delete model._readableby;
        delete model._writableby;
        response.json(model);
    });

    // Muss separate API sein, die keine Authentifizierung benötigt.
    router.get('/publishedModels', async function (request, response) {
        const models = await server.db('models').find({ isPublished: true }, '_id version');
        response.json(models);
    });

    return router;

};