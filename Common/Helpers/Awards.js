const sharp = require('sharp');
const { AttachmentBuilder } = require('discord.js');

async function getImageAsBuffer(url) {
    if (!url)
        return sharp({ create: { width: 3166, height: 3166, channels: 3, background: { r: 255, g: 255, b: 255, alpha: 1 } } });

    const imageResponse = await fetch(url);
    if (imageResponse?.ok) {
        const buff = await imageResponse.arrayBuffer();
        return sharp(buff).resize(3166, 3166, { fit: 'contain' }).png().toBuffer();
    } 
}

async function compositeImages(urlArray) {
    const awardPages = [];
    const pageSize = 9500;
    const tileSize = 3166;
    const backgroundColor = { r: 24, g: 24, b: 24, alpha: 1 };
    const outlineColor = '#3a3a3a';
    const outlineThickness = 8;

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

    for (let i = 0; i < urlArray.length; i += 9) {
        const awardPage = sharp({ create: { width: pageSize, height: pageSize, channels: 3, background: backgroundColor } });
        const buffArrProm = urlArray.slice(i, i + 9).map(getImageAsBuffer);
        const buffArr = await Promise.all(buffArrProm);
        const compositeObjsArr = buffArr.map((buff, index) => {
            const left = tileSize * (index % 3);
            const top = tileSize * Math.floor(index / 3);
            return { input: buff, left, top }
        });
        const compositeImage = await awardPage
            .composite([{ input: Buffer.from(gridOutlineSvg) }, ...compositeObjsArr])
            .png()
            .toBuffer();
        awardPages.push(compositeImage);
    }

    return awardPages;
}

async function postAwards(thread, urlArray, awardMessages) {
    if (urlArray.length < 1)
        return [];

    const newMsgIds = [];

    for (const messageId of awardMessages) {
        try {
            const msgObj = await thread.messages?.fetch(messageId);
            if (msgObj) {
                msgObj.delete();
            }
        } catch(e) {
            console.warn(`Could not delete message with snowflake ${messageId}. The message may have already been deleted.`);
        }
    }

    const compositeImageBuffs = await compositeImages(urlArray);
    const attachments = [];

    for (const imgBuff of compositeImageBuffs) {
        const attachment = new AttachmentBuilder(imgBuff, { name: 'image.png' });
        attachments.push(attachment);
    }

    const msg = await thread.send({ files: attachments });
    newMsgIds.push(msg.id);

    return newMsgIds;
}

module.exports = { postAwards };