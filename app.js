// ===============================================
// Quantum32 Control Center - JavaScript
// Análisis de Wikipedia + Web Serial API
// ===============================================

let currentAnalysis = null;
let serialPort = null;
let reader = null;
let isConnected = false;

// ===============================================
// WEB SERIAL API
// ===============================================

async function connectSerial() {
    if (!('serial' in navigator)) {
        document.getElementById('webSerialWarning').style.display = 'block';
        showNotification('Web Serial API no disponible. Usa Chrome/Edge.', 'error');
        return;
    }

    try {
        addToConsole('🔌 Solicitando puerto serial...');
        
        serialPort = await navigator.serial.requestPort();
        await serialPort.open({ baudRate: 115200 });

        isConnected = true;
        updateConnectionUI(true);
        
        addToConsole('✅ Conectado al Arduino', 'success');
        showNotification('Arduino conectado', 'success');

        startReading();

    } catch (error) {
        addToConsole(`❌ Error: ${error.message}`, 'error');
        showNotification('Error de conexión', 'error');
    }
}

async function disconnectSerial() {
    if (serialPort) {
        if (reader) {
            await reader.cancel();
            reader = null;
        }
        await serialPort.close();
        serialPort = null;
        isConnected = false;
        updateConnectionUI(false);
        addToConsole('⚠️ Desconectado', 'warning');
        showNotification('Arduino desconectado', 'info');
    }
}

async function startReading() {
    while (serialPort && serialPort.readable) {
        try {
            reader = serialPort.readable.getReader();
            
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                const text = new TextDecoder().decode(value);
                const lines = text.split('\n');
                
                lines.forEach(line => {
                    if (line.trim()) {
                        addToConsole(line.trim());
                    }
                });
            }
        } catch (error) {
            addToConsole(`❌ Error leyendo: ${error.message}`, 'error');
        } finally {
            if (reader) {
                reader.releaseLock();
                reader = null;
            }
        }
    }
}

async function sendCmd(command) {
    if (!serialPort || !isConnected) {
        showNotification('Arduino no conectado', 'error');
        return;
    }

    try {
        const writer = serialPort.writable.getWriter();
        const data = new TextEncoder().encode(command + '\n');
        await writer.write(data);
        writer.releaseLock();
        
        addToConsole(`📤 Enviado: ${command}`);
    } catch (error) {
        addToConsole(`❌ Error: ${error.message}`, 'error');
    }
}

async function sendAnalysis() {
    if (!currentAnalysis) {
        showNotification('No hay análisis para enviar', 'error');
        return;
    }

    const q32 = currentAnalysis.quantum32_data;
    const title = currentAnalysis.title.substring(0, 30);
    const boundaryStr = q32.boundary_states.join(',');
    
    const command = `START|${title}|${boundaryStr}|${q32.bulk_mask}|${q32.semantic_weight.toFixed(4)}|END`;
    
    await sendCmd(command);
    addToConsole('✅ Análisis enviado', 'success');
    showNotification('Análisis enviado', 'success');
}

function updateConnectionUI(connected) {
    const indicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const connectBtn = document.getElementById('connectBtn');
    const sendBtn = document.getElementById('sendBtn');

    if (connected) {
        indicator.classList.add('connected');
        statusText.textContent = 'Conectado';
        connectBtn.textContent = '🔌 Desconectar';
        connectBtn.onclick = disconnectSerial;
        sendBtn.disabled = !currentAnalysis;
    } else {
        indicator.classList.remove('connected');
        statusText.textContent = 'Desconectado';
        connectBtn.textContent = '🔌 Conectar Arduino';
        connectBtn.onclick = connectSerial;
        sendBtn.disabled = true;
    }
}

// ===============================================
// CLASES DE ANÁLISIS
// ===============================================

class TextVectorizer {
    constructor(maxFeatures = 32) {
        this.maxFeatures = maxFeatures;
        this.vocabulary = {};
        this.idfScores = {};
    }

    cleanText(text) {
        text = text.toLowerCase();
        text = text.replace(/[^\w\sáéíóúñ]/g, ' ');
        text = text.replace(/\s+/g, ' ');
        return text.trim();
    }

    tokenize(text) {
        return text.split(/\s+/).filter(word => word.length > 2);
    }

    fit(texts) {
        const allTokens = [];
        const docFrequencies = {};

        texts.forEach(text => {
            const tokens = this.tokenize(this.cleanText(text));
            allTokens.push(...tokens);
            
            const uniqueTokens = new Set(tokens);
            uniqueTokens.forEach(token => {
                docFrequencies[token] = (docFrequencies[token] || 0) + 1;
            });
        });

        const wordCounts = {};
        allTokens.forEach(token => {
            wordCounts[token] = (wordCounts[token] || 0) + 1;
        });

        const sortedWords = Object.entries(wordCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, this.maxFeatures)
            .map(([word]) => word);

        this.vocabulary = {};
        sortedWords.forEach((word, idx) => {
            this.vocabulary[word] = idx;
        });

        const numDocs = texts.length;
        Object.keys(this.vocabulary).forEach(word => {
            const df = docFrequencies[word] || 0;
            this.idfScores[word] = Math.log((numDocs + 1) / (df + 1)) + 1;
        });
    }

