const { ClientManager } = require('../Common/Discord/ClientManager.js');

const GUILD_ID = '970768724095279136' // Oryon '1196879786497286284' // Dreadmarch;
const ROLE_ID = '1324492267213553726' //Oryon '1517709606409998409';

async function giveRoleToEveryone() {
    const clientManager = new ClientManager();
    const client = await clientManager.getClient();
    const guild = client.guilds.cache.get(GUILD_ID);

    if (!guild) {
        throw new Error(`Guild ${GUILD_ID} was not found in the bot cache.`);
    }

    const members = await guild.members.fetch();
    const updatedMembers = [];
    const skippedMembers = [];
    const failedMembers = [];

    for (const member of members.values()) {
        if (member.user.bot) {
            skippedMembers.push({
                id: member.id,
                username: member.user.username,
                reason: 'Bot account',
            });
            continue;
        }

        if (member.roles.cache.has(ROLE_ID)) {
            skippedMembers.push({
                id: member.id,
                username: member.user.username,
                reason: 'Already has role',
            });
            continue;
        }

        try {
            console.log(`Adding role to ${member.user.username}`);
            await member.roles.add(ROLE_ID, 'Mass role assignment script');
            updatedMembers.push({
                id: member.id,
                username: member.user.username,
            });
        } catch (error) {
            console.error(`Failed to add role to ${member.user.username}`, error);
            failedMembers.push({
                id: member.id,
                username: member.user.username,
                error: error.message,
            });
        }
    }

    console.log(`Role assignment complete. Updated: ${updatedMembers.length}, Skipped: ${skippedMembers.length}, Failed: ${failedMembers.length}`);
    console.log({ updatedMembers, skippedMembers, failedMembers });
    process.exit();
}

giveRoleToEveryone().catch((error) => {
    console.error('Mass role assignment failed.', error);
    process.exit(1);
});