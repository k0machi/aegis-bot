﻿module.exports.exec = async (bot, message, args) => { //eslint-disable-line no-unused-vars
    var guild = message.guild;
    let mode = await bot.sql.get("SELECT * FROM TagModeData WHERE guildId == ?", [guild.id]);
    if (mode) {
        bot.sql.run("UPDATE TagModeData SET [mode] = ? WHERE guildid == ?", [!mode.mode, mode.guildId]);
        if (mode.mode) {
            message.channel.send("Switched tagging mode to public - everyone can create tags!");
        } else {
            message.channel.send("Switched tagging mode to protected - only people with \"Manage Roles\" can create new tags");
        }
    } else {
        bot.sql.run("INSERT INTO TagModeData ([guildId], [mode]) VALUES (?, ?)", [guild.id, 1]);
        message.channel.send("Switched tagging mode to protected - only people with \"Manage Roles\" can create new tags");
    }
};

module.exports.meta = {
    action: "tagmode"
};

module.exports.help = function (pfx) {
    var data = {
        pretty: "Switch tag modes",
        description: "Switches who can create tags - public allows anyone to create new tags, protected requires a user to posses `Manage Roles` permission",
        examples: `${pfx}${this.meta.action}`
    };

    return data;
};
