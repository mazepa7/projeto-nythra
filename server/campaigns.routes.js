const express = require("express");

module.exports = function criarRotasCampanhas(db, autenticarToken) {
    const router = express.Router();

    router.use(autenticarToken);

    function validarId(req, res, next) {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                mensagem: "ID de campanha inválido."
            });
        }

        next();
    }

    function validarDados(req, res, next) {
        const { name, description = "", campaignData } = req.body;

        if (
            typeof name !== "string" ||
            name.trim().length < 2 ||
            name.trim().length > 80
        ) {
            return res.status(400).json({
                mensagem: "O nome deve ter entre 2 e 80 caracteres."
            });
        }

        if (
            typeof description !== "string" ||
            description.length > 1000
        ) {
            return res.status(400).json({
                mensagem: "A descrição deve ter até 1000 caracteres."
            });
        }

        if (
            campaignData !== undefined &&
            (
                campaignData === null ||
                typeof campaignData !== "object" ||
                Array.isArray(campaignData)
            )
        ) {
            return res.status(400).json({
                mensagem: "Os dados da campanha são inválidos."
            });
        }

        req.dadosCampanha = {
            name: name.trim(),
            description: description.trim(),
            campaignData: campaignData ?? {
                quickNotes: "",
                players: [],
                maps: [],
                notes: [],
                activeCombat: null
            }
        };

        next();
    }

    // Lista somente as campanhas do usuário autenticado.
    router.get("/", async (req, res, next) => {
        try {
            const resultado = await db.query(
                `SELECT id, name, description, created_at, updated_at
                 FROM campaigns
                 WHERE owner_id = $1
                 ORDER BY updated_at DESC`,
                [req.usuario.userId]
            );

            res.json({
                sucesso: true,
                campanhas: resultado.rows
            });
        } catch (erro) {
            next(erro);
        }
    });

    router.post("/", validarDados, async (req, res, next) => {
        try {
            const { name, description, campaignData } =
                req.dadosCampanha;

            const resultado = await db.query(
                `INSERT INTO campaigns (
                    owner_id, name, description, campaign_data
                 )
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [
                    req.usuario.userId,
                    name,
                    description,
                    campaignData
                ]
            );

            res.status(201).json({
                sucesso: true,
                campanha: resultado.rows[0]
            });
        } catch (erro) {
            next(erro);
        }
    });

    router.get("/:id", validarId, async (req, res, next) => {
        try {
            const resultado = await db.query(
                `SELECT *
                 FROM campaigns
                 WHERE id = $1 AND owner_id = $2`,
                [req.params.id, req.usuario.userId]
            );

            if (!resultado.rows.length) {
                return res.status(404).json({
                    mensagem: "Campanha não encontrada."
                });
            }

            res.json({
                sucesso: true,
                campanha: resultado.rows[0]
            });
        } catch (erro) {
            next(erro);
        }
    });

    router.put(
        "/:id",
        validarId,
        validarDados,
        async (req, res, next) => {
            try {
                if (req.body.campaignData === undefined) {
                    return res.status(400).json({
                        mensagem: "Envie os dados da campanha."
                    });
                }

                const { name, description, campaignData } =
                    req.dadosCampanha;

                const resultado = await db.query(
                    `UPDATE campaigns
                     SET name = $1,
                         description = $2,
                         campaign_data = $3,
                         updated_at = NOW()
                     WHERE id = $4 AND owner_id = $5
                     RETURNING *`,
                    [
                        name,
                        description,
                        campaignData,
                        req.params.id,
                        req.usuario.userId
                    ]
                );

                if (!resultado.rows.length) {
                    return res.status(404).json({
                        mensagem: "Campanha não encontrada."
                    });
                }

                res.json({
                    sucesso: true,
                    campanha: resultado.rows[0]
                });
            } catch (erro) {
                next(erro);
            }
        }
    );

    router.delete("/:id", validarId, async (req, res, next) => {
        try {
            const resultado = await db.query(
                `DELETE FROM campaigns
                 WHERE id = $1 AND owner_id = $2
                 RETURNING id`,
                [req.params.id, req.usuario.userId]
            );

            if (!resultado.rows.length) {
                return res.status(404).json({
                    mensagem: "Campanha não encontrada."
                });
            }

            res.json({ sucesso: true });
        } catch (erro) {
            next(erro);
        }
    });

    router.use((erro, req, res, next) => {
        console.error("Erro nas campanhas:", erro);

        res.status(500).json({
            mensagem: "Não foi possível concluir a operação."
        });
    });

    return router;
};