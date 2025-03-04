const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,  
  }
});


pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client:", err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => {
    console.log("Executing query:", text, "with params:", params || []);
    return pool.query(text, params);
  },
};
