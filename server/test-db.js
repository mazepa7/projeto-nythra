const pool = require("./db");

async function testConnection() {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("✅ Banco conectado com sucesso!");
    console.log("Horário do PostgreSQL:", result.rows[0].now);
  } catch (error) {
    console.error("❌ Erro ao conectar no banco:");
    console.error(error.message);
  } finally {
    await pool.end();
  }
}

testConnection();