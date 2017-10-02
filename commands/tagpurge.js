module.exports.exec = async (bot, message, args) => {
    perm = bot.verifyPermission(message.author, message.guild, "MANAGE_ROLES");
    if (!perm) {
        message.channel.send('Missing permissions!');
        return;
    }
    if (message.mentions.members.array().length == 0 && args[0] != bot.config.purgeKey) {
        message.channel.send(`Global purge requested! Please type \`${bot.pfx}tagpurge ${bot.config.purgeKey}\` to confirm this action!!`)
    } else if (message.mentions.members.array().length > 0) {
        message.mentions.members.forEach(async (mbr) => {
            console.log(mbr.id);
            console.log(mbr.guild.id);
            dbtags = await bot.sql.all('SELECT * FROM UserTags WHERE guildid == ? AND creatorid == ?', [mbr.guild.id, mbr.id]);
            tags = [];
            dbtags.forEach((row, rowid) => {
                tags.push(row.tagname);
            });
            for (var i = 0; i < tags.length; i++)
                rv = await bot.deleteTag(tags[i], message.guild, message.channel, bot.client.user);
        });
    }
    if (args.join(' ') == bot.config.purgeKey) {
        dbtags = await bot.sql.all('SELECT * FROM UserTags WHERE guildid == ?', [message.guild.id]);
        tags = [];
        dbtags.forEach((row, rowid) => {
            tags.push(row.tagname);
        });
        for (var i = 0; i < tags.length; i++)
            rv = await bot.deleteTag(tags[i], message.guild, message.channel, bot.client.user);
        rv = await message.channel.send('Purge complete!');
    };
}

module.exports.meta = {
    action: "tagpurge",
    active: true,
    aliases: [],
    permissions: "ALL"
}

module.exports.help = function (pfx) {
    var data = {
        pretty: "Tag purge",
        description: "Remov on steroids",
        examples: `Type ${pfx}${this.meta.action} to do something or whatever`
    };

    return data;
}
