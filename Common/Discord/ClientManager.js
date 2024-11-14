const { Client, IntentsBitField } = require('discord.js');
const Dotenv = require('dotenv');

Dotenv.config();

class ClientManager {
    static client;

    async generateClient() {
        this.client = new Client(
            {
                intents: [
                    IntentsBitField.Flags.Guilds,
                    IntentsBitField.Flags.GuildMembers,
                    IntentsBitField.Flags.GuildMessages,
                    IntentsBitField.Flags.MessageContent,
                    IntentsBitField.Flags.DirectMessages,
                    IntentsBitField.Flags.GuildModeration,
                ]
            }
        );

        try {
            await this.client.login(process.env.BOT_TOKEN);
            console.log(`
            --- Bot Live ---
            Date Live: ${new Date(this.client.readyTimestamp)}
            Name: ${this.client.application.name}
            Owner: ${this.client.application.owner?.username || this.client.application.owner?.name}
            --- Bot Live ---
            `);
        } catch(e) {
            console.error(e);
        }
    }

    async getClient() {
        if (!this.client)
            await this.generateClient();
        return this.client;
    }

    constructor() {}
}

module.exports = { ClientManager };