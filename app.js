// Configuração padrão de margens conforme a tabela enviada na imagem
const MARGENS_PADRAO = {
  cerveja: { nome: "🍺 Cerveja", perc: 18 },
  destilado: { nome: "🥃 Destilado", perc: 30 },
  vinho: { nome: "🍷 Vinho / Espumante", perc: 25 },
  refri: { nome: "🥤 Refri / Suco", perc: 18 },
  agua_com_gas: { nome: "💧 Água c/ Gás", perc: 25 },
  agua_sem_gas: { nome: "💧 Água s/ Gás", perc: 20 },
  energetico: { nome: "⚡ Energético", perc: 25 },
  ice: { nome: "🍹 Ice / Beats", perc: 20 },
  batatas: { nome: "🍟 Batatas / Salgadinhos", perc: 18 },
  molhos: { nome: "🥫 Molhos / Alimentos", perc: 18 },
  balas: { nome: "🍬 Balas / Doces", perc: 20 },
  sorvete: { nome: "🍦 Sorvetes / Picolés", perc: 25 }
};

let margensAtuais = JSON.parse(localStorage.getItem("bipou_margens_consulta")) || {};
Object.keys(MARGENS_PADRAO).forEach(k => {
  if (typeof margensAtuais[k] !== "number") {
    margensAtuais[k] = MARGENS_PADRAO[k].perc;
  }
});

// Ajustes individuais por produto (chave única: nf_cod)
// Formato: { [id]: { margemCustom?: number, precoUnitCustom?: number, precoEmbCustom?: number } }
let ajustesProdutos = JSON.parse(localStorage.getItem("bipou_ajustes_produtos")) || {};

