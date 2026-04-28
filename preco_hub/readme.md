# Preço-Hub - Comparador Inteligente de Preços

Uma aplicação web completa para comparação de preços entre mercados, permitindo que usuários encontrem as melhores ofertas e economizem em suas compras.

## 🎯 Objetivo

Facilitar a busca e comparação de preços de produtos entre diferentes mercados de uma cidade, ajudando consumidores a economizar em suas compras do dia a dia.

## 🚀 Novas Funcionalidades Implementadas (ABRIL 2026)

### 1. **🔍 Buscador Avançado**
- Busca por nome do produto (mínimo 2 caracteres)
- Filtros por categoria, mercado e faixa de preço
- Exibição automática do melhor preço
- Cálculo de economia por produto
- Adição rápida à lista de compras

**Acesso:** `busca.html`

### 2. **📊 Comparador Visual**
- Tabela comparativa com todos os produtos
- Resumo de estatísticas (economia total, máxima, média)
- Identificação do mercado mais barato
- Três gráficos interativos com Chart.js:
  - Gráfico de Linhas: Comparação de preços
  - Gráfico de Barras: Economia por produto
  - Gráfico de Pizza: Distribuição por mercado

**Acesso:** `comparador.html`

### 3. **💰 Cálculo Automático de Economia**
- Calcula diferença entre melhor e pior preço automaticamente
- Exibe economia potencial em cada produto
- Agrupa estatísticas gerais
- Destaca em verde os melhores preços

### 4. **🎛️ Filtros de Busca Avançados**
- **Categoria:** Arroz, Feijão, Macarrão, Café, Leite, Óleo, Farinha, Suco
- **Mercado:** Savegnago, Favetta, Pague Menos
- **Faixa de Preço:** Mínimo e máximo personalizáveis
- Filtros completamente combinables

### 5. **📈 Gráficos e Análises Visuais**
- Utiliza Chart.js para visualizações profissionais
- Gráficos totalmente responsivos e interativos
- Informações ao passar o mouse
- Ajuda na tomada de decisões inteligentes

### 6. **🗄️ Base de Dados Populada com Dados Reais**
- 8 produtos em diferentes categorias
- 3 mercados com preços variados realistas
- Dados de exemplo para testes imediatos
- Fácil expansão com novos produtos

## 📁 Estrutura Completa

```
preco_hub/
├── PÁGINAS
├── index.html                 # Homepage
├── busca.html                 # Página de busca (NOVO)
├── comparador.html            # Página de comparador (NOVO)
├── guia.html                  # Guia de funcionalidades (NOVO)
├── lista.html                 # Lista de compras
├── adicionar-produto.html     # Adicionar produtos
├── importar.html              # Importar dados
├── login.html                 # Login
├── cadastro.html              # Cadastro
│
├── assets/
│   ├── css/
│   │   └── style.css          # Estilos profissionais Bootstrap
│   ├── js/
│   │   ├── main.js            # Lógica principal
│   │   ├── lista.js           # Gerenciamento de lista
│   │   ├── busca.js           # Lógica de busca (NOVO)
│   │   ├── comparador.js      # Lógica de comparador (NOVO)
│   │   ├── perfil.js          # Gerenciamento de perfil
│   │   ├── auth/
│   │   │   ├── login.js
│   │   │   └── cadastro.js
│   │   └── importar.js
│   └── img/
│       ├── logo/
│       └── produtos/
│
├── backend/
│   ├── config/
│   │   ├── db.php             # Configuração do banco
│   │   └── session.php        # Gerenciamento de sessão
│   ├── helpers/
│   │   └── response.php       # Funções JSON
│   ├── auth/
│   │   ├── login.php
│   │   ├── logout.php
│   │   ├── register.php
│   │   └── me.php
│   ├── produtos/
│   │   ├── listar.php         # Listar todos
│   │   ├── buscar.php         # Busca avançada (NOVO)
│   │   ├── salvar.php         # Salvar novo
│   │   └── remover.php        # Remover
│   ├── listas/
│   │   ├── adicionar.php
│   │   ├── listar.php
│   │   ├── marcar.php
│   │   ├── remover.php
│   │   └── limpar.php
│   ├── importar/
│   │   └── importar.php
│   └── middleware/
│       └── auth.php
│
├── storage/sessions/          # Sessões de usuários
└── preco_hub.sql              # Banco com dados populados
```

## 🔧 Configuração Rápida

### 1. Preparar Banco de Dados
```bash
# No phpMyAdmin: Importe preco_hub.sql
# Ou no terminal:
mysql -u root -p preco_hub < preco_hub.sql
```

### 2. Configurar Conexão
Edite `backend/config/db.php`:
```php
$host = "localhost";
$dbname = "preco_hub";
$user = "root";
$pass = "";
```

### 3. Acessar
```
http://localhost/TCC/preco_hub/preco_hub/index.html
```

## 📚 Como Usar as Funcionalidades

### **🔍 Buscar Produtos**
1. Clique em "Buscar" na navbar
2. Digite o nome (ex: "Arroz")
3. Refine com filtros (categoria, mercado, preço)
4. Clique "Buscar"
5. Selecione o melhor preço e adicione à lista

### **📊 Comparar Visualmente**
1. Clique em "Comparador"
2. Veja resumo de economia
3. Analise 3 gráficos interativos
4. Consulte tabela completa de preços
5. Identifique mercado mais barato

### **💰 Ver Economia**
- Badge verde mostra economia por produto
- Comparador exibe economia total/máxima/média
- Preços destacados mostram melhor opção

### **🎛️ Usar Filtros**
Combine para resultados precisos:
- Categoria (8 categorias)
- Mercado (3 mercados)
- Faixa de preço (personalizável)

## 🔌 Endpoints da API

### Buscar com Filtros (NOVO)
```
GET /backend/produtos/buscar.php?termo=arroz&categoria=Arroz&preco_min=10&preco_max=50
```

### Listar Todos
```
GET /backend/produtos/listar.php
```

### Salvar Novo Produto
```
POST /backend/produtos/salvar.php
Body: form-data (nome, marca, categoria, preços, imagem)
```

## 🎨 Tecnologias Utilizadas

- **Frontend:** HTML5, Bootstrap 5, CSS3, JavaScript ES6
- **Gráficos:** Chart.js (biblioteca profissional)
- **Backend:** PHP 8.0+, PDO
- **Banco:** MySQL/MariaDB
- **Armazenamento:** LocalStorage (lista local)

## ✨ Destaques

✅ Interface limpa e intuitiva
✅ Responsivo para mobile/tablet/desktop
✅ Busca avançada com múltiplos filtros
✅ Visualizações profissionais com gráficos
✅ Cálculo automático de economia
✅ Lista de compras persistente
✅ Autenticação de usuários
✅ Upload de produtos com imagens
✅ Dados reais para testes

## 📊 Dados de Teste Inclusos

**8 Produtos:**
Arroz, Feijão, Macarrão, Café, Leite, Óleo, Farinha, Suco

**3 Mercados:**
Savegnago, Favetta, Pague Menos (com preços variados)

**Economias:**
De R$ 0,40 a R$ 1,60 por produto

## 🔐 Segurança

- Validação backend
- Prepared statements
- XSS protection
- SQL injection prevention
- Tratamento de erros

## 📖 Documentação Completa

Consulte `guia.html` para tutorial interativo de uso!

---

**TCC 2026 - Desenvolvido com ❤️ para economizar sua grana!**