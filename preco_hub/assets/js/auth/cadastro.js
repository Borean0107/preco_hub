const registerForm = document.getElementById("registerForm");
const mensagemCadastro = document.getElementById("mensagemCadastro");

function movimentoReduzido() {
    return window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function podeAnimar(elemento) {
    return elemento && typeof elemento.animate === "function" && !movimentoReduzido();
}

function animarCadastroElemento(elemento, keyframes, opcoes) {
    if (!podeAnimar(elemento)) {
        return null;
    }

    return elemento.animate(keyframes, Object.assign({
        duration: 460,
        easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        fill: "both"
    }, opcoes || {}));
}

function prepararAnimacaoCadastro(elementos) {
    elementos.forEach(function (elemento) {
        if (elemento) {
            elemento.style.opacity = "0";
        }
    });
}

function liberarAnimacaoCadastro(elementos) {
    elementos.forEach(function (elemento) {
        if (elemento) {
            elemento.style.opacity = "";
        }
    });
}

function animarEntradaCadastro() {
    const painel = document.querySelector(".login-wrapper");
    const brand = document.querySelector(".brand-signature");
    const badge = document.querySelector(".login-badge");
    const titulo = document.querySelector(".login-hero h1");
    const destaque = document.querySelector(".login-hero .highlight");
    const texto = document.querySelector(".login-hero p");
    const card = document.querySelector(".login-card");
    const itens = card ? [
        card.querySelector("h2"),
        card.querySelector(".text-muted"),
        card.querySelector("label[for='nome']"),
        card.querySelector("#nome"),
        card.querySelector("label[for='email']"),
        card.querySelector("#email"),
        card.querySelector("label[for='senha']"),
        card.querySelector("#senha"),
        card.querySelector("label[for='confirmarSenha']"),
        card.querySelector("#confirmarSenha"),
        card.querySelector(".btn-login"),
        card.querySelector(".voltar-link")
    ] : [];
    const elementos = [painel, brand, badge, titulo, destaque, texto, card].concat(itens);

    if (movimentoReduzido()) {
        liberarAnimacaoCadastro(elementos);
        return;
    }

    prepararAnimacaoCadastro(elementos);

    document.body.animate([
        { backgroundPosition: "center 46%", filter: "saturate(0.88) brightness(0.98)" },
        { backgroundPosition: "center center", filter: "saturate(1) brightness(1)" }
    ], {
        duration: 1000,
        easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        fill: "both"
    });

    animarCadastroElemento(painel, [
        { opacity: 0, transform: "translateY(24px) scale(0.965)", backdropFilter: "blur(8px)" },
        { opacity: 1, transform: "translateY(0) scale(1)", backdropFilter: "blur(28px)" }
    ], { duration: 680 });

    animarCadastroElemento(brand, [
        { opacity: 0, transform: "translate(-22px, -10px) scale(0.94)" },
        { opacity: 1, transform: "translate(0, 0) scale(1)" }
    ], { delay: 160, duration: 540 });

    animarCadastroElemento(badge, [
        { opacity: 0, transform: "translateY(18px) scale(0.92)" },
        { opacity: 1, transform: "translateY(0) scale(1)" }
    ], { delay: 300, duration: 420 });

    animarCadastroElemento(titulo, [
        { opacity: 0, transform: "translateY(28px)" },
        { opacity: 1, transform: "translateY(0)" }
    ], { delay: 420, duration: 620 });

    animarCadastroElemento(destaque, [
        { opacity: 0, transform: "translateX(-18px)" },
        { opacity: 1, transform: "translateX(0)" }
    ], { delay: 610, duration: 520 });

    animarCadastroElemento(texto, [
        { opacity: 0, transform: "translateY(20px)" },
        { opacity: 1, transform: "translateY(0)" }
    ], { delay: 700, duration: 520 });

    animarCadastroElemento(card, [
        { opacity: 0, transform: "translateX(34px) scale(0.965)" },
        { opacity: 1, transform: "translateX(0) scale(1)" }
    ], { delay: 520, duration: 680 });

    itens.forEach(function (elemento, index) {
        animarCadastroElemento(elemento, [
            { opacity: 0, transform: "translateY(14px)" },
            { opacity: 1, transform: "translateY(0)" }
        ], {
            delay: 760 + index * 55,
            duration: 340
        });
    });

    window.setTimeout(function () {
        liberarAnimacaoCadastro(elementos);
    }, 1550);
}

function mostrarMensagemCadastro(tipo, texto) {
    if (!mensagemCadastro) return;

    mensagemCadastro.className = "alert alert-" + tipo;
    mensagemCadastro.textContent = texto;
    mensagemCadastro.classList.remove("d-none");
}

function esconderMensagemCadastro() {
    if (!mensagemCadastro) return;

    mensagemCadastro.className = "alert d-none";
    mensagemCadastro.textContent = "";
}

function emailValido(email) {
    return /\S+@\S+\.\S+/.test(email);
}

function navegarComTransicao(destino) {
    if (window.PrecoHubTransitions && typeof window.PrecoHubTransitions.go === "function") {
        window.PrecoHubTransitions.go(destino);
        return;
    }

    window.location.href = destino;
}

animarEntradaCadastro();

if (registerForm) {
    registerForm.addEventListener("submit", function (event) {
        event.preventDefault();

        esconderMensagemCadastro();

        const nomeInput = document.getElementById("nome");
        const emailInput = document.getElementById("email");
        const senhaInput = document.getElementById("senha");
        const confirmarSenhaInput = document.getElementById("confirmarSenha");

        const nome = nomeInput ? nomeInput.value.trim() : "";
        const email = emailInput ? emailInput.value.trim().toLowerCase() : "";
        const senha = senhaInput ? senhaInput.value.trim() : "";
        const confirmarSenha = confirmarSenhaInput ? confirmarSenhaInput.value.trim() : "";

        if (!nome || !email || !senha || !confirmarSenha) {
            mostrarMensagemCadastro("warning", "Preencha todos os campos.");
            return;
        }

        if (!emailValido(email)) {
            mostrarMensagemCadastro("warning", "Digite um email válido.");
            return;
        }

        if (senha.length < 6) {
            mostrarMensagemCadastro("warning", "A senha deve ter pelo menos 6 caracteres.");
            return;
        }

        if (senha !== confirmarSenha) {
            mostrarMensagemCadastro("danger", "As senhas não coincidem.");
            return;
        }

        const formData = new FormData();
        formData.append("nome", nome);
        formData.append("email", email);
        formData.append("senha", senha);

        fetch("backend/auth/register.php", {
            method: "POST",
            body: formData,
            credentials: "include"
        })
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            if (data.success) {
                mostrarMensagemCadastro("success", data.message || "Cadastro realizado com sucesso.");
                registerForm.reset();
                setTimeout(function () {
                    navegarComTransicao("index.html");
                }, 1200);
            } else {
                mostrarMensagemCadastro("danger", data.message || "Erro ao cadastrar.");
            }
        })
        .catch(function (error) {
            console.error(error);
            mostrarMensagemCadastro("danger", "Erro ao cadastrar. Tente novamente.");
        });
    });
}
