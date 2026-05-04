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
const botaoCancelarEdicao = document.getElementById("botaoCancelarEdicao");
const mensagemSucesso = document.getElementById("mensagemSucesso");
const listaProdutosAdicionados = document.getElementById("listaProdutosAdicionados");
const produtoEditandoId = document.getElementById("produtoEditandoId");

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

async function lerJsonSeguro(response) {
    const texto = await response.text();
    const inicioJson = texto.indexOf("{");

    if (inicioJson === -1) {
        throw new Error("Resposta invalida do servidor.");
    }

    return JSON.parse(texto.slice(inicioJson));
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

function obterModalConfirmacaoAdmin() {
    let modal = document.getElementById("modalConfirmacaoAdmin");

    if (modal) {
        return modal;
    }

    modal = document.createElement("div");
    modal.id = "modalConfirmacaoAdmin";
    modal.className = "modal-lista-confirmacao d-none";
    modal.innerHTML = `
        <div class="modal-lista-backdrop" data-modal-fechar="true"></div>
        <div class="modal-lista-card" role="dialog" aria-modal="true" aria-labelledby="modalAdminTitulo">
            <div class="modal-lista-icone" aria-hidden="true">!</div>
            <h2 id="modalAdminTitulo">Confirmar ação</h2>
            <p id="modalAdminTexto">Tem certeza?</p>
            <div class="modal-lista-acoes">
                <button type="button" class="btn btn-outline-secondary" id="modalAdminCancelar">Cancelar</button>
                <button type="button" class="btn btn-danger" id="modalAdminConfirmar">Confirmar</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    return modal;
}

function confirmarAcaoAdmin(opcoes) {
    const modal = obterModalConfirmacaoAdmin();
    const titulo = document.getElementById("modalAdminTitulo");
    const texto = document.getElementById("modalAdminTexto");
    const botaoCancelar = document.getElementById("modalAdminCancelar");
    const botaoConfirmar = document.getElementById("modalAdminConfirmar");

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

function limparFormulario() {
    if (!formAdicionarProduto) return;

    formAdicionarProduto.reset();
    resetarPreview();

    if (botaoSalvarProduto) {
        botaoSalvarProduto.textContent = "Salvar produto";
    }

    if (produtoEditandoId) {
        produtoEditandoId.value = "";
    }

    if (botaoCancelarEdicao) {
        botaoCancelarEdicao.classList.add("d-none");
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
    const editando = produtoEditandoId && produtoEditandoId.value;

    if (!nome || !marca || !categoria) {
        mostrarMensagem("Preencha nome, marca e categoria.", "warning");
        return false;
    }

    if (!editando && !imagem) {
        mostrarMensagem("Selecione uma imagem para o produto.", "warning");
        return false;
    }

    if (imagem && imagem.size > 2 * 1024 * 1024) {
        mostrarMensagem("A imagem deve ter no maximo 2MB.", "warning");
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

        const data = await lerJsonSeguro(response);
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
        const nomeSeguro = escaparHtml(produto.nome_produto || "Produto sem nome");
        const fabricanteSeguro = escaparHtml(produto.nome_fabricante || "-");
        const categoriaSeguro = escaparHtml(produto.nome_categoria || "-");
        const imagemSegura = escaparHtml(produto.imagem_produto || "assets/img/logo/logo.png");

        return `
            <div class="produto-adicionado-item">
                <div class="produto-adicionado-topo">
                    <div class="produto-adicionado-info">
                        <h3>${nomeSeguro}</h3>
                        <p class="mb-1"><strong>Marca:</strong> ${fabricanteSeguro}</p>
                        <p class="mb-0"><strong>Categoria:</strong> ${categoriaSeguro}</p>
                    </div>
                    <img src="${imagemSegura}" alt="${nomeSeguro}">
                </div>

                <ul class="list-group mt-3">
                    ${precosOrdenados.length ? precosOrdenados.map(function (item, index) {
                        const mercadoSeguro = escaparHtml(item.mercado || "Mercado");
                        return `
                            <li class="list-group-item d-flex justify-content-between ${index === 0 ? "lowest-price" : ""}">
                                <span>${mercadoSeguro}</span>
                                <span>${formatarPreco(item.preco)}</span>
                            </li>
                        `;
                    }).join("") : `
                        <li class="list-group-item text-muted">Sem precos cadastrados.</li>
                    `}
                </ul>

                <div class="d-flex gap-2 flex-wrap mt-3">
                    <button class="btn btn-sm btn-outline-danger botao-remover" data-id="${produto.id_produto}">
                        Remover
                    </button>
                    <button class="btn btn-sm btn-outline-primary botao-editar" data-id="${produto.id_produto}">
                        Editar
                    </button>
                </div>
            </div>
        `;
    }).join("");

    ativarBotoesRemover();
    ativarBotoesEditar(produtos);
}

function ativarBotoesEditar(produtos) {
    const botoesEditar = document.querySelectorAll(".botao-editar");

    botoesEditar.forEach(function (botao) {
        botao.addEventListener("click", function () {
            const id = Number(botao.dataset.id);
            const produto = produtos.find(function (item) {
                return Number(item.id_produto) === id;
            });

            if (produto) {
                iniciarEdicaoProduto(produto);
            }
        });
    });
}

function garantirOpcaoSelect(select, valor) {
    if (!select || !valor) return;

    const existe = Array.from(select.options).some(function (option) {
        return option.value.toLowerCase() === String(valor).toLowerCase();
    });

    if (!existe) {
        const option = document.createElement("option");
        option.value = valor;
        option.textContent = valor;
        select.appendChild(option);
    }
}

function iniciarEdicaoProduto(produto) {
    if (!formAdicionarProduto) return;

    produtoEditandoId.value = produto.id_produto;
    nomeProduto.value = produto.nome_produto || "";
    marcaProduto.value = produto.nome_fabricante || "";

    garantirOpcaoSelect(categoriaProduto, produto.nome_categoria);
    categoriaProduto.value = produto.nome_categoria || "";

    preencherPreview(produto.imagem_produto || "");
    imagemProduto.value = "";

    const nomes = document.querySelectorAll("input[name='mercadoNome[]']");
    const precos = document.querySelectorAll("input[name='mercadoPreco[]']");
    const precosProduto = produto.precos || [];

    nomes.forEach(function (campo, index) {
        campo.value = precosProduto[index] ? precosProduto[index].mercado : "";
    });

    precos.forEach(function (campo, index) {
        campo.value = precosProduto[index] ? precosProduto[index].preco : "";
    });

    if (botaoSalvarProduto) {
        botaoSalvarProduto.textContent = "Atualizar produto";
    }

    if (botaoCancelarEdicao) {
        botaoCancelarEdicao.classList.remove("d-none");
    }

    formAdicionarProduto.scrollIntoView({ behavior: "smooth", block: "start" });
}

function ativarBotoesRemover() {
    const botoesRemover = document.querySelectorAll(".botao-remover");

    botoesRemover.forEach(function (botao) {
        botao.addEventListener("click", async function () {
            const id = Number(botao.dataset.id);

            if (!id) {
                return;
            }

            const confirmado = await confirmarAcaoAdmin({
                titulo: "Remover produto",
                texto: "Este produto sera removido do cadastro e da lista dos usuarios.",
                confirmar: "Remover"
            });

            if (confirmado) {
                await removerProduto(id);
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

        const data = await lerJsonSeguro(response);

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

        const data = await lerJsonSeguro(response);

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

if (botaoCancelarEdicao) {
    botaoCancelarEdicao.addEventListener("click", limparFormulario);
}

document.addEventListener("DOMContentLoaded", function () {
    renderizarProdutosCadastrados();
    resetarPreview();
});
