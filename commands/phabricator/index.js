module.exports.exec = async (bot, message, args) => { //eslint-disable-line no-unused-vars
    bot.postPhabStory({ storyID: "1975",
        storyType: "PhabricatorApplicationTransactionFeedStory",
        "storyData[objectPHID]": "PHID-CMIT-5jcf3ixxwguusbtys3dw",
        "storyData[transactionPHIDs][PHID-XACT-CMIT-xews4xkxmmjyppc]": "PHID-XACT-CMIT-xews4xkxmmjyppc",
        storyAuthorPHID: "PHID-USER-bpim6n7x7d2ujylo2wjw",
        storyText: "komachi committed rAEGISb32b4f667b0a: Fixed references in phabricator-feed (authored by komachi).",
        epoch: "1509818916" });
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
