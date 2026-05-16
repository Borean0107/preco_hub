const API_LISTAR_PRODUTOS = "backend/produtos/listar.php";
const API_LISTA_LISTAR = "backend/listas/listar.php";
const API_LISTA_ADICIONAR = "backend/listas/adicionar.php";
const API_LISTA_REMOVER = "backend/listas/remover.php";
const API_LISTA_MARCAR = "backend/listas/marcar.php";
const API_LISTA_LIMPAR = "backend/listas/limpar.php";
const API_LISTA_QUANTIDADE = "backend/listas/quantidade.php";

let produtosBackendPromise = null;
let estrategiaRenderId = 0;
let listaAtualPdf = [];

const ORDEM_MERCADOS = [
    "Savegnago",
    "Favetta",
    "Pague Menos"
];

const LOGOS_MERCADOS = {
    "delta": "assets/img/logo%20mercados/Logo%20Delta.png",
    "favetta": "assets/img/logo%20mercados/Logo%20Favetta.png",
    "pague menos": "assets/img/logo%20mercados/Logo%20Pague%20Menos.png",
    "savegnago": "assets/img/logo%20mercados/Logo%20Savegnago.png"
};

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

function obterLogoMercado(nomeMercado) {
    return LOGOS_MERCADOS[normalizarTexto(nomeMercado)] || "";
}

