const { DiscordCommand, DiscordCommandArgumentTypes, DiscordCommandAccessLevel } = require('./DiscordCommand');
const { DiscordDataStorage } = require('./DiscordDataStorage');
const { createThreadStatusName } = require('../Helpers/Threads.js');
const { postAwards } = require('../Helpers/Awards.js');
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
        return 'Live!';
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
          return 'access_level set for role!';
        } catch (e) {
          console.error(e);
          return 'Failed to set access_level for role!';
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
            return `Command ${commandName} not found!`;
          } else if (command.DefaultAccessLevel === DiscordCommandAccessLevel.OWNER) {
            return `Cannot override OWNER level commands!`;
          } else {
            await dataStorage.setGuildValue(guildId, `command_level_${commandName}`, accessLvl);
            return 'access_level set for command!';
          }
        } catch (e) {
          console.error(e);
          return 'Failed to set access_level for command!';

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
        return `Role ${role} has access level: ${accessLevel || '4'}`;
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
          return `Command ${commandName} not found!`;
        } else {
          const accessLevel = await command.getCommandAccessLevel(interaction);
          return `Command ${commandName} has access level: ${accessLevel || '4'}`;
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
            { ChoiceName: 'CharacterApprovalChannel', ChoiceValue: 'characterapprovalchannel' },
            { ChoiceName: 'IntroerChannel', ChoiceValue: 'introerchannel' },
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
          return `Channel ${channel} set as ${channelType}!`;
        } catch (e) {
          console.error(e);
          return `An error has occurred while setting channel.`;
        }
      }
    )
  ],
  [
    'set_config',
    new DiscordCommand(
      'set_config',
      'Sets a config for the bot..',
      [
        {
          Type: DiscordCommandArgumentTypes.STRING,
          Name: 'configtype',
          Description: 'The configuration type.',
          Required: true,
          Choices: [
            { ChoiceName: 'ApprovedCharacterDM', ChoiceValue: 'approvedcharacterdm' },
            { ChoiceName: 'NeedsIntroRole', ChoiceValue: 'needsintrorole' },
          ]
        },
        {
          Type: DiscordCommandArgumentTypes.STRING,
          Name: 'configvalue',
          Description: 'The configuration value.',
          Required: true
        }
      ],
      DiscordCommandAccessLevel.ADMINISTRATOR,
      async (interaction) => {
        const guildId = interaction.guildId;
        const configType = interaction.options?.get('configtype')?.value;
        const configValue = interaction.options?.get('configvalue')?.value;
        try {
          await dataStorage.setGuildValue(guildId, `config_${configType}`, configValue);
          return `Configuration ${configType} set as ${configValue}!`;
        } catch (e) {
          console.error(e);
          return `An error has occurred while setting configs.`;
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
          console.log(`Setting character approval status for ${thread.name}`);
          let emoji;
          let message;
          let sendIntrodMsg = false;
          let checkNeedsIntroRole = false;
          switch (status) {
            case 'approved':
              emoji = '👍';
              const msg = await dataStorage.getGuildValue(guildId, 'config_approvedcharacterdm');
              message = msg ? `${msg}\n\nCharacter: ${thread.name}` : `Your character ${thread.name} has been approved! Please meet with an intro'er for your intro!`;
              sendIntrodMsg = true;
              checkNeedsIntroRole = true;
              break;
            case 'declined':
              emoji = '❌';
              message = `Your character ${thread.name} has been declined. You may appeal with officers by reaching out to an advisor/admin!`;
              break;
            case 'introduced':
              emoji = '✅';
              checkNeedsIntroRole = true;
              break;
            case 'awaiting':
            default:
              emoji = '⏱️';
          }

          try {
            console.log(`Setting thread name for ${thread.name}`);
            thread.setName(createThreadStatusName(emoji, thread.name));
          } catch (e) {
            console.error(e);
          }

          if (sendIntrodMsg) {
            const introdChannel = await dataStorage.getGuildValue(guildId, 'channel_introerchannel');
            if (introdChannel) {
              const channel = await interaction.guild.channels.fetch(introdChannel);
              channel.send(`${thread.name} has been approved for intro!`);
            }
          }

          try {
            if (checkNeedsIntroRole) {
              const role = await dataStorage.getGuildValue(guildId, 'config_needsintrorole');
              if (role) {
                const owner = await thread.fetchOwner({ withMember: true });
                const ownerMember = owner?.guildMember;
                let charToIntroCnt = await dataStorage.getUserValue(thread.ownerId, `intro_count_${guildId}`) ?? 0;

                if (status === 'approved') {
                  charToIntroCnt += 1;
                } else if (status === 'introduced') {
                  charToIntroCnt = charToIntroCnt > 0 ? charToIntroCnt - 1 : 0;
                }

                dataStorage.setUserValue(thread.ownerId, `intro_count_${guildId}`, charToIntroCnt);

                if (charToIntroCnt > 0 && ownerMember) {
                  console.log('User needs intro. Upserting Intro Role');
                  ownerMember.roles.add(role);
                } else if (ownerMember) {
                  console.log('The user no longer needs an intro. Removing the Intro Role.');
                  ownerMember.roles.remove(role);
                } else {
                  console.warn('Owner not found. Skipping role assignment');
                }
              }
            }
          } catch (e) {
            console.error(e);
          }

          if (message && senddm) {
            const ownerId = thread.ownerId;
            const member = thread.guild.members.cache.get(ownerId);
            if (member) {
              console.log(`Sending DM to member about approval`);
              try {
                const dm = await member.createDM();
                dm.send(message);
              } catch (e) {
                console.error(e);
              }
            }
          }
        }
      }
    )
  ],
  [
    'mark_intro',
    new DiscordCommand(
      'mark_intro',
      'Sets the character as introd.',
      [],
      DiscordCommandAccessLevel.GUEST,
      async (interaction) => {
        const guildId = interaction.guildId;
        const thread = interaction.channel;
        const parentChannelId = interaction.channel?.parentId;
        const approvalChannel = await dataStorage.getGuildValue(guildId, 'channel_characterapprovalchannel');
        if (thread && approvalChannel === parentChannelId) {
          console.log(`Setting character approval status for ${thread.name} as introd`);

          if (thread.name?.match('👍')) {
            try {
              console.log(`Setting thread name for ${thread.name}`);
              await thread.setName(createThreadStatusName('✅', thread.name));

              const role = await dataStorage.getGuildValue(guildId, 'config_needsintrorole');
              if (role) {
                const owner = await thread.fetchOwner({ withMember: true });
                const ownerMember = owner?.guildMember;
                let charToIntroCnt = await dataStorage.getUserValue(thread.ownerId, `intro_count_${guildId}`) ?? 0;
                charToIntroCnt = charToIntroCnt > 0 ? charToIntroCnt - 1 : 0;

                dataStorage.setUserValue(thread.ownerId, `intro_count_${guildId}`, charToIntroCnt);

                if (ownerMember && charToIntroCnt < 1) {
                  console.log('The user no longer needs an intro. Removing the Intro Role.');
                  ownerMember.roles.remove(role);
                } else {
                  console.warn('Owner not found. Skipping role assignment');
                }
              }

            } catch (e) {
              console.error(e);
            }
          } else {
            console.warn(`${thread.name} has not been approved!`);
            return 'Character must be approved before being marked introd!';
          }
        }
      }
    )
  ],
  [
    'post_award',
    new DiscordCommand(
      'post_award',
      'Posts a new award entry that can be given out to characters.',
      [
        {
          Type: DiscordCommandArgumentTypes.STRING,
          Name: 'award_id',
          Description: 'The id given to the award. This must be a snake-case lowercase word.',
          Required: true
        },
        {
          Type: DiscordCommandArgumentTypes.STRING,
          Name: 'award_display_name',
          Description: 'The display name given to the award.',
          Required: true
        },
        {
          Type: DiscordCommandArgumentTypes.STRING,
          Name: 'award_image',
          Description: 'The image URL to the award. This must be a direct link image URL.',
          Required: true
        },
        {
          Type: DiscordCommandArgumentTypes.STRING,
          Name: 'award_description',
          Description: 'The description given to the award.',
          Required: false
        }
      ],
      DiscordCommandAccessLevel.MODERATOR,
      async (interaction) => {
        const guildId = interaction.guildId;
        const awardId = interaction.options?.get('award_id')?.value;
        const awardName = interaction.options?.get('award_display_name')?.value;
        const awardImgUrl = interaction.options?.get('award_image')?.value;
        const awardDescr = interaction.options?.get('award_description')?.value;

        if (!awardId.match(/^[a-z]+(_[a-z]+)*$/)) {
          return `Fail to process award. The award_id you entered "${awardId}" must be snake-case lowercase with no special characters.`;
        } else if (!awardImgUrl.match(/^https?:\/\/[^\s]+?\.(?:jpg|jpeg|png|gif|webp|bmp|svg)(?:\?[^\s]*)?$/)) {
          return `Failed to process award. The award_image you entered "${awardImgUrl}" must be in valid direct-link format. Ensure that the format (e.g. jpg, png) appears at the end of the URL.`
        }

        const guildAwards = await dataStorage.getGuildValue(guildId, 'awards') ?? [];

        if (guildAwards.find((award) => award.awardId === awardId))
          return `The awardId you used "${awardId}" already exists. Please use a new one.`;

        try {
          const awardObj = { awardId, awardName, awardDescr, awardImgUrl };
          guildAwards.push(awardObj);
          await dataStorage.setGuildValue(guildId, 'awards', guildAwards);
          return `Award created successfully: \n${JSON.stringify(awardObj)}`;
        } catch (e) {
          console.error(e);
          return 'An error has occurred when trying to add an award.';
        }
      }
    )
  ],
  [
    'list_awards',
    new DiscordCommand(
      'list_awards',
      'Lists all of the available awards.',
      [],
      DiscordCommandAccessLevel.GUEST,
      async (interaction) => {
        const guildId = interaction.guildId;

        const guildAwards = await dataStorage.getGuildValue(guildId, 'awards') ?? [];

        return guildAwards.map((award) => `Name: ${award.awardName}, ID: ${award.awardId}, ImgURL: ${award.awardImgUrl}, Description: ${award.awardDescr}`).join('\n');
      }
    )
  ],
  [
    'give_award',
    new DiscordCommand(
      'give_award',
      'Gives an award to a character.',
      [
        {
          Type: DiscordCommandArgumentTypes.STRING,
          Name: 'award_id',
          Description: 'The id given to the award. This must be a snake-case lowercase word.',
          Required: true
        }
      ],
      DiscordCommandAccessLevel.MODERATOR,
      async (interaction) => {
        const guildId = interaction.guildId;
        const awardId = interaction.options?.get('award_id')?.value;
        const thread = interaction.channel;
        const parentChannelId = interaction.channel?.parentId;
        const approvalChannel = await dataStorage.getGuildValue(guildId, 'channel_characterapprovalchannel');
        const threadOwnerId = thread?.ownerId;
        const threadId = thread?.id;

        if (thread && threadId && approvalChannel === parentChannelId) {
          const guildAwards = await dataStorage.getGuildValue(guildId, 'awards') ?? [];
          const award = guildAwards.find((guildAward) => guildAward.awardId === awardId);

          if (!award)
            return `${awardId} is not a valid award_id. Please use a valid award_id or create one using /post_award.`;

          const characterAwards = await dataStorage.getUserValue(threadOwnerId, `awards_${threadId}`) ?? [];

          if (characterAwards.find((ownedAwardId) => ownedAwardId === awardId))
            return `This character already has award ${awardId}.`;

          try {
            characterAwards.push(awardId);
            await dataStorage.setUserValue(threadOwnerId, `awards_${threadId}`, characterAwards);

            const awardMsgThreads = await dataStorage.getUserValue(threadOwnerId, `awards_${threadId}_messages`) ?? [];
            const guildAwards = await dataStorage.getGuildValue(guildId, 'awards');
            const urlArray = characterAwards.map((awardId) => guildAwards.find((awardObj) => awardObj.awardId === awardId)?.awardImgUrl);
            const newMsgIds = await postAwards(thread, urlArray, awardMsgThreads);

            dataStorage.setUserValue(threadOwnerId, `awards_${threadId}_messages`, newMsgIds);

            return `Award successfully added!`;
          } catch (e) {
            console.log(e);
            return `An error has occurred while trying to give an award.`;
          }

        }
      }
    )
  ],
  [
    'awards',
    new DiscordCommand(
      'awards',
      'Posts awards for the current character-profile.',
      [],
      DiscordCommandAccessLevel.GUEST,
      async (interaction) => {
        const guildId = interaction.guildId;
        const thread = interaction.channel;
        const parentChannelId = interaction.channel?.parentId;
        const approvalChannel = await dataStorage.getGuildValue(guildId, 'channel_characterapprovalchannel');
        const threadOwnerId = thread?.ownerId;
        const threadId = thread?.id;

        if (thread && threadId && approvalChannel === parentChannelId) {
          const characterAwards = await dataStorage.getUserValue(threadOwnerId, `awards_${threadId}`) ?? [];
          const awardMsgThreads = await dataStorage.getUserValue(threadOwnerId, `awards_${threadId}_messages`) ?? [];
          const guildAwards = await dataStorage.getGuildValue(guildId, 'awards');
          const urlArray = characterAwards.map((awardId) => guildAwards.find((awardObj) => awardObj.awardId === awardId)?.awardImgUrl);
          const newMsgIds = await postAwards(thread, urlArray, awardMsgThreads);

          if (newMsgIds.length < 1)
            return `This user has no awards!`;

          dataStorage.setUserValue(threadOwnerId, `awards_${threadId}_messages`, newMsgIds);
        }
      }
    )
  ],
]);

module.exports = { commands };