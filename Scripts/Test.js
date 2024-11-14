const { Client, Events, ShardEvents, IntentsBitField } = require('discord.js');
const Dotenv = require('dotenv');

Dotenv.config();
const client = new Client(
    {
        intents: [
            IntentsBitField.Flags.Guilds,
            IntentsBitField.Flags.GuildMembers,
            IntentsBitField.Flags.GuildMessages,
            IntentsBitField.Flags.MessageContent,
        ]
    }
);

client.on(ShardEvents.Ready, async (eventClient) => {
    console.log(`
        --- Oryon Bot Live ---
        Date Live: ${new Date(eventClient.readyTimestamp)}
        Name: ${eventClient.application.name}
        Owner: ${eventClient.application.owner?.username || eventClient.application.owner?.name}
        --- Oryon Bot Live ---
    `);
    const toKick = [];
    const oryonGuild = eventClient.guilds.cache.get('970768724095279136');
    console.log(oryonGuild.name);
    const member = await oryonGuild.members.fetch('640374819153772544');
    const dm = await member.createDM(true);
    await dm.send('Salutations!\n\nYou were removed from the Task Force Oryon Discord because your user was marked as inactive.\nIf this was a mistake, or you would like to rejoin the server you are always welcomed back!\n\nhttps://discord.gg/26YeDpB67j');
    member.kick();
});

client.login(process.env.BOT_TOKEN);
