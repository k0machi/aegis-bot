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
            case 'tagcreate':
                this.createTagCmd(args.join(' '), message.guild, message.author, message.createdTimestamp, message.channel);
                break;
            case 'tagpurge':
                this.purgeTags(message, args);
                break;
            case 'tagdelete':
                this.deleteTag(args.join(' '), message.guild, message.channel, message.author);
                break;
            case 'tagquery':
                this.queryTag(args.join(' '), message.guild, message.channel);
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

    purgeTags: async function (message, args) {
        perm = this.verifyPermission(message.author, message.guild, "MANAGE_ROLES");
        if (!perm) { message.channel.send('Missing permissions!'); return; };
        if (message.mentions.members.array().length == 0 && args[0] != this.config.purgeKey) {
            message.channel.send(`Global purge requested! Please type ${this.config.command_prefix}tagpurge ${this.config.purgeKey} to confirm this action!!`)
        } else if (message.mentions.members.array().length > 0) {
            message.mentions.members.forEach(async (mbr) => {
                console.log(mbr.id);
                console.log(mbr.guild.id);
                //return;
                dbtags = await this.sql.all('SELECT * FROM UserTags WHERE guildid == ? AND creatorid == ?', [mbr.guild.id, mbr.id]);
                tags = [];
                dbtags.forEach((row, rowid) => {
                    tags.push(row.tagname);
                });
                for (var i = 0; i < tags.length; i++)
                    rv = await this.deleteTag(tags[i], message.guild, message.channel, this.client.user);
            });
        }
        if (args[0] == this.config.purgeKey)
        {
            dbtags = await this.sql.all('SELECT * FROM UserTags WHERE guildid == ?', [message.guild.id]);
            tags = [];
            dbtags.forEach((row, rowid) => {
                tags.push(row.tagname);
            });
            for (var i = 0; i < tags.length; i++)
                rv = await this.deleteTag(tags[i], message.guild, message.channel, this.client.user);
            rv = await message.channel.send('Purge complete!');
        };
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

    checkUserBlacklist: function (member) {
        if (member.roles.find('name', 'Vandal')) return true;
        return false;
    },

    queryTag: async function (tagname, guild, channel)
    {
        try {
            result = await this.checkTag(tagname, guild);
            if (result) {
                user = await this.client.fetchUser(result.db.creatorid);
                time = new Date(result.db.createdTimestamp);
                channel.send({
                    embed: {
                        author: {
                            name: result.db.tagname,
                            icon_url: user.avatarURL
                        },
                        title: 'Information',
                        fields: [{
                            name: 'Created by',
                            value: user.username
                        },
                        {
                            name: 'Created at',
                            value: time.toUTCString()
                        }]
                    }
                });
            } else {
                channel.send('This tag doesn\'t seem to exist!');
            }
        } catch (e) {
            channel.send(e.message);
        }
    },

    checkTag: async function (tagname, guild) {
        role_db = await this.sql.get('SELECT * FROM UserTags WHERE tagname == ?', [tagname]);
        role_server = await guild.roles.find('name', tagname);
        if (role_db && role_server) return { 'role': role_server, 'db': role_db };
        if (!role_server && !role_db) return false;
        if (role_server && !role_db) throw { message: 'Unmanaged role - not allowed!' };
    },

    createTag: async function (tagname, guild, user, time) {
        role = await guild.createRole({
            name: tagname,
            color: '00e5ff',
            permissions: 0,
            mentionable: true
        }, `${user.username} requested a non-existent user-defined tag`)
        result = await this.sql.run('INSERT INTO UserTags ([tagname], [roleid], [guildid], [creatorid], [createdTimestamp]) VALUES (?,?,?,?,?)', [tagname, role.id, guild.id, user.id, time]);
        if (!result) throw { message: 'Error accessing database' };
        return role;
    },

    createTagCmd: async function (tagname, guild, user, time, channel) {
        perm = await this.verifyPermission(user, guild, "MANAGE_ROLES");
        if (!perm) { channel.send('Missing permissions') };
        try {
            result = await this.checkTag(tagname, guild);
            if (result) { channel.send('Tag already exists'); return };
            this.createTag(tagname, guild, user, time);
            channel.send(`Tag "${tagname}" created!`);
        } catch (e) {
            channel.send(e.message);
        }
    },

    deleteTag: async function (tagname, guild, channel, user) {
        var result;
        perm = await this.verifyPermission(user, guild, "MANAGE_ROLES");
        if (!perm) { channel.send('No.'); return; };
        try {
            role = await this.checkTag(tagname, guild);//guild.roles.find('name', tagname);
            if (!role) throw { message: 'Role doesn\'t exist' };
            role.role.delete('A user-created tag is now empty');
            result = await this.sql.run('DELETE FROM UserTags WHERE tagname == ? AND guildid == ?', [tagname, guild.id]);
            if (!result) throw { message: 'Error accessing database' };
            console.log(role.role.name);
            await channel.send(`Tag "${role.role.name}" deleted`);
        } catch (e) {
            channel.send(e.message);
        }
    },

    tagMe: async function (gname, user, guild, channel) {
        if (gname.length > 16) { channel.send('Tag name is too long.'); return false; };
        if (gname.includes('@')) { channel.send('Tag contains illegal symbols.'); return false; };
        if (gname.length < 1) { channel.send('Name is too short.'); return false; };
        try {
            member = await guild.members.find('id', user.id);
            role = await this.checkTag(gname, guild);
            //console.log(role);
            if (role) {
                rv = await member.addRole(role.role, 'User tag added');
                channel.send('I\'ve tagged you with "' + role.role.name + '"');
                return true;
            }
            else {
                tagmode = await this.getTagMode(guild);
                if (tagmode) {
                    perm = await this.verifyPermission(user, guild, "MANAGE_ROLES");
                    if (!perm) { channel.send("Missing permissions for creating a tag."); return false; }
                }
                if (this.checkUserBlacklist(member)) { channel.send("No."); return false; }
                tag = await this.createTag(gname, guild, user, Date.now());
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
                if (!(member.roles.has(role.role.id))) { channel.send('You don\'t seem to have this role.'); return false };
                rv = await member.removeRole(role.role, 'User tag removed');
                channel.send('Tag "' + role.role.name + '" removed!');
                if (role.role.members.array().length == 0) this.deleteTag(role.role.name, guild, channel, this.client.user);
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