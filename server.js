const { ClientManager } = require('./Common/Discord/ClientManager.js');
const { commands } = require('./Common/Discord/Commands.js');
const { DiscordDataStorage } = require('./Common/Discord/DiscordDataStorage.js');
const { Events, ShardEvents } = require('discord.js');
const { createThreadStatusName } = require('./Common/Helpers/Threads.js');
const Dotenv = require('dotenv');
const Express = require('express');

Dotenv.config();
const app = Express();
const clientManager = new ClientManager();
const discordStorage = new DiscordDataStorage();

async function main() {
  const client = await clientManager.getClient();

  // On Chat
  client.on(Events.InteractionCreate, async (interaction) => {
    console.log(`Interaction Received: ${interaction.toString()}`);
    if (interaction.isChatInputCommand()) {
      const cmd = commands.get(interaction.commandName)
      if (cmd) {
        await cmd.execute(interaction);
        interaction.reply(`Command ${cmd.Name} succeeded`);
      } else {
        console.error(`Commands ${interaction.commandName} not found`);
      }
    }
  });

  client.on(Events.ThreadCreate, async (thread) => {
    const guildId = thread.guildId;
    const parentId = thread.parentId;
    const name = thread.name;
    const approvalChannel = await discordStorage.getGuildValue(guildId, 'channel_characterapprovalchannel');
    console.log(`Thread has been created! Name: ${thread.name} | Channel: ${thread.parent} | Channel ID: ${parentId} | Guild ID: ${guildId}`);
    // Character Approval Channel
    if (guildId && parentId && parentId === approvalChannel) {
      const newName = createThreadStatusName(':timer:', name);
      console.log(`Renaming ${name} to ${newName}`);
      try {
        await thread.setName(newName);
      } catch(err) {
        console.error(err);
      }
    }
  });
}

main();