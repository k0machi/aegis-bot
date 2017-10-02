module.exports.exec = async (bot, message, args) => {
    const msg = await message.channel.send("Booooo~!");
}

module.exports.meta = {
    action: "boo",
    active: true,
    aliases: [],
    permissions: "ALL"
}

module.exports.help = function(pfx) {
    var data = {
        pretty: "Boo!",
        description: "Peek-a-boo!",
        examples: `Type ${pfx}${this.meta.action} to meow you dumb fuck`
    };

    return data;
}
