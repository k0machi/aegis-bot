module.exports.exec = async (bot, message, args) => {
    mode = await bot.getTagMode(message.guild);
    message.channel.send(mode ? `Protected` : `Public`);      
}

module.exports.meta = {
    action: "gettagmode",
    active: true,
    aliases: [],
    permissions: "ALL"
}

module.exports.help = function (pfx) {
    var data = {
        pretty: "Get tag",
        description: "For debug and such",
        examples: `Type ${pfx}${this.meta.action} to do something or whatever`
    };

    return data;
}
