module.exports.exec = async (bot, message, args) => {
    var guild = message.guild;
    bot.logToDB(message.author.id, message.createdTimestamp, 'Test #2', args.join(','), guild);        
}

module.exports.meta = {
    action: "logcommand",
    active: true,
    aliases: [],
    permissions: "ALL"
}

module.exports.help = function (pfx) {
    var data = {
        pretty: "Log command",
        description: "For debug and such",
        examples: `Type ${pfx}${this.meta.action} to do something or whatever`
    };

    return data;
}
