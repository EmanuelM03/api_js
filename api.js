// ==========================
// 🌐 .env e dependências
// ==========================
require("dotenv").config();           // Carrega variáveis de ambiente
const express = require('express');   // Framework da API
const sql = require('mssql');         // Conexão com SQL Server

const app = express();
app.use(express.json());             // Permite receber JSON no body
const port = process.env.PORT || 3000;       // Porta do servidor, padrão 3000
const connStr = process.env.CONNECTION_STRING; // String de conexão
//Essa parte fornece o .env que criei com as infos do SQL Server. Cria constantes de api e sqlserver, define porta, OI CHAT

// ==========================
// 🛠️ Conexão com o Banco - Criar pool global
// ==========================
let pool;

async function getConnection() {
    if (pool) return pool;
    try {
        pool = await sql.connect(connStr);
        console.log("✅ Conectado ao SQL Server!");
        return pool;
    } catch (err) {
        console.error("❌ Erro na conexão:", err);
        throw err;
    }
}

// ==========================
// 🚀 API – Rotas HTTP
// ==========================

// Rota GET /usuarios – lista todos os usuários
app.get('/usuarios', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query('SELECT * FROM USUARIO');
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar usuarios' });
    }
});

// Rota POST /register – chama a procedure sp_RegistrarUsuarioSimples
app.post('/register', async (req, res) => {
    const {
        NOME,
        LOGIN,
        SENHA,
        SETOR,
        NIVEL_ACESSO,
        COD_FILIAL
    } = req.body;

    try {
        const pool = await sql.connect(connStr);
        const request = pool.request();

        request.input('NOME', sql.VarChar(255), NOME);
        request.input('LOGIN', sql.VarChar(50), LOGIN);
        request.input('SENHA', sql.VarChar(255), SENHA);
        request.input('SETOR', sql.VarChar(50), SETOR);
        request.input('NIVEL_ACESSO', sql.VarChar(50), NIVEL_ACESSO);
        request.input('COD_FILIAL', sql.Int, COD_FILIAL);

        await request.execute('sp_RegistrarUsuarioSimples');

        res.status(201).json({ message: 'Usuário registrado com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao registrar o usuário' });
    }
});

// Rota POST /login – chama a procedure sp_Login com login e senha
app.post('/login', async (req, res) => {
    const { login, senha } = req.body;

    if (!login || !senha) {
        return res.status(400).json({ message: "Login e senha são obrigatórios." });
    }

    try {
        const pool = await getConnection();
        const request = pool.request();

        request.input('LOGIN', sql.VarChar(50), login);
        request.input('SENHA', sql.VarChar(255), senha);

        const result = await request.execute('sp_Login');

        if (result.recordset.length === 0) {
            // Se não encontrar usuário
            return res.status(401).json({ message: 'Login ou senha inválidos' });
        }

        res.json(result.recordset[0]);
    } catch (error) {
        // Captura erro do RAISERROR do SQL Server na procedure
        if (error.number === 50000) {
            return res.status(401).json({ message: error.message });
        }

        console.error("Erro no login:", error);
        res.status(500).json({ message: 'Erro interno no servidor' });
    }
});

// Rota padrão /
app.get('/', (req, res) => res.json({ message: 'Funcionando!' }));

// ==========================
// ▶️ Inicia o servidor
// ==========================
app.listen(port, () => {
    console.log(`🚀 Servidor rodando na porta ${port}`);
});
