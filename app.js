// Configuração padrão de margens conforme a tabela enviada na imagem
const MARGENS_PADRAO = {
  cerveja: { nome: "🍺 Cerveja", perc: 18 },
  destilado: { nome: "🥃 Destilado", perc: 30 },
  vinho: { nome: "🍷 Vinho", perc: 25 },
  refri: { nome: "🥤 Refri / Suco", perc: 18 },
  agua_com_gas: { nome: "💧 Água c/ Gás", perc: 25 },
  agua_sem_gas: { nome: "💧 Água s/ Gás", perc: 20 },
  energetico: { nome: "⚡ Energético", perc: 25 },
  ice: { nome: "🍹 Ice / Beats", perc: 20 },
  batatas: { nome: "🍟 Salgadinhos", perc: 18 },
  molhos: { nome: "🥫 Alimentos", perc: 18 },
  balas: { nome: "🍬 Balas / Doces", perc: 20 },
  sorvete: { nome: "🍦 Sorvetes", perc: 25 }
};

let margensAtuais = JSON.parse(localStorage.getItem("bipou_margens_consulta")) || {};
Object.keys(MARGENS_PADRAO).forEach(k => {
  if (typeof margensAtuais[k] !== "number") {
    margensAtuais[k] = MARGENS_PADRAO[k].perc;
  }
});

let ajustesProdutos = JSON.parse(localStorage.getItem("bipou_ajustes_produtos")) || {};

let categoriaSelecionada = "todas";
// Por padrão deixa o Custo NF oculto para não poluir o visual no celular/balcão
let mostrarCustos = false;
// Permite esconder ou mostrar a coluna de Margem (%) com o botão do olho
let mostrarMargem = JSON.parse(localStorage.getItem("bipou_mostrar_margem") ?? "true");

function getProdutoId(p) {
  return `${p.nf}_${p.cod}`;
}

function getMargemProduto(p) {
  const id = getProdutoId(p);
  const aj = ajustesProdutos[id];
  if (aj && typeof aj.margemCustom === "number") {
    return aj.margemCustom;
  }
  return margensAtuais[p.cat] || 0;
}

function getPrecoUnitFinal(p) {
  const id = getProdutoId(p);
  const aj = ajustesProdutos[id];
  if (aj && typeof aj.precoUnitCustom === "number") {
    return aj.precoUnitCustom;
  }
  const margem = getMargemProduto(p);
  return calcularPrecoFinal(p.custoUnit, margem);
}

function getPrecoEmbFinal(p) {
  const id = getProdutoId(p);
  const aj = ajustesProdutos[id];
  if (aj && typeof aj.precoEmbCustom === "number") {
    return aj.precoEmbCustom;
  }
  const margem = getMargemProduto(p);
  return calcularPrecoFinal(p.custoEmb, margem);
}

function temAjusteIndividual(p) {
  const id = getProdutoId(p);
  const aj = ajustesProdutos[id];
  if (!aj) return false;
  return (
    typeof aj.margemCustom === "number" ||
    typeof aj.precoUnitCustom === "number" ||
    typeof aj.precoEmbCustom === "number"
  );
}

function salvarAjustesProdutos() {
  localStorage.setItem("bipou_ajustes_produtos", JSON.stringify(ajustesProdutos));
}

