const jsoning = require('jsoning');
const { MongoClient } = require('mongodb');
const Dotenv = require('dotenv');

Dotenv.config();

const applyChanges = process.argv.includes('--apply');
const useMongoDB = process.env.USE_MONGO?.toLowerCase() === 'true';

const guildMappings = [
    { pattern: /^role_access_level_(.+)$/, mapKey: 'roleAccessLevels' },
    { pattern: /^command_level_(.+)$/, mapKey: 'commandAccessLevels' },
    { pattern: /^channel_(.+)$/, mapKey: 'channels' },
    { pattern: /^config_(.+)$/, mapKey: 'config' },
    { pattern: /^player_match_key_(.+)$/, mapKey: 'playerMatchHistory' }
];

const userMappings = [
    { pattern: /^intro_count_(.+)$/, mapKey: 'introCounts' },
    { pattern: /^awards_(.+)_messages$/, mapKey: 'characterAwardMessageIds' },
    { pattern: /^awards_(.+)$/, mapKey: 'characterAwards' }
];

function migrateRecord(record, mappings, summary) {
    let changed = false;

    for (const [legacyKey, value] of Object.entries(record)) {
        for (const { pattern, mapKey } of mappings) {
            const match = legacyKey.match(pattern);
            if (!match)
                continue;

            const entryKey = match[1];
            const currentMap = record[mapKey];
            if (currentMap !== undefined && (typeof currentMap !== 'object' || currentMap === null || Array.isArray(currentMap))) {
                summary.skipped += 1;
                console.warn(`Skipping ${legacyKey}: ${mapKey} is not an object.`);
                break;
            }

            const map = currentMap || {};
            if (Object.prototype.hasOwnProperty.call(map, entryKey)) {
                if (JSON.stringify(map[entryKey]) === JSON.stringify(value))
                    summary.alreadyMigrated += 1;
                else {
                    summary.conflicts += 1;
                    console.warn(`Conflict for ${legacyKey}: retaining ${mapKey}.${entryKey}.`);
                }
                break;
            }

            record[mapKey] = { ...map, [entryKey]: value };
            summary.migratedEntries += 1;
            changed = true;
            break;
        }
    }

    return changed;
}

async function migrateJsonFile(fileName, idField, mappings, summary) {
    const database = new jsoning(fileName);
    const records = await database.all();

    for (const [recordId, storedRecord] of Object.entries(records)) {
        summary.scanned += 1;
        const record = { ...(storedRecord || {}) };
        if (!migrateRecord(record, mappings, summary))
            continue;

        summary.changedRecords += 1;
        if (applyChanges)
            await database.set(recordId, { ...record, [idField]: recordId });
    }
}

async function migrateMongoCollection(collection, idField, mappings, summary) {
    for await (const storedRecord of collection.find({})) {
        summary.scanned += 1;
        const record = { ...storedRecord };
        if (!migrateRecord(record, mappings, summary))
            continue;

        summary.changedRecords += 1;
        if (applyChanges) {
            const { _id, ...replacement } = record;
            await collection.replaceOne({ _id }, replacement);
        }
    }
}

async function main() {
    const summary = {
        scanned: 0,
        changedRecords: 0,
        migratedEntries: 0,
        alreadyMigrated: 0,
        conflicts: 0,
        skipped: 0
    };

    if (useMongoDB) {
        if (!process.env.MONGO_CONNECTION_STR)
            throw new Error('USE_MONGO is true but MONGO_CONNECTION_STR is not configured.');

        const client = new MongoClient(process.env.MONGO_CONNECTION_STR);
        try {
            const database = client.db('bot_data');
            await migrateMongoCollection(database.collection('guild'), 'guildId', guildMappings, summary);
            await migrateMongoCollection(database.collection('user'), 'userId', userMappings, summary);
        } finally {
            await client.close();
        }
    } else {
        await migrateJsonFile('.data/Guilds.json', 'guildId', guildMappings, summary);
        await migrateJsonFile('.data/Users.json', 'userId', userMappings, summary);
    }

    console.log(JSON.stringify({ mode: applyChanges ? 'apply' : 'dry-run', ...summary }, null, 2));
    if (!applyChanges)
        console.log('No data was changed. Re-run with --apply after reviewing this output.');
}

if (require.main === module) {
    main().catch((error) => {
        console.error('Static schema migration failed:', error);
        process.exitCode = 1;
    });
}

module.exports = { migrateRecord, guildMappings, userMappings };