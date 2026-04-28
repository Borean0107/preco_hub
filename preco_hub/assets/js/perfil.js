(function () {
    var STORAGE_USUARIO_LOGADO = "usuarioLogado";

    function obterElemento(id) {
        return document.getElementById(id);
    }

    function obterIniciais(usuario) {
        var nome = usuario && usuario.nome ? usuario.nome.trim() : "";
        var email = usuario && usuario.email ? usuario.email.trim() : "";
        var base = nome || email || "Usuario";

        return base
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(function (parte) {
                return parte.charAt(0).toUpperCase();
            })
            .join("");
    }

    function fecharCaixa() {
        var botaoPerfil = obterElemento("botaoPerfil");
        var caixaPerfil = obterElemento("caixaPerfil");

        if (caixaPerfil) {
            caixaPerfil.classList.add("d-none");
        }

        if (botaoPerfil) {
            botaoPerfil.setAttribute("aria-expanded", "false");
        }
    }

    function alternarCaixa() {
        var botaoPerfil = obterElemento("botaoPerfil");
        var caixaPerfil = obterElemento("caixaPerfil");

        if (!botaoPerfil || !caixaPerfil) {
            return;
        }

        var vaiAbrir = caixaPerfil.classList.contains("d-none");
        caixaPerfil.classList.toggle("d-none", !vaiAbrir);
        botaoPerfil.setAttribute("aria-expanded", vaiAbrir ? "true" : "false");
    }

    function mostrarEntrar() {
        var botaoEntrar = obterElemento("botaoEntrar");
        var botaoPerfil = obterElemento("botaoPerfil");
        var caixaPerfil = obterElemento("caixaPerfil");

        localStorage.removeItem(STORAGE_USUARIO_LOGADO);

        if (botaoEntrar) {
            botaoEntrar.classList.remove("d-none");
        }

        if (botaoPerfil) {
            botaoPerfil.classList.add("d-none");
            botaoPerfil.setAttribute("aria-expanded", "false");
        }

        if (caixaPerfil) {
            caixaPerfil.classList.add("d-none");
        }
    }

    function preencherPerfil(usuario) {
        var nome = usuario.nome || "Usuario";
        var email = usuario.email || "Email nao informado";
        var primeiroNome = nome.split(" ")[0] || "Perfil";
        var iniciais = obterIniciais(usuario);
        var campos = {
            perfilAvatar: iniciais,
            perfilAvatarGrande: iniciais,
            perfilNomeCurto: primeiroNome,
            perfilNomeTopo: nome,
            perfilNome: nome,
            perfilEmail: email
        };

        Object.keys(campos).forEach(function (id) {
            var elemento = obterElemento(id);

            if (elemento) {
                elemento.textContent = campos[id];
            }
        });
    }

    function mostrarPerfil(usuario) {
        var botaoEntrar = obterElemento("botaoEntrar");
        var botaoPerfil = obterElemento("botaoPerfil");

        preencherPerfil(usuario);
        localStorage.setItem(STORAGE_USUARIO_LOGADO, JSON.stringify(usuario));

        if (botaoEntrar) {
            botaoEntrar.classList.add("d-none");
        }

        if (botaoPerfil) {
            botaoPerfil.classList.remove("d-none");
        }
    }

    async function buscarUsuarioDaSessao() {
        var response = await fetch("backend/auth/me.php", {
            credentials: "include",
            headers: {
                "Accept": "application/json"
            }
        });
        var data = await response.json();

        if (!response.ok || !data.success) {
            return null;
        }

        return data.data;
    }

    async function sairDaConta() {
        try {
            await fetch("backend/auth/logout.php", {
                method: "POST",
                credentials: "include"
            });
        } catch (error) {
            console.error(error);
        }

        fecharCaixa();
        mostrarEntrar();
    }

    function registrarEventos() {
        var botaoPerfil = obterElemento("botaoPerfil");
        var caixaPerfil = obterElemento("caixaPerfil");
        var botaoSair = obterElemento("botaoSair");

        if (botaoPerfil && !botaoPerfil.dataset.perfilEvento) {
            botaoPerfil.dataset.perfilEvento = "true";
            botaoPerfil.addEventListener("click", function (event) {
                event.stopPropagation();
                alternarCaixa();
            });
        }

        if (caixaPerfil && !caixaPerfil.dataset.perfilEvento) {
            caixaPerfil.dataset.perfilEvento = "true";
            caixaPerfil.addEventListener("click", function (event) {
                event.stopPropagation();
            });
        }

        if (botaoSair && !botaoSair.dataset.perfilEvento) {
            botaoSair.dataset.perfilEvento = "true";
            botaoSair.addEventListener("click", sairDaConta);
        }

        if (!document.body.dataset.perfilEventosGlobais) {
            document.body.dataset.perfilEventosGlobais = "true";
            document.addEventListener("click", fecharCaixa);
            document.addEventListener("keydown", function (event) {
                if (event.key === "Escape") {
                    fecharCaixa();
                }
            });
        }
    }

    async function ativarPerfil() {
        if (!obterElemento("botaoEntrar") || !obterElemento("botaoPerfil")) {
            return;
        }

        mostrarEntrar();
        registrarEventos();

        try {
            var usuario = await buscarUsuarioDaSessao();

            if (usuario) {
                mostrarPerfil(usuario);
            } else {
                mostrarEntrar();
            }
        } catch (error) {
            console.error(error);
            mostrarEntrar();
        }
    }

    window.PrecoHubPerfil = {
        ativar: ativarPerfil
    };

    document.addEventListener("DOMContentLoaded", ativarPerfil);
})();
