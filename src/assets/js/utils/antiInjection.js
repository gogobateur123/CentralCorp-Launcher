/**
 * Anti-Injection System
 * Detects known injection tools, closes launcher & client, and sends a Discord webhook.
 */

const { exec } = require('child_process');
const { app, ipcRenderer } = require('electron'); // app si utilisé depuis main, ipcRenderer depuis renderer
const fetch = require('node-fetch');
const os = require('os');
const path = require('path');
const pkg = require('../../package.json');

class AntiInjection {
    constructor(options = {}) {
        this.webhookUrl = options.webhook || null;
        this.knownProcesses = [
            'ProcessHax.exe',
            'Xenos.exe',
            'CheatEngine.exe',
            'Injector.exe',
            'ExtremeInjector.exe'
        ];
    }

    async init() {
        try {
            const detected = await this.checkProcesses();
            if (detected.length > 0) {
                console.warn('Injection software detected:', detected);
                await this.sendWebhook(detected);
                this.terminateLauncher();
            } else {
                console.log('No injection software detected.');
            }
        } catch (err) {
            console.error('AntiInjection error:', err);
        }
    }

    checkProcesses() {
        return new Promise((resolve, reject) => {
            if (os.platform() !== 'win32') return resolve([]);

            // Commande pour lister tous les processus sous Windows
            exec('tasklist', (err, stdout, stderr) => {
                if (err) return reject(err);
                const runningProcesses = stdout.toLowerCase();
                const detected = this.knownProcesses.filter(proc =>
                    runningProcesses.includes(proc.toLowerCase())
                );
                resolve(detected);
            });
        });
    }

    async sendWebhook(detectedProcesses) {
        if (!this.webhookUrl) return;

        const playerName = this.getPlayerName();

        const payload = {
            username: 'Anti-Injection Bot',
            content: `⚠️ Player **${playerName}** tried to use: ${detectedProcesses.join(', ')}`,
        };

        try {
            await fetch(this.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            console.log('Webhook sent for detected injection.');
        } catch (err) {
            console.error('Failed to send webhook:', err);
        }
    }

    getPlayerName() {
        try {
            const selectedAccount = JSON.parse(localStorage.getItem('selectedAccount'));
            return selectedAccount?.name || 'Unknown';
        } catch {
            return 'Unknown';
        }
    }

    terminateLauncher() {
        console.log('Terminating launcher and client...');
        // Si nous sommes dans le renderer
        if (ipcRenderer) ipcRenderer.send('main-window-close');

        // Si app main accessible
        if (app) app.quit();

        // Fermer le processus par sécurité
        process.exit(0);
    }
}

module.exports = new AntiInjection();