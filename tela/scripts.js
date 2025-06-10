// Remova o array cardsData inicial, ele será carregado do Back4App
let cardsData = []; // Será preenchido pelo Back4App

// Variáveis de controle
let modoEdicao = false, cardEditandoIndex = -1;

// --- Configuração e Mapeamento Back4App ---

// Mapeamento de objetos Parse para o formato local
function mapParseObjectToLocal(parseObject) {
    // Certifique-se de que os campos do Parse correspondem aos seus campos locais
    const avaliacoes = parseObject.get('avaliacoes') || [];
    const listaRaw = parseObject.get('lista') || ''; // A lista agora é salva como uma string HTML no Parse
    
    return {
        objectId: parseObject.id, // O ID único do objeto no Back4App
        title: parseObject.get('title'),
        text_pri: parseObject.get('text_pri'),
        cont: parseObject.get('cont') || "Conteúdo detalhado:", // Valor padrão se não existir no Parse
        lista: [listaRaw], // Adapta de volta para o formato de array esperado
        img: parseObject.get('img'),
        avaliacoes: avaliacoes
    };
}


// Mapeamento de objeto local para o formato Parse
function mapLocalObjectToParse(localObject, parseObject) {
    parseObject.set('title', localObject.title);
    parseObject.set('text_pri', localObject.text_pri);
    parseObject.set('cont', localObject.cont);
    
    // Salva 'lista' como a string HTML completa no Parse
    parseObject.set('lista', localObject.lista[0]); 
    parseObject.set('img', localObject.img);
    parseObject.set('avaliacoes', localObject.avaliacoes);
    return parseObject;
}

// Classe Parse para os cards
const DisciplinaCard = Parse.Object.extend("DisciplinaCard");

// --- Funções de Lógica da Aplicação ---

// Função para calcular dias restantes até a avaliação
function calcularDiasRestantes(dataAvaliacao) {
    if (!dataAvaliacao) return null;

    const partes = dataAvaliacao.split('-');
    if (partes.length !== 3) return null;

    const ano = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10) - 1; // meses 0-11
    const dia = parseInt(partes[2], 10);

    // Criar objeto Date da avaliação e zerar horário
    const data = new Date(ano, mes, dia);
    data.setHours(0, 0, 0, 0);

    // Obter data de hoje e zerar horário
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Calcular diferença em milissegundos
    const diffMs = data.getTime() - hoje.getTime();

    // Converter para dias (arredondando para inteiro)
    const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));

    return diffDias;
}

// Função para verificar e atualizar avisos de avaliações
function verificarAvaliacoes() {
    // Limpar seção de próximas avaliações
    const proximasAvaliacoes = document.getElementById('proximasAvaliacoes');
    proximasAvaliacoes.innerHTML = '';
    
    // Criar array de todas as avaliações próximas
    let todasAvaliacoes = [];
    
    cardsData.forEach(card => {
        if (card.avaliacoes && card.avaliacoes.length > 0) {
            card.avaliacoes.forEach(avaliacao => {
                const diasRestantes = calcularDiasRestantes(avaliacao.data);
                if (diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 14) {
                    todasAvaliacoes.push({
                        titulo: card.title,
                        data: avaliacao.data,
                        tipo: avaliacao.tipo,
                        descricao: avaliacao.descricao,
                        diasRestantes: diasRestantes
                    });
                }
            });
        }
    });
    
    // Ordenar por proximidade da data
    todasAvaliacoes.sort((a, b) => a.diasRestantes - b.diasRestantes);
    
    // Se não houver avaliações próximas, ocultar a seção
    if (todasAvaliacoes.length === 0) {
        document.getElementById('secaoAvaliacoes').style.display = 'none';
        return;
    }
    
    // Mostrar a seção de avaliações
    document.getElementById('secaoAvaliacoes').style.display = 'block';
    
    // Adicionar cada avaliação próxima à lista
    todasAvaliacoes.forEach(avaliacao => {
        let classeAlerta = 'bg-info';
        
        if (avaliacao.diasRestantes <= 3) {
            classeAlerta = 'bg-danger';
        } else if (avaliacao.diasRestantes <= 7) {
            classeAlerta = 'bg-warning';
        }
        
        const itemAvaliacao = document.createElement('div');
        itemAvaliacao.className = `alert ${classeAlerta} d-flex justify-content-between align-items-center`;
        itemAvaliacao.innerHTML = `
            <div>
                <strong>${avaliacao.titulo}</strong> - ${avaliacao.tipo}
                <div><small>${formatarData(avaliacao.data)} (${avaliacao.diasRestantes} dias restantes)</small></div>
                ${avaliacao.descricao ? `<div>${avaliacao.descricao}</div>` : ''}
            </div>
            <button class="btn btn-sm btn-light" onclick="scrollToCard('${avaliacao.titulo}')">Ver Disciplina</button>
        `;
        
        proximasAvaliacoes.appendChild(itemAvaliacao);
    });
}

