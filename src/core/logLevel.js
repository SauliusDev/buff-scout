const debugMode = false; // Set to true for debugging, false for production

export function getLogLevel(success) {
    if (success === true) {
        return 'log';
    } else if (success === false) {
        return debugMode ? 'warn' : 'log';
    } else {
        return debugMode ? 'error' : 'log';
    }
}