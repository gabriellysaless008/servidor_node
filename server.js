const express = require('express');
const mysql = require('mysql2');

const cors = require('cors');

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

    // Cria a tabela 'usuario'  caso ela não exista
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS usuario(
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        senha VARCHAR(40) NOT NULL,
        confirmaSenha VARCHAR(40) NOT NULL
      )`;
      connection.query( createTableQuery, (err) => {
        if (err) {
          console.error('Erro ao criar tabela: ', err.stack );
          return;
        }
      } );
});

app.post('/cadastro', (req, res) => {

    console.log('Chegou no servidor');
    console.log(req.text);

    const { nome, email, senha, confirmaSenha } = req.body;

    const sql = `
        INSERT INTO usuario (nome, email, senha, confirmaSenha)
        VALUES (?, ?, ?, ?)
    `;

    connection.query(
        sql,
        [nome, email, senha, confirmaSenha],
        (err, result) => {
            if (err) {
                console.error('Erro ao cadastrar usuario:', err);
                return res.status(500).json({
                    erro: 'Erro ao cadastrar usuario'
                });
            }

            res.status(201).json({
                mensagem: 'Usuario cadastrado com sucesso!',
                id: result.insertId
            });
        }
    );
});








app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost':${port}/`);
});