function renderizarTituloMercadoComLogo(nomeMercado) {
    const mercadoSeguro = escaparHtml(nomeMercado || "Mercado");
    const logoMercado = obterLogoMercado(nomeMercado);

    return `
        <span class="mercado-titulo-com-logo">
            ${logoMercado ? `<img src="${logoMercado}" class="mercado-logo-checklist" alt="" loading="lazy" decoding="async" aria-hidden="true">` : ""}
            <span>${mercadoSeguro}</span>
        </span>
    `;
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
            marca: item.marca || item.nome_fabricante || "",
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

async function removerItem(id, elementoOrigem) {
    const itemAnimado = iniciarAnimacaoItemLista(elementoOrigem, "lista-item-removendo", "lista-controle-pulso");
    const animacaoMinima = aguardarAnimacaoLista(240);

    try {
        await executarAcaoLista(API_LISTA_REMOVER, {
            id_lista_produto: id
        });
        await animacaoMinima;
        renderizarLista({
            mostrarCarregando: false,
            preservarRolagem: true
        });
    } catch (erro) {
        limparAnimacaoItemLista(itemAnimado, elementoOrigem, "lista-controle-pulso");
        throw erro;
    }
}

async function alterarQuantidade(id, acao, elementoOrigem) {
    const itemAnimado = iniciarAnimacaoItemLista(elementoOrigem, "lista-item-quantidade", "lista-controle-pulso");
    const animacaoMinima = aguardarAnimacaoLista(260);

    try {
        const resposta = await executarAcaoLista(API_LISTA_QUANTIDADE, {
            id_lista_produto: id,
            acao: acao
        });
        await animacaoMinima;

        const novaQuantidade = resposta.data && Number.isFinite(Number(resposta.data.quantidade))
            ? Number(resposta.data.quantidade)
            : obterNovaQuantidadeLocal(id, acao);

        if (novaQuantidade <= 0) {
            renderizarLista({
                mostrarCarregando: false,
                preservarRolagem: true
            });
            return;
        }

        atualizarQuantidadeLocal(id, novaQuantidade);
        atualizarItemQuantidadeNaTela(id);
        atualizarResumoListaNaTela();
        atualizarEstrategiaListaNaTela();
        limparAnimacaoItemLista(itemAnimado, elementoOrigem, "lista-controle-pulso");
    } catch (erro) {
        limparAnimacaoItemLista(itemAnimado, elementoOrigem, "lista-controle-pulso");
        throw erro;
    }
}

async function marcarComprado(id, checked, elementoOrigem) {
    const itemAnimado = iniciarAnimacaoItemLista(
        elementoOrigem,
        checked ? "lista-item-marcando" : "lista-item-desmarcando",
        "lista-controle-pulso"
    );
    const animacaoMinima = aguardarAnimacaoLista(260);

    try {
        await executarAcaoLista(API_LISTA_MARCAR, {
            id_lista_produto: id,
            comprado: checked ? 1 : 0
        });
        await animacaoMinima;
        atualizarCompradoLocal(id, checked);
        atualizarItemCompradoNaTela(id, checked);
        atualizarResumoListaNaTela();
        atualizarEstrategiaListaNaTela();
        limparAnimacaoItemLista(itemAnimado, elementoOrigem, "lista-controle-pulso");
    } catch (erro) {
        if (elementoOrigem) {
            elementoOrigem.checked = !checked;
        }

        limparAnimacaoItemLista(itemAnimado, elementoOrigem, "lista-controle-pulso");
        throw erro;
    }
}

function aguardarAnimacaoLista(tempo) {
    return new Promise(function (resolve) {
        window.setTimeout(resolve, tempo);
    });
}

function obterItemLista(elementoOrigem) {
    if (!elementoOrigem || typeof elementoOrigem.closest !== "function") {
        return null;
    }

    return elementoOrigem.closest(".item-lista");
}

function iniciarAnimacaoItemLista(elementoOrigem, classeItem, classeControle) {
    const item = obterItemLista(elementoOrigem);
    const classesItem = [
        "lista-item-marcando",
        "lista-item-desmarcando",
        "lista-item-quantidade",
        "lista-item-removendo",
        "lista-item-processando"
    ];

    if (item) {
        classesItem.forEach(function (classe) {
            item.classList.remove(classe);
        });
        void item.offsetWidth;
        item.classList.add(classeItem, "lista-item-processando");
    }

    if (elementoOrigem && classeControle) {
        elementoOrigem.classList.remove(classeControle);
        void elementoOrigem.offsetWidth;
        elementoOrigem.classList.add(classeControle);
    }

    return item;
}

function limparAnimacaoItemLista(item, elementoOrigem, classeControle) {
    if (item) {
        item.classList.remove(
            "lista-item-marcando",
            "lista-item-desmarcando",
            "lista-item-quantidade",
            "lista-item-removendo",
            "lista-item-processando"
        );
    }

    if (elementoOrigem && classeControle) {
        elementoOrigem.classList.remove(classeControle);
    }
}

function obterItemAtualLista(id) {
    return listaAtualPdf.find(function (item) {
        return String(item.id) === String(id);
    }) || null;
}

function obterNovaQuantidadeLocal(id, acao) {
    const item = obterItemAtualLista(id);

    if (!item) {
        return 1;
    }

    return acao === "aumentar"
        ? item.quantidade + 1
        : Math.max(item.quantidade - 1, 0);
}

function atualizarQuantidadeLocal(id, quantidade) {
    const item = obterItemAtualLista(id);

    if (item) {
        item.quantidade = Math.max(Number(quantidade) || 1, 1);
    }
}

function atualizarCompradoLocal(id, comprado) {
    const item = obterItemAtualLista(id);

    if (item) {
        item.comprado = Boolean(comprado);
    }
}

function obterElementoItemListaPorId(id) {
    const itens = document.querySelectorAll(".item-lista[data-id]");

    return Array.from(itens).find(function (item) {
        return item.dataset.id === String(id);
    }) || null;
}

function atualizarItemQuantidadeNaTela(id) {
    const item = obterItemAtualLista(id);
    const elemento = obterElementoItemListaPorId(id);

    if (!item || !elemento) {
        return;
    }

    const precoTotal = elemento.querySelector(".lista-item-total");
    const quantidade = elemento.querySelector(".lista-item-quantidade");

    if (precoTotal) {
        precoTotal.textContent = formatarPreco(item.preco * item.quantidade);
    }

    if (quantidade) {
        quantidade.textContent = "x" + item.quantidade;
    }

    const botaoDiminuir = elemento.querySelector('.quantidade-item[data-acao="diminuir"]');
    if (botaoDiminuir) {
        botaoDiminuir.disabled = item.quantidade <= 1;
    }
}

function atualizarItemCompradoNaTela(id, comprado) {
    const elemento = obterElementoItemListaPorId(id);

    if (!elemento) {
        return;
    }

    const checkbox = elemento.querySelector(".checkbox-item");
    const label = elemento.querySelector(".form-check-label");

    if (checkbox) {
        checkbox.checked = Boolean(comprado);
    }

    if (label) {
        label.classList.toggle("text-decoration-line-through", Boolean(comprado));
        label.classList.toggle("text-muted", Boolean(comprado));
    }
}

function atualizarResumoListaNaTela() {
    const totalItens = document.getElementById("totalItens");
    const totalPendentes = document.getElementById("totalPendentes");
    const totalPreco = document.getElementById("totalPreco");
    const btnBaixarPdf = document.getElementById("baixarPdfLista");
    const totalQuantidade = listaAtualPdf.reduce(function (soma, item) {
        return soma + item.quantidade;
    }, 0);
    const pendentes = listaAtualPdf.reduce(function (soma, item) {
        return item.comprado ? soma : soma + item.quantidade;
    }, 0);
    const total = listaAtualPdf.reduce(function (soma, item) {
        return item.comprado ? soma : soma + (Number(item.preco) * item.quantidade);
    }, 0);

    if (totalItens) {
        totalItens.textContent = String(totalQuantidade);
    }

    if (totalPendentes) {
        totalPendentes.textContent = String(pendentes);
    }

    if (totalPreco) {
        totalPreco.textContent = formatarPreco(total);
    }

    document.querySelectorAll(".badge-subtotal[data-mercado]").forEach(function (badge) {
        badge.textContent = "Subtotal: " + formatarPreco(calcularSubtotalMercado(listaAtualPdf, badge.dataset.mercado));
    });

    if (btnBaixarPdf) {
        btnBaixarPdf.disabled = listaAtualPdf.length === 0;
    }
}

function calcularAlturaMinimaEstrategia(lista) {
    const mercadosPendentes = new Set(
        lista
            .filter(function (item) {
                return !item.comprado;
            })
            .map(function (item) {
                return item.mercado;
            })
            .filter(Boolean)
    );

    if (mercadosPendentes.size === 0) {
        return 120;
    }

    return 96 + (mercadosPendentes.size * 42);
}

function estabilizarAlturaEstrategia(lista) {
    const estrategiaContainer = document.getElementById("estrategiaCompra");

    if (!estrategiaContainer) {
        return;
    }

    const alturaAtual = estrategiaContainer.offsetHeight;
    const alturaMinima = calcularAlturaMinimaEstrategia(lista);
    estrategiaContainer.style.minHeight = Math.ceil(Math.max(alturaAtual, alturaMinima)) + "px";
}

function atualizarEstrategiaListaNaTela() {
    estabilizarAlturaEstrategia(listaAtualPdf);

    estrategiaRenderId++;
    const renderId = estrategiaRenderId;
    const atualizacao = calcularEstrategia(listaAtualPdf, renderId, {
        mostrarCarregando: false
    });

    Promise.resolve(atualizacao).then(function () {
        if (renderId === estrategiaRenderId) {
            estabilizarAlturaEstrategia(listaAtualPdf);
        }
    }).catch(function (erro) {
        console.error(erro);
    });
}

function restaurarRolagem(posicao) {
    if (!posicao) {
        return;
    }

    window.scrollTo(posicao.x, posicao.y);
    requestAnimationFrame(function () {
        window.scrollTo(posicao.x, posicao.y);
    });
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

async function calcularEstrategia(lista, renderId, opcoes) {
    const configuracao = opcoes || {};
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

    if (configuracao.mostrarCarregando !== false) {
        estrategiaContainer.innerHTML = `
            <p class="mb-0 text-muted">Calculando a melhor estrategia...</p>
        `;
    }

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
                try {
                    await removerItem(botao.dataset.id, botao);
                } catch (erro) {
                    console.error(erro);
                }
            }
        });
    });

    document.querySelectorAll(".quantidade-item").forEach(function (botao) {
        botao.addEventListener("click", async function () {
            try {
                await alterarQuantidade(botao.dataset.id, botao.dataset.acao, botao);
            } catch (erro) {
                console.error(erro);
            }
        });
    });

    document.querySelectorAll(".checkbox-item").forEach(function (checkbox) {
        checkbox.addEventListener("change", async function () {
            try {
                await marcarComprado(checkbox.dataset.id, checkbox.checked, checkbox);
            } catch (erro) {
                console.error(erro);
            }
        });
    });
}

