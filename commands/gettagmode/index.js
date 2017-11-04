module.exports.exec = async (bot, message, args) => {
    mode = await bot.getTagMode(message.guild);
    message.channel.send(`Current tag mode: ${mode ? "Protected" : "Public"}`);      
};

module.exports.meta = {
    action: "gettagmode"
};

module.exports.help = function (pfx) {
    var data = {
        pretty: "Show server tag mode",
        description: "Display current tag mode of the server",
        examples: `${pfx}${this.meta.action}`
    };

    return data;
};
