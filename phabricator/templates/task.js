function Template(object, author, story, endpoint, channel) {
    this.object = object;
    this.author = author;
    this.story = story;
    this.channel = channel;
    var task = this.object[Object.keys(object)[0]];
    this.taskid = task.name.split("T")[1];
    this.template = {
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
            },
            {
                name: "Time",
                value: null
            }
        ]
    };
    endpoint.exec('maniphest.search', { constraints: { phids: [task.phid] } }, this.callback.bind(this));
    endpoint.exec('maniphest.gettasktransactions', { ids: [parseInt(this.taskid)] }, this.callbackComments.bind(this));
    this.template.title = task.name;
    this.template.url = task.uri;
    this.template.author.name = task.typeName;
    this.template.fields[3].value = (new Date(parseInt(this.story.epoch, 10) * 1000)).toUTCString();
    this.template.fields[0].value = this.story.storyText;
    this.template.fields[2].value = task.status;
}

Template.prototype = {
    key: "TASK",
    taskFlag: false,
    commentFlag: false,

    callback: function (err, object) {
        this.template.fields[0].name = object.data[0].fields.name;
        this.template.fields[1].value = object.data[0].fields.priority.name;
        this.taskFlag = true;
        if (this.taskFlag && this.commentFlag) this.send(this.channel);
    },

    callbackComments: function (err, object) {
        var storyTransaction = this.story[Object.keys(this.story)[3]];
        this.comments = (object[this.taskid]).find(function (element) {
            return element.transactionPHID === storyTransaction;
        }).comments;
        console.log(this.comments);
        if (this.comments) {
            this.template.fields.push({ name: "Comment", value: this.comments });
        };
        this.commentFlag = true;
        if (this.taskFlag && this.commentFlag) this.send(this.channel);
    },

    send: async function (channel) {
        rv = channel.send({
            embed: this.template
        })
    }
}

module.exports = Template;