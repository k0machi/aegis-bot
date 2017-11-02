module.exports.exec = async (bot, message, args) => {
    var jimp = require('jimp');
    var fileName = __dirname + '/resources/sign.png';
    var processedImage;
    var textToPrint = args.join(' ');
    var pages = textToPrint.match(/.{1,15}/g);

    jimp.read(fileName)
        .then(function (image) {
            processedImage = image;
            return jimp.loadFont(__dirname + '/resources/fonts/segoe_20/segoe_20.fnt');
        })
        .then(function (font) {
            var fileName = Math.floor(Date.now());
            let xOffset = 25;
            let yOffset = 75;
            for (var i = 0; i < pages.length; ++i) {
                processedImage.print(font, xOffset, yOffset, pages[i]);
                yOffset += 32;
                xOffset += 2;
            }
            var writtenPath = `./temp/${fileName}.png`;
            var channel = message.channel; 
            processedImage.write(writtenPath, function () {
                channel.send(`Here you go ${message.author}`, {
                    files: [
                        writtenPath
                    ]
                });
            }); 
        })
        .catch(function (err) {
            console.log(err);
        });
}

module.exports.meta = {
    action: "printimage"
}

module.exports.help = function(pfx) {
    var data = {
        pretty: "Print on image",
        description: "Prints your dumb text on image",
        examples: `${pfx}${this.meta.action} <text>`
    };

    return data;
}
