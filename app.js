// ===============================================
// Quantum32 Control Center - Enhanced Edition
// Análisis Semántico Profundo + Web Serial API
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
// ANÁLISIS SEMÁNTICO MEJORADO
// ===============================================

class SemanticAnalyzer {
    constructor() {
        // Palabras clave por categorías semánticas
        this.categories = {
            entidades: ['nombre', 'persona', 'lugar', 'organización', 'país', 'ciudad', 'empresa'],
            acciones: ['hacer', 'crear', 'desarrollar', 'producir', 'generar', 'construir'],
            conceptos: ['teoría', 'concepto', 'idea', 'principio', 'método', 'sistema'],
            propiedades: ['tipo', 'clase', 'forma', 'manera', 'modo', 'estilo'],
            relaciones: ['entre', 'con', 'para', 'desde', 'hacia', 'mediante'],
            temporales: ['año', 'siglo', 'época', 'periodo', 'momento', 'tiempo']
        };

        // Stop words en español (ampliado)
        this.stopWords = new Set([
            // Artículos
            'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
            // Pronombres
            'yo', 'tú', 'él', 'ella', 'nosotros', 'vosotros', 'ellos', 'ellas',
            'me', 'te', 'le', 'se', 'nos', 'os', 'les', 'lo', 'mi', 'tu', 'su',
            'este', 'esta', 'estos', 'estas', 'ese', 'esa', 'esos', 'esas',
            'aquel', 'aquella', 'aquellos', 'aquellas', 'esto', 'eso', 'aquello',
            // Preposiciones
            'a', 'ante', 'bajo', 'con', 'contra', 'de', 'desde', 'durante', 'en',
            'entre', 'hacia', 'hasta', 'mediante', 'para', 'por', 'según', 'sin',
            'sobre', 'tras', 'versus', 'vía',
            // Conjunciones
            'y', 'e', 'ni', 'que', 'o', 'u', 'pero', 'mas', 'sino', 'aunque',
            'porque', 'pues', 'si', 'como', 'cuando', 'donde',
            // Verbos comunes
            'ser', 'estar', 'haber', 'tener', 'hacer', 'poder', 'decir', 'ir',
            'ver', 'dar', 'saber', 'querer', 'llegar', 'pasar', 'deber', 'poner',
            'parecer', 'quedar', 'creer', 'hablar', 'llevar', 'dejar', 'seguir',
            'encontrar', 'llamar', 'venir', 'pensar', 'salir', 'volver', 'tomar',
            // Adverbios comunes
            'no', 'muy', 'más', 'menos', 'aún', 'también', 'tampoco', 'sí',
            'ya', 'siempre', 'nunca', 'jamás', 'además', 'así', 'ahora',
            'después', 'luego', 'entonces', 'bien', 'mal', 'solo', 'solamente',
            'tan', 'tanto', 'mucho', 'poco', 'demasiado', 'bastante',
            // Otros comunes
            'todo', 'cada', 'alguno', 'ninguno', 'otro', 'mismo', 'tal',
            'vez', 'año', 'día', 'tiempo', 'parte', 'caso', 'cosa', 'modo',
            'vida', 'hombre', 'mujer', 'mundo', 'país', 'ciudad', 'lugar',
            'forma', 'tipo', 'obra', 'gran', 'grande', 'nuevo', 'primera',
            'primero', 'dos', 'tres', 'cuatro', 'cinco', 'número', 'cual',
            'cuales', 'qué', 'quién', 'cuál', 'cuándo', 'cómo', 'dónde',
            // Palabras de enlace
            'mediante', 'durante', 'conforme', 'incluso', 'excepto', 'salvo'
        ]);
    }

    cleanText(text) {
        text = text.toLowerCase();
        text = text.replace(/[^\w\sáéíóúñü]/g, ' ');
        text = text.replace(/\s+/g, ' ');
        return text.trim();
    }

    tokenize(text) {
        return text.split(/\s+/).filter(word => 
            word.length > 2 && !this.stopWords.has(word)
        );
    }

    extractKeyPhrases(text, numPhrases = 10) {
        // Extraer bigramas y trigramas
        const tokens = this.tokenize(this.cleanText(text));
        const phrases = [];
        
        // Bigramas
        for (let i = 0; i < tokens.length - 1; i++) {
            phrases.push(tokens[i] + ' ' + tokens[i + 1]);
        }
        
        // Trigramas
        for (let i = 0; i < tokens.length - 2; i++) {
            phrases.push(tokens[i] + ' ' + tokens[i + 1] + ' ' + tokens[i + 2]);
        }
        
        // Contar frecuencias
        const phraseCounts = {};
        phrases.forEach(phrase => {
            phraseCounts[phrase] = (phraseCounts[phrase] || 0) + 1;
        });
        
        // Ordenar y retornar top
        return Object.entries(phraseCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, numPhrases)
            .map(([phrase, count]) => ({ phrase, count }));
    }

    analyzeSemanticCategories(text) {
        const tokens = this.tokenize(this.cleanText(text));
        const categoryCounts = {};
        
        Object.keys(this.categories).forEach(category => {
            categoryCounts[category] = 0;
        });
        
        tokens.forEach(token => {
            Object.entries(this.categories).forEach(([category, keywords]) => {
                if (keywords.some(kw => token.includes(kw))) {
                    categoryCounts[category]++;
                }
            });
        });
        
        const total = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
        const distribution = {};
        
        Object.entries(categoryCounts).forEach(([category, count]) => {
            distribution[category] = total > 0 ? count / total : 0;
        });
        
        return distribution;
    }

    calculateSemanticDensity(text) {
        const tokens = this.tokenize(this.cleanText(text));
        const uniqueTokens = new Set(tokens);
        
        return {
            total_words: tokens.length,
            unique_words: uniqueTokens.size,
            density: uniqueTokens.size / Math.max(tokens.length, 1),
            vocabulary_richness: uniqueTokens.size / Math.sqrt(Math.max(tokens.length, 1))
        };
    }

