const STORAGE_LISTA = "listaProdutos";
const STORAGE_PRODUTOS = "produtosCadastrados";
const API_LISTAR_PRODUTOS = "backend/produtos/listar.php";

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

function lerLista() {
    const dados = localStorage.getItem(STORAGE_LISTA);
    return dados ? JSON.parse(dados) : [];
}

function lerProdutosLocais() {
    try {
        const dados = localStorage.getItem(STORAGE_PRODUTOS);
        const produtos = dados ? JSON.parse(dados) : [];

        return Array.isArray(produtos) ? produtos : [];
    } catch (erro) {
        console.error("Erro ao ler produtos locais:", erro);
        return [];
    }
}

function salvarLista(lista) {
    localStorage.setItem(STORAGE_LISTA, JSON.stringify(lista));
}

function normalizarTexto(texto) {
    return String(texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
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

function normalizarProdutoLocal(produto, indice) {
    return {
        id_produto: produto.id || "local-" + indice,
        nome_produto: produto.nome || produto.nome_produto,
        precos: produto.precos || []
    };
}

async function buscarProdutosComparacao() {
    const produtosLocais = lerProdutosLocais().map(normalizarProdutoLocal);

    try {
        const produtosBackend = await buscarProdutosBackend();
        return produtosBackend.concat(produtosLocais);
    } catch (erro) {
        if (produtosLocais.length > 0) {
            return produtosLocais;
        }

        throw erro;
    }
}

function indexarProdutosPorNome(produtos) {
    const indice = new Map();

    produtos.forEach(function (produto) {
        const nome = normalizarTexto(produto.nome_produto);

        if (nome && !indice.has(nome)) {
            indice.set(nome, produto);
        }
    });

    return indice;
}

function obterAnaliseItem(item, produtosPorNome) {
    const produto = produtosPorNome.get(normalizarTexto(item.nome));
    const precoAtual = Number(item.preco) || 0;

    if (!produto) {
        return {
            mercado: item.mercado,
            preco: precoAtual,
            economia: 0
        };
    }

    const precos = normalizarPrecos(produto.precos);

    if (precos.length === 0) {
        return {
            mercado: item.mercado,
            preco: precoAtual,
            economia: 0
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
        economia: Math.max(maiorPreco.preco - melhorPreco.preco, 0)
    };
}

function limparLista() {
    localStorage.removeItem(STORAGE_LISTA);
    renderizarLista();
}

function removerItem(id) {
    const listaAtualizada = lerLista().filter(function (item) {
        return item.id !== id;
    });

    salvarLista(listaAtualizada);
    renderizarLista();
}

function marcarComprado(id, checked) {
    const listaAtualizada = lerLista().map(function (item) {
        if (item.id === id) {
            return {
                ...item,
                comprado: checked
            };
        }

        return item;
    });

    salvarLista(listaAtualizada);
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
            return total + Number(item.preco);
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
            <p class="mb-0 text-muted">Todos os itens já foram marcados como comprados.</p>
        `;
        return;
    }

    estrategiaContainer.innerHTML = `
        <p class="mb-0 text-muted">Calculando a melhor estrategia...</p>
    `;

    let analises;

    try {
        const produtos = await buscarProdutosComparacao();

        if (renderId !== estrategiaRenderId) {
            return;
        }

        const produtosPorNome = indexarProdutosPorNome(produtos);
        analises = pendentes.map(function (item) {
            return obterAnaliseItem(item, produtosPorNome);
        });
    } catch (erro) {
        console.error(erro);
        analises = pendentes.map(function (item) {
            return {
                mercado: item.mercado,
                preco: Number(item.preco) || 0,
                economia: 0
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
            return soma + Number(item.preco);
        }, 0);

        return {
            mercado: mercado,
            quantidade: itensDoMercado.length,
            subtotal: subtotal
        };
    });

    const economia = analises.reduce(function (total, item) {
        return total + Number(item.economia);
    }, 0);

    estrategiaContainer.innerHTML = `
        <div class="estrategia-box">
            <p class="mb-2">
                <strong>Melhor estratégia:</strong> comprar em <strong>${mercadosUsados.length} mercado(s)</strong>.
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

function ativarEventos() {
    const botoesRemover = document.querySelectorAll(".remover-item");
    const checkboxes = document.querySelectorAll(".checkbox-item");

    botoesRemover.forEach(function (botao) {
        botao.addEventListener("click", function () {
            removerItem(Number(botao.dataset.id));
        });
    });

    checkboxes.forEach(function (checkbox) {
        checkbox.addEventListener("change", function () {
            marcarComprado(Number(checkbox.dataset.id), checkbox.checked);
        });
    });
}

function renderizarLista() {
    const listaContainer = document.getElementById("listaCompras");
    const totalItens = document.getElementById("totalItens");
    const totalPendentes = document.getElementById("totalPendentes");
    const totalPreco = document.getElementById("totalPreco");
    const listaVazia = document.getElementById("listaVazia");
    const btnLimparLista = document.getElementById("limparLista");

    if (!listaContainer || !totalItens || !totalPendentes || !totalPreco || !listaVazia) {
        return;
    }

    const listaOriginal = lerLista();
    const listaOrdenada = ordenarPorMercado(listaOriginal);

    totalItens.textContent = String(listaOriginal.length);

    if (listaOriginal.length === 0) {
        estrategiaRenderId++;
        listaContainer.innerHTML = "";
        listaVazia.classList.remove("d-none");
        totalPendentes.textContent = "0";
        totalPreco.textContent = "R$ 0,00";

        const estrategiaContainer = document.getElementById("estrategiaCompra");
        if (estrategiaContainer) {
            estrategiaContainer.innerHTML = "Ainda não há dados suficientes para calcular a estratégia.";
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
            total += Number(item.preco);
            pendentes++;
        }

        return `
            ${blocoMercado}

            <div class="item-lista d-flex justify-content-between align-items-center flex-wrap gap-3">
                <div class="form-check">
                    <input
                        class="form-check-input checkbox-item"
                        type="checkbox"
                        data-id="${item.id}"
                        ${item.comprado ? "checked" : ""}
                    >

                    <label class="form-check-label ${item.comprado ? "text-decoration-line-through text-muted" : ""}">
                        ${escaparHtml(item.nome)}
                    </label>
                </div>

                <div class="d-flex align-items-center gap-3 flex-wrap">
                    <span class="fw-semibold">${formatarPreco(item.preco)}</span>

                    <button
                        class="btn btn-sm btn-outline-danger remover-item"
                        data-id="${item.id}"
                    >
                        ✕
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
        btnLimparLista.addEventListener("click", function () {
            limparLista();
        });
    }

    renderizarLista();
});
