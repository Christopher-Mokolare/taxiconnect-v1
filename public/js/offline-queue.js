(function () {
  "use strict";

  const DATABASE = "taxiconnect-offline";
  const VERSION = 1;
  const STORE = "pendingSignals";

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error("Offline storage is not available in this browser."));
        return;
      }
      const request = window.indexedDB.open(DATABASE, VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Could not open offline storage."));
    });
  }

  async function run(mode, operation) {
    const db = await openDatabase();
    try {
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const store = transaction.objectStore(STORE);
        const request = operation(store);
        let result;
        if (request) {
          request.onsuccess = () => { result = request.result; };
          request.onerror = () => reject(request.error || new Error("Offline storage operation failed."));
        }
        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => reject(transaction.error || new Error("Offline storage transaction failed."));
        transaction.onabort = () => reject(transaction.error || new Error("Offline storage transaction was aborted."));
      });
    } finally {
      db.close();
    }
  }

  window.TaxiConnectOfflineQueue = Object.freeze({
    put: item => run("readwrite", store => store.put(item)),
    all: () => run("readonly", store => store.getAll()),
    remove: id => run("readwrite", store => store.delete(id))
  });
})();
