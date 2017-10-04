module.exports.exec = async (bot, message, args) => {
    message.channel.send('Tag requested: ' + args.join(' '));
    var gname = args.join(' ');
    var user = message.author;
    var guild = message.guild;
    var channel = message.channel;

    if (gname.length > 16) throw { message: 'Tag name is too long.' }
    if (gname.includes('@')) throw { message: 'Tag contains illegal symbols.'}
    if (gname.length < 1) throw { message: 'Name is too short.' }
    try {
        member = await message.guild.members.find('id', user.id);
        role = await bot.checkTag(gname, guild);
        console.log(`checking role presence`);
        if (role) {
            rv = await member.addRole(role.role, 'User tag added');
            channel.send('I\'ve tagged you with "' + role.role.name + '"');
            return true;
        }
        else {
            tagmode = await bot.getTagMode(guild);
            console.log(`checking tagmode`);
            if (tagmode) {
                perm = await bot.verifyPermission(user, guild, "MANAGE_ROLES");
                console.log(`checking permissions`);
                if (!perm) throw { message: "Missing permissions for creating a tag." }
            }
            console.log(`checking blacklist`);
            if (bot.checkUserBlacklist(member)) throw { message: 'Blacklisted user.' }
            tag = await bot.createTag(gname, guild, user, Date.now());
            rv = await member.addRole(tag, 'User tag');
            channel.send('I\'ve tagged you with "' + tag.name + '"');
            return true;
        }
    }
    catch (e) {
        channel.send(e.message);
        console.log(e);
    }
}

module.exports.meta = {
    action: "tagme",
    active: true,
    aliases: [],
    permissions: "ALL"
}

module.exports.help = function (pfx) {
    var data = {
        pretty: "Tag me",
        description: "Adds a tag to you",
        examples: `Type ${pfx}${this.meta.action} to do something or whatever`
    };

    return data;
}
