(function () {
    var DURACAO_TRANSICAO = 260;
    var CHAVE_TRANSICAO = "precohub:transicao-pendente";
    var navegando = false;

    function lerTransicaoPendente() {
        try {
            return sessionStorage.getItem(CHAVE_TRANSICAO) === "1";
        } catch (error) {
            return false;
        }
    }

    function marcarTransicaoPendente() {
        try {
            sessionStorage.setItem(CHAVE_TRANSICAO, "1");
        } catch (error) {}
    }

    function limparTransicaoPendente() {
        try {
            sessionStorage.removeItem(CHAVE_TRANSICAO);
        } catch (error) {}
    }

    if (lerTransicaoPendente()) {
        document.documentElement.classList.add("transicao-pagina-entrando");
    }

    function movimentoReduzido() {
        return window.matchMedia &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    function obterUrl(destino) {
        try {
            return new URL(destino, window.location.href);
        } catch (error) {
            return null;
        }
    }

    function aplicarEntrada() {
        if (movimentoReduzido()) {
            limparTransicaoPendente();
            return;
        }

        if (document.documentElement.classList.contains("transicao-pagina-entrando")) {
            window.requestAnimationFrame(function () {
                document.documentElement.classList.remove("transicao-pagina-entrando");
                limparTransicaoPendente();
            });
        }
    }

    function navegar(destino, opcoes) {
        var url = obterUrl(destino);
        var deveSubstituir = Boolean(opcoes && opcoes.replace);

        if (!url) {
            if (deveSubstituir) {
                window.location.replace(destino);
            } else {
                window.location.href = destino;
            }
            return;
        }

        if (navegando || url.href === window.location.href) {
            return;
        }

        navegando = true;

        function concluirNavegacao() {
            marcarTransicaoPendente();

            if (deveSubstituir) {
                window.location.replace(url.href);
            } else {
                window.location.href = url.href;
            }
        }

        if (movimentoReduzido()) {
            concluirNavegacao();
            return;
        }

        document.documentElement.classList.remove("transicao-pagina-entrando");
        document.documentElement.classList.add("transicao-pagina-saindo");

        window.setTimeout(concluirNavegacao, DURACAO_TRANSICAO);
    }

    function linkInternoValido(link, event) {
        var href = link.getAttribute("href");
        var url;

        if (!href || href.charAt(0) === "#" || link.hasAttribute("download")) {
            return null;
        }

        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return null;
        }

        if (link.target && link.target !== "_self") {
            return null;
        }

        url = obterUrl(href);

        if (!url || url.origin !== window.location.origin) {
            return null;
        }

        if (url.pathname === window.location.pathname &&
                url.search === window.location.search &&
                url.hash) {
            return null;
        }

        return url;
    }

    document.addEventListener("click", function (event) {
        var alvo = event.target && event.target.nodeType === 3 ? event.target.parentElement : event.target;
        var link = alvo && alvo.closest ? alvo.closest("a") : null;
        var url;

        if (!link) {
            return;
        }

        url = linkInternoValido(link, event);

        if (!url) {
            return;
        }

        event.preventDefault();
        navegar(url.href);
    }, true);

    document.addEventListener("DOMContentLoaded", aplicarEntrada);
    window.addEventListener("pageshow", function (event) {
        navegando = false;

        if (event.persisted) {
            document.documentElement.classList.remove("transicao-pagina-saindo");
            aplicarEntrada();
        }
    });

    window.PrecoHubTransitions = {
        go: navegar
    };
})();
