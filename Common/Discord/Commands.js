const { DiscordCommand, DiscordCommandArgumentTypes, DiscordCommandAccessLevel } = require('./DiscordCommand');
const { DiscordDataStorage } = require('./DiscordDataStorage');
const { createThreadStatusName } = require('../Helpers/Threads.js');
const Dotenv = require('dotenv');

Dotenv.config();
const dataStorage = new DiscordDataStorage();

const commands = new Map([
  [
    'pingbot',
    new DiscordCommand(
      'pingbot', 
      'Pings the bot.',
      [],
      DiscordCommandAccessLevel.MODERATOR,
      (interaction) => {
        interaction.reply('Live!');
      }
    )
  ],
  [
    'set_role_access_level',
    new DiscordCommand(
      'set_role_access_level',
      'Sets the access level a role has.',
      [
        {
          Type: DiscordCommandArgumentTypes.ROLE,
          Name: 'role',
          Description: 'The role chosen.',
          Required: true
        },
        {
          Type: DiscordCommandArgumentTypes.INTEGER,
          Name: 'access_level',
          Description: 'The access level chosen.',
          Required: true,
          Choices: [
            { ChoiceName: 'Administrator', ChoiceValue: DiscordCommandAccessLevel.ADMINISTRATOR },
            { ChoiceName: 'Moderator', ChoiceValue: DiscordCommandAccessLevel.MODERATOR },
            { ChoiceName: 'Guest', ChoiceValue: DiscordCommandAccessLevel.GUEST }
          ]
        }
      ],
      DiscordCommandAccessLevel.OWNER,
      async (interaction) => {
        try {
          const guildId = interaction.guildId;
          const roleId = interaction.options?.get('role')?.value;
          const accessLvl = interaction.options?.get('access_level')?.value;
          await dataStorage.setGuildValue(guildId, `role_access_level_${roleId}`, accessLvl);
          interaction.reply('access_level set for role!');
        } catch(e) {
          interaction.reply('Failed to set access_level for role!');
          console.error(e);
        }
      }
    )
  ],
  [
    'set_command_access_level',
    new DiscordCommand(
      'set_command_access_level',
      'Overrides the access level needed for a command.',
      [
        {
          Type: DiscordCommandArgumentTypes.STRING,
          Name: 'command_name',
          Description: 'The command chosen.',
          Required: true
        },
        {
          Type: DiscordCommandArgumentTypes.INTEGER,
          Name: 'access_level',
          Description: 'The access level chosen.',
          Required: true,
          Choices: [
            { ChoiceName: 'Administrator', ChoiceValue: DiscordCommandAccessLevel.ADMINISTRATOR },
            { ChoiceName: 'Moderator', ChoiceValue: DiscordCommandAccessLevel.MODERATOR },
            { ChoiceName: 'Guest', ChoiceValue: DiscordCommandAccessLevel.GUEST }
          ]
        }
      ],
      DiscordCommandAccessLevel.OWNER,
      async (interaction) => {
        try {
          const guildId = interaction.guildId;
          const commandName = interaction.options?.get('command_name')?.value;
          const accessLvl = interaction.options?.get('access_level')?.value;
          const command = commands.get(commandName);

          if (!command) {
            interaction.reply(`Command ${commandName} not found!`);
          } else if (command.DefaultAccessLevel === DiscordCommandAccessLevel.OWNER) {
            interaction.reply(`Cannot override OWNER level commands!`);
          } else {
            await dataStorage.setGuildValue(guildId, `command_level_${commandName}`, accessLvl);
            interaction.reply('access_level set for command!');
          }
        } catch(e) {
          interaction.reply('Failed to set access_level for command!');
          console.error(e);
        }
      }
    )
  ],
  [
    'get_role_access_level',
    new DiscordCommand(
      'get_role_access_level',
      'Responds with the chosen role\'s access level.',
      [
        {
          Type: DiscordCommandArgumentTypes.ROLE,
          Name: 'role',
          Description: 'The role.',
          Required: true
        }
      ],
      DiscordCommandAccessLevel.ADMINISTRATOR,
      async (interaction) => {
        const role = interaction.options?.get('role')?.value;
        const accessLevel = await dataStorage.getGuildValue(interaction.guildId, `role_access_level_${role}`);
        interaction.reply(`Role ${role} has access level: ${accessLevel || '4'}`);
      }
    )
  ],
  [
    'get_command_access_level',
    new DiscordCommand(
      'get_commands_access_level',
      'Responds with the chosen command\'s access level.',
      [
        {
          Type: DiscordCommandArgumentTypes.STRING,
          Name: 'command_name',
          Description: 'The command chosen.',
          Required: true
        }
      ],
      DiscordCommandAccessLevel.ADMINISTRATOR,
      async (interaction) => {
        const commandName = interaction.options?.get('command_name')?.value;
        const command = commands.get(commandName);

        if (!command) {
          interaction.reply(`Command ${commandName} not found!`);
        } else {
          const accessLevel = await command.getCommandAccessLevel(interaction);
          interaction.reply(`Command ${commandName} has access level: ${accessLevel || '4'}`);
        }
      }
    )
  ],
  [
    'set_channel',
    new DiscordCommand(
      'set_channel',
      'Sets a channel for bot interaction.',
      [
        {
          Type: DiscordCommandArgumentTypes.CHANNEL,
          Name: 'channel',
          Description: 'The channel chosen.',
          Required: true
        },
        {
          Type: DiscordCommandArgumentTypes.STRING,
          Name: 'channeltype',
          Description: 'The channel type chosen.',
          Required: true,
          Choices: [
            { ChoiceName: 'BotLogChannel', ChoiceValue: 'logchannel' },
            { ChoiceName: 'CharacterApprovalChannel', ChoiceValue: 'characterapprovalchannel' }
          ]
        }
      ],
      DiscordCommandAccessLevel.ADMINISTRATOR,
      async (interaction) => {
        const guildId = interaction.guildId;
        const channel = interaction.options?.get('channel')?.value;
        const channelType = interaction.options?.get('channeltype')?.value;
        try {
          await dataStorage.setGuildValue(guildId, `channel_${channelType}`, channel);
          interaction.reply(`Channel ${channel} set as ${channelType}!`);
        } catch(e) {
          console.error(e);
        }
      }
    )
  ],
  [
    'approve_character',
    new DiscordCommand(
      'approve_character',
      'Sets the approval status of a character.',
      [
        {
          Type: DiscordCommandArgumentTypes.STRING,
          Name: 'status',
          Description: 'The status to move the character to.',
          Required: true,
          Choices: [
            { ChoiceName: 'Approve', ChoiceValue: 'approved' },
            { ChoiceName: 'Deny', ChoiceValue: 'declined' },
            { ChoiceName: 'Awaiting', ChoiceValue: 'awaiting' },
            { ChoiceName: 'Introd', ChoiceValue: 'introduced' },
          ]
        },
        {
          Type: DiscordCommandArgumentTypes.BOOLEAN,
          Name: 'senddm',
          Description: 'Whether a DM should be sent to the user.',
          Required: false
        }
      ],
      DiscordCommandAccessLevel.MODERATOR,
      async (interaction) => {
        const guildId = interaction.guildId;
        const status = interaction.options?.get('status')?.value;
        const senddm = interaction.options?.get('senddm')?.value;
        const thread = interaction.channel;
        const parentChannelId = interaction.channel?.parentId;
        const approvalChannel = await dataStorage.getGuildValue(guildId, 'channel_characterapprovalchannel');
        if (thread && approvalChannel === parentChannelId) {
          let emoji;
          switch (status) {
            case 'approved':
              emoji = ':thumbsup:';
              break;
            case 'declined':
              emoji = ':x:';
              break;
            case 'introduced':
              emoji = ':white_check_mark:';
              break;
            case 'awaiting':
            default:
              emoji = ':timer:';
          }

          await thread.setName(createThreadStatusName(emoji, thread.name));
        }
      }
    )
  ],
]);

module.exports = { commands }