    transform(text) {
        const vector = new Array(this.maxFeatures).fill(0);
        const tokens = this.tokenize(this.cleanText(text));
        const tokenCounts = {};

        tokens.forEach(token => {
            tokenCounts[token] = (tokenCounts[token] || 0) + 1;
        });

        Object.entries(this.vocabulary).forEach(([word, idx]) => {
            if (tokenCounts[word]) {
                const tf = tokenCounts[word] / tokens.length;
                const idf = this.idfScores[word] || 1.0;
                vector[idx] = tf * idf;
            }
        });

        const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        if (norm > 0) {
            return vector.map(val => val / norm);
        }

        return vector;
    }
}

class Quantum32Adapter {
    constructor(numSlaves = 4) {
        this.numSlaves = numSlaves;
        this.vectorDim = 32;
    }

    vectorToBoundaryStates(vector) {
        while (vector.length < this.vectorDim) {
            vector.push(0);
        }
        vector = vector.slice(0, this.vectorDim);

        const chunkSize = this.vectorDim / this.numSlaves;
        const boundaryStates = [];

        for (let i = 0; i < this.numSlaves; i++) {
            const start = i * chunkSize;
            const end = start + chunkSize;
            const chunk = vector.slice(start, end);

            const norm = Math.sqrt(chunk.reduce((sum, val) => sum + val * val, 0));
            const state = Math.round(norm * 255);
            boundaryStates.push(Math.min(255, Math.max(0, state)));
        }

        return boundaryStates;
    }

    vectorToBulkMask(vector, threshold = 0.5) {
        while (vector.length < this.vectorDim) {
            vector.push(0);
        }
        vector = vector.slice(0, this.vectorDim);

        let mask = 0;
        for (let i = 0; i < vector.length; i++) {
            if (vector[i] > threshold) {
                mask |= (1 << i);
            }
        }

        return mask;
    }

    calculateSemanticWeight(vector) {
        const sum = vector.reduce((a, b) => a + b, 0);
        if (sum === 0) return 0;

        const normalized = vector.map(v => v / (sum + 1e-10));
        const entropy = -normalized.reduce((sum, p) => {
            return sum + (p > 0 ? p * Math.log(p) : 0);
        }, 0);

        const maxEntropy = Math.log(vector.length);
        return maxEntropy > 0 ? entropy / maxEntropy : 0;
    }
}

// ===============================================
// FUNCIONES DE WIKIPEDIA
// ===============================================

async function getWikipediaArticle(title, language = 'es') {
    const url = `https://${language}.wikipedia.org/w/api.php?action=query&format=json&titles=${encodeURIComponent(title)}&prop=extracts&explaintext=true&exsectionformat=plain&origin=*`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        const pages = data.query.pages;
        const pageId = Object.keys(pages)[0];

        if (pageId === '-1') {
            throw new Error(`Artículo "${title}" no encontrado`);
        }

        return pages[pageId].extract || '';
    } catch (error) {
        console.error('Error fetching Wikipedia:', error);
        throw error;
    }
}

function processText(title, text) {
    const vectorizer = new TextVectorizer(32);
    vectorizer.fit([text]);

    const vector = vectorizer.transform(text);
    const adapter = new Quantum32Adapter(4);

    const boundaryStates = adapter.vectorToBoundaryStates(vector);
    const bulkMask = adapter.vectorToBulkMask(vector);
    const semanticWeight = adapter.calculateSemanticWeight(vector);

    return {
        title: title,
        timestamp: new Date().toISOString(),
        text_length: text.length,
        vector: vector,
        quantum32_data: {
            boundary_states: boundaryStates,
            bulk_mask: bulkMask,
            bulk_mask_hex: '0x' + bulkMask.toString(16).toUpperCase(),
            bulk_mask_bin: '0b' + bulkMask.toString(2).padStart(32, '0'),
            semantic_weight: semanticWeight,
            bits_active: bulkMask.toString(2).split('1').length - 1
        },
        top_words: Object.keys(vectorizer.vocabulary).slice(0, 10)
    };
}

// ===============================================
// FUNCIONES DE UI
// ===============================================

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function addToConsole(message, type = '') {
    const console = document.getElementById('console');
    const line = document.createElement('div');
    line.className = `console-line ${type}`;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    console.appendChild(line);
    console.scrollTop = console.scrollHeight;
}

