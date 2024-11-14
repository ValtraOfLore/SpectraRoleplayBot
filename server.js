const { get } = require('axios');
const { ClientManager } = require('./Common/Discord/ClientManager.js');
const { commands } = require('./Common/Discord/Commands.js');
const { DiscordDataStorage } = require('./Common/Discord/DiscordDataStorage.js');
const { Events, ShardEvents } = require('discord.js');
const Dotenv = require('dotenv');
const Express = require('express');

Dotenv.config();
const app = Express();
const clientManager = new ClientManager();
const discordStorage = new DiscordDataStorage();

async function main() {
  const client = await clientManager.getClient();

  client.on(Events.InteractionCreate, (interaction) => {
    console.log(`Interaction Received: ${interaction.toString()}`);
    if (interaction.isChatInputCommand()) {
      const cmd = commands.get(interaction.commandName)
      if (cmd) {
        cmd.execute(interaction);
      } else {
        console.error(`Commands ${interaction.commandName} not found`);
      }
    }
  });
}

main();