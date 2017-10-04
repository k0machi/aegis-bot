module.exports.exec = async (bot, message, args) => {
    amount = parseInt(args[0], 10) || 1;

    var guild = message.guild;
    var channel = message.channel;
    var user = message.author;
    var member = await guild.fetchMember(user);
    if (bot.verifyPermission(user, guild, "MANAGE_MESSAGES")) {
        channel.send('Okay.').then(() => {
            channel.bulkDelete(amount + 2);
            bot.logToDB(member.id, message.createdTimestamp, 'DELETE_MESSAGE', [amount, member.user.username + ' deleted ' + amount + ' messages from channel ' + message.channel.name], message.guild);
        });
    } else {
        channel.send('No.');
    }
}

module.exports.meta = {
    action: "deletemsg",
    active: true,
    aliases: [],
    permissions: "ALL"
}

module.exports.help = function (pfx) {
    var data = {
        pretty: "Mass delete",
        description: "Fucks shit up yo",
        examples: `Type ${pfx}${this.meta.action} to do something or whatever`
    };

    return data;
}
