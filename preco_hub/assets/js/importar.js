async function importarCSV() {
    const fileInput = document.getElementById("arquivoCSV");
    const resultado = document.getElementById("resultado");

    if (!fileInput.files.length) {
        resultado.innerText = "Selecione um arquivo.";
        return;
    }

    const formData = new FormData();
    formData.append("arquivo", fileInput.files[0]);

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

        resultado.innerText = "Importação feita com sucesso!";
    } catch (error) {
        console.error(error);
        resultado.innerText = "Erro ao importar.";
    }
}0