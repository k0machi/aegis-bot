module.exports.exec = async (bot, message, args) => { //eslint-disable-line no-unused-vars
    const crypto = require("crypto");
    function getRandomSample(bytes){ return crypto.randomBytes(bytes).readInt8() & 0xFF; }
    let availableWeapons = ["colt_python", "m1911"];
    let weaponChance = {
        "colt_python": 6,
        "m1911": 1
    };
    switch(args[0]) {
        case "-role": { //set group that will be assigned to losers
            let requiredPerm = "ADMINISTRATOR";
            let perm = await bot.verifyPermission(message.member, requiredPerm);
            if (!perm) throw { message: `Missing permissions: ${requiredPerm}` };
            if(!args[1]) throw {message: "Role is not specified."};
            let matches = args[1].match(/^<@&([0-9]+)>$/); //internally @mention looks like <@&[id]>
            if(matches && matches[1]) {
                let groupId = matches[1];
                let groupToAssign = message.guild.roles.get(groupId);
                if(!groupToAssign) {
                    throw {message: "Role with id `"+groupId+"` not found on server."};
                }
                bot.log.info(`Assigning role ${groupToAssign.name} as role for roulette module...`);
                await bot.dynamicConfig.setValue(message.guild.id, "roulette.role", groupId);
                message.channel.send(`Assigned role ${groupToAssign.name} as roulette loser role`);
            } else {
                throw {message: "Please @ mention a group you want to set."};
            }
            
            break;
        }
        case "-weapon": {
            let currentChance = weaponChance[args[1]];
            if(!currentChance) {
                throw { message: "You're not allowed to use that" };
            }
            
            let loaded;
            do {
                loaded = getRandomSample(1);
            } while (loaded >= currentChance);

            let rolled;

            do {
                rolled = getRandomSample(1);
            } while(rolled >= currentChance);

            let result = `Loaded: ${loaded}, you spun: ${rolled}.`;
            if(rolled == loaded)
                result += " Ur fucking dead kiddo";
            else
                result += " You survived.";

            message.channel.send(result);
        

            break;

        }
        default: {
            message.channel.send("Please specify a weapon you want to use with a ` -weapon ` switch. Available weapons are: `" + availableWeapons.join("`,`")+"`");
        }
    }
    
};

module.exports.meta = {
    action: "roulette"
};

module.exports.help = function(pfx) {
    var data = {
        pretty: "Russian roulette",
        description: "Feeling suicidal? Bored? Spin the cylinder and win precisely nothing.",
        examples: `Type ${pfx}${this.meta.action} (This is not the kind of help you should seek if you ask me)`
    };

    return data;
};
