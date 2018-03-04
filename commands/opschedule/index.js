module.exports.exec = async (bot, message, args) => { //eslint-disable-line no-unused-vars
    const localConfig = bot.parseYAML(__dirname + "/command.yml");
    const GoogleSpreadsheet = require("google-spreadsheet");
    const dateFormat = require("dateformat");
    const sheetId = localConfig.spreadsheets[message.guild.id];
    let lookAhead = localConfig.lookahead;

    if(parseInt(args[0]) > 0)
        lookAhead = args[0];
    if(!sheetId)
        throw {message: "No spreadsheet linked for this server"};

    if (message.member.roles.array().length < 2)
        throw { message: "This command is restricted to Members and above" };
    
    var doc = new GoogleSpreadsheet(sheetId);
    var nonEmptyRows = [];
    doc.getRows(1, function(err, rows){
        if(err){
            message.channel.send("Something went wrong while fetching. Make sure your spreadsheet is published for web (File -> Publish for Web)");
            bot.log.error(err);
            return;
        }
        rows.forEach(function(elem){
            if(!elem.dates || (elem.mission == "" && elem.authors == "" && elem["commentsmods-bugs-etc."] == "")){
                return;
            }
        
            nonEmptyRows.push({
                date: retardDateToNormalDate(elem.dates),
                name: elem.mission,
                author: elem.authors,
                comment: elem["commentsmods-bugs-etc."]
            }); 

        });

 
        let messageText = "";
        nonEmptyRows.forEach(function(entry){
            if(lookAhead < 1) //remember a few future missions
                return;
            var entryDate = new Date(entry.date);
            var checkDate = new Date();
            var timeZoneDiff = 6;
            checkDate.setDate(checkDate.getDate() - 1);
            if((checkDate - entryDate) / (1000 * 60 * 60) < (timeZoneDiff + 3) ){ //skip past entries, adjust for timzone difference and add some leeway for op length
                messageText += `**When:** ${dateFormat(entryDate, "dddd, mmmm dS")}\n`;
                if(entry.name != "")
                    messageText += `**Mission:** ${entry.name}\n`;
                if(entry.author != "")
                    messageText += `**Author:** ${entry.author}\n`;
                if(entry.comment != "")
                    messageText += `**Note:** ${entry.comment}\n`;
                messageText += "\n";
                lookAhead--;
            }
        });
        if(messageText == "")
            messageText = "It looks like there are no mission scheduled for the nearest future. Why don't you go and make one?";

        message.channel.send(messageText);
    });

    function retardDateToNormalDate(retard){
        let temp = retard.split("/");
        return "20" + temp[2] + "-" + temp[0] + "-" + temp[1];
    }
};

module.exports.meta = {
    action: "op"
};

module.exports.help = function(pfx) {
    var data = {
        pretty: "Op schedule",
        description: "Displays a list of upcoming ops",
        examples: `Type ${pfx}${this.meta.action} \`amount of ops\` to get a list of upcoming ops.`
    };

    return data;
};
