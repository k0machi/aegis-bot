module.exports = {
    object: null,
    author: null,
    story: null,
    channel: null,
    callback: function (err, object) {
        console.log(object.data[0].fields);
        this.template.fields[0].name = object.data[0].fields.name;
        this.template.fields[1].value = object.data[0].fields.priority.name;
        this.send(this.channel);
    },
    send: async function (channel) {
        rv = channel.send({
            embed: this.template
        })
    },
    build: function (object, author, story, endpoint, channel) {
        this.object = object;
        this.author = author;
        this.story = story;
        this.channel = channel;
        console.log(object);
        endpoint.exec('maniphest.search', { constraints: { phids: [ this.object[Object.keys(object)[0]].phid ] } }, this.callback.bind(this));
        this.template.title = this.object[Object.keys(this.object)[0]].name;
        this.template.url = this.object[Object.keys(this.object)[0]].uri;
        this.template.author.name = this.object[Object.keys(this.object)[0]].typeName;
        this.template.fields[0].name = this.object[Object.keys(this.object)[0]].typeName;
        this.template.fields[0].value = this.story.storyText;
        this.template.fields[2].value = this.object[Object.keys(this.object)[0]].status;
        return this;
    },
    template: {
        title: null, //this.object[Object.keys(this.object)[0]].name,
        url: null, //this.object[Object.keys(this.object)[0]].uri,
        author: {
            name: null, //this.author.data[0].fields.username,
            url: "https://dev.onozuka.info/maniphest",
            icon_url: "https://dev.onozuka.info/res/phabricator/65905ecd/rsrc/favicons/apple-touch-icon-152x152.png"
        },
        fields: [
            {
                name: null, //this.object[Object.keys(this.object)[0]].typeName,
                value: null //this.story.storyText
            },
            {
                name: "Priority",
                value: null,
            },
            {
                name: "Status",
                value: null, //this.object[Object.keys(this.object)[0]].status
            }
        ]
    }
};