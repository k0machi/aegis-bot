const Phabricator = require("./commands/phabricator/phabricator.js");
module.exports = {
    debug: false,
    client: null,
    sql: null,
    config: null,
    canduit: null,
    phabricator: null,
    yaml: null,
    fs: null,
    pfx: '',
    cooldowns: {},
    commands: {},
    aliases: {},

    postPhabStory: function (post) {
        var message = Object.create(this.phabricator.message_factory);
        message.init(post, this);
    },

    init: function (config, sql, client, canduit, yaml, fs, process) {
        if (process.argv.includes("--aidebug")) {
            this.debug = true;
            console.log("Debug mode");
        }
        this.config = config;
        this.client = client;
        this.sql = sql;
        this.yaml = yaml;
        this.fs = fs;
        this.pfx = this.config.command_prefix;
        this.phabricator = Phabricator;
        this.canduit = canduit;
        this.phabricator.init(canduit, this);
    },

    sayHello: async function (member, gid) {
        wmsg = await this.sql.get('SELECT * FROM WelcomeMessages WHERE guildId == ?', [gid]);
        if (!wmsg) return;
        guild = this.client.guilds.find('id', wmsg.GuildId);
        if (!guild) throw { message: 'WMSG: Guild not found' };
        channel = guild.channels.find('id', wmsg.ChannelId);
        if (!channel) throw { message: 'WMSG: Unknown channel' };
        channel.send(member + ", " + wmsg.Message);
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

    verifyPermission: function (member, perm) {
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
            if (this.debug) console.log(`"${cmd.settings.permissions}"`);
            if (['dm', 'group'].includes(message.channel.type)) {
                this.commands['aigis'].exec(this, message, [args[0] === '-a' ? '-a': command]);
                return
            }
            perm = await this.verifyPermission(message.member, cmd.settings.permissions);
            if (!perm) throw { message: `Missing permissions: ${cmd.settings.permissions}` };
            var cd = this.checkCooldown(message, command);
            console.log(this.cooldowns);
            if (!cd) throw { message: `Please wait before executing \`${this.pfx}${cmdName}\` again` };
            await cmd.exec(this, message, args);
        } catch (e) {
            message.channel.send(e.message);
        }
    },
    checkCooldown: function (message, command) {
        cmd = this.commands[command] || this.commands[this.aliases[command]];
        cmdName = cmd.meta.action;
        try {
            var cd = this.cooldowns[message.member.guild.id][message.member.user.id][cmdName];
            if (parseInt(message.createdTimestamp) < parseInt(cd) + cmd.settings.cooldown * 1000) {
                return false;
            } else {
                cd = message.createdTimestamp;
                return true;
            }
        } catch (e) {
            var cd = this.cooldowns[message.member.guild.id];
            if (!cd) {
                this.cooldowns[message.member.guild.id] = {};
                cd = this.cooldowns[message.member.guild.id];
            }
            if (!cd[message.member.user.id]) cd[message.member.user.id] = {};
            if (!cd[message.member.user.id][cmdName]) cd[message.member.user.id][cmdName] = message.createdTimestamp;
            return true;
        }
    },

    switchTagMode: async function (guild, message) {
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
        }, `${user.username} requested a non-existent user-defined tag`);
        result = await this.sql.run('INSERT INTO UserTags ([tagname], [roleid], [guildid], [creatorid], [createdTimestamp]) VALUES (?,?,?,?,?)', [tagname, role.id, guild.id, user.id, time]);
        if (!result) throw { message: 'Error accessing database' };
        return role;
    },

    deleteTag: async function (tagname, guild, channel, user) {
        var result;
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
                if (!member.roles.has(role.role.id)) { channel.send('You don\'t seem to have this role.'); return false; }
                rv = await member.removeRole(role.role, 'User tag removed');
                channel.send('Tag "' + role.role.name + '" removed!');
                if (role.role.members.array().length === 0) this.deleteTag(role.role.name, guild, channel, this.client.user);
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

    parseYAML: function (path) {
        return this.yaml.safeLoad(this.fs.readFileSync(path, 'utf8'));
    }
};