const express = require("express");

const cors = require("cors");

const bcrypt = require("bcrypt");

const jwt = require("jsonwebtoken");

const db = require("./db");

const { randomInt, createHmac, timingSafeEqual } = require('node:crypto');

const { rateLimit } = require('express-rate-limit');

const sendVerification = require('./mail');

const emailValid = email => typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const uuidValid = id => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

const userIdValid = id => uuidValid(id) || (typeof id === 'string' && /^[1-9][0-9]{0,18}$/.test(id));

// O HMAC protege os códigos curtos mesmo se apenas o banco for exposto.
// O ID vincula o hash à conta: códigos iguais em contas distintas não se confundem.
function hashCode(userId, code) {
    if (!process.env.JWT_SECRET) throw new Error('Configure JWT_SECRET antes de enviar códigos.');
    return createHmac('sha256', process.env.JWT_SECRET)
        .update(`nythra:email-code:${userId}:${code}`)
        .digest('hex');
}

async function issueVerification(user) {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        // Envio e confirmação bloqueiam primeiro a conta, na mesma ordem.
        const account = await client.query('SELECT id, email, email_verified_at FROM users WHERE id = $1 FOR UPDATE', [user.id]);
        if (!account.rows[0]) throw new Error('Conta não encontrada.');
        if (account.rows[0].email_verified_at) {
            await client.query('COMMIT');
            return;
        }
        const existing = await client.query(
            `SELECT token_hash, sent_at > NOW() - INTERVAL '60 seconds' AS cooldown
             FROM email_verifications WHERE user_id = $1`, [user.id]);
        if (existing.rows[0]?.cooldown) {
            const error = new Error('Aguarde um minuto para reenviar.');
            error.status = 429;
            throw error;
        }
        let code;
        let codeHash;
        // Não repete o código anterior no reenvio.
        do {
            code = randomInt(0, 1000000).toString().padStart(6, '0');
            codeHash = hashCode(user.id, code);
        } while (codeHash === existing.rows[0]?.token_hash);
        await client.query(`
            INSERT INTO email_verifications
                (user_id, token_hash, expires_at, sent_at, attempts, verification_type)
            VALUES ($1, $2, NOW() + INTERVAL '10 minutes', NOW(), 0, 'code')
            ON CONFLICT (user_id) DO UPDATE SET
                token_hash = EXCLUDED.token_hash,
                expires_at = EXCLUDED.expires_at,
                sent_at = EXCLUDED.sent_at,
                attempts = 0,
                verification_type = 'code'
        `, [user.id, codeHash]);
        await sendVerification(account.rows[0].email, code);
        await client.query('COMMIT');
    } catch (error) {
        // Em falha de SMTP, mantém o código anterior e permite nova tentativa.
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

const app = express();

app.use(cors());

app.use(express.json({ limit: '12mb' }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30,

    message: { sucesso: false, mensagem: 'Muitas tentativas. Aguarde 15 minutos.' } });

app.use(['/api/users', '/api/login', '/api/email'], authLimiter);

async function autenticarToken(req, res, next) {

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

        const result = await db.query('SELECT email_verified_at FROM users WHERE id = $1', [dados.userId]);

        if (!result.rows[0]?.email_verified_at) return res.status(403).json({ sucesso: false, mensagem: 'Confirme seu e-mail antes de continuar.' });

        req.usuario = dados;

        next();

    } catch (erro) {

        return res.status(401).json({

            sucesso: false,

            mensagem: "Token inválido ou expirado."

        });

    }

}

