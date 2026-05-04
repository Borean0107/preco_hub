const API_BUSCAR = "backend/produtos/buscar.php";
const API_LISTAR = "backend/produtos/listar.php";
const API_ADICIONAR_LISTA = "backend/listas/adicionar.php";

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

async function carregarMercados() {
    const filtroMercado = document.getElementById("filtroMercado");

    if (!filtroMercado) {
        return;
    }

    try {
        const response = await fetch(API_LISTAR, {
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            return;
        }

        const dados = await response.json();

        if (!dados.success || !Array.isArray(dados.data)) {
            return;
        }

        const mercados = [];
        const registrados = new Set();

        dados.data.forEach(function (produto) {
            normalizarPrecos(produto.precos).forEach(function (preco) {
                const mercado = String(preco.mercado || "").trim();

                if (mercado && !registrados.has(mercado)) {
                    registrados.add(mercado);
                    mercados.push(mercado);
                }
            });
        });

        filtroMercado.innerHTML = '<option value="">Todos os mercados</option>';
        mercados.forEach(function (mercado) {
            const option = document.createElement("option");
            option.value = mercado;
            option.textContent = mercado;
            filtroMercado.appendChild(option);
        });
    } catch (error) {
        console.error("Erro ao carregar mercados:", error);
    }
}

async function adicionarNaLista(idProduto, nomeProduto) {
    if (!idProduto) {
        mostrarAvisoSite("Produto indisponivel", "Nao foi possivel identificar este produto.", "warning");
        return;
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

        window.dispatchEvent(new CustomEvent("precohub:lista-atualizada"));
        mostrarAvisoSite("Produto adicionado", nomeProduto + " foi adicionado a sua lista.");
    } catch (error) {
        mostrarAvisoSite("Lista nao atualizada", error.message, "warning");
    }
}

function obterMelhorPreco(precos) {
    const precosValidos = normalizarPrecos(precos);
    if (precosValidos.length === 0) return null;
    return precosValidos.reduce((a, b) => a.preco < b.preco ? a : b);
}

function calcularEconomia(precos) {
    const valores = normalizarPrecos(precos).map(p => p.preco);
    if (valores.length < 2) return 0;
    const precoMax = Math.max(...valores);
    const precoMin = Math.min(...valores);
    return precoMax - precoMin;
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
            if (typeof preco === "object" && preco !== null) {
                return {
                    mercado: preco.mercado || "",
                    preco: obterValorPreco(preco),
                    disponibilidade: preco.disponibilidade
                };
            }

            return {
                mercado: "",
                preco: obterValorPreco(preco),
                disponibilidade: true
            };
        })
        .filter(function (preco) {
            return preco.preco !== null;
        });
}

async function realizarBusca() {
    const termo = document.getElementById("termoBusca").value.trim();
    const categoria = document.getElementById("filtroCategoria").value;
    const mercado = document.getElementById("filtroMercado").value;
    const precoMin = document.getElementById("precoMin").value;
    const precoMax = document.getElementById("precoMax").value;

    if (termo.length < 2) {
        mostrarAvisoSite("Busca incompleta", "Digite pelo menos 2 caracteres para buscar.", "warning");
        return;
    }

    document.getElementById("carregando").classList.remove("d-none");
    document.getElementById("semResultados").classList.add("d-none");
    document.getElementById("containerResultados").innerHTML = "";

    try {
        const params = new URLSearchParams();
        params.append("termo", termo);
        if (categoria) params.append("categoria", categoria);
        if (mercado) params.append("mercado", mercado);
        if (precoMin) params.append("preco_min", precoMin);
        if (precoMax) params.append("preco_max", precoMax);

        const response = await fetch(API_BUSCAR + "?" + params.toString());

        if (!response.ok) {
            throw new Error("Falha na busca.");
        }

        const dados = await response.json();

        document.getElementById("carregando").classList.add("d-none");

        if (!dados.success || dados.data.length === 0) {
            document.getElementById("semResultados").classList.remove("d-none");
            return;
        }

        exibirResultados(dados.data);
    } catch (erro) {
        document.getElementById("carregando").classList.add("d-none");
        console.error("Erro na busca:", erro);
        mostrarAvisoSite("Erro na busca", "Tente novamente em instantes.", "danger");
    }
}

