const mysql = require('mysql2/promise');

const credentials = [
    { host: 'localhost', user: 'root', password: '' },
    { host: 'localhost', user: 'root', password: 'password' },
    { host: 'localhost', user: 'arun', password: 'arun2005' }
];

async function testConnections() {
    for (const cred of credentials) {
        console.log(`Testing: ${cred.user}:${cred.password}@${cred.host}...`);
        try {
            const connection = await mysql.createConnection(cred);
            console.log(`SUCCESS: Connected as ${cred.user}`);
            await connection.end();
            return;
        } catch (err) {
            console.log(`FAILED: ${err.message}`);
        }
    }
}

testConnections();
