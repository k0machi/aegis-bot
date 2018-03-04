module.exports.exec = (bot, message, args) => {
    if(!args[0]) {
        throw {message: "Channel is not specified"};
    }
    let channel = args[0];
    let textToSend = args.slice(1).join(" ");
    if(textToSend.length < 1) {
        throw {message: "No message to send!"};
    }
    let matches = channel.match(/^<#([0-9]+)>$/);
    if(matches && matches[1]) {
        let channelId = matches[1];
        let receivingChannel = bot.client.channels.get(channelId);
        if(!receivingChannel) {
            throw {message: "Channel not found"};
        }
        receivingChannel.send(textToSend);

    } else {
        throw {message: "Channel is not specified correctly"};
    }

};

module.exports.meta = {
    action: "transmit"
};

module.exports.help = function(pfx) {
    var data = {
        pretty: "Transmit message",
        description: "Send message as Aigis to another channel",
        examples: `${pfx}${this.meta.action} <text>`
    };

    return data;
};
