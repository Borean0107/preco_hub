const API_LISTAR = "backend/produtos/listar.php";
const API_LISTA_LISTAR = "backend/listas/listar.php";

let produtosGlobal = [];
let graficoPrecos;
let produtoSelecionadoId = null;

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

async function lerListaComparacao() {
    try {
        const response = await fetch(API_LISTA_LISTAR, {
            credentials: "include",
            headers: {
                "Accept": "application/json"
            }
        });
        const dados = await response.json();

        if (response.status === 401) {
            throw new Error("Entre na sua conta para ver o comparador.");
        }

        if (!response.ok || !dados.success || !Array.isArray(dados.data)) {
            throw new Error(dados.message || "Nao foi possivel carregar a lista.");
        }

        return dados.data;
    } catch (erro) {
        console.error("Erro ao ler a lista de compras:", erro);
        throw erro;
    }
}

function filtrarProdutosDaLista(produtos, lista) {
    const ordemProdutos = new Map();

    lista.forEach(function (item) {
        const idProduto = Number(item.id_produto);

        if (idProduto && !ordemProdutos.has(idProduto)) {
            ordemProdutos.set(idProduto, ordemProdutos.size);
        }
    });

    return produtos
        .filter(function (produto) {
            return ordemProdutos.has(Number(produto.id_produto));
        })
        .sort(function (a, b) {
            return ordemProdutos.get(Number(a.id_produto)) -
                ordemProdutos.get(Number(b.id_produto));
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

function obterProdutoSelecionado() {
    if (produtosGlobal.length === 0) {
        return null;
    }

    const produto = produtosGlobal.find(function (item) {
        return Number(item.id_produto) === Number(produtoSelecionadoId);
    });

    return produto || produtosGlobal[0];
}

function obterProdutosFiltradosComparacao() {
    const campoBusca = document.getElementById("buscaProdutoComparacao");
    const termo = normalizarTexto(campoBusca ? campoBusca.value : "");

    if (!termo) {
        return produtosGlobal;
    }

    return produtosGlobal.filter(function (produto) {
        return normalizarTexto(produto.nome_produto).includes(termo);
    });
}

function obterProdutoPorId(idProduto) {
    return produtosGlobal.find(function (produto) {
        return Number(produto.id_produto) === Number(idProduto);
    }) || null;
}

function fecharSugestoesProdutos() {
    const sugestoes = document.getElementById("produtoComparacaoSugestoes");
    const campoBusca = document.getElementById("buscaProdutoComparacao");

    if (sugestoes) {
        sugestoes.classList.add("d-none");
    }

    if (campoBusca) {
        campoBusca.setAttribute("aria-expanded", "false");
    }
}

function renderizarSugestoesProdutos(produtos, abrir) {
    const sugestoes = document.getElementById("produtoComparacaoSugestoes");
    const campoBusca = document.getElementById("buscaProdutoComparacao");

    if (!sugestoes) {
        return;
    }

    sugestoes.innerHTML = "";

    if (!abrir) {
        fecharSugestoesProdutos();
        return;
    }

    if (produtos.length === 0) {
        sugestoes.innerHTML = '<div class="comparador-produto-vazio">Nenhum produto encontrado</div>';
    } else {
        produtos.forEach(function (produto) {
            const botao = document.createElement("button");
            const selecionado = Number(produto.id_produto) === Number(produtoSelecionadoId);

            botao.type = "button";
            botao.className = "comparador-produto-opcao" + (selecionado ? " is-active" : "");
            botao.dataset.produtoId = String(produto.id_produto);
            botao.setAttribute("role", "option");
            botao.setAttribute("aria-selected", selecionado ? "true" : "false");
            botao.textContent = produto.nome_produto || "Produto sem nome";
            sugestoes.appendChild(botao);
        });
    }

    sugestoes.classList.remove("d-none");

    if (campoBusca) {
        campoBusca.setAttribute("aria-expanded", "true");
    }
}

function selecionarProdutoComparacao(idProduto, atualizarCampo) {
    const produto = obterProdutoPorId(idProduto);
    const seletor = document.getElementById("produtoComparacao");
    const campoBusca = document.getElementById("buscaProdutoComparacao");

    if (!produto) {
        return false;
    }

    produtoSelecionadoId = Number(produto.id_produto);

    if (seletor) {
        seletor.value = String(produtoSelecionadoId);
    }

    if (campoBusca && atualizarCampo !== false) {
        campoBusca.value = produto.nome_produto || "Produto sem nome";
    }

    gerarGraficos();
    fecharSugestoesProdutos();
    return true;
}

function preencherSeletorProdutos() {
    const seletor = document.getElementById("produtoComparacao");
    const campoBusca = document.getElementById("buscaProdutoComparacao");

    if (!seletor) {
        return false;
    }

    seletor.innerHTML = "";
    if (campoBusca) {
        campoBusca.disabled = produtosGlobal.length === 0;
    }

    if (produtosGlobal.length === 0) {
        seletor.disabled = true;
        renderizarSugestoesProdutos([], false);
        return false;
    }

    produtosGlobal.forEach(function (produto) {
        const opcao = document.createElement("option");
        opcao.value = String(produto.id_produto);
        opcao.textContent = produto.nome_produto || "Produto sem nome";
        seletor.appendChild(opcao);
    });

    if (!obterProdutoPorId(produtoSelecionadoId)) {
        produtoSelecionadoId = Number(produtosGlobal[0].id_produto);
    }

    seletor.disabled = false;
    seletor.value = String(produtoSelecionadoId);

    if (campoBusca) {
        const produto = obterProdutoSelecionado();
        campoBusca.value = produto ? produto.nome_produto || "Produto sem nome" : "";
    }

    renderizarSugestoesProdutos([], false);
    return true;
}

function iniciarSeletorProduto() {
    const seletor = document.getElementById("produtoComparacao");
    const campoBusca = document.getElementById("buscaProdutoComparacao");
    const botaoAbrir = document.getElementById("abrirProdutosComparacao");
    const sugestoes = document.getElementById("produtoComparacaoSugestoes");
    const combo = document.getElementById("produtoComparacaoCombo");

    if (!seletor) {
        return;
    }

    seletor.addEventListener("change", function () {
        selecionarProdutoComparacao(seletor.value);
    });

    if (campoBusca) {
        campoBusca.addEventListener("focus", function () {
            campoBusca.select();
            renderizarSugestoesProdutos(produtosGlobal, true);
        });

        campoBusca.addEventListener("input", function () {
            const produtosFiltrados = obterProdutosFiltradosComparacao();

            renderizarSugestoesProdutos(produtosFiltrados, true);

            if (produtosFiltrados.length > 0) {
                selecionarProdutoComparacao(produtosFiltrados[0].id_produto, false);
                renderizarSugestoesProdutos(produtosFiltrados, true);
            }
        });

        campoBusca.addEventListener("keydown", function (evento) {
            const primeiroProduto = obterProdutosFiltradosComparacao()[0];

            if (evento.key === "Enter" && primeiroProduto) {
                evento.preventDefault();
                selecionarProdutoComparacao(primeiroProduto.id_produto);
            }

            if (evento.key === "Escape") {
                fecharSugestoesProdutos();
            }
        });
    }

    if (botaoAbrir) {
        botaoAbrir.addEventListener("mousedown", function (evento) {
            evento.preventDefault();

            if (sugestoes && sugestoes.classList.contains("d-none")) {
                if (campoBusca) {
                    campoBusca.focus();
                }
                renderizarSugestoesProdutos(produtosGlobal, true);
                return;
            }

            fecharSugestoesProdutos();
        });
    }

    if (sugestoes) {
        sugestoes.addEventListener("mousedown", function (evento) {
            const botao = evento.target.closest("[data-produto-id]");

            if (!botao) {
                return;
            }

            evento.preventDefault();
            selecionarProdutoComparacao(botao.dataset.produtoId);
        });
    }

    document.addEventListener("mousedown", function (evento) {
        if (combo && !combo.contains(evento.target)) {
            fecharSugestoesProdutos();
        }
    });
}

function obterPrecosProdutoOrdenados(produto) {
    return normalizarPrecos(produto ? produto.precos : [])
        .filter(function (preco) {
            return String(preco.mercado || "").trim() !== "";
        })
        .sort(function (a, b) {
            if (a.preco !== b.preco) {
                return a.preco - b.preco;
            }

            return String(a.mercado).localeCompare(String(b.mercado), "pt-BR", {
                sensitivity: "base"
            });
        });
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

function obterCorPontoGrafico(indice) {
    const cores = [
        "#DC2626",
        "#2563EB",
        "#16A34A",
        "#9333EA",
        "#EA580C",
        "#0891B2",
        "#DB2777",
        "#4F46E5",
        "#B45309",
        "#0F766E"
    ];

    return cores[indice % cores.length];
}

function abreviarNome(nome) {
    const texto = String(nome || "Produto");

    return texto.length > 18 ? texto.substring(0, 18) + "..." : texto;
}

function abreviarTexto(texto, limite) {
    const valor = String(texto || "");

    if (valor.length <= limite) {
        return valor;
    }

    return valor.substring(0, Math.max(0, limite - 3)).trimEnd() + "...";
}

function quebrarRotuloProduto(nome) {
    const texto = String(nome || "Produto").trim();
    const partes = texto.split(/\s+/).filter(Boolean);
    const linhas = [];
    let linhaAtual = "";
    const limiteLinha = 13;

    partes.forEach(function (parte) {
        const candidata = linhaAtual ? linhaAtual + " " + parte : parte;

        if (candidata.length <= limiteLinha) {
            linhaAtual = candidata;
            return;
        }

        if (linhaAtual) {
            linhas.push(linhaAtual);
        }

        linhaAtual = parte;
    });

    if (linhaAtual) {
        linhas.push(linhaAtual);
    }

    if (linhas.length === 0) {
        return "Produto";
    }

    if (linhas.length === 1) {
        return abreviarTexto(linhas[0], limiteLinha);
    }

    return [
        abreviarTexto(linhas[0], limiteLinha),
        abreviarTexto(linhas.slice(1).join(" "), limiteLinha)
    ];
}

function obterNomeProdutoPorIndice(indice) {
    const produto = produtosGlobal[indice];
    return produto ? produto.nome_produto : "";
}

function ajustarAreaGraficoPrecos(totalPontos) {
    const area = document.getElementById("areaGraficoPrecos");

    if (!area) {
        return;
    }

    const larguraVisivel = area.parentElement ? area.parentElement.clientWidth : 0;
    area.style.width = Math.max(larguraVisivel, 760, totalPontos * 170) + "px";
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
            mode: "index",
            intersect: false
        },
        plugins: {
            legend: {
                position: "bottom",
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
                },
                callbacks: {
                    label: function (context) {
                        const valor = context.parsed.y !== undefined ? context.parsed.y : context.parsed;
                        return context.dataset.label + ": " + (eixoValor === "preco" ? formatarPreco(valor) : valor);
                    }
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
                grace: "14%",
                grid: {
                    color: "rgba(148, 163, 184, 0.18)",
                    borderDash: [4, 4]
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
        },
        elements: {
            line: {
                borderJoinStyle: "round",
                borderCapStyle: "round"
            }
        }
    };
}

function criarOpcoesGraficoPrecos(produto, precosOrdenados) {
    const opcoes = obterOpcoesBase("preco");
    const valores = precosOrdenados.map(function (preco) {
        return preco.preco;
    });

    opcoes.plugins.legend.position = "bottom";
    opcoes.plugins.legend.labels.generateLabels = function (chart) {
        return Chart.defaults.plugins.legend.labels.generateLabels(chart).map(function (label) {
            label.fillStyle = "#111827";
            label.strokeStyle = "#111827";
            return label;
        });
    };
    opcoes.plugins.tooltip.callbacks = {
        title: function (items) {
            if (!items.length || !produto) {
                return "";
            }

            return produto.nome_produto || "Produto";
        },
        label: function (context) {
            return context.label + ": " + formatarPreco(context.parsed.y);
        }
    };
    opcoes.scales.x.ticks.callback = function (value) {
        return abreviarTexto(this.getLabelForValue(value), 18);
    };
    opcoes.scales.x.ticks.maxRotation = 0;
    opcoes.scales.x.ticks.minRotation = 0;
    opcoes.scales.y.beginAtZero = false;

    if (valores.length > 0) {
        const menorValor = Math.min(...valores);
        const maiorValor = Math.max(...valores);
        const diferenca = maiorValor - menorValor;
        const margem = diferenca > 0 ? diferenca * 0.35 : Math.max(menorValor * 0.04, 1);

        opcoes.scales.y.suggestedMin = Math.max(0, menorValor - margem);
        opcoes.scales.y.suggestedMax = maiorValor + margem;
    }

    return opcoes;
}

async function carregarProdutos() {
    try {
        const lista = await lerListaComparacao();

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
        preencherSeletorProdutos();
        gerarTabela();
        gerarGraficos();
        calcularEstatisticas();
    } catch (erro) {
        console.error("Erro:", erro);
        mostrarMensagem(
            '<strong>Erro ao carregar os dados do comparador.</strong> ' + escaparHtml(erro.message || "Tente atualizar a pagina ou conferir a conexao com o banco."),
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
                <span class="badge badge-economia">${formatarPreco(economia)}</span>
            </td>
        `;
        corpo.appendChild(linha);
    });
}

function gerarGraficos() {
    if (typeof Chart === "undefined") {
        console.error("Chart.js nao foi carregado.");
        return;
    }

    destruirGraficos();

    const produto = obterProdutoSelecionado();
    const precosOrdenados = obterPrecosProdutoOrdenados(produto);

    if (!produto || precosOrdenados.length === 0) {
        return;
    }

    ajustarAreaGraficoPrecos(precosOrdenados.length);

    const dadosPrecos = {
        labels: precosOrdenados.map(function (preco) {
            return preco.mercado;
        }),
        datasets: [
            {
                label: abreviarTexto(produto.nome_produto || "Produto", 42),
                data: precosOrdenados.map(function (preco) {
                    return preco.preco;
                }),
                borderColor: "#111827",
                backgroundColor: "rgba(17, 24, 39, 0.08)",
                tension: 0.38,
                fill: true,
                spanGaps: false,
                pointStyle: "circle",
                pointRadius: 7,
                pointHoverRadius: 10,
                pointBackgroundColor: precosOrdenados.map(function (_, index) {
                    return obterCorPontoGrafico(index);
                }),
                pointBorderColor: "#ffffff",
                pointBorderWidth: 3,
                borderWidth: 4,
                cubicInterpolationMode: "monotone"
            }
        ]
    };

    const ctxPrecos = document.getElementById("graficoPrecos").getContext("2d");
    graficoPrecos = new Chart(ctxPrecos, {
        type: "line",
        data: dadosPrecos,
        options: criarOpcoesGraficoPrecos(produto, precosOrdenados)
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
document.addEventListener("DOMContentLoaded", function () {
    iniciarSeletorProduto();
    carregarProdutos();
});
