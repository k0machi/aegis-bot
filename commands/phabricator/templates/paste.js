function Template(object, author, story, bot, channel) {
    this.object = object;
    this.author = author;
    this.story = story;
    this.channel = channel;
    this.template = {
        title: null, //this.object[Object.keys(this.object)[0]].name,
        url: null, //this.object[Object.keys(this.object)[0]].uri,
        author: {
            name: null, //this.author.data[0].fields.username,
            url: "https://dev.onozuka.info/paste",
            icon_url: "https://dev.onozuka.info/res/phabricator/65905ecd/rsrc/favicons/apple-touch-icon-152x152.png"
        },
        fields: [
            {
                name: null, //this.object[Object.keys(this.object)[0]].typeName,
                value: null //this.story.storyText
            }
        ]
    };
    this.template.title = this.object[Object.keys(this.object)[0]].name;
    this.template.url = this.object[Object.keys(this.object)[0]].uri;
    this.template.author.name = this.object[Object.keys(this.object)[0]].typeName;
    this.template.fields[0].name = (new Date(parseInt(this.story.epoch, 10) * 1000)).toUTCString();
    this.template.fields[0].value = this.story.storyText;
    this.send(this.channel);
}

Template.prototype = {
    key: "PSTE",
    callback: function (err, object) {
        this.send(this.channel);
    },
    send: async function (channel) {
        rv = channel.send({
            embed: this.template
        });
    }
};

module.exports = Template;