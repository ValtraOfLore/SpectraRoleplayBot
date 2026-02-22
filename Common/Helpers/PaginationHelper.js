async function pageAndProcessData(manager, processorCallback = async (item) => item, limit = 100, additionalOptions, afterKey = 'id') {
    if (!manager)
        throw `No fetchPromise method given`

    const result = [];
    let fetchCount = 0;
    let after;

    do {
        const dataColl = await manager.fetch(after ? { limit, after, ...additionalOptions } : { limit, ...additionalOptions });

        fetchCount = dataColl.size;
        if (fetchCount >= limit) {
            after = dataColl.last()?.[afterKey];
        }

        for (const [key, data] of dataColl) {
            const processedResult = await processorCallback(data);
            result.push(processedResult);
        }

    } while (fetchCount >= limit);

    return result;
}

module.exports = { pageAndProcessData };