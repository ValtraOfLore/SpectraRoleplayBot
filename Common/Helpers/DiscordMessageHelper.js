function splitMessageIntoChunks(content, maxLength = 2000) {
    if (!content || content.length <= maxLength)
        return [content || ''];

    const chunks = [];
    const lines = content.split('\n');
    let currentChunk = '';

    for (const line of lines) {
        const lineWithNewline = `${line}\n`;

        if (lineWithNewline.length > maxLength) {
            if (currentChunk.length > 0) {
                chunks.push(currentChunk.trimEnd());
                currentChunk = '';
            }

            let remainingLine = line;
            while (remainingLine.length > maxLength) {
                chunks.push(remainingLine.slice(0, maxLength));
                remainingLine = remainingLine.slice(maxLength);
            }

            if (remainingLine.length > 0)
                currentChunk = `${remainingLine}\n`;

            continue;
        }

        if ((currentChunk.length + lineWithNewline.length) > maxLength) {
            chunks.push(currentChunk.trimEnd());
            currentChunk = lineWithNewline;
        } else {
            currentChunk += lineWithNewline;
        }
    }

    if (currentChunk.length > 0)
        chunks.push(currentChunk.trimEnd());

    return chunks;
}

async function sendChunkedInteractionResponse(interaction, content, maxLength = 2000) {
    const chunks = splitMessageIntoChunks(content, maxLength);
    const firstChunk = chunks.shift() || 'No results found.';

    await interaction.editReply({ content: firstChunk, ephemeral: true });

    for (const chunk of chunks) {
        await interaction.followUp({ content: chunk, ephemeral: true });
    }

    return { handled: true };
}

module.exports = { splitMessageIntoChunks, sendChunkedInteractionResponse };