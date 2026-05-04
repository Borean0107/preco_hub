const API_LISTAR_PRODUTOS = "backend/produtos/listar.php";
const API_LISTA_LISTAR = "backend/listas/listar.php";
const API_LISTA_ADICIONAR = "backend/listas/adicionar.php";
const API_LISTA_REMOVER = "backend/listas/remover.php";
const API_LISTA_MARCAR = "backend/listas/marcar.php";
const API_LISTA_LIMPAR = "backend/listas/limpar.php";
const API_LISTA_QUANTIDADE = "backend/listas/quantidade.php";

let produtosBackendPromise = null;
let estrategiaRenderId = 0;

const ORDEM_MERCADOS = [
    "Savegnago",
    "Favetta",
    "Pague Menos"
];

function formatarPreco(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

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

async function lerJsonSeguro(response) {
    const texto = await response.text();
    const inicioJson = texto.indexOf("{");

    if (inicioJson === -1) {
        throw new Error("Resposta invalida do servidor.");
    }

    return JSON.parse(texto.slice(inicioJson));
}

function obterValorPreco(item) {
    const valor = typeof item === "object" && item !== null ? item.preco : item;
    const numero = Number(valor);

    return Number.isFinite(numero) ? numero : null;
}

function normalizarPrecos(precos) {
    if (!Array.isArray(precos)) {
        return [];
    }

    return precos
        .map(function (preco) {
            return {
                mercado: preco && preco.mercado ? preco.mercado : "",
                preco: obterValorPreco(preco)
            };
        })
        .filter(function (preco) {
            return preco.mercado && preco.preco !== null;
        });
}

async function buscarProdutosBackend() {
    if (!produtosBackendPromise) {
        produtosBackendPromise = fetch(API_LISTAR_PRODUTOS, {
            headers: {
                "Accept": "application/json"
            }
        })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("Falha ao carregar produtos.");
                }

                return response.json();
            })
            .then(function (dados) {
                if (!dados.success || !Array.isArray(dados.data)) {
                    throw new Error("Resposta invalida do servidor.");
                }

                return dados.data;
            })
            .catch(function (erro) {
                produtosBackendPromise = null;
                throw erro;
            });
    }

    return produtosBackendPromise;
}

async function buscarLista() {
    const response = await fetch(API_LISTA_LISTAR, {
        credentials: "include",
        headers: {
            "Accept": "application/json"
        }
    });
    const dados = await lerJsonSeguro(response);

    if (response.status === 401) {
        throw new Error("Entre na sua conta para ver a sua lista.");
    }

    if (!response.ok || !dados.success || !Array.isArray(dados.data)) {
        throw new Error(dados.message || "Nao foi possivel carregar a lista.");
    }

    let lista = dados.data.map(function (item) {
        return {
            id: item.id_lista_produto,
            id_produto: item.id_produto,
            nome: item.nome,
            quantidade: Math.max(Number(item.quantidade) || 1, 1),
            preco: Number(item.preco) || 0,
            mercado: item.mercado || "Mercado",
            comprado: Boolean(item.comprado)
        };
    });

    if (lista.length === 0) {
        const migrou = await migrarListaLocalParaBanco();

        if (migrou) {
            return buscarLista();
        }
    }

    return lista;
}

function obterUsuarioLocal() {
    try {
        const dados = localStorage.getItem("usuarioLogado");
        return dados ? JSON.parse(dados) : null;
    } catch (erro) {
        return null;
    }
}

function lerListaLocalLegada() {
    const usuario = obterUsuarioLocal();
    const chaves = ["listaProdutos"];

    if (usuario && usuario.id) {
        chaves.unshift("listaProdutos:usuario:" + usuario.id);
    }

    for (const chave of chaves) {
        try {
            const dados = localStorage.getItem(chave);
            const lista = dados ? JSON.parse(dados) : [];

            if (Array.isArray(lista) && lista.length > 0) {
                return { chave: chave, lista: lista };
            }
        } catch (erro) {
            localStorage.removeItem(chave);
        }
    }

    return null;
}

