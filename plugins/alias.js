const Keyv = require('keyv');
const main = require('../main.js');
const utils = require('../utils.js');
const client = main.getClient();
const globalCommands = main.getCommands();
const commands = {};
const events = {};
let aliases = {};

events.message = function (msg) {
    if (msg.author.bot || msg.content.indexOf(client.prefix) !== 0) return;
    const args = msg.content.slice(client.prefix.length).trim().split(/ +/g);
    const aliasName = args.shift();
    const alias = aliases[aliasName];
    if (alias) {
        const commandName = alias.commandName;
        const aliasArgs = alias.args;
        const baseCommand = globalCommands[commandName];
        if (baseCommand) {
            const passInArgs = aliasArgs.concat(args);
            const command = main.getCommand('run', baseCommand, passInArgs);
            if (command) {
                command(msg, passInArgs);
            }
        }
    }
}

commands.alias = {
    'set': async function (msg, args) {
        const alias = args[0];
        const commandName = args[1];
        if (!alias && !commandName) {
            msg.channel.send(`You must do: ${client.prefix}alias set <alias> <commandToExecute>`);
            return;
        }
        if (globalCommands[alias]) {
            msg.channel.send('Cannot create an alias for that specific command because a command already has that alias');
            return;
        }
        const baseCommand = globalCommands[commandName];
        if (!baseCommand) {
            msg.channel.send('That\'s not a valid command');
            return;
        }
        const command = main.getCommand('run', baseCommand, args.slice(2));
        if (!command) {
            msg.channel.send('An error occured while trying to add that alias');
            return;
        }
        aliases[alias] = {
            'commandName': commandName,
            'args': args.slice(2)
        };
        await client.aliases.set('aliases', aliases);
        msg.channel.send('Successfully created an alias for that specific command');
    },
    'remove': async function (msg, args) {
        const alias = args[0];
        if (!alias) {
            msg.channel.send(`You must do: ${client.prefix}alias remove <alias>`);
            return;
        }
        if (!aliases[alias]) {
            msg.channel.send('That alias doesn\'t exist');
            return;
        }
        delete aliases[alias];
        await client.aliases.set('aliases', aliases);
        msg.channel.send('Successfully removed that alias');
    },
    'list': function (msg, args) {
        const aliasesTable = {};
        for (const alias in aliases) {
            const commandName = aliases[alias].commandName;
            const args = aliases[alias].args;
            aliasesTable[alias] = `${client.prefix}${commandName} ${args.join(' ')}`;
        }
        msg.channel.send(utils.getEmbedFromObject(aliasesTable));
    }
};

module.exports.events = events;
module.exports.commands = commands;
module.exports.setup = async function () {
    client.aliases = new Keyv('sqlite://data.db', {
        namespace: 'aliases'
    });
    aliases = await client.aliases.get('aliases') || {};
    client.aliases.on('error', err => console.log('Aliases Plugin Connection Error', err));
}