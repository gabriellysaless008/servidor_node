const express = require('express');

const { verificarAcessoRelatorios } = require('../middlewares/autenticacao');

// Recebe a conexão com o banco enviada pelo server.js
module.exports = (connection) => {

const router = express.Router();

// PROCESSAMENTO DOS RELATÓRIOS - RF04

async function processarRelatorio(idJob, mes, ano) {

    try {

        // Atualiza o status do relatório
        await connection.promise().query(
            `UPDATE relatorio_job
            SET status = 'processando'
            WHERE id_job = ?`,
            [idJob]
        );

        // Consulta os produtos mais buscados
        const sqlBuscas = `
            SELECT
                p.id_produto,
                p.nome,
            SUM(ir.pesquisou) AS total
            FROM interacao_recomendacao ir
            INNER JOIN produto p
                ON ir.id_produto = p.id_produto
            WHERE MONTH(ir.data_interacao) = ?
                AND YEAR(ir.data_interacao) = ?
                AND ir.pesquisou = TRUE
            GROUP BY p.id_produto, p.nome
            ORDER BY total DESC
            LIMIT 10
            `;

        // Consulta os produtos mais comprados
        const sqlCompras = `
            SELECT
                p.id_produto,
                p.nome,
            SUM(ip.quantidade) AS total
            FROM item_pedido ip
            INNER JOIN produto p
                ON ip.id_produto = p.id_produto
            INNER JOIN Pedido pe
                ON ip.id_pedido = pe.id_pedido
             WHERE MONTH(pe.data_pedido) = ?
                AND YEAR(pe.data_pedido) = ?
                AND pe.status = 'concluido'
            GROUP BY p.id_produto, p.nome
            ORDER BY total DESC
            LIMIT 10
            `;

        // Consulta o total de unidades vendidas
        const sqlTotalUnidades = `
            SELECT
                COALESCE(SUM(ip.quantidade), 0) AS totalUnidades
            FROM item_pedido ip
            INNER JOIN Pedido pe
                ON ip.id_pedido = pe.id_pedido
            WHERE MONTH(pe.data_pedido) = ?
                AND YEAR(pe.data_pedido) = ?
                AND pe.status = 'concluido'
            `;

        // Executa as consultas
        const [buscas, compras, unidades] = await Promise.all([

            connection.promise().query(sqlBuscas, [mes, ano]),
            connection.promise().query(sqlCompras, [mes, ano]),
            connection.promise().query(sqlTotalUnidades, [mes, ano])
            ]);

        const produtosMaisBuscados = buscas[0];
        const produtosMaisComprados = compras[0];

        // Organiza os resultados
        const resultado = {
            produtoMaisBuscado: produtosMaisBuscados.length > 0 ? produtosMaisBuscados[0]: null,
            produtoMaisComprado: produtosMaisComprados.length > 0 ? produtosMaisComprados[0]: null,
            produtosMaisBuscados,
            produtosMaisComprados,
            totalUnidades: unidades[0][0].totalUnidades
            };

        // Salva o resultado no banco
        await connection.promise().query(
            `UPDATE relatorio_job
            SET status = 'concluido',
                resultado = ?,
                erro = NULL
            WHERE id_job = ?`, [
                    JSON.stringify(resultado),
                    idJob
            ]
        );

        console.log(`Relatório ${idJob} concluído com sucesso!`);

    } catch (erro) {

        console.error('ERRO AO PROCESSAR RELATÓRIO:', erro);

        try {

            await connection.promise().query(
                `UPDATE relatorio_job
                SET status = 'erro',
                    erro = ?
                WHERE id_job = ?`, [
                    erro.message,
                    idJob
                ]
            );

        } catch (erroBanco) {

        console.error('Erro ao salvar falha do relatório:', erroBanco);
        }
    }
}

// SOLICITAR GERAÇÃO DO RELATÓRIO
router.post('/relatorios', verificarAcessoRelatorios, async (req, res) => {

    const mes = Number(req.body.mes);
    const ano = Number(req.body.ano);

    if (!Number.isInteger(mes) || mes < 1 || mes > 12 || !Number.isInteger(ano) || ano < 2000 || ano > 2100) {
        return res.status(400).json({
            erro: 'Informe um mês e um ano válidos.'
        });
    }

    try {
    // Registra a solicitação no banco
        const [resultado] = await connection.promise().query(
            `INSERT INTO relatorio_job (
                id_usuario,
                mes,
                ano,
                status
            )
            VALUES (?, ?, ?, 'pendente')`, [
                req.usuario.id_usuario,
                mes,
                ano
            ]);

        const idJob = resultado.insertId;

        // Agenda o processamento após a solicitação
        setImmediate(() => { processarRelatorio(idJob, mes, ano); });

        return res.status(202).json({
            mensagem: 'Relatório solicitado com sucesso!',
            id_job: idJob,
            status: 'pendente'
        });

    } catch (erro) {

        console.error('ERRO AO SOLICITAR RELATÓRIO:', erro);

        return res.status(500).json({
            erro: 'Não foi possível solicitar o relatório.'
        });
    }
});

// CONSULTAR ANDAMENTO DO RELATÓRIO
router.get('/relatorios/:id', verificarAcessoRelatorios, async (req, res) => {

    const idJob = Number(req.params.id);

    if (!Number.isInteger(idJob) || idJob <= 0) {
        return res.status(400).json({
            erro: 'ID de relatório inválido.'
        });
    }

    try {

        // Consulta somente os relatórios do usuário logado
        const [tarefas] = await connection.promise().query(
            `SELECT
                id_job,
                mes,
                ano,
                status,
                resultado,
                erro
            FROM relatorio_job
            WHERE id_job = ?
                AND id_usuario = ?`, [
                idJob,
                req.usuario.id_usuario
            ]);

        if (tarefas.length === 0) {
            return res.status(404).json({
                erro: 'Relatório não encontrado.'
            });
        }

        const tarefa = tarefas[0];

        return res.status(200).json({

            id_job: tarefa.id_job,
            mes: tarefa.mes,
            ano: tarefa.ano,
            status: tarefa.status,

            resultado: tarefa.resultado ? JSON.parse(tarefa.resultado) : null, erro: tarefa.erro
        });

    } catch (erro) {

        console.error('ERRO AO CONSULTAR RELATÓRIO:', erro);

        return res.status(500).json({
            erro: 'Não foi possível consultar o relatório.'
        });
    }
});


// Retorna as rotas para o server.js
return router;
};