async function migrarListaLocalParaBanco() {
    const usuario = obterUsuarioLocal();
    const chaveMigracao = usuario && usuario.id ? "listaMigradaBanco:usuario:" + usuario.id : "";

    if (!chaveMigracao || localStorage.getItem(chaveMigracao)) {
        return false;
    }

    const legado = lerListaLocalLegada();

    if (!legado) {
        localStorage.setItem(chaveMigracao, "1");
        return false;
    }

    const produtos = await buscarProdutosBackend();
    const produtosPorNome = new Map();

    produtos.forEach(function (produto) {
        produtosPorNome.set(normalizarTexto(produto.nome_produto), produto);
    });

    let itensMigrados = 0;
    let itensIgnorados = 0;

    for (const item of legado.lista) {
        const produto = produtosPorNome.get(normalizarTexto(item.nome));
        const quantidade = Math.max(Number(item.quantidade) || 1, 1);

        if (!produto || !produto.id_produto) {
            itensIgnorados++;
            continue;
        }

        for (let i = 0; i < quantidade; i++) {
            await executarAcaoLista(API_LISTA_ADICIONAR, {
                id_produto: produto.id_produto
            });
        }

        itensMigrados++;
    }

    if (itensMigrados === 0) {
        return false;
    }

    if (itensIgnorados === 0) {
        localStorage.setItem(chaveMigracao, "1");
        localStorage.removeItem(legado.chave);
    }

    return true;
}

function indexarProdutosPorId(produtos) {
    const indice = new Map();

    produtos.forEach(function (produto) {
        indice.set(Number(produto.id_produto), produto);
    });

    return indice;
}

function obterAnaliseItem(item, produtosPorId) {
    const produto = produtosPorId.get(Number(item.id_produto));
    const precoAtual = Number(item.preco) || 0;

    if (!produto) {
        return {
            mercado: item.mercado,
            preco: precoAtual,
            economia: 0,
            quantidade: item.quantidade
        };
    }

    const precos = normalizarPrecos(produto.precos);

    if (precos.length === 0) {
        return {
            mercado: item.mercado,
            preco: precoAtual,
            economia: 0,
            quantidade: item.quantidade
        };
    }

    const melhorPreco = precos.reduce(function (melhor, atual) {
        return atual.preco < melhor.preco ? atual : melhor;
    });

    const maiorPreco = precos.reduce(function (maior, atual) {
        return atual.preco > maior.preco ? atual : maior;
    });

    return {
        mercado: melhorPreco.mercado,
        preco: melhorPreco.preco,
        economia: Math.max(maiorPreco.preco - melhorPreco.preco, 0),
        quantidade: item.quantidade
    };
}

async function executarAcaoLista(url, body) {
    const response = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: {
            "Accept": "application/json"
        },
        body: new URLSearchParams(body || {})
    });
    const dados = await lerJsonSeguro(response);

    if (!response.ok || !dados.success) {
        throw new Error(dados.message || "Nao foi possivel atualizar a lista.");
    }

    window.dispatchEvent(new CustomEvent("precohub:lista-atualizada"));
    return dados;
}

async function limparLista() {
    await executarAcaoLista(API_LISTA_LIMPAR);
    renderizarLista();
}

async function removerItem(id) {
    await executarAcaoLista(API_LISTA_REMOVER, {
        id_lista_produto: id
    });
    renderizarLista();
}

async function alterarQuantidade(id, acao) {
    await executarAcaoLista(API_LISTA_QUANTIDADE, {
        id_lista_produto: id,
        acao: acao
    });
    renderizarLista();
}

async function marcarComprado(id, checked) {
    await executarAcaoLista(API_LISTA_MARCAR, {
        id_lista_produto: id,
        comprado: checked ? 1 : 0
    });
    renderizarLista();
}

function obterOrdemMercado(nomeMercado) {
    const indice = ORDEM_MERCADOS.indexOf(nomeMercado);
    return indice === -1 ? 999 : indice;
}