function bibliotecasPdfDisponiveis() {
    return typeof html2canvas === "function"
        && window.jspdf
        && typeof window.jspdf.jsPDF === "function";
}

function prepararCloneChecklistPdf() {
    const cardChecklist = document.getElementById("cardChecklistCompras");

    if (!cardChecklist) {
        return null;
    }

    const areaCaptura = document.createElement("div");
    const documento = document.createElement("div");
    const clone = cardChecklist.cloneNode(true);

    areaCaptura.className = "checklist-pdf-captura";
    documento.className = "checklist-pdf-documento";
    clone.id = "cardChecklistComprasPdf";
    clone.classList.add("checklist-pdf-export");

    const botaoPdf = clone.querySelector("#baixarPdfLista");
    if (botaoPdf) {
        botaoPdf.remove();
    }

    clone.querySelectorAll(".remover-item, .quantidade-item").forEach(function (elemento) {
        elemento.remove();
    });

    clone.querySelectorAll(".lista-item-acoes .btn-group").forEach(function (grupoQuantidade) {
        const quantidade = grupoQuantidade.querySelector(".disabled");
        const textoQuantidade = quantidade ? quantidade.textContent.trim() : "";
        const badgeQuantidade = document.createElement("span");

        badgeQuantidade.className = "pdf-quantidade-estatica";
        badgeQuantidade.textContent = textoQuantidade || "x1";
        grupoQuantidade.replaceWith(badgeQuantidade);
    });

    documento.appendChild(clone);
    areaCaptura.appendChild(documento);
    document.body.appendChild(areaCaptura);

    return areaCaptura;
}