    extractEntities(text) {
        const sentences = text.split(/[.!?]+/);
        const entities = [];
        
        sentences.forEach(sentence => {
            // Buscar palabras capitalizadas (posibles entidades)
            const words = sentence.trim().split(/\s+/);
            words.forEach((word, idx) => {
                if (word.length > 3 && /^[A-ZÁÉÍÓÚÑ]/.test(word)) {
                    // Si la siguiente palabra también está capitalizada, es posible una entidad compuesta
                    if (idx < words.length - 1 && /^[A-ZÁÉÍÓÚÑ]/.test(words[idx + 1])) {
                        entities.push(word + ' ' + words[idx + 1]);
                    } else {
                        entities.push(word);
                    }
                }
            });
        });
        
        // Contar frecuencias
        const entityCounts = {};
        entities.forEach(entity => {
            entityCounts[entity] = (entityCounts[entity] || 0) + 1;
        });
        
        return Object.entries(entityCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([entity, count]) => ({ entity, count }));
    }
}

// ===============================================
// VECTORIZADOR TF-IDF MEJORADO
// ===============================================

class EnhancedTFIDFVectorizer {
    constructor(maxFeatures = 32) {
        this.maxFeatures = maxFeatures;
        this.vocabulary = {};
        this.idfScores = {};
        this.semanticAnalyzer = new SemanticAnalyzer();
    }

    fit(texts) {
        const allTokens = [];
        const docFrequencies = {};

        texts.forEach(text => {
            const tokens = this.semanticAnalyzer.tokenize(this.semanticAnalyzer.cleanText(text));
            allTokens.push(...tokens);
            
            const uniqueTokens = new Set(tokens);
            uniqueTokens.forEach(token => {
                docFrequencies[token] = (docFrequencies[token] || 0) + 1;
            });
        });

        // Contar palabras y calcular importancia
        const wordCounts = {};
        allTokens.forEach(token => {
            wordCounts[token] = (wordCounts[token] || 0) + 1;
        });

        // Ordenar por frecuencia ajustada
        const sortedWords = Object.entries(wordCounts)
            .map(([word, count]) => {
                // Bonus por longitud (palabras más largas suelen ser más específicas)
                const lengthBonus = Math.log(word.length + 1);
                const adjustedCount = count * lengthBonus;
                return [word, adjustedCount];
            })
            .sort((a, b) => b[1] - a[1])
            .slice(0, this.maxFeatures)
            .map(([word]) => word);

        this.vocabulary = {};
        sortedWords.forEach((word, idx) => {
            this.vocabulary[word] = idx;
        });

        // Calcular IDF
        const numDocs = texts.length;
        Object.keys(this.vocabulary).forEach(word => {
            const df = docFrequencies[word] || 0;
            this.idfScores[word] = Math.log((numDocs + 1) / (df + 1)) + 1;
        });
    }

    transform(text) {
        const vector = new Array(this.maxFeatures).fill(0);
        const tokens = this.semanticAnalyzer.tokenize(this.semanticAnalyzer.cleanText(text));
        const tokenCounts = {};

        tokens.forEach(token => {
            tokenCounts[token] = (tokenCounts[token] || 0) + 1;
        });

        Object.entries(this.vocabulary).forEach(([word, idx]) => {
            if (tokenCounts[word]) {
                const tf = tokenCounts[word] / Math.max(tokens.length, 1);
                const idf = this.idfScores[word] || 1.0;
                vector[idx] = tf * idf;
            }
        });

        // Normalización L2
        const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        if (norm > 0) {
            return vector.map(val => val / norm);
        }

        return vector;
    }

    getTopWords(n = 10) {
        return Object.keys(this.vocabulary).slice(0, n);
    }
}

// ===============================================
// QUANTUM32 ADAPTER MEJORADO
// ===============================================

class EnhancedQuantum32Adapter {
    constructor(numSlaves = 4) {
        this.numSlaves = numSlaves;
        this.vectorDim = 32;
    }

    // Distribución Boundary: dividir semánticamente, no solo geométricamente
    vectorToBoundaryStates(vector, semanticCategories = null) {
        while (vector.length < this.vectorDim) {
            vector.push(0);
        }
        vector = vector.slice(0, this.vectorDim);

        // Si tenemos categorías semánticas, usarlas para influir en la distribución
        const chunkSize = Math.floor(this.vectorDim / this.numSlaves);
        const boundaryStates = [];

        for (let i = 0; i < this.numSlaves; i++) {
            const start = i * chunkSize;
            const end = (i === this.numSlaves - 1) ? this.vectorDim : start + chunkSize;
            const chunk = vector.slice(start, end);

            // Calcular norma con peso semántico
            let norm = Math.sqrt(chunk.reduce((sum, val) => sum + val * val, 0));
            
            // Ajustar por importancia semántica si está disponible
            if (semanticCategories) {
                const categoryKeys = Object.keys(semanticCategories);
                if (categoryKeys.length >= this.numSlaves) {
                    const categoryWeight = semanticCategories[categoryKeys[i]] || 0;
                    norm = norm * (1 + categoryWeight * 0.5); // Boost hasta 50%
                }
            }

            const state = Math.round(norm * 255);
            boundaryStates.push(Math.min(255, Math.max(0, state)));
        }

        return boundaryStates;
    }

