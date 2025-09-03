/**
 * database.js
 *
 * IndexedDBラッパーモジュール
 * アプリケーションのデータベース操作をすべて管理します。
 */

const DB_NAME = 'comboDatabase';
const DB_VERSION = 1;
const SCHEMA_STORE_NAME = '_tableSchemas';
const DEFAULT_TABLE_NAME = 'default_combos';

let db = null;

/**
 * データベースを初期化（オープン）します。
 * 成功すると解決されるPromiseを返します。
 * @returns {Promise<void>}
 */
const initDB = () => {
    return new Promise((resolve, reject) => {
        if (db) {
            return resolve();
        }

        console.log(`[DB] Opening database: ${DB_NAME} (v${DB_VERSION})`);
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('[DB] Database error:', event.target.error);
            reject('Database error: ' + event.target.error.message);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('[DB] Database opened successfully.');
            resolve();
        };

        request.onupgradeneeded = (event) => {
            console.log('[DB] Database upgrade needed.');
            db = event.target.result;
            const transaction = event.target.transaction;

            // 1. スキーマ管理用のオブジェクトストアを作成
            if (!db.objectStoreNames.contains(SCHEMA_STORE_NAME)) {
                console.log(`[DB] Creating object store: ${SCHEMA_STORE_NAME}`);
                db.createObjectStore(SCHEMA_STORE_NAME, { keyPath: 'tableName' });
            }

            // 2. デフォルトのコンボテーブル用のオブジェクトストアを作成
            if (!db.objectStoreNames.contains(DEFAULT_TABLE_NAME)) {
                console.log(`[DB] Creating object store: ${DEFAULT_TABLE_NAME}`);
                const defaultStore = db.createObjectStore(DEFAULT_TABLE_NAME, { keyPath: 'id', autoIncrement: true });
                // インデックスを作成しておくと検索が高速になる
                defaultStore.createIndex('character', 'character', { unique: false });
                defaultStore.createIndex('comboHTML', 'comboHTML', { unique: false });
            }

            // 3. デフォルトテーブルのスキーマをスキーマストアに保存
            transaction.oncomplete = () => {
                const defaultSchema = {
                    tableName: DEFAULT_TABLE_NAME,
                    columns: [
                        { name: 'comboHTML', type: 'html', label: 'コンボ' },
                        { name: 'character', type: 'text', label: 'キャラクター' },
                        { name: 'damage', type: 'number', label: 'ダメージ' },
                        { name: 'memo', type: 'textarea', label: 'メモ' }
                    ]
                };
                // onupgradeneeded 内のトランザクションは完了しているので、新しいトランザクションを開始
                saveTableSchema(defaultSchema).then(() => {
                    console.log('[DB] Default table schema saved.');
                }).catch(error => {
                    console.error('[DB] Failed to save default schema:', error);
                });
            };
        };
    });
};

/**
 * 新しいテーブルスキーマを保存します。
 * @param {object} schema - 保存するスキーマオブジェクト
 * @returns {Promise<void>}
 */
