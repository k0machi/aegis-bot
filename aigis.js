const Discord = require("discord.js");
const { promisify } = require("util");
const directoryReader = promisify(require("fs").readdir);
const http = require("http");
const qs = require("querystring");
const canduit = require("canduit");

class Aigis 
{
    constructor() {
        if (process.argv.includes("--aidebug")) {
            this.debug = true;
            console.log("Debug mode");
        }
        this.client = new Discord.Client();
        this.fs = require("fs");
        this.sql = require("sqlite");
        this.yaml = require("js-yaml");
        this.phabricator = require("./commands/phabricator/phabricator.js");
        this.cooldowns = {};
        this.commands = {};
        this.aliases = {};
    }

    async run() {
        this.server = http.createServer((req, res) => {
            res.end();
        });
        this.sql.open("./database/main.db");
        this.config = this.yaml.safeLoad(this.fs.readFileSync("./config.yml", "utf8"));
        this.pfx = this.config.command_prefix;
        this.canduit = canduit({ api: this.config.phab_host, user: "Aegis", token: this.config.phab_api_token }, () => { console.log("Conduit Init"); });
        this.phabricator.init(this.canduit, this);
        const commands = await directoryReader("./commands/");
    
        commands.forEach(function(file) {
            try {
                var command = require(`./commands/${file}/index.js`);
                console.log(`Loading command ${command.help(this.config.command_prefix).pretty}`);
                var settings = this.yaml.safeLoad(this.fs.readFileSync(`./commands/${file}/command.yml`, "utf8"));
                if (settings.active === false) {
                    console.log(command.help(this.config.command_prefix).pretty + " is disabled, skipping...");
                    return;
                }
                command.settings = settings;
                this.registerCommand(command.meta.action, command);
                let aliases = settings.aliases;
                aliases.forEach((alias) => {
                    this.registerAlias(alias, command.meta.action);
                });
            } catch (e) {
                console.log(`Unable to parse files: ${file}: ${e}`);
            }
        }.bind(this));
    
        this.client.on("message", this.processCommand.bind(this));
    
        this.client.on("guildMemberAdd", function (member) {
            try {
                this.sayHello(member);
            } catch (e) {
                console.log(e.message);
            }
        }.bind(this));
    
        this.server.on("request", function(req, res) { //eslint-disable-line no-unused-vars
            if (req.url.includes("phab-story")) {
                if (this.debug) console.log("Endpoint phab-story called");
                var body = "";
                req.on("data", function (data) {
                    body += data;
                    if (body.length > 1e6)
                        req.connection.destroy();
                });
    
                req.on("end", function () {
                    var post = qs.parse(body);
                    this.postPhabStory(post);
                }.bind(this));
            }
        }.bind(this));

        this.server.listen(8888);
        this.client.login(this.config.app_token);
        this.setPresence();
    }

    async sayHello(member) {
        let wmsg = await this.sql.get("SELECT * FROM WelcomeMessages WHERE guildId == ?", [member.guild.id]);
        if (!wmsg) return;
        let channel = member.guild.channels.get(wmsg.ChannelId);
        if (!channel) throw { message: "SayHello(): Channel not found" };
        channel.send(member + ", " + wmsg.Message);
    }

    postPhabStory(post) {
        var message = Object.create(this.phabricator.message_factory);
        message.init(post, this);
    }

    setPresence() {
        this.client.on("ready", async () => {
            console.log("Initialization finished.");
            this.client.user.setPresence({ game: { name: `say ${this.pfx}aigis`, type: 0 } });
            if (this.debug) console.log(this.aliases);
        });
    }

    registerCommand(verb, object) {
        this.commands[verb] = object;
    }

    registerAlias(alias, verb) {
        this.aliases[alias] = verb;
    }

    async getTagMode(guild) {
        let mode = await this.sql.get("SELECT * FROM TagModeData WHERE guildId == ?", [guild.id]);
        return mode.mode;
    }

    verifyPermission(member, perm) {
        let perms = member.hasPermission(perm, false, true);
        if (perms) {
            return true;
        } else {
            return false;
        }
    }
    
    async processCommand(message) {
        if (!message.content.startsWith(this.config.command_prefix)) return;
        const args = message.content.slice(this.config.command_prefix.length).trim().split(/ +/g);
        const command = args.shift();
        const cmd = this.commands[command] || this.commands[this.aliases[command]];
        if (!cmd)
            return;
        try {
            if (this.debug) console.log(`"${cmd.settings.permissions}"`);
            if (["dm", "group"].includes(message.channel.type)) {
                this.commands["aigis"].exec(this, message, [args[0] === "-a" ? "-a": command]);
                return;
            }
            let perm = await this.verifyPermission(message.member, cmd.settings.permissions);
            if (!perm) throw { message: `Missing permissions: ${cmd.settings.permissions}` };
            let cd = this.checkCooldown(message, command);
            if (this.debug) console.log(this.cooldowns);
            if (cd) throw {
                message: `Please wait ${parseInt(cd /1000)} seconds before executing \`${this.pfx}${cmd.meta.action}\` again` 
            };
            if (this.debug) console.log(`${command} exec`);
            await cmd.exec(this, message, args);
        } catch (e) {
            message.channel.send(e.message);
        }
    }

