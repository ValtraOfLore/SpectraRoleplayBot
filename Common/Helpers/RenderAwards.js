const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

const pageSize = 3072;
const tileSize = 1024;
const backgroundColor = { r: 24, g: 24, b: 24, alpha: 1 };
const outlineColor = '#3a3a3a';
const outlineThickness = 8;

sharp.cache(false);
sharp.concurrency(1);

const gridOutlineSvg = `
<svg width="${pageSize}" height="${pageSize}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${tileSize}" height="${tileSize}" fill="none" stroke="${outlineColor}" stroke-width="${outlineThickness}" />
    <rect x="${tileSize}" y="0" width="${tileSize}" height="${tileSize}" fill="none" stroke="${outlineColor}" stroke-width="${outlineThickness}" />
    <rect x="${tileSize * 2}" y="0" width="${tileSize}" height="${tileSize}" fill="none" stroke="${outlineColor}" stroke-width="${outlineThickness}" />
    <rect x="0" y="${tileSize}" width="${tileSize}" height="${tileSize}" fill="none" stroke="${outlineColor}" stroke-width="${outlineThickness}" />
    <rect x="${tileSize}" y="${tileSize}" width="${tileSize}" height="${tileSize}" fill="none" stroke="${outlineColor}" stroke-width="${outlineThickness}" />
    <rect x="${tileSize * 2}" y="${tileSize}" width="${tileSize}" height="${tileSize}" fill="none" stroke="${outlineColor}" stroke-width="${outlineThickness}" />
    <rect x="0" y="${tileSize * 2}" width="${tileSize}" height="${tileSize}" fill="none" stroke="${outlineColor}" stroke-width="${outlineThickness}" />
    <rect x="${tileSize}" y="${tileSize * 2}" width="${tileSize}" height="${tileSize}" fill="none" stroke="${outlineColor}" stroke-width="${outlineThickness}" />
    <rect x="${tileSize * 2}" y="${tileSize * 2}" width="${tileSize}" height="${tileSize}" fill="none" stroke="${outlineColor}" stroke-width="${outlineThickness}" />
</svg>`;

function createPlaceholderImage() {
    return sharp({
        create: {
            width: tileSize,
            height: tileSize,
            channels: 3,
            background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
    }).png().toBuffer();
}

async function getImageAsBuffer(url) {
    if (!url)
        return createPlaceholderImage();

    const imageResponse = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!imageResponse.ok)
        throw new Error(`Unable to download award image: HTTP ${imageResponse.status}.`);

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    return sharp(imageBuffer)
        .resize(tileSize, tileSize, { fit: 'contain' })
        .png()
        .toBuffer();
}

async function renderAwardPages(urlArray, outputDirectory) {
    await fs.mkdir(outputDirectory, { recursive: true });
    const filePaths = [];

    for (let i = 0; i < urlArray.length; i += 9) {
        const imageBuffers = await Promise.all(urlArray.slice(i, i + 9).map(getImageAsBuffer));
        const compositeInputs = imageBuffers.map((buffer, index) => ({
            input: buffer,
            left: tileSize * (index % 3),
            top: tileSize * Math.floor(index / 3)
        }));
        const filePath = path.join(outputDirectory, `awards-${(i / 9) + 1}.png`);

        await sharp({
            create: {
                width: pageSize,
                height: pageSize,
                channels: 3,
                background: backgroundColor
            }
        })
            .composite([{ input: Buffer.from(gridOutlineSvg) }, ...compositeInputs])
            .png()
            .toFile(filePath);

        filePaths.push(filePath);
    }

    return filePaths;
}

function sendAndExit(message, exitCode) {
    if (process.send) {
        process.send(message, () => process.exit(exitCode));
    } else {
        process.exit(exitCode);
    }
}

process.once('message', async (message) => {
    try {
        const { urlArray, outputDirectory } = message || {};
        if (!Array.isArray(urlArray) || urlArray.length < 1)
            throw new Error('A non-empty award image URL array is required.');
        if (!path.isAbsolute(outputDirectory))
            throw new Error('An absolute output directory is required.');

        const filePaths = await renderAwardPages(urlArray, outputDirectory);
        sendAndExit({ type: 'success', filePaths }, 0);
    } catch (error) {
        console.error(error);
        sendAndExit({ type: 'error', error: error.message || 'Unknown renderer error.' }, 1);
    }
});