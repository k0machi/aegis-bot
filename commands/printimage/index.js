module.exports.exec = (bot, message, args) => {
    var gd = require("node-gd");
    var picturePath = __dirname + "/resources/sign.png";
    if(args.length < 1)
        throw { message: "WHERE IS THE MESSAGE EGG-MAN" };
    var textToPrint = args.join(" ");
    if (textToPrint.length > 500) throw { message: "Your message is too long!" };

    bot.log.debug(`Opening ${picturePath}`);
    let image = gd.createFromPng(picturePath);
    bot.log.trace("Open ", image);
    let font = `${__dirname}/resources/Roboto-Regular.ttf`;
    let txtColor = image.colorAllocate(0, 0, 0);
    bot.log.trace("CLR ALLOC ", txtColor);
    let words = textToPrint.split(" ");
    let lines = [words[0]];
    let curLine = 0;
    let width = 242;
    let szFont = 14;
    for (let i = 1; i < words.length; i++)
    {
        let szLine = image.stringFTBBox(txtColor, font, szFont, 0, 0, 0, `${lines[curLine]} ${words[i]}`);
        if (szLine[2] - szLine[0] < width)
        {
            lines[curLine] = `${lines[curLine]} ${words[i]}`;
        }
        else
        {
            curLine++;
            lines[curLine] = words[i];
        }
    }
    let xOffset = 28;
    let yOffset = 84;
    image.stringFT(txtColor, font, szFont, 0, xOffset, yOffset, lines.join("\n"));
    var filename = Math.floor(Date.now());
    bot.log.debug("Saving...");
    let path = `./temp/${filename}.png`;
    image.savePng(path, 1, function (err) { 
        if (err) throw err;
        message.channel.send(`Here you go ${message.author}`, {
            files: [
                path
            ]
        });
    });
    image.destroy();

};

module.exports.meta = {
    action: "printimage"
};

module.exports.help = function(pfx) {
    var data = {
        pretty: "Print on image",
        description: "Prints your dumb text on image",
        examples: `${pfx}${this.meta.action} <text>`
    };

    return data;
};