// Função para formatar data no padrão brasileiro
function formatarData(dataString) {
    if (!dataString) return '';
    const partes = dataString.split('-');
    if (partes.length !== 3) return dataString; // Retorna o original se formato errado

    const ano = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10) - 1;
    const dia = parseInt(partes[2], 10);

    const data = new Date(ano, mes, dia);
    return data.toLocaleDateString('pt-BR');
}

// Função para rolar até o card específico
function scrollToCard(titulo) {
    const cards = document.querySelectorAll('.card');
    for (let i = 0; i < cards.length; i++) {
        const cardTitle = cards[i].querySelector('.card-title');
        if (cardTitle && cardTitle.textContent === titulo) {
            cards[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
                expandirCard(cards[i]);
            }, 500);
            break;
        }
    }
}

// Função para expandir o card quando clicado
function expandirCard(card) {
    // Ignorar cliques em elementos interativos
    if (event && ['btn-excluir', 'btn-editar', 'task-checkbox', 'bi-trash', 'bi-pencil', 'btn-fechar-card', 'btn-add-avaliacao', 'btn-remove-avaliacao']
        .some(cls => event.target.classList.contains(cls) || (event.target.parentElement && event.target.parentElement.classList.contains(cls)))) return;
    
    // Fechar card expandido anterior
    const cardExpandido = document.querySelector('.card.expanded');
    if (cardExpandido && cardExpandido !== card) {
        cardExpandido.classList.remove('expanded');
        const btnFechar = cardExpandido.querySelector('.btn-fechar-card');
        if (btnFechar) btnFechar.remove();
    }
    
    // Expandir o card atual
    if (!card.classList.contains('expanded')) {
        card.classList.add('expanded');
        document.getElementById('overlay').classList.add('show');
        
        // Adicionar botão de fechar
        if (!card.querySelector('.btn-fechar-card')) {
            const btnFechar = document.createElement('button');
            btnFechar.className = 'btn-fechar-card position-absolute top-0 end-0 m-2 btn btn-sm btn-light rounded-circle';
            btnFechar.innerHTML = '<i class="bi bi-x-lg"></i>';
            btnFechar.style.zIndex = '1001';
            btnFechar.onclick = function(e) { 
                e.stopPropagation(); 
                fecharCard(card); 
            };
            card.appendChild(btnFechar);
        }
    }
}
    
// Função para fechar o card expandido
function fecharCard(card) {
    card = card || document.querySelector('.card.expanded');
    if (card) {
        card.classList.remove('expanded');
        const btnFechar = card.querySelector('.btn-fechar-card');
        if (btnFechar) btnFechar.remove();
    }
    document.getElementById('overlay').classList.remove('show');
}

// Funções para manipular o formulário
function mostrarFormulario() {
    document.getElementById('containerFormulario').style.display = 'block';
    
    // Limpar a lista de avaliações
    const listaAvaliacoes = document.getElementById('listaAvaliacoes');
    listaAvaliacoes.innerHTML = '';
    
    // Adicionar um item vazio para nova avaliação
    adicionarCampoAvaliacao();
}

function ocultarFormulario() {
    document.getElementById('containerFormulario').style.display = 'none';
}

