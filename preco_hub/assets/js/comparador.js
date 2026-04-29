const API_LISTAR = "backend/produtos/listar.php";
const STORAGE_LISTA = "listaProdutos";

let produtosGlobal = [];
let graficoPrecos, graficoEconomia, graficoDistribuicao;

function formatarPreco(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
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
                    preco: obterValorPreco(preco)
                };
            }

            return {
                mercado: "",
                preco: obterValorPreco(preco)
            };
        })
        .filter(function (preco) {
            return preco.preco !== null;
        });
}

function normalizarTexto(texto) {
    return String(texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function lerListaComparacao() {
    try {
        const dados = localStorage.getItem(STORAGE_LISTA);
        const lista = dados ? JSON.parse(dados) : [];

        return Array.isArray(lista) ? lista : [];
    } catch (erro) {
        console.error("Erro ao ler a lista de compras:", erro);
        return [];
    }
}

function filtrarProdutosDaLista(produtos, lista) {
    const ordemProdutos = new Map();

    lista.forEach(function (item) {
        const nome = normalizarTexto(item.nome);

        if (nome && !ordemProdutos.has(nome)) {
            ordemProdutos.set(nome, ordemProdutos.size);
        }
    });

    return produtos
        .filter(function (produto) {
            return ordemProdutos.has(normalizarTexto(produto.nome_produto));
        })
        .sort(function (a, b) {
            return ordemProdutos.get(normalizarTexto(a.nome_produto)) -
                ordemProdutos.get(normalizarTexto(b.nome_produto));
        });
}

function definirVisibilidadeConteudo(visivel) {
    document.querySelectorAll(".comparador-conteudo").forEach(function (elemento) {
        elemento.classList.toggle("d-none", !visivel);
    });
}

function destruirGraficos() {
    if (graficoPrecos) {
        graficoPrecos.destroy();
        graficoPrecos = null;
    }

    if (graficoEconomia) {
        graficoEconomia.destroy();
        graficoEconomia = null;
    }

    if (graficoDistribuicao) {
        graficoDistribuicao.destroy();
        graficoDistribuicao = null;
    }
}

function atualizarResumoVazio() {
    document.getElementById("totalProdutos").textContent = "0";
    document.getElementById("economiaMaxima").textContent = formatarPreco(0);
    document.getElementById("economiaMedia").textContent = formatarPreco(0);
    document.getElementById("mercadoMaisBarato").textContent = "-";
}

function mostrarMensagem(mensagem, tipo) {
    const alerta = document.getElementById("comparadorMensagem");

    if (alerta) {
        alerta.className = "alert alert-" + (tipo || "info");
        alerta.innerHTML = mensagem;
    }

    definirVisibilidadeConteudo(false);
    destruirGraficos();
    atualizarResumoVazio();
}

function ocultarMensagem() {
    const alerta = document.getElementById("comparadorMensagem");

    if (alerta) {
        alerta.classList.add("d-none");
    }

    definirVisibilidadeConteudo(true);
}

function obterMercados() {
    const mercados = [];
    const mercadosRegistrados = new Set();

    produtosGlobal.forEach(function (produto) {
        normalizarPrecos(produto.precos).forEach(function (preco) {
            const mercado = String(preco.mercado || "").trim();

            if (mercado && !mercadosRegistrados.has(mercado)) {
                mercadosRegistrados.add(mercado);
                mercados.push(mercado);
            }
        });
    });

    return mercados;
}

function obterCor(indice) {
    const cores = [
        "#2563EB",
        "#22C55E",
        "#F59E0B",
        "#EF4444",
        "#8B5CF6",
        "#14B8A6",
        "#EC4899",
        "#64748B"
    ];

    return cores[indice % cores.length];
}

function abreviarNome(nome) {
    const texto = String(nome || "Produto");

    return texto.length > 18 ? texto.substring(0, 18) + "..." : texto;
}

function gerarCabecalhoTabela(mercados) {
    const cabecalho = document.getElementById("cabecalhoTabelaComparacao");

    if (!cabecalho) {
        return;
    }

    cabecalho.innerHTML = `
        <th>Produto</th>
        ${mercados.map(function (mercado) {
            return `<th>${escaparHtml(mercado)}</th>`;
        }).join("")}
        <th>Melhor Pre&ccedil;o</th>
        <th>Economia</th>
    `;
}

function escaparHtml(valor) {
    return String(valor)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
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

function obterPrecoMercado(precos, nomeMercado) {
    if (!Array.isArray(precos)) return null;

    const preco = precos.find(p => p.mercado === nomeMercado);
    return preco ? preco.preco : null;
}

function obterOpcoesBase(eixoValor) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        resizeDelay: 120,
        interaction: {
            mode: "nearest",
            intersect: false
        },
        plugins: {
            legend: {
                position: "top",
                labels: {
                    usePointStyle: true,
                    boxWidth: 10,
                    padding: 18,
                    font: {
                        size: 13,
                        weight: "600"
                    }
                }
            },
            tooltip: {
                backgroundColor: "#0F172A",
                padding: 12,
                titleFont: {
                    size: 13,
                    weight: "700"
                },
                bodyFont: {
                    size: 13
                }
            }
        },
        scales: {
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    color: "#475569",
                    font: {
                        size: 12,
                        weight: "600"
                    },
                    maxRotation: 0,
                    autoSkip: false
                }
            },
            y: {
                beginAtZero: true,
                grace: "12%",
                grid: {
                    color: "rgba(148, 163, 184, 0.22)"
                },
                ticks: {
                    color: "#475569",
                    font: {
                        size: 12
                    },
                    callback: function (value) {
                        return eixoValor === "preco" ? "R$ " + value.toFixed(2) : value;
                    }
                }
            }
        }
    };
}

