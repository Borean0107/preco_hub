const STORAGE_USUARIO_LOGADO = "usuarioLogado";
const ADMIN_EMAIL = "admin@gmail.com";

const loginForm = document.getElementById("loginForm");
const mensagemLogin = document.getElementById("mensagemLogin");

function movimentoReduzido() {
    return window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function podeAnimar(elemento) {
    return elemento && typeof elemento.animate === "function" && !movimentoReduzido();
}

function animarLoginElemento(elemento, keyframes, opcoes) {
    if (!podeAnimar(elemento)) {
        return null;
    }

    return elemento.animate(keyframes, Object.assign({
        duration: 520,
        easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        fill: "both"
    }, opcoes || {}));
}

function prepararAnimacaoLogin(elementos) {
    elementos.forEach(function (elemento) {
        if (elemento) {
            elemento.style.opacity = "0";
        }
    });
}

function liberarAnimacaoLogin(elementos) {
    elementos.forEach(function (elemento) {
        if (elemento) {
            elemento.style.opacity = "";
        }
    });
}

function animarEntradaLogin() {
    const wrapper = document.querySelector(".login-wrapper");
    const brand = document.querySelector(".brand-signature");
    const badge = document.querySelector(".login-badge");
    const titulo = document.querySelector(".login-hero h1");
    const destaque = document.querySelector(".login-hero .highlight");
    const texto = document.querySelector(".login-hero p");
    const card = document.querySelector(".login-card");
    const itensCard = card ? [
        card.querySelector("h2"),
        card.querySelector(".text-muted"),
        card.querySelector("label[for='email']"),
        card.querySelector("#email"),
        card.querySelector("label[for='senha']"),
        card.querySelector("#senha"),
        card.querySelector(".btn-login"),
        card.querySelector(".login-actions")
    ] : [];
    const elementos = [wrapper, brand, badge, titulo, texto, card].concat(itensCard);

    if (movimentoReduzido()) {
        liberarAnimacaoLogin(elementos);
        return;
    }

    prepararAnimacaoLogin(elementos);

    document.body.animate([
        { backgroundPosition: "center 46%", filter: "saturate(0.88) brightness(0.98)" },
        { backgroundPosition: "center center", filter: "saturate(1) brightness(1)" }
    ], {
        duration: 1200,
        easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        fill: "both"
    });

    animarLoginElemento(wrapper, [
        { opacity: 0, transform: "translateY(24px) scale(0.965)", backdropFilter: "blur(8px)" },
        { opacity: 1, transform: "translateY(0) scale(1)", backdropFilter: "blur(28px)" }
    ], { duration: 680 });

    animarLoginElemento(brand, [
        { opacity: 0, transform: "translate(-22px, -10px) scale(0.94)" },
        { opacity: 1, transform: "translate(0, 0) scale(1)" }
    ], { delay: 160, duration: 540 });

    animarLoginElemento(badge, [
        { opacity: 0, transform: "translateY(18px) scale(0.92)" },
        { opacity: 1, transform: "translateY(0) scale(1)" }
    ], { delay: 300, duration: 420 });

    animarLoginElemento(titulo, [
        { opacity: 0, transform: "translateY(28px)" },
        { opacity: 1, transform: "translateY(0)" }
    ], { delay: 420, duration: 620 });

    animarLoginElemento(destaque, [
        { opacity: 0, transform: "translateX(-18px)" },
        { opacity: 1, transform: "translateX(0)" }
    ], { delay: 610, duration: 520 });

    animarLoginElemento(texto, [
        { opacity: 0, transform: "translateY(20px)" },
        { opacity: 1, transform: "translateY(0)" }
    ], { delay: 700, duration: 520 });

    animarLoginElemento(card, [
        { opacity: 0, transform: "translateX(34px) scale(0.965)" },
        { opacity: 1, transform: "translateX(0) scale(1)" }
    ], { delay: 520, duration: 680 });

    itensCard.forEach(function (elemento, index) {
        animarLoginElemento(elemento, [
            { opacity: 0, transform: "translateY(14px)" },
            { opacity: 1, transform: "translateY(0)" }
        ], {
            delay: 760 + index * 70,
            duration: 360
        });
    });

    window.setTimeout(function () {
        liberarAnimacaoLogin(elementos);
    }, 1500);
}

function mostrarMensagemLogin(tipo, texto) {
    if (!mensagemLogin) return;

    mensagemLogin.className = "alert alert-" + tipo;
    mensagemLogin.textContent = texto;
    mensagemLogin.classList.remove("d-none");
}

function esconderMensagemLogin() {
    if (!mensagemLogin) return;

    mensagemLogin.className = "alert d-none";
    mensagemLogin.textContent = "";
}

function salvarUsuarioLogado(usuario) {
    localStorage.setItem(STORAGE_USUARIO_LOGADO, JSON.stringify(usuario));
}

function usuarioEhAdmin(usuario) {
    const emailUsuario = usuario && usuario.email ? usuario.email.toLowerCase() : "";
    return emailUsuario === ADMIN_EMAIL;
}

function navegarComTransicao(destino) {
    if (window.PrecoHubTransitions && typeof window.PrecoHubTransitions.go === "function") {
        window.PrecoHubTransitions.go(destino);
        return;
    }

    window.location.href = destino;
}

function redirecionarUsuarioLogado(usuario) {
    navegarComTransicao(usuarioEhAdmin(usuario) ? "adicionar-produto.html" : "home.html");
}

animarEntradaLogin();

fetch("backend/auth/me.php", {
    credentials: "include",
    headers: {
        "Accept": "application/json"
    }
})
.then(function (response) {
    if (!response.ok) {
        return null;
    }

    return response.json();
})
.then(function (data) {
    if (data && data.success && data.data) {
        salvarUsuarioLogado(data.data);
        redirecionarUsuarioLogado(data.data);
    }
})
.catch(function () {});

if (loginForm) {
    loginForm.addEventListener("submit", function (event) {
        event.preventDefault();

        esconderMensagemLogin();

        const emailInput = document.getElementById("email");
        const senhaInput = document.getElementById("senha");

        const email = emailInput ? emailInput.value.trim().toLowerCase() : "";
        const senha = senhaInput ? senhaInput.value.trim() : "";

        if (!email || !senha) {
            mostrarMensagemLogin("warning", "Preencha email e senha.");
            return;
        }

        const formData = new FormData();
        formData.append("email", email);
        formData.append("senha", senha);

        fetch("backend/auth/login.php", {
            method: "POST",
            body: formData,
            credentials: "include"
        })
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            if (data.success) {
                salvarUsuarioLogado(data.data);
                mostrarMensagemLogin("success", data.message || "Login realizado com sucesso.");
                setTimeout(function () {
                    redirecionarUsuarioLogado(data.data);
                }, 1000);
            } else {
                mostrarMensagemLogin("danger", data.message || "Email ou senha inválidos.");
            }
        })
        .catch(function (error) {
            console.error(error);
            mostrarMensagemLogin("danger", "Erro ao fazer login. Tente novamente.");
        });
    });
}