// Função para adicionar um novo campo de avaliação no formulário
function adicionarCampoAvaliacao(data = '', tipo = '', descricao = '') {
    const listaAvaliacoes = document.getElementById('listaAvaliacoes');

    // Criar container da avaliação
    const divAvaliacao = document.createElement('div');
    divAvaliacao.className = 'avaliacao-item mb-3 p-2 border rounded position-relative';

    divAvaliacao.innerHTML = `
        <div class="mb-2">
            <label>Data:</label>
            <input type="date" class="form-control avaliacao-data" value="${data}">
        </div>
        <div class="mb-2">
            <label>Tipo:</label>
            <input type="text" class="form-control avaliacao-tipo" placeholder="Prova, Trabalho, etc." value="${tipo}">
        </div>
        <div class="mb-2">
            <label>Descrição (opcional):</label>
            <textarea class="form-control avaliacao-descricao" rows="2" placeholder="Descrição da avaliação...">${descricao}</textarea>
        </div>
        <button type="button" class="btn btn-danger btn-sm position-absolute top-0 end-0 btn-remover-avaliacao" title="Remover Avaliação">×</button>
    `;

    // Adicionar evento para remover avaliação ao clicar no "×"
    divAvaliacao.querySelector('.btn-remover-avaliacao').addEventListener('click', () => {
        divAvaliacao.remove();
    });

    listaAvaliacoes.appendChild(divAvaliacao);
}

function removerCampoAvaliacao(botao) {
    const campo = botao.parentElement;
    campo.remove();
}

// Função para excluir um card (MODIFICADA PARA BACK4APP)
async function excluirCard(index) {
    event.stopPropagation();
    if (!confirm('Tem certeza que deseja excluir esta disciplina?')) {
        return; // Sai da função se o usuário cancelar
    }

    const cardToDelete = cardsData[index];
    if (!cardToDelete || !cardToDelete.objectId) {
        alert('Erro: ID do card não encontrado para exclusão.');
        console.error('Card sem objectId para exclusão:', cardToDelete);
        return;
    }

    try {
        const query = new Parse.Query(DisciplinaCard);
        const parseObject = await query.get(cardToDelete.objectId);
        await parseObject.destroy();
        
        cardsData.splice(index, 1); // Remove do array local
        atualizarCards();
        verificarAvaliacoes();
        alert('Disciplina excluída com sucesso!');
    } catch (error) {
        console.error('Erro ao excluir card no Back4App:', error);
        alert('Erro ao excluir disciplina. Verifique o console para mais detalhes.');
    }
}

