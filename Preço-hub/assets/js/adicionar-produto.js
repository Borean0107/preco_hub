const STORAGE_PRODUTOS = "produtosCadastrados";

const formAdicionarProduto = document.getElementById("formAdicionarProduto");
const produtoEditandoId = document.getElementById("produtoEditandoId");
const nomeProduto = document.getElementById("nomeProduto");
const marcaProduto = document.getElementById("marcaProduto");
const categoriaProduto = document.getElementById("categoriaProduto");
const imagemProduto = document.getElementById("imagemProduto");

const precoSavegnago = document.getElementById("precoSavegnago");
const precoFavetta = document.getElementById("precoFavetta");
const precoPagueMenos = document.getElementById("precoPagueMenos");

const previewImagem = document.getElementById("previewImagem");
const textoPreview = document.getElementById("textoPreview");
const botaoSalvarProduto = document.getElementById("botaoSalvarProduto");
const botaoCancelarEdicao = document.getElementById("botaoCancelarEdicao");
const mensagemSucesso = document.getElementById("mensagemSucesso");
const listaProdutosAdicionados = document.getElementById("listaProdutosAdicionados");

function normalizarTexto(texto) {
    return String(texto || "")
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

function lerProdutos() {
    const dados = localStorage.getItem(STORAGE_PRODUTOS);
    return dados ? JSON.parse(dados) : [];
}

function salvarProdutos(produtos) {
    localStorage.setItem(STORAGE_PRODUTOS, JSON.stringify(produtos));
}

function resetarPreview() {
    if (previewImagem) {
        previewImagem.src = "";
        previewImagem.classList.add("d-none");
    }

    if (textoPreview) {
        textoPreview.classList.remove("d-none");
    }
}

function preencherPreview(imagem) {
    if (!imagem) {
        resetarPreview();
        return;
    }

    previewImagem.src = imagem;
    previewImagem.classList.remove("d-none");

    if (textoPreview) {
        textoPreview.classList.add("d-none");
    }
}

function mostrarMensagem(texto, tipo) {
    if (!mensagemSucesso) return;

    const tipoFinal = tipo || "success";

    mensagemSucesso.textContent = texto;
    mensagemSucesso.className = "alert alert-" + tipoFinal + " mt-4";
    mensagemSucesso.classList.remove("d-none");

    setTimeout(function () {
        mensagemSucesso.classList.add("d-none");
    }, 2500);
}

function limparFormulario() {
    if (!formAdicionarProduto) return;

    formAdicionarProduto.reset();

    if (produtoEditandoId) {
        produtoEditandoId.value = "";
    }

    if (botaoSalvarProduto) {
        botaoSalvarProduto.textContent = "Salvar produto";
    }

    if (botaoCancelarEdicao) {
        botaoCancelarEdicao.classList.add("d-none");
    }

    resetarPreview();
}

function obterPrecosFormulario() {
    return [
        {
            mercado: "Savegnago",
            preco: parseFloat(precoSavegnago.value || "0")
        },
        {
            mercado: "Favetta",
            preco: parseFloat(precoFavetta.value || "0")
        },
        {
            mercado: "Pague Menos",
            preco: parseFloat(precoPagueMenos.value || "0")
        }
    ];
}

function ordenarPrecos(precos) {
    return precos.slice().sort(function (a, b) {
        return Number(a.preco) - Number(b.preco);
    });
}

function editarProduto(id) {
    const produtos = lerProdutos();
    const produto = produtos.find(function (item) {
        return item.id === id;
    });

    if (!produto) return;

    if (produtoEditandoId) {
        produtoEditandoId.value = produto.id;
    }

    if (nomeProduto) nomeProduto.value = produto.nome || "";
    if (marcaProduto) marcaProduto.value = produto.marca || "";
    if (categoriaProduto) categoriaProduto.value = produto.categoria || "";

    const precoMercadoSavegnago = produto.precos.find(function (p) {
        return p.mercado === "Savegnago";
    });

    const precoMercadoFavetta = produto.precos.find(function (p) {
        return p.mercado === "Favetta";
    });

    const precoMercadoPagueMenos = produto.precos.find(function (p) {
        return p.mercado === "Pague Menos";
    });

    if (precoSavegnago) precoSavegnago.value = precoMercadoSavegnago ? precoMercadoSavegnago.preco : "";
    if (precoFavetta) precoFavetta.value = precoMercadoFavetta ? precoMercadoFavetta.preco : "";
    if (precoPagueMenos) precoPagueMenos.value = precoMercadoPagueMenos ? precoMercadoPagueMenos.preco : "";

    preencherPreview(produto.imagem);

    if (botaoSalvarProduto) {
        botaoSalvarProduto.textContent = "Atualizar produto";
    }

    if (botaoCancelarEdicao) {
        botaoCancelarEdicao.classList.remove("d-none");
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function excluirProduto(id) {
    const confirmar = window.confirm("Tem certeza que deseja excluir este produto?");
    if (!confirmar) return;

    const produtos = lerProdutos().filter(function (produto) {
        return produto.id !== id;
    });

    salvarProdutos(produtos);

    if (produtoEditandoId && Number(produtoEditandoId.value) === id) {
        limparFormulario();
    }

    renderizarProdutosCadastrados();
    mostrarMensagem("Produto excluído com sucesso.", "success");
}

function ativarBotoesAcao() {
    const botoesEditar = document.querySelectorAll(".botao-editar");
    const botoesExcluir = document.querySelectorAll(".botao-excluir");

    botoesEditar.forEach(function (botao) {
        botao.addEventListener("click", function () {
            editarProduto(Number(botao.dataset.id));
        });
    });

    botoesExcluir.forEach(function (botao) {
        botao.addEventListener("click", function () {
            excluirProduto(Number(botao.dataset.id));
        });
    });
}

function renderizarProdutosCadastrados() {
    if (!listaProdutosAdicionados) return;

    const produtos = lerProdutos();

    if (produtos.length === 0) {
        listaProdutosAdicionados.className = "produtos-adicionados-vazio text-muted";
        listaProdutosAdicionados.innerHTML = "Nenhum produto cadastrado nesta tela ainda.";
        return;
    }

    listaProdutosAdicionados.className = "";
    listaProdutosAdicionados.innerHTML = produtos.map(function (produto) {
        const precosOrdenados = ordenarPrecos(produto.precos);

        return `
            <div class="produto-adicionado-item">
                <div class="produto-adicionado-topo">
                    <div class="produto-adicionado-info">
                        <h3>${produto.nome}</h3>
                        <p class="mb-1"><strong>Marca:</strong> ${produto.marca || "-"}</p>
                        <p class="mb-0"><strong>Categoria:</strong> ${produto.categoria || "-"}</p>
                    </div>
                    <img src="${produto.imagem}" alt="${produto.nome}">
                </div>

                <ul class="list-group mt-3">
                    ${precosOrdenados.map(function (item, index) {
                        return `
                            <li class="list-group-item d-flex justify-content-between ${index === 0 ? "lowest-price" : ""}">
                                <span>${item.mercado}</span>
                                <span>${formatarPreco(item.preco)}</span>
                            </li>
                        `;
                    }).join("")}
                </ul>

                <div class="d-flex gap-2 flex-wrap mt-3">
                    <button class="btn btn-sm btn-outline-primary botao-editar" data-id="${produto.id}">
                        Editar
                    </button>
                    <button class="btn btn-sm btn-outline-danger botao-excluir" data-id="${produto.id}">
                        Excluir
                    </button>
                </div>
            </div>
        `;
    }).join("");

    ativarBotoesAcao();
}

function validarFormulario(nome, marca, categoria, precos, imagemFinal, idEditando) {
    if (!nome || !marca || !categoria) {
        mostrarMensagem("Preencha nome, marca e categoria.", "warning");
        return false;
    }

    const algumPrecoInvalido = precos.some(function (item) {
        return isNaN(item.preco) || item.preco <= 0;
    });

    if (algumPrecoInvalido) {
        mostrarMensagem("Informe preços válidos para todos os mercados.", "warning");
        return false;
    }

    if (!imagemFinal && !idEditando) {
        mostrarMensagem("Selecione uma imagem para o produto.", "warning");
        return false;
    }

    return true;
}

function salvarProduto(imagemFinal) {
    const idEditando = produtoEditandoId && produtoEditandoId.value
        ? Number(produtoEditandoId.value)
        : null;

    const nome = nomeProduto ? nomeProduto.value.trim() : "";
    const marca = marcaProduto ? marcaProduto.value.trim() : "";
    const categoria = categoriaProduto ? categoriaProduto.value : "";
    const precos = obterPrecosFormulario();

    const produtos = lerProdutos();

    const duplicado = produtos.some(function (produto) {
        return normalizarTexto(produto.nome) === normalizarTexto(nome) && produto.id !== idEditando;
    });

    if (duplicado) {
        mostrarMensagem("Já existe um produto com esse nome.", "danger");
        return;
    }

    if (!validarFormulario(nome, marca, categoria, precos, imagemFinal, idEditando)) {
        return;
    }

    const produtoFinal = {
        id: idEditando || Date.now(),
        nome: nome,
        marca: marca,
        categoria: categoria,
        imagem: imagemFinal,
        precos: precos
    };

    let novaLista;

    if (idEditando) {
        novaLista = produtos.map(function (produto) {
            return produto.id === idEditando ? produtoFinal : produto;
        });

        mostrarMensagem("Produto atualizado com sucesso.", "success");
    } else {
        novaLista = produtos.slice();
        novaLista.push(produtoFinal);

        mostrarMensagem("Produto salvo com sucesso.", "success");
    }

    salvarProdutos(novaLista);
    limparFormulario();
    renderizarProdutosCadastrados();
}

if (imagemProduto) {
    imagemProduto.addEventListener("change", function () {
        const arquivo = imagemProduto.files[0];

        if (!arquivo) {
            resetarPreview();
            return;
        }

        const leitor = new FileReader();

        leitor.onload = function (evento) {
            preencherPreview(evento.target.result);
        };

        leitor.readAsDataURL(arquivo);
    });
}

if (botaoCancelarEdicao) {
    botaoCancelarEdicao.addEventListener("click", function () {
        limparFormulario();
    });
}

if (formAdicionarProduto) {
    formAdicionarProduto.addEventListener("submit", function (event) {
        event.preventDefault();

        const arquivo = imagemProduto && imagemProduto.files ? imagemProduto.files[0] : null;

        if (arquivo) {
            const leitor = new FileReader();

            leitor.onload = function (evento) {
                salvarProduto(evento.target.result);
            };

            leitor.readAsDataURL(arquivo);
            return;
        }

        const idEditando = produtoEditandoId && produtoEditandoId.value
            ? Number(produtoEditandoId.value)
            : null;

        if (idEditando) {
            const produtos = lerProdutos();
            const produtoAtual = produtos.find(function (produto) {
                return produto.id === idEditando;
            });

            salvarProduto(produtoAtual ? produtoAtual.imagem : "");
        } else {
            salvarProduto("");
        }
    });
}

document.addEventListener("DOMContentLoaded", function () {
    renderizarProdutosCadastrados();
    resetarPreview();
});