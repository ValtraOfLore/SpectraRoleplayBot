function createThreadStatusName(emoji, name) {
    const regex = /:[a-zA-Z0-9_]+:/;
    const finalName = name.replace(regex, '');
    return `${emoji} ${finalName}`;
}

module.exports = { createThreadStatusName }