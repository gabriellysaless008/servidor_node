const express = require('express');
const bcrypt = require('bcrypt');


// Recebe a conexão com o banco enviada pelo server.js
module.exports = (connection) => {
const router = express.Router();


    // CADASTRAR CLIENTE

    router.post('/cadastro', async (req, res) => {

        console.log('Chegou no servidor');

        const {
            nome,
            email,
            data_nascimento,
            senha,
            confirmaSenha,
            participa_programa_fidelidade
        } = req.body;

        try {

            if (!nome || !email || !data_nascimento || !senha || !confirmaSenha) {
                return res.status(400).json({
                    erro: 'Preencha todos os campos obrigatórios.'
                });
            }

            if (senha !== confirmaSenha) {
                return res.status(400).json({
                    erro: 'As senhas não coincidem.'
                });
            }

            // Verifica se o e-mail já está cadastrado
            const [usuariosExistentes] = await connection.promise().query(
                `SELECT id_usuario
                 FROM usuario
                 WHERE email = ?`,
                [email.trim()]
            );

            if (usuariosExistentes.length > 0) {
                return res.status(409).json({
                    erro: 'Este e-mail já está cadastrado. Tente fazer login.'
                });
            }

            // Converte a data de nascimento
            const partesData = data_nascimento.split('/');

            if (partesData.length !== 3) {
                return res.status(400).json({
                    erro: 'Informe uma data de nascimento válida.'
                });
            }

            const dia = Number(partesData[0]);
            const mes = Number(partesData[1]);
            const ano = Number(partesData[2]);

            const dataNascimento = new Date(ano, mes - 1, dia);

            if (
                dataNascimento.getFullYear() !== ano ||
                dataNascimento.getMonth() !== mes - 1 ||
                dataNascimento.getDate() !== dia
            ) {
                return res.status(400).json({
                    erro: 'Informe uma data de nascimento válida.'
                });
            }

            // Calcula a idade
            const hoje = new Date();

            let idade = hoje.getFullYear() - ano;

            if (
                hoje.getMonth() < mes - 1 ||
                (hoje.getMonth() === mes - 1 && hoje.getDate() < dia)
            ) {
                idade--;
            }

            const ehMaiorIdade = idade >= 18;

            const dataNascimentoBanco =
                `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

            // Cadastro público será sempre de cliente
            const tipoPerfil = 'cliente';

            // Criptografa a senha
            const senhaHash = await bcrypt.hash(senha, 10);

            const sql = `
                INSERT INTO usuario (
                    nome,
                    email,
                    senha_hash,
                    data_nascimento,
                    eh_maior_idade,
                    tipo_perfil,
                    participa_programa_fidelidade
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;

            const [resultado] = await connection.promise().query(
                sql,
                [
                    nome,
                    email.trim(),
                    senhaHash,
                    dataNascimentoBanco,
                    ehMaiorIdade,
                    tipoPerfil,
                    Boolean(participa_programa_fidelidade)
                ]
            );

            return res.status(201).json({
                mensagem: 'Usuario cadastrado com sucesso!',
                id: resultado.insertId
            });

        } catch (erro) {

            console.error('ERRO AO CADASTRAR USUÁRIO:', erro);

            return res.status(500).json({
                erro: 'Não foi possível realizar o cadastro.'
            });
        }
    });



// CADASTRAR ATENDENTE OU GERENTE

router.post('/usuarios/equipe', async (req, res) => {

    // Verifica se existe um usuário logado
    if (!req.usuario) {
        return res.status(401).json({
            erro: 'Faça login para cadastrar usuários da equipe.'
        });
    }

    // Somente Administradores podem cadastrar a equipe
    if (req.usuario.tipo_perfil !== 'administrador') {
        return res.status(403).json({
            erro: 'Somente Administradores podem cadastrar usuários da equipe.'
        });
    }

    const {
        nome,
        email,
        data_nascimento,
        senha,
        confirmaSenha,
        tipo_perfil
    } = req.body;

    try {

    // Verifica os campos obrigatórios
        if (!nome || !email || !data_nascimento || !senha || !confirmaSenha || !tipo_perfil) {
            return res.status(400).json({
                erro: 'Preencha todos os campos obrigatórios.'
            });
        }

    // Permite somente os perfis de Atendente e Gerente
        const perfisPermitidos = ['atendente', 'gerente'];

        if (!perfisPermitidos.includes(tipo_perfil)) {
            return res.status(400).json({
                erro: 'Perfil inválido. Escolha Atendente ou Gerente.'
            });
        }

    // Verifica se as senhas coincidem
        if (senha !== confirmaSenha) {
            return res.status(400).json({
                erro: 'As senhas não coincidem.'
            });
        }

    // Verifica se o e-mail já está cadastrado
        const [usuariosExistentes] = await connection.promise().query(
            `SELECT id_usuario
            FROM usuario
            WHERE email = ?`,
            [email.trim()]);

        if (usuariosExistentes.length > 0) {
            return res.status(409).json({
                erro: 'Este e-mail já está cadastrado.'
            });
        }

    // Converte a data de nascimento
        const partesData = data_nascimento.split('/');

        if (partesData.length !== 3) {
            return res.status(400).json({
                erro: 'Informe uma data de nascimento válida.'
            });
        }

        const dia = Number(partesData[0]);
        const mes = Number(partesData[1]);
        const ano = Number(partesData[2]);

        const dataNascimento = new Date(ano, mes - 1, dia);

        if (dataNascimento.getFullYear() !== ano || dataNascimento.getMonth() !== mes - 1 || dataNascimento.getDate() !== dia) {
            return res.status(400).json({
                erro: 'Informe uma data de nascimento válida.'
            });
        }

        // Calcula a idade
        const hoje = new Date();

        let idade = hoje.getFullYear() - ano;

        if (hoje.getMonth() < mes - 1 || (hoje.getMonth() === mes - 1 && hoje.getDate() < dia)) {
            idade--;
        }

        const ehMaiorIdade = idade >= 18;

        const dataNascimentoBanco = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

        // Criptografa a senha
        const senhaHash = await bcrypt.hash(senha, 10);

        // Insere o usuário no banco
        const sql = `
            INSERT INTO usuario (
                nome,
                email,
                senha_hash,
                data_nascimento,
                eh_maior_idade,
                tipo_perfil,
                participa_programa_fidelidade
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)`;

        const [resultado] = await connection.promise().query(
            sql,
            [
                nome,
                email.trim(),
                senhaHash,
                dataNascimentoBanco,
                ehMaiorIdade,
                tipo_perfil,
                false
            ]);

        return res.status(201).json({
            mensagem: 'Usuário da equipe cadastrado com sucesso!',
            id_usuario: resultado.insertId,
            tipo_perfil: tipo_perfil
        });

    } catch (erro) {

        console.error('ERRO AO CADASTRAR USUÁRIO DA EQUIPE:', erro);

        return res.status(500).json({
            erro: 'Não foi possível cadastrar o usuário da equipe.'
        });
    }
});


// CONCLUSÃO DO ONBOARDING
router.put('/usuario/:id/onboarding', async (req, res) => {

    const usuarioLogado = req.usuario;

    if (!usuarioLogado) {
        return res.status(401).json({
            erro: 'Faça login para concluir o onboarding.'
         });
        }

    const idUsuario = Number(req.params.id);

        if (!Number.isInteger(idUsuario) || idUsuario !== usuarioLogado.id_usuario) {
            return res.status(403).json({
                erro: 'Você não pode alterar o onboarding de outra conta.'
            });
        }

        try {

            const [usuarios] = await connection.promise().query(
                `SELECT id_usuario
                 FROM usuario
                 WHERE id_usuario = ?`,
                [idUsuario]
            );

            if (usuarios.length === 0) {
                return res.status(404).json({
                    erro: 'Usuário não encontrado.'
                });
            }

            const sql = `
                UPDATE usuario
                SET onboarding_concluido = TRUE
                WHERE id_usuario = ?
            `;

            await connection.promise().query(sql, [idUsuario]);

            return res.status(200).json({
                mensagem: 'Onboarding concluído com sucesso!'
            });

        } catch (erro) {

            console.error('Erro ao atualizar onboarding:', erro);

            return res.status(500).json({
                erro: 'Erro ao concluir onboarding.'
            });
        }
    });

// LOGIN / AUTENTICAÇÃO
router.post('/login', async (req, res) => {

        console.log('Chegou no servidor o login');

        const { email, senha, perfil } = req.body;

        try {

            const sql = `
                SELECT *
                FROM usuario
                WHERE email = ?
            `;

            const [resultados] = await connection.promise().query(
                sql,
                [email]
            );

            if (resultados.length === 0) {
                return res.status(401).json({
                    erro: 'E-mail ou senha incorretos'
                });
            }

            const usuario = resultados[0];

            // Verifica o perfil selecionado
            if (perfil && usuario.tipo_perfil !== perfil) {
                return res.status(403).json({
                    erro: 'Esta conta não pertence ao perfil selecionado.'
                });
            }

            // Verifica a senha
            const senhaCorreta = await bcrypt.compare(
                senha,
                usuario.senha_hash
            );

            if (!senhaCorreta) {
                return res.status(401).json({
                    erro: 'E-mail ou senha incorretos'
                });
            }

            // Cria a sessão do usuário
            req.session.usuario = {
                id_usuario: usuario.id_usuario,
                nome: usuario.nome,
                email: usuario.email,
                tipo_perfil: usuario.tipo_perfil
            };

            req.session.save((erroSessao) => {

                if (erroSessao) {
                    console.error('ERRO AO SALVAR SESSÃO:', erroSessao);

                    return res.status(500).json({
                        erro: 'Não foi possível iniciar a sessão.'
                    });
                }

                return res.status(200).json({
                    mensagem: 'Login realizado com sucesso!',
                    usuario: {
                        id_usuario: usuario.id_usuario,
                        nome: usuario.nome,
                        email: usuario.email,
                        tipo_perfil: usuario.tipo_perfil,
                        onboarding_concluido: usuario.onboarding_concluido
                    }
                });
            });

        } catch (erro) {

            console.error('ERRO AO REALIZAR LOGIN:', erro);

            return res.status(500).json({
                erro: 'Não foi possível realizar o login.'
            });
        }
    });


    // Retorna as rotas para o server.js
    return router;
};
