const { promisify } = require("util");
const dirRead = promisify(require("fs").readdir);

module.exports = {
    author: null,
    object: null,
    bot: null,
    story: null,
    templates: {},
    conduit_endpoint: null,

    init: async function (bot, endpoint) {
        var that = this;
        this.bot = bot;
        this.endpoint = endpoint;
        this.conduit_endpoint = endpoint;
        let template_f = await dirRead("./phabricator/templates");
        template_f.forEach(function(template) {
            try {
                if (template.split(".").slice(-1)[0] != 'js') throw { e: "Not a js file " };
                let temp = require("./templates/" + template);
                if (!temp.key) throw { e: "Missing template key" };
                that.templates[temp.key] = temp;
            } catch (e) {
                console.log(e);
            };
        });
    },

    destroy: function () {
        this.author = null;
        this.story = null;
        this.object = null;
    },

    phabStory: function (post) {
        this.story = post;
        console.log(post);
        this.conduit_endpoint.exec('user.search', { constraints: { phids: [post.storyAuthorPHID] }, attachments: { avatar: true } }, this.cbAuthor.bind(this));
        this.conduit_endpoint.exec('phid.query', { phids: [post["storyData[objectPHID]"]] }, this.cbObject.bind(this));
    },

    cbAuthor: function (err, author) {
        this.author = author;
        if (this.author && this.object) this.send();
    },

    cbObject: function (err, object) {
        this.object = object;
        if (this.author && this.object) this.send();
    },

    send: function () {
        guild = this.bot.client.guilds.find('id', this.bot.config.phab_story_guild_id);
        if (!guild) throw { message: 'Not a member of dev guild' };
        channel = guild.channels.find('id', this.bot.config.phab_story_channel_id);
        if (!channel) throw { message: 'Unknown channel' };
        let template = this.templates[this.object[Object.keys(this.object)[0]].type];

        if (template.key)
            template.build(this.object, this.author, this.story, this.conduit_endpoint, channel);
        else {
            let template = this.templates["GENERIC"];
            template.build(this.object, this.author, this.story, this.conduit_endpoint, channel);
        };

        this.destroy();
    }
};