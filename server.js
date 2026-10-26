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

function autorizarEdicaoInventario(req, res, next) {
    const perfisAutorizados = [ "atendente", "gerente", "administrador" ];
    const tipoPerfil = req.usuario?.tipo_perfil;

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
      console.error('Erro ao conectar ao MySQL: ', err.stack );
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
        data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`;
      connection.query( createTableQuery, (err) => {
        if (err) {
          console.error('Erro ao criar tabela: ', err.stack );
          return;
        }
      } );
});

// Aqui começa o Cadastro (criar conta)
app.post('/cadastro', async (req, res) => {

    console.log('Chegou no servidor');
    console.log(req.body);

    const {nome, email, data_nascimento, senha, confirmaSenha, participa_programa_fidelidade} = req.body;

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
        mesAtual < mesNascimento || (mesAtual === mesNascimento && hoje.getDate() < dataNascimento.getDate())) 
    {
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

    const idUsuario = req.params.id;

    const sql = `
        UPDATE usuario
        SET onboarding_concluido = TRUE
        WHERE id_usuario = ?
    `;

    connection.query(
        sql,
        [idUsuario],
        (err, result) => {

            if (err) {
                console.error(
                    "ERRO AO ATUALIZAR ONBOARDING:",
                    err
                );

                return res.status(500).json({
                    erro: "Erro ao concluir onboarding."
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    erro: "Usuário não encontrado."
                });
            }

            res.status(200).json({
                mensagem: "Onboarding concluído com sucesso!"
            });
        }
    );
});


// Aqui começa o Login / Autenticação (ou Entrar)
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost':${port}/`);
});

app.post('/login', async (req, res) => {

    console.log('Chegou no servidor o login');
    console.log(req.body);

    const { email, senha } = req.body;

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

            const senhaCorreta = await bcrypt.compare(
                senha,
                usuario.senha_hash
            );

            if (!senhaCorreta) {
                return res.status(401).json({
                    erro: 'E-mail ou senha incorretos'
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
        }
    );
});