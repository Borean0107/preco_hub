async function importarCSV() {
    const fileInput = document.getElementById("arquivoCSV");
    const resultado = document.getElementById("resultado");

    if (!fileInput.files.length) {
        resultado.innerText = "Selecione um arquivo.";
        return;
    }

    const formData = new FormData();
    formData.append("arquivo", fileInput.files[0]);

    resultado.innerText = "Processando planilha...";

    try {
        const response = await fetch("backend/importar/importar.php", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (!data.success) {
            resultado.innerText = data.message;
            return;
        }

        resultado.innerHTML = `
            ✅ Importação concluída<br><br>
            🆕 Inseridos: ${data.data.produtos_inseridos}<br>
            🔄 Atualizados: ${data.data.produtos_atualizados}<br>
            ⚠️ Erros: ${data.data.linhas_com_erro}
        `;

    } catch (error) {
        console.error(error);
        resultado.innerText = "Erro ao importar.";
    }
}