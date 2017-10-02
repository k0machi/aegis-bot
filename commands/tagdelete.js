module.exports.exec = async (bot, message, args) => {
    bot.deleteTag(args.join(' '), message.guild, message.channel, message.author);
}

module.exports.meta = {
    action: "tagdelete",
    active: true,
    aliases: [],
    permissions: "ALL"
}

module.exports.help = function (pfx) {
    var data = {
        pretty: "Tag remov",
        description: "Like kebab",
        examples: `Type ${pfx}${this.meta.action} to do something or whatever`
    };

    return data;
}