function formatarMoeda(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function normalizarTexto(txt) {
  return (txt || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function calcularPrecoFinal(custo, percentualMargem) {
  return custo * (1 + percentualMargem / 100);
}

function renderizarPainelMargens() {
  const grid = document.getElementById("marginsGrid");
  grid.innerHTML = "";
  Object.keys(MARGENS_PADRAO).forEach(catKey => {
    const info = MARGENS_PADRAO[catKey];
    const valor = margensAtuais[catKey];
    const div = document.createElement("div");
    div.className = "margin-item";
    div.innerHTML = `
      <label for="margem_${catKey}">${info.nome}</label>
      <div class="margin-input-wrap">
        <input type="number" step="0.5" min="0" max="500" id="margem_${catKey}" class="margin-input" data-cat="${catKey}" value="${valor}">
        <span>%</span>
      </div>
    `;
    grid.appendChild(div);
  });

  grid.querySelectorAll(".margin-input").forEach(input => {
    input.addEventListener("input", e => {
      const cat = e.target.getAttribute("data-cat");
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val >= 0) {
        margensAtuais[cat] = val;
        localStorage.setItem("bipou_margens_consulta", JSON.stringify(margensAtuais));
        renderizarCategorias();
        renderizarProdutos();
      }
    });
  });
}

function renderizarCategorias() {
  const bar = document.getElementById("categoriesBar");
  const contagens = { todas: PRODUTOS_NF.length };
  PRODUTOS_NF.forEach(p => {
    contagens[p.cat] = (contagens[p.cat] || 0) + 1;
  });

  let html = `
    <button class="cat-btn ${categoriaSelecionada === 'todas' ? 'active' : ''}" data-cat="todas">
      Todos <span class="cat-count">${contagens.todas}</span>
    </button>
  `;

  Object.keys(MARGENS_PADRAO).forEach(catKey => {
    const info = MARGENS_PADRAO[catKey];
    const qtd = contagens[catKey] || 0;
    html += `
      <button class="cat-btn ${categoriaSelecionada === catKey ? 'active' : ''}" data-cat="${catKey}">
        ${info.nome} <span class="cat-count">${qtd}</span>
      </button>
    `;
  });

  bar.innerHTML = html;

  bar.querySelectorAll(".cat-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      categoriaSelecionada = btn.getAttribute("data-cat");
      renderizarCategorias();
      renderizarProdutos();
    });
  });
}

function atualizarSpotlight(produto) {
  const spot = document.getElementById("spotlight");
  const termo = document.getElementById("searchInput").value.trim();

  if (!produto || termo.length === 0) {
    spot.classList.remove("visible");
    return;
  }

  const precoUnitFinal = getPrecoUnitFinal(produto);
  const precoEmbFinal = getPrecoEmbFinal(produto);
  const catInfo = MARGENS_PADRAO[produto.cat];

  let htmlPrecos = `
    <div class="price-box main">
      <span class="label">Unidade</span>
      <span class="value">${formatarMoeda(precoUnitFinal)}</span>
    </div>
  `;

  if (produto.qtdEmb > 1) {
    htmlPrecos += `
      <div class="price-box pack">
        <span class="label">${produto.undCompra} c/${produto.qtdEmb} un</span>
        <span class="value">${formatarMoeda(precoEmbFinal)}</span>
      </div>
    `;
  }

  spot.innerHTML = `
    <div class="spotlight-info">
      <h2>${produto.desc}</h2>
      <div class="spotlight-meta">
        <span>${catInfo ? catInfo.nome : produto.cat}</span>
        ${produto.ean !== "SEM GTIN" ? `<span>EAN: ${produto.ean}</span>` : ""}
        <span>Cód: ${produto.cod}</span>
      </div>
    </div>
    <div class="spotlight-prices">
      ${htmlPrecos}
    </div>
  `;
  spot.classList.add("visible");
}

