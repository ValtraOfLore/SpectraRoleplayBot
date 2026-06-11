const NodeCache = require('node-cache');
const Dotenv = require('dotenv');

Dotenv.config();

const memberPoolCache = new NodeCache({ stdTTL: parseInt(process.env.CACHE_MEMBER_POOL_TIME, 10) || 21600 });

async function getGuildMemberPool(guild) {
  const cachedMemberIds = memberPoolCache.get(guild.id);

  if (cachedMemberIds) {
    return cachedMemberIds;
  }

  const members = await guild.members.fetch();
  const memberIds = members
    .filter((member) => member && !member.user?.bot)
    .map((member) => member.user.id);

  memberPoolCache.set(guild.id, memberIds);
  return memberIds;
}

async function getEligibleGuildMemberIds(guild, excludedIds = new Set()) {
  const memberIds = await getGuildMemberPool(guild);
  return memberIds.filter((memberId) => !excludedIds.has(memberId));
}

module.exports = { getGuildMemberPool, getEligibleGuildMemberIds };