function exibirResultados(produtos) {
    const container = document.getElementById("containerResultados");
    const cards = [];

    produtos.forEach(function (produto) {
        const precos = normalizarPrecos(produto.precos);
        const melhorPreco = obterMelhorPreco(precos);

        if (!melhorPreco) {
            return;
        }

        const economia = calcularEconomia(precos);

        const precoMinimoFormatado = formatarPreco(melhorPreco.preco);
        const economiaFormatada = formatarPreco(economia);

        let htmlPrecos = "";
        precos.forEach(function (p) {
            const classes = p.mercado === melhorPreco.mercado ? "price-item-melhor" : "";
            const badge = p.mercado === melhorPreco.mercado ? '<span class="badge bg-success ms-2">Melhor preço</span>' : "";
            htmlPrecos += `
                <div class="price-item ${classes} d-flex justify-content-between align-items-center mb-2">
                    <div>
                        <strong>${escaparHtml(p.mercado)}</strong>
                        <small class="text-muted d-block">${p.disponibilidade ? "Disponível" : "Indisponível"}</small>
                    </div>
                    <div class="text-end">
                        <span class="price-value">${formatarPreco(p.preco)}</span>
                        ${badge}
                    </div>
                </div>
                <button
                    type="button"
                    class="btn btn-sm btn-outline-primary w-100 mb-2 busca-adicionar-lista"
                    data-id="${Number(produto.id_produto)}">
                    + Adicionar à lista
                </button>
            `;
        });

        const card = `
            <div class="col-md-6 col-lg-12">
                <div class="card shadow-sm h-100 produto-card">
                    <div class="card-body">
                        <div class="d-flex gap-3">
                            <img src="${escaparHtml(produto.imagem_produto)}" 
                                 alt="${escaparHtml(produto.nome_produto)}" 
                                 class="produto-thumb"
                                 style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px;">
                            
                            <div class="flex-grow-1">
                                <h6 class="fw-bold mb-1">${escaparHtml(produto.nome_produto)}</h6>
                                <small class="text-muted d-block mb-2">
                                    ${escaparHtml(produto.nome_fabricante || "N/A")} 
                                    • ${escaparHtml(produto.nome_categoria || "N/A")}
                                </small>
                                
                                <div class="preco-destaque mb-2">
                                    <span class="h5 text-success fw-bold">${precoMinimoFormatado}</span>
                                    <small class="text-muted d-block">Melhor preço</small>
                                </div>

                                ${economia > 0 ? `
                                    <div class="badge bg-info text-dark">
                                        💰 Economize até ${economiaFormatada}
                                    </div>
                                ` : ""}
                            </div>
                        </div>

                        <hr class="my-3">

                        <div class="precos-lista">
                            ${htmlPrecos}
                        </div>

                        <button
                            type="button"
                            class="btn btn-primary w-100 mt-3 abrir-modal-busca"
                            data-modal="modal-${produto.id_produto}">
                            👁️ Ver todos os preços
                        </button>
                    </div>
                </div>
            </div>

            <!-- Modal com todos os preços -->
            <div id="modal-${produto.id_produto}" class="modal-comparador" style="display: none;">
                <div class="modal-content-comparador">
                    <button type="button" class="close-modal fechar-modal-busca" data-modal="modal-${produto.id_produto}" aria-label="Fechar">&times;</button>
                    <h5 class="fw-bold mb-4">${escaparHtml(produto.nome_produto)}</h5>
                    ${htmlPrecos}
                </div>
            </div>
        `;

        cards.push(card);
    });

    container.innerHTML = cards.join("");

    if (!document.getElementById("estilosBuscaComparador")) {
        const style = document.createElement("style");
        style.id = "estilosBuscaComparador";
        style.innerHTML = `
        .modal-comparador {
            position: fixed;
            z-index: 900;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.4);
            align-items: center;
            justify-content: center;
        }
        .modal-content-comparador {
            background-color: #fefefe;
            padding: 30px;
            border-radius: 12px;
            width: 90%;
            max-width: 500px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            max-height: 80vh;
            overflow-y: auto;
        }
        .close-modal {
            color: #aaa;
            float: right;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
            margin-top: -15px;
            margin-right: -15px;
        }
        .close-modal:hover {
            color: #000;
        }
        .price-item-melhor {
            background-color: #e8f5e9;
            padding: 12px;
            border-radius: 8px;
            border-left: 4px solid #22c55e;
        }
    `;
        document.head.appendChild(style);
    }
}

function abrirModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

function fecharModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Fechar modal ao clicar fora
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal-comparador')) {
        event.target.style.display = 'none';
    }
});

function registrarEventosResultadosBusca() {
    const container = document.getElementById("containerResultados");

    if (!container) {
        return;
    }

    container.addEventListener("click", function (event) {
        const botaoAdicionar = event.target.closest(".busca-adicionar-lista");
        const botaoAbrirModal = event.target.closest(".abrir-modal-busca");
        const botaoFecharModal = event.target.closest(".fechar-modal-busca");

        if (botaoAdicionar) {
            const card = botaoAdicionar.closest(".produto-card");
            const titulo = card ? card.querySelector("h6") : null;
            const nome = titulo ? titulo.textContent.trim() : "";
            adicionarNaLista(Number(botaoAdicionar.dataset.id), nome);
            return;
        }

        if (botaoAbrirModal) {
            abrirModal(botaoAbrirModal.dataset.modal);
            return;
        }

        if (botaoFecharModal) {
            fecharModal(botaoFecharModal.dataset.modal);
        }
    });
}

function limparFiltros() {
    document.getElementById("termoBusca").value = "";
    document.getElementById("filtroCategoria").value = "";
    document.getElementById("filtroMercado").value = "";
    document.getElementById("precoMin").value = "0";
    document.getElementById("precoMax").value = "999";
    document.getElementById("containerResultados").innerHTML = "";
    document.getElementById("semResultados").classList.add("d-none");
}

// Event listeners
document.addEventListener("DOMContentLoaded", function () {
    carregarMercados();
    registrarEventosResultadosBusca();
    document.getElementById("btnBuscar").addEventListener("click", realizarBusca);
    document.getElementById("btnLimparFiltros").addEventListener("click", limparFiltros);
    document.getElementById("termoBusca").addEventListener("keypress", function (e) {
        if (e.key === "Enter") realizarBusca();
    });
});
