const { AttachmentBuilder } = require('discord.js');
const { fork } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const renderAwardsScriptPath = path.resolve(__dirname, 'RenderAwards.js');
const renderTimeoutMs = 120000;

function renderAwards(urlArray, outputDirectory) {
    return new Promise((resolve, reject) => {
        const renderer = fork(renderAwardsScriptPath, [], {
            stdio: ['ignore', 'ignore', 'ignore', 'ipc']
        });
        let rendererResult;
        let settled = false;

        const fail = (error) => {
            if (settled)
                return;

            settled = true;
            clearTimeout(timeout);
            reject(error instanceof Error ? error : new Error(error));
        };

        const timeout = setTimeout(() => {
            renderer.kill();
            fail(new Error('Award rendering timed out.'));
        }, renderTimeoutMs);

        renderer.once('error', (error) => {
            fail(new Error(`Unable to start the award renderer: ${error.message}`));
        });

        renderer.on('message', (message) => {
            if (message?.type === 'success') {
                rendererResult = message.filePaths;
            } else if (message?.type === 'error') {
                fail(new Error(`Award rendering failed: ${message.error || 'Unknown renderer error.'}`));
            }
        });

        renderer.once('exit', (code, signal) => {
            if (settled)
                return;

            clearTimeout(timeout);

            if (code === 0 && Array.isArray(rendererResult)) {
                settled = true;
                resolve(rendererResult);
                return;
            }

            const exitReason = signal ? `signal ${signal}` : `exit code ${code}`;
            fail(new Error(`Award renderer exited with ${exitReason}.`));
        });

        renderer.send({ urlArray, outputDirectory }, (error) => {
            if (error)
                fail(new Error(`Unable to send work to the award renderer: ${error.message}`));
        });
    });
}

async function postAwards(thread, urlArray, awardMessages) {
    if (urlArray.length < 1)
        return [];

    const newMsgIds = [];

    for (const messageId of awardMessages) {
        try {
            const msgObj = await thread.messages?.fetch(messageId);
            if (msgObj) {
                await msgObj.delete();
            }
        } catch(e) {
            console.warn(`Could not delete message with snowflake ${messageId}. The message may have already been deleted.`);
        }
    }

    const outputDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'spectra-awards-'));

    try {
        const renderedFilePaths = await renderAwards(urlArray, outputDirectory);
        const attachments = renderedFilePaths.map((filePath, index) => (
            new AttachmentBuilder(filePath, { name: `awards-${index + 1}.png` })
        ));
        const msg = await thread.send({ files: attachments });
        newMsgIds.push(msg.id);
        return newMsgIds;
    } finally {
        await fs.rm(outputDirectory, { recursive: true, force: true });
    }
}

module.exports = { postAwards };