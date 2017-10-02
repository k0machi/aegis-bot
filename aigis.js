module.exports = {
    client: null,
    sql: null,
    config: null,

    init: function(config, sql, client) {
        this.config = config;
        this.client = client;
        this.sql = sql;
    },

    logToDB: function (id, time, cmd, args, guild) {
        this.sql.run('INSERT INTO History ([User_Id], [Time], [Action], [Arguments], [Guild]) VALUES (?, ?, ?, ?, ?)', [id, time, cmd, JSON.stringify(args), guild.id]);
    },
    history: function (message) {
        var sql = this.sql;
        var history = [];
        sql.all('SELECT * FROM History').then(async (rows) => {
            await rows.forEach(async (row, rowid) => {
                try {
                    user = await this.client.fetchUser(row.User_Id + '', true);
                    member = await message.guild.fetchMember(row.User_Id);
                } catch (e) {
                    console.log(e.message);
                }
                msgDate = new Date(parseInt(row.Time, 10));
                history.push(
                    'User '
                    + member
                    + ' ran command "'
                    + row.Action
                    + '" with arguments '
                    + row.Arguments
                    + ' at "'
                    + msgDate.toLocaleString('en-ISO', { timeZone: "America/New_York" })
                    + ' EST"');
                if (rows.length == rowid + 1)
                    message.channel.send(history);
            });
        })
    },
    processCommand: async function(message){
        const args = message.content.slice(this.config.command_prefix.length).trim().split(/ +/g);
        const command = args.shift();
        switch (command) {
            case 'dump_message':
                console.log(message);
            break;
            case 'SELECT_ALL':
                this.sql.all('SELECT * FROM Users').then((rows) => {
                    rows.forEach((row, rowid) => { message.channel.send(row.Name) });
                })
                break;
            case 'logcommand':
                this.logToDB(message.author.id, message.createdTimestamp, 'Test #2', args.join(','));                
                break;
            case 'history':
                this.history(message);
                break;
            case 'gettagmode':
                mode = await this.getTagMode(message.guild);
                message.channel.send(mode);
                break;
            case 'tagmode':
                this.switchTagMode(message.guild, message);
                break;
            case 'tagpurge':
                message.channel.send('Implementation pending.');
                break;
            case 'tagdelete':
                message.channel.send('Implementation pending.');
                break;
            case 'tagblacklist':
                message.channel.send('Implementation pending.');
                break;
            case 'tagme':
                message.channel.send('Tag requested: ' + args.join(' '));
                this.tagMe(args.join(' '), message.author, message.guild, message.channel);
                break;
            case 'untagme':
                this.untagMe(args.join(' '), message.author, message.guild, message.channel)
                message.channel.send('Removing tag ' + '"' + args.join(' ') + '"' + " from user " + message.author);
                break;
            case 'deletemsg':
                amount = parseInt(args[0], 10) || 1;
                this.buldDeleteMessages(message.guild, message.channel, message.author, message, amount);
                break;
            case 'aigis':
                var client = this.client;
                message.channel.send({
                    embed: {
                        author: {
                            name: client.user.username,
                            icon_url: client.user.avatarURL
                        },
                        title: 'Aigis Bot',
                        fields: [{
                            name: 'Commands',
                            value: '**!tagme** *<tagname>* - Sets an @ - able tag on you. \n**!untagme** *<tagname>* - Removes a tag from you. If this results in tag having no members, the tag is removed'
                        },
                        {
                            name: 'Moderator Commands',
                            value: 'Requries MANAGE_ROLES permission.\n**!delete** *<tagname>* - Deletes a user-defined tag\n**!blacklist** *<user>* *<deleteTags>* - Blacklists a user and, optionally, removes all tags they\'ve created\n**!purge** - Deletes all user defined tags'
                        }]
                    }
                });
                break;
        }
    },

    verifyPermission: async function (user, guild, perm) {
        member = await guild.fetchMember(user.id);
        perms = member.hasPermission(perm, false, true);
        if (perms) {
            return true;
        } else {
            return false;
        }
    },

    getTagMode: async function (guild) {
        mode = await this.sql.get('SELECT * FROM TagModeData WHERE guildId == ?', [guild.id]);
        return mode.mode;
    },

    switchTagMode: async function (guild, message) {
        perm = await this.verifyPermission(message.author, guild, "MANAGE_ROLES");
        if (!perm) { message.channel.send('Missing permission!'); return; };
        mode = await this.sql.get('SELECT * FROM TagModeData WHERE guildId == ?', [guild.id]);
        if (mode) {
            md = await this.sql.run('UPDATE TagModeData SET [mode] = ? WHERE guildid == ?', [!mode.mode, mode.guildId]);
            if (mode.mode) {
                message.channel.send('Switched tagging mode to public - everyone can create tags!');
            } else {
                message.channel.send('Switched tagging mode to protected - only people with "Manage Roles" can create new tags');
            }
        } else {
            md = await this.sql.run('INSERT INTO TagModeData ([guildId], [mode]) VALUES (?, ?)', [guild.id, 1]);
            message.channel.send('Switched tagging mode to protected - only people with "Manage Roles" can create new tags');
        }
    },

    buldDeleteMessages: function (guild, channel, user, message, amount) {
        guild.fetchMember(user).then((member) => {
            if (member.hasPermission("MANAGE_MESSAGES", false, true)) {
                    channel.send('Okay.').then(() => {
                    channel.bulkDelete(amount + 2);
                    this.logToDB(member.id, message.createdTimestamp, 'DELETE_MESSAGE', [amount, member.user.username + ' deleted ' + amount + ' messages from channel ' + message.channel.name], message.guild);
                });
            } else {
                channel.send('No.');
            }
        });
    },

    checkTag: async function(tagname, guild) {
        role = await guild.roles.find('name', tagname);
        return role;
    },

    createTag: async function(tagname, guild) {
        role = await guild.createRole({
            name: tagname,
            color: '00e5ff',
            permissions: 0,
            mentionable: true
        }, 'User requested a non-existent user-defined tag')
        return role;
    },

    deleteTag: async function (tagname, guild) {
        var result;
        role = await guild.roles.find('name', tagname);
        role.delete('A user-created tag is now empty');
    },

    tagMe: async function (gname, user, guild, channel) {
        if (gname.length > 16) { channel.send('Woah there dude, that\'s way too long!'); return false; };
        if (gname.includes('@')) { channel.send('Nuh-uh, that doesn\'t look like a good idea'); return false; };
        if (gname.length < 1) { channel.send('Hey, at least make the name longer than your penis length'); return false; };
        try {
            member = await guild.members.find('id', user.id);
            role = await this.checkTag(gname, guild);
            //console.log(role);
            if (role) {
                rv = await member.addRole(role, 'User tag added');
                channel.send('I\'ve tagged you with "' + role.name + '"');
                return true;
            }
            else {
                tagmode = await this.getTagMode(guild);
                if (tagmode) {
                    perm = await this.verifyPermission(user, guild, "MANAGE_ROLES");
                    if (!perm) { channel.send("Missing permissions for creating a tag."); return false; }
                }
                tag = await this.createTag(gname, guild);
                rv = await member.addRole(tag, 'User tag');
                channel.send('I\'ve tagged you with "' + tag.name + '"');
                return true;
            }
        }
        catch (e) {
            channel.send(e.message);
            console.log(e);
        }
    },

    untagMe: async function (gname, user, guild, channel) {
        try {
            member = await guild.members.find('id', user.id);
            role = await this.checkTag(gname, guild);
            if (role) {
                if (!(member.roles.has(role.id))) { channel.send('You don\'t seem to have this role.'); return false };
                rv = await member.removeRole(role, 'User tag removed');
                channel.send('Tag "' + role.name + '" removed!');
                if (role.members.array().length == 0) this.deleteTag(role.name, guild);
                return true;
            }
            else {
                channel.send('This tag doesn\'t seem to exist!');
            }
        }
        catch (e) {
            channel.send(e.message);
            console.log(e);
        }
    }
};