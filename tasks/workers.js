const { parentPort } = require('worker_threads');
const Registration = require('./Tasks.js');

// Handle messages from the main thread
parentPort.on('message', async (message) => {
    if (message.action === 'start') {
        const { Choice, Term_Season, Term_Year, username, password, CRNs } = message;
        const registration = new Registration(CRNs, username, password);
        await registration.start(Choice, Term_Season, Term_Year);
    } else if (message.action == `stop`) {
        process.exit();
    }
});