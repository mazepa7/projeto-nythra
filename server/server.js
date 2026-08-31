const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const db = require("./db");


const app = express();

app.use(cors());
app.use(express.json());

function autenticarToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            sucesso: false,
            mensagem: "Token não fornecido."
        });
    }

    const partes = authHeader.split(" ");

    if (partes.length !== 2 || partes[0] !== "Bearer") {
        return res.status(401).json({
            sucesso: false,
            mensagem: "Formato de token inválido."
        });
    }

    const token = partes[1];

    try {
        const dados = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.usuario = dados;

        next();

    } catch (erro) {
        return res.status(401).json({
            sucesso: false,
            mensagem: "Token inválido ou expirado."
        });
    }
}

const PORT = 3000;

app.get("/", (req, res) => {
    res.send("Nythra Server está funcionando!");
});

app.get("/api/test", async (req, res) => {
    try {

        const resultado = await db.query("SELECT NOW()");

        res.json({
            sucesso: true,
            mensagem: "PostgreSQL conectado com sucesso!",
            horarioBanco: resultado.rows[0].now
        });

    } catch (erro) {

        console.error("Erro ao conectar no PostgreSQL:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao conectar no PostgreSQL."
        });

    }
});

app.post("/api/users", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Verifica se todos os campos foram enviados
        if (!username || !email || !password) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Username, email e senha são obrigatórios."
            });
        }

        // Validação simples do username
        if (username.length < 3 || username.length > 30) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "O username deve ter entre 3 e 30 caracteres."
            });
        }

        // Validação simples da senha
        if (password.length < 8) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "A senha deve ter pelo menos 8 caracteres."
            });
        }

        // Criptografa a senha
        const passwordHash = await bcrypt.hash(password, 12);

        // Insere o usuário no PostgreSQL
        const resultado = await db.query(
            `
            INSERT INTO users (
                username,
                email,
                password_hash
            )
            VALUES ($1, $2, $3)
            RETURNING id, username, email, created_at, updated_at
            `,
            [
                username.trim(),
                email.trim().toLowerCase(),
                passwordHash
            ]
        );

        res.status(201).json({
            sucesso: true,
            mensagem: "Usuário criado com sucesso!",
            usuario: resultado.rows[0]
        });

    } catch (erro) {

        console.error("Erro ao criar usuário:", erro);

        // Código do PostgreSQL para valor UNIQUE duplicado
        if (erro.code === "23505") {
            return res.status(409).json({
                sucesso: false,
                mensagem: "Esse username ou email já está sendo utilizado."
            });
        }

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno do servidor."
        });
    }
}); 

app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Email e senha são obrigatórios."
            });
        }

        // Procura o usuário pelo email
        const resultado = await db.query(
            `
            SELECT id, username, email, password_hash
            FROM users
            WHERE email = $1
            `,
            [email.trim().toLowerCase()]
        );

        // Usuário não encontrado
        if (resultado.rows.length === 0) {
            return res.status(401).json({
                sucesso: false,
                mensagem: "Email ou senha incorretos."
            });
        }

        const usuario = resultado.rows[0];

        // Compara a senha enviada com o hash salvo
        const senhaCorreta = await bcrypt.compare(
            password,
            usuario.password_hash
        );

        if (!senhaCorreta) {
            return res.status(401).json({
                sucesso: false,
                mensagem: "Email ou senha incorretos."
            });
        }

        // Cria o token de autenticação
        const token = jwt.sign(
            {
                userId: usuario.id,
                username: usuario.username
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.json({
            sucesso: true,
            mensagem: "Login realizado com sucesso!",
            token,
            usuario: {
                id: usuario.id,
                username: usuario.username,
                email: usuario.email
            }
        });

    } catch (erro) {
        console.error("Erro ao fazer login:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno do servidor."
        });
    }
});

app.get("/api/me", autenticarToken, async (req, res) => {
    try {

        const resultado = await db.query(
            `
            SELECT
                id,
                username,
                email,
                created_at,
                updated_at
            FROM users
            WHERE id = $1
            `,
            [req.usuario.userId]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: "Usuário não encontrado."
            });
        }

        res.json({
            sucesso: true,
            usuario: resultado.rows[0]
        });

    } catch (erro) {

        console.error("Erro ao buscar usuário:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno do servidor."
        });
    }
});

