const jsoning = require('jsoning');

class DiscordDataStorage {
    static guildDB;
    static userDB;

    async setGuildValue(guildId, key, value) {
        let current = await this.guildDB.get(guildId);
        if (!current)
            current = {};
        current[key] = value;
        await this.guildDB.set(guildId, current);
    }

    async getGuildValue(guildId, key) {
        let current = await this.guildDB.get(guildId);
        if (!current || !(key in current))
            return null;
        return current[key];
    }

    async getAllGuild() {
        return await this.guildDB.all();
    }

    async setUserValue(userId, key, value) {
        let current = await this.userDB.get(userId);
        if (!current)
            current = {};
        current[key] = value;
        await this.userDB.set(guildId, current);
    }

    async getUserValue(userId, key) {
        let current = await this.userDB.get(userId);
        if (!current || !(key in current))
            return null;
        return current[key];
    }

    async getAllUsers() {
        return await this.userDB.all();
    }

    constructor() {
        if (!this.guildDB)
            this.guildDB = new jsoning('.data/Guilds.json');
        if (!this.userDB)
            this.userDB = new jsoning('.data/Users.json');
    }
}

module.exports =  { DiscordDataStorage };