module.exports.exec = async (bot, message, args) => { //eslint-disable-line no-unused-vars
    bot.client.emit("guildMemberAdd", message.member);
};

module.exports.meta = {
    action: "welcometest"
};

module.exports.help = function(pfx) {
    var data = {
        pretty: "Hello Test",
        description: "Test welcome message for the guild",
        examples: `${pfx}${this.meta.action}`
    };

    return data;
};