app.post("/api/sheets", autenticarToken, async (req, res) => {
    try {
        const { system, name, sheetData } = req.body;

        if (!system || !name) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Sistema e nome do personagem são obrigatórios."
            });
        }

        if (name.trim().length < 2 || name.trim().length > 80) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "O nome deve ter entre 2 e 80 caracteres."
            });
        }

        const resultado = await db.query(
            `
            INSERT INTO character_sheets (
                user_id,
                system,
                name,
                sheet_data
            )
            VALUES ($1, $2, $3, $4)
            RETURNING
                id,
                user_id,
                system,
                name,
                sheet_data,
                created_at,
                updated_at
            `,
            [
                req.usuario.userId,
                system.trim().toLowerCase(),
                name.trim(),
                sheetData || {}
            ]
        );

        res.status(201).json({
            sucesso: true,
            mensagem: "Ficha criada com sucesso!",
            ficha: resultado.rows[0]
        });

    } catch (erro) {
        console.error("Erro ao criar ficha:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno do servidor."
        });
    }
});

app.get("/api/sheets", autenticarToken, async (req, res) => {
    try {
        const resultado = await db.query(
            `
            SELECT
                id,
                system,
                name,
                sheet_data,
                created_at,
                updated_at
            FROM character_sheets
            WHERE user_id = $1
            ORDER BY updated_at DESC
            `,
            [req.usuario.userId]
        );

        res.json({
            sucesso: true,
            quantidade: resultado.rows.length,
            fichas: resultado.rows
        });

    } catch (erro) {
        console.error("Erro ao buscar fichas:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno do servidor."
        });
    }
});

app.get("/api/sheets/:id", autenticarToken, async (req, res) => {
    try {
        const { id } = req.params;

        const resultado = await db.query(
            `
            SELECT
                id,
                system,
                name,
                sheet_data,
                created_at,
                updated_at
            FROM character_sheets
            WHERE id = $1
              AND user_id = $2
            `,
            [
                id,
                req.usuario.userId
            ]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: "Ficha não encontrada."
            });
        }

        res.json({
            sucesso: true,
            ficha: resultado.rows[0]
        });

    } catch (erro) {
        console.error("Erro ao buscar ficha:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno do servidor."
        });
    }
});

app.put("/api/sheets/:id", autenticarToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, sheetData } = req.body;

        if (!name || !sheetData) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Nome e dados da ficha são obrigatórios."
            });
        }

        if (name.trim().length < 2 || name.trim().length > 80) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "O nome deve ter entre 2 e 80 caracteres."
            });
        }

        const resultado = await db.query(
            `
            UPDATE character_sheets
            SET
                name = $1,
                sheet_data = $2,
                updated_at = NOW()
            WHERE id = $3
              AND user_id = $4
            RETURNING
                id,
                system,
                name,
                sheet_data,
                created_at,
                updated_at
            `,
            [
                name.trim(),
                sheetData,
                id,
                req.usuario.userId
            ]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: "Ficha não encontrada."
            });
        }

        res.json({
            sucesso: true,
            mensagem: "Ficha atualizada com sucesso!",
            ficha: resultado.rows[0]
        });

    } catch (erro) {
        console.error("Erro ao atualizar ficha:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno do servidor."
        });
    }
});

app.delete("/api/sheets/:id", autenticarToken, async (req, res) => {
    try {
        const { id } = req.params;

        const resultado = await db.query(
            `
            DELETE FROM character_sheets
            WHERE id = $1
              AND user_id = $2
            RETURNING id, name
            `,
            [
                id,
                req.usuario.userId
            ]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                sucesso: false,
                mensagem: "Ficha não encontrada."
            });
        }

        res.json({
            sucesso: true,
            mensagem: "Ficha excluída com sucesso!",
            ficha: resultado.rows[0]
        });

    } catch (erro) {
        console.error("Erro ao excluir ficha:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro interno do servidor."
        });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor Nythra rodando em http://localhost:${PORT}`);
});