require('dotenv').config();

exports.config = {
    user: process.env.USER_NAME,
    password: process.env.PASSWORD,
    server: process.env.SERVER,
    port: parseInt(process.env.PORT),
    database: process.env.DATABASE,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        trustServerCertificate: true
    }
};