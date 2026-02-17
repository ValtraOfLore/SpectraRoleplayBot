const jsoning = require('jsoning');
const { MongoClient } = require('mongodb');
const NodeCache = require('node-cache');
const Dotenv = require('dotenv');

Dotenv.config();

class DiscordDataStorage {
    static guildDB;
    static userDB;
    static useMongoDB;
    static mongoDBClient;
    static guildCollection;
    static userCollection;
    static useCache;
    static guildCache;
    static userCache;

    async setGuildValue(guildId, key, value) {
        if (this.useCache) {
            const cachedData = this.guildCache.get(guildId);
            if (cachedData) {
                console.log(`Data in cache during update, so the cache object must be updated with key: ${key}, value: ${value}`);
                cachedData[key] = value;
                this.guildCache.set(guildId, cachedData);
            }
        }

        if (this.useMongoDB) {
            const update = { $set: { guildId, [key]: value } };
            console.log(`Update guild value of guildId: ${guildId} for ${key} to ${value} in MongoDB`);
            return this.guildCollection.updateOne({ guildId }, update, { upsert: true });
        }

        const current = await this.guildDB.get(guildId);
        if (!current)
            current = {};
        current[key] = value;
        this.guildCache.set(guildId, current);
        await this.guildDB.set(guildId, current);
    }

    async getGuildValue(guildId, key) {
        let current = this.useCache ? this.guildCache.get(guildId) : null;
        if (!current) {
            console.log(`Data for guild: ${guildId} with key ${key} not in cache. Retrieving from database...`);
            const getter = this.useMongoDB ? this.guildCollection.findOne({ guildId }) : this.guildDB.get(guildId);
            current = await getter;
            if (this.useCache)
                this.guildCache.set(guildId, current);
        }
        return (current && key in current) ? current[key] : null;
    }

    async getAllGuild() {
        return this.userMongoDB ? this.guildCollection.find() : this.guildDB.all();
    }

    async setUserValue(userId, key, value) {
        if (this.useCache) {
            const cachedData = this.userCache.get(userId);
            if (cachedData) {
                console.log(`Data in cache during update, so the cache object must be updated with key: ${key}, value: ${value}`);
                cachedData[key] = value;
                this.userCache.set(userId, cachedData);
            }
        }

        if (this.useMongoDB) {
            const update = { $set: { userId, [key]: value } };
            console.log(`Update user value of userId: ${userId} for ${key} to ${value} in MongoDB`);
            return this.userCollection.updateOne({ userId }, update, { upsert: true });
        }

        let current = await this.userDB.get(userId);
        if (!current)
            current = {};
        current[key] = value;
        this.userCache.set(userId, current);
        await this.userDB.set(guildId, current);
    }

    async getUserValue(userId, key) {
        let current = this.useCache ? this.userCache.get(userId) : null;
        if (!current) {
            console.log(`Data for user: ${userId} with key ${key} not in cache. Retrieving from database...`);
            const getter = this.useMongoDB ? this.userCollection.findOne({ userId }) : this.guildDB.get(userId);
            current = await getter;
            if (this.userCache)
                this.userCache.set(userId, current);
        }
        return (current && key in current) ? current[key] : null;
    }

    async getAllUsers() {
        return this.useMongoDB ? this.userCollection.find() : this.userDB.all();
    }

    constructor() {
        this.useMongoDB = process.env.USE_MONGO?.toLowerCase() === 'true';
        this.useCache = process.env.CACHE_DATASTORE_VALUE?.toLowerCase() === 'true';
        console.log(`Creating database connection. useMongoDB is set to ${this.useMongoDB}`);
        console.log(`Use in-memory cache is set to ${this.useCache}`);
        if (!this.guildDB)
            this.guildDB = new jsoning('.data/Guilds.json');
        if (!this.userDB)
            this.userDB = new jsoning('.data/Users.json');
        if (this.useMongoDB && !this.mongoDBClient) {
            if (process.env.MONGO_CONNECTION_STR) {
                this.mongoDBClient = new MongoClient(process.env.MONGO_CONNECTION_STR).db('bot_data');
                this.guildCollection = this.mongoDBClient.collection('guild');
                this.userCollection = this.mongoDBClient.collection('user');
            } else {
                console.warn('USE_MONGO set to true but no valid mongo connection string.');
            }
        }
        if (this.useCache) {
            this.guildCache = new NodeCache({ stdTTL: parseInt(process.env.CACHE_GUILD_TIME) });
            this.userCache = new NodeCache({ stdTTL: parseInt(process.env.CACHE_USER_TIME) });
        }
    }
}

module.exports =  { DiscordDataStorage };