const mysql = require('mysql2/promise');

async function grants() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: ''
        });
        const [rows] = await connection.query("SHOW GRANTS FOR 'arun'@'localhost'");
        console.log('Grants:', rows.map(r => Object.values(r)[0]));
    } catch (e) {
        console.error('Error fetching grants:', e.message);
    } finally {
        if (connection) await connection.end();
    }
}

grants();
