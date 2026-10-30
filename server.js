const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
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

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'vestShop'
});

const criarTabelas = require('./database/criarTabelas');

const { carregarUsuario } = require('./middlewares/autenticacao');

const usuarioRoutes = require('./routes/usuarioRoutes');
const produtoRoutes = require('./routes/produtoRoutes');
const relatorioRoutes = require('./routes/relatorioRoutes');


// Identifica o usuário da sessão
app.use(carregarUsuario);

app.use('/', usuarioRoutes(connection));

app.use('/', produtoRoutes(connection));

app.use('/', relatorioRoutes(connection));

connection.connect((err) => {

    if (err) {
        console.error('Erro ao conectar ao MySQL:', err.stack);
        return;
    }

    console.log('Conectado ao MySQL com sucesso!');

    // Verifica e cria as tabelas do banco
    criarTabelas(connection)

        .then(() => {
            console.log('Banco de dados preparado!');

            app.listen(port, () => {
                console.log(`Servidor rodando em http://localhost:${port}/`);
            });

        })

        .catch((erro) => {
            console.error('Erro ao preparar o banco de dados:', erro);

        });
});
