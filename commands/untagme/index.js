module.exports.exec = async (bot, message, args) => {
    message.channel.send('Removing tag ' + '"' + args.join(' ') + '"' + " from user " + message.author);
    var gname = args.join(' ');
    var user = message.author;
    var guild = message.guild;
    var channel = message.channel;
    try {
        member = await guild.members.find('id', user.id);
        role = await bot.checkTag(gname, guild);
        if (role) {
            if (!(member.roles.has(role.role.id))) {
                channel.send('You don\'t seem to have this role.');
                return false
            };
            rv = await member.removeRole(role.role, 'User tag removed');
            channel.send('Tag "' + role.role.name + '" removed!');
            if (role.role.members.array().length == 0)
                bot.deleteTag(role.role.name, guild, channel, bot.client.user);
            return true;
        }
        else {
            channel.send('This tag doesn\'t seem to exist!');
        }
    }
    catch (e) {
        channel.send(e.message);
        console.log(e);
    }
}

module.exports.meta = {
    action: "untagme"
}

module.exports.help = function (pfx) {
    var data = {
        pretty: "Remove a tag from user",
        description: "Removes tag from you, optionally deleting a tag if no user has it anymore",
        examples: `${pfx}${this.meta.action} <name>`
    };

    return data;
}
