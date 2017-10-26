const { promisify } = require("util");
const directoryReader = promisify(require("fs").readdir);
const Discord = require('discord.js');
const sqlite = require('sqlite');
const BotConfig = require('./config.json');
const client = new Discord.Client();
const Aigis = require('./aigis');
const http = require('http');
const fs = require('fs');
const qs = require('querystring');
const createCanduit = require('canduit');
sqlite.open('./database/main.db');
const server = http.createServer((req, res) => {
    res.end();
});

const launch = async () => {
    var conduit = createCanduit({ api: BotConfig.phab_host, user: "Aegis", token: BotConfig.phab_api_token }, () => { console.log("Conduit Init") });
    Aigis.init(BotConfig, sqlite, client, conduit);
    Aigis.setPresence(); //expand to full event register in future
    const commands = await directoryReader("./commands/");
    console.log(`Read ${commands.length} command files`);

    commands.forEach(file => {
        try {
            console.log(file.split("."));
            if (file.split(".").slice(-1)[0] !== "js") return;
            var command = require(`./commands/${file}`);
            console.log(`Loading command ${command.help(BotConfig.command_prefix).pretty}`);
            Aigis.registerCommand(command.meta.action, command);
            let aliases = command.meta.aliases;
            aliases.forEach( (alias) => {
                Aigis.registerAlias(alias, command.meta.action);
            });
        } catch (e) {
            console.log(`Unable to parse files: ${file}: ${e}`);
        }
    });

    client.on('message', message => {
        if (message.content.startsWith(BotConfig.command_prefix)) {
            Aigis.processCommand(message);
        }
    });

    server.on('request', (req, res) => {
        if (req.url.includes('phab-story')) {
            console.log('story!');
            var body = '';
            req.on('data', function (data) {
                body += data;
                if (body.length > 1e6)
                    request.connection.destroy();
            });

            req.on('end', function () {
                var post = qs.parse(body);
                Aigis.postPhabStory(post);
                //console.log(post);
            });
        };
    });

    server.listen(8888);
    client.login(BotConfig.app_token);
}

launch();