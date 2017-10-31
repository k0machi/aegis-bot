module.exports.exec = async (bot, message, args) => {
    amount = parseInt(args[0], 10) || 1;

    var guild = message.guild;
    var channel = message.channel;
    var user = message.author;
    var member = await guild.fetchMember(user);

    channel.send('Okay.').then(() => {
        channel.bulkDelete(amount + 2);
        bot.logToDB(member.id, message.createdTimestamp, 'DELETE_MESSAGE', [amount, member.user.username + ' deleted ' + amount + ' messages from channel ' + message.channel.name], message.guild);
    });
}

module.exports.meta = {
    action: "deletemsg"
}

module.exports.help = function (pfx) {
    var data = {
        pretty: "Mass remove messages",
        description: "Removes bulk amount of messages from the channel",
        examples: `${pfx}${this.meta.action} <amount>`
    };

    return data;
}
