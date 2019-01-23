const router = require('express').Router();

module.exports = function (server) {

    router.get('/model/:id', function (request, response) {
        server.db('models').findOne(request.params.id).then(function (model) {
            response.json(model);
        });
    });

    router.get('/myModels', server.auth.bind(server), function (request, response) {
        server.db('models').find({ _ownerId: request.user._id }, '_id name thumbnail isPublished').then(function (models) {
            response.json(models);
        });
    });

    router.get('/publishedModels', function (request, response) {
        server.db('models').find({ isPublished: true }, '_id version').then(function (models) {
            response.json(models);
        });
    });

    router.delete('/model/:id', server.auth.bind(server), function (request, response) {
        server.db('models').findOneAndDelete({ _id: request.params.id, _ownerId: request.user._id }).then(function (deleted) {
            response.json(deleted);
        });
    });

    router.post('/saveModel', server.auth.bind(server), function (request, response) {
        const collection = server.db('models');
        if (request.body._id) {
            collection.findOneAndUpdate({ _id: request.body._id, _ownerId: request.user._id }, { $set: request.body }).then(function (updated) {
                response.json(updated);
            });
        } else {
            request.body._ownerId = request.user._id;
            collection.insert(request.body).then(function (inserted) {
                response.json(inserted);
            });
        }
    });

    return router;

};