// ==UserScript==
// @name         Apply intel v4.0
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  LinkedIn Overlay: Frontend dla ekosystemu n8n (Scraping/Scoring/Interview)
// @author       Wiktor & Gemini
// @match        https://www.linkedin.com/jobs/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // ==========================================
    // ⚙️ KONFIGURACJA
    // ==========================================
    const CONFIG = {
        // Webhook GET (Pobieranie danych o ofercie)
        CHECK_URL: 'https://backpackai.app.n8n.cloud/webhook/fa424e60-ce6b-4366-b5b0-94bda29ab1a5',

        // Webhook POST (Aktualizacja statusu na "Applied")
        APPLY_URL: 'https://backpackai.app.n8n.cloud/webhook/bdc79564-3b48-4ff0-954f-fa7ea98a4dd6'
    };

    // ==========================================
    // 🎨 STYLE
    // ==========================================
    GM_addStyle(`
        #cyborg-panel {
            position: fixed;
            top: 75px;
            left: 70%; /* Pozycja: idealnie obok treści oferty */
            width: 360px;
            background: #0f172a; /* Slate 900 */
            color: #e2e8f0;
            border: 1px solid #334155;
            border-radius: 8px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.7);
            z-index: 10000;
            font-family: 'Segoe UI', Roboto, sans-serif;
            font-size: 13px;
            display: flex;
            flex-direction: column;
        }
        #cyborg-header {
            background: #1e293b; padding: 12px 15px; border-radius: 8px 8px 0 0;
            border-bottom: 1px solid #334155; display: flex; justify-content: space-between;
            align-items: center; font-weight: 700; color: #38bdf8; cursor: pointer; user-select: none;
        }
        #cyborg-content { padding: 15px; max-height: 80vh; overflow-y: auto; }
        .c-row { margin-bottom: 15px; }
        .c-label { font-size: 10px; text-transform: uppercase; color: #94a3b8; margin-bottom: 5px; display: block; }

        /* Meta Data */
        .meta-row { display: flex; justify-content: space-between; align-items: center; background: #1e293b; padding: 10px; border-radius: 6px; }
        .score-val { font-size: 18px; font-weight: bold; }

        /* Universal Badge System */
        .cv-badge {
            text-align: center; padding: 10px; border-radius: 6px;
            font-weight: 700; font-size: 14px;
            display: flex; align-items: center; justify-content: center; gap: 8px;
            word-break: break-all; /* Żeby długie nazwy plików nie psuły UI */
        }

        .cv-tech { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid #3b82f6; } /* Niebieski */
        .cv-manager { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid #10b981; } /* Zielony */
        .cv-default { background: rgba(139, 92, 246, 0.15); color: #c4b5fd; border: 1px solid #8b5cf6; } /* Fioletowy (Uniwersalny) */

        /* Inputs & Buttons */
        .cyborg-textarea { width: 100%; background: #020617; border: 1px solid #334155; color: #cbd5e1; padding: 10px; border-radius: 4px; min-height: 100px; resize: vertical; font-family: monospace; font-size: 12px; box-sizing: border-box; }
        .btn { width: 100%; padding: 10px; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; margin-top: 8px; color: white; transition: background 0.2s; }

        .btn-copy { background: #3b82f6; }
        .btn-copy:hover { background: #2563eb; }

        .btn-apply { background: #8b5cf6; margin-top: 15px; }
        .btn-apply:hover { background: #7c3aed; }
        .btn-apply:disabled { background: #475569; cursor: not-allowed; opacity: 0.7; }

        .btn-done { background: #10b981; margin-top: 15px; cursor: default; }
        .btn-done:hover { background: #059669; }

        /* Brief */
        .brief-box { background: #1e293b; padding: 12px; border-radius: 4px; margin-top: 5px; display: none; white-space: pre-wrap; line-height: 1.5; }
        .brief-toggle { color: #94a3b8; cursor: pointer; font-size: 11px; text-decoration: underline; margin-left: auto; }
    `);

    // ==========================================
    // 🛠️ HELPERY DOM
    // ==========================================
    function el(tag, classes = [], text = '', children = []) {
        const element = document.createElement(tag);
        if (classes.length) element.classList.add(...classes);
        if (text) element.textContent = text;
        children.forEach(child => { if (child) element.appendChild(child); });
        return element;
    }

    // ==========================================
    // 🧠 LOGIKA
    // ==========================================
    let currentJobId = null;
    let panelContent = null;

    setInterval(() => {
        const newId = getJobId();
        if (newId && newId !== currentJobId) {
            currentJobId = newId;
            renderLoading();
            fetchData(currentJobId);
        }
    }, 1000);

    function getJobId() {
        const url = window.location.href;
        const m1 = url.match(/currentJobId=(\d+)/);
        const m2 = url.match(/jobs\/view\/(\d+)/);
        return m1 ? m1[1] : (m2 ? m2[1] : null);
    }

    function fetchData(id) {
        console.log(`🤖 Pobieram dane dla ID: ${id}`);
        GM_xmlhttpRequest({
            method: "GET",
            url: `${CONFIG.CHECK_URL}?job_id=${id}`,
            onload: (res) => {
                if (res.status === 200) {
                    try {
                        let data = JSON.parse(res.responseText);
                        if (Array.isArray(data)) data = data[0];

                        if (data && (data.found === true || data.found === "true")) {
                            renderData(data);
                        } else {
                            renderNotFound(id);
                        }
                    } catch (e) {
                        renderError('Błąd JSON: ' + e.message);
                    }
                } else {
                    renderError(`Błąd HTTP: ${res.status}`);
                }
            },
            onerror: () => renderError('Błąd połączenia z n8n')
        });
    }

    function sendApplySignal(btnElement, statusElement) {
        const originalText = btnElement.textContent;
        btnElement.textContent = '⏳ Czekam na n8n...';
        btnElement.disabled = true;

        GM_xmlhttpRequest({
            method: "POST",
            url: CONFIG.APPLY_URL,
            headers: { "Content-Type": "application/json" },
            data: JSON.stringify({ job_id: currentJobId }),
            onload: (res) => {
                if (res.status === 200) {
                    try {
                        let response = JSON.parse(res.responseText);
                        if (Array.isArray(response)) response = response[0] || {};

                        if (response && response.Status) {
                            btnElement.className = 'btn btn-done';
                            btnElement.textContent = 'Zapisano! ✅';

                            if (statusElement) {
                                statusElement.textContent = response.Status;
                                statusElement.style.color = '#10b981';
                            }
                        } else {
                            btnElement.textContent = 'Błąd: Brak ID w bazie ❌';
                            btnElement.style.background = '#f87171';
                            setTimeout(() => {
                                btnElement.textContent = originalText;
                                btnElement.className = 'btn btn-apply';
                                btnElement.style.background = '';
                                btnElement.disabled = false;
                            }, 3000);
                        }

                    } catch (e) {
                        btnElement.textContent = 'Błąd danych ❌';
                        setTimeout(() => btnElement.textContent = originalText, 3000);
                    }
                } else {
                    btnElement.textContent = `Http Error: ${res.status} ❌`;
                    btnElement.disabled = false;
                    setTimeout(() => btnElement.textContent = originalText, 3000);
                }
            },
            onerror: () => {
                btnElement.textContent = 'Błąd sieci ❌';
                btnElement.disabled = false;
                setTimeout(() => btnElement.textContent = originalText, 3000);
            }
        });
    }

    // ==========================================
    // 🖥️ RENDEROWANIE
    // ==========================================

    function initPanel() {
        if (document.getElementById('cyborg-panel')) return;

        const panel = el('div', [], '', []);
        panel.id = 'cyborg-panel';

        const header = el('div', [], '', [
            el('span', [], '🤖 Cyborg Helper'),
            el('span', [], '_')
        ]);
        header.id = 'cyborg-header';

        header.addEventListener('click', () => {
            panelContent.style.display = panelContent.style.display === 'none' ? 'block' : 'none';
        });

        panelContent = el('div', [], 'Inicjalizacja...');
        panelContent.id = 'cyborg-content';

        panel.appendChild(header);
        panel.appendChild(panelContent);
        document.body.appendChild(panel);
    }

    function clearPanel() {
        initPanel();
        panelContent.innerHTML = '';
    }

    function renderLoading() {
        clearPanel();
        panelContent.appendChild(el('div', [], '📡 Sprawdzam bazę...', []));
        panelContent.style.textAlign = 'center';
        panelContent.style.padding = '30px';
    }

    function renderError(msg) {
        clearPanel();
        const errDiv = el('div', [], msg);
        errDiv.style.color = '#f87171';
        panelContent.appendChild(errDiv);
    }

    function renderNotFound(id) {
        clearPanel();
        const container = el('div', [], '', [
            el('div', [], '👻', []),
            el('div', [], 'Brak w bazie'),
            el('div', [], `ID: ${id}`)
        ]);
        container.style.textAlign = 'center';
        container.style.opacity = '0.7';
        container.firstChild.style.fontSize = '30px';
        panelContent.appendChild(container);
    }

    function renderData(data) {
        clearPanel();
        panelContent.style.textAlign = 'left';
        panelContent.style.padding = '15px';

        // 1. Status
        let currentStatus = (data.status || 'New').trim();
        currentStatus = currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1);
        const isApplied = currentStatus.toLowerCase() === 'applied';

        // 2. Score
        const score = parseInt(data.score) || 0;
        const scoreColor = score >= 7 ? '#4ade80' : (score >= 4 ? '#facc15' : '#f87171');

        const scoreSpan = el('span', ['score-val'], `${score}/10`);
        scoreSpan.style.color = scoreColor;

        const statusSpan = el('span', [], currentStatus);
        if (isApplied) statusSpan.style.color = '#10b981';

        const metaRow = el('div', ['meta-row'], '', [
            el('div', [], '', [ el('span', ['c-label'], 'Wynik'), scoreSpan ]),
            el('div', [], '', [ el('span', ['c-label'], 'Status'), statusSpan ])
        ]);
        panelContent.appendChild(metaRow);

        // 3. UNIVERSAL CV BADGE LOGIC
        // Pobieramy surową nazwę pliku z n8n (np. "CV-MGMT-012026.PDF")
        const rawCvType = (data.cv_type || 'STANDARD').toString();
        const upperCv = rawCvType.toUpperCase();

        let badgeClass = 'cv-default'; // Domyślnie Fioletowy/Uniwersalny
        let badgeIcon = '📄';          // Ikona dokumentu

        // Wykrywanie słów kluczowych
        if (upperCv.includes('TECH') || upperCv.includes('DEVELOPER') || upperCv.includes('ENGINEER')) {
            badgeClass = 'cv-tech'; // Niebieski
            badgeIcon = '💻';
        }
        else if (upperCv.includes('MGMT') || upperCv.includes('MANAGER') || upperCv.includes('HEAD') || upperCv.includes('LEAD')) {
            badgeClass = 'cv-manager'; // Zielony
            badgeIcon = '👔';
        }

        const cvRow = el('div', ['c-row'], '', [
            el('div', ['cv-badge', badgeClass], '', [ el('span', [], badgeIcon), el('span', [], rawCvType) ])
        ]);
        cvRow.style.marginTop = '15px';
        panelContent.appendChild(cvRow);

        // 4. List Motywacyjny
        const txtArea = el('textarea', ['cyborg-textarea'], '');
        txtArea.value = data.cover_letter || "Brak listu.";
        txtArea.readOnly = true;
        txtArea.addEventListener('click', function() { this.select(); });

        const copyBtn = el('button', ['btn', 'btn-copy'], '📋 Kopiuj Treść');
        copyBtn.addEventListener('click', () => {
            GM_setClipboard(txtArea.value);
            const original = copyBtn.textContent;
            copyBtn.textContent = 'Skopiowano! ✅';
            copyBtn.style.background = '#22c55e';
            setTimeout(() => {
                copyBtn.textContent = original;
                copyBtn.style.background = '#3b82f6';
            }, 2000);
        });

        const clRow = el('div', ['c-row'], '', [
            el('span', ['c-label'], 'List Motywacyjny'), txtArea, copyBtn
        ]);
        panelContent.appendChild(clRow);

        // 5. Brief
        const briefContent = el('div', ['brief-box']);
        briefContent.innerHTML = (data.interview_brief || 'Brak notatek')
            .replace(/\n/g, '<br>')
            .replace(/^# (.*)/gm, '<b>$1</b>')
            .replace(/^\* (.*)/gm, '• $1');

        const toggleBtn = el('div', ['brief-toggle'], 'Pokaż ▼');
        toggleBtn.addEventListener('click', () => {
            if (briefContent.style.display === 'block') {
                briefContent.style.display = 'none';
                toggleBtn.textContent = 'Pokaż ▼';
            } else {
                briefContent.style.display = 'block';
                toggleBtn.textContent = 'Ukryj ▲';
            }
        });

        const briefRow = el('div', ['c-row'], '', [
            el('div', [], '', [ el('span', ['c-label'], 'Interview Brief'), toggleBtn ]),
            briefContent
        ]);
        briefRow.firstChild.style.display = 'flex';
        briefRow.firstChild.style.justifyContent = 'space-between';
        panelContent.appendChild(briefRow);

        // 6. APPLY BUTTON
        if (isApplied) {
            const doneBtn = el('button', ['btn', 'btn-done'], '✅ Już zaaplikowano');
            doneBtn.addEventListener('click', (e) => e.preventDefault());
            panelContent.appendChild(doneBtn);
        } else {
            const applyBtn = el('button', ['btn', 'btn-apply'], '🚀 Oznacz jako Aplikowane');
            applyBtn.addEventListener('click', () => {
                sendApplySignal(applyBtn, statusSpan);
            });
            panelContent.appendChild(applyBtn);
        }
    }

    initPanel();

})();