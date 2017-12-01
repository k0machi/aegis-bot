module.exports.exec = async (bot, message, args) => { //eslint-disable-line no-unused-vars
    let serverInfo = `\`\`\`md
# Main
## ADDRESS
blueon.blue
## PORT
2302
## PASSWORD
tmtmoperations

# Test
## ADDRESS
onozuka.info
## PORT
2302
## PASSWORD
navyseals
## MODS
* tmtm_mp
* tmtm_contentpack
* CUP_Terrains
* CUP_Weapons
* CUP_Units
* CUP_Vehicles
* RHSUSF
* RHSAFRF
* RHSGREF
* RHSSAF
> Get RHS here
> http://steamcommunity.com/workshop/filedetails/?id=843770737
* JSRS
## Notes
Expect higher than normal ping (NA people expect 100-200)
\`\`\``
    await message.channel.send(serverInfo);
};

module.exports.meta = {
    action: "servers"
};

module.exports.help = function(pfx) {
    var data = {
        pretty: "Server info",
        description: "List current main and test server info",
        examples: `Type ${pfx}${this.meta.action} to use.`
    };

    return data;
};
