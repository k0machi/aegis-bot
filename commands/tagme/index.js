module.exports.exec = async (bot, message, args) => {
    message.channel.send("Tag requested: " + args.join(" "));
    var gname = args.join(" ");
    var user = message.author;
    var guild = message.guild;
    var channel = message.channel;

    if (gname.length > 16) throw { message: "Tag name is too long." };
    if (gname.includes("@")) throw { message: "Tag contains illegal symbols."};
    if (gname.length < 1) throw { message: "Name is too short." };
    let member = await message.guild.members.find("id", user.id);
    let role = await bot.checkTag(gname, guild);
    bot.log.debug("checking role presence");
    if (role) {
        await member.addRole(role.role, "User tag added");
        channel.send("I've tagged you with \"" + role.role.name + "\"");
        return true;
    }
    else {
        let tagmode = await bot.getTagMode(guild);
        let perm = await bot.verifyPermission(message.member, "MANAGE_ROLES");
        bot.log.debug("checking tagmode");
        if (tagmode) {
            bot.log.debug("checking permissions");
            if (!perm) throw { message: "Missing permissions for creating a tag." };
        }
        bot.log.debug("checking blacklist");
        if (bot.checkUserBlacklist(member)) throw { message: "Blacklisted user." };
        
        let tag = await bot.createTag(gname, guild, user, Date.now());
        await member.addRole(tag, "User tag");
        channel.send("I've tagged you with \"" + tag.name + "\"");
        return true;
    }
};

module.exports.meta = {
    action: "tagme"
};

module.exports.help = function (pfx) {
    var data = {
        pretty: "Tag a user",
        description: "Creates (if it doesn't exist) a tag and auto-assigns it on a user who requested the tag",
        examples: `${pfx}${this.meta.action} <name>`
    };

    return data;
};
