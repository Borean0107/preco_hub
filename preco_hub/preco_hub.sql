-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: May 07, 2026 at 10:49 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `preco_hub`
--

-- --------------------------------------------------------

--
-- Table structure for table `categoria`
--

CREATE TABLE `categoria` (
  `id_categoria` int(11) NOT NULL,
  `nome_categoria` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `categoria`
--

INSERT INTO `categoria` (`id_categoria`, `nome_categoria`) VALUES
(15, 'Achocolatado'),
(9, 'Açúcar'),
(1, 'Arroz'),
(18, 'Bebidas'),
(11, 'Biscoito'),
(4, 'Café'),
(7, 'Farinha'),
(2, 'Feijão'),
(20, 'Frios'),
(13, 'Higiene'),
(19, 'Laticínios'),
(5, 'Leite'),
(12, 'Limpeza'),
(3, 'Macarrão'),
(17, 'Maionese'),
(14, 'Margarina'),
(10, 'Molho'),
(6, 'Óleo'),
(16, 'Sal'),
(8, 'Suco');

-- --------------------------------------------------------

--
-- Table structure for table `fabricante`
--

CREATE TABLE `fabricante` (
  `id_fabricante` int(11) NOT NULL,
  `nome_fabricante` varchar(120) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `lista`
--

CREATE TABLE `lista` (
  `id_lista` int(11) NOT NULL,
  `nome_lista` varchar(120) NOT NULL,
  `data_criacao_lista` datetime NOT NULL DEFAULT current_timestamp(),
  `fk_usuario_id_usuario` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `lista`
--

INSERT INTO `lista` (`id_lista`, `nome_lista`, `data_criacao_lista`, `fk_usuario_id_usuario`) VALUES
(3, 'Minha lista', '2026-05-05 23:04:26', 3);

-- --------------------------------------------------------

--
-- Table structure for table `lista_produto`
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
-- Table structure for table `mercado`
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
-- Dumping data for table `mercado`
--

INSERT INTO `mercado` (`id_mercado`, `nome_mercado`, `cnpj_mercado`, `endereco_mercado`, `bairro_mercado`, `cidade_mercado`, `estado_mercado`) VALUES
(1, 'Savegnago', '00.000.000/0001-01', 'Rua Exemplo, 100', 'Centro', 'Araras', 'SP'),
(2, 'Favetta', '00.000.000/0001-02', 'Av. Exemplo, 200', 'Jardim', 'Araras', 'SP'),
(3, 'Pague Menos', '00.000.000/0001-03', 'Rua Modelo, 300', 'Vila', 'Araras', 'SP'),
(4, 'Delta', NULL, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `mercado_produto`
--

CREATE TABLE `mercado_produto` (
  `fk_mercado_id_mercado` int(11) NOT NULL,
  `fk_produto_id_produto` int(11) NOT NULL,
  `preco_produto_mercado` decimal(10,2) NOT NULL,
  `data_atualizacao_preco` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `disponibilidade_produto` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `produto`
--

CREATE TABLE `produto` (
  `id_produto` int(11) NOT NULL,
  `nome_produto` varchar(150) NOT NULL,
  `descricao_produto` text DEFAULT NULL,
  `imagem_produto` varchar(255) NOT NULL,
  `codigo_barras_produto` varchar(50) DEFAULT NULL,
  `destaque_produto` tinyint(1) NOT NULL DEFAULT 0,
  `fk_categoria_id_categoria` int(11) NOT NULL,
  `fk_fabricante_id_fabricante` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `usuario`
--

CREATE TABLE `usuario` (
  `id_usuario` int(11) NOT NULL,
  `nome_usuario` varchar(120) NOT NULL,
  `email_usuario` varchar(150) NOT NULL,
  `senha_usuario` varchar(255) NOT NULL,
  `data_criacao_usuario` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `usuario`
--

INSERT INTO `usuario` (`id_usuario`, `nome_usuario`, `email_usuario`, `senha_usuario`, `data_criacao_usuario`) VALUES
(3, 'admin', 'admin@gmail.com', '$2y$10$IqcGp03nc2fIbKzVVGqVveokmM8K9Odvr.yDJ10r2MmaT0aRMhubm', '2026-04-29 00:00:00'),
(6, 'teste', 'teste@gmail.com', '$2y$10$BtZ735shxav4Z56MPFNtZ.tKzThhg/pCXLsxpDyfpuZYRntA7Cf5a', '2026-05-07 16:58:40');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `categoria`
--
ALTER TABLE `categoria`
  ADD PRIMARY KEY (`id_categoria`),
  ADD UNIQUE KEY `nome_categoria` (`nome_categoria`);

--
-- Indexes for table `fabricante`
--
ALTER TABLE `fabricante`
  ADD PRIMARY KEY (`id_fabricante`),
  ADD UNIQUE KEY `nome_fabricante` (`nome_fabricante`);

--
-- Indexes for table `lista`
--
ALTER TABLE `lista`
  ADD PRIMARY KEY (`id_lista`),
  ADD UNIQUE KEY `uq_lista_usuario` (`fk_usuario_id_usuario`);

--
-- Indexes for table `lista_produto`
--
ALTER TABLE `lista_produto`
  ADD PRIMARY KEY (`fk_lista_id_lista`,`fk_produto_id_produto`),
  ADD KEY `fk_lista_produto_produto` (`fk_produto_id_produto`);

--
-- Indexes for table `mercado`
--
ALTER TABLE `mercado`
  ADD PRIMARY KEY (`id_mercado`),
  ADD UNIQUE KEY `nome_mercado` (`nome_mercado`);

--
-- Indexes for table `mercado_produto`
--
ALTER TABLE `mercado_produto`
  ADD PRIMARY KEY (`fk_mercado_id_mercado`,`fk_produto_id_produto`),
  ADD KEY `fk_mercado_produto_produto` (`fk_produto_id_produto`),
  ADD KEY `idx_mercado_produto_produto_preco` (`fk_produto_id_produto`,`preco_produto_mercado`);

--
-- Indexes for table `produto`
--
ALTER TABLE `produto`
  ADD PRIMARY KEY (`id_produto`),
  ADD UNIQUE KEY `uq_produto_nome` (`nome_produto`),
  ADD UNIQUE KEY `codigo_barras_produto` (`codigo_barras_produto`),
  ADD KEY `idx_produto_destaque` (`destaque_produto`),
  ADD KEY `fk_produto_categoria` (`fk_categoria_id_categoria`),
  ADD KEY `fk_produto_fabricante` (`fk_fabricante_id_fabricante`);

--
-- Indexes for table `usuario`
--
ALTER TABLE `usuario`
  ADD PRIMARY KEY (`id_usuario`),
  ADD UNIQUE KEY `email_usuario` (`email_usuario`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `categoria`
--
ALTER TABLE `categoria`
  MODIFY `id_categoria` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `fabricante`
--
ALTER TABLE `fabricante`
  MODIFY `id_fabricante` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=156;

--
-- AUTO_INCREMENT for table `lista`
--
ALTER TABLE `lista`
  MODIFY `id_lista` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `mercado`
--
ALTER TABLE `mercado`
  MODIFY `id_mercado` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `produto`
--
ALTER TABLE `produto`
  MODIFY `id_produto` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=162;

--
-- AUTO_INCREMENT for table `usuario`
--
ALTER TABLE `usuario`
  MODIFY `id_usuario` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `lista`
--
ALTER TABLE `lista`
  ADD CONSTRAINT `fk_lista_usuario` FOREIGN KEY (`fk_usuario_id_usuario`) REFERENCES `usuario` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `lista_produto`
--
ALTER TABLE `lista_produto`
  ADD CONSTRAINT `fk_lista_produto_lista` FOREIGN KEY (`fk_lista_id_lista`) REFERENCES `lista` (`id_lista`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_lista_produto_produto` FOREIGN KEY (`fk_produto_id_produto`) REFERENCES `produto` (`id_produto`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `mercado_produto`
--
ALTER TABLE `mercado_produto`
  ADD CONSTRAINT `fk_mercado_produto_mercado` FOREIGN KEY (`fk_mercado_id_mercado`) REFERENCES `mercado` (`id_mercado`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_mercado_produto_produto` FOREIGN KEY (`fk_produto_id_produto`) REFERENCES `produto` (`id_produto`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `produto`
--
ALTER TABLE `produto`
  ADD CONSTRAINT `fk_produto_categoria` FOREIGN KEY (`fk_categoria_id_categoria`) REFERENCES `categoria` (`id_categoria`) ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_produto_fabricante` FOREIGN KEY (`fk_fabricante_id_fabricante`) REFERENCES `fabricante` (`id_fabricante`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