function criarOpcoesGraficoPrecos() {
    const opcoes = obterOpcoesBase("preco");

    opcoes.plugins.legend.position = "bottom";
    opcoes.plugins.tooltip.callbacks = {
        label: function (context) {
            return context.dataset.label + ": " + formatarPreco(context.parsed.y);
        }
    };

    return opcoes;
}

function criarOpcoesGraficoEconomia() {
    return {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        resizeDelay: 120,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: "#0F172A",
                padding: 12,
                callbacks: {
                    label: function (context) {
                        return formatarPreco(context.parsed.x);
                    }
                }
            }
        },
        scales: {
            x: {
                beginAtZero: true,
                grace: "12%",
                grid: {
                    color: "rgba(148, 163, 184, 0.22)"
                },
                ticks: {
                    color: "#475569",
                    callback: function (value) {
                        return "R$ " + value.toFixed(2);
                    }
                }
            },
            y: {
                grid: {
                    display: false
                },
                ticks: {
                    color: "#475569",
                    font: {
                        size: 12,
                        weight: "600"
                    }
                }
            }
        }
    };
}

function criarOpcoesGraficoDistribuicao() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "58%",
        plugins: {
            legend: {
                position: "bottom",
                labels: {
                    usePointStyle: true,
                    padding: 16,
                    font: {
                        size: 13,
                        weight: "600"
                    }
                }
            },
            tooltip: {
                backgroundColor: "#0F172A",
                padding: 12,
                callbacks: {
                    label: function (context) {
                        return "Preco medio: " + formatarPreco(context.parsed);
                    }
                }
            }
        }
    };
}

async function carregarProdutos() {
    try {
        const lista = lerListaComparacao();

        if (lista.length === 0) {
            produtosGlobal = [];
            mostrarMensagem(
                '<strong>Sua lista ainda esta vazia.</strong> Use a lupa de busca no menu ou adicione produtos pela pagina inicial para ver o comparador.',
                "info"
            );
            return;
        }

        const response = await fetch(API_LISTAR);
        if (!response.ok) throw new Error("Erro ao carregar produtos");

        const dados = await response.json();
        if (!dados.success || !Array.isArray(dados.data)) {
            throw new Error("Dados inválidos");
        }

        produtosGlobal = filtrarProdutosDaLista(dados.data, lista);

        if (produtosGlobal.length === 0) {
            mostrarMensagem(
                '<strong>Nenhum item da sua lista foi encontrado no cadastro de produtos.</strong> Confira se os produtos ainda existem no sistema ou adicione novamente pela busca.',
                "warning"
            );
            return;
        }

        ocultarMensagem();
        gerarTabela();
        gerarGraficos();
        calcularEstatisticas();
    } catch (erro) {
        console.error("Erro:", erro);
        mostrarMensagem(
            '<strong>Erro ao carregar os dados do comparador.</strong> Tente atualizar a pagina ou conferir a conexao com o banco.',
            "danger"
        );
    }
}

function gerarTabela() {
    const corpo = document.getElementById("corpoTabela");
    const mercados = obterMercados();

    gerarCabecalhoTabela(mercados);
    corpo.innerHTML = "";

    if (produtosGlobal.length === 0) {
        corpo.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Nenhum produto cadastrado.</td></tr>';
        return;
    }

    produtosGlobal.forEach(function (produto) {
        const precos = normalizarPrecos(produto.precos);
        const melhorPreco = obterMelhorPreco(precos);

        if (!melhorPreco) {
            const linhaSemPreco = document.createElement("tr");
            linhaSemPreco.innerHTML = `
                <td class="fw-600">${escaparHtml(produto.nome_produto)}</td>
                <td colspan="${mercados.length + 2}" class="text-center text-muted">Sem precos cadastrados.</td>
            `;
            corpo.appendChild(linhaSemPreco);
            return;
        }

        const economia = calcularEconomia(precos);
        const colunasMercados = mercados.map(function (mercado) {
            const precoMercado = obterPrecoMercado(precos, mercado);
            const destaque = precoMercado !== null && precoMercado === melhorPreco.preco;

            return `
                <td ${destaque ? 'class="bg-success bg-opacity-10 fw-bold"' : ""}>
                    ${precoMercado !== null ? formatarPreco(precoMercado) : "-"}
                </td>
            `;
        }).join("");

        const linha = document.createElement("tr");
        linha.innerHTML = `
            <td class="fw-600">${escaparHtml(produto.nome_produto)}</td>
            ${colunasMercados}
            <td>
                <span class="badge bg-success">${formatarPreco(melhorPreco.preco)}</span>
                <small class="d-block text-muted">${escaparHtml(melhorPreco.mercado)}</small>
            </td>
            <td>
                <span class="badge bg-info">${formatarPreco(economia)}</span>
            </td>
        `;
        corpo.appendChild(linha);
    });
}

