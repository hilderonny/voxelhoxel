const monk = require('monk');
const router = require('express').Router();

const dburl = process.env.DBURL || '127.0.0.1:27017/voxelhoxel';

function getCollection(collectionName) {
    return monk(dburl).get(collectionName);
}

router.get('/model/:id', function(request, response) {
    getCollection('models').find(request.params.id).then(function(model) {
        response.json(model);
    });
});

router.get('/myModels', /* auth */ function(request, response) {});

router.get('/publishedModels', function(request, response) {
    getCollection('models').find({ isPublished: true }, '_id version').then(function(models) {
        response.json(models);
    });
});

router.post('/deleteModel', /* auth */ function(request, response) {});

router.post('/login', function(request, response) {});

router.post('/saveModel', /* auth */ function(request, response) {});

module.exports = router;