    // Bulk mask mejorado: considerar clustering semántico
    vectorToBulkMask(vector, adaptiveThreshold = true) {
        while (vector.length < this.vectorDim) {
            vector.push(0);
        }
        vector = vector.slice(0, this.vectorDim);

        let threshold;
        if (adaptiveThreshold) {
            // Threshold adaptativo basado en la media
            const mean = vector.reduce((a, b) => a + b, 0) / vector.length;
            const std = Math.sqrt(
                vector.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / vector.length
            );
            threshold = mean + std * 0.5; // Medio sigma por encima de la media
        } else {
            threshold = 0.5;
        }

        // QUANTUM32: Identificar bits cerca del threshold (zona de incertidumbre)
        const uncertaintyBits = [];
        const uncertaintyWindow = 0.15; // ±15% del threshold
        
        vector.forEach((val, idx) => {
            const distance = Math.abs(val - threshold);
            const relativeDistance = distance / (threshold + 1e-10);
            
            // Si está muy cerca del threshold, es un bit "inestable"
            if (relativeDistance < uncertaintyWindow) {
                uncertaintyBits.push({
                    index: idx,
                    value: val,
                    distance: distance,
                    probability: 0.5 + (val - threshold) / (threshold * 2) // 0.3 a 0.7
                });
            }
        });

        // Construir máscara base (determinista)
        let mask = 0;
        for (let i = 0; i < vector.length; i++) {
            if (vector[i] > threshold) {
                mask |= (1 << i);
            }
        }
        
        // QUANTUM32: Para bits inestables, usar probabilidad cuántica
        // El bit fluctúa según su proximidad al threshold
        uncertaintyBits.forEach(bit => {
            const shouldFlip = Math.random() < bit.probability;
            
            if (shouldFlip) {
                // Toggle el bit (flip cuántico)
                mask ^= (1 << bit.index);
            }
        });

        // Retornar máscara + metadatos cuánticos
        return {
            mask: mask,
            threshold: threshold,
            uncertainBits: uncertaintyBits.map(b => ({
                index: b.index,
                probability: b.probability,
                value: b.value
            }))
        };
    }

    // Calcular entropía de Shannon (semantic weight mejorado)
    calculateSemanticWeight(vector, densityInfo = null) {
        const sum = vector.reduce((a, b) => a + b, 0);
        if (sum === 0) return 0;

        const normalized = vector.map(v => v / (sum + 1e-10));
        const entropy = -normalized.reduce((sum, p) => {
            return sum + (p > 0 ? p * Math.log(p) : 0);
        }, 0);

        const maxEntropy = Math.log(vector.length);
        let weight = maxEntropy > 0 ? entropy / maxEntropy : 0;

        // Ajustar por densidad léxica si está disponible
        if (densityInfo) {
            const densityFactor = densityInfo.vocabulary_richness / 10; // Normalizar
            weight = weight * (1 + Math.min(densityFactor, 0.3)); // Boost hasta 30%
        }

        return Math.min(weight, 1.0);
    }

    // Calcular coherencia holográfica (bulk-boundary correspondence)
    calculateHolographicCoherence(vector, boundaryStates, bulkMask) {
        // Reconstruir información del boundary
        const boundaryReconstruction = [];
        const chunkSize = Math.floor(this.vectorDim / this.numSlaves);
        
        boundaryStates.forEach((state, i) => {
            const normalizedState = state / 255;
            for (let j = 0; j < chunkSize; j++) {
                boundaryReconstruction.push(normalizedState);
            }
        });

        // Ajustar tamaño
        while (boundaryReconstruction.length < this.vectorDim) {
            boundaryReconstruction.push(boundaryReconstruction[boundaryReconstruction.length - 1]);
        }

        // Calcular correlación entre vector original y reconstrucción
        const correlation = this.calculateCorrelation(
            vector.slice(0, this.vectorDim),
            boundaryReconstruction.slice(0, this.vectorDim)
        );

        // Calcular consistencia del bulk
        const bitsActive = bulkMask.toString(2).split('1').length - 1;
        const bulkDensity = bitsActive / this.vectorDim;

        // Coherencia = promedio de ambas métricas
        return (Math.abs(correlation) + bulkDensity) / 2;
    }

