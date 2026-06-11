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
const postCommandLogs = process.env.POST_COMMAND_LOGS?.toLowerCase() === 'true';

function formatCommandArgs(optionData) {
  if (!optionData || optionData.length < 1) {
    return 'None';
  }

  const formattedOptions = [];
  const recurseOptions = (options, prefix = '') => {
    options.forEach((option) => {
      const optionName = prefix ? `${prefix}.${option.name}` : option.name;

      if (option.options?.length > 0) {
        recurseOptions(option.options, optionName);
      } else {
        const optionValue = typeof option.value === 'string' ? `"${option.value}"` : `${option.value}`;
        formattedOptions.push(`${optionName}=${optionValue}`);
      }
    });
  };

  recurseOptions(optionData);
  return formattedOptions.length > 0 ? formattedOptions.join(', ') : 'None';
}

async function main() {
  const client = await clientManager.getClient();

  // On Chat
  client.on(Events.InteractionCreate, async (interaction) => {
    console.log(`Interaction Received: ${interaction.toString()}`);
    if (interaction.isChatInputCommand()) {
      const cmd = commands.get(interaction.commandName);
      if (cmd) {
        try {
          const isEphemeral = cmd.IsEphemeral ?? true;
          await interaction.deferReply({ ephemeral: isEphemeral });
          const replyVal = await cmd.execute(interaction);

          if (postCommandLogs) {
            try {
              const logChannelId = await discordStorage.getGuildValue(interaction.guildId, 'channel_logchannel');
              if (logChannelId) {
                const logChannel = await interaction.guild?.channels.fetch(logChannelId);
                if (logChannel?.isTextBased()) {
                  const formattedArgs = formatCommandArgs(interaction.options?.data);
                  await logChannel.send([
                    '📝 **Command Executed**',
                    `User: ${interaction.user.username}`,
                    `Command: /${interaction.commandName}`,
                    `Arguments: ${formattedArgs}`
                  ].join('\n'));
                }
              }
            } catch (logErr) {
              console.error(`Failed to post command log for /${interaction.commandName}:`, logErr);
            }
          }

          console.log(`Command ${cmd.Name} completed with: ${replyVal}`);

          if (replyVal?.handled)
            return;

          await interaction.editReply({ content: replyVal || `Command ${cmd.Name} succeeded` });
        } catch(err) {
          console.error(err);
        }
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
      const newName = createThreadStatusName('⏱️', name);
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