🚀 GUIA RÁPIDO DE SETUP
========================

## PASSO 1: IMPORTAR DADOS DO BANCO DE DADOS

### Opção A: Via phpMyAdmin (Recomendado)

1. Abra o navegador e acesse:
   http://localhost/phpmyadmin

2. Verifique se o banco "preco_hub" existe
   - Se não existir, crie um novo banco vazio chamado "preco_hub"

3. Selecione o banco "preco_hub"

4. Clique na aba "Importar"

5. Clique em "Escolher arquivo"

6. Procure pelo arquivo: preco_hub.sql
   (Localização: c:\xampp\htdocs\TCC\preco_hub\preco_hub\preco_hub.sql)

7. Clique "Importar"

8. Aguarde a mensagem de sucesso ✅

### Opção B: Via Terminal/Prompt

1. Abra o Prompt de Comando (Windows)
   - Tecle: Windows + R
   - Digite: cmd
   - Pressione: Enter

2. Navegue para a pasta do MySQL:
   cd "C:\xampp\mysql\bin"

3. Execute o comando:
   mysql -u root -p preco_hub < "C:\xampp\htdocs\TCC\preco_hub\preco_hub\preco_hub.sql"

4. Quando pedir senha, deixe em branco e pressione Enter

5. Aguarde a importação terminar


## PASSO 2: VERIFICAR CONFIGURAÇÃO DO BANCO

1. Abra o arquivo:
   c:\xampp\htdocs\TCC\preco_hub\preco_hub\backend\config\db.php

2. Verifique as configurações:
   ```php
   $host = "localhost";      // Deixe assim
   $dbname = "preco_hub";    // Deixe assim
   $user = "root";           // Seu usuário MySQL
   $pass = "";               // Sua senha MySQL (vazio = sem senha)
   ```

3. Se precisar alterar a senha, coloque sua senha entre as aspas duplas


## PASSO 3: INICIAR SERVIDOR

1. Abra o XAMPP Control Panel

2. Clique em "Start" (Iniciar) em:
   - Apache
   - MySQL

3. Aguarde ambos ficarem verdes (rodando)


## PASSO 4: ACESSAR O SITE

No navegador, acesse:
http://localhost/TCC/preco_hub/preco_hub/


## PASSO 5: TESTAR AS FUNCIONALIDADES

### 🔍 Teste 1: Buscador
1. Clique em "Buscar" na navbar
2. Digite: "Arroz"
3. Clique em "Buscar"
4. Deve aparecer 3 resultados com preços diferentes
5. Veja o badge verde "Economize até R$ 1,60"

### 🎯 Teste 2: Filtros
1. Ainda na página de busca
2. Filtre por categoria: "Café"
3. Filtre por mercado: "Savegnago"
4. Clique "Buscar" novamente
5. Deve mostrar 1 resultado (café no Savegnago)

### 📊 Teste 3: Comparador
1. Clique em "Comparador" na navbar
2. Veja os 4 cards de estatísticas no topo
3. Veja os 3 gráficos carregarem
4. Passe o mouse nos gráficos para ver valores
5. Consulte a tabela com todos os preços

### 💰 Teste 4: Economia
1. Veja na tabela do Comparador o Arroz:
   - Savegnago: R$ 29,90 (verde - melhor preço)
   - Favetta: R$ 31,50
   - Pague Menos: R$ 30,20
   - Economia: R$ 1,60

### 📈 Teste 5: Gráficos
1. No Comparador, veja:
   - Gráfico de Linhas: mostra as 3 linhas dos mercados
   - Gráfico de Barras: mostra a economia por produto
   - Gráfico de Pizza: mostra a proporção de preços


## 🧪 DADOS DE TESTE INCLUSOS

Estão pronto para usar:

8 Produtos:
- Arroz Tio João Integral 5kg
- Feijão Carioca Kicaldo 1kg
- Macarrão Integral Barilla 500g
- Café Pilão Tradicional 500g
- Leite Integral Italac 1L
- Óleo de Soja Liza 900ml
- Farinha de Trigo Dona Benta 1kg
- Suco Del Valle Uva 1L

3 Mercados:
- Savegnago
- Favetta
- Pague Menos

Economias de R$ 0,40 a R$ 1,60 por produto


## 📱 TESTAR EM MOBILE

1. No navegador, abra as ferramentas de desenvolvedor:
   - Pressione: F12

2. Clique no ícone de dispositivo mobile:
   - Ícone no canto superior esquerdo

3. Selecione um dispositivo mobile

4. Recarregue a página (F5)

5. Veja o layout se adaptar para mobile


## ⚠️ PROBLEMAS COMUNS

### "Erro na conexão com o banco"
- Verifique se MySQL está rodando no XAMPP
- Verifique as credenciais em backend/config/db.php
- Verifique se o banco "preco_hub" existe

### "Tabela não encontrada"
- Reimporte o preco_hub.sql
- Verifique se a importação terminou com sucesso

### "Nenhum resultado na busca"
- Verifique se os dados foram importados
- Tente buscar "Arroz" (maiúscula/minúscula não importa)
- Veja em phpMyAdmin se a tabela produto tem registros

### "Gráficos não aparecem"
- Verifique a conexão com internet (Chart.js é via CDN)
- Abra o console do navegador (F12 > Console)
- Procure por erros

### "Botão de Adicionar à Lista não funciona"
- O produto foi salvo no localStorage do navegador
- Vá para "Minha Lista" para ver
- A lista é local e será apagada se limpar cache


## 📚 DOCUMENTAÇÃO

Para entender melhor cada funcionalidade:

1. Leia: readme.md
2. Acesse: guia.html (no navegador)
3. Consulte: IMPLEMENTACAO.md (texto técnico)
4. Veja: VERIFICACAO.txt (este arquivo)


## 🎯 PRÓXIMOS PASSOS

1. Teste todas as funcionalidades
2. Teste em dispositivos diferentes
3. Teste a responsividade (mobile)
4. Prepare sua apresentação
5. Considere adicionar mais produtos (em Adicionar Produto)


## ✅ CHECKLIST FINAL

Antes de apresentar, verifique:

☐ MySQL está rodando
☐ Apache está rodando
☐ Dados foram importados
☐ Página inicial carrega
☐ Busca funciona
☐ Comparador mostra gráficos
☐ Filtros funcionam
☐ Economia calcula corretamente
☐ Links na navbar estão todos funcionando
☐ Mobile responsivo funciona
☐ Nenhum erro no console (F12)


## 🚀 PRONTO!

Seu site de comparação de preços está 100% funcional!

Se tiver dúvidas, consulte:
- guia.html (tutorial visual)
- readme.md (documentação)
- IMPLEMENTACAO.md (detalhes técnicos)

Boa apresentação! 🎉
