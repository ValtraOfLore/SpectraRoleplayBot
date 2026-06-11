const NodeCache = require('node-cache');
const Dotenv = require('dotenv');

Dotenv.config();

const memberPoolCache = new NodeCache({ stdTTL: parseInt(process.env.CACHE_MEMBER_POOL_TIME, 10) || 21600 });

function getDisplayName(member) {
  return member?.displayName || member?.nickname || member?.user?.globalName || member?.user?.username || 'Unknown User';
}

async function getGuildMemberPool(guild) {
  const cachedMembers = memberPoolCache.get(guild.id);

  if (cachedMembers) {
    return cachedMembers;
  }

  const members = await guild.members.fetch();
  const memberPool = members
    .filter((member) => member && !member.user?.bot)
    .map((member) => ({
      id: member.user.id,
      displayName: getDisplayName(member)
    }));

  memberPoolCache.set(guild.id, memberPool);
  return memberPool;
}

async function getEligibleGuildMemberIds(guild, excludedIds = new Set()) {
  const memberPool = await getGuildMemberPool(guild);
  return memberPool.filter((member) => !excludedIds.has(member.id));
}

module.exports = { getGuildMemberPool, getEligibleGuildMemberIds };