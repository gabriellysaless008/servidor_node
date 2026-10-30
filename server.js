const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const session = require('express-session');

const app = express();
const port = 3000;

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json());

app.use(session({
    secret: 'vest-shop-chave-temporaria',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
    }
}));

function carregarUsuario(req, res, next) {
    req.usuario = req.session.usuario || null;
    next();
}

app.use(carregarUsuario);

function autorizarEdicaoInventario(req, res, next) {

    if (!req.usuario) {
        return res.status(401).json({
            erro: "Faça login para alterar o inventário."
        });
    }

    const perfisAutorizados = ["atendente", "gerente", "administrador"];
    const tipoPerfil = req.usuario.tipo_perfil;

    if (!perfisAutorizados.includes(tipoPerfil)) {
        return res.status(403).json({
            erro: "Você não tem permissão para alterar o inventário."
        });
    }

    next();
}

// 1. Configura a conexão com o MySQL
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'vestShop'
});


// Conecta ao banco de dados
connection.connect((err) => {
    if (err) {
        console.error('Erro ao conectar ao MySQL: ', err.stack);
        return;
    }

    console.log('Conectado ao MySQL com sucesso!');

    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS usuario (
            id_usuario INT AUTO_INCREMENT PRIMARY KEY,
            nome VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL,
            senha_hash VARCHAR(255) NOT NULL,
            data_nascimento DATE NOT NULL,
            eh_maior_idade BOOLEAN NOT NULL,
            tipo_perfil VARCHAR(50) NOT NULL,
            participa_programa_fidelidade BOOLEAN NOT NULL,
            onboarding_concluido BOOLEAN NOT NULL DEFAULT FALSE,
            data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;

    connection.query(createTableQuery, (err) => {
        if (err) {
            console.error('Erro ao criar tabela usuario:', err);
            return;
        }

        console.log('Tabela usuario verificada/criada com sucesso!');

        const createProdutoQuery = `
            CREATE TABLE IF NOT EXISTS produto (
                id_produto INT AUTO_INCREMENT PRIMARY KEY,
                id_anunciante INT NOT NULL,
                nome VARCHAR(150) NOT NULL,
                marca VARCHAR(100) NOT NULL,
                descricao TEXT,
                tamanho VARCHAR(10) NOT NULL,
                genero_indicado VARCHAR(20),
                estilo VARCHAR(50) NOT NULL,
                preco_base_brl DECIMAL(10,2) NOT NULL,
                quantidade_estoque INT NOT NULL,
                status VARCHAR(50) NOT NULL,
                data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                CONSTRAINT fk_produto_anunciante
                    FOREIGN KEY (id_anunciante)
                    REFERENCES usuario(id_usuario)
            )`;

        connection.query(createProdutoQuery, (err) => {
            if (err) {
                console.error('Erro ao criar tabela produto:', err);
                return;
            }

            console.log('Tabela produto verificada/criada com sucesso!');

            const createPedidoQuery = `
                CREATE TABLE IF NOT EXISTS Pedido (
                    id_pedido INT AUTO_INCREMENT PRIMARY KEY,
                    id_comprador INT NOT NULL,
                    codigo_moeda_utilizada VARCHAR(3) NOT NULL,
                    valor_subtotal DECIMAL(10,2) NOT NULL,
                    valor_frete DECIMAL(10,2) NOT NULL,
                    isento_frete BOOLEAN,
                    cep_destino VARCHAR(9) NOT NULL,
                    regiao_metropolitana BOOLEAN,
                    status VARCHAR(50) NOT NULL,
                    data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                    CONSTRAINT fk_pedido_comprador
                        FOREIGN KEY (id_comprador)
                        REFERENCES usuario(id_usuario)
                )`;

            connection.query(createPedidoQuery, (err) => {
                if (err) {
                    console.error('Erro ao criar tabela Pedido:', err);
                    return;
                }

                console.log('Tabela Pedido verificada/criada com sucesso!');

                const createItemPedidoQuery = `
                    CREATE TABLE IF NOT EXISTS item_pedido (
                        id_item INT AUTO_INCREMENT PRIMARY KEY,
                        id_pedido INT NOT NULL,
                        id_produto INT NOT NULL,
                        quantidade INT NOT NULL,
                        preco_unitario_moeda_local DECIMAL(10,2) NOT NULL,

                        CONSTRAINT fk_item_pedido_pedido
                            FOREIGN KEY (id_pedido)
                            REFERENCES Pedido(id_pedido),

                        CONSTRAINT fk_item_pedido_produto
                            FOREIGN KEY (id_produto)
                            REFERENCES produto(id_produto)
                    )`;

                connection.query(createItemPedidoQuery, (err) => {
                    if (err) {
                        console.error('Erro ao criar tabela item_pedido:', err);
                        return;
                    }

                    console.log('Tabela item_pedido verificada/criada com sucesso!');

                    const createInteracaoRecomendacaoQuery = `
                        CREATE TABLE IF NOT EXISTS interacao_recomendacao (
                            id_interacao INT AUTO_INCREMENT PRIMARY KEY,
                            id_usuario INT NOT NULL,
                            id_produto INT NOT NULL,
                            curtiu BOOLEAN DEFAULT FALSE,
                            pesquisou BOOLEAN DEFAULT FALSE,
                            visualizou BOOLEAN DEFAULT FALSE,
                            data_interacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                            CONSTRAINT fk_interacao_usuario
                                FOREIGN KEY (id_usuario)
                                REFERENCES usuario(id_usuario),

                            CONSTRAINT fk_interacao_produto
                                FOREIGN KEY (id_produto)
                                REFERENCES produto(id_produto)
                        )`;

                    connection.query(createInteracaoRecomendacaoQuery, (err) => {
                        if (err) {
                            console.error('Erro ao criar tabela interacao_recomendacao:', err);
                            return;
                        }

                        console.log('Tabela interacao_recomendacao verificada/criada com sucesso!');
                    });
                });
            });
        });
    });
});


// Aqui começa o Cadastro (criar conta)
app.post('/cadastro', async (req, res) => {

    console.log('Chegou no servidor');

    const { nome, email, data_nascimento, senha, confirmaSenha, participa_programa_fidelidade } = req.body;

    if (senha !== confirmaSenha) {
        return res.status(400).json({
            erro: 'As senhas não coincidem'
        });
    }
    const [usuariosExistentes] = await connection.promise().query("SELECT id_usuario FROM usuario WHERE email = ?", [email.trim()]);

    if (usuariosExistentes.length > 0) {
        return res.status(409).json({
            erro: "Este e-mail já está cadastrado. Tente fazer login."
        });
    }

    const partesData = data_nascimento.split('/');

    const dia = partesData[0];
    const mes = partesData[1];
    const ano = partesData[2];

    const dataNascimento = new Date(`${ano}-${mes}-${dia}`);

    const hoje = new Date();

    let idade = hoje.getFullYear() - dataNascimento.getFullYear();

    const mesAtual = hoje.getMonth();
    const mesNascimento = dataNascimento.getMonth();

    if (
        mesAtual < mesNascimento || (mesAtual === mesNascimento && hoje.getDate() < dataNascimento.getDate())) {
        idade--;
    }

    const ehMaiorIdade = idade >= 18;

    const tipoPerfil = "cliente";

    const dataNascimentoBanco = `${ano}-${mes}-${dia}`;

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

    connection.query(
        sql,
        [nome, email, senhaHash, dataNascimentoBanco, ehMaiorIdade, tipoPerfil, participa_programa_fidelidade],
        (err, result) => {

            if (err) {
                console.error('ERRO DO MYSQL:', err);

                return res.status(500).json({
                    erro: err.message
                });
            }

            res.status(201).json({
                mensagem: 'Usuario cadastrado com sucesso!',
                id: result.insertId
            });
        }
    );
});

app.put('/usuario/:id/onboarding', (req, res) => {
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

    const sql = `
        UPDATE usuario
        SET onboarding_concluido = TRUE
        WHERE id_usuario = ?
    `;

    connection.query(sql, [idUsuario], (err, result) => {
        if (err) {
            console.error('Erro ao atualizar onboarding:', err);

            return res.status(500).json({
                erro: 'Erro ao concluir onboarding.'
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                erro: 'Usuário não encontrado.'
            });
        }

        return res.status(200).json({
            mensagem: 'Onboarding concluído com sucesso!'
        });
    });
});

// Aqui começa a implementação do RFN 01.01

// Listar produtos do inventário
app.get('/produtos', async (req, res) => {
    const sql = `
        SELECT *
        FROM produto
        ORDER BY id_produto DESC
    `;

    try {
        const [produtos] = await connection.promise().query(sql);
        res.status(200).json(produtos);
    } catch (erro) {
        console.error("ERRO AO LISTAR PRODUTOS:", erro);

        res.status(500).json({
            erro: "Não foi possível carregar os produtos."
        });
    }
});

// Cadastrar produto
app.post('/produtos', autorizarEdicaoInventario, async (req, res) => {

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

        res.status(201).json({
            mensagem: "Produto cadastrado com sucesso!",
            id_produto: resultado.insertId
        });

    } catch (erro) {

        console.error("ERRO AO CADASTRAR PRODUTO:", erro);

        res.status(500).json({
            erro: "Não foi possível cadastrar o produto."
        });
    }
});


