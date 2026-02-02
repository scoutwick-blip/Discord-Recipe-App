const { SlashCommandBuilder } = require('discord.js');
const { getGuildStats } = require('../services/recipeStorage');
const { formatStatsEmbed } = require('../utils/formatters');

const data = new SlashCommandBuilder()
    .setName('recipestats')
    .setDescription('View recipe collection statistics');

async function execute(interaction) {
    const stats = getGuildStats(interaction.guildId);
    const embed = formatStatsEmbed(stats);

    return interaction.reply({ embeds: [embed] });
}

module.exports = { data, execute };
