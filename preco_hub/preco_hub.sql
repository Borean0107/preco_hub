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