const PORT = process.env.PORT || 3000;

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

        if (typeof username !== "string" || !emailValid(email?.trim?.()) || typeof password !== "string") {

            return res.status(400).json({

                sucesso: false,

                mensagem: "Username, email e senha são obrigatórios."

            });

        }

        // Validação simples do username

        if (username.trim().length < 3 || username.trim().length > 30) {

            return res.status(400).json({

                sucesso: false,

                mensagem: "O username deve ter entre 3 e 30 caracteres."

            });

        }

        // Validação simples da senha

        if (password.length < 8 || Buffer.byteLength(password) > 72) {

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

        let emailSent = true;

        try { await issueVerification(resultado.rows[0]); }

        catch (error) { emailSent = false; console.error('Falha no envio de confirmação:', error.message); }

        res.status(201).json({ sucesso: true, emailSent,

            mensagem: emailSent ? 'Conta criada! Digite o código enviado ao seu e-mail para confirmar o cadastro.' : 'Conta criada, mas o e-mail não pôde ser enviado. Solicite um reenvio.',

            usuario: resultado.rows[0] });

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

        if (!emailValid(email?.trim?.()) || typeof password !== "string" || !password) {

            return res.status(400).json({

                sucesso: false,

                mensagem: "Email e senha são obrigatórios."

            });

        }

        // Procura o usuário pelo email

        const resultado = await db.query(

            `

            SELECT id, username, email, password_hash, email_verified_at

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

        if (!usuario.email_verified_at) return res.status(403).json({ sucesso: false,

            mensagem: 'Confirme seu e-mail antes de entrar. Use Reenviar confirmação.', code: 'EMAIL_NOT_VERIFIED' });

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

app.post('/api/email/verify', async (req, res) => {
    const { email, code } = req.body || {};
    if (!emailValid(typeof email === 'string' ? email.trim() : '') ||
        typeof code !== 'string' || !/^[0-9]{6}$/.test(code)) {
        return res.status(400).json({ sucesso: false,
            mensagem: 'Informe seu e-mail e o código de 6 dígitos.' });
    }
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const account = await client.query(
            'SELECT id, email_verified_at FROM users WHERE email = $1 FOR UPDATE',
            [email.trim().toLowerCase()]);
        const user = account.rows[0];
        if (!user || user.email_verified_at) {
            await client.query('ROLLBACK');
            return res.status(400).json({ sucesso: false, mensagem: 'Código inválido ou indisponível. Solicite um novo código se necessário.' });
        }
        const result = await client.query(`
            SELECT token_hash, attempts, expires_at <= NOW() AS expired
            FROM email_verifications
            WHERE user_id = $1 AND verification_type = 'code'
            FOR UPDATE
        `, [user.id]);
        const verification = result.rows[0];
        if (!verification || verification.expired) {
            await client.query('ROLLBACK');
            return res.status(400).json({ sucesso: false, mensagem: 'Código inválido ou expirado. Solicite um novo código.' });
        }
        if (verification.attempts >= 5) {
            await client.query('ROLLBACK');
            return res.status(429).json({ sucesso: false, mensagem: 'Limite de tentativas atingido. Solicite um novo código.' });
        }
        const expected = Buffer.from(verification.token_hash, 'hex');
        const received = Buffer.from(hashCode(user.id, code), 'hex');
        const matches = expected.length === received.length && timingSafeEqual(expected, received);
        if (!matches) {
            await client.query('UPDATE email_verifications SET attempts = attempts + 1 WHERE user_id = $1', [user.id]);
            // COMMIT é necessário: ROLLBACK apagaria a tentativa incorreta.
            await client.query('COMMIT');
            const remaining = 4 - verification.attempts;
            return res.status(remaining > 0 ? 400 : 429).json({ sucesso: false,
                mensagem: remaining > 0 ? `Código incorreto. Restam ${remaining} tentativas.`
                    : 'Limite de tentativas atingido. Solicite um novo código.' });
        }
        await client.query('UPDATE users SET email_verified_at = NOW(), updated_at = NOW() WHERE id = $1', [user.id]);
        await client.query('DELETE FROM email_verifications WHERE user_id = $1', [user.id]);
        await client.query('COMMIT');
        res.json({ sucesso: true, mensagem: 'E-mail confirmado! Você já pode entrar com seu e-mail e senha.' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Falha na confirmação de e-mail:', error.message);
        res.status(500).json({ sucesso: false, mensagem: 'Não foi possível confirmar o e-mail.' });
    } finally {
        client.release();
    }
});

app.post('/api/email/resend', async (req, res) => {

    const { email, password } = req.body;

    if (!emailValid(email?.trim?.()) || typeof password !== 'string') return res.status(400).json({ mensagem: 'Informe e-mail e senha.' });

    try {

        const result = await db.query('SELECT id, email, password_hash, email_verified_at FROM users WHERE email = $1', [email.trim().toLowerCase()]);

        const user = result.rows[0];

        if (!user || !await bcrypt.compare(password, user.password_hash)) return res.status(401).json({ mensagem: 'Email ou senha incorretos.' });

        if (!user.email_verified_at) await issueVerification(user);

        res.json({ sucesso: true, mensagem: 'Se a conta estiver pendente, enviamos um novo código. Confira também o spam.' });

    } catch (error) { res.status(error.status || 503).json({ mensagem: error.status ? error.message : 'Não foi possível enviar o e-mail. Tente novamente mais tarde.' }); }

});

// Somente o mestre recebe os dados privados do escudo. Jogadores veem o vínculo na lista.

app.use('/api/campaigns', autenticarToken);

app.param('campaignId', (req, res, next, id) => {

    if (!uuidValid(id)) return res.status(400).json({ mensagem: 'ID da campanha inválido.' });

    next();

});

function campaignView(row) {

    return { ...row.data, id: row.id, ownerId: row.owner_id, name: row.name,

        description: row.description, createdAt: row.created_at, updatedAt: row.updated_at };

}

async function ownerOnly(req, res, next) {

    try {

        const result = await db.query('SELECT * FROM campaigns WHERE id = $1 AND owner_id = $2', [req.params.campaignId, req.usuario.userId]);

        if (!result.rows[0]) return res.status(404).json({ mensagem: 'Campanha não encontrada ou sem permissão de mestre.' });

        req.campaign = result.rows[0]; next();

    } catch (error) { next(error); }

}

function campaignData(body) {

    const result = {};

    for (const key of ['quickNotes', 'currentSession', 'maps', 'notes', 'activeCombat']) {

        if (Object.hasOwn(body, key)) result[key] = body[key];

    }

    return result;

}

app.get('/api/campaigns', async (req, res) => {

    const result = await db.query(`SELECT DISTINCT c.id, c.owner_id, c.name, c.description, c.created_at

        FROM campaigns c LEFT JOIN campaign_players p ON p.campaign_id = c.id

        WHERE c.owner_id = $1 OR p.user_id = $1 ORDER BY c.created_at DESC`, [req.usuario.userId]);

    res.json({ campanhas: result.rows.map(row => ({ ...campaignView(row), role: String(row.owner_id) === String(req.usuario.userId) ? 'master' : 'player' })) });

});

app.post('/api/campaigns', async (req, res) => {

    const { name, description = '' } = req.body;

    if (typeof name !== 'string' || !name.trim() || name.trim().length > 120 || typeof description !== 'string' || description.length > 5000)

        return res.status(400).json({ mensagem: 'Informe nome (até 120 caracteres) e descrição (até 5000).' });

    const result = await db.query(`INSERT INTO campaigns(owner_id, name, description, data) VALUES ($1,$2,$3,$4) RETURNING *`,

        [req.usuario.userId, name.trim(), description.trim(), campaignData(req.body)]);

    res.status(201).json({ campanha: campaignView(result.rows[0]) });

});

app.get('/api/campaigns/:campaignId', ownerOnly, async (req, res) => {

    const players = await db.query(`SELECT u.id, u.username FROM campaign_players p JOIN users u ON u.id = p.user_id WHERE p.campaign_id = $1 ORDER BY p.created_at`, [req.params.campaignId]);

    res.json({ campanha: { ...campaignView(req.campaign), players: players.rows.map(u => ({ id: u.id, playerName: u.username, characterName: u.username })) } });

});

app.put('/api/campaigns/:campaignId', ownerOnly, async (req, res) => {

    const result = await db.query(`UPDATE campaigns SET data = $1, updated_at = NOW() WHERE id = $2 RETURNING *`, [campaignData(req.body), req.params.campaignId]);

    res.json({ campanha: campaignView(result.rows[0]) });

});

app.post('/api/campaigns/:campaignId/players', ownerOnly, async (req, res) => {

    const { userId } = req.body;

    if (!userIdValid(userId)) return res.status(400).json({ mensagem: 'Informe o ID completo do jogador.' });

    if (userId.toLowerCase() === String(req.usuario.userId).toLowerCase()) return res.status(400).json({ mensagem: 'Você já é o mestre desta campanha.' });

    const user = await db.query('SELECT id, username FROM users WHERE id = $1 AND email_verified_at IS NOT NULL', [userId]);

    if (!user.rows[0]) return res.status(404).json({ mensagem: 'Jogador não encontrado ou e-mail ainda não confirmado.' });

    const result = await db.query(`INSERT INTO campaign_players(campaign_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING user_id`, [req.params.campaignId, userId]);

    if (!result.rows[0]) return res.status(409).json({ mensagem: 'Jogador já vinculado à campanha.' });

    res.status(201).json({ jogador: { id: user.rows[0].id, playerName: user.rows[0].username, characterName: user.rows[0].username } });

});

app.delete('/api/campaigns/:campaignId/players/:userId', ownerOnly, async (req, res) => {

    if (!userIdValid(req.params.userId)) return res.status(400).json({ mensagem: 'ID do jogador inválido.' });

    const result = await db.query('DELETE FROM campaign_players WHERE campaign_id = $1 AND user_id = $2 RETURNING user_id', [req.params.campaignId, req.params.userId]);

    if (!result.rows[0]) return res.status(404).json({ mensagem: 'Vínculo não encontrado.' });

    res.json({ sucesso: true });

});

app.use((error, req, res, next) => {

    console.error('Falha na requisição:', error.message);

    res.status(error.status || 500).json({ sucesso: false, mensagem: 'Não foi possível concluir a solicitação.' });

});

if (require.main === module) {

    if (!process.env.JWT_SECRET) throw new Error('Configure JWT_SECRET antes de iniciar.');

    app.listen(PORT, () => console.log(`Servidor Nythra rodando em http://localhost:${PORT}`));

}

module.exports = app;