function nomeArquivoChecklistPdf() {
    const data = new Date();
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");

    return "checklist-preco-hub-" + ano + "-" + mes + "-" + dia + ".pdf";
}

function adicionarCanvasAoPdf(pdf, canvas) {
    const larguraPagina = pdf.internal.pageSize.getWidth();
    const alturaPagina = pdf.internal.pageSize.getHeight();
    const margem = 8;
    const larguraImagem = larguraPagina - (margem * 2);
    const alturaUtilPagina = alturaPagina - (margem * 2);
    const alturaCanvasPorPagina = Math.floor(alturaUtilPagina * canvas.width / larguraImagem);
    let origemY = 0;
    let primeiraPagina = true;

    while (origemY < canvas.height) {
        const alturaFatia = Math.min(alturaCanvasPorPagina, canvas.height - origemY);
        const canvasPagina = document.createElement("canvas");
        const contextoPagina = canvasPagina.getContext("2d");
        const alturaImagem = alturaFatia * larguraImagem / canvas.width;

        canvasPagina.width = canvas.width;
        canvasPagina.height = alturaFatia;
        contextoPagina.drawImage(
            canvas,
            0,
            origemY,
            canvas.width,
            alturaFatia,
            0,
            0,
            canvas.width,
            alturaFatia
        );

        if (!primeiraPagina) {
            pdf.addPage();
        }

        pdf.addImage(canvasPagina.toDataURL("image/png"), "PNG", margem, margem, larguraImagem, alturaImagem);

        primeiraPagina = false;
        origemY += alturaFatia;
    }
}

async function baixarPdfChecklist() {
    const botaoPdf = document.getElementById("baixarPdfLista");

    if (!bibliotecasPdfDisponiveis()) {
        alert("Nao foi possivel carregar as bibliotecas para gerar o PDF.");
        return;
    }

    if (!listaAtualPdf.length) {
        alert("Adicione itens na lista antes de gerar o PDF.");
        return;
    }

    if (botaoPdf) {
        botaoPdf.disabled = true;
        botaoPdf.textContent = "Gerando PDF...";
    }

    let areaCaptura = null;

    try {
        areaCaptura = prepararCloneChecklistPdf();

        if (!areaCaptura) {
            throw new Error("Checklist nao encontrado.");
        }

        const documento = areaCaptura.querySelector(".checklist-pdf-documento");
        const canvas = await html2canvas(documento, {
            backgroundColor: null,
            scale: 2,
            useCORS: true,
            logging: false,
            windowWidth: documento.scrollWidth,
            windowHeight: documento.scrollHeight
        });
        const pdf = new window.jspdf.jsPDF("p", "mm", "a4");

        adicionarCanvasAoPdf(pdf, canvas);
        pdf.save(nomeArquivoChecklistPdf());
    } catch (erro) {
        console.error(erro);
        alert("Nao foi possivel gerar o PDF da lista.");
    } finally {
        if (areaCaptura) {
            areaCaptura.remove();
        }

        if (botaoPdf) {
            botaoPdf.disabled = listaAtualPdf.length === 0;
            botaoPdf.textContent = "Baixar PDF";
        }
    }
}

