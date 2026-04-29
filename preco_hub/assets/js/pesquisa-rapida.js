(function () {
    const API_LISTAR_PRODUTOS = "backend/produtos/listar.php";
    const STORAGE_LISTA = "listaProdutos";

    let produtosCache = null;

    function escaparHtml(valor) {
        return String(valor)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function normalizarTexto(texto) {
        return String(texto || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    function formatarPreco(valor) {
        return Number(valor).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    function lerListaCompras() {
        try {
            const dados = localStorage.getItem(STORAGE_LISTA);
            const lista = dados ? JSON.parse(dados) : [];

            return Array.isArray(lista) ? lista : [];
        } catch (error) {
            return [];
        }
    }

    function salvarListaCompras(lista) {
        localStorage.setItem(STORAGE_LISTA, JSON.stringify(lista));
    }

    function mostrarAvisoSite(titulo, texto, tipo) {
        let container = document.getElementById("avisosSite");
        const tipoFinal = tipo || "success";
        const aviso = document.createElement("div");

        if (!container) {
            container = document.createElement("div");
            container.id = "avisosSite";
            container.className = "site-toast-container";
            container.setAttribute("aria-live", "polite");
            container.setAttribute("aria-atomic", "false");
            document.body.appendChild(container);
        }

        aviso.className = "site-toast site-toast-" + tipoFinal;
        aviso.setAttribute("role", "status");
        aviso.innerHTML = `
            <strong>${escaparHtml(titulo)}</strong>
            <span>${escaparHtml(texto)}</span>
        `;

        container.appendChild(aviso);

        aviso.toastTimeout = window.setTimeout(function () {
            aviso.classList.add("is-hiding");
            aviso.addEventListener("animationend", function () {
                aviso.remove();

                if (container.children.length === 0) {
                    container.remove();
                }
            }, { once: true });
        }, 3000);
    }

    function obterPrecosOrdenados(produto) {
        return (produto.precos || [])
            .map(function (preco) {
                return {
                    mercado: preco.mercado || "Mercado",
                    preco: Number(preco.preco)
                };
            })
            .filter(function (preco) {
                return Number.isFinite(preco.preco);
            })
            .sort(function (a, b) {
                return a.preco - b.preco;
            });
    }

    async function carregarProdutos() {
        if (produtosCache) {
            return produtosCache;
        }

        const response = await fetch(API_LISTAR_PRODUTOS, {
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error("Falha ao buscar produtos.");
        }

        const dados = await response.json();

        if (!dados.success || !Array.isArray(dados.data)) {
            throw new Error("Resposta invalida do servidor.");
        }

        produtosCache = dados.data;
        return produtosCache;
    }

    function criarItemResultado(produto) {
        const precos = obterPrecosOrdenados(produto);
        const melhorPreco = precos[0];
        const nomeSeguro = escaparHtml(produto.nome_produto || "Produto sem nome");
        const imagemSegura = escaparHtml(produto.imagem_produto || "assets/img/logo/logo.png");
        const marcaSegura = escaparHtml(produto.nome_fabricante || "Marca nao informada");
        const categoriaSegura = escaparHtml(produto.nome_categoria || "Categoria nao informada");

        return `
            <article class="busca-rapida-item">
                <img src="${imagemSegura}" alt="${nomeSeguro}">
                <div class="busca-rapida-info">
                    <h3>${nomeSeguro}</h3>
                    <small>${marcaSegura} - ${categoriaSegura}</small>
                    ${melhorPreco ? `
                        <strong>${formatarPreco(melhorPreco.preco)}</strong>
                        <span>${escaparHtml(melhorPreco.mercado)}</span>
                    ` : `
                        <span>Sem precos cadastrados</span>
                    `}
                </div>
                <button
                    type="button"
                    class="btn btn-sm btn-laranja busca-rapida-adicionar"
                    data-nome="${nomeSeguro}"
                    data-preco="${melhorPreco ? melhorPreco.preco : 0}"
                    data-mercado="${melhorPreco ? escaparHtml(melhorPreco.mercado) : ""}"
                    ${melhorPreco ? "" : "disabled"}>
                    Adicionar
                </button>
            </article>
        `;
    }

    async function renderizarResultados() {
        const campo = document.getElementById("buscaRapidaCampo");
        const resultados = document.getElementById("buscaRapidaResultados");

        if (!campo || !resultados) {
            return;
        }

        const termo = normalizarTexto(campo.value);

        if (termo.length < 2) {
            resultados.innerHTML = `
                <div class="busca-rapida-vazio">
                    Digite pelo menos 2 caracteres.
                </div>
            `;
            return;
        }

        resultados.innerHTML = `
            <div class="busca-rapida-vazio">
                Buscando...
            </div>
        `;

        try {
            const produtos = await carregarProdutos();
            const encontrados = produtos
                .filter(function (produto) {
                    return normalizarTexto(produto.nome_produto).includes(termo);
                })
                .slice(0, 6);

            if (encontrados.length === 0) {
                resultados.innerHTML = `
                    <div class="busca-rapida-vazio">
                        Nenhum produto encontrado.
                    </div>
                `;
                return;
            }

            resultados.innerHTML = encontrados.map(criarItemResultado).join("");
        } catch (error) {
            console.error(error);
            resultados.innerHTML = `
                <div class="busca-rapida-vazio">
                    Nao foi possivel carregar a busca.
                </div>
            `;
        }
    }

    function adicionarNaLista(botao) {
        const nome = botao.dataset.nome || "";
        const preco = Number(botao.dataset.preco || 0);
        const mercado = botao.dataset.mercado || "";

        if (!nome || !preco || !mercado) {
            return;
        }

        const lista = lerListaCompras();

        lista.push({
            id: Date.now(),
            nome: nome,
            preco: preco,
            mercado: mercado,
            comprado: false
        });

        salvarListaCompras(lista);
        mostrarAvisoSite("Produto adicionado", nome + " foi adicionado a sua lista.");
    }

    function abrirPesquisa() {
        const botao = document.getElementById("buscaRapidaBotao");
        const painel = document.getElementById("buscaRapidaPainel");
        const campo = document.getElementById("buscaRapidaCampo");

        if (!botao || !painel || !campo) {
            return;
        }

        painel.classList.remove("d-none");
        botao.setAttribute("aria-expanded", "true");
        window.setTimeout(function () {
            campo.focus();
        }, 0);
    }

    function fecharPesquisa() {
        const botao = document.getElementById("buscaRapidaBotao");
        const painel = document.getElementById("buscaRapidaPainel");

        if (painel) {
            painel.classList.add("d-none");
        }

        if (botao) {
            botao.setAttribute("aria-expanded", "false");
        }
    }

    function alternarPesquisa() {
        const painel = document.getElementById("buscaRapidaPainel");

        if (!painel) {
            return;
        }

        if (painel.classList.contains("d-none")) {
            abrirPesquisa();
        } else {
            fecharPesquisa();
        }
    }

    function criarPesquisaRapida() {
        const nav = document.querySelector(".navbar-nav");
        const perfilNav = document.getElementById("perfilNav");

        if (!nav || document.getElementById("buscaRapidaNav")) {
            return;
        }

        const item = document.createElement("li");
        item.className = "nav-item busca-rapida-nav";
        item.id = "buscaRapidaNav";
        item.innerHTML = `
            <button
                class="busca-rapida-botao"
                type="button"
                id="buscaRapidaBotao"
                aria-label="Pesquisar produtos"
                aria-expanded="false"
                aria-controls="buscaRapidaPainel">
                <span aria-hidden="true">&#128269;</span>
            </button>

            <div class="busca-rapida-painel d-none" id="buscaRapidaPainel">
                <div class="busca-rapida-topo">
                    <strong>Pesquisar produtos</strong>
                    <button type="button" id="buscaRapidaFechar" aria-label="Fechar pesquisa">&times;</button>
                </div>

                <input
                    type="search"
                    class="form-control"
                    id="buscaRapidaCampo"
                    placeholder="Digite o produto...">

                <div class="busca-rapida-resultados" id="buscaRapidaResultados">
                    <div class="busca-rapida-vazio">
                        Digite pelo menos 2 caracteres.
                    </div>
                </div>
            </div>
        `;

        nav.insertBefore(item, perfilNav || null);
    }

    function registrarEventos() {
        const botao = document.getElementById("buscaRapidaBotao");
        const painel = document.getElementById("buscaRapidaPainel");
        const campo = document.getElementById("buscaRapidaCampo");
        const fechar = document.getElementById("buscaRapidaFechar");
        const resultados = document.getElementById("buscaRapidaResultados");

        if (!botao || !painel || !campo || !fechar || !resultados) {
            return;
        }

        botao.addEventListener("click", function (event) {
            event.stopPropagation();
            alternarPesquisa();
        });

        painel.addEventListener("click", function (event) {
            event.stopPropagation();
        });

        fechar.addEventListener("click", fecharPesquisa);
        campo.addEventListener("input", renderizarResultados);

        resultados.addEventListener("click", function (event) {
            const botaoAdicionar = event.target.closest(".busca-rapida-adicionar");

            if (botaoAdicionar) {
                adicionarNaLista(botaoAdicionar);
            }
        });

        document.addEventListener("click", fecharPesquisa);
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                fecharPesquisa();
            }
        });
    }

    document.addEventListener("DOMContentLoaded", function () {
        if (!document.body || document.body.dataset.site !== "usuario") {
            return;
        }

        criarPesquisaRapida();
        registrarEventos();
    });
})();
