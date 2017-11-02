module.exports.exec = async (bot, message, args) => {
    let help = this.help(bot.pfx);
    console.log(args);
    if (args[0] === 'more') {
        let helpList = [];
        //SOPA DE JAVASCRIPTA
        //UMA DELICIA
        Object.keys(bot.commands).forEach(value => {
            if (bot.commands[value].settings.hidden) return;
            let help = bot.commands[value].help(bot.pfx);
            helpList.push({
                name: help.pretty,
                value: help.examples
            })
        });
        message.channel.send({
            embed: {
                author: {
                    name: bot.client.user.username,
                    icon_url: bot.client.user.avatarURL
                },
                title: 'Aigis Bot',
                fields: helpList
            }
        });
    }
    else if (args[0] && args[0].length > 0) {
        try {
            let cmd = bot.commands[args[0]];
            if (bot.debug) console.log(cmd);
            let help = cmd.help(bot.pfx);
            message.channel.send({
                embed: {
                    author: {
                        name: bot.client.user.username,
                        icon_url: bot.client.user.avatarURL
                    },
                    title: cmd.meta.action,
                    fields: [{
                        name: help.pretty,
                        value: help.description
                    },
                    {
                        name: 'Examples',
                        value: help.examples
                    }
                    ]
                }
            });
        } catch (e) {
            message.channel.send(e.message);
        };
    } else {
        message.channel.send({
            embed: {
                author: {
                    name: bot.client.user.username,
                    icon_url: bot.client.user.avatarURL
                },
                title: 'Aigis Bot',
                fields: [{
                    name: help.pretty,
                    value: help.examples
                }]
            }
        });
    }
}

module.exports.meta = {
    action: "aigis",
}

module.exports.help = function (pfx) {
    var data = {
        pretty: "Help",
        description: "Provides an overview of available commands",
        examples: `**${pfx}help more** for a full list of commands or ${pfx}help *<commandname>* for help on that command`
    };

    return data;
}
