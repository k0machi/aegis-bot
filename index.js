const Discord = require('discord.js');
const BotConfig = require('./config.json');
const client = new Discord.Client();
const DiscordToken = BotConfig.app_token;
const cmdPrefix = BotConfig.command_prefix;

client.on('ready', () => { 
  console.log('I am ready!');
  client.user.setPresence({game: {name: "say $aegis", type: 0}});
});

function processCommand(message)
{
  const args = message.content.slice(cmdPrefix.length).trim().split(/ +/g);
  const command = args.shift();
  switch (command)
  {
    case 'purge':
        message.channel.send('Implementation pending.');
      break;
    case 'delete':
        message.channel.send('Implementation pending.');
      break;
    case 'blacklist':
        message.channel.send('Implementation pending.');
      break;
    case 'tagme':
        message.channel.send('Tag requested: ' + args.join(' '));
        tagMe(args.join(' '), message.author, message.guild, message.channel);
      break;
    case 'untagme':
        untagMe(args.join(' '), message.author, message.guild, message.channel)
        message.channel.send('Removing tag ' + '"' + args.join(' ')+'"' + " from user " + message.author);
      break;
    case 'aegis':
        message.channel.send({
          embed: {
            author: {
              name: client.user.username,
              icon_url: client.user.avatarURL
            },
            title : 'Tag Bot',
            fields: [{
              name : 'Commands',
              value : '**!tagme** *<tagname>* - Sets an @ - able tag on you. \n**!untagme** *<tagname>* - Removes a tag from you. If this results in tag having no members, the tag is removed'
            },
            {
              name : 'Moderator Commands',
              value : 'Requries MANAGE_ROLES permission.\n**!delete** *<tagname>* - Deletes a user-defined tag\n**!blacklist** *<user>* *<deleteTags>* - Blacklists a user and, optionally, removes all tags they\'ve created\n**!purge** - Deletes all user defined tags'
            }]
          }
        });
      break;
  }
}

async function checkTag(tagname, guild)
{
  role = await guild.roles.find('name', tagname);
  return role;
}

async function createTag(tagname, guild)
{
  role = await guild.createRole({
    name : tagname,
    color : '00e5ff',
    permissions : 0,
    mentionable : true
  }, 'User requested a non-existent user-defined tag')
  return role;
}

async function deleteTag(tagname, guild)
{
  var result;
  role = await guild.roles.find('name', tagname);
  role.delete('A user-created tag is now empty');
}

async function tagMe(gname, user, guild, channel)
{
  if (gname.length > 16) { channel.send('Woah there dude, that\'s way too long!'); return false; };
  if (gname.includes('@')) { channel.send('Nuh-uh, that doesn\'t look like a good idea'); return false; };
  if (gname.length < 1) { channel.send('Hey, at least make the name longer than your penis length'); return false; };
  try {
    member = await guild.members.find('id', user.id);
    role = await checkTag(gname, guild);
    //console.log(role);
    if (role) {
      rv = await member.addRole(role, 'User tag added');
      channel.send('I\'ve tagged you with "' + role.name + '"');
      return true;
    }
    else
    {
      tag = await createTag(gname, guild);
      rv = await member.addRole(tag, 'User tag');
      channel.send('I\'ve tagged you with "' + tag.name + '"');
      return true;
    }
  }
  catch (e)
  {
    channel.send(e.message);
    console.log(e);
  }
}

async function untagMe(gname, user, guild, channel)
{
  try
  {
    member = await guild.members.find('id', user.id);
    role = await checkTag(gname, guild);    
    if (role) {
      if (!(member.roles.has(role.id))) { channel.send('You don\'t seem to have this role.'); return false };
      rv = await member.removeRole(role, 'User tag removed');
      channel.send('Tag "' + role.name + '" removed!');
      if (role.members.array().length == 0) deleteTag(role.name, guild);
      return true;
    }
    else
    {
      channel.send('This tag doesn\'t seem to exist!');
    }   
  }
  catch (e)
  {
    channel.send(e.message);
    console.log(e);
  }
}

client.on('message', message => {
    if (message.content.startsWith(cmdPrefix)) {
      processCommand(message);
    }
});

client.login(DiscordToken);