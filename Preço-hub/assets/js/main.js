const STORAGE_PRODUTOS = "produtosCadastrados";
const STORAGE_LISTA = "listaProdutos";

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
    coluna.dataset.nome = normalizarTexto(produto.nome);

    const precosOrdenados = produto.precos.slice().sort(function (a, b) {
        return Number(a.preco) - Number(b.preco);
    });

    const melhorPreco = precosOrdenados[0];

    coluna.innerHTML = `
        <div class="card product-card h-100">
            <img src="${produto.imagem}" class="card-img-top" alt="${produto.nome}">
            <div class="card-body">
                <h5 class="card-title">${produto.nome}</h5>

                <ul class="list-group list-group-flush mt-3 price-list">
                    ${precosOrdenados.map(function (item, index) {
                        return `
                            <li class="list-group-item d-flex justify-content-between price-item ${index === 0 ? "lowest-price" : ""}" data-preco="${item.preco}">
                                <span>${item.mercado}</span>
                                <span>${formatarPreco(item.preco)}</span>
                            </li>
                        `;
                    }).join("")}
                </ul>

                <button
                    class="btn btn-laranja w-100 mt-3 adicionar-lista"
                    data-nome="${produto.nome}"
                    data-preco="${melhorPreco.preco}"
                    data-mercado="${melhorPreco.mercado}">
                    Adicionar à lista
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

function renderizarProdutosDoLocalStorage() {
    const container = document.getElementById("listaProdutos");
    if (!container) {
        return;
    }

    const produtos = lerProdutosCadastrados();
    const nomesFixos = obterNomesDosProdutosFixos();

    produtos.forEach(function (produto) {
        const nomeNormalizado = normalizarTexto(produto.nome);

        if (nomesFixos.indexOf(nomeNormalizado) !== -1) {
            return;
        }

        const card = criarCardProduto(produto);
        container.appendChild(card);
    });
}

document.addEventListener("DOMContentLoaded", function () {
    renderizarProdutosDoLocalStorage();
    ordenarPrecosDosCards();
    ativarBotoesAdicionar();
    ativarBusca();
});