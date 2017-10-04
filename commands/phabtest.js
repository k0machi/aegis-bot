module.exports.exec = async (bot, message, args) => {
    bot.conduit_endpoint.exec('conduit.ping', {}, async (err, result) => {
        console.log(result);
        rv = await message.channel.send(JSON.stringify(result));
    })
}

module.exports.meta = {
    action: "phabtest",
    active: true,
    aliases: ["pt", "cond"],
    permissions: "ALL"
}

module.exports.help = function (pfx) {
    var data = {
        pretty: "Conduit API Test",
        description: "Queries users on phabricator install",
        examples: `**${pfx}phabtest** - Resolves users on phabricator`
    };

    return data;
}
