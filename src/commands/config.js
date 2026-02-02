const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const {
    getGuildConfig,
    setRecipeChannel,
    removeRecipeChannel,
    clearRecipeChannels
} = require('../services/guildConfig');

const data = new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configure the recipe bot')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand =>
        subcommand
            .setName('channel')
            .setDescription('Add a channel for recipe parsing')
            .addChannelOption(option =>
                option
                    .setName('channel')
                    .setDescription('Channel to enable (leave empty for current channel)')
                    .addChannelTypes(ChannelType.GuildText)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('remove')
            .setDescription('Remove a channel from recipe parsing')
            .addChannelOption(option =>
                option
                    .setName('channel')
                    .setDescription('Channel to remove (leave empty for current channel)')
                    .addChannelTypes(ChannelType.GuildText)
            )
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('list')
            .setDescription('List configured recipe channels')
    )
    .addSubcommand(subcommand =>
        subcommand
            .setName('all')
            .setDescription('Allow recipe parsing in all channels (removes restrictions)')
    );

async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
        case 'channel': {
            const channel = interaction.options.getChannel('channel') || interaction.channel;
            setRecipeChannel(interaction.guildId, channel.id);
            return interaction.reply({
                content: `Recipe parsing enabled in ${channel}. The bot will only parse recipes in configured channels.`,
                ephemeral: true
            });
        }

        case 'remove': {
            const channel = interaction.options.getChannel('channel') || interaction.channel;
            removeRecipeChannel(interaction.guildId, channel.id);
            return interaction.reply({
                content: `Recipe parsing disabled in ${channel}.`,
                ephemeral: true
            });
        }

        case 'list': {
            const config = getGuildConfig(interaction.guildId);
            if (config.channels.length === 0) {
                return interaction.reply({
                    content: 'No channel restrictions set. The bot will parse recipes in all channels.',
                    ephemeral: true
                });
            }
            const channelList = config.channels.map(id => `<#${id}>`).join('\n');
            return interaction.reply({
                content: `**Recipe channels:**\n${channelList}`,
                ephemeral: true
            });
        }

        case 'all': {
            clearRecipeChannels(interaction.guildId);
            return interaction.reply({
                content: 'Channel restrictions removed. The bot will now parse recipes in all channels.',
                ephemeral: true
            });
        }
    }
}

module.exports = { data, execute };
