const { promisify } = require("util");
const dirRead = promisify(require("fs").readdir);

module.exports = {
    bot: null,
    templates: {},
    endpoint: null,

    init: async function (canduit, bot) {
        var that = this;
        this.endpoint = canduit;
        this.bot = bot;
        let template_f = await dirRead(__dirname + "/templates");
        template_f.forEach(function(template) {
            try {
                if (template.split(".").slice(-1)[0] !== "js") throw { e: "Not a js file " };
                let temp = require(__dirname + "/templates/" + template);
                if (!temp.prototype.key) throw { message: "Missing template key" };
                bot.log.info(`Loading template: ${temp.prototype.key}`);
                that.templates[temp.prototype.key] = temp;
            } catch (e) {
                bot.log.warn(e.message);
            }
        });
    },

    check_space: function (space_phid) {
        if (this.bot.config.phab_hidden_spaces.includes(space_phid)) {
            this.bot.log.debug("check_space");
            return false;
        } else {
            return true;
        }
    },

    message_factory: {
        author: null,
        object: null,
        story: null,
        bot: null,

        destroy: function () {
            this.author = null;
            this.story = null;
            this.object = null;
        },

        init: function (post, bot) {
            this.story = post;
            this.bot = bot;
            bot.phabricator.endpoint.exec("user.search", { constraints: { phids: [post.storyAuthorPHID] }, attachments: { avatar: true } }, this.cbAuthor.bind(this));
            bot.phabricator.endpoint.exec("phid.query", { phids: [post["storyData[objectPHID]"]] }, this.cbObject.bind(this));
        },

        cbAuthor: function (err, author) {
            this.author = author;
            if (this.author && this.object) this.send();
        },

        cbObject: function (err, object) {
            if (object.length === 0) { //If we have no access to the object an empty array is returned - check for it and abort building message
                this.destroy();
                return;
            }
            this.object = object;
            if (this.author && this.object) this.send();
        },

        send: function () {
            this.bot.log.trace(
                "-------------------BEGIN FEED STORY DUMP-------------------\n",
                this.story,
                "\n",
                this.author,
                "\n",
                this.object,
                "\n-------------------END FEED STORY DUMP-------------------\n"
            );
            let ph = this.bot.phabricator;
            let ph_obj = this.object[Object.keys(this.object)[0]];
            let guild = this.bot.client.guilds.find("id", this.bot.config.phab_story_guild_id);
            if (!guild) throw { message: "Not a member of dev guild" };
            let channel = guild.channels.find("id", this.bot.config.phab_story_channel_id);
            if (!channel) throw { message: "Unknown channel" };
            try {
                //TODO:
                //Separate exception handling with undefined template handling
                new ph.templates[ph_obj.type](this.object, this.author, this.story, this.bot, channel);
            } catch (e) {
                new ph.templates["GEN0"](this.object, this.author, this.story, this.bot, channel);
            }
        }
    }
};
