const STORAGE_PRODUTOS = "produtosCadastrados";
const API_LISTAR_PRODUTOS = "backend/produtos/listar.php";
const API_LISTAR_CATEGORIAS = "backend/categorias/listar.php";
const API_ADICIONAR_LISTA = "backend/listas/adicionar.php";

let categoriaFiltroSelecionada = "";

function escaparHtml(valor) {
    return String(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function normalizarTexto(texto) {
    return String(texto)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

const LOGOS_MERCADOS = {
    "delta": "assets/img/logo%20mercados/Logo%20Delta.png",
    "favetta": "assets/img/logo%20mercados/Logo%20Favetta.png",
    "pague menos": "assets/img/logo%20mercados/Logo%20Pague%20Menos.png",
    "savegnago": "assets/img/logo%20mercados/Logo%20Savegnago.png"
};

function normalizarChaveMercado(nomeMercado) {
    return normalizarTexto(nomeMercado || "")
        .replace(/\s+/g, " ")
        .trim();
}

function obterLogoMercado(nomeMercado) {
    return LOGOS_MERCADOS[normalizarChaveMercado(nomeMercado)] || "";
}

function renderizarNomeMercadoComLogo(nomeMercado) {
    const mercadoSeguro = escaparHtml(nomeMercado || "Mercado");
    const logoMercado = obterLogoMercado(nomeMercado);

    return `
        <span class="mercado-nome-com-logo">
            ${logoMercado ? `<img src="${logoMercado}" class="mercado-logo-card" alt="" loading="lazy" decoding="async" aria-hidden="true">` : ""}
            <span>${mercadoSeguro}</span>
        </span>
    `;
}

function formatarPreco(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function obterDataAtualizacao(valor) {
    if (!valor) {
        return null;
    }

    const partes = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (!partes) {
        return null;
    }

    return {
        original: valor,
        timestamp: Number(partes[1] + partes[2] + partes[3]),
        formatada: partes[3] + "/" + partes[2] + "/" + partes[1]
    };
}

function atualizarDataProdutos(produtos) {
    const badge = document.getElementById("dataAtualizacaoProdutos");

    if (!badge || !Array.isArray(produtos)) {
        return;
    }

    const dataMaisRecente = produtos.reduce(function (maisRecente, produto) {
        const dataProduto = obterDataAtualizacao(produto.data_atualizacao_produto);

        if (!dataProduto) {
            return maisRecente;
        }

        if (!maisRecente || dataProduto.timestamp > maisRecente.timestamp) {
            return dataProduto;
        }

        return maisRecente;
    }, null);

    if (dataMaisRecente) {
        badge.textContent = "Atualizado dia: " + dataMaisRecente.formatada;
    }
}

function lerProdutosCadastrados() {
    const dados = localStorage.getItem(STORAGE_PRODUTOS);
    return dados ? JSON.parse(dados) : [];
}

function produtoEstaEmDestaque(produto) {
    return produto && (
        produto.destaque === true ||
        produto.destaque_produto === true ||
        produto.destaque_produto === 1 ||
        produto.destaque_produto === "1"
    );
}

function movimentoReduzido() {
    return window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function podeAnimar(elemento) {
    return elemento && typeof elemento.animate === "function" && !movimentoReduzido();
}

function animarEntradaElemento(elemento, indice) {
    if (!podeAnimar(elemento)) {
        return null;
    }

    return elemento.animate([
        { opacity: 0, transform: "translateY(14px) scale(0.98)" },
        { opacity: 1, transform: "translateY(0) scale(1)" }
    ], {
        duration: 260,
        delay: Math.min((indice || 0) * 45, 240),
        easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        fill: "both"
    });
}

function animarFiltroProduto(produto, mostrar) {
    if (!produto) {
        return;
    }

    produto.dataset.filtroVisivel = mostrar ? "1" : "0";

    if (mostrar) {
        if (produto.style.display === "none") {
            produto.style.display = "";
            animarEntradaElemento(produto, 0);
        }
        return;
    }

    if (produto.style.display === "none") {
        return;
    }

    if (!podeAnimar(produto)) {
        produto.style.display = "none";
        return;
    }

    const animacao = produto.animate([
        { opacity: 1, transform: "translateY(0) scale(1)" },
        { opacity: 0, transform: "translateY(8px) scale(0.98)" }
    ], {
        duration: 170,
        easing: "ease",
        fill: "forwards"
    });

    animacao.onfinish = function () {
        if (produto.dataset.filtroVisivel === "0") {
            produto.style.display = "none";
        }
    };
}

function alternarVisibilidadeAnimada(elemento, mostrar) {
    if (!elemento) {
        return;
    }

    elemento.dataset.visivelAnimacao = mostrar ? "1" : "0";

    if (mostrar) {
        if (elemento.classList.contains("d-none")) {
            elemento.classList.remove("d-none");
        }

        animarEntradaElemento(elemento, 0);
        return;
    }

    if (elemento.classList.contains("d-none")) {
        return;
    }

    if (!podeAnimar(elemento)) {
        elemento.classList.add("d-none");
        return;
    }

    const animacao = elemento.animate([
        { opacity: 1, transform: "translateY(0)" },
        { opacity: 0, transform: "translateY(-6px)" }
    ], {
        duration: 160,
        easing: "ease",
        fill: "forwards"
    });

    animacao.onfinish = function () {
        if (elemento.dataset.visivelAnimacao === "0") {
            elemento.classList.add("d-none");
        }
    };
}

async function limparContainerComAnimacao(container) {
    if (!container || container.children.length === 0) {
        if (container) {
            container.innerHTML = "";
        }
        return;
    }

    const itens = Array.from(container.children);

    if (!itens.some(podeAnimar)) {
        container.innerHTML = "";
        return;
    }

    const animacoes = itens.map(function (item, index) {
        if (!podeAnimar(item)) {
            return Promise.resolve();
        }

        const animacao = item.animate([
            { opacity: 1, transform: "translateY(0) scale(1)" },
            { opacity: 0, transform: "translateY(10px) scale(0.98)" }
        ], {
            duration: 150,
            delay: Math.min(index * 18, 120),
            easing: "ease",
            fill: "forwards"
        });

        return animacao.finished.catch(function () {});
    });

    await Promise.all(animacoes);
    container.innerHTML = "";
}

async function buscarProdutosDoBackend() {
    try {
        const response = await fetch(API_LISTAR_PRODUTOS, {
            cache: "no-store",
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error("Falha ao carregar produtos do servidor.");
        }

        const data = await response.json();
        if (!data.success || !Array.isArray(data.data)) {
            throw new Error("Resposta inválida do servidor.");
        }

        return data.data.map(function (produto) {
            return {
                id_produto: produto.id_produto,
                nome: produto.nome_produto,
                marca: produto.nome_fabricante || "",
                imagem: produto.imagem_produto,
                categoria: produto.nome_categoria || "",
                destaque: produtoEstaEmDestaque(produto),
                data_atualizacao_produto: produto.data_atualizacao_produto,
                precos: produto.precos || []
            };
        });
    } catch (error) {
        console.error(error);
        return [];
    }
}

async function buscarCategoriasDoBackend() {
    try {
        const response = await fetch(API_LISTAR_CATEGORIAS, {
            cache: "no-store",
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error("Falha ao carregar categorias.");
        }

        const data = await response.json();

        if (!data.success || !Array.isArray(data.data)) {
            throw new Error("Resposta invalida de categorias.");
        }

        return data.data;
    } catch (error) {
        console.error(error);
        return [];
    }
}

async function atualizarBadgeDataProdutos() {
    const produtosBackend = await buscarProdutosDoBackend();
    atualizarDataProdutos(produtosBackend);

    return produtosBackend;
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

async function adicionarProdutoNaLista(idProduto, nome, botao) {
    if (!idProduto) {
        mostrarAvisoSite("Produto indisponivel", "Nao foi possivel identificar este produto.", "warning");
        return;
    }

    const textoOriginal = botao ? botao.textContent : "";

    if (botao) {
        botao.disabled = true;
        botao.textContent = "Adicionando...";
    }

    try {
        const response = await fetch(API_ADICIONAR_LISTA, {
            method: "POST",
            credentials: "include",
            headers: {
                "Accept": "application/json"
            },
            body: new URLSearchParams({ id_produto: idProduto })
        });
        const data = await response.json();

        if (response.status === 401) {
            throw new Error("Entre na sua conta para salvar produtos na lista.");
        }

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Nao foi possivel adicionar o produto.");
        }

        if (botao) {
            botao.textContent = "Adicionado";
            botao.classList.remove("btn-laranja");
            botao.classList.add("btn-success");
        }

        window.dispatchEvent(new CustomEvent("precohub:lista-atualizada"));
        mostrarAvisoSite("Produto adicionado", nome + " foi adicionado a sua lista.");
    } catch (error) {
        mostrarAvisoSite("Lista nao atualizada", error.message, "warning");

        if (botao) {
            botao.disabled = false;
            botao.textContent = textoOriginal;
        }

        return;
    }

    if (botao) {
        window.setTimeout(function () {
            botao.disabled = false;
            botao.textContent = textoOriginal;
            botao.classList.remove("btn-success");
            botao.classList.add("btn-laranja");
        }, 1400);
    }
}

function ordenarPrecosDosCards() {
    const listas = document.querySelectorAll(".price-list");

    listas.forEach(function (lista) {
        const itens = Array.from(lista.querySelectorAll(".price-item"));

        if (itens.length === 0) {
            return;
        }

        itens.sort(function (a, b) {
            const precoA = parseFloat(a.dataset.preco || "0");
            const precoB = parseFloat(b.dataset.preco || "0");
            return precoA - precoB;
        });

        itens.forEach(function (item) {
            item.classList.remove("lowest-price");
        });

        itens.forEach(function (item, index) {
            if (index === 0) {
                item.classList.add("lowest-price");
            }
            lista.appendChild(item);
        });

        const card = lista.closest(".produto-item");
        if (!card) {
            return;
        }

        const botao = card.querySelector(".adicionar-lista");
        if (!botao) {
            return;
        }

        const melhorItem = itens[0];
        const spans = melhorItem.querySelectorAll("span");

        if (spans.length >= 2) {
            const mercado = spans[0].textContent.trim();
            const preco = parseFloat(melhorItem.dataset.preco || "0");

            botao.dataset.mercado = mercado;
            botao.dataset.preco = preco;
        }
    });
}

function ativarBotoesAdicionar() {
    const botoes = document.querySelectorAll(".adicionar-lista");

    botoes.forEach(function (botao) {
        if (document.body && document.body.dataset.adminPage === "true") {
            botao.disabled = true;
            botao.textContent = "Somente leitura";
            return;
        }

        botao.addEventListener("click", function () {
            const idProduto = botao.dataset.id || "";
            const nome = botao.dataset.nome || "";

            adicionarProdutoNaLista(idProduto, nome, botao);
        });
    });
}

function filtrarProdutos() {
    const campoBusca = document.getElementById("campoBusca");
    const mensagem = document.getElementById("mensagemNenhumResultado");
    const produtos = document.querySelectorAll(".produto-item");

    if (!campoBusca || !mensagem) {
        return;
    }

    const termo = normalizarTexto(campoBusca.value.trim());
    const categoria = normalizarTexto(categoriaFiltroSelecionada);
    let encontrados = 0;

    produtos.forEach(function (produto) {
        const nome = normalizarTexto(produto.dataset.nome || "");
        const marcaProduto = normalizarTexto(produto.dataset.marca || "");
        const categoriaProduto = normalizarTexto(produto.dataset.categoria || "");
        const emDestaque = produto.dataset.destaque === "1";
        const correspondeAoTexto = termo === "" || nome.indexOf(termo) !== -1 || marcaProduto.indexOf(termo) !== -1;
        const correspondeACategoria = categoria === "" || categoriaProduto === categoria;
        const sinalizacaoFiltrado = produto.querySelector(".product-filter-badge");

        if (correspondeAoTexto && correspondeACategoria) {
            animarFiltroProduto(produto, true);
            alternarVisibilidadeAnimada(sinalizacaoFiltrado, !emDestaque && categoria !== "");
            encontrados++;
        } else {
            alternarVisibilidadeAnimada(sinalizacaoFiltrado, false);
            animarFiltroProduto(produto, false);
        }
    });

    alternarVisibilidadeAnimada(mensagem, (termo !== "" || categoria !== "") && encontrados === 0);

    atualizarMensagensSecoes();
}

function atualizarBotaoFiltroCategoria(nomeCategoria) {
    const botao = document.getElementById("botaoFiltrosCategoria");

    if (!botao) {
        return;
    }

    botao.textContent = "Filtrar";
    botao.title = nomeCategoria ? "Filtrando por " + nomeCategoria : "Filtrar por categoria";
    botao.classList.toggle("is-active", Boolean(nomeCategoria));
}

function atualizarIndicadorFiltroProdutos() {
    const indicador = document.getElementById("indicadorFiltroProdutos");

    if (!indicador) {
        return;
    }

    indicador.textContent = categoriaFiltroSelecionada ? "Filtro: " + categoriaFiltroSelecionada : "Filtro ativo";
    alternarVisibilidadeAnimada(indicador, Boolean(categoriaFiltroSelecionada));
}

function selecionarCategoriaFiltro(nomeCategoria) {
    categoriaFiltroSelecionada = nomeCategoria || "";
    atualizarBotaoFiltroCategoria(categoriaFiltroSelecionada);
    atualizarIndicadorFiltroProdutos();
    animarEntradaElemento(document.getElementById("botaoFiltrosCategoria"), 0);

    document.querySelectorAll(".filtro-categoria-opcao").forEach(function (opcao) {
        const ativa = (opcao.dataset.categoria || "") === categoriaFiltroSelecionada;
        opcao.classList.toggle("is-active", ativa);
        opcao.setAttribute("aria-pressed", ativa ? "true" : "false");
    });

    filtrarProdutos();
}

function criarBotaoCategoriaFiltro(nomeCategoria) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.className = "dropdown-item filtro-categoria-opcao";
    botao.dataset.categoria = nomeCategoria;
    botao.textContent = nomeCategoria;
    botao.setAttribute("aria-pressed", "false");

    botao.addEventListener("click", function () {
        selecionarCategoriaFiltro(nomeCategoria);
    });

    return botao;
}

function animarAberturaMenuFiltroCategoria() {
    const menu = document.getElementById("menuFiltrosCategoria");

    if (menu) {
        menu.scrollTop = 0;
    }

    if (!podeAnimar(menu)) {
        return;
    }

    menu.animate([
        { opacity: 0 },
        { opacity: 1 }
    ], {
        duration: 150,
        easing: "ease"
    });

    Array.from(menu.querySelectorAll(".filtro-categoria-opcao, .dropdown-item-text")).forEach(function (item, index) {
        if (!podeAnimar(item)) {
            return;
        }

        item.animate([
            { opacity: 0, transform: "translateX(-8px)" },
            { opacity: 1, transform: "translateX(0)" }
        ], {
            duration: 170,
            delay: Math.min(index * 24, 180),
            easing: "ease",
            fill: "both"
        });
    });
}

async function carregarFiltrosCategoria() {
    const listaCategorias = document.getElementById("listaCategoriasFiltro");

    if (!listaCategorias) {
        return;
    }

    const categorias = await buscarCategoriasDoBackend();
    listaCategorias.innerHTML = "";

    if (categorias.length === 0) {
        listaCategorias.innerHTML = '<span class="dropdown-item-text text-muted">Nenhuma categoria cadastrada.</span>';
        return;
    }

    categorias.forEach(function (categoria) {
        const nomeCategoria = categoria.nome_categoria || "";
        let botao;

        if (!nomeCategoria) {
            return;
        }

        botao = criarBotaoCategoriaFiltro(nomeCategoria);
        listaCategorias.appendChild(botao);
        animarEntradaElemento(botao, listaCategorias.children.length - 1);
    });

    if (categoriaFiltroSelecionada) {
        selecionarCategoriaFiltro(categoriaFiltroSelecionada);
    }
}

function ativarFiltrosCategoria() {
    const botaoFiltro = document.getElementById("botaoFiltrosCategoria");

    document.querySelectorAll(".filtro-categoria-opcao").forEach(function (botao) {
        botao.addEventListener("click", function () {
            selecionarCategoriaFiltro(botao.dataset.categoria || "");
        });
    });

    if (botaoFiltro) {
        botaoFiltro.addEventListener("shown.bs.dropdown", animarAberturaMenuFiltroCategoria);
    }

    carregarFiltrosCategoria();
}

function ativarBusca() {
    const campoBusca = document.getElementById("campoBusca");
    const botaoBusca = document.getElementById("botaoBusca");

    if (botaoBusca) {
        botaoBusca.addEventListener("click", filtrarProdutos);
    }

    if (campoBusca) {
        campoBusca.addEventListener("input", filtrarProdutos);

        campoBusca.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                filtrarProdutos();
            }
        });
    }
}

function criarCardProduto(produto) {
    const coluna = document.createElement("div");
    coluna.className = "col-md-6 col-lg-4 produto-item";
    coluna.dataset.nome = normalizarTexto(produto.nome || "");
    coluna.dataset.marca = normalizarTexto(produto.marca || produto.nome_fabricante || "");
    coluna.dataset.categoria = produto.categoria || produto.nome_categoria || "";
    coluna.dataset.destaque = produtoEstaEmDestaque(produto) ? "1" : "0";

    const precosOrdenados = (produto.precos || []).slice().sort(function (a, b) {
        return Number(a.preco) - Number(b.preco);
    });

    const melhorPreco = precosOrdenados[0];
    const temPrecos = Boolean(melhorPreco);
    const nomeSeguro = escaparHtml(produto.nome || "Produto sem nome");
    const marcaSeguro = escaparHtml(produto.marca || produto.nome_fabricante || "Marca nao informada");
    const imagemSeguro = escaparHtml(produto.imagem || "assets/img/logo/logo.png");
    const destaque = produtoEstaEmDestaque(produto);

    coluna.innerHTML = `
        <div class="card product-card h-100">
            ${destaque ? '<span class="product-card-badge">&#9733; Destaque</span>' : ""}
            <span class="product-filter-badge d-none">Filtrado</span>
            <img src="${imagemSeguro}" class="card-img-top" alt="${nomeSeguro}" loading="lazy" decoding="async">
            <div class="card-body">
                <h5 class="card-title">${nomeSeguro}</h5>
                <p class="product-card-brand">${marcaSeguro}</p>

                <ul class="list-group list-group-flush mt-3 price-list">
                    ${temPrecos ? precosOrdenados.map(function (item, index) {
                        return `
                            <li class="list-group-item d-flex justify-content-between price-item ${index === 0 ? "lowest-price" : ""}" data-preco="${item.preco}">
                                ${renderizarNomeMercadoComLogo(item.mercado || "Mercado")}
                                <span>${formatarPreco(item.preco)}</span>
                            </li>
                        `;
                    }).join("") : `
                        <li class="list-group-item text-muted">
                            Sem precos cadastrados.
                        </li>
                    `}
                </ul>

                <button
                    class="btn btn-laranja w-100 mt-3 adicionar-lista"
                    data-id="${produto.id_produto || ""}"
                    data-nome="${nomeSeguro}"
                    data-preco="${temPrecos ? melhorPreco.preco : 0}"
                    data-mercado="${temPrecos ? escaparHtml(melhorPreco.mercado || "") : ""}"
                    ${temPrecos ? "" : "disabled"}>
                    ${temPrecos ? "Adicionar à lista" : "Indisponivel"}
                </button>
            </div>
        </div>
    `;

    return coluna;
}

function renderizarListaProdutos(container, produtos) {
    if (!container) {
        return;
    }

    const fragmento = document.createDocumentFragment();
    const cards = [];

    produtos.forEach(function (produto) {
        const card = criarCardProduto(produto);
        cards.push(card);
        fragmento.appendChild(card);
    });

    container.appendChild(fragmento);

    cards.forEach(function (card, index) {
        animarEntradaElemento(card, index);
    });
}

function atualizarMensagensSecoes() {
    const campoBusca = document.getElementById("campoBusca");
    const termo = campoBusca ? normalizarTexto(campoBusca.value.trim()) : "";
    const categoria = normalizarTexto(categoriaFiltroSelecionada);
    const filtroAtivo = termo !== "" || categoria !== "";
    const containerDestaques = document.getElementById("listaProdutos");
    const containerOutros = document.getElementById("listaProdutosOutros");
    const mensagemDestaques = document.getElementById("mensagemSemDestaques");
    const mensagemOutros = document.getElementById("mensagemSemOutros");
    const cabecalhoDestaques = document.getElementById("cabecalhoProdutosDestaque");
    const cabecalhoOutros = document.getElementById("cabecalhoProdutosOutros");
    let destaquesVisiveis = [];
    let outrosVisiveis = [];

    document.body.classList.toggle("filtro-produtos-ativo", filtroAtivo);

    if (mensagemDestaques && containerDestaques) {
        const destaques = Array.from(containerDestaques.querySelectorAll(".produto-item"));
        destaquesVisiveis = destaques.filter(function (produto) {
            return produto.dataset.filtroVisivel !== "0" && produto.style.display !== "none";
        });

        if (destaques.length === 0) {
            mensagemDestaques.textContent = "Nenhum produto marcado como destaque.";
            alternarVisibilidadeAnimada(mensagemDestaques, !filtroAtivo);
        } else {
            mensagemDestaques.textContent = "Nenhum destaque encontrado para esta busca.";
            alternarVisibilidadeAnimada(mensagemDestaques, false);
        }
    }

    if (mensagemOutros && containerOutros) {
        const outros = Array.from(containerOutros.querySelectorAll(".produto-item"));
        outrosVisiveis = outros.filter(function (produto) {
            return produto.dataset.filtroVisivel !== "0" && produto.style.display !== "none";
        });

        if (outros.length === 0) {
            mensagemOutros.textContent = "Nenhum outro produto cadastrado.";
            alternarVisibilidadeAnimada(mensagemOutros, !filtroAtivo);
        } else {
            mensagemOutros.textContent = filtroAtivo
                ? "Nenhum outro produto encontrado para este filtro."
                : "Nenhum outro produto cadastrado.";
            alternarVisibilidadeAnimada(mensagemOutros, false);
        }
    }

    if (cabecalhoDestaques) {
        cabecalhoDestaques.classList.toggle("d-none", filtroAtivo);
    }

    if (cabecalhoOutros) {
        cabecalhoOutros.classList.toggle("d-none", filtroAtivo);
    }
}

async function renderizarProdutosDoLocalStorage() {
    const container = document.getElementById("listaProdutos");
    const containerOutros = document.getElementById("listaProdutosOutros");
    if (!container) {
        return;
    }

    const produtosBackend = await atualizarBadgeDataProdutos();
    const produtosLocal = lerProdutosCadastrados();
    const nomesJaRenderizados = new Set();

    const produtosParaRenderizar = [];

    produtosBackend.forEach(function (produto) {
        const nomeNormalizado = normalizarTexto(produto.nome);
        if (nomesJaRenderizados.has(nomeNormalizado)) {
            return;
        }
        nomesJaRenderizados.add(nomeNormalizado);
        produtosParaRenderizar.push(produto);
    });

    produtosLocal.forEach(function (produto) {
        const nomeNormalizado = normalizarTexto(produto.nome);
        if (nomesJaRenderizados.has(nomeNormalizado)) {
            return;
        }
        nomesJaRenderizados.add(nomeNormalizado);
        produtosParaRenderizar.push(produto);
    });

    await Promise.all([
        limparContainerComAnimacao(container),
        containerOutros ? limparContainerComAnimacao(containerOutros) : Promise.resolve()
    ]);

    if (containerOutros) {
        const produtosDestaque = produtosParaRenderizar.filter(produtoEstaEmDestaque);
        const produtosOutros = produtosParaRenderizar.filter(function (produto) {
            return !produtoEstaEmDestaque(produto);
        });

        renderizarListaProdutos(container, produtosDestaque);
        renderizarListaProdutos(containerOutros, produtosOutros);
    } else {
        renderizarListaProdutos(container, produtosParaRenderizar);
    }

    atualizarMensagensSecoes();
}

document.addEventListener("DOMContentLoaded", async function () {
    await renderizarProdutosDoLocalStorage();
    ordenarPrecosDosCards();
    ativarBotoesAdicionar();
    ativarBusca();
    ativarFiltrosCategoria();
});

window.addEventListener("focus", async function () {
    await renderizarProdutosDoLocalStorage();
    ordenarPrecosDosCards();
    ativarBotoesAdicionar();
    filtrarProdutos();
});
