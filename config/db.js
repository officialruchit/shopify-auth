const { Pool } = require("pg");

const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "auth",
    password: "12345",
    port: 5432,
  });

module.exports = pool;

/*const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'localhost',       
  user: 'root',             
  password: 'password', 
  database: 'auth', 
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
*/