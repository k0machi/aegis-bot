module.exports.exec = async (bot, message, args) => {
    bot.deleteTag(args.join(' '), message.guild, message.channel, message.author);
}

module.exports.meta = {
    action: "tagdelete"
}

module.exports.help = function (pfx) {
    var data = {
        pretty: "Delete a tag",
        description: "Removes a tag from the server",
        examples: `${pfx}${this.meta.action} <tagname>`
    };

    return data;
}
