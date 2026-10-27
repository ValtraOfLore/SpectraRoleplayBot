const { ChannelType } = require('discord.js');
const { ClientManager } = require('../Common/Discord/ClientManager.js');
const { splitMessageIntoChunks } = require('../Common/Helpers/DiscordMessageHelper.js');

const GUILD_ID = '970768724095279136'; // Task Force Oryon
const SOURCE_FORUM_CHANNEL_ID = '1097126313996857445';
const DESTINATION_FORUM_CHANNEL_ID = '1553703737418063942';

// Keep this false for a safe run that copies missing-member posts but leaves the original forum posts in place.
// Set to true only when you want originals deleted after they have been copied to the archive forum.
const DELETE_ORIGINAL_POST_AFTER_ARCHIVE = true;

const SCRIPT_RUN_ID = `forum-archive-${new Date().toISOString().replace(/[:.]/g, '-')}-${Math.random().toString(36).slice(2, 8)}`;
const ARCHIVE_KEY_PREFIX = 'forum-archive-original-thread';
const MAX_MESSAGE_LENGTH = 2000;
const MAX_ATTACHMENTS_PER_MESSAGE = 10;

async function fetchAllForumThreads(forumChannel) {
    const threads = new Map();

    const addThreads = (threadCollection) => {
        threadCollection.each((thread) => {
            threads.set(thread.id, thread);
        });
    };

    const activeThreads = await forumChannel.threads.fetchActive();
    addThreads(activeThreads.threads);

    let before;
    while (true) {
        const archivedThreads = await forumChannel.threads.fetchArchived({
            type: 'public',
            limit: 100,
            before,
        });

        addThreads(archivedThreads.threads);

        if (!archivedThreads.hasMore || archivedThreads.threads.size < 1) {
            break;
        }

        before = archivedThreads.threads.last().id;
    }

    return [...threads.values()];
}

async function isMemberInGuild(guild, userId) {
    if (!userId) {
        return false;
    }

    try {
        await guild.members.fetch({ user: userId, force: true });
        return true;
    } catch (e) {
        return false;
    }
}

async function getOriginalPosterLabel(client, userId) {
    if (!userId) {
        return 'Unknown user';
    }

    try {
        const user = await client.users.fetch(userId);
        return `${user.username} (${user.id})`;
    } catch (e) {
        return `Unknown user (${userId})`;
    }
}

async function fetchStarterMessage(thread) {
    try {
        return await thread.messages.fetch(thread.id);
    } catch (e) {
        const messages = await thread.messages.fetch({ limit: 100 });
        return messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp).first();
    }
}

function createArchiveKey(threadId) {
    return `${ARCHIVE_KEY_PREFIX}-${threadId}`;
}

function createArchiveMessage({ thread, starterMessage, originalPosterLabel, archiveKey, archiveId, archiveDate }) {
    const originalContent = starterMessage?.content?.trim() || '[No text content in the original starter post.]';
    const metadata = [
        '**Archived Forum Post**',
        '',
        `Archive Key: ${archiveKey}`,
        `Archive ID: ${archiveId}`,
        `Script Run ID: ${SCRIPT_RUN_ID}`,
        `Archive Date: ${archiveDate}`,
        `Original Poster: ${originalPosterLabel}`,
        `Original Poster ID: ${thread.ownerId || 'Unknown'}`,
        `Original Thread: ${thread.name} (${thread.id})`,
        `Original Thread ID: ${thread.id}`,
        `Original Created: ${thread.createdAt?.toISOString() || 'Unknown'}`,
        '',
        '**Original Post Content**',
        originalContent,
    ].join('\n');

    return metadata;
}

function getStarterAttachments(starterMessage) {
    if (!starterMessage?.attachments?.size) {
        return [];
    }

    return starterMessage.attachments.map((attachment) => attachment.url).slice(0, MAX_ATTACHMENTS_PER_MESSAGE);
}

async function getExistingArchiveKeys(destinationForumChannel) {
    const archiveKeys = new Set();
    const destinationThreads = await fetchAllForumThreads(destinationForumChannel);

    console.log(`Checking ${destinationThreads.length} existing archive forum posts for archive keys.`);

    for (const thread of destinationThreads) {
        try {
            const starterMessage = await fetchStarterMessage(thread);
            const archiveKeyMatch = starterMessage?.content?.match(new RegExp(`Archive Key: (${ARCHIVE_KEY_PREFIX}-\\d+)`));

            if (archiveKeyMatch?.[1]) {
                archiveKeys.add(archiveKeyMatch[1]);
            }
        } catch (e) {
            console.error(`Failed to inspect archive forum post ${thread.name} (${thread.id}) for an archive key.`, e);
        }
    }

    return archiveKeys;
}

