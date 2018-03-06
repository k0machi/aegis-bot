module.exports.exec = async (bot, message, args) => { //eslint-disable-line no-unused-vars
    const crypto = require("crypto");
    const localConfig = bot.parseYAML(__dirname + "/command.yml");
    let availableWeapons = ["colt_python", "m1911"];
    let weaponChance = {
        "colt_python": 6,
        "m1911": 1
    };
    let affectedUser = message.guild.members.get(message.author.id);
    let affectedUserName = affectedUser.nickname || message.author.username;


    function getRandomSample(bytes) {
        return crypto.randomBytes(bytes).readInt8() & 0xFF;
    }

    async function updateMessages(queue, delay, appendTo, lost) {
        if(queue.length < 1) { // all messages are sent
            if(lost) {
                let banUntil = Date.now() + (localConfig.banDuration * 60) * 1000;
                try {
                    await bot.punishmentsCreateRecord(message.guild.id, affectedUser, banUntil, "roulette.role");
                } catch (e) {
                    throw e;
                }
            }
            bot.rouletteUpdateRecords(message.guild.id, message.author.id, lost);
            return ;
        }
        let queueRemainder = queue.slice(1);
        let sendRemaining = updateMessages.bind(null, queueRemainder, delay, appendTo, lost);
        appendTo.edit(appendTo.content + "\n" + queue[0]).then(function() {
            setTimeout(sendRemaining, delay);
        });

    }


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
        case "-gun": {
            if(!args[1]) {
                throw { message: "Please specify a weapon you want to use with a ` -gun ` switch. Available weapons are: `" + availableWeapons.join("`,`")+"`"};
            }

            let currentChance = weaponChance[args[1].trim()];
            
            if(!currentChance) {
                throw { message: "You're not allowed to use that as a weapon" };
            }

            let queue = [];
            let lost = false;
            
            if(currentChance === 1) { //this weapon always fires because it's not a fucking revolver
                lost = true;
                queue.push(`${affectedUserName} loads one cartridge into a magazine`);
                queue.push(`${affectedUserName} inserts the magazine and draws the slide`);
                queue.push(`${affectedUserName} presses a gun against their head and squeezes the trigger`);
                queue.push("*Bang*");
                queue.push(`Not exactly sure what else did ${affectedUserName} expect.`);
            } else {
                queue.push(`${affectedUserName} pushes the cylinder out and inserts a round into a chamber`);
                queue.push(`${affectedUserName} gives the cylinder a good spin and snaps it shut`);
                queue.push(`${affectedUserName} cocks the hammer and places a muzzle against their head`);
                queue.push(`${affectedUserName} squeezes the trigger...`);  

                let loaded;
                do {
                    loaded = getRandomSample(1);
                } while (loaded >= currentChance);

                let rolled;
                do {
                    rolled = getRandomSample(1);
                } while(rolled >= currentChance);

                lost = (rolled === loaded);

                if(lost) {
                    queue.push("*Bang*");
                    queue.push("The walls have just been slightly redecorated");
                } else {
                    queue.push("*Click*");
                    queue.push("Your stats have been updated. Run this command with a ` -stats ` switch to display them.");
                }
            }

            let result = `${affectedUserName} is feeling lucky today \n`;
            let original = await message.channel.send(result);
            updateMessages(queue, localConfig.delay, original, lost);
            break;

        }
        case "-stats": {
            let stats = await bot.rouletteGetRecords(message.guild.id, message.author.id);
            message.channel.send(`You've played this game ${stats.wins + stats.loses} times. The gun went boom ${stats.loses} times.`);
            break;
        }
        default: {
            message.channel.send("Please specify a weapon you want to use with a ` -gun ` switch. Available weapons are: `" + availableWeapons.join("`,`")+"`");
        }
    }
    
};

module.exports.meta = {
    action: "rr"
};

module.exports.help = function(pfx) {
    var data = {
        pretty: "Russian roulette",
        description: "Feeling suicidal? Bored? Spin the cylinder and win precisely nothing.",
        examples: `Type ${pfx}${this.meta.action} to start playing, or ${pfx}${this.meta.action}\`-stats\` to display your stats.`
    };

    return data;
};
