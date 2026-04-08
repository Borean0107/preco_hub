-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Tempo de geração: 08/04/2026 às 00:20
-- Versão do servidor: 10.4.32-MariaDB
-- Versão do PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `preco_hub`
--

-- --------------------------------------------------------

--
-- Estrutura para tabela `categoria`
--

CREATE TABLE `categoria` (
  `id_categoria` int(11) NOT NULL,
  `nome_categoria` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `categoria`
--

INSERT INTO `categoria` (`id_categoria`, `nome_categoria`) VALUES
(1, 'Arroz'),
(4, 'Café'),
(7, 'Farinha'),
(2, 'Feijão'),
(5, 'Leite'),
(3, 'Macarrão'),
(6, 'Óleo'),
(8, 'Suco');

-- --------------------------------------------------------

--
-- Estrutura para tabela `fabricante`
--

CREATE TABLE `fabricante` (
  `id_fabricante` int(11) NOT NULL,
  `nome_fabricante` varchar(120) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `fabricante`
--

INSERT INTO `fabricante` (`id_fabricante`, `nome_fabricante`) VALUES
(2, 'Barilla'),
(8, 'Del Valle'),
(7, 'Dona Benta'),
(5, 'Italac'),
(3, 'Kicaldo'),
(6, 'Liza'),
(4, 'Pilão'),
(1, 'Tio João');

-- --------------------------------------------------------

--
-- Estrutura para tabela `lista`
--

CREATE TABLE `lista` (
  `id_lista` int(11) NOT NULL,
  `nome_lista` varchar(120) NOT NULL,
  `data_criacao_lista` datetime NOT NULL DEFAULT current_timestamp(),
  `fk_usuario_id_usuario` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `lista_produto`
--

CREATE TABLE `lista_produto` (
  `fk_lista_id_lista` int(11) NOT NULL,
  `fk_produto_id_produto` int(11) NOT NULL,
  `quantidade` int(11) NOT NULL DEFAULT 1,
  `comprado` tinyint(1) NOT NULL DEFAULT 0,
  `data_adicao` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `mercado`
--

CREATE TABLE `mercado` (
  `id_mercado` int(11) NOT NULL,
  `nome_mercado` varchar(120) NOT NULL,
  `cnpj_mercado` varchar(18) DEFAULT NULL,
  `endereco_mercado` varchar(180) DEFAULT NULL,
  `bairro_mercado` varchar(100) DEFAULT NULL,
  `cidade_mercado` varchar(100) DEFAULT NULL,
  `estado_mercado` varchar(2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `mercado`
--

INSERT INTO `mercado` (`id_mercado`, `nome_mercado`, `cnpj_mercado`, `endereco_mercado`, `bairro_mercado`, `cidade_mercado`, `estado_mercado`) VALUES
(1, 'Savegnago', '00.000.000/0001-01', 'Rua Exemplo, 100', 'Centro', 'Araras', 'SP'),
(2, 'Favetta', '00.000.000/0001-02', 'Av. Exemplo, 200', 'Jardim', 'Araras', 'SP'),
(3, 'Pague Menos', '00.000.000/0001-03', 'Rua Modelo, 300', 'Vila', 'Araras', 'SP');

-- --------------------------------------------------------

--
-- Estrutura para tabela `mercado_produto`
--

CREATE TABLE `mercado_produto` (
  `fk_mercado_id_mercado` int(11) NOT NULL,
  `fk_produto_id_produto` int(11) NOT NULL,
  `preco_produto_mercado` decimal(10,2) NOT NULL,
  `data_atualizacao_preco` datetime NOT NULL DEFAULT current_timestamp(),
  `disponibilidade_produto` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `mercado_produto`
--

INSERT INTO `mercado_produto` (`fk_mercado_id_mercado`, `fk_produto_id_produto`, `preco_produto_mercado`, `data_atualizacao_preco`, `disponibilidade_produto`) VALUES
(1, 1, 19.90, '2026-03-16 20:21:45', 1),
(1, 2, 5.29, '2026-03-16 20:21:45', 1),
(1, 3, 7.89, '2026-03-16 20:21:46', 1),
(1, 4, 17.50, '2026-03-16 20:21:46', 1),
(1, 5, 4.89, '2026-03-16 20:21:46', 1),
(1, 6, 6.79, '2026-03-16 20:21:46', 1),
(1, 7, 4.49, '2026-03-16 20:21:46', 1),
(1, 8, 9.99, '2026-03-16 20:21:47', 1),
(2, 1, 20.75, '2026-03-16 20:21:45', 1),
(2, 2, 13.75, '2026-03-16 20:21:45', 1),
(2, 3, 8.50, '2026-03-16 20:21:46', 1),
(2, 4, 16.90, '2026-03-16 20:21:46', 1),
(2, 5, 5.10, '2026-03-16 20:21:46', 1),
(2, 6, 6.99, '2026-03-16 20:21:46', 1),
(2, 7, 6.99, '2026-03-16 20:21:46', 1),
(2, 8, 10.36, '2026-03-16 20:21:47', 1),
(3, 1, 21.49, '2026-03-16 20:21:45', 1),
(3, 2, 8.49, '2026-03-16 20:21:45', 1),
(3, 3, 8.20, '2026-03-16 20:21:46', 1),
(3, 4, 18.20, '2026-03-16 20:21:46', 1),
(3, 5, 4.69, '2026-03-16 20:21:46', 1),
(3, 6, 7.20, '2026-03-16 20:21:46', 1),
(3, 7, 5.90, '2026-03-16 20:21:47', 1),
(3, 8, 10.50, '2026-03-16 20:21:47', 1);

-- --------------------------------------------------------

--
-- Estrutura para tabela `produto`
--

CREATE TABLE `produto` (
  `id_produto` int(11) NOT NULL,
  `nome_produto` varchar(150) NOT NULL,
  `descricao_produto` text DEFAULT NULL,
  `imagem_produto` varchar(255) NOT NULL,
  `codigo_barras_produto` varchar(50) DEFAULT NULL,
  `fk_categoria_id_categoria` int(11) NOT NULL,
  `fk_fabricante_id_fabricante` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `produto`
--

INSERT INTO `produto` (`id_produto`, `nome_produto`, `descricao_produto`, `imagem_produto`, `codigo_barras_produto`, `fk_categoria_id_categoria`, `fk_fabricante_id_fabricante`) VALUES
(1, 'Arroz Tio João 5kg', 'Arroz tipo 1 pacote 5kg', 'assets/img/produtos/arroz.jpg', '7896006716114', 1, 1),
(2, 'Macarrão Fetuccine Barilla 500g', 'Macarrão tipo fetuccine 500g', 'assets/img/produtos/macarrao.jpg', '7896102500150', 3, 2),
(3, 'Feijão Carioca Kicaldo 1kg', 'Feijão carioca pacote 1kg', 'assets/img/produtos/feijao.jpg', '7896256601203', 2, 3),
(4, 'Café Pilão 500g', 'Café torrado e moído 500g', 'assets/img/produtos/cafe.jpg', '7896089010000', 4, 4),
(5, 'Leite Italac 1L', 'Leite UHT integral 1 litro', 'assets/img/produtos/leite.jpg', '7898080640012', 5, 5),
(6, 'Óleo Liza 900ml', 'Óleo de soja 900ml', 'assets/img/produtos/oleo.jpg', '7896036090017', 6, 6),
(7, 'Farinha Dona Benta 1kg', 'Farinha de trigo 1kg', 'assets/img/produtos/farinha.jpg', '7891200001111', 7, 7),
(8, 'Suco de Laranja Del Valle 1,5L', 'Suco de laranja pronto 1,5L', 'assets/img/produtos/sucolaranja.jpg', '7894900015151', 8, 8);

-- --------------------------------------------------------

--
-- Estrutura para tabela `usuario`
--

CREATE TABLE `usuario` (
  `id_usuario` int(11) NOT NULL,
  `nome_usuario` varchar(120) NOT NULL,
  `email_usuario` varchar(150) NOT NULL,
  `senha_usuario` varchar(255) NOT NULL,
  `data_criacao_usuario` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `usuario`
--

INSERT INTO `usuario` (`id_usuario`, `nome_usuario`, `email_usuario`, `senha_usuario`, `data_criacao_usuario`) VALUES
(1, 'julio', 'matheusteves53@gmail.com', '$2y$10$6xCJ9lej8jx3WOKhm4rp0OozG2y/chRAtvse0Z0dS/rc1YnV/gy5y', '2026-03-23 20:37:54'),
(2, 'matheus', 'matheusborean@gmail.com', '$2y$10$67FXKeFnNi2hce3MI3mYgOBArdgM3vjfkk2RZa6/BOymPzODvJRI2', '2026-03-23 21:42:08');

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `categoria`
--
ALTER TABLE `categoria`
  ADD PRIMARY KEY (`id_categoria`),
  ADD UNIQUE KEY `nome_categoria` (`nome_categoria`);

--
-- Índices de tabela `fabricante`
--
ALTER TABLE `fabricante`
  ADD PRIMARY KEY (`id_fabricante`),
  ADD UNIQUE KEY `nome_fabricante` (`nome_fabricante`);

--
-- Índices de tabela `lista`
--
ALTER TABLE `lista`
  ADD PRIMARY KEY (`id_lista`),
  ADD KEY `fk_lista_usuario` (`fk_usuario_id_usuario`);

--
-- Índices de tabela `lista_produto`
--
ALTER TABLE `lista_produto`
  ADD PRIMARY KEY (`fk_lista_id_lista`,`fk_produto_id_produto`),
  ADD KEY `fk_lista_produto_produto` (`fk_produto_id_produto`);

--
-- Índices de tabela `mercado`
--
ALTER TABLE `mercado`
  ADD PRIMARY KEY (`id_mercado`),
  ADD UNIQUE KEY `nome_mercado` (`nome_mercado`);

--
-- Índices de tabela `mercado_produto`
--
ALTER TABLE `mercado_produto`
  ADD PRIMARY KEY (`fk_mercado_id_mercado`,`fk_produto_id_produto`),
  ADD KEY `fk_mercado_produto_produto` (`fk_produto_id_produto`);

--
-- Índices de tabela `produto`
--
ALTER TABLE `produto`
  ADD PRIMARY KEY (`id_produto`),
  ADD UNIQUE KEY `codigo_barras_produto` (`codigo_barras_produto`),
  ADD KEY `fk_produto_categoria` (`fk_categoria_id_categoria`),
  ADD KEY `fk_produto_fabricante` (`fk_fabricante_id_fabricante`);

--
-- Índices de tabela `usuario`
--
ALTER TABLE `usuario`
  ADD PRIMARY KEY (`id_usuario`),
  ADD UNIQUE KEY `email_usuario` (`email_usuario`);

--
-- AUTO_INCREMENT para tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `categoria`
--
ALTER TABLE `categoria`
  MODIFY `id_categoria` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de tabela `fabricante`
--
ALTER TABLE `fabricante`
  MODIFY `id_fabricante` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de tabela `lista`
--
ALTER TABLE `lista`
  MODIFY `id_lista` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `mercado`
--
ALTER TABLE `mercado`
  MODIFY `id_mercado` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de tabela `produto`
--
ALTER TABLE `produto`
  MODIFY `id_produto` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de tabela `usuario`
--
ALTER TABLE `usuario`
  MODIFY `id_usuario` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Restrições para tabelas despejadas
--

--
-- Restrições para tabelas `lista`
--
ALTER TABLE `lista`
  ADD CONSTRAINT `fk_lista_usuario` FOREIGN KEY (`fk_usuario_id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Restrições para tabelas `lista_produto`
--
ALTER TABLE `lista_produto`
  ADD CONSTRAINT `fk_lista_produto_lista` FOREIGN KEY (`fk_lista_id_lista`) REFERENCES `lista` (`id_lista`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_lista_produto_produto` FOREIGN KEY (`fk_produto_id_produto`) REFERENCES `produto` (`id_produto`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Restrições para tabelas `mercado_produto`
--
ALTER TABLE `mercado_produto`
  ADD CONSTRAINT `fk_mercado_produto_mercado` FOREIGN KEY (`fk_mercado_id_mercado`) REFERENCES `mercado` (`id_mercado`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_mercado_produto_produto` FOREIGN KEY (`fk_produto_id_produto`) REFERENCES `produto` (`id_produto`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Restrições para tabelas `produto`
--
ALTER TABLE `produto`
  ADD CONSTRAINT `fk_produto_categoria` FOREIGN KEY (`fk_categoria_id_categoria`) REFERENCES `categoria` (`id_categoria`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_produto_fabricante` FOREIGN KEY (`fk_fabricante_id_fabricante`) REFERENCES `fabricante` (`id_fabricante`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
