const { ClientManager } = require('../Common/Discord/ClientManager.js');
const fs = require('node:fs/promises');

async function kickInactivity() {
    const msg = 'Salutations!\n\nYou were removed from the **Task Force Oryon** Discord because your user was marked as inactive.\nIf this was a mistake, or you would like to rejoin the server you are always welcomed back!\n\nhttps://discord.gg/26YeDpB67j';
    const clientManager = new ClientManager();
    const client = await clientManager.getClient();
    const toKick = [];
    const toKickData = [];
    const oryonGuild = client.guilds.cache.get('970768724095279136');
    const oryonMembers = await oryonGuild.members.fetch(); // await oryonGuild.members.list({ limit: 1000 });

    oryonMembers.filter((member) => member.roles.cache.find(role => role.id === '1221961863873695874')).each(async (member) => {
      toKickData.push({
        ID: member.id,
        NickName: member.nickname,
        UserName: member.user.username,
      });
      toKick.push(member);
    });

    for (key in toKick) {
      const member = toKick[key];
      // DO NOT UNCOMMENT
      // try {
      //     const dm = await member.createDM(true);
      //     await dm.send(msg);
      // } catch(e) {
      //   console.log(e);
      // }

      try {
        console.log(`Kicking ${member.user.username}`);
        await member.kick('Discord Purge March 2024');
      } catch(e) {
        console.log(e);
      }
    }

    console.log(toKickData);
    await fs.writeFile('./.data/PurgeResult2.json', JSON.stringify(toKickData));
    process.exit();
}

kickInactivity();