function createThreadStatusName(emoji, name) {
    const regexDiscordEmoji = /:[a-zA-Z0-9_]+:/g;
    const regexEmoji = /([👍]|[❌]|[✅]|[⏱️])/gu; // /(?:(?:\p{RI}\p{RI}|\p{Emoji}(?:\p{Emoji_Modifier}|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})?(?:\u{200D}\p{Emoji}(?:\p{Emoji_Modifier}|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})?)*)|[\u{1f900}-\u{1f9ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}])+$/gu;
    const finalName = name.replaceAll(regexDiscordEmoji, '').replaceAll(regexEmoji, '');
    return `${emoji} ${finalName}`;
}

module.exports = { createThreadStatusName };