const Discord = require("discord.js");
const { promisify } = require("util");
const directoryReader = promisify(require("fs").readdir);
const http = require("http");
const qs = require("querystring");
const canduit = require("canduit");
const bunyan = require("bunyan");
const prettyStream = require("bunyan-prettystream");
const DynamicConfig = require("./core/config/config");
/**
 * Aigis bot
 */
class Aigis
{
    /**
     * @constructor
     */
    constructor() {
        this.client = new Discord.Client();
        this.prettyStream = new prettyStream();
        this.fs = require("fs");
        this.sql = require("sqlite");
        this.yaml = require("js-yaml");
        this.phabricator = require("./commands/phabricator/phabricator.js");
        this.cooldowns = {};
        this.commands = {};
        this.aliases = {};
        this.punishmentTimer = null;
    }
    
    /**
     * Main bot initialization and login
     */
    async run() {

        this.prettyStream.pipe(process.stdout);
        
        if (process.argv.includes("--aidebug")) {
            let index = process.argv.indexOf("--aidebug");
            this.loglevel = parseInt(process.argv[index + 1]) || 30;
        }
        
        this.log = bunyan.createLogger({
            name: "aigis",
            level: this.loglevel || 30,
            streams: [
                {
                    level: this.loglevel || 30,
                    type: "raw",
                    stream: this.prettyStream
                },
                {
                    level: this.loglevel || 30,
                    path: __dirname + "/log/aigis.log"
                },
                {
                    level: 40,
                    path: __dirname + "/log/aigis-error.log"
                }              
            ]
        });
        this.log.info("Log Level: " + this.loglevel);
        this.server = http.createServer((req, res) => {
            res.end();
        });
        await this.sql.open("./database/main.db");
        this.config = this.yaml.safeLoad(this.fs.readFileSync("./config.yml", "utf8"));
        this.dynamicConfig = new DynamicConfig(this.sql, this.log);
        await this.dynamicConfig.init();
        this.pfx = this.config.command_prefix;
        this.canduit = canduit({ api: this.config.phab_host, user: "Aegis", token: this.config.phab_api_token }, () => { this.log.info("Conduit Init"); });
        this.phabricator.init(this.canduit, this);
        this.checkDatabaseSchema();
        const commands = await directoryReader("./commands/");
    
        commands.forEach(function(file) {
            try {
                var command = require(`./commands/${file}/index.js`);
                this.log.info(`Loading command ${command.help(this.config.command_prefix).pretty}`);
                var settings = this.yaml.safeLoad(this.fs.readFileSync(`./commands/${file}/command.yml`, "utf8"));
                if (settings.active === false) {
                    this.log.info(command.help(this.config.command_prefix).pretty + " is disabled, skipping...");
                    return;
                }
                command.settings = settings;
                this.registerCommand(command.meta.action, command);
                let aliases = settings.aliases;
                aliases.forEach((alias) => {
                    this.registerAlias(alias, command.meta.action);
                });
            } catch (e) {
                this.log.warn(`Unable to parse files: ${file}: ${e}`);
            }
        }.bind(this));
    
        this.client.on("message", this.processCommand.bind(this));
    
        this.client.on("guildMemberAdd", function (member) {
            try {
                this.sayHello(member);
            } catch (e) {
                this.log.error(e.message);
            }
        }.bind(this));
    
        this.server.on("request", function(req, res) { //eslint-disable-line no-unused-vars
            if (req.url.includes("phab-story")) {
                this.log.info("Endpoint phab-story called");
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

        process.on("SIGINT", async () => {
            this.log.info("Received ^C, terminating...");
            await this.client.destroy();
            this.server.close();
            process.exit(0);
        });
        
        this.server.listen(8888);
        this.client.login(this.config.app_token);
        this.setPresence();
    }

    /**
     * Retrieves a welcome message from database and sends it to the new member
     * @param {Discord.GuildMember} member 
     */
    async sayHello(member) {
        let wmsg = await this.sql.get("SELECT * FROM WelcomeMessages WHERE guildId == ?", [member.guild.id]);
        if (!wmsg) return;
        let channel = member.guild.channels.get(wmsg.ChannelId);
        if (!channel) throw { message: "SayHello(): Channel not found" };
        channel.send(member + ", " + wmsg.Message);
    }

    /**
     * Processes phabricator feed.http-hooks messages
     * @param {Object} post 
     */
    postPhabStory(post) {
        var message = Object.create(this.phabricator.message_factory);
        message.init(post, this);
    }

    /**
     * Sets presence on Discord
     */
    setPresence() {
        this.client.on("ready", async () => {
            this.log.info("Initialization finished.");
            this.client.user.setPresence({ game: { name: `say ${this.pfx}aigis`, type: 0 } });
            this.log.trace(this.aliases);
            this.punishmentsTicker();
        });
    }

    /**
     * Assigns command verb to a command object
     * @param {string} verb command string
     * @param {Object} object command object
     */
    registerCommand(verb, object) {
        this.commands[verb] = object;
    }

    /**
     * Registers an alias to point to a command
     * @param {string} alias 
     * @param {string} verb 
     */
    registerAlias(alias, verb) {
        this.aliases[alias] = verb;
    }

    /**
     * Retrieves tagmode for the guild
     * @param {Discord.Guild} guild guild to get tagmode for
     */
    async getTagMode(guild) {
        let mode = await this.sql.get("SELECT * FROM TagModeData WHERE guildId == ?", [guild.id]);
        return mode.mode;
    }

    /**
     * Checks if a member posses required permissions
     * @param {Discord.GuildMember} member member to check permissions against
     * @param {string|array} perm Permissions(s) to check
     * @returns {boolean} true for having said permissions
     */
    verifyPermission(member, perm) {
        let perms = member.hasPermission(perm, false, true);
        if (perms) {
            return true;
        } else {
            return false;
        }
    }

    /**
     * Callback for "message" event
     * @param {Discord.Message} message message to process
     */
    async processCommand(message) {
        if (!message.content.startsWith(this.config.command_prefix)) return;
        if(message.author.bot) return;
        const args = message.content.slice(this.config.command_prefix.length).trim().split(/ +/g);
        const command = args.shift();
        const cmd = this.commands[command] || this.commands[this.aliases[command]];
        this.log.info(`${command} requested by ${message.author.username}(${message.author.id}), channel ${message.channel.name}, guild ${message.guild.name}`);
        if (!cmd)
            return;
        try {
            this.log.trace(`"${cmd.settings.permissions}"`);
            if (["dm", "group"].includes(message.channel.type)) {
                this.commands["aigis"].exec(this, message, [args[0] === "-a" ? "-a": command]);
                return;
            }
            let perm = await this.verifyPermission(message.member, cmd.settings.permissions);
            if (!perm) throw { message: `Missing permissions: ${cmd.settings.permissions}` };
            let cd = this.checkCooldown(message, command);
            this.log.trace(this.cooldowns);
            if (cd) throw {
                message: `Please wait ${parseInt(cd /1000)} seconds before executing \`${this.pfx}${cmd.meta.action}\` again` 
            };
            await cmd.exec(this, message, args);
        } catch (e) {
            message.channel.send(e.message);
        }
    }

    /**
     * Checks if user requesting command with cooldown
     * @param {Discord.Message} message message to retrieve guild and member ids from
     * @param {string} command command string
     * @returns {boolean|number} no cooldown or amount of milliseconds remaining
     */
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

    /**
     * Switches tag modes of a guild
     * @param {Discord.Guild} guild Guild to switch tagmode for
     * @param {Discord.Message} message used to send message back
     */
    async switchTagMode(guild, message) { //TODO: Redundant guild argument
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

    /**
     * Checks if a user is a member of blacklisted group (hardcoded as "Vandal")
     * @param {Discord.GuildMember} member 
     * @returns {boolean} status
     */
    checkUserBlacklist(member) {
        if (member.roles.find("name", "Vandal")) return true;
        return false;
    }

    /**
     * Checks if tag exists and is available
     * @param {string} tagname tag to check
     * @param {Discord.Guild} guild
     * @returns {Object, boolean} Returns either the Object containing Discord.Role and DB Field or boolean indicating non-existence
     */
    async checkTag(tagname, guild) {
        let role_db = await this.sql.get("SELECT * FROM UserTags WHERE tagname == ?", [tagname]);
        let role_server = await guild.roles.find("name", tagname);
        if (role_db && role_server) return { "role": role_server, "db": role_db };
        if (!role_server && !role_db) return false;
        if (role_server && !role_db) throw { message: "Unmanaged role - not allowed!" };
    }

    /**
     * Creates a tag and returns it
     * @param {string} tagname tag name
     * @param {Discord.Guild} guild guild to create the role in
     * @param {Discord.User} user user that requsted the role
     * @param {string} time timestamp
     * @returns {Discord.Role} Created role
     */
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

    /**
     * Deletes a tag from a guild
     * @param {string} tagname tag string
     * @param {Discord.Guild} guild Guild to delete tag from
     * @param {Discord.Channel} channel Used to post reply
     * @param {Discord.User} user Used to post to audit log
     */
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

    /**
     * Inserts a history record into db
     * @param {Discord.Snowflake} id user id
     * @param {string} time timestamp
     * @param {string} cmd enum name of the command
     * @param {Object} args arguments used in the command
     * @param {string} guild id of the guild
     */
    logToDB(id, time, cmd, args, guild) {
        this.sql.run("INSERT INTO History ([User_Id], [Time], [Action], [Arguments], [Guild]) VALUES (?, ?, ?, ?, ?)", [id, time, cmd, JSON.stringify(args), guild.id]);
    }

    /**
     * Parses YAML config
     * @param {string} path path to yml file
     * @returns {Object} parsed YAML
     */
    parseYAML(path) {
        return this.yaml.safeLoad(this.fs.readFileSync(path, "utf8"));
    }

    /**
     * Checks if required tables for various modules exist and creates them if they do not
     */
    async checkDatabaseSchema() {
        try { //punishment module
            await this.sql.get("SELECT * FROM Punishments WHERE id = 0");
        } catch (error) {
            this.log.warn(error);
            await this.sql.run("CREATE TABLE IF NOT EXISTS Punishments(id INTEGER PRIMARY KEY, guildid TEXT NOT NULL, discordid TEXT NOT NULL, privileges TEXT, timefrom INTEGER, timeuntil INTEGER, type INTEGER, active TINYINT)");
        }

        try { //russian roulette
            await this.sql.get("SELECT * FROM RouletteScores WHERE discordid = 0");
        } catch (error) {
            this.log.warn(error);
            await this.sql.run("CREATE TABLE IF NOT EXISTS RouletteScores(discordid TEXT NOT NULL, guildid TEXT NOT NULL, wins INTEGER, loses INTEGER, PRIMARY KEY(discordid, guildid))");
        }
    }

    /**
     * Creates new ban record or updates existing one
     * @param {int} guildid Discord server id 
     * @param {Discord.GuildMember} guildMember Member affected
     * @param {int} timeUntil time until punishment is active
     */
    async punishmentsCreateRecord(guildid, guildMember, timeUntil ) { //get all roles except @everyone
        let groupToAssign = await this.dynamicConfig.getValue(guildid, "punish.role");
        if(!groupToAssign) throw {message: "No roles defined for this server, see help for more information"};
        let currentRoles = guildMember.roles.reduce((currentRoles, el) => {
            if(el.name != "@everyone")
                currentRoles.push(el.id);
            return currentRoles;
        }, []);
        let type = 1; //futureproofing, not relevant for now

        //check if records for that user for that server and for that type currently exist
        let existingRecord = await this.sql.get("SELECT * FROM Punishments WHERE guildid = ? AND discordid = ? AND type = ? and active = ?",
            [guildid, guildMember.user.id, type, true]
        );

        if(existingRecord && existingRecord.id) { //update timings existing record
            await this.sql.run("UPDATE Punishments SET timefrom = ?, timeuntil = ? WHERE id = ?",
                [Date.now(), timeUntil, existingRecord.id]
            );
        } else { //create new one
            await this.sql.run("INSERT INTO Punishments ([guildid], [discordid], [privileges], [timefrom], [timeuntil], [type], [active]) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [guildid, guildMember.user.id, currentRoles.join(","), Date.now(), timeUntil, type, true]
            );

            //strip all roles except @everyone
            let stripPromises = currentRoles.map((el) => {
                return guildMember.removeRole(el);
            });
            try {
                await Promise.all(stripPromises);
            } catch (error) {
                this.log.error(`Unable to strip some roles from ${guildMember.user.username} at guild ${guildid} with error: ${error}`);
            }

            //add banned role
            try {
                await guildMember.addRole(groupToAssign);
            } catch (error) {
                this.log.error(`Unable to restore some roles to ${guildMember.user.username} at guild ${guildid} with error: ${error}`);
            }
        }
        this.punishmentsTicker();

    }

    /**
     * This function will be called:
     *  a) on bot restart
     *  b) every time new user is added to punishment record
     *  c) whenever it schedules itself
     * It scans the table for any bans that expired but are still active and unbans that user
     * After that it searches the table for the closest future ban and schedules itself to be called once that ban expires
     * If no ban is found it schedules itself to be called in 5 minutes in very unlikely case the timings aligned and we skipped over one ban
     */
    async punishmentsTicker() {
        let usersToUnban = await this.sql.all("SELECT * FROM Punishments WHERE timeuntil <= ? AND active = ?", 
            [Date.now(), true]
        );
    
        let idsAffected = [];
        for(var i = 0; i < usersToUnban.length; i++) {
            let groupToRemove = await this.dynamicConfig.getValue(usersToUnban[i].guildid, "punish.role");
            let currentGuild = this.client.guilds.get(usersToUnban[i].guildid);
            let currentMember = currentGuild.members.get(usersToUnban[i].discordid);

            //remove banned group
            await currentMember.removeRole(groupToRemove);

            let groupsToRestore = usersToUnban[i].privileges.split(",");
            let restorePromises = groupsToRestore.map((el) => {
                return currentMember.addRole(el);
            });
            await Promise.all(restorePromises); //wait until all groups are restored
            idsAffected.push(usersToUnban[i].id);
        }

        if(idsAffected && idsAffected.length) {
            let whereIds = idsAffected.join(",");
            await this.sql.run("UPDATE Punishments SET active = 0 WHERE id IN("+whereIds+")");
            this.log.info(`Unbanned ${idsAffected.length} users`);
        }

        //get the closest ban record to schedule next check
        let nextCheck = await this.sql.get("SELECT * FROM Punishments WHERE timeuntil > ? AND active = ? ORDER BY timeuntil ASC", 
            [Date.now(), true]
        );
        let delay = 5 * 60 * 1000; //default re-schedule in 5 minutes;
        if(nextCheck) {
            delay = nextCheck.timeuntil - Date.now();
        }
        this.log.info(`Scheduling next ban check in ${delay / 1000} seconds`);
        clearTimeout(this.punishmentTimer);
        this.punishmentTimer = setTimeout(this.punishmentsTicker.bind(this), delay);
    }

    /**
     * Updates records for russian-roulette module
     * @param {int} guildid Discord server id 
     * @param {int} discordid Discord user id
     * @param {boolean} lost Whether the user lost the roulette
     */
    async rouletteUpdateRecords(guildid, discordid, lost) {
        let existingRecord = await this.sql.get("SELECT * FROM RouletteScores WHERE discordid = ? AND guildid = ?",
            [discordid, guildid]
        );
        let insertData = [discordid, guildid];
        if(!existingRecord) { //create new record
            if(lost) {
                insertData.push(0); //wins
                insertData.push(1); //loses
            } else {
                insertData.push(1);
                insertData.push(0);
            }
        } else { //update existing record
            if(lost) {
                insertData.push(existingRecord.wins); //wins
                insertData.push(existingRecord.loses + 1); //loses
            } else {
                insertData.push(existingRecord.wins + 1);
                insertData.push(existingRecord.loses);
            }
        }
        try{
            await this.sql.run("REPLACE INTO RouletteScores ([discordid], [guildid], [wins], [loses]) VALUES(?, ?, ?, ?)", insertData);
        } catch(error) {
            this.log.error("Error updating roulette records: " + error);
        }
    }

    /**
     * Gets records for russian-roulette module
     * @param {int} guildid 
     * @param {int} discordid 
     */
    async rouletteGetRecords(guildid, discordid) {
        let existingRecord = await this.sql.get("SELECT * FROM RouletteScores WHERE discordid = ? AND guildid = ?",
            [discordid, guildid]
        );
        if(!existingRecord) {
            return {wins: 0, loses: 0};
        } else {
            return {wins: existingRecord.wins, loses: existingRecord.loses};
        }
    }
}

module.exports = Aigis;