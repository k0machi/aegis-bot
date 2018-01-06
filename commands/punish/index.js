module.exports.exec = async (bot, message, args) => { //eslint-disable-line no-unused-vars
    switch(args[0]) {
        case "-role": { //set group that will be assigned to punished users
            if(!args[1]) throw {message: "Role is not specified."};
            let matches = args[1].match(/^<@&([0-9]+)>$/); //internally @mention looks like <@&[id]>
            if(matches && matches[1]) {
                let groupId = matches[1];
                let groupToAssign = message.guild.roles.get(groupId);
                if(!groupToAssign) {
                    throw {message: "Role with id `"+groupId+"` not found on server."};
                }
                bot.log.info(`Assigning role ${groupToAssign.name} as role for punish module...`);
                await bot.dynamicConfig.setValue(message.guild.id, "punish.role", groupId);
                message.channel.send(`Assigned role ${groupToAssign.name} as primary punish role.`);
            } else {
                throw {message: "Please @ mention a group you want to set."};
            }
            
            break;
        }
        case "-cache": {
            bot.dynamicConfig.printCache();
            break;
        }
        case "-forcecheck": {
            bot.punishmentsTicker();
            break;
        }
        default: { // args[0] is the @mention of user, args[1] is the time string
            if(!args[0]) throw {message: "Member is not specified, consult help for correct syntax."};
            if(!args[1]) throw {message: "Duration not specified, consult help for correct syntax."};
            
            let userMention = args[0].match(/^<@!?([0-9]+)>$/); // <@239073867430232065>
            if(!userMention || !userMention[1])
                throw {message: "User has to be fully @ mentioned."};

            let dateMatch = args[1].match(/^([0-9]+)([mhd])$/); //valid date string is 12m for 12 minutes, 5h for 5 hours or 1d for 1 day
            if(!dateMatch || !dateMatch[1] || !dateMatch[2])
                throw {message: "Valid period format is `[time][m/s/d]`, i.e. `12h` for 12 hours."};

            let affectedUser = message.guild.members.get(userMention[1]);
            if(!affectedUser) throw {message: "Cannot find this member on this server."};
            
            if(affectedUser.user.bot) throw {message: "I'm afraid I can't let you do this."};
            
            let banUntil = periodToTimestamp(dateMatch[1], dateMatch[2]);
            if(!banUntil) throw {message: "This time period doesn't look quite right"};

            await bot.punishmentsCreateRecord(message.guild.id, affectedUser, banUntil);

            break;
        }
    }
    
    function periodToTimestamp(amount, units) {
        amount = parseInt(amount);
        if(amount <= 0)
            return null;
        
        switch(units) {
            case "m": {
                amount = amount * 60;
                break;
            }
            case "h": {
                amount = amount * 60 * 60;
                break;
            }
            case "d": {
                amount = amount * 60 * 60 * 24;
                break;
            }
            default: {
                return null;
            }
        }

        return Date.now() + amount * 1000;
    }
};

module.exports.meta = {
    action: "punish"
};

module.exports.help = function(pfx) {
    var data = {
        pretty: "Punish",
        description: "Revoke privileges from user",
        examples: `Type ${pfx}${this.meta.action} (TODO ACTUAL HELP LATER)`
    };

    return data;
};
