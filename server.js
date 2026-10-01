const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
const port = 3000;

// Use o cors
app.use(cors());

// Middleware(ponte) para o Express entender JSON no corpo da requisição (req.body)
app.use(express.json());

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

app.post('/cadastro', async (req, res) => {

    console.log('Chegou no servidor');
    console.log(req.body);

    const {nome, email, data_nascimento, senha, confirmaSenha, participa_programa_fidelidade} = req.body;

    if (senha !== confirmaSenha) {
        return res.status(400).json({
            erro: 'As senhas não coincidem'
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
        mesAtual < mesNascimento ||
        (mesAtual === mesNascimento && hoje.getDate() < dataNascimento.getDate())
    ) {
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

// app.post('/cadastro', (req, res) => {

//     console.log('Chegou no servidor');
//     console.log(req.text);

//     const { nome, email, data_nascimento, senha, confirmaSenha, participa_programa_fidelidade } = req.body

//     const sql = `
//         INSERT INTO usuario (nome, email, senha_hash, data_nascimento, participa_programa_fidelidade)
//         VALUES (?, ?, ?, ?, ?)
//     `;

//     connection.query(
//     sql,
//     [nome, email, senha, data_nascimento, participa_programa_fidelidade],
//     (err, result) => {
//             if (err) {
//                 console.error('ERRO DO MYSQL:', err);
//                 return res.status(500).json({
//                 erro: err.message
//             });
//         }

//         res.status(201).json({
//             mensagem: 'Usuario cadastrado com sucesso!',
//             id: result.insertId
//             });
//         }
//     );
// });

// app.post('/login', (req, res) => {

//     console.log('Chegou no servidor o login');
//     console.log(req.text);

//     const { email, senha } = req.body;

//     const sql = `
//         INSERT INTO usuario (email, senha)
//         VALUES (?, ?, ?, ?)
//     `;

//     connection.query(
//         sql,
//         [email, senha],
//         (err, result) => {
//             if (err) {
//                 console.error('Erro ao cadastrar usuario:', err);
//                 return res.status(500).json({
//                     erro: 'Erro ao cadastrar usuario'
//                 });
//             }

//             res.status(201).json({
//                 mensagem: 'Usuario cadastrado com sucesso!',
//                 id: result.insertId
//             });
//         }
//     );
// });

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost':${port}/`);
});