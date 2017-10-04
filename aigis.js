module.exports = {
    client: null,
    sql: null,
    config: null,
    canduit: null,
    conduit_endpoint: null,
    pfx: '',
    commands: {},
    aliases: {},

    init: function(config, sql, client, canduit) {
        this.config = config;
        this.client = client;
        this.sql = sql;
        this.pfx = this.config.command_prefix;
        this.canduit = canduit;
        new canduit({ api: this.config.phab_host, user: "Aegis", token: this.config.phab_api_token }, (error, result) => {
            console.log(result);
            this.conduit_endpoint = result;
        })
    },

    phabStory: async function (post) {
        guild = this.client.guilds.find('id', this.config.phab_story_guild_id);
        if (!guild) throw { message: 'Not a member of dev guild' };
        //console.log(guild);
        channel = guild.channels.find('id', this.config.phab_story_channel_id);
        if (!guild) throw { message: 'Unknown channel' };
        //console.log(channel);
        console.log(post);
        //resolving phids
        let ph_author;
        let ph_object;
        p1 = await this.conduit_endpoint.exec('user.search', { constraints: { phids: [post.storyAuthorPHID] } }, (err, user) => {
            console.log('callback');
            console.log(user);
            console.log('exit');
            ph_author = user;
        });
        p2 = await this.conduit_endpoint.exec('phid.query', { phids: [post["storyData[objectPHID]"]] }, (err, object) => {
            console.log('callback');
            console.log(object);
            console.log('exit');
            ph_object = object;
        });

        Promise.all([p1, p2]).then(values => {
            console.log(ph_object);
            console.log(ph_author);
        });
        return;
        rv = await channel.send({
            embed: {
                title: "Phabricator Feed",
                url: "https://dev.onozuka.info",
                author: {
                    name: phab_name,
                    url: phab_object_url,
                    icon_url: phab_avatar
                },
                fields: {
                    field: {
                        name: phab_object_name,
                        value: post.storyText
                    }
                }
            }
        });
    },


    setPresence: function ()
    {
        this.client.on('ready', async () => {
            console.log('I am ready!');
            this.client.user.setPresence({ game: { name: `say ${this.pfx}aigis`, type: 0 } });
            console.log(this.aliases);
        });
    },

    registerCommand: function (verb, object) {
        this.commands[verb] = object;
    },

    registerAlias: function (alias, verb) {
        this.aliases[alias] = verb;
    },

    getTagMode: async function (guild) {
        mode = await this.sql.get('SELECT * FROM TagModeData WHERE guildId == ?', [guild.id]);
        return mode.mode;
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

    processCommand: async function (message) {
        const args = message.content.slice(this.config.command_prefix.length).trim().split(/ +/g);
        const command = args.shift();
        const cmd = this.commands[command] || this.commands[this.aliases[command]];
        if (!cmd)
            return;
        try {
            await cmd.exec(this, message, args);
        } catch (e) {
            message.channel.send(e.message);
        }
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

    checkUserBlacklist: function (member) {
        if (member.roles.find('name', 'Vandal')) return true;
        return false;
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

    deleteTag: async function (tagname, guild, channel, user) {
        var result;
        perm = await this.verifyPermission(user, guild, "MANAGE_ROLES");
        if (!perm) { channel.send('No.'); return; };
        try {
            role = await this.checkTag(tagname, guild);
            if (!role) throw { message: 'Role doesn\'t exist' };
            role.role.delete('A user-created tag is now empty');
            result = await this.sql.run('DELETE FROM UserTags WHERE tagname == ? AND guildid == ?', [tagname, guild.id]);
            if (!result) throw { message: 'Error accessing database' };
            await channel.send(`Tag "${role.role.name}" deleted`);
        } catch (e) {
            channel.send(e.message);
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
    },

    logToDB: function (id, time, cmd, args, guild) {
        this.sql.run('INSERT INTO History ([User_Id], [Time], [Action], [Arguments], [Guild]) VALUES (?, ?, ?, ?, ?)', [id, time, cmd, JSON.stringify(args), guild.id]);
    },

};