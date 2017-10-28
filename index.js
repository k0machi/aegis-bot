const { promisify } = require("util");
const directoryReader = promisify(require("fs").readdir);
const Discord = require('discord.js');
const sqlite = require('sqlite');
const client = new Discord.Client();
const Aigis = require('./aigis');
const http = require('http');
const fs = require('fs');
const yaml = require('js-yaml');
const qs = require('querystring');
const createCanduit = require('canduit');
sqlite.open('./database/main.db');
const server = http.createServer((req, res) => {
    res.end();
});

const launch = async () => {
    const BotConfig = yaml.safeLoad(fs.readFileSync('./config.yml', 'utf8'));
    var conduit = createCanduit({ api: BotConfig.phab_host, user: "Aegis", token: BotConfig.phab_api_token }, () => { console.log("Conduit Init") });
    Aigis.init(BotConfig, sqlite, client, conduit, yaml, fs);
    Aigis.setPresence(); //expand to full event register in future
    const commands = await directoryReader("./commands/");

    commands.forEach(file => {
        try {
            var command = require(`./commands/${file}/index.js`);
            console.log(`Loading command ${command.help(BotConfig.command_prefix).pretty}`);
            var settings = yaml.safeLoad(fs.readFileSync(`./commands/${file}/command.yml`, 'utf8'));
            if (settings.active === false) {
                console.log(command.help(BotConfig.command_prefix).pretty + ' is disabled, skipping...');
                return;
            }
            Aigis.registerCommand(command.meta.action, command);
            let aliases = settings.aliases;
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
            });
        };
    });

    server.listen(8888);
    client.login(BotConfig.app_token);
}

launch();