// Editar produto
app.put('/produtos/:id', autorizarEdicaoInventario, async (req, res) => {

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

            const [produtos] = await connection.promise().query("SELECT id_produto FROM produto WHERE id_produto = ?", [idProduto]);

            if (produtos.length === 0) {
                return res.status(404).json({
                    erro: "Produto não encontrado."
                });
            }
        }

        res.status(200).json({
            mensagem: "Produto atualizado com sucesso!"
        });

    } catch (erro) {

        console.error("ERRO AO EDITAR PRODUTO:", erro);

        res.status(500).json({
            erro: "Não foi possível atualizar o produto."
        });
    }
});


// Desativar produto do inventário
app.delete('/produtos/:id', autorizarEdicaoInventario, async (req, res) => {

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

        res.status(200).json({
            mensagem: "Produto desativado com sucesso!"
        });

    } catch (erro) {

        console.error("ERRO AO DESATIVAR PRODUTO:", erro);

        res.status(500).json({
            erro: "Não foi possível desativar o produto."
        });
    }
});

// Aqui começa o Login / Autenticação (ou Entrar)
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost':${port}/`);
});

app.post('/login', async (req, res) => {

    console.log('Chegou no servidor o login');

    const { email, senha, perfil } = req.body;

    const sql = `
        SELECT *
        FROM usuario
        WHERE email = ?
    `;

    connection.query(
        sql,
        [email],
        async (err, results) => {

            if (err) {
                console.error('ERRO DO MYSQL:', err);
                return res.status(500).json({
                    erro: err.message
                });
            }

            if (results.length === 0) {
                return res.status(401).json({
                    erro: 'E-mail ou senha incorretos'
                });
            }

            const usuario = results[0];

            if (perfil && usuario.tipo_perfil !== perfil) {
                return res.status(403).json({
                    erro: 'Esta conta não pertence ao perfil selecionado.'
                });
            }

            const senhaCorreta = await bcrypt.compare(
                senha,
                usuario.senha_hash
            );

            if (!senhaCorreta) {
                return res.status(401).json({
                    erro: 'E-mail ou senha incorretos'
                });
            }


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

                res.status(200).json({
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
        }
    );
});