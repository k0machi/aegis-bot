module.exports.exec = async (bot, message, args) => {
    var tagname = args.join(' ');
    var guild = message.guild;
    var channel = message.channel;

    try {
        result = await bot.checkTag(tagname, guild);
        if (result) {
            user = await bot.client.fetchUser(result.db.creatorid);
            time = new Date(result.db.createdTimestamp);
            channel.send({
                embed: {
                    author: {
                        name: `Tag: "${result.db.tagname}"`,
                        icon_url: user.avatarURL
                    },
                    title: 'Information',
                    fields: [{
                        name: 'Created by',
                        value: user.username
                    },
                    {
                        name: 'Created at',
                        value: time.toUTCString()
                    }]
                }
            });
        } else {
            channel.send('This tag doesn\'t seem to exist!');
        }
    } catch (e) {
        channel.send(e.message);
    }
}

module.exports.meta = {
    action: "tagquery"
}

module.exports.help = function (pfx) {
    var data = {
        pretty: "Query a tag",
        description: "Displays infromation about a tag, such as: creation date, creator and name",
        examples: `${pfx}${this.meta.action} <name>`
    };

    return data;
}
