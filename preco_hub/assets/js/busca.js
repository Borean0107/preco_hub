const API_BUSCAR = "backend/produtos/buscar.php";
const API_LISTAR = "backend/produtos/listar.php";
const STORAGE_LISTA = "listaProdutos";

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

function lerListaCompras() {
    const dados = localStorage.getItem(STORAGE_LISTA);
    return dados ? JSON.parse(dados) : [];
}

function salvarListaCompras(lista) {
    localStorage.setItem(STORAGE_LISTA, JSON.stringify(lista));
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

function adicionarNaLista(nomeProduto, preco, mercado) {
    const lista = lerListaCompras();
    const novoItem = {
        id: Date.now(),
        nome: nomeProduto,
        preco: Number(preco),
        mercado: mercado,
        comprado: false
    };
    lista.push(novoItem);
    salvarListaCompras(lista);
    alert(nomeProduto + " adicionado à lista de compras!");
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
        alert("Digite pelo menos 2 caracteres para buscar.");
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
        alert("Erro ao realizar a busca. Tente novamente.");
    }
}

function exibirResultados(produtos) {
    const container = document.getElementById("containerResultados");
    container.innerHTML = "";

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
                <button class="btn btn-sm btn-outline-primary w-100 mb-2" onclick="adicionarNaLista('${escaparHtml(produto.nome_produto)}', ${p.preco}, '${escaparHtml(p.mercado)}')">
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

                        <button class="btn btn-primary w-100 mt-3" onclick="abrirModal('modal-${produto.id_produto}')">
                            👁️ Ver todos os preços
                        </button>
                    </div>
                </div>
            </div>

            <!-- Modal com todos os preços -->
            <div id="modal-${produto.id_produto}" class="modal-comparador" style="display: none;">
                <div class="modal-content-comparador">
                    <span class="close-modal" onclick="fecharModal('modal-${produto.id_produto}')">&times;</span>
                    <h5 class="fw-bold mb-4">${escaparHtml(produto.nome_produto)}</h5>
                    ${htmlPrecos}
                </div>
            </div>
        `;

        container.innerHTML += card;
    });

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
    document.getElementById("btnBuscar").addEventListener("click", realizarBusca);
    document.getElementById("btnLimparFiltros").addEventListener("click", limparFiltros);
    document.getElementById("termoBusca").addEventListener("keypress", function (e) {
        if (e.key === "Enter") realizarBusca();
    });
});
