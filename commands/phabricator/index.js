﻿module.exports.exec = async (bot, message, args) => { //eslint-disable-line no-unused-vars
    bot.postPhabStory({
        storyID: "1898",
        storyType: "PhabricatorApplicationTransactionFeedStory",
        "storyData[objectPHID]": "PHID-TASK-giwbfh4l4vrqpamgztvz",
        "storyData[transactionPHIDs][PHID-XACT-TASK-sb6hxxhvn64ng5r]": "PHID-XACT-TASK-sb6hxxhvn64ng5r",
        storyAuthorPHID: "PHID-USER-bpim6n7x7d2ujylo2wjw",
        storyText: "komachi added a comment to T119: Discord Feed Hook.",
        epoch: "1509303331"
    });
    //bot.conduit_endpoint.exec('conduit.ping', {}, async (err, result) => {
    //    console.log(result);
    //    rv = await message.channel.send(JSON.stringify(result));
    //})
};

module.exports.meta = {
    action: "phabtest"
};

module.exports.help = function (pfx) {
    var data = {
        pretty: "Conduit API Test",
        description: "Sends a test feed story to the bot",
        examples: `**${pfx}${this.meta.action}**`
    };

    return data;
};
