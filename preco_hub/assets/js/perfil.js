(function () {
    var STORAGE_USUARIO_LOGADO = "usuarioLogado";
    var ADMIN_EMAIL = "admin@gmail.com";

    function obterElemento(id) {
        return document.getElementById(id);
    }

    function usuarioEhAdmin(usuario) {
        var email = usuario && usuario.email ? usuario.email.toLowerCase() : "";
        return email === ADMIN_EMAIL;
    }

    function paginaAdminAtual() {
        return document.body && document.body.dataset.adminPage === "true";
    }

    function obterUsuarioSalvo() {
        var dados = localStorage.getItem(STORAGE_USUARIO_LOGADO);

        if (!dados) {
            return null;
        }

        try {
            return JSON.parse(dados);
        } catch (error) {
            localStorage.removeItem(STORAGE_USUARIO_LOGADO);
            return null;
        }
    }

    function redirecionarSeAcessoAdminInvalido(usuario) {
        if (!paginaAdminAtual()) {
            return false;
        }

        if (!usuario) {
            window.location.replace("login.html");
            return true;
        }

        if (!usuarioEhAdmin(usuario)) {
            window.location.replace("index.html");
            return true;
        }

        return false;
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
        var botaoAdmin = obterElemento("botaoAdmin");

        localStorage.removeItem(STORAGE_USUARIO_LOGADO);
        
        // Ocultar abas de admin para usuários não-logados
        var navLinks = document.querySelectorAll(".navbar-nav .nav-item");
        navLinks.forEach(function(navItem) {
            var link = navItem.querySelector("a");
            if (link) {
                var href = link.getAttribute("href");
                var isAbaProduto = href && (href.includes("adicionar-produto") || href.includes("importar") || href.includes("visualizador"));
                
                if (isAbaProduto) {
                    navItem.classList.add("d-none");
                }
            }
        });

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

        if (botaoAdmin) {
            botaoAdmin.remove();
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

    function controlarAbasAdmin(usuario) {
        var isAdmin = usuarioEhAdmin(usuario);
        var navLinks = document.querySelectorAll(".navbar-nav .nav-item");
        
        navLinks.forEach(function(navItem) {
            var link = navItem.querySelector("a");
            if (link) {
                var href = link.getAttribute("href");
                var isAbaProduto = href && (href.includes("adicionar-produto") || href.includes("importar") || href.includes("visualizador"));
                
                if (isAbaProduto) {
                    if (isAdmin) {
                        navItem.classList.remove("d-none");
                    } else {
                        navItem.classList.add("d-none");
                    }
                }
            }
        });
    }

    function controlarAtalhoAdmin(usuario) {
        var caixaPerfil = obterElemento("caixaPerfil");
        var botaoSair = obterElemento("botaoSair");
        var botaoAdmin = obterElemento("botaoAdmin");
        var deveMostrarAtalho = usuarioEhAdmin(usuario) && !paginaAdminAtual();

        if (!caixaPerfil || !botaoSair) {
            return;
        }

        if (!deveMostrarAtalho) {
            if (botaoAdmin) {
                botaoAdmin.remove();
            }
            return;
        }

        if (!botaoAdmin) {
            botaoAdmin = document.createElement("a");
            botaoAdmin.id = "botaoAdmin";
            botaoAdmin.className = "btn btn-outline-primary w-100 mt-3";
            botaoAdmin.href = "adicionar-produto.html";
            botaoAdmin.textContent = "Voltar para o admin";
            caixaPerfil.insertBefore(botaoAdmin, botaoSair);
        }
    }

    function mostrarPerfil(usuario) {
        var botaoEntrar = obterElemento("botaoEntrar");
        var botaoPerfil = obterElemento("botaoPerfil");

        preencherPerfil(usuario);
        controlarAbasAdmin(usuario);
        controlarAtalhoAdmin(usuario);
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

        if (window.location.pathname.endsWith("/index.html") || window.location.pathname.endsWith("/")) {
            window.location.reload();
            return;
        }

        window.location.href = "index.html";
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

        registrarEventos();

        var usuarioSalvo = obterUsuarioSalvo();

        if (usuarioSalvo) {
            mostrarPerfil(usuarioSalvo);
        } else {
            mostrarEntrar();
        }

        try {
            var usuario = await buscarUsuarioDaSessao();

            if (redirecionarSeAcessoAdminInvalido(usuario)) {
                return;
            }

            if (usuario) {
                mostrarPerfil(usuario);
            } else {
                mostrarEntrar();
            }
        } catch (error) {
            console.error(error);

            if (redirecionarSeAcessoAdminInvalido(null)) {
                return;
            }

            mostrarEntrar();
        }
    }

    window.PrecoHubPerfil = {
        ativar: ativarPerfil
    };

    document.addEventListener("DOMContentLoaded", ativarPerfil);
})();