function ordenarPorMercado(lista) {
    return lista.slice().sort(function (a, b) {
        const ordemA = obterOrdemMercado(a.mercado);
        const ordemB = obterOrdemMercado(b.mercado);

        if (ordemA !== ordemB) {
            return ordemA - ordemB;
        }

        return a.nome.localeCompare(b.nome, "pt-BR");
    });
}

function calcularSubtotalMercado(lista, mercado) {
    return lista
        .filter(function (item) {
            return item.mercado === mercado && !item.comprado;
        })
        .reduce(function (total, item) {
            return total + Number(item.preco) * item.quantidade;
        }, 0);
}

async function calcularEstrategia(lista, renderId) {
    const estrategiaContainer = document.getElementById("estrategiaCompra");
    if (!estrategiaContainer) return;

    const pendentes = lista.filter(function (item) {
        return !item.comprado;
    });

    if (pendentes.length === 0) {
        estrategiaContainer.innerHTML = `
            <p class="mb-0 text-muted">Todos os itens ja foram marcados como comprados.</p>
        `;
        return;
    }

    estrategiaContainer.innerHTML = `
        <p class="mb-0 text-muted">Calculando a melhor estrategia...</p>
    `;

    let analises;

    try {
        const produtos = await buscarProdutosBackend();

        if (renderId !== estrategiaRenderId) {
            return;
        }

        const produtosPorId = indexarProdutosPorId(produtos);
        analises = pendentes.map(function (item) {
            return obterAnaliseItem(item, produtosPorId);
        });
    } catch (erro) {
        console.error(erro);
        analises = pendentes.map(function (item) {
            return {
                mercado: item.mercado,
                preco: Number(item.preco) || 0,
                economia: 0,
                quantidade: item.quantidade
            };
        });
    }

    const mercadosUsados = [...new Set(
        analises.map(function (item) {
            return item.mercado;
        }).filter(Boolean)
    )];

    const grupos = mercadosUsados.map(function (mercado) {
        const itensDoMercado = analises.filter(function (item) {
            return item.mercado === mercado;
        });

        const subtotal = itensDoMercado.reduce(function (soma, item) {
            return soma + Number(item.preco) * item.quantidade;
        }, 0);

        const quantidade = itensDoMercado.reduce(function (soma, item) {
            return soma + item.quantidade;
        }, 0);

        return {
            mercado: mercado,
            quantidade: quantidade,
            subtotal: subtotal
        };
    });

    const economia = analises.reduce(function (total, item) {
        return total + Number(item.economia) * item.quantidade;
    }, 0);

    estrategiaContainer.innerHTML = `
        <div class="estrategia-box">
            <p class="mb-2">
                <strong>Melhor estrategia:</strong> comprar em <strong>${mercadosUsados.length} mercado(s)</strong>.
            </p>

            <p class="mb-3">
                <strong>Economia estimada:</strong>
                <span class="texto-economia">${formatarPreco(economia)}</span>
            </p>

            <div class="d-flex flex-column gap-2">
                ${grupos.map(function (grupo) {
                    return `
                        <div class="estrategia-item">
                            <strong>${escaparHtml(grupo.mercado)}</strong> - ${grupo.quantidade} item(ns) - ${formatarPreco(grupo.subtotal)}
                        </div>
                    `;
                }).join("")}
            </div>
        </div>
    `;
}

function mostrarErroLista(mensagem) {
    const listaContainer = document.getElementById("listaCompras");
    const listaVazia = document.getElementById("listaVazia");
    const btnLimparLista = document.getElementById("limparLista");

    if (listaContainer) {
        listaContainer.innerHTML = "";
    }

    if (listaVazia) {
        listaVazia.textContent = mensagem;
        listaVazia.className = "alert alert-warning";
    }

    if (btnLimparLista) {
        btnLimparLista.disabled = true;
    }
}

