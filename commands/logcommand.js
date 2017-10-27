module.exports.exec = async (bot, message, args) => {
    var guild = message.guild;
    bot.logToDB(message.author.id, message.createdTimestamp, 'Test #2', args.join(','), guild);        
}

module.exports.meta = {
    action: "logcommand",
    active: true,
    aliases: ['lc'],
    permissions: "ALL"
}

module.exports.help = function (pfx) {
    var data = {
        pretty: "Log command",
        description: "Test SQL History table",
        examples: `${pfx}${this.meta.action}`
    };

    return data;
}
