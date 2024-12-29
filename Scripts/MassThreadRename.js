const { ClientManager, FetchArchivedThreadOptions } = require('../Common/Discord/ClientManager.js');
const { createThreadStatusName } = require('../Common/Helpers/Threads.js');

async function massThread() {
    const clientManager = new ClientManager();
    const client = await clientManager.getClient();
    const oryonGuild = client.guilds.cache.get('970768724095279136');
    const channel = await oryonGuild.channels.fetch('1091244449700524062');
    const threads = [];
    const errQueue = [];

    // await channel.threads.cache.each(thr => {
    //   threads.push(thr);
    // });
    const fetchedThreads = await channel.threads.fetch() // {archived: {fetchAll: true, limit: 100}});
    fetchedThreads.threads.each(thr => {
      threads.push(thr);
    });
    // console.log(`Threads: ${JSON.stringify(threads)}`);
    console.log(`Need to change ${threads.length} for channel ${channel}`);
    for (let key in threads) {
      const thread = threads[key];
      try {
        if (thread.name.match(':white_check_mark:')) {
          const threadName = createThreadStatusName('✅', thread.name);
          console.log(`${key}/${threads.length} | Changing name for ${thread.name}`);
          if (thread.archived) {
            await thread.setArchived(false);
         }
        await thread.setName(threadName);
        }
      } catch (e) {
        console.error(e);
        errQueue.push(e);
        if (errQueue.length > 3) {
          throw `Error queue overflowed. Errors: ${errQueue.join(', ')}`;
        }
      }
    }
    process.exit();
}

massThread();