function renderizarProdutos() {
  const termoBusca = normalizarTexto(document.getElementById("searchInput").value.trim());
  const tbody = document.getElementById("productsTbody");
  const clearBtn = document.getElementById("clearSearchBtn");

  clearBtn.style.display = termoBusca.length > 0 ? "block" : "none";

  const termos = termoBusca.split(/\s+/).filter(Boolean);

  const filtrados = PRODUTOS_NF.filter(p => {
    if (categoriaSelecionada !== "todas" && p.cat !== categoriaSelecionada) {
      return false;
    }
    if (termos.length === 0) return true;

    const alvo = normalizarTexto(`${p.desc} ${p.ean} ${p.cod} ${p.nf} ${MARGENS_PADRAO[p.cat]?.nome || ""}`);
    return termos.every(t => alvo.includes(t));
  });

  const qtdAjustados = Object.keys(ajustesProdutos).length;
  document.getElementById("resultCount").innerHTML = `${filtrados.length} itens ${qtdAjustados > 0 ? `• <span style="color:#fbbf24">${qtdAjustados} editado(s)</span>` : ""}`;

  atualizarSpotlight(filtrados[0]);

  document.querySelectorAll(".col-custo").forEach(el => {
    el.style.display = mostrarCustos ? "" : "none";
  });

  document.querySelectorAll(".col-margem").forEach(el => {
    el.style.display = mostrarMargem ? "" : "none";
  });

  if (filtrados.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding: 32px; color: #94a3b8;">
          Nenhum produto encontrado.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtrados.map(p => {
    const id = getProdutoId(p);
    const isCustom = temAjusteIndividual(p);
    const aj = ajustesProdutos[id] || {};
    const margem = getMargemProduto(p);
    const precoUnitFinal = getPrecoUnitFinal(p);
    const precoEmbFinal = getPrecoEmbFinal(p);
    const catNome = MARGENS_PADRAO[p.cat]?.nome || p.cat;

    const subInfo = [
      p.ean && p.ean !== "SEM GTIN" ? `EAN: ${p.ean}` : null,
      `Cód: ${p.cod}`
    ].filter(Boolean).join(" • ");

    const blocoEmbalagem = p.qtdEmb > 1
      ? `<span class="mobile-label">Caixa / Fardo (${p.undCompra} c/${p.qtdEmb})</span>
         <div class="inline-pack-wrap ${typeof aj.precoEmbCustom === 'number' ? 'custom-active' : ''}">
           <span class="rs">R$</span>
           <input
             type="number"
             step="0.10"
             class="inline-pack-input"
             data-pack-id="${id}"
             value="${precoEmbFinal.toFixed(2)}"
           >
         </div>
         <span class="pack-detail">${p.undCompra} c/${p.qtdEmb} un</span>`
      : `<span class="mobile-label">Caixa / Fardo (Opcional)</span>
         <div class="inline-pack-wrap ${typeof aj.precoEmbCustom === 'number' ? 'custom-active' : ''}">
           <span class="rs">R$</span>
           <input
             type="number"
             step="0.10"
             class="inline-pack-input"
             data-pack-id="${id}"
             placeholder="—"
             value="${typeof aj.precoEmbCustom === 'number' ? aj.precoEmbCustom.toFixed(2) : ''}"
           >
         </div>`;

    return `
      <tr data-id="${id}">
        <td class="cell-prod">
          <div>
            <div class="prod-name">${p.desc}</div>
            <div class="prod-sub">${subInfo}</div>
          </div>
          <span class="badge badge-${p.cat} mobile-label" style="display:inline-block">${catNome}</span>
        </td>
        <td class="cell-cat">
          <span class="badge badge-${p.cat}">${catNome}</span>
        </td>
        <td class="cell-custo col-custo" style="${mostrarCustos ? "" : "display:none;"}">
          <div class="cost-text">Custo: <strong>${formatarMoeda(p.custoUnit)}</strong></div>
          ${p.qtdEmb > 1 ? `<div class="pack-detail">${p.undCompra}: ${formatarMoeda(p.custoEmb)}</div>` : ""}
        </td>
        <td class="cell-margin col-margem" style="${mostrarMargem ? "" : "display:none;"}">
          <div class="inline-edit-group ${isCustom ? 'custom-active' : ''}">
            <span>+</span>
            <input
              type="number"
              step="0.5"
              class="inline-margin-input"
              data-id="${id}"
              value="${Number(margem.toFixed(1))}"
            >
            <span>%</span>
          </div>
          ${isCustom ? `<button class="reset-item-btn" data-reset-id="${id}">↺</button>` : ""}
        </td>
        <td class="cell-unit">
          <span class="mobile-label">Preço Unidade</span>
          <div class="inline-price-wrap ${typeof aj.precoUnitCustom === 'number' ? 'custom-active' : ''}">
            <span class="rs">R$</span>
            <input
              type="number"
              step="0.05"
              class="inline-price-input"
              data-price-id="${id}"
              value="${precoUnitFinal.toFixed(2)}"
            >
          </div>
        </td>
        <td class="cell-pack">
          ${blocoEmbalagem}
        </td>
      </tr>
    `;
  }).join("");

  // 1) Editar Margem (%)
  tbody.querySelectorAll(".inline-margin-input").forEach(input => {
    input.addEventListener("change", e => {
      const id = e.target.getAttribute("data-id");
      const novaMargem = parseFloat(e.target.value);
      if (!isNaN(novaMargem)) {
        ajustesProdutos[id] = { margemCustom: novaMargem };
        salvarAjustesProdutos();
        renderizarProdutos();
      }
    });
  });

  // 2) Editar Preço Unidade (R$)
  tbody.querySelectorAll(".inline-price-input").forEach(input => {
    input.addEventListener("change", e => {
      const id = e.target.getAttribute("data-price-id");
      const novoPrecoUnit = parseFloat(e.target.value);
      const prod = PRODUTOS_NF.find(p => getProdutoId(p) === id);
      if (prod && !isNaN(novoPrecoUnit) && novoPrecoUnit > 0) {
        const atual = ajustesProdutos[id] || {};
        const novaMargem = prod.custoUnit > 0 ? ((novoPrecoUnit / prod.custoUnit) - 1) * 100 : 0;
        ajustesProdutos[id] = {
          ...atual,
          margemCustom: novaMargem,
          precoUnitCustom: novoPrecoUnit
        };
        salvarAjustesProdutos();
        renderizarProdutos();
      }
    });
  });

  // 3) Editar Preço Caixa / Fardo (R$)
  tbody.querySelectorAll(".inline-pack-input").forEach(input => {
    input.addEventListener("change", e => {
      const id = e.target.getAttribute("data-pack-id");
      const valStr = e.target.value.trim();
      const prod = PRODUTOS_NF.find(p => getProdutoId(p) === id);
      if (!prod) return;

      const atual = ajustesProdutos[id] || {};
      if (valStr === "") {
        delete atual.precoEmbCustom;
        ajustesProdutos[id] = atual;
        salvarAjustesProdutos();
        renderizarProdutos();
        return;
      }

      const novoPrecoEmb = parseFloat(valStr);
      if (!isNaN(novoPrecoEmb) && novoPrecoEmb > 0) {
        ajustesProdutos[id] = {
          ...atual,
          precoEmbCustom: novoPrecoEmb
        };
        if (typeof atual.precoUnitCustom !== "number" && typeof atual.margemCustom !== "number") {
          ajustesProdutos[id].margemCustom = margensAtuais[prod.cat] || 0;
        }
        salvarAjustesProdutos();
        renderizarProdutos();
      }
    });
  });

  // Resetar item individual
  tbody.querySelectorAll(".reset-item-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      const id = e.target.getAttribute("data-reset-id");
      delete ajustesProdutos[id];
      salvarAjustesProdutos();
      renderizarProdutos();
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput");
  const clearBtn = document.getElementById("clearSearchBtn");
  const toggleMarginsBtn = document.getElementById("toggleMarginsBtn");
  const marginsPanel = document.getElementById("marginsPanel");
  const resetMarginsBtn = document.getElementById("resetMarginsBtn");
  const toggleCostBtn = document.getElementById("toggleCostBtn");
  const toggleMarginColBtn = document.getElementById("toggleMarginColBtn");

  function atualizarBotaoMargem() {
    if (!toggleMarginColBtn) return;
    toggleMarginColBtn.classList.toggle("active-toggle", mostrarMargem);
    toggleMarginColBtn.innerHTML = mostrarMargem ? "👁️ Margem %" : "🙈 Margem %";
  }

  atualizarBotaoMargem();
  renderizarPainelMargens();
  renderizarCategorias();
  renderizarProdutos();

  searchInput.addEventListener("input", () => {
    renderizarProdutos();
  });

  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    searchInput.focus();
    renderizarProdutos();
  });

  toggleMarginsBtn.addEventListener("click", () => {
    marginsPanel.classList.toggle("closed");
  });

  resetMarginsBtn.addEventListener("click", () => {
    if (confirm("Restaurar todas as margens padrão e limpar preços editados?")) {
      Object.keys(MARGENS_PADRAO).forEach(k => {
        margensAtuais[k] = MARGENS_PADRAO[k].perc;
      });
      ajustesProdutos = {};
      localStorage.setItem("bipou_margens_consulta", JSON.stringify(margensAtuais));
      salvarAjustesProdutos();
      renderizarPainelMargens();
      renderizarCategorias();
      renderizarProdutos();
    }
  });

  toggleCostBtn.addEventListener("click", () => {
    mostrarCustos = !mostrarCustos;
    toggleCostBtn.classList.toggle("active-toggle", mostrarCustos);
    toggleCostBtn.innerHTML = mostrarCustos ? "👁️ Custo" : "🙈 Custo";
    renderizarProdutos();
  });

  if (toggleMarginColBtn) {
    toggleMarginColBtn.addEventListener("click", () => {
      mostrarMargem = !mostrarMargem;
      localStorage.setItem("bipou_mostrar_margem", JSON.stringify(mostrarMargem));
      atualizarBotaoMargem();
      renderizarProdutos();
    });
  }

  const exportCsvBtn = document.getElementById("exportCsvBtn");
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener("click", () => {
      const headers = [
        "Num. NF",
        "Codigo Produto (NF)",
        "Codigo de Barras (EAN / GTIN)",
        "Descricao do Produto",
        "Categoria",
        "NCM (Codigo Fiscal)",
        "CFOP Entrada (NF)",
        "CFOP Venda Balcao (PDV)",
        "CST ICMS (Regime Normal)",
        "CSOSN (Simples Nacional)",
        "Origem Fiscal",
        "Unid. Comercial",
        "Unid. Tributavel",
        "Qtd por Caixa/Fardo",
        "Custo Unitario NF (R$)",
        "Custo Caixa/Fardo NF (R$)",
        "Margem Lucro (%)",
        "Preco Venda UNIDADE (R$)",
        "Preco Venda CAIXA/FARDO (R$)",
        "CNPJ Fornecedor",
        "Razao Social Fornecedor",
        "Chave de Acesso NF-e (44 digitos)"
      ];
      const fmt = n => Number(n).toFixed(2).replace(".", ",");
      const rows = [headers.join(";")];

      PRODUTOS_NF.forEach(p => {
        const margem = getMargemProduto(p);
        const precoUnit = getPrecoUnitFinal(p);
        const precoEmb = getPrecoEmbFinal(p);
        const catNome = (MARGENS_PADRAO[p.cat]?.nome || p.cat).replace(/^[^\wÀ-ú]+\s*/, "");
        const safeDesc = '"' + String(p.desc).replace(/"/g, '""') + '"';
        const safeForn = '"' + String(p.fornecedor || "").replace(/"/g, '""') + '"';
        const eanExcel = p.ean && p.ean !== "SEM GTIN" ? `="${p.ean}"` : "SEM GTIN";
        const chaveExcel = p.chaveNfe ? `="${p.chaveNfe}"` : "";

        rows.push([
          p.nf,
          p.cod,
          eanExcel,
          safeDesc,
          catNome,
          `="${p.ncm || ""}"`,
          p.cfopEntrada || "",
          p.cfopVendaSugerido || "",
          `="${p.cstIcmsSugerido || ""}"`,
          p.csosnSimplesSugerido || "",
          "0",
          p.undCompra,
          p.undTrib || p.undCompra,
          p.qtdEmb,
          fmt(p.custoUnit),
          fmt(p.custoEmb),
          fmt(margem) + "%",
          fmt(precoUnit),
          p.qtdEmb > 1 || typeof (ajustesProdutos[getProdutoId(p)] || {}).precoEmbCustom === "number" ? fmt(precoEmb) : fmt(precoUnit),
          `="${p.cnpjFornecedor || ""}"`,
          safeForn,
          chaveExcel
        ].join(";"));
      });

      const blob = new Blob(["\uFEFF" + rows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "planilha-produtos-cadastrados-deposito.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  document.addEventListener("keydown", e => {
    if (e.key === "F2" || (e.key === "/" && document.activeElement.tagName !== "INPUT")) {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    } else if (e.key === "Escape" && document.activeElement === searchInput) {
      searchInput.value = "";
      renderizarProdutos();
    }
  });
});
