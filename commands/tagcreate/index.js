module.exports.exec = async (bot, message, args) => {
    var tagname = args.join(' ');
    var guild = message.guild;
    var user = message.author;
    var time = message.createdTimestamp;
    var channel = message.channel;

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
    action: "tagcreate"
}

module.exports.help = function (pfx) {
    var data = {
        pretty: "Create a tag",
        description: "Creates a tag that can be later assigned with `tagme` command",
        examples: `${pfx}${this.meta.action} <tagname>`
    };

    return data;
}
