module.exports.exec = async (bot, message, args) => {
    message.channel.send('Tag requested: ' + args.join(' '));
    var gname = args.join(' ');
    var user = message.author;
    var guild = message.guild;
    var channel = message.channel;

    if (gname.length > 16) { channel.send('Tag name is too long.'); return false; };
    if (gname.includes('@')) { channel.send('Tag contains illegal symbols.'); return false; };
    if (gname.length < 1) { channel.send('Name is too short.'); return false; };
    try {
        member = await message.guild.members.find('id', user.id);
        role = await bot.checkTag(gname, guild);
        //console.log(role);
        if (role) {
            rv = await member.addRole(role.role, 'User tag added');
            channel.send('I\'ve tagged you with "' + role.role.name + '"');
            return true;
        }
        else {
            tagmode = await bot.getTagMode(guild);
            if (tagmode) {
                perm = await bot.verifyPermission(user, guild, "MANAGE_ROLES");
                if (!perm) {
                    channel.send("Missing permissions for creating a tag.");
                    return false;
                }
            }
            if (bot.checkUserBlacklist(member)) {
                channel.send("No.");
                return false;
            }
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
