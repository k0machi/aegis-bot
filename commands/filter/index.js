module.exports.exec = async (bot, message, args) => { //eslint-disable-line no-unused-vars
    let requiredPerm = "ADMINISTRATOR";
    let perm = await bot.verifyPermission(message.member, requiredPerm);
    if (!perm)
        throw { message: `Missing permissions: ${requiredPerm}` };

    let badWords = await bot.dynamicConfig.getValueJSON(message.guild.id, "filter.list");
    
    switch(args[0]) {
        case "-add": {
            let comment = "";
            if(!args[1] || args[1].length == 0)
                throw {message: "Filtered word cannot be empty"};
            let word = args[1];
            if(args[2] && args[2] == "-msg") {
                comment = args.slice(3).join(" ");
            }
            badWords[word] = comment;
            await bot.dynamicConfig.setValue(message.guild.id, "filter.list", JSON.stringify(badWords));
            message.channel.send(`Added "${word}" to banned words list`);
            break;
        }
        
        case "-rm": {
            if(!args[1] || args[1].length == 0)
                throw {message: "How am I supposed to remove this empty word?"};
            let word = args[1];
            if(badWords[word] == undefined)
                throw {message: "I cannot delete what was never there in the first place"};
            delete badWords[word];
            await bot.dynamicConfig.setValue(message.guild.id, "filter.list", JSON.stringify(badWords));
            message.channel.send(`Removed "${word}" from banned words list`);
            break;
        }

        case "-list": {
            let reply = "`Term` - message\n ---------- \n";
            let count = 0;
            for(let line in badWords) {
                reply += `\`${line}\` - ${badWords[line]}\n`;
                count++;
            }
            if(count < 1)
                reply = "You have not banned any words on this server... yet";
            message.channel.send(reply);
            break;
        }

        default: {
            message.channel.send("You can use the following switches: `-add`, `-msg`, `-rm`, `-list`\n");
        }
    }
};

module.exports.meta = {
    action: "filter"
};

module.exports.help = function(pfx) {
    var data = {
        pretty: "Filter",
        description: "Manage filtered words",
        examples: `${pfx}${this.meta.action} \`-add\` <word> \`-msg\` <OPTIONAL message to be displayed when matching this word>\n ${pfx}${this.meta.action} \`-rm\` <word> to remove it from the filter`
    };

    return data;
};
