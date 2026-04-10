const API_LISTAR_PRODUTOS = "backend/produtos/listar.php";
const API_SALVAR_PRODUTO = "backend/produtos/salvar.php";

const formAdicionarProduto = document.getElementById("formAdicionarProduto");
const nomeProduto = document.getElementById("nomeProduto");
const marcaProduto = document.getElementById("marcaProduto");
const categoriaProduto = document.getElementById("categoriaProduto");
const imagemProduto = document.getElementById("imagemProduto");
const mercadoNomeCampos = document.querySelectorAll("input[name='mercadoNome[]']");
const mercadoPrecoCampos = document.querySelectorAll("input[name='mercadoPreco[]']");

const previewImagem = document.getElementById("previewImagem");
const textoPreview = document.getElementById("textoPreview");
const botaoSalvarProduto = document.getElementById("botaoSalvarProduto");
const mensagemSucesso = document.getElementById("mensagemSucesso");
const listaProdutosAdicionados = document.getElementById("listaProdutosAdicionados");

function formatarPreco(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
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
    }, 3000);
}

function limparFormulario() {
    if (!formAdicionarProduto) return;

    formAdicionarProduto.reset();
    resetarPreview();

    if (botaoSalvarProduto) {
        botaoSalvarProduto.textContent = "Salvar produto";
    }
}

function obterMercadosFormulario() {
    const mercados = [];

    mercadoNomeCampos.forEach(function (campo, index) {
        const nomeMercado = campo.value.trim();
        const precoMercado = mercadoPrecoCampos[index] ? mercadoPrecoCampos[index].value.trim() : "";

        if (nomeMercado || precoMercado) {
            mercados.push({
                mercado: nomeMercado,
                preco: precoMercado
            });
        }
    });

    return mercados;
}

function validarFormulario() {
    const nome = nomeProduto.value.trim();
    const marca = marcaProduto.value.trim();
    const categoria = categoriaProduto.value;
    const imagem = imagemProduto.files[0];
    const mercados = obterMercadosFormulario();

    if (!nome || !marca || !categoria) {
        mostrarMensagem("Preencha nome, marca e categoria.", "warning");
        return false;
    }

    if (!imagem) {
        mostrarMensagem("Selecione uma imagem para o produto.", "warning");
        return false;
    }

    if (mercados.length === 0) {
        mostrarMensagem("Informe pelo menos um mercado e preço.", "warning");
        return false;
    }

    const mercadoInvalido = mercados.some(function (item) {
        return !item.mercado || item.mercado.length === 0 || isNaN(Number(item.preco)) || Number(item.preco) <= 0;
    });

    if (mercadoInvalido) {
        mostrarMensagem("Informe nomes e preços válidos para todos os mercados.", "warning");
        return false;
    }

    return true;
}

async function buscarProdutos() {
    try {
        const response = await fetch(API_LISTAR_PRODUTOS, {
            headers: {
                "Accept": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error("Não foi possível carregar os produtos.");
        }

        const data = await response.json();
        return data.success ? data.data : [];
    } catch (error) {
        console.error(error);
        return [];
    }
}

async function renderizarProdutosCadastrados() {
    if (!listaProdutosAdicionados) return;

    const produtos = await buscarProdutos();

    if (!produtos || produtos.length === 0) {
        listaProdutosAdicionados.className = "produtos-adicionados-vazio text-muted";
        listaProdutosAdicionados.innerHTML = "Nenhum produto cadastrado nesta tela ainda.";
        return;
    }

    listaProdutosAdicionados.className = "";
    listaProdutosAdicionados.innerHTML = produtos.map(function (produto) {
        const precosOrdenados = produto.precos ? produto.precos.slice().sort(function (a, b) {
            return Number(a.preco) - Number(b.preco);
        }) : [];

        return `
            <div class="produto-adicionado-item">
                <div class="produto-adicionado-topo">
                    <div class="produto-adicionado-info">
                        <h3>${produto.nome_produto}</h3>
                        <p class="mb-1"><strong>Marca:</strong> ${produto.nome_fabricante || "-"}</p>
                        <p class="mb-0"><strong>Categoria:</strong> ${produto.nome_categoria || "-"}</p>
                    </div>
                    <img src="${produto.imagem_produto}" alt="${produto.nome_produto}">
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
                    <button class="btn btn-sm btn-outline-danger botao-remover" data-id="${produto.id_produto}">
                        Remover
                    </button>
                </div>
            </div>
        `;
    }).join("");

    ativarBotoesRemover();
}

function ativarBotoesRemover() {
    const botoesRemover = document.querySelectorAll(".botao-remover");

    botoesRemover.forEach(function (botao) {
        botao.addEventListener("click", function () {
            const id = Number(botao.dataset.id);
            if (id) {
                removerProduto(id);
            }
        });
    });
}

async function removerProduto(idProduto) {
    try {
        const response = await fetch("backend/produtos/remover.php", {
            method: "POST",
            headers: {
                "Accept": "application/json"
            },
            body: new URLSearchParams({ id_produto: idProduto })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Erro ao remover produto.");
        }

        mostrarMensagem(data.message || "Produto removido com sucesso.", "success");
        await renderizarProdutosCadastrados();
    } catch (error) {
        mostrarMensagem(error.message, "danger");
    }
}

async function salvarProduto() {
    if (!validarFormulario()) {
        return;
    }

    const formData = new FormData(formAdicionarProduto);

    try {
        const response = await fetch(API_SALVAR_PRODUTO, {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Erro ao salvar produto.");
        }

        mostrarMensagem(data.message || "Produto salvo com sucesso.", "success");
        limparFormulario();
        await renderizarProdutosCadastrados();
    } catch (error) {
        mostrarMensagem(error.message, "danger");
    }
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

if (formAdicionarProduto) {
    formAdicionarProduto.addEventListener("submit", function (event) {
        event.preventDefault();
        salvarProduto();
    });
}

document.addEventListener("DOMContentLoaded", function () {
    renderizarProdutosCadastrados();
    resetarPreview();
});