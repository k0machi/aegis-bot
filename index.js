const Discord = require('discord.js');
const sqlite = require('sqlite');
const BotConfig = require('./config.json');
const client = new Discord.Client();
const DiscordToken = BotConfig.app_token;
const cmdPrefix = BotConfig.command_prefix;
const Aigis = require('./aigis');
sqlite.open('./database/main.db');

client.on('ready', () => { 
    console.log('I am ready!');
    Aigis.init(BotConfig, sqlite, client);
  client.user.setPresence({game: {name: "say $aigis", type: 0}});
});


client.on('message', message => {
    if (message.content.startsWith(cmdPrefix)) {
        Aigis.processCommand(message);
    }
});

client.login(DiscordToken);