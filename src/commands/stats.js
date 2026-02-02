import pkg from 'discord.js';
const { SlashCommandBuilder } = pkg;
import { getGuildStats } from '../services/recipeStorage.js';
import { formatStatsEmbed } from '../utils/formatters.js';

export const data = new SlashCommandBuilder()
    .setName('recipestats')
    .setDescription('View recipe collection statistics');

export async function execute(interaction) {
    const stats = getGuildStats(interaction.guildId);
    const embed = formatStatsEmbed(stats);

    return interaction.reply({ embeds: [embed] });
}
