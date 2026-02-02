const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'guild-config.json');

if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
}

function loadConfig() {
    if (!existsSync(CONFIG_FILE)) {
        return {};
    }
    try {
        const data = readFileSync(CONFIG_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

function saveConfig(data) {
    writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2));
}

function getGuildConfig(guildId) {
    const config = loadConfig();
    return config[guildId] || { channels: [] };
}

function setRecipeChannel(guildId, channelId) {
    const config = loadConfig();
    if (!config[guildId]) {
        config[guildId] = { channels: [] };
    }
    if (!config[guildId].channels.includes(channelId)) {
        config[guildId].channels.push(channelId);
    }
    saveConfig(config);
    return config[guildId];
}

function removeRecipeChannel(guildId, channelId) {
    const config = loadConfig();
    if (!config[guildId]) return { channels: [] };
    config[guildId].channels = config[guildId].channels.filter(id => id !== channelId);
    saveConfig(config);
    return config[guildId];
}

function clearRecipeChannels(guildId) {
    const config = loadConfig();
    if (config[guildId]) {
        config[guildId].channels = [];
        saveConfig(config);
    }
    return { channels: [] };
}

function isAllowedChannel(guildId, channelId) {
    const guildConfig = getGuildConfig(guildId);
    // If no channels configured, allow all
    if (guildConfig.channels.length === 0) return true;
    return guildConfig.channels.includes(channelId);
}

module.exports = {
    getGuildConfig,
    setRecipeChannel,
    removeRecipeChannel,
    clearRecipeChannels,
    isAllowedChannel
};
