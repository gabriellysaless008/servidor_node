const express = require('express');

const { autorizarEdicaoInventario } = require('../middlewares/autenticacao');

// Recebe a conexão com o banco enviada pelo server.js
module.exports = (connection) => {

    const router = express.Router();

    // LISTAR PRODUTOS DO INVENTÁRIO

    router.get('/produtos', async (req, res) => {

        const sql = `
            SELECT *
            FROM produto
            ORDER BY id_produto DESC
        `;

        try {

            const [produtos] = await connection.promise().query(sql);

            return res.status(200).json(produtos);

        } catch (erro) {

            console.error("ERRO AO LISTAR PRODUTOS:", erro);

            return res.status(500).json({
                erro: "Não foi possível carregar os produtos."
            });
        }
    });


    // CADASTRAR PRODUTO

    router.post('/produtos', autorizarEdicaoInventario, async (req, res) => {

        const {
            nome,
            marca,
            descricao,
            tamanho,
            genero_indicado,
            estilo,
            preco_base_brl,
            quantidade_estoque,
            status
        } = req.body;

        if (!nome || !marca || !tamanho || !estilo || preco_base_brl == null || quantidade_estoque == null || !status) {
            return res.status(400).json({
                erro: "Preencha os campos obrigatórios do produto."
            });
        }

        const preco = Number(preco_base_brl);
        const quantidade = Number(quantidade_estoque);

        if (!Number.isFinite(preco) || preco < 0 || !Number.isInteger(quantidade) || quantidade < 0) {
            return res.status(400).json({
                erro: "Preço ou quantidade inválidos."
            });
        }

        const sql = `
            INSERT INTO produto (
                id_anunciante,
                nome,
                marca,
                descricao,
                tamanho,
                genero_indicado,
                estilo,
                preco_base_brl,
                quantidade_estoque,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        try {

            const [resultado] = await connection.promise().query(
                sql,
                [
                    req.usuario.id_usuario,
                    nome,
                    marca,
                    descricao || null,
                    tamanho,
                    genero_indicado || null,
                    estilo,
                    preco,
                    quantidade,
                    status
                ]
            );

            return res.status(201).json({
                mensagem: "Produto cadastrado com sucesso!",
                id_produto: resultado.insertId
            });

        } catch (erro) {

            console.error("ERRO AO CADASTRAR PRODUTO:", erro);

            return res.status(500).json({
                erro: "Não foi possível cadastrar o produto."
            });
        }
    });


    // EDITAR PRODUTO

    router.put('/produtos/:id', autorizarEdicaoInventario, async (req, res) => {

        const idProduto = Number(req.params.id);

        if (!Number.isInteger(idProduto) || idProduto <= 0) {
            return res.status(400).json({
                erro: "ID de produto inválido."
            });
        }

        const {
            nome,
            marca,
            descricao,
            tamanho,
            genero_indicado,
            estilo,
            preco_base_brl,
            quantidade_estoque,
            status
        } = req.body;

        if (!nome || !marca || !tamanho || !estilo || preco_base_brl == null || quantidade_estoque == null || !status) {
            return res.status(400).json({
                erro: "Preencha os campos obrigatórios do produto."
            });
        }

        const preco = Number(preco_base_brl);
        const quantidade = Number(quantidade_estoque);

        if (!Number.isFinite(preco) || preco < 0 || !Number.isInteger(quantidade) || quantidade < 0) {
            return res.status(400).json({
                erro: "Preço ou quantidade inválidos."
            });
        }

        const sql = `
            UPDATE produto
            SET nome = ?,
                marca = ?,
                descricao = ?,
                tamanho = ?,
                genero_indicado = ?,
                estilo = ?,
                preco_base_brl = ?,
                quantidade_estoque = ?,
                status = ?
            WHERE id_produto = ?
        `;

        try {

            const [resultado] = await connection.promise().query(
                sql,
                [
                    nome,
                    marca,
                    descricao || null,
                    tamanho,
                    genero_indicado || null,
                    estilo,
                    preco,
                    quantidade,
                    status,
                    idProduto
                ]
            );

            if (resultado.affectedRows === 0) {

                const [produtos] = await connection.promise().query(
                    "SELECT id_produto FROM produto WHERE id_produto = ?",
                    [idProduto]
                );

                if (produtos.length === 0) {
                    return res.status(404).json({
                        erro: "Produto não encontrado."
                    });
                }
            }

            return res.status(200).json({
                mensagem: "Produto atualizado com sucesso!"
            });

        } catch (erro) {

            console.error("ERRO AO EDITAR PRODUTO:", erro);

            return res.status(500).json({
                erro: "Não foi possível atualizar o produto."
            });
        }
    });


    // DESATIVAR PRODUTO DO INVENTÁRIO

    router.delete('/produtos/:id', autorizarEdicaoInventario, async (req, res) => {

        const idProduto = Number(req.params.id);

        if (!Number.isInteger(idProduto) || idProduto <= 0) {
            return res.status(400).json({
                erro: "ID de produto inválido."
            });
        }

        const sql = `
            UPDATE produto
            SET status = 'inativo'
            WHERE id_produto = ?
        `;

        try {

            const [resultado] = await connection.promise().query(
                sql,
                [idProduto]
            );

            if (resultado.affectedRows === 0) {

                const [produtos] = await connection.promise().query(
                    "SELECT id_produto FROM produto WHERE id_produto = ?",
                    [idProduto]
                );

                if (produtos.length === 0) {
                    return res.status(404).json({
                        erro: "Produto não encontrado."
                    });
                }
            }

            return res.status(200).json({
                mensagem: "Produto desativado com sucesso!"
            });

        } catch (erro) {

            console.error("ERRO AO DESATIVAR PRODUTO:", erro);

            return res.status(500).json({
                erro: "Não foi possível desativar o produto."
            });
        }
    });


    // Retorna as rotas para o server.js
    return router;
};
