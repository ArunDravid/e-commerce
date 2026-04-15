const mysql = require('mysql2/promise');

async function setupUser() {
    let connection;
    try {
        console.log('Connecting to MySQL as root (no password)...');
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: ''
        });

        console.log('Creating user arun if not exists...');
        await connection.query("CREATE USER IF NOT EXISTS 'arun'@'localhost' IDENTIFIED BY 'arun2005'");
        
        console.log('Granting privileges...');
        await connection.query("GRANT ALL PRIVILEGES ON *.* TO 'arun'@'localhost' WITH GRANT OPTION");
        
        console.log('Flushing privileges...');
        await connection.query("FLUSH PRIVILEGES");

        console.log('MySQL user arun setup successfully.');
    } catch (error) {
        console.error('Error setting up MySQL user:', error.message);
        process.exit(1);
    } finally {
        if (connection) await connection.end();
    }
}

setupUser();
