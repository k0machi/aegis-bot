module.exports.exec = async (bot, message, args) => {
    var sql = bot.sql;
    var history = [];
    sql.all("SELECT * FROM History").then(async (rows) => {
        await rows.forEach(async (row, rowid) => {
            try {
                user = await bot.client.fetchUser(row.User_Id + "", true);
                member = await message.guild.fetchMember(row.User_Id);
            } catch (e) {
                console.log(e.message);
            }
            msgDate = new Date(parseInt(row.Time, 10));
            history.push(
                "User "
                + member
                + " ran command \""
                + row.Action
                + "\" with arguments "
                + row.Arguments
                + " at \""
                + msgDate.toLocaleString("en-ISO", { timeZone: "America/New_York" })
                + " EST\"");
            if (rows.length == rowid + 1)
                message.channel.send(history);
        });
    });
};

module.exports.meta = {
    action: "history"
};

module.exports.help = function (pfx) {
    var data = {
        pretty: "History",
        description: "Shows command history",
        examples: `${pfx}${this.meta.action} outputs commands history`
    };

    return data;
};
