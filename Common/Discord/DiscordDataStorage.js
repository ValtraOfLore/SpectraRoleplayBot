const jsoning = require('jsoning');
const { MongoClient } = require('mongodb');
const Dotenv = require('dotenv');

Dotenv.config();

class DiscordDataStorage {
    static guildDB;
    static userDB;
    static useMongoDB;
    static mongoDBClient;
    static guildCollection;
    static userCollection;

    async setGuildValue(guildId, key, value) {
        if (this.useMongoDB) {
            const update = { $set: { guildId, [key]: value } };
            console.log(`Update guild value of guildId: ${guildId} for ${key} to ${value} in MongoDB`);
            return this.guildCollection.updateOne({ guildId }, update, { upsert: true });
        }
        const current = await this.guildDB.get(guildId);
        if (!current)
            current = {};
        current[key] = value;
        await this.guildDB.set(guildId, current);
    }

    async getGuildValue(guildId, key) {
        const getter = this.useMongoDB ? this.guildCollection.findOne({ guildId }) : this.guildDB.get(guildId);
        const current = await getter;
        if (!current || !(key in current))
            return null;
        return current[key];
    }

    async getAllGuild() {
        return this.userMongoDB ? this.guildCollection.find() : this.guildDB.all();
    }

    async setUserValue(userId, key, value) {
        if (this.useMongoDB) {
            const update = { $set: { userId, [key]: value } };
            console.log(`Update user value of userId: ${userId} for ${key} to ${value} in MongoDB`);
            return this.userCollection.updateOne({ userId }, update, { upsert: true });
        }
        let current = await this.userDB.get(userId);
        if (!current)
            current = {};
        current[key] = value;
        await this.userDB.set(guildId, current);
    }

    async getUserValue(userId, key) {
        const getter = this.useMongoDB ? this.userCollection.findOne({ userId }) : this.guildDB.get(userId);
        let current = await getter;
        if (!current || !(key in current))
            return null;
        return current[key];
    }

    async getAllUsers() {
        return this.useMongoDB ? this.userCollection.find() : this.userDB.all();
    }

    constructor() {
        this.useMongoDB = process.env.USE_MONGO?.toLowerCase() === 'true';
        console.log(`Creating database connection. useMongoDB is set to ${this.useMongoDB}`);
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
    }
}

module.exports =  { DiscordDataStorage };