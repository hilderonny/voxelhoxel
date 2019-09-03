const LocalDb = (function() {
  
  var db;
  const dbName = 'voxelhoxel', version = 1, modelCollection = 'models';
  
  function upgradeDb(db) {
    db.createObjectStore(modelCollection, { keyPath: '_id' }); // Require that models must have a property "_id"
  }
  
  function getDb() {
    return new Promise(function(resolve, reject) {
      if (db) return resolve(db);
      const request = window.indexedDB.open(dbName, version);
      request.onerror = function() {
        console.log('ERROR', request);
        db = null;
        reject(request);
      };
      request.onsuccess = function() {
        db = request.result;
        resolve(db);
      };
      request.onupgradeneeded = function(event) { 
        upgradeDb(event.target.result);
      };
    });
  }
  
  return {
    
    deleteModel: function(_id) {
      return new Promise(async function(resolve, reject) {
        const db = await getDb();
        const request = db.transaction([modelCollection], 'readwrite').objectStore(modelCollection).delete(_id);
        request.onerror = function() {
          reject(request);
        };
        request.onsuccess = function() {
          resolve(request);
        };
      });
    },
    
    listModels: function() {
      return new Promise(async function(resolve, reject) {
        const db = await getDb();
        const request = db.transaction([modelCollection], 'readwrite').objectStore(modelCollection).openCursor();
        const models = [];
        request.onsuccess = function(event) {
          var cursor = event.target.result;
          if (cursor) {
            models.push(cursor.value);
            cursor.continue();
          } else {
            resolve(models);
          }
        };
      });
    },
    
    loadModel: function(_id) {
      return new Promise(async function(resolve, reject) {
        const db = await getDb();
        const request = db.transaction([modelCollection], 'readwrite').objectStore(modelCollection).get(_id);
        request.onerror = function() {
          reject(request);
        };
        request.onsuccess = function() {
          resolve(request.result);
        };
      });
    },
    
    saveModel: function(model) {
      return new Promise(async function(resolve, reject) {
        const db = await getDb();
        var listEl = model.listEl; // HTML element cannot be stored
        delete model.listEl;
        model.lastmodified = Date.now(); // Update last modified date
        const request = db.transaction([modelCollection], 'readwrite').objectStore(modelCollection).put(model);
        request.onerror = function() {
          model.listEl = listEl;
          reject(request);
        };
        request.onsuccess = function() {
          model.listEl = listEl;
          resolve(request.result);
        };
      });
    },
    
  }
  
}());