    checkCooldown(message, command) {
        var cmd = this.commands[command] || this.commands[this.aliases[command]];
        var cmdName = cmd.meta.action;
        try {
            let cd = this.cooldowns[message.member.guild.id][message.member.user.id];
            let secondsRemaining = (parseInt(cd[cmdName]) + cmd.settings.cooldown * 1000) - parseInt(message.createdTimestamp);
            if (secondsRemaining > 0) {
                return secondsRemaining;
            } else {
                cd[cmdName] = message.createdTimestamp;
                return false;
            }
        } catch (e) {
            let cd = this.cooldowns[message.member.guild.id];
            if (!cd) {
                this.cooldowns[message.member.guild.id] = {};
                cd = this.cooldowns[message.member.guild.id];
            }
            if (!cd[message.member.user.id]) cd[message.member.user.id] = {};
            if (!cd[message.member.user.id][cmdName]) cd[message.member.user.id][cmdName] = message.createdTimestamp;
            return false;
        }
    }

    async switchTagMode(guild, message) {
        var mode = await this.sql.get("SELECT * FROM TagModeData WHERE guildId == ?", [guild.id]);
        if (mode) {
            await this.sql.run("UPDATE TagModeData SET [mode] = ? WHERE guildid == ?", [!mode.mode, mode.guildId]);
            if (mode.mode) {
                message.channel.send("Switched tagging mode to public - everyone can create tags!");
            } else {
                message.channel.send("Switched tagging mode to protected - only people with \"Manage Roles\" can create new tags");
            }
        } else {
            await this.sql.run("INSERT INTO TagModeData ([guildId], [mode]) VALUES (?, ?)", [guild.id, 1]);
            message.channel.send("Switched tagging mode to protected - only people with \"Manage Roles\" can create new tags");
        }
    }

    checkUserBlacklist(member) {
        if (member.roles.find("name", "Vandal")) return true;
        return false;
    }

    async checkTag(tagname, guild) {
        let role_db = await this.sql.get("SELECT * FROM UserTags WHERE tagname == ?", [tagname]);
        let role_server = await guild.roles.find("name", tagname);
        if (role_db && role_server) return { "role": role_server, "db": role_db };
        if (!role_server && !role_db) return false;
        if (role_server && !role_db) throw { message: "Unmanaged role - not allowed!" };
    }

    async createTag(tagname, guild, user, time) {
        let role = await guild.createRole({
            name: tagname,
            color: "00e5ff",
            permissions: 0,
            mentionable: true
        }, `${user.username} requested a non-existent user-defined tag`);
        let result = await this.sql.run("INSERT INTO UserTags ([tagname], [roleid], [guildid], [creatorid], [createdTimestamp]) VALUES (?,?,?,?,?)", [tagname, role.id, guild.id, user.id, time]);
        if (!result) throw { message: "Error accessing database" };
        return role;
    }

    async deleteTag(tagname, guild, channel, user) { //eslint-disable-line no-unused-vars
        var result;
        try {
            let role = await this.checkTag(tagname, guild);
            if (!role) throw { message: "Role doesn't exist" };
            role.role.delete("A user-created tag is now empty");
            result = await this.sql.run("DELETE FROM UserTags WHERE tagname == ? AND guildid == ?", [tagname, guild.id]);
            if (!result) throw { message: "Error accessing database" };
            await channel.send(`Tag "${role.role.name}" deleted`);
        } catch (e) {
            channel.send(e.message);
        }
    }

    async untagMe(gname, user, guild, channel) {
        try {
            let member = await guild.members.find("id", user.id);
            let role = await this.checkTag(gname, guild);
            if (role) {
                if (!member.roles.has(role.role.id)) { channel.send("You don't seem to have this role."); return false; }
                await member.removeRole(role.role, "User tag removed");
                channel.send("Tag \"" + role.role.name + "\" removed!");
                if (role.role.members.array().length === 0) this.deleteTag(role.role.name, guild, channel, this.client.user);
                return true;
            }
            else {
                channel.send("This tag doesn't seem to exist!");
            }
        }
        catch (e) {
            channel.send(e.message);
            console.log(e);
        }
    }

    logToDB(id, time, cmd, args, guild) {
        this.sql.run("INSERT INTO History ([User_Id], [Time], [Action], [Arguments], [Guild]) VALUES (?, ?, ?, ?, ?)", [id, time, cmd, JSON.stringify(args), guild.id]);
    }

    parseYAML(path) {
        return this.yaml.safeLoad(this.fs.readFileSync(path, "utf8"));
    }
}

module.exports = Aigis;