    calculateCorrelation(vec1, vec2) {
        const n = Math.min(vec1.length, vec2.length);
        const mean1 = vec1.reduce((a, b) => a + b, 0) / n;
        const mean2 = vec2.reduce((a, b) => a + b, 0) / n;

        let numerator = 0;
        let sum1 = 0;
        let sum2 = 0;

        for (let i = 0; i < n; i++) {
            const diff1 = vec1[i] - mean1;
            const diff2 = vec2[i] - mean2;
            numerator += diff1 * diff2;
            sum1 += diff1 * diff1;
            sum2 += diff2 * diff2;
        }

        const denominator = Math.sqrt(sum1 * sum2);
        return denominator > 0 ? numerator / denominator : 0;
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
    // Análisis semántico profundo
    const semanticAnalyzer = new SemanticAnalyzer();
    const keyPhrases = semanticAnalyzer.extractKeyPhrases(text, 10);
    const semanticCategories = semanticAnalyzer.analyzeSemanticCategories(text);
    const densityInfo = semanticAnalyzer.calculateSemanticDensity(text);
    const entities = semanticAnalyzer.extractEntities(text);

    // Vectorización TF-IDF mejorada
    const vectorizer = new EnhancedTFIDFVectorizer(32);
    vectorizer.fit([text]);
    const vector = vectorizer.transform(text);

    // Quantum32 con contexto semántico
    const adapter = new EnhancedQuantum32Adapter(4);
    const boundaryStates = adapter.vectorToBoundaryStates(vector, semanticCategories);
    const bulkMaskData = adapter.vectorToBulkMask(vector, true); // Retorna objeto con mask + metadata
    const semanticWeight = adapter.calculateSemanticWeight(vector, densityInfo);
    const holographicCoherence = adapter.calculateHolographicCoherence(vector, boundaryStates, bulkMaskData.mask);

    return {
        title: title,
        timestamp: new Date().toISOString(),
        text_length: text.length,
        
        // Datos vectoriales
        vector: vector,
        
        // Quantum32 data
        quantum32_data: {
            boundary_states: boundaryStates,
            bulk_mask: bulkMaskData.mask,
            bulk_mask_hex: '0x' + bulkMaskData.mask.toString(16).toUpperCase().padStart(8, '0'),
            bulk_mask_bin: '0b' + bulkMaskData.mask.toString(2).padStart(32, '0'),
            semantic_weight: semanticWeight,
            bits_active: bulkMaskData.mask.toString(2).split('1').length - 1,
            holographic_coherence: holographicCoherence,
            // NUEVO: Metadatos cuánticos
            quantum_metadata: {
                threshold: bulkMaskData.threshold,
                uncertain_bits: bulkMaskData.uncertainBits,
                num_uncertain: bulkMaskData.uncertainBits.length
            }
        },
        
        // Análisis semántico
        semantic_analysis: {
            key_phrases: keyPhrases,
            categories: semanticCategories,
            density: densityInfo,
            entities: entities
        },
        
        top_words: vectorizer.getTopWords(10)
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
    const semantic = data.semantic_analysis;

    let html = '<div style="margin-top: 20px;">';

    // Métricas principales con tooltips
    html += '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">';
    
    html += `
        <div class="stat-box">
            <div class="stat-label">
                Peso Semántico
                <span class="info-icon" style="background: white; color: #667eea;">i
                    <span class="tooltip">
                        Basado en entropía de Shannon + riqueza vocabular.
                        <br><br>
                        >0.7 = Vocabulario diverso<br>
                        0.4-0.7 = Balanceado<br>
                        <0.4 = Concentrado
                    </span>
                </span>
            </div>
            <div class="stat-value">${q32.semantic_weight.toFixed(3)}</div>
        </div>
    `;
    
    html += `
        <div class="stat-box">
            <div class="stat-label">
                Coherencia Holográfica
                <span class="info-icon" style="background: white; color: #667eea;">i
                    <span class="tooltip">
                        Fidelidad Bulk-Boundary (AdS/CFT).
                        <br><br>
                        🟢 >0.8 = Excelente<br>
                        🟡 >0.6 = Buena<br>
                        🟠 >0.4 = Moderada<br>
                        🔴 <0.4 = Baja
                    </span>
                </span>
            </div>
            <div class="stat-value">${q32.holographic_coherence.toFixed(3)}</div>
        </div>
    `;
    
    html += '</div>';

    // Densidad léxica con tooltip
    html += '<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">';
    html += '<strong>📊 Densidad Léxica';
    html += '<span class="info-icon">i';
    html += '<span class="tooltip">';
    html += 'Mide la riqueza del vocabulario.<br><br>';
    html += 'Riqueza = Únicas / √Totales<br><br>';
    html += '>15 = Documento técnico<br>';
    html += '8-15 = Normal<br>';
    html += '<8 = Simple/repetitivo';
    html += '</span></span>';
    html += ':</strong><br>';
    html += `Palabras totales: ${semantic.density.total_words} | `;
    html += `Únicas: ${semantic.density.unique_words} | `;
    html += `Riqueza: ${semantic.density.vocabulary_richness.toFixed(2)}`;
    html += '</div>';

    // Categorías semánticas con tooltip
    html += '<div style="margin-top: 15px;">';
    html += '<strong>🎯 Distribución Semántica';
    html += '<span class="info-icon">i';
    html += '<span class="tooltip">';
    html += 'Cada categoría mapea a un esclavo I2C:<br><br>';
    html += 'Esclavo 0 → entidades<br>';
    html += 'Esclavo 1 → acciones<br>';
    html += 'Esclavo 2 → conceptos<br>';
    html += 'Esclavo 3 → propiedades';
    html += '</span></span>';
    html += ':</strong></div>';
    html += '<div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 10px;">';
    
    const categoryLabels = {
        'entidades': '👥 Entidades',
        'acciones': '⚡ Acciones',
        'conceptos': '💡 Conceptos',
        'propiedades': '🔧 Propiedades',
        'relaciones': '🔗 Relaciones',
        'temporales': '⏰ Temporales'
    };
    
    Object.entries(semantic.categories).forEach(([category, value]) => {
        if (value > 0.01) {
            const percentage = (value * 100).toFixed(1);
            const label = categoryLabels[category] || category;
            html += `<div style="margin-bottom: 8px;">`;
            html += `<strong>${label}:</strong> ${percentage}%`;
            html += `<div class="progress-bar" style="height: 20px;">`;
            html += `<div class="progress-fill" style="width: ${percentage}%"></div>`;
            html += `</div></div>`;
        }
    });
    html += '</div>';

    // Frases clave
    if (semantic.key_phrases && semantic.key_phrases.length > 0) {
        html += '<div style="margin-top: 15px;">';
        html += '<strong>💡 Frases Clave';
        html += '<span class="info-icon">i';
        html += '<span class="tooltip">';
        html += 'Bigramas y trigramas más frecuentes.<br><br>';
        html += 'Filtrado de stop words aplicado.';
        html += '</span></span>';
        html += ':</strong></div>';
        html += '<div class="word-cloud">';
        semantic.key_phrases.slice(0, 5).forEach(item => {
            html += `<span class="word-tag">${item.phrase} (${item.count})</span>`;
        });
        html += '</div>';
    }

    // Entidades
    if (semantic.entities && semantic.entities.length > 0) {
        html += '<div style="margin-top: 15px;">';
        html += '<strong>🏷️ Entidades Detectadas';
        html += '<span class="info-icon">i';
        html += '<span class="tooltip">';
        html += 'Nombres propios detectados por capitalización.<br><br>';
        html += 'Incluye personas, lugares, organizaciones.';
        html += '</span></span>';
        html += ':</strong></div>';
        html += '<div class="word-cloud">';
        semantic.entities.slice(0, 5).forEach(item => {
            html += `<span class="word-tag" style="background: #764ba2;">${item.entity} (${item.count})</span>`;
        });
        html += '</div>';
    }

    html += '</div>';
    container.innerHTML = html;
}

function displayQuantum32States(data, container) {
    const q32 = data.quantum32_data;
    const semantic = data.semantic_analysis;

    let html = '';

    // Estados Boundary con contexto semántico y tooltips
    html += '<div style="margin-bottom: 15px;">';
    html += '<strong>Boundary States (Esclavos I2C)';
    html += '<span class="info-icon">i';
    html += '<span class="tooltip">';
    html += 'Estados 0-255 para cada esclavo.<br><br>';
    html += 'Cálculo: Norma L2 × (1 + peso_categoría × 0.5)<br><br>';
    html += 'Boost hasta +50% por importancia semántica.';
    html += '</span></span>';
    html += ':</strong></div>';
    
    html += '<div class="boundary-grid">';
    const categoryKeys = Object.keys(semantic.categories);
    const categoryLabels = {
        'entidades': '👥 Entidades',
        'acciones': '⚡ Acciones',
        'conceptos': '💡 Conceptos',
        'propiedades': '🔧 Propiedades',
        'relaciones': '🔗 Relaciones',
        'temporales': '⏰ Temporales'
    };
    
    q32.boundary_states.forEach((state, i) => {
        const percentage = (state / 255 * 100).toFixed(1);
        const categoryKey = categoryKeys[i] || `dimension_${i}`;
        const categoryLabel = categoryLabels[categoryKey] || `Dimensión ${i}`;
        const categoryValue = semantic.categories[categoryKeys[i]] || 0;
        
        html += `
            <div class="boundary-state">
                <h4>Esclavo ${i} - ${categoryLabel}</h4>
                <small style="color: #666;">I2C: 0x${(0x10 + i).toString(16).toUpperCase()} | Peso: ${(categoryValue * 100).toFixed(1)}%</small>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%">
                        ${state}
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';

    // Bulk mask con interpretación y TODOS los bits cuánticos
    html += '<div style="margin-top: 20px;">';
    html += '<strong>🔮 Máscara del Bulk (Reconstrucción Holográfica)';
    html += '<span class="info-icon">i';
    html += '<span class="tooltip">';
    html += 'Máscara de 32 bits con threshold adaptativo.<br><br>';
    html += 'Cada bit tiene probabilidad cuántica basada en su distancia al threshold.<br><br>';
    html += '<strong>Bits Inestables:</strong> Valores cerca del threshold fluctúan (superposición cuántica)';
    html += '</span></span>';
    html += ':</strong>';
    
    const qm = q32.quantum_metadata;
    
    html += `<div style="background: #1e1e1e; color: #00ff00; padding: 10px; border-radius: 5px; margin-top: 10px; font-family: monospace;">`;
    html += `HEX: ${q32.bulk_mask_hex}<br>`;
    html += `Bits activos: ${q32.bits_active}/32 (${(q32.bits_active/32*100).toFixed(1)}%)<br>`;
    html += `Threshold: ${qm.threshold.toFixed(4)}<br>`;
    html += `Coherencia: ${q32.holographic_coherence.toFixed(3)} - ${getCoherenceLabel(q32.holographic_coherence)}<br>`;
    html += `⚛️ Bits inestables: <span style="color: #fc3;">${qm.num_uncertain} bits en superposición cuántica</span>`;
    html += '</div>';

    // Crear un mapa de bits inestables
    const unstableMap = {};
    qm.uncertain_bits.forEach(bit => {
        unstableMap[bit.index] = bit;
    });

    html += '<div class="bit-pattern" style="margin-top: 10px;">';
    const binStr = q32.bulk_mask.toString(2).padStart(32, '0');
    
    for (let i = 0; i < 32; i++) {
        const bit = binStr[31 - i];
        const isUnstable = unstableMap.hasOwnProperty(i);
        const classes = ['bit'];
        let title = '';
        
        if (isUnstable) {
            classes.push('unstable');
            const prob = (unstableMap[i].probability * 100).toFixed(1);
            const val = unstableMap[i].value.toFixed(4);
            title = `Bit ${i}: INESTABLE ⚛️\nValor: ${val}\nProbabilidad: ${prob}%\nSuperposición: |0⟩ + |1⟩\n(cerca del threshold)`;
        } else if (bit === '1') {
            classes.push('active');
            title = `Bit ${i}: ACTIVO (1)\nDimensión ${i} supera el threshold`;
        } else {
            title = `Bit ${i}: INACTIVO (0)\nDimensión ${i} está bajo el threshold`;
        }
        
        html += `<div class="${classes.join(' ')}" title="${title}">${i}</div>`;
    }
    html += '</div>';
    
    // Mostrar detalles de los bits inestables
    if (qm.num_uncertain > 0) {
        html += '<div style="background: #fef6e7; padding: 12px; border-radius: 5px; margin-top: 10px; border: 1px solid #fc3; font-size: 13px;">';
        html += `<strong>⚛️ ${qm.num_uncertain} Bits en Superposición Cuántica:</strong><br><br>`;
        
        qm.uncertain_bits.forEach((bit, idx) => {
            const prob = (bit.probability * 100).toFixed(1);
            const icon = bit.probability > 0.6 ? '🔼' : bit.probability < 0.4 ? '🔽' : '⚖️';
            html += `${icon} <strong>Bit ${bit.index}:</strong> `;
            html += `Valor=${bit.value.toFixed(4)}, `;
            html += `P(1)=${prob}%`;
            
            if (bit.probability > 0.6) {
                html += ` <span style="color: #00af89;">(tiende a activarse)</span>`;
            } else if (bit.probability < 0.4) {
                html += ` <span style="color: #d33;">(tiende a desactivarse)</span>`;
            } else {
                html += ` <span style="color: #fc3;">(máxima incertidumbre)</span>`;
            }
            html += '<br>';
        });
        
        html += '<br><em style="color: #54595d;">Estos bits fluctúan porque sus valores están muy cerca del threshold adaptativo. ';
        html += 'Representan incertidumbre semántica en esas dimensiones del vector.</em>';
        html += '</div>';
    } else {
        html += '<div style="background: #f0fdf4; padding: 12px; border-radius: 5px; margin-top: 10px; border: 1px solid #00af89; font-size: 13px;">';
        html += '<strong>✅ Sistema Estable:</strong> Todos los bits tienen valores definidos (lejos del threshold).<br>';
        html += '<em>No hay incertidumbre cuántica en este análisis.</em>';
        html += '</div>';
    }
    
    html += '</div>';

    container.innerHTML = html;
}

function getCoherenceLabel(coherence) {
    if (coherence > 0.8) return '🟢 Excelente';
    if (coherence > 0.6) return '🟡 Buena';
    if (coherence > 0.4) return '🟠 Moderada';
    return '🔴 Baja';
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

    resultsDiv.innerHTML = '<div class="loading"><div class="spinner"></div>Analizando semánticamente...</div>';
    statesDiv.innerHTML = '<div class="loading"><div class="spinner"></div>Calculando estados Quantum32...</div>';
    
    addToConsole(`🔍 Analizando: ${title}...`);

    try {
        const text = await getWikipediaArticle(title);
        addToConsole(`📄 Texto obtenido: ${text.length} caracteres`);
        
        const analysis = processText(title, text);
        addToConsole(`🧮 Vector TF-IDF generado: ${analysis.vector.length} dimensiones`);
        addToConsole(`🎯 Boundary states: [${analysis.quantum32_data.boundary_states.join(', ')}]`);
        addToConsole(`🔮 Bulk mask: ${analysis.quantum32_data.bulk_mask_hex}`);
        addToConsole(`⚖️ Semantic weight: ${analysis.quantum32_data.semantic_weight.toFixed(4)}`);
        addToConsole(`🌐 Holographic coherence: ${analysis.quantum32_data.holographic_coherence.toFixed(4)}`);

        currentAnalysis = analysis;
        displayAnalysis(analysis, resultsDiv);
        displayQuantum32States(analysis, statesDiv);

        document.getElementById('sendBtn').disabled = !isConnected;
        
        // NUEVO: Agregar botón de debate
        const debateBtn = document.createElement('button');
        debateBtn.textContent = '💬 Iniciar Debate';
        debateBtn.style.cssText = 'margin-top: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); width: 100%;';
        debateBtn.onclick = () => sistemaDebate.ejecutarDebate(analysis);
        statesDiv.appendChild(debateBtn);
        
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

// ===============================================
// SISTEMA DE DEBATE ENTRE ESCLAVOS
// ===============================================

class SistemaDebate {
    constructor() {
        this.argumentos = [];
        this.esclavos = [];
        this.categorias = ['👥 Entidades', '⚡ Acciones', '💡 Conceptos', '🔧 Propiedades'];
        this.historialDebates = [];
    }

    inicializar(analysis) {
        this.esclavos = [];
        this.argumentos = [];
        
        const q32 = analysis.quantum32_data;
        const semantic = analysis.semantic_analysis;
        const categoryKeys = Object.keys(semantic.categories);
        
        // Crear perfiles de esclavos
        for (let i = 0; i < 4; i++) {
            this.esclavos.push({
                id: i,
                nombre: this.categorias[i],
                estado: q32.boundary_states[i],
                peso_semantico: semantic.categories[categoryKeys[i]] || 0,
                victorias: 0,
                derrotas: 0
            });
        }
    }

    async ejecutarDebate(analysis) {
        this.inicializar(analysis);
        
        addToConsole('\n╔════════════════════════════════════════════╗', 'success');
        addToConsole('║       💬 INICIANDO DEBATE FORMAL          ║', 'success');
        addToConsole('╚════════════════════════════════════════════╝\n', 'success');
        
        this.imprimirFraseInicial(analysis);
        await this.sleep(1000);
        
        // FASE 1: Presentación de argumentos
        addToConsole('\n┌────────────────────────────────────────────┐');
        addToConsole('│  📋 FASE 1: PRESENTACIÓN DE ARGUMENTOS    │');
        addToConsole('└────────────────────────────────────────────┘\n');
        await this.presentarArgumentos(analysis);
        await this.sleep(1500);
        
        // FASE 2: Votación cruzada
        addToConsole('\n┌────────────────────────────────────────────┐');
        addToConsole('│  🗳️  FASE 2: VOTACIÓN CRUZADA             │');
        addToConsole('└────────────────────────────────────────────┘\n');
        await this.votacionCruzada();
        await this.sleep(1500);
        
        // FASE 3: Conteo y resultado
        addToConsole('\n┌────────────────────────────────────────────┐');
        addToConsole('│  📊 FASE 3: CONTEO Y RESULTADO            │');
        addToConsole('└────────────────────────────────────────────┘\n');
        const ganador = await this.contarVotos();
        await this.sleep(1000);
        
        // FASE 4: Conclusión
        await this.imprimirConclusionFinal(ganador, analysis);
        
        // Actualizar estadísticas
        this.esclavos[ganador].victorias++;
        this.esclavos.forEach((e, i) => {
            if (i !== ganador) e.derrotas++;
        });
        
        // Guardar en historial
        this.historialDebates.push({
            documento: analysis.title,
            ganador: ganador,
            timestamp: new Date().toISOString(),
            argumentos: [...this.argumentos]
        });
        
        // Visualizar resultado
        this.mostrarResultadoDebate(ganador, analysis);
        
        return ganador;
    }

    imprimirFraseInicial(analysis) {
        addToConsole(`📄 Se convoca debate sobre: "${analysis.title}"`);
        addToConsole('');
        addToConsole('Los 4 esclavos Quantum32 se reúnen para determinar');
        addToConsole('qué aspecto semántico DOMINA este documento.');
        addToConsole('');
        addToConsole('Cada esclavo presentará argumentos basados en:');
        addToConsole('  • Su estado actual (intensidad 0-255)');
        addToConsole('  • La relevancia de su categoría semántica');
        addToConsole('  • La coherencia con el documento completo');
        addToConsole('');
        addToConsole('Los esclavos votarán entre ellos para elegir al ganador.');
        addToConsole('');
    }

    async presentarArgumentos(analysis) {
        addToConsole('Los esclavos construyen sus argumentos...\n');
        
        const q32 = analysis.quantum32_data;
        const semantic = analysis.semantic_analysis;
        
        for (let i = 0; i < 4; i++) {
            const esclavo = this.esclavos[i];
            
            // Calcular métricas del argumento
            const fuerza = esclavo.estado;
            const relevancia = Math.round(esclavo.peso_semantico * 255);
            const coherencia = Math.round(q32.holographic_coherence * 255);
            
            this.argumentos.push({
                esclavo: i,
                fuerza: fuerza,
                relevancia: relevancia,
                coherencia: coherencia,
                score: fuerza + relevancia + coherencia,
                votos: []
            });
            
            this.imprimirArgumentoDetallado(i, analysis);
            await this.sleep(800);
        }
    }

    imprimirArgumentoDetallado(idx, analysis) {
        const arg = this.argumentos[idx];
        const esclavo = this.esclavos[idx];
        
        addToConsole('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        addToConsole(`🎤 Esclavo ${idx} (${esclavo.nombre}) toma la palabra:\n`);
        
        addToConsole(`  "Honorable asamblea, presento mi argumento`);
        addToConsole(`   sobre el documento '${analysis.title}':\n`);
        
        const categoria = esclavo.nombre.substring(2); // Quitar emoji
        addToConsole(`   Mi categoría (${categoria}) tiene una`);
        addToConsole(`   presencia de ${arg.fuerza}/255 en este texto.\n`);
        
        addToConsole(`   Métricas de mi argumento:`);
        addToConsole(`   ├─ Fuerza:      ${arg.fuerza}/255 [${this.getBarra(arg.fuerza)}]`);
        addToConsole(`   ├─ Relevancia:  ${arg.relevancia}/255 [${this.getBarra(arg.relevancia)}]`);
        addToConsole(`   └─ Coherencia:  ${arg.coherencia}/255 [${this.getBarra(arg.coherencia)}]`);
        addToConsole('');
        
        // Evaluación cualitativa
        const score = arg.score;
        let evaluacion = '';
        
        if (score > 600) {
            evaluacion = '   ✨ Este es un argumento MUY FUERTE y convincente."';
        } else if (score > 450) {
            evaluacion = '   💪 Este es un argumento SÓLIDO y razonable."';
        } else if (score > 300) {
            evaluacion = '   👍 Este es un argumento VÁLIDO pero moderado."';
        } else {
            evaluacion = '   🤔 Este es un argumento DÉBIL que requiere más evidencia."';
        }
        
        addToConsole(evaluacion);
        addToConsole('');
    }

    async votacionCruzada() {
        addToConsole('Cada esclavo evalúa los argumentos de los demás');
        addToConsole('y emite su voto basándose en criterios objetivos:\n');
        
        for (let votante = 0; votante < 4; votante++) {
            addToConsole(`👤 Esclavo ${votante} (${this.esclavos[votante].nombre}) evalúa:\n`);
            
            for (let candidato = 0; candidato < 4; candidato++) {
                if (votante === candidato) continue; // No votar por sí mismo
                
                const arg = this.argumentos[candidato];
                const voto = this.calcularVoto(votante, candidato, arg);
                
                this.argumentos[candidato].votos.push({
                    votante: votante,
                    valor: voto
                });
                
                addToConsole(`  → Argumento de Esclavo ${candidato}: ${voto}/10 puntos`);
                this.imprimirJustificacionVoto(votante, candidato, voto, arg);
            }
            
            addToConsole('');
            await this.sleep(500);
        }
    }

    calcularVoto(votante, candidato, arg) {
        // Criterios de votación
        let voto = 0;
        
        // Fuerza del argumento (máx 4 puntos)
        if (arg.fuerza > 200) voto += 4;
        else if (arg.fuerza > 150) voto += 3;
        else if (arg.fuerza > 100) voto += 2;
        else if (arg.fuerza > 50) voto += 1;
        
        // Relevancia (máx 3 puntos)
        if (arg.relevancia > 200) voto += 3;
        else if (arg.relevancia > 150) voto += 2;
        else if (arg.relevancia > 100) voto += 1;
        
        // Coherencia (máx 3 puntos)
        if (arg.coherencia > 200) voto += 3;
        else if (arg.coherencia > 150) voto += 2;
        else if (arg.coherencia > 100) voto += 1;
        
        // Sesgo: votar un poco menos a vecinos directos (competencia)
        if (Math.abs(votante - candidato) === 1) {
            voto = Math.max(0, voto - 1);
        }
        
        return Math.min(10, voto);
    }

    imprimirJustificacionVoto(votante, candidato, voto, arg) {
        if (voto >= 8) {
            addToConsole(`     ✨ "¡Argumento excepcional! Voto con gran convicción."`);
        } else if (voto >= 6) {
            addToConsole(`     👍 "Argumento sólido y bien fundamentado."`);
        } else if (voto >= 4) {
            addToConsole(`     😐 "Argumento aceptable, pero podría mejorar."`);
        } else {
            addToConsole(`     👎 "Argumento débil, carece de fundamento suficiente."`);
        }
    }

    async contarVotos() {
        addToConsole('Computando votos recibidos por cada argumento...\n');
        
        let maxVotos = -1;
        let ganador = 0;
        
        for (let i = 0; i < 4; i++) {
            const totalVotos = this.argumentos[i].votos.reduce((sum, v) => sum + v.valor, 0);
            this.argumentos[i].total_votos = totalVotos;
            
            const porcentaje = ((totalVotos / 30) * 100).toFixed(1); // 30 = máximo teórico
            
            addToConsole(`📊 Esclavo ${i} (${this.esclavos[i].nombre}): ${totalVotos}/30 votos (${porcentaje}%)`);
            addToConsole(`   [${this.getBarraVotos(totalVotos, 30)}]`);
            
            // Mostrar desglose
            const desglose = this.argumentos[i].votos.map(v => 
                `E${v.votante}:${v.valor}`
            ).join(', ');
            addToConsole(`   Desglose: ${desglose}\n`);
            
            if (totalVotos > maxVotos) {
                maxVotos = totalVotos;
                ganador = i;
            }
        }
        
        await this.sleep(800);
        return ganador;
    }

    async imprimirConclusionFinal(ganador, analysis) {
        addToConsole('\n' + '═'.repeat(46));
        addToConsole('🏆 CONCLUSIÓN DEL DEBATE');
        addToConsole('═'.repeat(46) + '\n');
        
        const esclavo = this.esclavos[ganador];
        const arg = this.argumentos[ganador];
        const categoria = esclavo.nombre.substring(2);
        
        addToConsole(`🎉 El ganador es: Esclavo ${ganador} (${esclavo.nombre})\n`, 'success');
        
        addToConsole('📝 VEREDICTO FINAL:\n');
        addToConsole(`El documento "${analysis.title}"`);
        addToConsole(`ha sido clasificado como un texto de tipo ${categoria.toUpperCase()}.\n`);
        
        addToConsole('💡 JUSTIFICACIÓN:\n');
        
        // Justificación personalizada según categoría
        if (ganador === 0) { // Entidades
            addToConsole('Este documento está dominado por ENTIDADES (personas, lugares,');
            addToConsole('organizaciones). Su contenido se centra en actores específicos');
            addToConsole('y sus identidades, siendo probable que sea una biografía,');
            addToConsole('artículo histórico o reporte sobre individuos/instituciones.');
        } else if (ganador === 1) { // Acciones
            addToConsole('Este documento está dominado por ACCIONES (verbos, procesos,');
            addToConsole('procedimientos). Su contenido se centra en el "cómo hacer"');
            addToConsole('cosas, siendo probable que sea un tutorial, guía práctica');
            addToConsole('o manual de instrucciones.');
        } else if (ganador === 2) { // Conceptos
            addToConsole('Este documento está dominado por CONCEPTOS (teorías, ideas,');
            addToConsole('principios abstractos). Su contenido se centra en explicar');
            addToConsole('ideas complejas, siendo probable que sea un artículo');
            addToConsole('científico, ensayo filosófico o texto académico.');
        } else { // Propiedades
            addToConsole('Este documento está dominado por PROPIEDADES (características,');
            addToConsole('tipos, clasificaciones). Su contenido se centra en describir');
            addToConsole('atributos y taxonomías, siendo probable que sea una');
            addToConsole('enciclopedia, catálogo o documento descriptivo.');
        }
        
        addToConsole('');
        addToConsole(`📈 Métricas del argumento ganador:`);
        addToConsole(`   • Fuerza: ${arg.fuerza}/255 (${(arg.fuerza/255*100).toFixed(1)}%)`);
        addToConsole(`   • Relevancia: ${arg.relevancia}/255 (${(arg.relevancia/255*100).toFixed(1)}%)`);
        addToConsole(`   • Coherencia: ${arg.coherencia}/255 (${(arg.coherencia/255*100).toFixed(1)}%)`);
        addToConsole(`   • Votos recibidos: ${arg.total_votos}/30 (${(arg.total_votos/30*100).toFixed(1)}%)`);
        addToConsole('');
        
        addToConsole('✅ El debate ha concluido. Consenso alcanzado.\n', 'success');
        
        // Si hay Arduino conectado, enviar resultado
        if (isConnected) {
            await sendCmd(`DEBATE_WINNER|${ganador}`);
        }
    }

    mostrarResultadoDebate(ganador, analysis) {
        const container = document.getElementById('debateResults') || this.crearPanelDebate();
        
        let html = '<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; color: white; margin-top: 20px;">';
        html += '<h3 style="margin: 0 0 15px 0; text-align: center;">🏆 RESULTADO DEL DEBATE</h3>';
        
        // Ganador destacado
        const esclavo = this.esclavos[ganador];
        html += '<div style="background: rgba(255,255,255,0.2); padding: 20px; border-radius: 8px; margin-bottom: 15px; text-align: center;">';
        html += `<div style="font-size: 48px; margin-bottom: 10px;">${esclavo.nombre.split(' ')[0]}</div>`;
        html += `<div style="font-size: 24px; font-weight: bold;">${esclavo.nombre.substring(2)}</div>`;
        html += `<div style="margin-top: 10px; font-size: 18px;">${this.argumentos[ganador].total_votos}/30 votos</div>`;
        html += '</div>';
        
        // Clasificación del documento
        const categoria = esclavo.nombre.substring(2);
        html += '<div style="background: rgba(255,255,255,0.15); padding: 15px; border-radius: 8px; line-height: 1.6;">';
        html += `<strong>📝 Clasificación:</strong><br>`;
        html += `"${analysis.title}" es un documento de tipo <strong>${categoria.toUpperCase()}</strong><br><br>`;
        
        // Tabla de resultados
        html += '<strong>📊 Tabla de Votos:</strong><br>';
        html += '<table style="width: 100%; margin-top: 10px; border-collapse: collapse;">';
        
        // Ordenar por votos
        const ranking = [...this.argumentos].sort((a, b) => b.total_votos - a.total_votos);
        
        ranking.forEach((arg, idx) => {
            const e = this.esclavos[arg.esclavo];
            const emoji = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '📍';
            const bg = idx === 0 ? 'rgba(255,215,0,0.3)' : 'rgba(255,255,255,0.1)';
            
            html += `<tr style="background: ${bg};">`;
            html += `<td style="padding: 8px;">${emoji}</td>`;
            html += `<td style="padding: 8px;">${e.nombre}</td>`;
            html += `<td style="padding: 8px; text-align: right;">${arg.total_votos} votos</td>`;
            html += '</tr>';
        });
        
        html += '</table>';
        html += '</div>';
        
        html += '</div>';
        
        container.innerHTML = html;
    }

    crearPanelDebate() {
        const container = document.createElement('div');
        container.id = 'debateResults';
        container.className = 'panel full-width';
        
        // Insertar después del panel de estados Quantum32
        const quantum32Panel = document.getElementById('quantum32States').parentElement;
        quantum32Panel.parentElement.insertBefore(container, quantum32Panel.nextSibling);
        
        return container;
    }

    getBarra(valor, max = 255) {
        const porcentaje = (valor / max) * 10;
        const llenos = Math.round(porcentaje);
        return '█'.repeat(llenos) + '░'.repeat(10 - llenos);
    }

    getBarraVotos(votos, max) {
        const porcentaje = (votos / max) * 20;
        const llenos = Math.round(porcentaje);
        return '█'.repeat(llenos) + '░'.repeat(20 - llenos);
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Crear instancia global del sistema de debate
const sistemaDebate = new SistemaDebate();

// ===============================================
// FIN SISTEMA DE DEBATE
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

    addToConsole('🚀 Quantum32 Enhanced Control Center iniciado');
    addToConsole('🧠 Análisis semántico profundo habilitado');
    addToConsole('💡 Conecta tu Arduino para empezar');
});