function gerarGraficos() {
    const mercados = obterMercados();
    const nomesProdutos = produtosGlobal.map(p => abreviarNome(p.nome_produto));

    if (typeof Chart === "undefined") {
        console.error("Chart.js nao foi carregado.");
        return;
    }

    if (produtosGlobal.length === 0 || mercados.length === 0) {
        return;
    }

    // Dados para gráfico de preços
    const dadosPrecos = {
        labels: nomesProdutos,
        datasets: mercados.map((mercado, idx) => {
            const cor = obterCor(idx);
            return {
                label: mercado,
                data: produtosGlobal.map(p => {
                    const precos = normalizarPrecos(p.precos);
                    const preco = precos.find(pr => pr.mercado === mercado);
                    return preco ? preco.preco : null;
                }),
                borderColor: cor,
                backgroundColor: cor + "CC",
                borderWidth: 1,
                borderRadius: 8,
                borderSkipped: false,
                maxBarThickness: 48
            };
        })
    };

    // Destruir gráficos anteriores se existirem
    destruirGraficos();

    // Gráfico de linhas - Preços
    const ctxPrecos = document.getElementById("graficoPrecos").getContext("2d");
    graficoPrecos = new Chart(ctxPrecos, {
        type: "bar",
        data: dadosPrecos,
        options: criarOpcoesGraficoPrecos()
    });

    // Gráfico de barras - Economia
    const economias = produtosGlobal.map(p => calcularEconomia(p.precos));
    const ctxEconomia = document.getElementById("graficoEconomia").getContext("2d");
    graficoEconomia = new Chart(ctxEconomia, {
        type: "bar",
        data: {
            labels: nomesProdutos,
            datasets: [{
                label: "Economia (R$)",
                data: economias,
                backgroundColor: "#22C55E",
                borderColor: "#16A34A",
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: criarOpcoesGraficoEconomia()
    });

    // Gráfico de pizza - Distribuição média de preços
    const precosMediosPorMercado = mercados.map(mercado => {
        const precos = produtosGlobal
            .flatMap(p => normalizarPrecos(p.precos))
            .filter(pr => pr.mercado === mercado)
            .map(pr => pr.preco);
        return precos.length > 0 ? precos.reduce((a, b) => a + b) / precos.length : 0;
    });

    const ctxDistribuicao = document.getElementById("graficoDistribuicao").getContext("2d");
    graficoDistribuicao = new Chart(ctxDistribuicao, {
        type: "doughnut",
        data: {
            labels: mercados,
            datasets: [{
                data: precosMediosPorMercado,
                backgroundColor: mercados.map(function (_, indice) {
                    return obterCor(indice);
                }),
                borderColor: "#fff",
                borderWidth: 2
            }]
        },
        legacyOptions: {
            responsive: true,
            plugins: {
                legend: {
                    position: "bottom"
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return "Preço médio: " + formatarPreco(context.parsed);
                        }
                    }
                }
            }
        },
        options: criarOpcoesGraficoDistribuicao()
    });
}

function calcularEstatisticas() {
    let economiaTotal = 0;
    const precosPorMercado = {};
    const contagemMercados = {};

    produtosGlobal.forEach(function (produto) {
        const economia = calcularEconomia(produto.precos);
        economiaTotal += economia;

        normalizarPrecos(produto.precos).forEach(function (p) {
            const mercado = String(p.mercado || "").trim();

            if (mercado) {
                precosPorMercado[mercado] = (precosPorMercado[mercado] || 0) + p.preco;
                contagemMercados[mercado] = (contagemMercados[mercado] || 0) + 1;
            }
        });
    });

    const economiaMedia = produtosGlobal.length > 0 ? economiaTotal / produtosGlobal.length : 0;
    let mercadoMaisBarato = "-";
    let precoMedioMinimo = Infinity;

    Object.keys(precosPorMercado).forEach(function (mercado) {
        const precoMedio = precosPorMercado[mercado] / contagemMercados[mercado];

        if (precoMedio < precoMedioMinimo) {
            precoMedioMinimo = precoMedio;
            mercadoMaisBarato = mercado;
        }
    });

    document.getElementById("totalProdutos").textContent = produtosGlobal.length;
    document.getElementById("economiaMaxima").textContent = formatarPreco(economiaTotal);
    document.getElementById("economiaMedia").textContent = formatarPreco(economiaMedia);
    document.getElementById("mercadoMaisBarato").textContent = mercadoMaisBarato;
}

// Carregar ao iniciar
document.addEventListener("DOMContentLoaded", carregarProdutos);
