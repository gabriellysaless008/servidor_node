async function criarTabelas(connection) {

    try {

        // Tabela de usuários
        const createUsuarioQuery = `
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
            )
        `;

        await connection.promise().query(createUsuarioQuery);
        console.log('Tabela usuario verificada/criada com sucesso!');


        // Tabela de produtos
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
            )
        `;

        await connection.promise().query(createProdutoQuery);
        console.log('Tabela produto verificada/criada com sucesso!');


        // Tabela de pedidos
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
            )
        `;

        await connection.promise().query(createPedidoQuery);
        console.log('Tabela Pedido verificada/criada com sucesso!');


        // Tabela de itens dos pedidos
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
            )
        `;

        await connection.promise().query(createItemPedidoQuery);
        console.log('Tabela item_pedido verificada/criada com sucesso!');


        // Tabela de interações e recomendações
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
            )
        `;

        await connection.promise().query(createInteracaoRecomendacaoQuery);
        console.log('Tabela interacao_recomendacao verificada/criada com sucesso!');


        // Tabela de controle dos relatórios - RF04 (Tabela adicionada conforme foi necessário)
        const createRelatorioJobQuery = `
            CREATE TABLE IF NOT EXISTS relatorio_job (
                id_job INT AUTO_INCREMENT PRIMARY KEY,
                id_usuario INT NOT NULL,
                mes INT NOT NULL,
                ano INT NOT NULL,
                status VARCHAR(30) NOT NULL DEFAULT 'pendente',
                resultado LONGTEXT,
                erro TEXT,
                data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP,

                CONSTRAINT fk_relatorio_job_usuario
                    FOREIGN KEY (id_usuario)
                    REFERENCES usuario(id_usuario)
            )
        `;

        await connection.promise().query(createRelatorioJobQuery);
        console.log('Tabela relatorio_job verificada/criada com sucesso!');

        console.log('Todas as tabelas foram verificadas/criadas com sucesso!');

    } catch (erro) {

        console.error('Erro ao criar as tabelas:', erro);
        throw erro;
    }
}


// Exporta a função para o server.js
module.exports = criarTabelas;
