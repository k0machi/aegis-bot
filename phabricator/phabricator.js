task = require('./templates/task.js');

module.exports = {
    conduit_endpoint: null,
    init: function (bot, endpoint) {
        this.phabStoryBuilder.bot = bot;
        this.phabStoryBuilder.endpoint = endpoint;
        this.conduit_endpoint = endpoint;
    },

    phabStory: function (post) {
        this.phabStoryBuilder.story = post;
        this.conduit_endpoint.exec('user.search', { constraints: { phids: [post.storyAuthorPHID] }, attachments: { avatar: true } }, this.phabStoryBuilder.cbAuthor.bind(this.phabStoryBuilder));
        this.conduit_endpoint.exec('phid.query', { phids: [post["storyData[objectPHID]"]] }, this.phabStoryBuilder.cbObject.bind(this.phabStoryBuilder));
    },

    phabStoryBuilder: {
        author: null,
        object: null,
        endpoint: null,
        bot: null,
        story: null,
        destroy: function () {
            this.author = null;
            this.story = null;
            this.object = null;
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
            if (!guild) throw { message: 'Unknown channel' };
            let msg = task.build(this.object, this.author, this.story, this.endpoint, channel)
            this.destroy.bind(this);
        }
    }
};