function clearConsole() {
    document.getElementById('console').innerHTML = '';
    addToConsole('🌐 Consola limpiada');
}

function displayAnalysis(data, container) {
    const q32 = data.quantum32_data;

    let html = '<div style="margin-top: 20px;">';

    html += `
        <div class="stat-box">
            <div class="stat-label">Peso Semántico</div>
            <div class="stat-value">${q32.semantic_weight.toFixed(3)}</div>
        </div>
    `;

    html += '<div style="margin-top: 15px;"><strong>Top Palabras:</strong></div>';
    html += '<div class="word-cloud">';
    data.top_words.forEach(word => {
        html += `<span class="word-tag">${word}</span>`;
    });
    html += '</div>';

    html += '</div>';
    container.innerHTML = html;
}

function displayQuantum32States(data, container) {
    const q32 = data.quantum32_data;

    let html = '';

    html += '<div class="boundary-grid">';
    q32.boundary_states.forEach((state, i) => {
        const percentage = (state / 255 * 100).toFixed(1);
        html += `
            <div class="boundary-state">
                <h4>Esclavo ${i} (0x${(0x10 + i).toString(16).toUpperCase()})</h4>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%">
                        ${state}
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';

    html += '<div style="margin-top: 20px;">';
    html += '<strong>Máscara del Bulk:</strong>';
    html += `<div style="background: #1e1e1e; color: #00ff00; padding: 10px; border-radius: 5px; margin-top: 10px; font-family: monospace;">`;
    html += `HEX: ${q32.bulk_mask_hex}<br>`;
    html += `Bits activos: ${q32.bits_active}/32`;
    html += '</div>';

    html += '<div class="bit-pattern">';
    const binStr = q32.bulk_mask.toString(2).padStart(32, '0');
    for (let i = 0; i < 32; i++) {
        const bit = binStr[31 - i];
        html += `<div class="bit ${bit === '1' ? 'active' : ''}">${i}</div>`;
    }
    html += '</div>';
    html += '</div>';

    container.innerHTML = html;
}

// ===============================================
// EVENT HANDLERS
// ===============================================

async function handleAnalyze() {
    const title = document.getElementById('articleTitle').value.trim();
    const resultsDiv = document.getElementById('analysisResults');
    const statesDiv = document.getElementById('quantum32States');

    if (!title) {
        showNotification('Ingresa un título', 'error');
        return;
    }

    resultsDiv.innerHTML = '<div class="loading"><div class="spinner"></div>Analizando...</div>';
    statesDiv.innerHTML = '<div class="loading"><div class="spinner"></div>Procesando...</div>';
    
    addToConsole(`🔍 Analizando: ${title}...`);

    try {
        const text = await getWikipediaArticle(title);
        const analysis = processText(title, text);

        currentAnalysis = analysis;
        displayAnalysis(analysis, resultsDiv);
        displayQuantum32States(analysis, statesDiv);

        document.getElementById('sendBtn').disabled = !isConnected;
        
        addToConsole(`✅ Análisis completado: ${title}`, 'success');
        showNotification('Análisis completado', 'success');
    } catch (error) {
        resultsDiv.innerHTML = `<p style="color: #dc2626;">${error.message}</p>`;
        statesDiv.innerHTML = `<p style="color: #dc2626;">Error en análisis</p>`;
        addToConsole(`❌ Error: ${error.message}`, 'error');
        showNotification(error.message, 'error');
    }
}

// ===============================================
// INICIALIZACIÓN
// ===============================================

document.addEventListener('DOMContentLoaded', () => {
    if (!('serial' in navigator)) {
        document.getElementById('webSerialWarning').style.display = 'block';
        addToConsole('⚠️ Web Serial API no disponible', 'warning');
        addToConsole('💡 Usa Chrome, Edge u Opera en escritorio', 'warning');
    } else {
        addToConsole('✅ Web Serial API disponible');
    }

    // Event listeners principales
    document.getElementById('connectBtn').addEventListener('click', connectSerial);
    document.getElementById('analyzeBtn').addEventListener('click', handleAnalyze);
    document.getElementById('sendBtn').addEventListener('click', sendAnalysis);

    // Event listeners para botones del monitor
    document.getElementById('showAnalysisBtn').addEventListener('click', () => sendCmd('SHOW_ANALYSIS'));
    document.getElementById('showBulkBtn').addEventListener('click', () => sendCmd('SHOW_BULK'));
    document.getElementById('readSlavesBtn').addEventListener('click', () => sendCmd('READ_SLAVES'));
    document.getElementById('clearConsoleBtn').addEventListener('click', clearConsole);

    // Enter key para analizar
    document.getElementById('articleTitle').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAnalyze();
    });

    addToConsole('🚀 Sistema inicializado');
    addToConsole('💡 Conecta tu Arduino para empezar');
});
