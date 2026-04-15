const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'localhost',
  port: 3307,
  user: 'root',
  password: 'arun2005',
  database: 'ecommerce_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool.promise();
