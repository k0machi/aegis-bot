module.exports.exec = async (bot, message, args) => {
    const localConfig = bot.parseYAML(__dirname + '/command.yml');
    console.log(localConfig);
    var sql = bot.sql;
    var tableName = 'VerificationTokens';
    var steamKey = bot.config.steam_api_token;
    const axios = require('axios');
    var steamUrl = args[0];

    if (!steamUrl) throw { message: 'This does not look like a valid Steam URL' };

    console.log(steamUrl);
    var steamid = await extractSteamID(steamUrl);
    if (!steamid) throw { message: "Unable to find profile for " + steamUrl };
    console.log(steamid);

    var groupsToAssign = await checkGroupMembership(localConfig.groups, steamid);
    if (groupsToAssign.length == 0)
        throw { message: "You are not in any Steam groups eligible for role assignment" };

    test = await checkIfTableExists(sql); //TODO: get rid of this later

    var discordId = message.author.id;
    var guildId = message.guild.id;
    let tokenData = await bot.sql.get('SELECT * FROM ' + tableName + ' WHERE (discordid = ? AND guildid = ?)', [discordId, guildId]);
    console.log(tokenData);
    if (!tokenData) {// tokenData does not exist yet, create new one
        const uuidv4 = require('uuid/v4');
        let token = uuidv4();
        ins = await bot.sql.run('INSERT INTO ' + tableName + '([discordid], [guildid], [token], [createdat]) VALUES (?, ?, ?, ?)', [discordId, guildId, token, Date.now()]);
        const msg = await message.channel.send("Here is your token: `"+token+"`. Paste it into your profile's `Real Name` field and run $$verify <link> again.");
    } else { //token data does exist, check user's profile
        var playerData = await getUserData(steamid);
        console.log(playerData.realname);
        console.log(tokenData.token);
        if (tokenData.token == playerData.realname) {
            const msg = await message.channel.send("Token verified. You are now a member of following groups: " + groupsToAssign.join());
            for (let i = 0; i < groupsToAssign.length; i++)
            {
                let role = await message.guild.roles.find('name', groupsToAssign[i]);
                let rv = await message.member.addRole(role, `A new ${role.name} joins! ${message.author.username}`);
            }
            //TODO: actually assign groups
            //return false;
        } else {
            throw { message: "Token `"+tokenData.token+"` not found in profile" };
        }
    }

    async function extractSteamID(url) {
        let matches = url.match(/^https?:\/\/steamcommunity\.com\/id\/(.*)$/);
        if (matches && matches[1]) {
            var vanityUrl = matches[1].split('/')[0];
            var resolveMethod = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${steamKey}&vanityurl=${vanityUrl}&url_type=1`;
            const response = await axios(resolveMethod);

            if (response.data.response.success === 1)
                return response.data.response.steamid;
            else
                return null;
        } else {
            let matches = url.match(/^https?:\/\/steamcommunity\.com\/profiles\/(7[0-9]{15,25})$/);
            if (matches && matches[1])
                return matches[1];
            else
                return null;
        }
    }

    async function getUserData(steamid) {
        var resolveMethod = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${steamKey}&steamids=${steamid}`;
        const response = await axios(resolveMethod);
        var players = response.data.response.players;
        if (players.length == 0)
            throw { message: "Unable to read stats for steamid " + steamid }
        return players[0];
    }

    async function checkIfTableExists(sql) {
        try {
            let get = await sql.get('SELECT * FROM ' + tableName + ' WHERE discordid = 0');

        } catch (error) {
            console.log(error);
            await sql.run('CREATE TABLE IF NOT EXISTS ' + tableName + '(discordid TEXT, guildid TEXT, token TEXT, createdat INTEGER)')
        }
    }

    async function checkGroupMembership(groups, steamid) {
        var resolveMethod = `https://api.steampowered.com/ISteamUser/GetUserGroupList/v1/?key=${steamKey}&steamid=${steamid}`;
        const response = await axios(resolveMethod);
        if (!response.data.response.success)
            throw { message: "Unable to get group list" };
        let listOfGroups = [];
        for (var i = 0; i < response.data.response.groups.length; i++){
            var check = groups[response.data.response.groups[i].gid];
            if (check){
                listOfGroups.push(check);
            }
        }
        return listOfGroups;
    }
}

module.exports.meta = {
    action: "verify"
}

module.exports.help = function (pfx) {
    var data = {
        pretty: "Verify membership in a steam group(s)",
        description: "Assigns eligible server roles after verifying your steam profile",
        examples: `${pfx}${this.meta.action} <your steam url>`
    };

    return data;
}
