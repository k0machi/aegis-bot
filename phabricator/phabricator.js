const { promisify } = require("util");
const dirRead = promisify(require("fs").readdir);

module.exports = {
    bot: null,
    templates: {},
    conduit_endpoint: null,

    init: async function () {
        var that = this;
        let template_f = await dirRead("./phabricator/templates");
        template_f.forEach(function(template) {
            try {
                if (template.split(".").slice(-1)[0] != 'js') throw { e: "Not a js file " };
                let temp = require("./templates/" + template);
                if (!temp.prototype.key) throw { e: "Missing template key" };
                console.log(`Loading template: ${temp.prototype.key}`);
                that.templates[temp.prototype.key] = temp;
            } catch (e) {
                console.log(e);
            };
        });
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

        init: function (post, conduit_endpoint, bot) {
            this.story = post;
            this.bot = bot;
            conduit_endpoint.exec('user.search', { constraints: { phids: [post.storyAuthorPHID] }, attachments: { avatar: true } }, this.cbAuthor.bind(this));
            conduit_endpoint.exec('phid.query', { phids: [post["storyData[objectPHID]"]] }, this.cbObject.bind(this));
        },

        cbAuthor: function (err, author) {
            this.author = author;
            if (this.author && this.object) this.send();
        },

        cbObject: function (err, object) {
            if (object.length === 0) { //If we have no access to the object an empty array is returned - check for it and abort building message
                this.destroy();
                return;
            };
            this.object = object;
            if (this.author && this.object) this.send();
        },

        send: function () {
            var ph = this.bot.phabricator;
            var ph_obj = this.object[Object.keys(this.object)[0]];
            guild = this.bot.client.guilds.find('id', this.bot.config.phab_story_guild_id);
            if (!guild) throw { message: 'Not a member of dev guild' };
            channel = guild.channels.find('id', this.bot.config.phab_story_channel_id);
            if (!channel) throw { message: 'Unknown channel' };
            var template = new ph.templates[ph_obj.type](this.object, this.author, this.story, this.bot.canduit, channel);
            
            if (template)
                template.build(this.object, this.author, this.story, this.bot.canduit, channel);
            else {
                let template = this.templates["GENERIC"];
                template.build(this.object, this.author, this.story, this.bot.canduit, channel);
            };
        }
    }
};