async function renderizarLista(opcoes) {
    const configuracao = opcoes || {};
    const posicaoRolagem = configuracao.preservarRolagem
        ? {
            x: window.scrollX || window.pageXOffset,
            y: window.scrollY || window.pageYOffset
        }
        : null;
    const listaContainer = document.getElementById("listaCompras");
    const totalItens = document.getElementById("totalItens");
    const totalPendentes = document.getElementById("totalPendentes");
    const totalPreco = document.getElementById("totalPreco");
    const listaVazia = document.getElementById("listaVazia");
    const btnLimparLista = document.getElementById("limparLista");
    const btnBaixarPdf = document.getElementById("baixarPdfLista");

    if (!listaContainer || !totalItens || !totalPendentes || !totalPreco || !listaVazia) {
        return;
    }

    if (configuracao.mostrarCarregando !== false) {
        listaContainer.innerHTML = '<p class="mb-0 text-muted">Carregando sua lista...</p>';
    }

    let listaOriginal = [];

    try {
        listaOriginal = await buscarLista();
    } catch (erro) {
        console.error(erro);
        estrategiaRenderId++;
        listaAtualPdf = [];
        totalItens.textContent = "0";
        totalPendentes.textContent = "0";
        totalPreco.textContent = "R$ 0,00";
        if (btnBaixarPdf) {
            btnBaixarPdf.disabled = true;
        }
        mostrarErroLista(erro.message);
        restaurarRolagem(posicaoRolagem);
        return;
    }

    const listaOrdenada = ordenarPorMercado(listaOriginal);
    listaAtualPdf = listaOriginal;
    const totalQuantidade = listaOriginal.reduce(function (soma, item) {
        return soma + item.quantidade;
    }, 0);

    totalItens.textContent = String(totalQuantidade);

    if (listaOriginal.length === 0) {
        estrategiaRenderId++;
        listaAtualPdf = [];
        listaContainer.innerHTML = "";
        listaVazia.classList.remove("d-none");
        totalPendentes.textContent = "0";
        totalPreco.textContent = "R$ 0,00";
        if (btnBaixarPdf) {
            btnBaixarPdf.disabled = true;
        }

        const estrategiaContainer = document.getElementById("estrategiaCompra");
        if (estrategiaContainer) {
            estrategiaContainer.style.minHeight = "";
            estrategiaContainer.innerHTML = "Ainda nao ha dados suficientes para calcular a estrategia.";
        }

        if (btnLimparLista) {
            btnLimparLista.disabled = true;
        }

        restaurarRolagem(posicaoRolagem);
        return;
    }

    listaVazia.classList.add("d-none");

    if (btnLimparLista) {
        btnLimparLista.disabled = false;
    }

    if (btnBaixarPdf) {
        btnBaixarPdf.disabled = false;
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
                        <h5 class="text-marrom fw-bold mb-0">${renderizarTituloMercadoComLogo(item.mercado)}</h5>
                        <span class="badge-subtotal" data-mercado="${escaparHtml(item.mercado)}">
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

            <div class="item-lista d-flex justify-content-between align-items-center flex-wrap gap-3" data-id="${escaparHtml(item.id)}">
                <div class="form-check">
                    <input
                        class="form-check-input checkbox-item"
                        type="checkbox"
                        data-id="${escaparHtml(item.id)}"
                        ${item.comprado ? "checked" : ""}
                    >

                    <label class="form-check-label ${item.comprado ? "text-decoration-line-through text-muted" : ""}">
                        <span class="lista-produto-nome">${escaparHtml(item.nome)}</span>
                        ${item.marca ? `<small class="lista-produto-marca">${escaparHtml(item.marca)}</small>` : ""}
                    </label>
                </div>

                <div class="d-flex align-items-center gap-2 flex-wrap lista-item-acoes">
                    <span class="fw-semibold lista-item-total">${formatarPreco(item.preco * item.quantidade)}</span>
                    <small class="text-muted">(${formatarPreco(item.preco)} un.)</small>

                    <div class="btn-group btn-group-sm" role="group" aria-label="Quantidade">
                        <button type="button" class="btn btn-outline-secondary quantidade-item" data-id="${escaparHtml(item.id)}" data-acao="diminuir" ${item.quantidade <= 1 ? "disabled" : ""}>-</button>
                        <span class="btn btn-outline-secondary disabled lista-item-quantidade">x${item.quantidade}</span>
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
    restaurarRolagem(posicaoRolagem);
}

document.addEventListener("DOMContentLoaded", function () {
    const btnLimparLista = document.getElementById("limparLista");
    const btnBaixarPdf = document.getElementById("baixarPdfLista");

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

    if (btnBaixarPdf) {
        btnBaixarPdf.disabled = true;
        btnBaixarPdf.addEventListener("click", baixarPdfChecklist);
    }

    renderizarLista();
});
