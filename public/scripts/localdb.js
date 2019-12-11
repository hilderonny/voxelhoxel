// Hilfsklasse, um Modelle in der IndexedDB auf dem Client zu speichern
const LocalDb = (function() {
  
  var db;
  // Der Name der IndexedDB-Datenbank
  var dbName = 'voxelhoxel';
  // Wird die Versionsnummer hochgezählt, wird automatisch upgradeDb() aufgerufen. Sinnvoll bei Schemaänderung, was aber eigentlich nicht vorkommt
  var version = 1;
  // Name der Tabelle, in der die Modelle liegen
  var modelCollection = 'models';
  
  function upgradeDb(db) {
    db.createObjectStore(modelCollection, { keyPath: '_id' }); // Require that models must have a property "_id"
  }
  
  // Liefert Referenz auf die Datenbank und erstellt sie bei Bedarf
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
  
  // Legt LocalDb als Singleton-Klasse im globalen Kontext an.
  return {
    
    // Listet alle lokal gespciehrten Modelle auf. Feld kann leer sein.
    // Wird für Übersicht verwendet.
    listModels: function() {
      return getDb().then(function(db) {
        return new Promise(function(resolve) {
          var request = db.transaction([modelCollection], 'readwrite').objectStore(modelCollection).openCursor();
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
      });
    },
    
    // Speichert ein Modell, welches vorher mit loadModel geladen wurde, in die Datenbank.
    // Überschreibt ein bestehendes Modell mit derselben Id komplett.
    saveModel: function(model) {
      return getDb().then(function(db) {
        return new Promise(function(resolve, reject) {
          const request = db.transaction([modelCollection], 'readwrite').objectStore(modelCollection).put(model);
          request.onerror = function() {
            reject(request);
          };
          request.onsuccess = function() {
            resolve(request.result);
          };
        });
      });
    },
    
  }
  
}());