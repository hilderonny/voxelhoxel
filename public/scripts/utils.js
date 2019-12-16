// Dieses Script sollte mit "defer" eingebunden werden, damit das Seitenladen schnell geht.
// Am Ende wird ein Service worker für die Progressive Web App (PWA) eingebunden

/**
 * Sammlung von Hilfsfunktionen
 */
var UTILS = {

    /* Ein- und Ausblenden von Elementen. Das wird über die CSS Klasse "invisible" gesteuert. */

    /**
     * Element sichtbar machen. Dazu wird die CSS Klasse "invisible" vom Element entfernt.
     * @param {*} selector Normalerweise eine ID in der Form "#ElementId". Kann aber auch ein CSS Selektor sein.
     */
    showElement: function(selector) {
        var element = document.querySelector(selector);
        if (element) element.classList.remove('invisible');
    },

    /**
     * Element unsichtbar machen. Dazu wird die CSS Klasse "invisible" dem Element hinzugefügt.
     * @param {*} selector Normalerweise eine ID in der Form "#ElementId". Kann aber auch ein CSS Selektor sein.
     */
    hideElement: function(selector) {
        var element = document.querySelector(selector);
        if (element) element.classList.add('invisible');
    },

    /**
     * Schaltet eine CSS Klasse auf einem Element um
     * @param {*} selector CSS Selektor für das Element
     * @param {*} cls Klasse, die aktiviert oder deaktiviert werden muss
     */
    toggleClass: function(selector, cls) {
        document.querySelector(selector).classList.toggle(cls);
    },

};


// Service worker einbinden. Dieser muss im Stammverzeichnis der App in der Datei "serviceworker.js"
// enthalten sein.
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async function() {
        var serviceWorkerFile = 'serviceworker.js';
        console.log('%c🧰 load: Registriere service worker aus Datei ' + serviceWorkerFile, 'color:yellow');
        serviceworkerregistration = await navigator.serviceWorker.register(serviceWorkerFile);
        // Bei Aktualisierung des serviceworkers soll die Seite gleich neu geladen werden, um neue Daten anzuzeigen
        serviceworkerregistration.onupdatefound = function () {
            const installingWorker = serviceworkerregistration.installing;
            installingWorker.onstatechange = function () {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    location.reload(); // Neu laden, wenn Service worker aktualisiert wurde
                }
            };
        };
    });
}
