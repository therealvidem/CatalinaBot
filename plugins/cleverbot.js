const querystring = require('querystring');
const Cleverbot = require('cleverbot');
const Enmap = require('enmap');
const EnmapLevel = require('enmap-level');
const provider = new EnmapLevel({name: 'cleverBot'});
const Discord = require('discord.js')
const client = require('../main.js').getClient();
const events = {};
const commands = {};
const userStates = {};
let cleverBot;

function reply(msg, channel, userId) {
  channel.startTyping();
  cleverbot.query(msg, {
    'cs': userStates[userId] || ''
  })
  .then((response) => {
    userStates[userId] = response.cs;
    channel.send(response.output);
    channel.stopTyping();
  })
  .catch((error) => {
    console.log(error.stack);
    channel.send(error.message);
    channel.stopTyping();
  });
}

events.message = function(msg) {
  // Checks if the user isn't a bot and if the user has mentioned the bot.
  if (msg.author.bot || !msg.isMemberMentioned(client.user) || msg.mentions.everyone) return;
  // Since the message could look like "@Bot hello there", we have to
  // split the content into an array of strings, delete the mention part,
  // then join the strings together again, and finally pass in the result: "hello there".
  let content = msg.content.trim();
  let test_mention = Discord.MessageMentions.USERS_PATTERN.exec(content);
  Discord.MessageMentions.USERS_PATTERN.lastIndex = 0;
  let cleanContent = msg.cleanContent.trim().split(/ +/g).slice(1);
  if (!test_mention || test_mention.index !== 0 || content.charAt(test_mention.index + test_mention[0].length) !== ' ') return;
  reply(encodeURI(cleanContent.join(' ')), msg.channel, msg.author.id);
}

commands.cleverbot = function(msg, args) {
  if (!args[0]) return;
  let cleanContent = msg.cleanContent;
  cleanContent = cleanContent.slice(client.prefix.length + 10); // "c;cleverbot test" -> "test"
  reply(encodeURI(cleanContent.join(' ')), msg.channel, msg.author.id);
}

commands.resetcs = function(msg, args) {
  if (userStates[msg.author.id]) {
    delete userStates[msg.author.id];
  }
  msg.channel.send('Successfully cleared our conversation');
}

commands.setcleverbot = function(msg, args) {
  let key = args[0];
  if (!key || !client.checkOwner(msg)) return;
  if (msg.channel.type != 'dm') {
    msg.channel.send('You can only use that command in DMs');
    return;
  }
  client.cleverBot.set('key', key);
  msg.channel.send(`Successfully set key to ${key}`);
}

module.exports.events = events;
module.exports.commands = commands;
module.exports.setup = function() {
  client.cleverBot = new Enmap({provider: provider});
  client.cleverBot.defer.then(() => {
    cleverbot = new Cleverbot({
      'key': client.cleverBot.get('key')
    });
    console.log('Loaded Cleverbot data.');
  });
}
module.exports.unload = function(reason) {
  return new Promise((resolve, reject) => {
    provider.close();
    resolve();
  });
}