const saveTableSchema = (schema) => {
    return new Promise((resolve, reject) => {
        if (!db) return reject('Database not initialized.');
        const transaction = db.transaction([SCHEMA_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(SCHEMA_STORE_NAME);
        const request = store.put(schema);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject('Failed to save schema: ' + event.target.error.message);
    });
};

/**
 * すべてのテーブルスキーマを取得します。
 * @returns {Promise<Array<object>>}
 */
const getAllTableSchemas = () => {
    return new Promise((resolve, reject) => {
        if (!db) return reject('Database not initialized.');
        const transaction = db.transaction([SCHEMA_STORE_NAME], 'readonly');
        const store = transaction.objectStore(SCHEMA_STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject('Failed to get schemas: ' + event.target.error.message);
    });
};

/**
 * 指定されたテーブル名で新しいテーブル（オブジェクトストア）を作成します。
 * @param {string} tableName - 作成するテーブルの名前
 * @returns {Promise<void>}
 */
const createTable = (tableName) => {
    return new Promise((resolve, reject) => {
        const currentVersion = db.version;
        db.close(); // 新しいスキーマで再オープンするために一度閉じる

        const request = indexedDB.open(DB_NAME, currentVersion + 1);

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains(tableName)) {
                console.log(`[DB] Creating new object store: ${tableName}`);
                db.createObjectStore(tableName, { keyPath: 'id', autoIncrement: true });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log(`[DB] Table ${tableName} created successfully.`);
            resolve();
        };

        request.onerror = (event) => {
            console.error(`[DB] Error creating table ${tableName}:`, event.target.error);
            reject(`Failed to create table: ${event.target.error.message}`);
        };
    });
};

/**
 * 指定されたテーブルにデータを保存（追加または更新）します。
 * @param {string} tableName - データを保存するテーブル名
 * @param {object} data - 保存するデータオブジェクト
 * @returns {Promise<IDBValidKey>} 保存されたデータのキー
 */
const saveData = (tableName, data) => {
    return new Promise((resolve, reject) => {
        if (!db) return reject('Database not initialized.');
        const transaction = db.transaction([tableName], 'readwrite');
        const store = transaction.objectStore(tableName);
        const request = store.put(data);

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(`Failed to save data to ${tableName}: ${event.target.error.message}`);
    });
};

/**
 * 指定されたテーブルからすべてのデータを取得します。
 * @param {string} tableName - データを取得するテーブル名
 * @returns {Promise<Array<object>>}
 */
const getAllData = (tableName) => {
    return new Promise((resolve, reject) => {
        if (!db) return reject('Database not initialized.');
        const transaction = db.transaction([tableName], 'readonly');
        const store = transaction.objectStore(tableName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(`Failed to get data from ${tableName}: ${event.target.error.message}`);
    });
};

/**
 * 指定されたテーブルから特定のIDのデータを削除します。
 * @param {string} tableName - データを削除するテーブル名
 * @param {IDBValidKey} id - 削除するデータのID
 * @returns {Promise<void>}
 */
const deleteData = (tableName, id) => {
    return new Promise((resolve, reject) => {
        if (!db) return reject('Database not initialized.');
        const transaction = db.transaction([tableName], 'readwrite');
        const store = transaction.objectStore(tableName);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(`Failed to delete data from ${tableName}: ${event.target.error.message}`);
    });
};

/**
 * データベースの全データをエクスポート用に取得します。
 * @returns {Promise<object>}
 */
const getFullDbData = async () => {
    if (!db) throw new Error('Database not initialized.');

    const tableNames = Array.from(db.objectStoreNames);
    const exportData = {};

    for (const tableName of tableNames) {
        exportData[tableName] = await getAllData(tableName);
    }

    return exportData;
};

/**
 * データベースをクリアし、インポートデータで復元します。
 * @param {object} dataToImport - インポートするデータ
 * @returns {Promise<void>}
 */
const importFullDbData = (dataToImport) => {
    return new Promise((resolve, reject) => {
        const currentVersion = db.version;
        db.close();

        const deleteRequest = indexedDB.deleteDatabase(DB_NAME);

        deleteRequest.onsuccess = () => {
            console.log('[DB] Database deleted successfully for import.');

            const openRequest = indexedDB.open(DB_NAME, currentVersion + 1);

            openRequest.onupgradeneeded = (event) => {
                const newDb = event.target.result;
                console.log('[DB] Re-creating database structure for import...');
                for (const tableName in dataToImport) {
                    if (!newDb.objectStoreNames.contains(tableName)) {
                        newDb.createObjectStore(tableName, {
                            keyPath: (tableName === SCHEMA_STORE_NAME) ? 'tableName' : 'id',
                            autoIncrement: (tableName !== SCHEMA_STORE_NAME)
                        });
                    }
                }
            };

            openRequest.onsuccess = (event) => {
                db = event.target.result;
                console.log('[DB] Database structure re-created. Importing data...');
                const transaction = db.transaction(Object.keys(dataToImport), 'readwrite');

                transaction.oncomplete = () => {
                    console.log('[DB] Data import completed successfully.');
                    resolve();
                };

                transaction.onerror = (event) => {
                    console.error('[DB] Data import transaction error:', event.target.error);
                    reject('Data import failed: ' + event.target.error.message);
                };

                for (const tableName in dataToImport) {
                    const store = transaction.objectStore(tableName);
                    dataToImport[tableName].forEach(record => {
                        store.put(record);
                    });
                }
            };

            openRequest.onerror = (event) => {
                 console.error('[DB] Failed to re-open database for import:', event.target.error);
                 reject('Failed to open database for import: ' + event.target.error.message);
            };
        };

        deleteRequest.onerror = (event) => {
            console.error('[DB] Failed to delete database for import:', event.target.error);
            reject('Failed to delete database for import: ' + event.target.error.message);
        };
    });
};


// グローバルスコープにAPIを公開
window.db = {
    initDB,
    saveTableSchema,
    getAllTableSchemas,
    createTable,
    saveData,
    getAllData,
    deleteData,
    getFullDbData,
    importFullDbData,
};