// Função para criar/editar um card (MODIFICADA PARA BACK4APP)
async function criarNovoCard(event) {
    event.preventDefault();
    
    // Obter valores do formulário
    const titulo = document.getElementById('titulo').value;
    const descricao = document.getElementById('descricao').value;
    const conteudo = document.getElementById('conteudo').value;
    const imagem = document.getElementById('imagem').value || 'https://placehold.co/600x400';
    
    // Coletar todas as avaliações do formulário e validar campos Data e Tipo condicionalmente
    const avaliacoesItems = document.querySelectorAll(".avaliacao-item");
    let avaliacoes = [];
    let validacaoFalhou = false;
    let mensagemErro = "";

    avaliacoesItems.forEach(item => {
        const dataInput = item.querySelector(".avaliacao-data");
        const tipoInput = item.querySelector(".avaliacao-tipo");
        const descricaoInput = item.querySelector(".avaliacao-descricao");

        const data = dataInput.value;
        const tipo = tipoInput.value.trim();
        const descricao = descricaoInput.value.trim();

        // Resetar bordas caso tenham sido marcadas como erro anteriormente
        dataInput.style.border = "";
        tipoInput.style.border = "";

        // Verifica se algum campo desta avaliação foi preenchido
        if (data || tipo || descricao) {
            // Se algum campo foi preenchido, Data e Tipo tornam-se obrigatórios
            if (!data || !tipo) {
                validacaoFalhou = true;
                mensagemErro = "Para cada avaliação adicionada, os campos 'Data' e 'Tipo' são obrigatórios.";
                // Destaca os campos que falharam na validação
                if (!data) dataInput.style.border = "1px solid red";
                if (!tipo) tipoInput.style.border = "1px solid red";
            } else {
                // Se passou na validação, adiciona a avaliação
                avaliacoes.push({
                    data: data,
                    tipo: tipoInput.value, // Salva o valor original do tipo (com espaços se houver)
                    descricao: descricaoInput.value // Salva o valor original da descrição
                });
            }
        }
        // Se nenhum campo (data, tipo, descricao) foi preenchido, simplesmente ignora esta linha de avaliação.
    });

    if (validacaoFalhou) {
        alert(mensagemErro);
        return; // Interrompe a criação/atualização do card
    }
    
    // Converter o conteúdo em formato de lista com checkboxes (salvar como string HTML)
    let listaItens = '';
    if (conteudo) {
        const linhas = conteudo.split('\n');
        linhas.forEach(linha => {
            if (linha.trim() !== '') {
                listaItens += `<li><input type="checkbox" class="task-checkbox"> ${linha.trim()}</li>\n`;
            }
        });
    } else {
        listaItens = '<li><input type="checkbox" class="task-checkbox"> Sem conteúdo detalhado</li>';
    }
    
    // Criar objeto do novo card no formato local
    const novoCardLocal = {
        title: titulo,
        text_pri: descricao,
        cont: "Conteúdo detalhado:",
        lista: [listaItens], // Aqui ainda é um array com a string HTML
        img: imagem,
        avaliacoes: avaliacoes
    };
    
    try {
        let parseObject;
        if (modoEdicao && cardEditandoIndex >= 0) {
            // EDITAR card existente
            const cardAtual = cardsData[cardEditandoIndex];
            if (!cardAtual || !cardAtual.objectId) {
                alert('Erro: ID do card não encontrado para edição.');
                console.error('Card sem objectId para edição:', cardAtual);
                return;
            }
            const query = new Parse.Query(DisciplinaCard);
            parseObject = await query.get(cardAtual.objectId);
            
            mapLocalObjectToParse(novoCardLocal, parseObject); // Atualiza o objeto Parse
            await parseObject.save();
            
            cardsData[cardEditandoIndex] = { ...novoCardLocal, objectId: parseObject.id }; // Atualiza o array local
            alert('Disciplina atualizada com sucesso!');
        } else {
            // ADICIONAR novo card
            parseObject = new DisciplinaCard();
            mapLocalObjectToParse(novoCardLocal, parseObject); // Popula o objeto Parse
            await parseObject.save();
            
            cardsData.push({ ...novoCardLocal, objectId: parseObject.id }); // Adiciona ao array local
            alert('Disciplina adicionada com sucesso!');
        }
        
        // Resetar o formulário e o estado de edição
        modoEdicao = false;
        cardEditandoIndex = -1;
        document.getElementById('tituloFormulario').textContent = 'Criar Nova Disciplina';
        document.querySelector('#formNovoCard button[type="submit"]').textContent = 'Adicionar Disciplina';
        
        document.getElementById('formNovoCard').reset();
        atualizarCards();
        verificarAvaliacoes();
        ocultarFormulario();

    } catch (error) {
        console.error('Erro ao salvar card no Back4App:', error);
        alert('Erro ao salvar disciplina. Verifique o console para mais detalhes.');
    }
}

