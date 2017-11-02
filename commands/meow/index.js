module.exports.exec = async (bot, message, args) => {
    const msg = await message.channel.send(`${message.author} Meow!`);
}

module.exports.meta = {
    action: "meow"
}

module.exports.help = function(pfx) {
    var data = {
        pretty: "Meow",
        description: "Nyan nyan nyan nyan",
        examples: `Type ${pfx}${this.meta.action} to meow you dumb fuck`
    };

    return data;
}
