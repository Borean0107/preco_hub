const STORAGE_PRODUTOS = "produtosCadastrados";
const STORAGE_LISTA = "listaProdutos";
const API_LISTAR_PRODUTOS = "backend/produtos/listar.php";

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

function formatarPreco(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function lerProdutosCadastrados() {
    const dados = localStorage.getItem(STORAGE_PRODUTOS);
    return dados ? JSON.parse(dados) : [];
}

function lerListaCompras() {
    const dados = localStorage.getItem(STORAGE_LISTA);
    return dados ? JSON.parse(dados) : [];
}

async function buscarProdutosDoBackend() {
    try {
        const response = await fetch(API_LISTAR_PRODUTOS, {
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
                nome: produto.nome_produto,
                imagem: produto.imagem_produto,
                precos: produto.precos || []
            };
        });
    } catch (error) {
        console.error(error);
        return [];
    }
}

function salvarListaCompras(lista) {
    localStorage.setItem(STORAGE_LISTA, JSON.stringify(lista));
}

function adicionarProdutoNaLista(nome, preco, mercado) {
    const lista = lerListaCompras();

    const novoItem = {
        id: Date.now(),
        nome: nome,
        preco: Number(preco),
        mercado: mercado,
        comprado: false
    };

    lista.push(novoItem);
    salvarListaCompras(lista);

    alert(nome + " foi adicionado à sua lista.");
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
        botao.addEventListener("click", function () {
            const nome = botao.dataset.nome || "";
            const preco = botao.dataset.preco || "0";
            const mercado = botao.dataset.mercado || "";

            adicionarProdutoNaLista(nome, preco, mercado);
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
    let encontrados = 0;

    produtos.forEach(function (produto) {
        const nome = normalizarTexto(produto.dataset.nome || "");

        if (termo === "" || nome.indexOf(termo) !== -1) {
            produto.style.display = "";
            encontrados++;
        } else {
            produto.style.display = "none";
        }
    });

    if (encontrados === 0) {
        mensagem.classList.remove("d-none");
    } else {
        mensagem.classList.add("d-none");
    }
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

    const precosOrdenados = (produto.precos || []).slice().sort(function (a, b) {
        return Number(a.preco) - Number(b.preco);
    });

    const melhorPreco = precosOrdenados[0];
    const temPrecos = Boolean(melhorPreco);
    const nomeSeguro = escaparHtml(produto.nome || "Produto sem nome");
    const imagemSeguro = escaparHtml(produto.imagem || "assets/img/logo/logo.png");

    coluna.innerHTML = `
        <div class="card product-card h-100">
            <img src="${imagemSeguro}" class="card-img-top" alt="${nomeSeguro}">
            <div class="card-body">
                <h5 class="card-title">${nomeSeguro}</h5>

                <ul class="list-group list-group-flush mt-3 price-list">
                    ${temPrecos ? precosOrdenados.map(function (item, index) {
                        const mercadoSeguro = escaparHtml(item.mercado || "Mercado");
                        return `
                            <li class="list-group-item d-flex justify-content-between price-item ${index === 0 ? "lowest-price" : ""}" data-preco="${item.preco}">
                                <span>${mercadoSeguro}</span>
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

function obterNomesDosProdutosFixos() {
    const cards = document.querySelectorAll("#listaProdutos .produto-item");
    const nomes = [];

    cards.forEach(function (card) {
        const nome = card.dataset.nome || "";
        nomes.push(normalizarTexto(nome));
    });

    return nomes;
}

async function renderizarProdutosDoLocalStorage() {
    const container = document.getElementById("listaProdutos");
    if (!container) {
        return;
    }

    const produtosBackend = await buscarProdutosDoBackend();
    const produtosLocal = lerProdutosCadastrados();
    const nomesFixos = obterNomesDosProdutosFixos();
    const nomesJaRenderizados = new Set(nomesFixos);

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

    produtosParaRenderizar.forEach(function (produto) {
        const card = criarCardProduto(produto);
        container.appendChild(card);
    });
}

document.addEventListener("DOMContentLoaded", async function () {
    await renderizarProdutosDoLocalStorage();
    ordenarPrecosDosCards();
    ativarBotoesAdicionar();
    ativarBusca();
});
