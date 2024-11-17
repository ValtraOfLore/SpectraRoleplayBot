const { SlashCommandBuilder, REST, Routes, Options } = require('discord.js');
const { commands } = require('./Commands.js');
const { DiscordCommandArgumentTypes } = require('./DiscordCommand.js');
const Dotenv = require('dotenv');

Dotenv.config();

function mapCommands(cmds) {
  const commArray = [];
  cmds.forEach((discordCmd, cmdKey) => {
    let builtCommand = new SlashCommandBuilder()
      .setName(discordCmd.Name)
      .setDescription(discordCmd.Description);

    discordCmd.Arguments?.forEach((arg) => {
      const func = (option) => {
        option.setName(arg.Name).setDescription(arg.Description).setRequired(arg.Required);
        if (arg.Choices) {
          option.addChoices(
            ...(arg.Choices.map((choice) => {
              return { name: choice.ChoiceName, value: choice.ChoiceValue };
            }))
          );
        }
        return option;
      }

      switch (arg.Type) {
        case DiscordCommandArgumentTypes.STRING:
          builtCommand = builtCommand.addStringOption(func);
          break;
        case DiscordCommandArgumentTypes.INTEGER:
          builtCommand = builtCommand.addIntegerOption(func);
          break;
        case DiscordCommandArgumentTypes.NUMBER:
          builtCommand = builtCommand.addNumberOption(func);
          break;
        case DiscordCommandArgumentTypes.BOOLEAN:
          builtCommand = builtCommand.addBooleanOption(func);
          break;
        case DiscordCommandArgumentTypes.USER:
          builtCommand = builtCommand.addUserOption(func);
          break;
        case DiscordCommandArgumentTypes.CHANNEL:
          builtCommand = builtCommand.addChannelOption(func);
          break;
        case DiscordCommandArgumentTypes.ROLE:
          builtCommand = builtCommand.addRoleOption(func);
          break;
        case DiscordCommandArgumentTypes.MENTIONABLE:
          builtCommand = builtCommand.addMentionableOption(func);
          break;
        case DiscordCommandArgumentTypes.ATTACHMENT:
          builtCommand = builtCommand.addAttachmentOption(func);
          break;
        default:
          console.error(`Type ${arg.Type} not valid`);
      }
    });

    commArray.push(builtCommand.toJSON());
  });
  return commArray;
}

async function updateCommands(oryonServer = true) {
  const cmds = mapCommands(commands);
  const rest = new REST().setToken(process.env.BOT_TOKEN);
  const data = await rest.put(
    oryonServer
      ? Routes.applicationGuildCommands(
          process.env.APPLICATION_ID,
          process.env.DISCORD_SERVER_ID
        )
      : Routes.applicationCommands(process.env.APPLICATION_ID),
    { body: cmds }
  );
}

module.exports = { updateCommands };
