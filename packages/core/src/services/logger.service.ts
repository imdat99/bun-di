import { ILogger } from '../common/interfaces/ILogger';

export class Logger implements ILogger {
    private static lastTimestamp?: number;
    private static instance?: Logger;
    protected context?: string;

    constructor(context?: string) {
        this.context = context;
    }
    info(message: string, ...meta: any[]): void {
        const metaStr = meta.length > 0 ? ` ${JSON.stringify(meta)}` : '';
        this.log(message + metaStr, 'info');
    }
        
    public static log(message: any, context = '') {
        this.printMessage('log', message, context);
    }

    public static error(message: any, trace = '', context = '') {
        this.printMessage('error', message, context, trace);
    }

    public static warn(message: any, context = '') {
        this.printMessage('warn', message, context);
    }

    public static debug(message: any, context = '') {
        this.printMessage('debug', message, context);
    }

    public static verbose(message: any, context = '') {
        this.printMessage('verbose', message, context);
    }

    public log(message: any, context?: string) {
        Logger.log(message, context || this.context);
    }

    public error(message: any, trace = '', context?: string) {
        Logger.error(message, trace, context || this.context);
    }

    public warn(message: any, context?: string) {
        Logger.warn(message, context || this.context);
    }

    public debug(message: any, context?: string) {
        Logger.debug(message, context || this.context);
    }

    public verbose(message: any, context?: string) {
        Logger.verbose(message, context || this.context);
    }

    private static printMessage(level: 'log' | 'error' | 'warn' | 'debug' | 'verbose', message: any, context = '', trace = '') {
        const color = this.getColorByLevel(level);
        const date = new Date();
        const timestamp = date.toLocaleString();
        
        const pid = process.pid;
        const contextMessage = context ? `[${context}] ` : '';
        
        // Handle different types of messages
        let output: string;
        if (typeof message === 'symbol') {
            output = message.toString();
        } else if (message instanceof Object) {
            output = JSON.stringify(message, null, 2);
        } else {
            output = String(message);
        }

        const currentTimestamp = Date.now();
        const timeDiff = Logger.updateAndGetTimestampDiff(currentTimestamp);

        const C = {
            reset: "\x1b[0m",
            red: "\x1b[31m",
            green: "\x1b[32m",
            yellow: "\x1b[33m",
            blue: "\x1b[34m",
            magenta: "\x1b[35m",
            cyan: "\x1b[36m",
            gray: "\x1b[90m",
        };

        // Format: [App] PID - Date Level [Context] Message +ms
        // Example: [Hono] 1234 - 1/7/2026, 4:00 PM LOG [Factory] Initialized +2ms

        process.stdout.write(
            `${C.green}[Hono] ${pid}${C.reset} - ${timestamp}`+
            `${color}${level.toUpperCase().padStart(7)}${C.reset} ${C.yellow}${contextMessage}${C.reset}${C.green}${output}${C.reset} ` +
            `${C.yellow}${timeDiff}${C.reset}\n`
        );

        if (trace) {
            process.stdout.write(`${C.red}${trace}${C.reset}\n`);
        }
    }

    private static updateAndGetTimestampDiff(timestamp: number): string {
        let result = '';
        if (this.lastTimestamp) {
            result = `+${timestamp - this.lastTimestamp}ms`;
        }
        this.lastTimestamp = timestamp;
        return result;
    }

    private static getColorByLevel(level: string) {
        const C = {
            red: "\x1b[31m",
            green: "\x1b[32m",
            yellow: "\x1b[33m",
            blue: "\x1b[34m",
            magenta: "\x1b[35m",
            cyan: "\x1b[36m",
        };
        switch (level) {
            case 'debug': return C.magenta;
            case 'warn': return C.yellow;
            case 'error': return C.red;
            case 'verbose': return C.cyan;
            default: return C.green;
        }
    }
}
