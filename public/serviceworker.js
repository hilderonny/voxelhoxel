// Per default stsuert ein Service worker alle Anfragen, die in seinem und aller Unterverzeichnisse
// ankommen. Daher ist es am einfachsten, den worker in das Stammverzeichnis der App zu legen, dann
// braucht man nämlich nicht den Scope anzugeben.

// Der Service Worker wird bei jedem Aufruf der Website geladen. Wenn der Browser mitkriegt, dass sich
// diese Datei geändert hat, wird der Service Worker erneut installiert und 'activate' aufgerufen.

// Dieser Name ist ein Hilfsmittel, das beim Löschen des alten und Neuaufbau des neuen Caches hilft.
// Wenn dieser Name geändert wird und der Service worker neu installiert wird. führt das bei activate()
// dazu, dass der alte Cache gelöscht und bei fetch() dazu, dass alle zu cachenden Dateien neu geladen werden.
var CACHE_NAME = 'voxelhoxel-7';

// Diese Funktion wird bei der Neuinstallation des Service workers aufgerufen.
self.addEventListener('install', function(evt) {
    console.log('%c⚙ install: Neuinstallation nach Änderung der Service worker Datei', 'color:lightgrey');
    // skipWaiting dient dazu, dass die vorherige Version des workers beendet und diese neue
    // Version gleich installiert und aktiviert wird, ohne zu warten
    self.skipWaiting();
});

// Diese Funktion wird nach jeder Neuinstallation des Service workers ausgeführt und dient dazu,
// alte Caches zu löschen
self.addEventListener('activate', function (evt) {
    console.log('%c⚙ activate: Service worker mit Cache Name "' + CACHE_NAME + '" ist nun aktiv.', 'color:lightgrey');
    evt.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('%c⚙ activate: Lösche alten Cache "' + key + '"', 'color:lightgrey');
                    return caches.delete(key);
                }
            }));
        })
    );
    // Bringt den Browser dazu, den neuen Service worker sofort zu benutzen und nicht erst beim nächsten Laden der Seite
    self.clients.claim();
});

// Netzwerkabfragen abfangen und im Offline Betrieb aus Cache bereit stellen
self.addEventListener('fetch', function (evt) {
    evt.respondWith(
        caches.open(CACHE_NAME).then(async function (cache) {
            try {
                // Versuchen, die Datei aus dem Netz zu laden. 'reload' umgeht dabei den Browser-eigenen Cache, damit die Dateien
                // zwangsweise neu geladen werden. Ist bei js-Dateien ganz hilfreich, weil der Browser diese sonst nicht neu lädt
                var response = await fetch(evt.request, {cache: 'reload'});
                // Wenn der Zugriff auf das Netz geklappt hat, die Datei im Cache speichern
                if (response.status === 200) {
                    console.log('%c⚙ fetch: Speichere im Cache: ' + evt.request.url, 'color:lightgrey');
                    cache.put(evt.request.url, response.clone());
                }
                return response;
            }
            catch (err) {
                // Netzwerkzugriff fehlgeschlagen, also aus dem Cache holen
                console.log('%c⚙ fetch: Liefere aus dem Cache: ' + evt.request.url, 'color:lightgrey');
                return cache.match(evt.request);
            }
        })
    );
});