async function archiveForumPostsByMissingMembers() {
    const clientManager = new ClientManager();
    const client = await clientManager.getClient();
    const guild = client.guilds.cache.get(GUILD_ID) || await client.guilds.fetch(GUILD_ID);

    if (!guild) {
        throw new Error(`Guild ${GUILD_ID} was not found.`);
    }

    const sourceForumChannel = await guild.channels.fetch(SOURCE_FORUM_CHANNEL_ID);
    const destinationForumChannel = await guild.channels.fetch(DESTINATION_FORUM_CHANNEL_ID);

    if (!sourceForumChannel || sourceForumChannel.type !== ChannelType.GuildForum) {
        throw new Error(`Source channel ${SOURCE_FORUM_CHANNEL_ID} was not found or is not a forum channel.`);
    }

    if (!destinationForumChannel || destinationForumChannel.type !== ChannelType.GuildForum) {
        throw new Error(`Destination channel ${DESTINATION_FORUM_CHANNEL_ID} was not found or is not a forum channel.`);
    }

    console.log(`Starting forum archive run ${SCRIPT_RUN_ID}`);
    console.log(`DELETE_ORIGINAL_POST_AFTER_ARCHIVE is set to ${DELETE_ORIGINAL_POST_AFTER_ARCHIVE}`);

    const existingArchiveKeys = await getExistingArchiveKeys(destinationForumChannel);
    const sourceThreads = await fetchAllForumThreads(sourceForumChannel);
    const archivedThreads = [];
    const deletedOriginalThreads = [];
    const skippedThreads = [];
    const failedThreads = [];

    console.log(`Found ${sourceThreads.length} source forum posts to inspect.`);

    for (let index = 0; index < sourceThreads.length; index++) {
        const thread = sourceThreads[index];
        const archiveKey = createArchiveKey(thread.id);
        const archiveId = `${SCRIPT_RUN_ID}-${index + 1}-${thread.id}`;

        try {
            const isMember = await isMemberInGuild(guild, thread.ownerId);
            if (isMember) {
                skippedThreads.push({
                    id: thread.id,
                    name: thread.name,
                    ownerId: thread.ownerId,
                    reason: 'Original poster is still in the guild.',
                });
                continue;
            }

            if (existingArchiveKeys.has(archiveKey)) {
                if (DELETE_ORIGINAL_POST_AFTER_ARCHIVE) {
                    console.log(`${index + 1}/${sourceThreads.length} | Deleting ${thread.name} (${thread.id}); it already exists in the archive forum.`);
                    await thread.delete(`Already archived by archive key ${archiveKey}; deletion run ${SCRIPT_RUN_ID}`);
                    deletedOriginalThreads.push({
                        id: thread.id,
                        name: thread.name,
                        archiveKey,
                    });
                } else {
                    console.log(`${index + 1}/${sourceThreads.length} | Skipping ${thread.name} (${thread.id}); already exists in archive forum.`);
                    skippedThreads.push({
                        id: thread.id,
                        name: thread.name,
                        ownerId: thread.ownerId,
                        reason: 'Already exists in archive forum.',
                    });
                }

                continue;
            }

            console.log(`${index + 1}/${sourceThreads.length} | Copying ${thread.name} (${thread.id}) because owner ${thread.ownerId || 'Unknown'} is not in the guild.`);

            const starterMessage = await fetchStarterMessage(thread);
            const originalPosterLabel = await getOriginalPosterLabel(client, thread.ownerId);
            const archiveDate = new Date().toISOString();
            const archiveMessage = createArchiveMessage({
                thread,
                starterMessage,
                originalPosterLabel,
                archiveKey,
                archiveId,
                archiveDate,
            });
            const attachmentUrls = getStarterAttachments(starterMessage);
            const archiveMessageChunks = splitMessageIntoChunks(archiveMessage, MAX_MESSAGE_LENGTH);

            const createdThread = await destinationForumChannel.threads.create({
                name: thread.name,
                message: {
                    content: archiveMessageChunks[0],
                    files: attachmentUrls,
                },
                reason: `Forum post archived by script run ${SCRIPT_RUN_ID}`,
            });

            for (const chunk of archiveMessageChunks.slice(1)) {
                await createdThread.send({
                    content: chunk,
                });
            }

            existingArchiveKeys.add(archiveKey);
            archivedThreads.push({
                archiveKey,
                archiveId,
                originalThreadId: thread.id,
                originalThreadName: thread.name,
                copiedThreadId: createdThread.id,
                ownerId: thread.ownerId,
            });

            if (DELETE_ORIGINAL_POST_AFTER_ARCHIVE) {
                if (!createdThread?.id) {
                    throw new Error('Archive thread was not created; refusing to delete original forum post.');
                }

                console.log(`Deleting original forum post ${thread.name} (${thread.id}) after archive copy ${createdThread.id}.`);
                await thread.delete(`Archived to ${createdThread.id} by script run ${SCRIPT_RUN_ID}`);
                deletedOriginalThreads.push({
                    id: thread.id,
                    name: thread.name,
                    copiedThreadId: createdThread.id,
                });
            }
        } catch (e) {
            console.error(`Failed to process ${thread.name} (${thread.id})`, e);
            failedThreads.push({
                id: thread.id,
                name: thread.name,
                ownerId: thread.ownerId,
                error: e.message,
            });
        }
    }

    console.log(`Forum archive run ${SCRIPT_RUN_ID} complete. Archived: ${archivedThreads.length}, Deleted Originals: ${deletedOriginalThreads.length}, Skipped: ${skippedThreads.length}, Failed: ${failedThreads.length}`);
    console.log({ archivedThreads, deletedOriginalThreads, skippedThreads, failedThreads });
    process.exit(failedThreads.length > 0 ? 1 : 0);
}

archiveForumPostsByMissingMembers().catch((error) => {
    console.error('Forum archive script failed.', error);
    process.exit(1);
});