const { promisify } = require("util");
const directoryReader = promisify(require("fs").readdir);
const Discord = require('discord.js');
const BotConfig = require('./config.json');
const client = new Discord.Client();
const Aigis = require('./aigis');


const launch = async () => {
    Aigis.init(BotConfig, null, client);
    Aigis.setPresence(); //expand to full event register in future
    const commands = await directoryReader("./commands/");
    console.log(`Read ${commands.length} command files`);

    commands.forEach(file => {
        try {
            var command = require(`./commands/${file}`);
            if (file.split(".").slice(-1)[0] !== "js") return;
            console.log(`Loading command ${command.help(BotConfig.command_prefix).pretty}`);
            Aigis.registerCommand(command.meta.action, command);
            let aliases = command.meta.aliases;
            aliases.forEach( (alias) => {
                Aigis.registerAlias(alias, command.meta.action);
            });
        } catch (e) {
            console.log(`Unable to log files: ${file}: ${e}`);
        }
    });

    client.on('message', message => {
        if (message.content.startsWith(BotConfig.command_prefix)) {
            Aigis.processCommand(message);
        }
    });

    client.login(BotConfig.app_token);
}

launch();