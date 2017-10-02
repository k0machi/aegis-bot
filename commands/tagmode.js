﻿module.exports.exec = async (bot, message, args) => {
    var guild = message.guild;
    perm = await bot.verifyPermission(message.author, guild, "MANAGE_ROLES");
    if (!perm) {
        message.channel.send('Missing permission!');
        return;
    }
    mode = await bot.sql.get('SELECT * FROM TagModeData WHERE guildId == ?', [guild.id]);
    if (mode) {
        md = await bot.sql.run('UPDATE TagModeData SET [mode] = ? WHERE guildid == ?', [!mode.mode, mode.guildId]);
        if (mode.mode) {
            message.channel.send('Switched tagging mode to public - everyone can create tags!');
        } else {
            message.channel.send('Switched tagging mode to protected - only people with "Manage Roles" can create new tags');
        }
    } else {
        md = await bot.sql.run('INSERT INTO TagModeData ([guildId], [mode]) VALUES (?, ?)', [guild.id, 1]);
        message.channel.send('Switched tagging mode to protected - only people with "Manage Roles" can create new tags');
    }
}

module.exports.meta = {
    action: "tagmode",
    active: true,
    aliases: [],
    permissions: "ALL"
}

module.exports.help = function (pfx) {
    var data = {
        pretty: "Switch tagmode",
        description: "Cucks you and uncucks you",
        examples: `Type ${pfx}${this.meta.action} to do something or whatever`
    };

    return data;
}
