﻿module.exports.exec = async (bot, message, args) => {
    var tagname = args.join(' ');
    var guild = message.guild;
    var user = message.author;
    var time = message.createdTimestamp;
    var channel = message.channel;

    perm = await bot.verifyPermission(user, guild, "MANAGE_ROLES");
    if (!perm) { channel.send('Missing permissions') };
    try {
        result = await bot.checkTag(tagname, guild);
        if (result) { channel.send('Tag already exists'); return };
        bot.createTag(tagname, guild, user, time);
        channel.send(`Tag "${tagname}" created!`);
    } catch (e) {
        channel.send(e.message);
    }
}

module.exports.meta = {
    action: "tagcreate",
    active: true,
    aliases: [],
    permissions: "ALL"
}

module.exports.help = function (pfx) {
    var data = {
        pretty: "Tag create",
        description: "Like kebab",
        examples: `Type ${pfx}${this.meta.action} to do something or whatever`
    };

    return data;
}