// Função para iniciar a edição de um card
function editarCard(index) {
    event.stopPropagation(); // Evita que o card se expanda/feche ao clicar nos botões de ação

    const cardData = cardsData[index];
    document.getElementById('titulo').value = cardData.title;
    document.getElementById('descricao').value = cardData.text_pri;
    document.getElementById('imagem').value = cardData.img;

    const listaAvaliacoes = document.getElementById('listaAvaliacoes');
    listaAvaliacoes.innerHTML = '';

    // Carregar avaliações existentes (se houver)
    if (cardData.avaliacoes && cardData.avaliacoes.length > 0) {
        cardData.avaliacoes.forEach(avaliacao => {
            adicionarCampoAvaliacao(avaliacao.data, avaliacao.tipo, avaliacao.descricao);
        });
    } else {
        // Se não houver avaliações, cria um campo vazio
        adicionarCampoAvaliacao();
    }

    // Carregar conteúdo das tarefas, removendo checkbox do HTML para texto simples
    const tempDiv = document.createElement('div');
    // cardData.lista é um array de strings HTML. Pegamos a primeira string.
    tempDiv.innerHTML = cardData.lista[0] || ''; 
    const liItems = tempDiv.querySelectorAll('li');
    let conteudo = '';
    liItems.forEach(li => {
        // Remove a parte do checkbox e trim para obter o texto limpo
        const input = li.querySelector('.task-checkbox');
        let texto = li.textContent.trim();
        if (input) {
            texto = texto.substring(input.outerHTML.length).trim(); // Remove o HTML do input do texto
        }
        
        if (texto && texto !== 'Sem conteúdo detalhado') {
            conteudo += texto + '\n';
        }
    });
    document.getElementById('conteudo').value = conteudo.trim(); // Trim final para remover newline extra


    modoEdicao = true;
    cardEditandoIndex = index;
    document.getElementById('tituloFormulario').textContent = 'Editar Disciplina';
    document.querySelector('#formNovoCard button[type="submit"]').textContent = 'Salvar Alterações';
    document.getElementById('containerFormulario').style.display = 'block';
}

// Função para renderizar um único card
function renderizarCard(cardData, index) {
    const div = document.createElement("div");
    div.className = "col";
    
    // Verificar se há avaliações próximas
    let badgesAvaliacao = '';
    
    if (cardData.avaliacoes && cardData.avaliacoes.length > 0) {
        // Filtrar avaliações próximas (nos próximos 14 dias)
        const avaliacoesProximas = cardData.avaliacoes.filter(avaliacao => {
            const diasRestantes = calcularDiasRestantes(avaliacao.data);
            return diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 14;
        });
        
        // Ordenar por proximidade
        avaliacoesProximas.sort((a, b) => new Date(a.data) - new Date(b.data));
        
        // Limitar a 2 badges no card (para não sobrecarregar visualmente)
        const avaliacoesExibidas = avaliacoesProximas.slice(0, 2);
        
        // Criar badges para cada avaliação próxima
        avaliacoesExibidas.forEach(avaliacao => {
            const diasRestantes = calcularDiasRestantes(avaliacao.data);
            let classeBadge = 'bg-info';
            
            if (diasRestantes <= 3) {
                classeBadge = 'bg-danger';
            } else if (diasRestantes <= 7) {
                classeBadge = 'bg-warning';
            }
            
            badgesAvaliacao += `
            <div class="mb-1">
                <span class="badge ${classeBadge}">
                    ${avaliacao.tipo}: ${formatarData(avaliacao.data)}
                </span>
            </div>`;
        });
        
        // Adicionar indicador se houver mais avaliações
        if (avaliacoesProximas.length > 2) {
            badgesAvaliacao += `
            <div>
                <span class="badge bg-secondary">
                    +${avaliacoesProximas.length - 2} mais
                </span>
            </div>`;
        }
        
        // Envolver em um container se houver badges
        if (badgesAvaliacao) {
            badgesAvaliacao = `
            <div class="position-absolute top-0 start-0 m-2">
                ${badgesAvaliacao}
            </div>`;
        }
    }
    
    div.innerHTML = `
    <div class="card h-100" onclick="expandirCard(this)">
        ${badgesAvaliacao}
        <div class="position-absolute top-0 end-0 m-2 d-flex">
            <button type="button" class="btn btn-primary btn-sm rounded-circle btn-editar me-1" onclick="editarCard(${index})">
                <i class="bi bi-pencil"></i>
            </button>
            <button type="button" class="btn btn-danger btn-sm rounded-circle btn-excluir" onclick="excluirCard(${index})">
                <i class="bi bi-trash"></i>
            </button>
        </div>
        <img src="${cardData.img}" class="card-img-top" alt="${cardData.title}">
        <div class="card-body">
          <h5 class="card-title">${cardData.title}</h5>
          <p class="card-text">${cardData.text_pri}</p>
          <div class="card-extra">
            <p><strong>${cardData.cont}</strong></p>
            <ul>${cardData.lista}</ul>
            ${cardData.avaliacoes && cardData.avaliacoes.length > 0 ? `
            <div class="mt-3">
                <p><strong>Avaliações:</strong></p>
                <ul class="list-group">
                    ${cardData.avaliacoes.map(avaliacao => {
                        const diasRestantes = calcularDiasRestantes(avaliacao.data);
                        let classeBadge = 'bg-info';
                        
                        if (diasRestantes <= 3) {
                            classeBadge = 'bg-danger';
                        } else if (diasRestantes <= 7) {
                            classeBadge = 'bg-warning';
                        } else if (diasRestantes < 0) { // Avaliação que já passou
                            classeBadge = 'bg-secondary';
                        }
                        
                        return `
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                                <span class="badge ${classeBadge} me-2">${avaliacao.tipo}</span>
                                ${formatarData(avaliacao.data)}
                                ${avaliacao.descricao ? `<div><small>${avaliacao.descricao}</small></div>` : ''}
                            </div>
                            <span>
                                ${diasRestantes >= 0 ? 
                                    `<small>${diasRestantes} dias restantes</small>` : 
                                    `<small>Avaliação já ocorreu</small>`}
                            </span>
                        </li>`;
                    }).join('')}
                </ul>
            </div>` : ''}
          </div>
        </div>
    </div>`;
    return div;
}