function obterModalConfirmacaoLista() {
    let modal = document.getElementById("modalConfirmacaoLista");

    if (modal) {
        return modal;
    }

    modal = document.createElement("div");
    modal.id = "modalConfirmacaoLista";
    modal.className = "modal-lista-confirmacao d-none";
    modal.innerHTML = `
        <div class="modal-lista-backdrop" data-modal-fechar="true"></div>
        <div class="modal-lista-card" role="dialog" aria-modal="true" aria-labelledby="modalListaTitulo">
            <div class="modal-lista-icone" aria-hidden="true">!</div>
            <h2 id="modalListaTitulo">Confirmar ação</h2>
            <p id="modalListaTexto">Tem certeza?</p>
            <div class="modal-lista-acoes">
                <button type="button" class="btn btn-outline-secondary" id="modalListaCancelar">Cancelar</button>
                <button type="button" class="btn btn-danger" id="modalListaConfirmar">Confirmar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    return modal;
}

function confirmarAcaoLista(opcoes) {
    const modal = obterModalConfirmacaoLista();
    const titulo = document.getElementById("modalListaTitulo");
    const texto = document.getElementById("modalListaTexto");
    const botaoCancelar = document.getElementById("modalListaCancelar");
    const botaoConfirmar = document.getElementById("modalListaConfirmar");

    titulo.textContent = opcoes.titulo || "Confirmar acao";
    texto.textContent = opcoes.texto || "Tem certeza que deseja continuar?";
    botaoConfirmar.textContent = opcoes.confirmar || "Confirmar";

    modal.classList.remove("d-none");
    document.body.classList.add("modal-lista-aberto");

    return new Promise(function (resolve) {
        function fechar(confirmado) {
            modal.classList.add("d-none");
            document.body.classList.remove("modal-lista-aberto");
            botaoCancelar.removeEventListener("click", cancelar);
            botaoConfirmar.removeEventListener("click", confirmar);
            modal.removeEventListener("click", clicarFora);
            document.removeEventListener("keydown", teclar);
            resolve(confirmado);
        }

        function cancelar() {
            fechar(false);
        }

        function confirmar() {
            fechar(true);
        }

        function clicarFora(event) {
            if (event.target && event.target.dataset.modalFechar === "true") {
                fechar(false);
            }
        }

        function teclar(event) {
            if (event.key === "Escape") {
                fechar(false);
            }
        }

        botaoCancelar.addEventListener("click", cancelar);
        botaoConfirmar.addEventListener("click", confirmar);
        modal.addEventListener("click", clicarFora);
        document.addEventListener("keydown", teclar);
        botaoCancelar.focus();
    });
}

function ativarEventos() {
    document.querySelectorAll(".remover-item").forEach(function (botao) {
        botao.addEventListener("click", async function () {
            const confirmado = await confirmarAcaoLista({
                titulo: "Remover item",
                texto: "Este produto sera removido da sua lista de compras.",
                confirmar: "Remover"
            });

            if (confirmado) {
                await removerItem(botao.dataset.id);
            }
        });
    });

    document.querySelectorAll(".quantidade-item").forEach(function (botao) {
        botao.addEventListener("click", function () {
            alterarQuantidade(botao.dataset.id, botao.dataset.acao);
        });
    });

    document.querySelectorAll(".checkbox-item").forEach(function (checkbox) {
        checkbox.addEventListener("change", function () {
            marcarComprado(checkbox.dataset.id, checkbox.checked);
        });
    });
}

async function renderizarLista() {
    const listaContainer = document.getElementById("listaCompras");
    const totalItens = document.getElementById("totalItens");
    const totalPendentes = document.getElementById("totalPendentes");
    const totalPreco = document.getElementById("totalPreco");
    const listaVazia = document.getElementById("listaVazia");
    const btnLimparLista = document.getElementById("limparLista");

    if (!listaContainer || !totalItens || !totalPendentes || !totalPreco || !listaVazia) {
        return;
    }

    listaContainer.innerHTML = '<p class="mb-0 text-muted">Carregando sua lista...</p>';

    let listaOriginal = [];

    try {
        listaOriginal = await buscarLista();
    } catch (erro) {
        console.error(erro);
        estrategiaRenderId++;
        totalItens.textContent = "0";
        totalPendentes.textContent = "0";
        totalPreco.textContent = "R$ 0,00";
        mostrarErroLista(erro.message);
        return;
    }

    const listaOrdenada = ordenarPorMercado(listaOriginal);
    const totalQuantidade = listaOriginal.reduce(function (soma, item) {
        return soma + item.quantidade;
    }, 0);

    totalItens.textContent = String(totalQuantidade);

    if (listaOriginal.length === 0) {
        estrategiaRenderId++;
        listaContainer.innerHTML = "";
        listaVazia.classList.remove("d-none");
        totalPendentes.textContent = "0";
        totalPreco.textContent = "R$ 0,00";

        const estrategiaContainer = document.getElementById("estrategiaCompra");
        if (estrategiaContainer) {
            estrategiaContainer.innerHTML = "Ainda nao ha dados suficientes para calcular a estrategia.";
        }

        if (btnLimparLista) {
            btnLimparLista.disabled = true;
        }

        return;
    }

    listaVazia.classList.add("d-none");

    if (btnLimparLista) {
        btnLimparLista.disabled = false;
    }

    let total = 0;
    let pendentes = 0;
    let mercadoAtual = "";

    listaContainer.innerHTML = listaOrdenada.map(function (item) {
        const mostrarTituloMercado = item.mercado !== mercadoAtual;
        let blocoMercado = "";

        if (mostrarTituloMercado) {
            const subtotalMercado = calcularSubtotalMercado(listaOriginal, item.mercado);

            blocoMercado = `
                <div class="mercado-bloco mt-4 mb-2">
                    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <h5 class="text-marrom fw-bold mb-0">${escaparHtml(item.mercado)}</h5>
                        <span class="badge-subtotal">
                            Subtotal: ${formatarPreco(subtotalMercado)}
                        </span>
                    </div>
                </div>
            `;
        }

        mercadoAtual = item.mercado;

        if (!item.comprado) {
            total += Number(item.preco) * item.quantidade;
            pendentes += item.quantidade;
        }

        return `
            ${blocoMercado}

            <div class="item-lista d-flex justify-content-between align-items-center flex-wrap gap-3">
                <div class="form-check">
                    <input
                        class="form-check-input checkbox-item"
                        type="checkbox"
                        data-id="${escaparHtml(item.id)}"
                        ${item.comprado ? "checked" : ""}
                    >

                    <label class="form-check-label ${item.comprado ? "text-decoration-line-through text-muted" : ""}">
                        ${escaparHtml(item.nome)}
                    </label>
                </div>

                <div class="d-flex align-items-center gap-2 flex-wrap lista-item-acoes">
                    <span class="fw-semibold">${formatarPreco(item.preco * item.quantidade)}</span>
                    <small class="text-muted">(${formatarPreco(item.preco)} un.)</small>

                    <div class="btn-group btn-group-sm" role="group" aria-label="Quantidade">
                        <button type="button" class="btn btn-outline-secondary quantidade-item" data-id="${escaparHtml(item.id)}" data-acao="diminuir">-</button>
                        <span class="btn btn-outline-secondary disabled">x${item.quantidade}</span>
                        <button type="button" class="btn btn-outline-secondary quantidade-item" data-id="${escaparHtml(item.id)}" data-acao="aumentar">+</button>
                    </div>

                    <button
                        class="btn btn-sm btn-outline-danger remover-item"
                        data-id="${escaparHtml(item.id)}"
                    >
                        Remover
                    </button>
                </div>
            </div>
        `;
    }).join("");

    totalPendentes.textContent = String(pendentes);
    totalPreco.textContent = formatarPreco(total);

    estrategiaRenderId++;
    calcularEstrategia(listaOriginal, estrategiaRenderId);
    ativarEventos();
}

document.addEventListener("DOMContentLoaded", function () {
    const btnLimparLista = document.getElementById("limparLista");

    if (btnLimparLista) {
        btnLimparLista.addEventListener("click", async function () {
            const confirmado = await confirmarAcaoLista({
                titulo: "Limpar lista",
                texto: "Todos os itens serao removidos da sua lista.",
                confirmar: "Limpar lista"
            });

            if (confirmado) {
                await limparLista();
            }
        });
    }

    renderizarLista();
});
