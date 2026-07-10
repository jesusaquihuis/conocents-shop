const sql = require("mssql");

// La cadena de conexión vive en la variable de entorno SQL_CONNECTION_STRING
// (la configuras en Azure Portal -> Static Web App -> Configuration -> Application settings)
// NUNCA la escribas aquí en el código.

let pool;

async function getPool() {
  if (pool) return pool;
  const connString = process.env.SQL_CONNECTION_STRING;
  if (!connString) {
    throw new Error("Falta la variable de entorno SQL_CONNECTION_STRING");
  }
  pool = await sql.connect(connString);
  return pool;
}

module.exports = { getPool, sql };
