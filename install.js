const fs = require("fs");
const yaml = require("js-yaml"); //eslint-disable-line no-unused-vars
const { promisify } = require("util");
const directoryReader = promisify(require("fs").readdir);
const commandDir = "./commands/";

const run = async () => {
    const commands = await directoryReader(commandDir);
    commands.forEach(file => {
        var dirPath = commandDir + file;
        fs.copyFileSync(dirPath + "/command.yml.dist", dirPath + "/command.yml");
        console.log("Copied config for " + dirPath); //eslint-disable-line no-console
    });
};

run();