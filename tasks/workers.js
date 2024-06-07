const { parentPort } = require('worker_threads');
const Registration = require('./Tasks.js');

// Handle messages from the main thread
parentPort.on('message', async (message) => {
    if (message.action === 'start') {
        const { Choice, Term_Season, username, password, CRNs } = message;
        const registration = new Registration(CRNs, username, password);
        console.log(username, password, CRNs);
        await registration.start(Choice, Term_Season);
    }
});