const { DiscordDataStorage } = require('./DiscordDataStorage');

const dataStorage = new DiscordDataStorage();

class DiscordCommand {
    constructor(name, description, args, accessLvl, execution) {
        this.Name = name;
        this.Description = description;
        this.Arguments = args || [];
        this.DefaultAccessLevel = accessLvl || DiscordCommandAccessLevel.GUEST;
        this.ExecutionFunction = execution;
    }

    async getCommandAccessLevel(interaction) {
        const guildId = interaction.guildId;
        return (await dataStorage.getGuildValue(guildId, `command_level_${this.Name}`)) || this.DefaultAccessLevel || DiscordCommandAccessLevel.GUEST;
    }

    async isAccessLevel(interaction) {
        return (await this.getCommandAccessLevel(interaction)) >= (await DiscordCommand.getUserAccessLevel(interaction));
    }

    async execute(interaction) {
        if (this.ExecutionFunction) {
            let args = ''
            interaction.options.data.forEach(
                (option) => {
                    args += `${JSON.stringify(option.value)} `;
                }
            );
            if (await this.isAccessLevel(interaction)) {
                console.log(`Executing ${this.Name} from ${interaction.user.username} with options ${args}\n\n`);
                return this.ExecutionFunction(interaction);
            } else {
                console.log(
                  `Unable to execute ${this.Name} from ${interaction.user.username} with options ${args}: accees level not high enough\n\n`
                );
                return `You do not have permission to access this command`;
            }
        } else {
            console.error(`No ExecutionFunction found for ${this.Name}`);
        }
    } 

    static async getUserAccessLevel(interaction) {
        if (interaction.user?.id === interaction.guild?.ownerId)
            return DiscordCommandAccessLevel.OWNER;

        const guildId = interaction.guildId;
        const roleAccessLevels = [];
        const roles = [];

        interaction.member?.roles?.valueOf().each(role => {
            roles.push(role);
        });

        for (let roleIndex in roles) {
            const role = roles[roleIndex];
            const roleAccessLevel = await dataStorage.getGuildValue(guildId, `role_access_level_${role.id}`);
            if (roleAccessLevel)
                roleAccessLevels.push(roleAccessLevel);
        }

        return roleAccessLevels.length > 0 ? Math.min(...roleAccessLevels) : DiscordCommandAccessLevel.GUEST;
    }
}

const DiscordCommandArgumentTypes = {
    STRING: 'string',
    INTEGER: 'integer',
    NUMBER: 'number',
    BOOLEAN: 'boolean',
    USER: 'user',
    CHANNEL: 'channel',
    ROLE: 'role',
    MENTIONABLE: 'mentionable',
    ATTACHMENT: 'attachment'
};

const DiscordCommandAccessLevel = {
    OWNER: 1,
    ADMINISTRATOR: 2,
    MODERATOR: 3,
    GUEST: 4
}

module.exports = { DiscordCommand, DiscordCommandArgumentTypes, DiscordCommandAccessLevel };