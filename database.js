// database.js

const DB_NAME = 'comboDatabase';
const SCHEMA_TABLE = '_tableSchemas';
const DEFAULT_TABLE = 'コンボ';

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
                }
                transaction.objectStore(SCHEMA_TABLE).delete(pendingDeletion);
                localStorage.removeItem('pendingDeletion');
            } else if (pendingSchemaJSON) {
                console.log('DB upgrade: CREATE TABLE MODE');
                try {
                    const pendingSchema = JSON.parse(pendingSchemaJSON);
                    if (!tempDb.objectStoreNames.contains(pendingSchema.tableName)) {
                        tempDb.createObjectStore(pendingSchema.tableName, { keyPath: 'id', autoIncrement: true });
                        transaction.objectStore(SCHEMA_TABLE).put(pendingSchema);
                    }
                } catch (error) { console.error("Error processing pending schema:", error); }
                finally { localStorage.removeItem('pendingSchema'); }
            } else if (oldVersion < 1) {
                console.log('DB upgrade: INITIAL SETUP');
                if (!tempDb.objectStoreNames.contains(SCHEMA_TABLE)) {
                    const schemaStore = tempDb.createObjectStore(SCHEMA_TABLE, { keyPath: 'tableName' });
                    const defaultSchema = {
                        tableName: DEFAULT_TABLE,
                        columns: [
                            { id: 'number', name: 'No.' },
                            { id: 'character', name: 'キャラ' },
                            { id: 'type', name: '種類' },
                            { id: 'cost', name: '消費' },
                            { id: 'position', name: '位置' },
                            { id: 'starter', name: '始動技' },
                            { id: 'counterHit', name: 'CH' },
                            { id: 'combo', name: '内容' },
                            { id: 'memo', name: 'メモ' },
                            { id: 'link', name: 'リンク' },
                            { id: 'date', name: '日付' },
                        ],
                        comboColumnId: 'combo',
                        starterColumnId: 'starter',
                        creationDateColumnId: 'date',
                        uniqueNumberColumnId: 'number',
                        recordCount: 0,
                        lastUpdated: new Date().toISOString()
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

async function updateTableMetadata(tableName, countChange) {
    try {
        const db = await openDB();
        const tx = db.transaction(SCHEMA_TABLE, 'readwrite');
        const store = tx.objectStore(SCHEMA_TABLE);
        const schema = await new Promise((resolve, reject) => {
            const req = store.get(tableName);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        if (schema) {
            if (countChange !== null) {
                 schema.recordCount = (schema.recordCount || 0) + countChange;
            }
            schema.lastUpdated = new Date().toISOString();
            store.put(schema);
        }
        await new Promise(resolve => tx.oncomplete = resolve);
    } catch (error) {
        console.error(`Failed to update metadata for table ${tableName}:`, error);
    }
}

async function addRecord(tableName, record) {
    const db = await openDB();
    const tx = db.transaction([tableName, SCHEMA_TABLE], 'readwrite');
    const store = tx.objectStore(tableName);
    const schemaStore = tx.objectStore(SCHEMA_TABLE);

    const schema = await new Promise((resolve, reject) => {
        const req = schemaStore.get(tableName);
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e.target.error);
    });

    if (schema && schema.uniqueNumberColumnId) {
        const columnId = schema.uniqueNumberColumnId;
        let maxNumber = 0;
        const allRecords = await new Promise((resolve, reject) => {
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        
        allRecords.forEach(r => {
            const num = parseInt(r[columnId], 10);
            if (!isNaN(num) && num > maxNumber) {
                maxNumber = num;
            }
        });
        record[columnId] = maxNumber + 1;
    }

    const addReq = store.add(record);

    if (schema) {
        schema.recordCount = (schema.recordCount || 0) + 1;
        schema.lastUpdated = new Date().toISOString();
        schemaStore.put(schema);
    }

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve(addReq.result);
        tx.onerror = () => reject(tx.error);
    });
}

async function deleteRecord(tableName, key) {
    const db = await openDB();
    const tx = db.transaction(tableName, 'readwrite');
    await new Promise((resolve, reject) => {
        const req = tx.objectStore(tableName).delete(key);
        req.onsuccess = resolve;
        req.onerror = reject;
    });
    await updateTableMetadata(tableName, -1);
}

async function updateRecord(tableName, record) {
    const db = await openDB();
    const tx = db.transaction(tableName, 'readwrite');
    const store = tx.objectStore(tableName);
    const key = await new Promise((resolve, reject) => {
        const req = store.put(record);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
    // Do not change count, but do update timestamp
    await updateTableMetadata(tableName, 0);
    return key;
}

async function importDB(dbData) {
    const currentVersion = db.version;
    localStorage.setItem('pendingImportData', JSON.stringify(dbData));
    db.close();
    db = null;

    const newDb = await openDB(currentVersion + 1);
    // After import, metadata needs to be updated.
    const schemas = dbData.schemas;
    for (const schema of schemas) {
        const recordCount = (dbData.data[schema.tableName] || []).length;
        // This is not a countChange, it's setting the absolute count.
        // Let's adjust updateTableMetadata to handle this.
        const db = await openDB();
        const tx = db.transaction(SCHEMA_TABLE, 'readwrite');
        const store = tx.objectStore(SCHEMA_TABLE);
        const freshSchema = await new Promise(r => store.get(schema.tableName).onsuccess = e => r(e.target.result));
        if(freshSchema) {
            freshSchema.recordCount = recordCount;
            freshSchema.lastUpdated = new Date().toISOString();
            store.put(freshSchema);
        }
    }
}

function getAllRecords(tableName) {
    return new Promise((resolve, reject) => {
        openDB().then(db => {
            const tx = db.transaction(tableName, 'readonly');
            const store = tx.objectStore(tableName);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        }).catch(reject);
    });
}

function getSchema(tableName) {
    if (!tableName) {
        console.error("getSchema was called with a null or undefined tableName.");
        return Promise.reject(new Error("Invalid tableName provided to getSchema."));
    }
    return new Promise((resolve, reject) => {
        openDB().then(db => {
            const tx = db.transaction(SCHEMA_TABLE, 'readonly');
            const store = tx.objectStore(SCHEMA_TABLE);
            const req = store.get(tableName);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        }).catch(reject);
    });
}

function updateSchema(schemaObject) {
    return new Promise((resolve, reject) => {
        openDB().then(db => {
            const tx = db.transaction(SCHEMA_TABLE, 'readwrite');
            const store = tx.objectStore(SCHEMA_TABLE);

            // Ensure the lastUpdated timestamp is always fresh on schema updates
            schemaObject.lastUpdated = new Date().toISOString();

            const req = store.put(schemaObject);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        }).catch(reject);
    });
}

async function deleteTable(tableName) {
    const currentVersion = db.version;
    localStorage.setItem('pendingDeletion', tableName);
    db.close();
    db = null;
    await openDB(currentVersion + 1);
}

async function exportDB() {
    const schemas = await getAllSchemas();
    const data = {};
    for (const schema of schemas) {
        data[schema.tableName] = await getAllRecords(schema.tableName);
    }
    return { schemas, data };
}

function getAllSchemas() { return getAllRecords(SCHEMA_TABLE); }

window.db = {
    get version() { return db ? db.version : 0; },
    openDB, addRecord, getAllRecords, deleteRecord, getSchema, getAllSchemas,
    updateSchema, exportDB, importDB, deleteTable, updateRecord, DEFAULT_TABLE, SCHEMA_TABLE
};
