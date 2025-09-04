// database.js

const DB_NAME = 'comboDatabase';
const SCHEMA_TABLE = '_tableSchemas';
const DEFAULT_TABLE = 'default_combos';

let db;

function openDB(version) {
    return new Promise((resolve, reject) => {
        if (version && db) {
            db.close();
            db = null;
        }
        if (db) {
            return resolve(db);
        }
        const request = version ? indexedDB.open(DB_NAME, version) : indexedDB.open(DB_NAME);

        request.onerror = (event) => {
            console.error('Database error:', event.target.error);
            reject('Database error: ' + event.target.error);
        };

        request.onupgradeneeded = (event) => {
            const tempDb = event.target.result;
            const oldVersion = event.oldVersion;
            const transaction = event.target.transaction;
            console.log(`Upgrading database from version ${oldVersion} to ${event.newVersion}`);

            const importDataJSON = localStorage.getItem('pendingImportData');
            const pendingSchemaJSON = localStorage.getItem('pendingSchema');
            const pendingDeletion = localStorage.getItem('pendingDeletion');

            if (importDataJSON) {
                console.log('DB upgrade: IMPORT MODE');
                const importData = JSON.parse(importDataJSON);
                Array.from(tempDb.objectStoreNames).forEach(storeName => tempDb.deleteObjectStore(storeName));
                const schemaStore = tempDb.createObjectStore(SCHEMA_TABLE, { keyPath: 'tableName' });
                importData.schemas.forEach(schema => {
                    tempDb.createObjectStore(schema.tableName, { keyPath: 'id', autoIncrement: true });
                    schemaStore.put(schema);
                });
            } else if (pendingDeletion) {
                console.log(`DB upgrade: DELETE MODE for table: ${pendingDeletion}`);
                if (tempDb.objectStoreNames.contains(pendingDeletion)) {
                    tempDb.deleteObjectStore(pendingDeletion);
                    console.log(`Object store deleted: ${pendingDeletion}`);
                }
                const schemaStore = transaction.objectStore(SCHEMA_TABLE);
                schemaStore.delete(pendingDeletion);
                console.log(`Schema deleted for: ${pendingDeletion}`);
                localStorage.removeItem('pendingDeletion');
            } else if (pendingSchemaJSON) {
                console.log('DB upgrade: CREATE TABLE MODE');
                try {
                    const pendingSchema = JSON.parse(pendingSchemaJSON);
                    if (!tempDb.objectStoreNames.contains(pendingSchema.tableName)) {
                        tempDb.createObjectStore(pendingSchema.tableName, { keyPath: 'id', autoIncrement: true });
                        transaction.objectStore(SCHEMA_TABLE).put(pendingSchema);
                    }
                } catch (error) {
                    console.error("Error processing pending schema:", error);
                } finally {
                    localStorage.removeItem('pendingSchema');
                }
            } else if (oldVersion < 1) {
                console.log('DB upgrade: INITIAL SETUP');
                if (!tempDb.objectStoreNames.contains(SCHEMA_TABLE)) {
                    const schemaStore = tempDb.createObjectStore(SCHEMA_TABLE, { keyPath: 'tableName' });
                    const defaultSchema = {
                        tableName: DEFAULT_TABLE,
                        columns: [
                            { id: 'comboHTML', name: 'コンボ' }, { id: 'character', name: 'キャラクター' },
                            { id: 'damage', name: 'ダメージ' }, { id: 'memo', name: 'メモ' },
                            { id: 'timestamp', name: '保存日時' }
                        ]
                    };
                    schemaStore.put(defaultSchema);
                }
                if (!tempDb.objectStoreNames.contains(DEFAULT_TABLE)) {
                    tempDb.createObjectStore(DEFAULT_TABLE, { keyPath: 'id', autoIncrement: true });
                }
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            db.onversionchange = () => {
                db.close();
                alert("データベースの構造が別のタブで更新されました。ページをリロードします。");
                window.location.reload();
            };
            console.log('Database opened successfully.');

            const importDataJSON = localStorage.getItem('pendingImportData');
            if (importDataJSON) {
                console.log('Populating tables with imported data...');
                const importData = JSON.parse(importDataJSON);
                const tableNames = importData.schemas.map(s => s.tableName);
                if (tableNames.length === 0) {
                    localStorage.removeItem('pendingImportData');
                    return resolve(db);
                }
                const transaction = db.transaction(tableNames, 'readwrite');
                transaction.oncomplete = () => {
                    console.log('All data successfully imported.');
                    localStorage.removeItem('pendingImportData');
                    resolve(db);
                };
                transaction.onerror = (e) => {
                    console.error('Data import transaction failed:', e.target.error);
                    localStorage.removeItem('pendingImportData');
                    reject('Data import failed: ' + e.target.error);
                };
                tableNames.forEach(tableName => {
                    const store = transaction.objectStore(tableName);
                    const records = importData.data[tableName] || [];
                    records.forEach(record => store.put(record));
                });
            } else {
                resolve(db);
            }
        };

        request.onblocked = () => {
            console.error("Database open request is blocked.");
            reject("データベースの更新が他の開いているタブによってブロックされています。他のタブを閉じてから再度お試しください。");
        };
    });
}

async function exportDB() {
    const schemas = await getAllSchemas();
    const data = {};
    for (const schema of schemas) {
        data[schema.tableName] = await getAllRecords(schema.tableName);
    }
    return { schemas, data };
}

async function importDB(dbData) {
    const currentVersion = db.version;
    localStorage.setItem('pendingImportData', JSON.stringify(dbData));
    db.close();
    db = null;
    await openDB(currentVersion + 1);
}

async function deleteTable(tableName) {
    const currentVersion = db.version;
    localStorage.setItem('pendingDeletion', tableName);
    db.close();
    db = null;
    await openDB(currentVersion + 1);
}

function addRecord(tableName, record) {
    return new Promise((resolve, reject) => {
        openDB().then(db => {
            const transaction = db.transaction(tableName, 'readwrite');
            const store = transaction.objectStore(tableName);
            const request = store.add(record);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject('Error adding record: ' + event.target.error);
        }).catch(reject);
    });
}
function getAllRecords(tableName) {
    return new Promise((resolve, reject) => {
        openDB().then(db => {
            const transaction = db.transaction(tableName, 'readonly');
            const store = transaction.objectStore(tableName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject('Error getting all records: ' + event.target.error);
        }).catch(reject);
    });
}
function deleteRecord(tableName, key) {
    return new Promise((resolve, reject) => {
        openDB().then(db => {
            const transaction = db.transaction(tableName, 'readwrite');
            const store = transaction.objectStore(tableName);
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject('Error deleting record: ' + event.target.error);
        }).catch(reject);
    });
}
function getSchema(tableName) {
    return new Promise((resolve, reject) => {
        openDB().then(db => {
            const transaction = db.transaction(SCHEMA_TABLE, 'readonly');
            const store = transaction.objectStore(SCHEMA_TABLE);
            const request = store.get(tableName);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject('Error getting schema: ' + event.target.error);
        }).catch(reject);
    });
}
function updateSchema(schemaObject) {
    return new Promise((resolve, reject) => {
        openDB().then(db => {
            const transaction = db.transaction(SCHEMA_TABLE, 'readwrite');
            const store = transaction.objectStore(SCHEMA_TABLE);
            const request = store.put(schemaObject);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject('Error updating schema: ' + event.target.error);
        }).catch(reject);
    });
}
function getAllSchemas() { return getAllRecords(SCHEMA_TABLE); }

window.db = {
    openDB, addRecord, getAllRecords, deleteRecord, getSchema, getAllSchemas,
    updateSchema, exportDB, importDB, deleteTable, DEFAULT_TABLE, SCHEMA_TABLE
};
