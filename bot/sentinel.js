const { Client, GatewayIntentBits } = require('discord.js');
const mysql = require('mysql2/promise');
const discordRPC = require('discord-rpc');

class SentinelBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.GuildVoiceStates
            ]
        });

        this.dbPool = mysql.createPool({
            host: process.env.MYSQL_HOST || 'localhost',
            user: process.env.MYSQL_USER || 'gm',
            password: process.env.MYSQL_PASSWORD || 'gabriel2g',
            database: process.env.MYSQL_DATABASE || 'Sentinel',
            connectionLimit: 10
        });

        this.rpcClient = null;
        this.voiceConnections = new Map();
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.client.on('ready', () => {
            console.log(`🤖 ${this.client.user.tag} online!`);
            this.initializeRPC();
            this.startVoiceSessions();
        });

        this.client.on('messageCreate', async (message) => {
            if (message.author.id !== this.client.user.id) return;

            if (message.content.startsWith('$admin ')) {
                await this.handleAdminCommand(message);
            }
        });
    }

    async handleAdminCommand(message) {
        const args = message.content.slice(7).split(' ');
        const command = args[0];
        const targetUser = args[1] || message.author.id;

        try {
            switch(command) {
                case 'cleardms':
                    await this.clearDMs(targetUser);
                    message.reply('✅ DMs limpas');
                    break;
                case 'leaveguilds':
                    await this.leaveGuilds(targetUser);
                    message.reply('✅ Servidores abandonados');
                    break;
                case 'joincall':
                    const guildId = args[2];
                    const channelId = args[3];
                    await this.joinVoice24_7(guildId, channelId);
                    message.reply('✅ Entrou em call 24/7');
                    break;
                case 'updatepresence':
                    this.updateRPC();
                    message.reply('🔄 Rich Presence atualizado');
                    break;
            }
        } catch (error) {
            message.reply('❌ Erro ao executar comando');
        }
    }

    async clearDMs(userId) {
        const user = await this.client.users.fetch(userId);
        const dmChannel = await user.createDM();
        let messages = await dmChannel.messages.fetch({ limit: 100 });

        while (messages.size > 0) {
            await dmChannel.bulkDelete(messages).catch(() => {});
            messages = await dmChannel.messages.fetch({ limit: 100 });
        }
    }

    async leaveGuilds(userId) {
        const userGuilds = this.client.guilds.cache.filter(guild =>
            guild.members.cache.has(userId)
        );

        for (const guild of userGuilds.values()) {
            try {
                await guild.leave();
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`Erro ao sair de ${guild.name}:`, error);
            }
        }
    }

    async joinVoice24_7(guildId, channelId) {
        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) return false;

        const voiceChannel = guild.channels.cache.get(channelId);
        if (!voiceChannel || !voiceChannel.isVoiceBased()) return false;

        try {
            const connection = await voiceChannel.join();
            this.voiceConnections.set(guildId, connection);

            // Manter conexão ativa
            setInterval(() => {
                if (!connection) this.joinVoice24_7(guildId, channelId);
            }, 30000);

            // Salvar no banco
            const conn = await this.dbPool.getConnection();
            await conn.execute(
                'INSERT INTO voice_sessions (discord_id, guild_id, channel_id) VALUES (?, ?, ?)',
                [this.client.user.id, guildId, channelId]
            );
            conn.release();

            return true;
        } catch (error) {
            console.error('Erro ao entrar no canal:', error);
            return false;
        }
    }

    initializeRPC() {
        const clientId = '123456789012345678';
        discordRPC.register(clientId);
        this.rpcClient = new discordRPC.Client({ transport: 'ipc' });

        this.rpcClient.on('ready', () => {
            this.updateRPC();
        });

        this.rpcClient.login({ clientId }).catch(console.error);
    }

    updateRPC() {
        if (!this.rpcClient) return;

        this.rpcClient.setActivity({
            state: "24/7 Online",
            details: "Sentinel - Selfbot",
            startTimestamp: new Date(),
            largeImageKey: "sentinel",
            largeImageText: "Sentinel System",
            smallImageKey: "shield",
            smallImageText: "Protected",
            instance: false
        });
    }

    async startVoiceSessions() {
        try {
            const conn = await this.dbPool.getConnection();
            const [sessions] = await conn.execute(
                'SELECT * FROM voice_sessions WHERE discord_id = ? AND is_active = true',
                [this.client.user.id]
            );
            conn.release();

            for (const session of sessions) {
                await this.joinVoice24_7(session.guild_id, session.channel_id);
            }
        } catch (error) {
            console.error('Erro ao restaurar sessions:', error);
        }
    }

    async start() {
        try {
            // Buscar token do banco
            const conn = await this.dbPool.getConnection();
            const [tokens] = await conn.execute(
                'SELECT token_value FROM active_tokens WHERE discord_id = ? AND is_active = true LIMIT 1',
                [this.client.user?.id || 'default']
            );
            conn.release();

            if (tokens.length > 0) {
                await this.client.login(tokens[0].token_value);
            } else {
                console.error('❌ Nenhum token ativo encontrado');
            }
        } catch (error) {
            console.error('❌ Erro ao iniciar bot:', error);
        }
    }
}

// Inicializar múltiplas instâncias
const bots = [];
for (let i = 0; i < 3; i++) {
    setTimeout(() => {
        const bot = new SentinelBot();
        bot.start();
        bots.push(bot);
    }, i * 10000);
}