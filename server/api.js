const bcryptjs = require('bcryptjs');
const jsonwebtoken = require('jsonwebtoken');
const monk = require('monk');
const router = require('express').Router();

const dburl = process.env.DBURL || '127.0.0.1:27017/voxelhoxel';
const secret = process.env.SECRET || 'sachichnich';

function getCollection(collectionName) {
    return monk(dburl).get(collectionName);
}

router.get('/model/:id', function(request, response) {
    getCollection('models').findOne(request.params.id).then(function(model) {
        response.json(model);
    });
});

router.get('/myModels', function(request, response) {
    const token = request.header('x-access-token');
    if (!token) return response.status(401).json({ error: 'Not logged in' });
    jsonwebtoken.verify(token, secret, function(error, user) {
        if (error) return response.status(401).json({ error: 'Not logged in' });
        getCollection('models').find({ _ownerId: user._id }, '_id name thumbnail isPublished').then(function(models) {
            response.json(models);
        });
    });
});

router.get('/publishedModels', function(request, response) {
    getCollection('models').find({ isPublished: true }, '_id version').then(function(models) {
        response.json(models);
    });
});

router.delete('/model/:id', function(request, response) {
    const token = request.header('x-access-token');
    if (!token) return response.status(401).json({ error: 'Not logged in' });
    jsonwebtoken.verify(token, secret, function(error, user) {
        if (error) return response.status(401).json({ error: 'Not logged in' });
        getCollection('models').findOneAndDelete({ _id: request.params.id, _ownerId: user._id }).then(function(deleted) {
            response.json(deleted);
        });
    });
});

router.post('/login', function(request, response) {
    getCollection('users').findOne({ name: request.body.username }, '_id password').then(function(user) {
        if (user && bcryptjs.compareSync(request.body.password, user.password)) {
            delete user.password;
            user.token = jsonwebtoken.sign({
                _id: user._id,
                time: Date.now()
            }, secret, {
                expiresIn: '24h'
            });
            response.json(user);
        } else {
            response.status(403).json({ error: 'Login failed' });
        }
    });
});

router.post('/register', function(request, response) {
    if (!request.body.password) return response.status(400).json({ error: 'Password required' });
    const collection = getCollection('users');
    collection.findOne({ name: request.body.username }, '_id').then(function(existingUser) {
        if (existingUser) return response.status(400).send({ error: 'Username already taken' });
        collection.insert({ name: request.body.username, password: bcryptjs.hashSync(request.body.password) }).then(function(createdUser) {
            delete createdUser.password;
            createdUser.token = jsonwebtoken.sign({
                _id: user._id,
                time: Date.now()
            }, secret, {
                expiresIn: '24h'
            });
            response.json(createdUser);
        });
    });
});

router.post('/saveModel', function(request, response) {
    const token = request.header('x-access-token');
    if (!token) return response.status(401).json({ error: 'Not logged in' });
    jsonwebtoken.verify(token, secret, function(error, user) {
        if (error) return response.status(401).json({ error: 'Not logged in' });
        const collection = getCollection('models');
        if (request.body._id) {
            collection.findOneAndUpdate({ _id: request.body._id, _ownerId: user._id }, { $set: request.body }).then(function(updated) {
                response.json(updated);
            });
        } else {
            request.body._ownerId = user._id;
            collection.insert(request.body).then(function(inserted) {
                response.json(inserted);
            });
        }
    });
});

module.exports = router;