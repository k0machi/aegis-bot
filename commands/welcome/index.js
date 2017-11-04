module.exports.exec = async (bot, message, args) => {

    args.shift(); //discard channel mention
    let text = args.join(" ");

    let channel = message.mentions.channels.first();
    if (!channel) throw { message: "No channel specified" };

    let wmsg = await bot.sql.get("SELECT * FROM WelcomeMessages WHERE guildId == ?", [message.guild.id]);
    if (wmsg) {
        wmsg = await bot.sql.run("UPDATE WelcomeMessages SET [Message] = ?, [ChannelId] = ? WHERE GuildId == ?", [text, channel.id, wmsg.GuildId]);
    } else {
        wmsg = await bot.sql.run("INSERT INTO WelcomeMessages ([Message], [GuildId], [ChannelId]) VALUES (?, ?, ?)", [text, message.guild.id, channel.id]);
    }

    await message.channel.send(`Welcome message set for ${message.guild.name} channel: ${channel}`);
};

module.exports.meta = {
    action: "welcome"
};

module.exports.help = function (pfx) {
    
    var data = {
        pretty: "Sets a welcome message for the server",
        description: "Sets a welcome message for the server. (Max 1000 characters)",
        examples: `${pfx}${this.meta.action} <#channel> <message>`
    };

    return data;
};