let categoriaSelecionada = "todas";
let mostrarCustos = true;

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
      📦 Todos <span class="cat-count">${contagens.todas}</span>
    </button>
  `;

  Object.keys(MARGENS_PADRAO).forEach(catKey => {
    const info = MARGENS_PADRAO[catKey];
    const qtd = contagens[catKey] || 0;
    const m = margensAtuais[catKey];
    html += `
      <button class="cat-btn ${categoriaSelecionada === catKey ? 'active' : ''}" data-cat="${catKey}">
        ${info.nome} (${m}%) <span class="cat-count">${qtd}</span>
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

  const margem = getMargemProduto(produto);
  const precoUnitFinal = getPrecoUnitFinal(produto);
  const precoEmbFinal = getPrecoEmbFinal(produto);
  const catInfo = MARGENS_PADRAO[produto.cat];
  const isCustom = temAjusteIndividual(produto);

  let htmlPrecos = `
    <div class="price-box main">
      <span class="label">PREÇO CLIENTE (UNIDADE) ${isCustom ? '⭐ AJUSTADO' : ''}</span>
      <span class="value">${formatarMoeda(precoUnitFinal)}</span>
    </div>
  `;

  if (produto.qtdEmb > 1) {
    htmlPrecos += `
      <div class="price-box pack">
        <span class="label">PREÇO ${produto.undCompra} (C/${produto.qtdEmb} UN)</span>
        <span class="value">${formatarMoeda(precoEmbFinal)}</span>
      </div>
    `;
  }

  spot.innerHTML = `
    <div class="spotlight-info">
      <h2>${produto.desc}</h2>
      <div class="spotlight-meta">
        <span><strong>Categoria:</strong> ${catInfo ? catInfo.nome : produto.cat} (+${margem.toFixed(1).replace('.0', '')}%)</span>
        <span><strong>EAN / Código de Barras:</strong> ${produto.ean}</span>
        <span><strong>Cód. NF:</strong> ${produto.cod} (NF ${produto.nf})</span>
        ${mostrarCustos ? `<span><strong>Custo Unit. NF:</strong> ${formatarMoeda(produto.custoUnit)}</span>` : ""}
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
  document.getElementById("resultCount").innerHTML = `${filtrados.length} produto(s) encontrado(s) ${qtdAjustados > 0 ? `• <strong style="color:#fbbf24">${qtdAjustados} produto(s) com preço/margem editado</strong>` : ""}`;

  atualizarSpotlight(filtrados[0]);

  document.querySelectorAll(".col-custo").forEach(el => {
    el.style.display = mostrarCustos ? "" : "none";
  });

  if (filtrados.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding: 36px; color: #94a3b8;">
          Nenhum produto encontrado para "<strong>${document.getElementById("searchInput").value}</strong>".
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

    const margemEmbEfetiva = p.custoEmb > 0 ? (((precoEmbFinal / p.custoEmb) - 1) * 100).toFixed(1).replace(".0", "") : margem;

    const blocoEmbalagem = p.qtdEmb > 1
      ? `<div class="inline-pack-wrap ${typeof aj.precoEmbCustom === 'number' ? 'custom-active' : ''}" title="Clique para editar o valor final do Fardo / Caixa / Display diretamente">
           <span class="rs">R$</span>
           <input
             type="number"
             step="0.10"
             class="inline-pack-input"
             data-pack-id="${id}"
             value="${precoEmbFinal.toFixed(2)}"
           >
         </div>
         <span class="pack-detail">✏️ ${p.undCompra} c/ ${p.qtdEmb} un (+${margemEmbEfetiva}%) ${mostrarCustos ? `• Custo: ${formatarMoeda(p.custoEmb)}` : ""}</span>`
      : `<div class="inline-pack-wrap ${typeof aj.precoEmbCustom === 'number' ? 'custom-active' : ''}" title="Você pode informar um valor de Fardo/Caixa manualmente se vender em caixa">
           <span class="rs">R$</span>
           <input
             type="number"
             step="0.10"
             class="inline-pack-input"
             data-pack-id="${id}"
             placeholder="—"
             value="${typeof aj.precoEmbCustom === 'number' ? aj.precoEmbCustom.toFixed(2) : ''}"
           >
         </div>
         <span class="pack-detail">✏️ Caixa/Fardo opcional (${p.undCompra})</span>`;

    return `
      <tr data-id="${id}">
        <td>
          <div class="prod-name">${p.desc}</div>
          <div class="prod-sub">
            <span><strong>EAN:</strong> ${p.ean}</span>
            <span><strong>Cód:</strong> ${p.cod}</span>
            <span><strong>NF:</strong> ${p.nf}</span>
          </div>
        </td>
        <td>
          <span class="badge badge-${p.cat}">${catNome}</span>
        </td>
        <td class="col-custo" style="${mostrarCustos ? "" : "display:none;"}">
          <div class="cost-text"><strong>${formatarMoeda(p.custoUnit)}</strong> / un</div>
          ${p.qtdEmb > 1 ? `<div class="pack-detail">${p.undCompra} c/${p.qtdEmb}: ${formatarMoeda(p.custoEmb)}</div>` : ""}
        </td>
        <td>
          <div class="inline-edit-group ${isCustom ? 'custom-active' : ''}" title="Clique para alterar a margem deste produto (recalcula Unidade e Caixa)">
            <span>+</span>
            <input
              type="number"
              step="0.5"
              class="inline-margin-input"
              data-id="${id}"
              value="${Number(margem.toFixed(2))}"
            >
            <span>%</span>
          </div>
          ${isCustom ? `<button class="reset-item-btn" data-reset-id="${id}" title="Voltar para a margem padrão da categoria">Padrão</button>` : `<span class="edit-hint">✏️ Editável</span>`}
        </td>
        <td>
          <div class="inline-price-wrap ${typeof aj.precoUnitCustom === 'number' ? 'custom-active' : ''}" title="Digite o preço final da UNIDADE">
            <span class="rs">R$</span>
            <input
              type="number"
              step="0.05"
              class="inline-price-input"
              data-price-id="${id}"
              value="${precoUnitFinal.toFixed(2)}"
            >
          </div>
          <span class="edit-hint">✏️ Preço Unidade</span>
        </td>
        <td>
          ${blocoEmbalagem}
        </td>
      </tr>
    `;
  }).join("");

  // 1) Eventos de edição de margem individual (%) -> atualiza Unidade e Caixa juntos
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

  // 2) Eventos de edição direta do Preço Final da UNIDADE (R$)
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

  // 3) Eventos de edição direta do Preço Final da CAIXA / FARDO / DISPLAY (R$)
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
        // Se o usuário ainda não tinha travado um preço unitário manual e o produto tem qtdEmb > 1,
        // mantém o preço unitário atual ou deixa independente para ele ter preço de varejo (UN) e atacado (CX/FD) diferentes!
        if (typeof atual.precoUnitCustom !== "number" && typeof atual.margemCustom !== "number") {
          ajustesProdutos[id].margemCustom = margensAtuais[prod.cat] || 0;
        }
        salvarAjustesProdutos();
        renderizarProdutos();
      }
    });
  });

  // Botão para resetar ajuste individual de um produto
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
    if (confirm("Deseja restaurar todas as margens das categorias e limpar os ajustes individuais de produtos?")) {
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
    toggleCostBtn.textContent = mostrarCustos ? "👁️ Ocultar Custo NF" : "👁️ Mostrar Custo NF";
    renderizarProdutos();
  });

  // Atalho F2 ou "/" para focar direto na barra de pesquisa
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
