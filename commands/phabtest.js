module.exports.exec = async (bot, message, args) => {
    bot.postPhabStory({
        storyID: '1738',
        storyType: 'PhabricatorApplicationTransactionFeedStory',
        'storyData[objectPHID]': 'PHID-TASK-giwbfh4l4vrqpamgztvz',
        'storyData[transactionPHIDs][PHID-XACT-TASK-2xmo4xfa3g4iwbg]': 'PHID-XACT-TASK-2xmo4xfa3g4iwbg',
        storyAuthorPHID: 'PHID-USER-bpim6n7x7d2ujylo2wjw',
        storyText: 'komachi added a comment to T119: Discord Feed Hook.',
        epoch: '1507147932'
    });
    //bot.conduit_endpoint.exec('conduit.ping', {}, async (err, result) => {
    //    console.log(result);
    //    rv = await message.channel.send(JSON.stringify(result));
    //})
}

module.exports.meta = {
    action: "phabtest",
    active: true,
    aliases: ["pt", "cond"],
    permissions: "ALL"
}

module.exports.help = function (pfx) {
    var data = {
        pretty: "Conduit API Test",
        description: "Queries users on phabricator install",
        examples: `**${pfx}phabtest** - Resolves users on phabricator`
    };

    return data;
}