// Função para atualizar todos os cards na tela
function atualizarCards() {
    const div_cards = document.getElementById("cards_principais");
    div_cards.innerHTML = '';
    cardsData.forEach((cardData, index) => {
        div_cards.appendChild(renderizarCard(cardData, index));
    });
}

// Função para alternar o estado de conclusão de uma tarefa
function toggleTaskCompletion(checkbox) {
    const li = checkbox.parentElement;
    if (checkbox.checked) {
        li.classList.add('completed');
    } else {
        li.classList.remove('completed');
    }
    // IMPORTANTE: Para persistir o estado do checkbox, você precisaria:
    // 1. Encontrar o card correspondente no `cardsData` (talvez passando o objectId do card).
    // 2. Atualizar a string HTML em `card.lista[0]` para refletir o estado do checkbox (ex: `<input type="checkbox" checked>`).
    // 3. Chamar a função para salvar o card atualizado no Back4App (usando o objectId).
    // Esta parte não foi implementada para simplificar, mas é uma melhoria a ser considerada.
}

// Função para carregar cards do Back4App (NOVA FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO)
async function carregarCardsDoBack4App() {
    const query = new Parse.Query(DisciplinaCard);
    try {
        const results = await query.find();
        cardsData = results.map(mapParseObjectToLocal);
        atualizarCards();
        verificarAvaliacoes();
    } catch (error) {
        console.error('Erro ao carregar cards do Back4App:', error);
        alert('Erro ao carregar disciplinas. Por favor, recarregue a página e verifique sua conexão.');
    }
}


// --- Inicialização da Aplicação ---
document.addEventListener('DOMContentLoaded', function() {
    // Carregar os cards do Back4App primeiro
    carregarCardsDoBack4App();
    
    // Adicionar evento de submit ao formulário
    document.getElementById('formNovoCard').addEventListener('submit', criarNovoCard);
    
    // Adicionar evento de clique ao botão de mostrar formulário
    document.getElementById('btnMostrarForm').addEventListener('click', mostrarFormulario);
    
    // Adicionar evento de clique ao botão de fechar formulário
    document.getElementById('btnFecharForm').addEventListener('click', ocultarFormulario);
    
    // Adicionar evento de clique ao botão de adicionar avaliação
    document.getElementById('btnAddAvaliacao').addEventListener('click', function() {
        adicionarCampoAvaliacao();
    });
    
    // Adicionar evento para os checkboxes (para que funcione mesmo após a renderização dinâmica)
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('task-checkbox')) {
            event.stopPropagation(); // Evita que o clique no checkbox expanda/feche o card
            toggleTaskCompletion(event.target);
        }
    });
});