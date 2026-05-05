﻿document.addEventListener('DOMContentLoaded', () => {
    const DEBUG_MODE = false; // Установите true, чтобы включить проверку путей к изображениям

    const galleryContainer = document.getElementById('gallery-container');
    const loader = document.getElementById('loader');
    const tabGallery = document.getElementById('tab-gallery');
    const tabFavorites = document.getElementById('tab-favorites');
    const searchInput = document.getElementById('search-input');
    const sortByNameBtn = document.getElementById('sort-by-name');
    const sortByWorksBtn = document.getElementById('sort-by-works');
    const sortByUniquenessBtn = document.getElementById('sort-by-uniqueness');
    const sortByRandomBtn = document.getElementById('sort-by-random'); // Новая кнопка
    const scrollToTopBtn = document.getElementById('scroll-to-top');
    const gridSlider = document.getElementById('grid-slider');
    const gridSliderValue = document.getElementById('grid-slider-value');
    const controlsContainer = document.getElementById('controls-container');
    const swipeLaunchControls = document.querySelector('.swipe-launch-controls');
    const favoritesControlsWrapper = document.getElementById('favorites-controls-wrapper');
    const styleCounter = document.getElementById('style-counter');
    const txtExportContainer = document.getElementById('txt-export-container');
    const toggleFoldersBtn = document.getElementById('toggle-folders-btn');
    const importFavoritesInput = document.getElementById('import-favorites-input');
    const swipeContinueHint = document.getElementById('swipe-continue-hint'); // Новый элемент
    const jumpInput = document.getElementById('jump-input');
    const jumpToArtistHint = document.createElement('div'); // Элемент для подсказки о "прыжке"
    const clearJumpBtn = document.getElementById('clear-jump-btn'); // Эта кнопка теперь крестик
    const jumpControls = document.querySelector('.jump-controls');
    const searchWrapper = document.querySelector('.search-wrapper');
    const sortControls = document.querySelector('.sort-controls');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const styleToolsWrapper = document.getElementById('style-tools-wrapper');
    const randomStyleCountInput = document.getElementById('random-style-count');
    const randomAutoStrengthCheckbox = document.getElementById('random-auto-strength-checkbox');
    const getRandomStyleBtn = document.getElementById('get-random-style-btn');
    const copyRandomStyleBtn = document.getElementById('copy-random-style-btn');
    const randomStyleOutput = document.getElementById('random-style-output');
    const similarStyleInput = document.getElementById('similar-style-input');
    const similarStyleUploadBtn = document.getElementById('similar-style-upload-btn');
    const clearSimilarStyleBtn = document.getElementById('clear-similar-style-btn');
    const similarStyleStatus = document.getElementById('similar-style-status');
    const similarStyleThresholdInput = document.getElementById('similar-style-threshold');
    const similarStyleConcurrencyInput = document.getElementById('similar-style-concurrency');
    const stopSimilarStyleBtn = document.getElementById('stop-similar-style-btn');
    const similarStyleProgressFill = document.getElementById('similar-style-progress-fill');
    let allItems = [];
    const galleryTitle = document.getElementById('gallery-title');
    let itemsSortedByWorks = []; 
    let selectedArtistIds = new Set(); // Для мульти-выделения в избранном
    let favorites = new Map(); // Используем Map для хранения {id: timestamp}
    let currentItems = [];
    let currentPage = 0; // Текущая страница для ленивой загрузки
    let startIndexOffset = 0; // Смещение для "перехода к номеру"
    const itemsPerPage = 20;
    let searchTerm = ''; // 'gallery', 'favorites'
    let currentView = 'gallery'; // 'gallery', 'favorites', or 'about'
    let sortType = 'name'; // 'name', 'works', or 'uniqueness'
    let sortDirection = 'asc'; // 'asc' or 'desc'
    let isLoading = false;
    let sortUpdateTimeout; // Переменная для таймера сохранения сортировки
    let previousSortType = null; // Для восстановления сортировки после "Jump"
    let previousSortDirection = null; // Для восстановления сортировки после "Jump"
    let jumpTimeout; // Таймер для отложенного перехода
    const SORT_TYPE_KEY = 'sortType';
    const FOLDERS_PANEL_VISIBLE_KEY = 'foldersPanelVisible';
    let isJumpingToArtist = false; // Флаг для отслеживания состояния "прыжка"
    let isFoldersPanelVisible = true; // Состояние видимости панели папок
    let similarityModeActive = false;
    let similaritySearchInProgress = false;
    let similarityItems = [];
    let similarityAllResults = [];
    let similarityLastStats = null;
    let similarityAbortToken = 0;
    let similarityStopRequested = false;
    let similarityAbortController = null;
    const similarityFeatureCache = new Map();
    let pendingSimilarityFeatureSaves = [];
    let pendingSimilarityFeatureSaveTimer = null;
    const SIMILARITY_CANVAS_SIZE = 64;
    const SIMILARITY_GRID_SIZE = 8;
    const SIMILARITY_FEATURE_STORE_NAME = 'similarity_features';
    const SIMILARITY_FEATURE_VERSION = `v6-style-cues-${SIMILARITY_CANVAS_SIZE}-${SIMILARITY_GRID_SIZE}`;
    const SIMILARITY_MIN_CONCURRENCY = 4;
    const SIMILARITY_MAX_CONCURRENCY = 128;
    const SIMILARITY_DEFAULT_CONCURRENCY = Math.min(96, Math.max(16, (navigator.hardwareConcurrency || 8) * 6));
    const SORT_DIRECTION_KEY = 'sortDirection';

    // --- Глобальные переменные для доступа из других скриптов ---
    window.appGlobals = {
        get currentItems() { return currentItems; },
        get favorites() { return favorites; },
        get searchTerm() { return searchTerm; },
        get currentView() { return currentView; },
        get db() { return db; },
        get STORE_NAME() { return STORE_NAME; }, 
        get allItems() { return allItems; }, // Добавляем allItems для доступа из folders.js
        set db(value) { db = value; }, // Сеттер для обновления db из folders.js
        get selectedArtistIds() { return selectedArtistIds; }, // Экспортируем для folders.js
        clearSelection: () => selectedArtistIds.clear(), // Функция для очистки выделения
        toggleFavorite,
        showToast,
        renderView,
        updateVisibleFavorites // Экспортируем новую функцию
    };

    // --- Определение базового пути для изображений ---
    // Проверяем, запущено ли приложение с веб-сервера (http/https) или локально (file:)
    const isOnline = window.location.protocol.startsWith('http');
    const imageBasePath = isOnline 
        ? 'https://cdn.jsdelivr.net/gh/ThetaCursed/Illustrious-NoobAI-Style-Explorer@main/'  
        : '';

    if (similarStyleConcurrencyInput) {
        const initialConcurrency = parseInt(similarStyleConcurrencyInput.value, 10);
        if (!Number.isFinite(initialConcurrency) || initialConcurrency <= 0) {
            similarStyleConcurrencyInput.value = SIMILARITY_DEFAULT_CONCURRENCY;
        }
    }




    // --- Функции создания элементов ---

    // --- IndexedDB ---
    let db;
    const DB_NAME = 'SDXLStyleGalleryDB';
    const STORE_NAME = 'favorites';

    function initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 6); // Увеличиваем версию для обновления схемы

            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                reject('Error opening DB');
            };

            request.onsuccess = (event) => {
                db = event.target.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const upgradeDb = event.target.result;
                // Хранилище для избранного
                if (!upgradeDb.objectStoreNames.contains(STORE_NAME)) {
                    const favStore = upgradeDb.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    favStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
                // Хранилище для папок
                if (!upgradeDb.objectStoreNames.contains('folders')) {
                    const foldersStore = upgradeDb.createObjectStore('folders', { keyPath: 'id' });
                    // Добавляем индексы для новых полей, если они нужны для запросов
                    // Для lastArtistId и lastArtistImage индексы не обязательны, если мы их только отображаем
                    foldersStore.createIndex('name', 'name', { unique: false }); // Индекс для сортировки по имени
                }
                // Хранилище для связи артистов и папок
                if (!upgradeDb.objectStoreNames.contains('folder_artists')) {
                    upgradeDb.createObjectStore('folder_artists', { keyPath: 'folderId' });
                }
                // Persistent cache for Similar Style Search image features.
                // This avoids re-reading all 16k preview images on repeated searches.
                if (!upgradeDb.objectStoreNames.contains(SIMILARITY_FEATURE_STORE_NAME)) {
                    upgradeDb.createObjectStore(SIMILARITY_FEATURE_STORE_NAME, { keyPath: 'id' });
                }
            };
        });
    }

    async function loadFavoritesFromDB() {
        return new Promise((resolve) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const objectStore = transaction.objectStore(STORE_NAME);
            const request = objectStore.getAll();
            request.onsuccess = () => {
                // Загружаем в Map в формате {id: timestamp}
                favorites = new Map(request.result.map(item => [item.id, item.timestamp]));
                resolve();
            };
        });
    }

    /**
     * Алгоритм тасования Фишера-Йетса для случайного перемешивания массива.
     * @param {Array} array - Массив для перемешивания.
     */
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]]; // Обмен элементами
        }
    }
    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function setSimilarStyleStatus(message, isActive = false) {
        if (!similarStyleStatus) return;
        similarStyleStatus.textContent = message;
        similarStyleStatus.classList.toggle('is-active', isActive);
    }

    function setSimilarityProgress(processed = 0, total = 0) {
        if (!similarStyleProgressFill) return;
        const percent = total > 0 ? Math.max(0, Math.min(100, (processed / total) * 100)) : 0;
        similarStyleProgressFill.style.width = `${percent}%`;
    }

    function clampNumber(value, min, max, fallback) {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) return fallback;
        return Math.max(min, Math.min(max, parsed));
    }

    function getSimilarityThreshold() {
        const threshold = clampNumber(similarStyleThresholdInput?.value, 0, 100, 0);
        if (similarStyleThresholdInput && String(similarStyleThresholdInput.value) !== String(threshold)) {
            similarStyleThresholdInput.value = threshold;
        }
        return threshold;
    }

    function getSimilarityConcurrency() {
        const concurrency = Math.round(clampNumber(
            similarStyleConcurrencyInput?.value,
            SIMILARITY_MIN_CONCURRENCY,
            SIMILARITY_MAX_CONCURRENCY,
            SIMILARITY_DEFAULT_CONCURRENCY
        ));
        if (similarStyleConcurrencyInput) similarStyleConcurrencyInput.value = concurrency;
        return concurrency;
    }

    function formatSimilarityPercent(score) {
        const percent = Math.max(0, Math.min(100, score * 100));
        return `${percent.toFixed(percent >= 99.95 ? 0 : 1).replace(/\.0$/, '')}%`;
    }

    function formatSimilarityRate(processed, startedAt) {
        const elapsedSeconds = Math.max(0.001, (performance.now() - startedAt) / 1000);
        return `${(processed / elapsedSeconds).toFixed(1)} styles/s`;
    }

    function makeAbortError() {
        return new DOMException('Similar Style Search was stopped.', 'AbortError');
    }

    function throwIfSimilarityStopped(token, signal) {
        if (token !== similarityAbortToken || similarityStopRequested || signal?.aborted) {
            throw makeAbortError();
        }
    }

    function loadImageForSimilarity(src, useCrossOrigin = false, signal = null) {
        if (signal?.aborted) return Promise.reject(makeAbortError());

        if (/^https?:\/\//i.test(src) && typeof fetch === 'function' && typeof createImageBitmap === 'function') {
            const fetchController = new AbortController();
            const timeoutId = setTimeout(() => fetchController.abort(), 20000);
            const onAbort = () => fetchController.abort();
            if (signal) signal.addEventListener('abort', onAbort, { once: true });

            return fetch(src, { mode: 'cors', cache: 'force-cache', signal: fetchController.signal })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Could not load image: ${src} (${response.status})`);
                    }
                    return response.blob();
                })
                .then(blob => createImageBitmap(blob, {
                    resizeWidth: SIMILARITY_CANVAS_SIZE,
                    resizeHeight: SIMILARITY_CANVAS_SIZE,
                    resizeQuality: 'low'
                }).catch(() => createImageBitmap(blob)))
                .catch(error => {
                    if (signal?.aborted || error?.name === 'AbortError') throw makeAbortError();
                    throw error;
                })
                .finally(() => {
                    clearTimeout(timeoutId);
                    if (signal) signal.removeEventListener('abort', onAbort);
                });
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            let settled = false;
            const cleanup = () => {
                clearTimeout(timeoutId);
                img.onload = null;
                img.onerror = null;
                if (signal) signal.removeEventListener('abort', onAbort);
            };
            const finish = (callback, value) => {
                if (settled) return;
                settled = true;
                cleanup();
                callback(value);
            };
            const onAbort = () => {
                img.src = '';
                finish(reject, makeAbortError());
            };
            const timeoutId = setTimeout(() => {
                finish(reject, new Error(`Timed out loading image: ${src}`));
            }, 20000);

            if (signal) signal.addEventListener('abort', onAbort, { once: true });
            if (useCrossOrigin && /^https?:\/\//i.test(src)) {
                img.crossOrigin = 'anonymous';
            }
            img.onload = () => finish(resolve, img);
            img.onerror = () => finish(reject, new Error(`Could not load image: ${src}`));
            img.src = src;
        });
    }

    function closeDrawableForSimilarity(drawable) {
        if (drawable && typeof drawable.close === 'function') {
            drawable.close();
        }
    }

    function extractImageFeature(img) {
        const canvas = document.createElement('canvas');
        canvas.width = SIMILARITY_CANVAS_SIZE;
        canvas.height = SIMILARITY_CANVAS_SIZE;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, SIMILARITY_CANVAS_SIZE, SIMILARITY_CANVAS_SIZE);

        const { data } = ctx.getImageData(0, 0, SIMILARITY_CANVAS_SIZE, SIMILARITY_CANVAS_SIZE);
        const channelBins = 8;
        const redHist = new Array(channelBins).fill(0);
        const greenHist = new Array(channelBins).fill(0);
        const blueHist = new Array(channelBins).fill(0);
        const lumaGrid = new Array(SIMILARITY_GRID_SIZE * SIMILARITY_GRID_SIZE).fill(0);
        const gridCounts = new Array(SIMILARITY_GRID_SIZE * SIMILARITY_GRID_SIZE).fill(0);
        const edgeGrid = new Array(SIMILARITY_GRID_SIZE * SIMILARITY_GRID_SIZE).fill(0);
        const luma = new Float32Array(SIMILARITY_CANVAS_SIZE * SIMILARITY_CANVAS_SIZE);
        const pixelCount = SIMILARITY_CANVAS_SIZE * SIMILARITY_CANVAS_SIZE;
        const gridCellSize = SIMILARITY_CANVAS_SIZE / SIMILARITY_GRID_SIZE;

        for (let y = 0; y < SIMILARITY_CANVAS_SIZE; y++) {
            for (let x = 0; x < SIMILARITY_CANVAS_SIZE; x++) {
                const pixelIndex = y * SIMILARITY_CANVAS_SIZE + x;
                const dataIndex = pixelIndex * 4;
                const r = data[dataIndex];
                const g = data[dataIndex + 1];
                const b = data[dataIndex + 2];
                const alpha = data[dataIndex + 3] / 255;
                const safeR = r * alpha + 28 * (1 - alpha);
                const safeG = g * alpha + 28 * (1 - alpha);
                const safeB = b * alpha + 30 * (1 - alpha);
                const lum = (0.299 * safeR + 0.587 * safeG + 0.114 * safeB) / 255;

                redHist[Math.min(channelBins - 1, Math.floor(safeR / 32))]++;
                greenHist[Math.min(channelBins - 1, Math.floor(safeG / 32))]++;
                blueHist[Math.min(channelBins - 1, Math.floor(safeB / 32))]++;
                luma[pixelIndex] = lum;

                const gridX = Math.min(SIMILARITY_GRID_SIZE - 1, Math.floor(x / gridCellSize));
                const gridY = Math.min(SIMILARITY_GRID_SIZE - 1, Math.floor(y / gridCellSize));
                const gridIndex = gridY * SIMILARITY_GRID_SIZE + gridX;
                lumaGrid[gridIndex] += lum;
                gridCounts[gridIndex]++;
            }
        }

        for (let y = 1; y < SIMILARITY_CANVAS_SIZE - 1; y++) {
            for (let x = 1; x < SIMILARITY_CANVAS_SIZE - 1; x++) {
                const center = y * SIMILARITY_CANVAS_SIZE + x;
                const dx = Math.abs(luma[center + 1] - luma[center - 1]);
                const dy = Math.abs(luma[center + SIMILARITY_CANVAS_SIZE] - luma[center - SIMILARITY_CANVAS_SIZE]);
                const gridX = Math.min(SIMILARITY_GRID_SIZE - 1, Math.floor(x / gridCellSize));
                const gridY = Math.min(SIMILARITY_GRID_SIZE - 1, Math.floor(y / gridCellSize));
                edgeGrid[gridY * SIMILARITY_GRID_SIZE + gridX] += Math.sqrt(dx * dx + dy * dy);
            }
        }

        const feature = [];
        redHist.forEach(v => feature.push((v / pixelCount) * 1.2));
        greenHist.forEach(v => feature.push((v / pixelCount) * 1.2));
        blueHist.forEach(v => feature.push((v / pixelCount) * 1.2));
        lumaGrid.forEach((v, i) => feature.push((v / Math.max(1, gridCounts[i])) * 0.8));
        edgeGrid.forEach(v => feature.push((v / Math.max(1, pixelCount / (SIMILARITY_GRID_SIZE * SIMILARITY_GRID_SIZE))) * 0.55));

        return Float32Array.from(feature);
    }

    function cosineSimilarity(featureA, featureB) {
        let dot = 0;
        let normA = 0;
        let normB = 0;
        const length = Math.min(featureA.length, featureB.length);
        for (let i = 0; i < length; i++) {
            dot += featureA[i] * featureB[i];
            normA += featureA[i] * featureA[i];
            normB += featureB[i] * featureB[i];
        }
        if (!normA || !normB) return 0;
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    function readStyleFeatureFromDB(id) {
        return new Promise(resolve => {
            if (!db || !db.objectStoreNames.contains(SIMILARITY_FEATURE_STORE_NAME)) {
                resolve(null);
                return;
            }
            const transaction = db.transaction(SIMILARITY_FEATURE_STORE_NAME, 'readonly');
            const store = transaction.objectStore(SIMILARITY_FEATURE_STORE_NAME);
            const request = store.get(id);
            request.onsuccess = () => {
                const record = request.result;
                if (record && record.version === SIMILARITY_FEATURE_VERSION && Array.isArray(record.feature)) {
                    resolve(Float32Array.from(record.feature));
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => resolve(null);
        });
    }

    function queueStyleFeatureSave(id, feature) {
        if (!db || !db.objectStoreNames.contains(SIMILARITY_FEATURE_STORE_NAME)) return;
        pendingSimilarityFeatureSaves.push({
            id,
            version: SIMILARITY_FEATURE_VERSION,
            feature: Array.from(feature)
        });

        if (pendingSimilarityFeatureSaves.length >= 250) {
            flushSimilarityFeatureSaves();
        } else if (!pendingSimilarityFeatureSaveTimer) {
            pendingSimilarityFeatureSaveTimer = setTimeout(flushSimilarityFeatureSaves, 1000);
        }
    }

    function flushSimilarityFeatureSaves() {
        if (pendingSimilarityFeatureSaveTimer) {
            clearTimeout(pendingSimilarityFeatureSaveTimer);
            pendingSimilarityFeatureSaveTimer = null;
        }
        if (!pendingSimilarityFeatureSaves.length || !db || !db.objectStoreNames.contains(SIMILARITY_FEATURE_STORE_NAME)) {
            return Promise.resolve();
        }
        const records = pendingSimilarityFeatureSaves.splice(0, pendingSimilarityFeatureSaves.length);
        return new Promise(resolve => {
            const transaction = db.transaction(SIMILARITY_FEATURE_STORE_NAME, 'readwrite');
            const store = transaction.objectStore(SIMILARITY_FEATURE_STORE_NAME);
            records.forEach(record => store.put(record));
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => resolve();
            transaction.onabort = () => resolve();
        });
    }

    async function getStyleFeature(item, token, signal) {
        if (similarityFeatureCache.has(item.id)) {
            return { feature: similarityFeatureCache.get(item.id), source: 'memory' };
        }

        throwIfSimilarityStopped(token, signal);
        const dbFeature = await readStyleFeatureFromDB(item.id);
        if (dbFeature) {
            similarityFeatureCache.set(item.id, dbFeature);
            return { feature: dbFeature, source: 'indexeddb' };
        }

        throwIfSimilarityStopped(token, signal);
        const drawable = await loadImageForSimilarity(item.image, true, signal);
        try {
            throwIfSimilarityStopped(token, signal);
            const feature = extractImageFeature(drawable);
            similarityFeatureCache.set(item.id, feature);
            queueStyleFeatureSave(item.id, feature);
            return { feature, source: 'new' };
        } finally {
            closeDrawableForSimilarity(drawable);
        }
    }

    function buildSimilarityItemsFromResults(rawResults) {
        const threshold = getSimilarityThreshold();
        const minimumScore = threshold / 100;
        return rawResults
            .filter(result => result.score >= minimumScore)
            .sort((a, b) => b.score - a.score)
            .map((result, index) => ({
                ...result.item,
                similarityScore: result.score,
                similarityPercent: formatSimilarityPercent(result.score),
                similarityRank: index + 1
            }));
    }

    function updateSimilarityResultStatus(stats = similarityLastStats, customMessage = '') {
        if (!stats) return;
        const threshold = getSimilarityThreshold();
        const filteredOut = Math.max(0, similarityAllResults.length - similarityItems.length);
        const stoppedText = stats.stopped ? 'Stopped. ' : '';
        const failedText = stats.failed > 0 ? ` · ${stats.failed.toLocaleString('en-US')} skipped` : '';
        const filteredText = threshold > 0 ? ` · ${filteredOut.toLocaleString('en-US')} below ${threshold}% hidden` : '';
        const cacheText = stats.cached > 0 ? ` · ${stats.cached.toLocaleString('en-US')} cached` : '';
        const base = customMessage || `${stoppedText}Similar style results: ${similarityItems.length.toLocaleString('en-US')} shown / ${similarityAllResults.length.toLocaleString('en-US')} analyzed${failedText}${filteredText}${cacheText}.`;
        setSimilarStyleStatus(base, false);
    }

    function applySimilarityThresholdAndRender(shouldRender = true) {
        if (!similarityAllResults.length) return;
        similarityItems = buildSimilarityItemsFromResults(similarityAllResults);
        similarityModeActive = true;
        styleCounter.innerHTML = `Similar Style Search: <span class="style-count-number">${similarityItems.length.toLocaleString('en-US')}</span>`;
        updateSimilarityResultStatus();
        updateControlsState();
        if (shouldRender && currentView === 'gallery') {
            renderView();
        }
    }

    function commitSimilarityResults(rawResults, stats = {}, shouldRender = true) {
        similarityAllResults = [...rawResults].sort((a, b) => b.score - a.score);
        similarityLastStats = {
            total: allItems.length,
            processed: stats.processed || rawResults.length,
            failed: stats.failed || 0,
            cached: stats.cached || 0,
            stopped: Boolean(stats.stopped)
        };
        similarityItems = buildSimilarityItemsFromResults(similarityAllResults);
        similarityModeActive = true;
        similaritySearchInProgress = false;
        similarityStopRequested = false;
        similarityAbortController = null;

        if (similarStyleUploadBtn) similarStyleUploadBtn.disabled = false;
        if (stopSimilarStyleBtn) {
            stopSimilarStyleBtn.disabled = false;
            stopSimilarStyleBtn.textContent = 'Stop';
            stopSimilarStyleBtn.style.display = 'none';
        }
        if (clearSimilarStyleBtn) clearSimilarStyleBtn.style.display = 'inline-flex';

        setSimilarityProgress(similarityLastStats.processed, similarityLastStats.total);
        styleCounter.innerHTML = `Similar Style Search: <span class="style-count-number">${similarityItems.length.toLocaleString('en-US')}</span>`;
        updateSimilarityResultStatus();
        updateControlsState();
        if (shouldRender && currentView === 'gallery') {
            renderView();
        }
    }

    function clearSimilaritySearch(shouldRender = true) {
        similarityAbortToken++;
        similarityStopRequested = true;
        if (similarityAbortController) {
            similarityAbortController.abort();
            similarityAbortController = null;
        }
        similarityModeActive = false;
        similaritySearchInProgress = false;
        similarityItems = [];
        similarityAllResults = [];
        similarityLastStats = null;
        galleryContainer.classList.remove('similarity-view');

        if (similarStyleInput) similarStyleInput.value = '';
        if (clearSimilarStyleBtn) clearSimilarStyleBtn.style.display = 'none';
        if (stopSimilarStyleBtn) {
            stopSimilarStyleBtn.disabled = false;
            stopSimilarStyleBtn.textContent = 'Stop';
            stopSimilarStyleBtn.style.display = 'none';
        }
        if (similarStyleUploadBtn) similarStyleUploadBtn.disabled = false;
        setSimilarityProgress(0, 0);
        setSimilarStyleStatus('Upload an image to rank styles by visual similarity.', false);

        if (currentView === 'gallery') {
            styleCounter.innerHTML = `Artist-based styles: <span class="style-count-number">${allItems.length.toLocaleString('en-US')}</span>`;
        }
        updateControlsState();
        if (shouldRender && currentView === 'gallery') {
            renderView();
        }
    }

    function stopSimilarStyleSearch() {
        if (!similaritySearchInProgress) return;
        similarityStopRequested = true;
        if (similarityAbortController) {
            similarityAbortController.abort();
        }
        if (stopSimilarStyleBtn) {
            stopSimilarStyleBtn.disabled = true;
            stopSimilarStyleBtn.textContent = 'Stopping...';
        }
        setSimilarStyleStatus('Stopping search... ranking already analyzed styles.', true);
    }

    async function runSimilarStyleSearch(file) {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showToast('Please choose an image file.');
            return;
        }

        if (similaritySearchInProgress) {
            stopSimilarStyleSearch();
        }

        const token = ++similarityAbortToken;
        similarityAbortController = new AbortController();
        const signal = similarityAbortController.signal;
        similarityStopRequested = false;
        similarityModeActive = false;
        similaritySearchInProgress = true;
        similarityItems = [];
        similarityAllResults = [];
        similarityLastStats = null;
        startIndexOffset = 0;
        searchInput.value = '';
        searchTerm = '';
        jumpInput.value = '';
        clearSearchBtn.style.display = 'none';
        clearJumpBtn.style.display = 'none';
        if (clearSimilarStyleBtn) clearSimilarStyleBtn.style.display = 'inline-flex';
        if (stopSimilarStyleBtn) {
            stopSimilarStyleBtn.disabled = false;
            stopSimilarStyleBtn.textContent = 'Stop';
            stopSimilarStyleBtn.style.display = 'inline-flex';
        }
        if (similarStyleUploadBtn) similarStyleUploadBtn.disabled = true;
        setSimilarityProgress(0, allItems.length);
        setSimilarStyleStatus('Analyzing uploaded image...', true);
        updateControlsState();

        let objectUrl = null;
        const results = [];
        const stats = {
            total: allItems.length,
            processed: 0,
            failed: 0,
            cached: 0,
            extracted: 0,
            startedAt: performance.now(),
            stopped: false
        };

        try {
            objectUrl = URL.createObjectURL(file);
            const queryImage = await loadImageForSimilarity(objectUrl, false, signal);
            let queryFeature;
            try {
                queryFeature = extractImageFeature(queryImage);
            } finally {
                closeDrawableForSimilarity(queryImage);
            }

            let nextIndex = 0;
            let lastStatusUpdate = 0;
            const total = allItems.length;
            const workerCount = Math.min(getSimilarityConcurrency(), total);
            const updateProgress = (force = false) => {
                const now = performance.now();
                if (!force && now - lastStatusUpdate < 140) return;
                lastStatusUpdate = now;
                setSimilarityProgress(stats.processed, total);
                setSimilarStyleStatus(
                    `Analyzing styles... ${stats.processed.toLocaleString('en-US')} / ${total.toLocaleString('en-US')} · ${formatSimilarityRate(stats.processed, stats.startedAt)} · parallel ${workerCount}`,
                    true
                );
            };

            async function similarityWorker() {
                while (token === similarityAbortToken && !similarityStopRequested) {
                    const index = nextIndex++;
                    if (index >= total) break;
                    const item = allItems[index];
                    try {
                        const { feature, source } = await getStyleFeature(item, token, signal);
                        throwIfSimilarityStopped(token, signal);
                        const score = cosineSimilarity(queryFeature, feature);
                        results.push({ item, score });
                        if (source === 'memory' || source === 'indexeddb') {
                            stats.cached++;
                        } else {
                            stats.extracted++;
                        }
                    } catch (error) {
                        if (!similarityStopRequested && token === similarityAbortToken && error?.name !== 'AbortError') {
                            stats.failed++;
                        }
                    } finally {
                        stats.processed++;
                        updateProgress(false);
                        if (stats.processed % 96 === 0) {
                            await new Promise(resolve => setTimeout(resolve, 0));
                        }
                    }
                }
            }

            await Promise.all(Array.from({ length: workerCount }, () => similarityWorker()));
            await flushSimilarityFeatureSaves();

            if (token !== similarityAbortToken) return;
            stats.stopped = similarityStopRequested;

            if (results.length === 0) {
                throw new Error('No preview images could be analyzed. If you are running locally, try serving the folder with a local web server instead of opening index.html directly.');
            }

            updateProgress(true);
            commitSimilarityResults(results, stats, true);
        } catch (error) {
            if (token !== similarityAbortToken) return;
            if (similarityStopRequested && results.length > 0) {
                stats.stopped = true;
                commitSimilarityResults(results, stats, true);
                return;
            }
            console.error('Similar Style Search failed:', error);
            similarityModeActive = false;
            similaritySearchInProgress = false;
            similarityItems = [];
            similarityAllResults = [];
            similarityLastStats = null;
            similarityAbortController = null;
            if (similarStyleUploadBtn) similarStyleUploadBtn.disabled = false;
            if (stopSimilarStyleBtn) {
                stopSimilarStyleBtn.disabled = false;
                stopSimilarStyleBtn.textContent = 'Stop';
                stopSimilarStyleBtn.style.display = 'none';
            }
            setSimilarityProgress(0, 0);
            setSimilarStyleStatus(error.message || 'Similar Style Search failed.', false);
            showToast('Similar Style Search failed.');
            updateControlsState();
        } finally {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        }
    }

    function getRandomStyles() {
        const count = Math.max(1, Math.min(200, parseInt(randomStyleCountInput?.value, 10) || 1));
        if (randomStyleCountInput) randomStyleCountInput.value = count;

        const sourceItems = similarityModeActive && currentView === 'gallery' && similarityItems.length
            ? similarityItems
            : allItems;
        if (!sourceItems.length) {
            showToast('No styles available.');
            return;
        }

        const pool = [...sourceItems];
        shuffleArray(pool);
        const pickedStyles = pool.slice(0, Math.min(count, pool.length)).map(item => item.artist);
        if (randomStyleOutput) {
            randomStyleOutput.value = pickedStyles.join(', ');
            randomStyleOutput.focus();
            randomStyleOutput.select();
        }
        showToast(`${pickedStyles.length} random style${pickedStyles.length === 1 ? '' : 's'} generated.`);
    }

    /**
     * Debug: Проверяет доступность всех изображений и выводит статистику в консоль.
     * Работает только если DEBUG_MODE = true.
     */
    async function debug_checkImagePaths() {
        if (!DEBUG_MODE) return;

        console.log('%c[DEBUG] Запущена проверка путей к изображениям...', 'color: orange; font-weight: bold;');

        const totalItems = allItems.length;
        let foundCount = 0;
        const notFoundArtists = [];

        const checkImage = (item) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    foundCount++;
                    resolve();
                };
                img.onerror = () => {
                    notFoundArtists.push({ artist: item.artist, id: item.id, path: item.image });
                    resolve();
                };
                img.src = item.image;
            });
        };

        // Выполняем все проверки параллельно
        await Promise.all(allItems.map(item => checkImage(item)));

        const notFoundCount = notFoundArtists.length;
        console.log('%c[DEBUG] Проверка изображений завершена.', 'color: orange; font-weight: bold;');
        console.log(`- Всего проверено: ${totalItems}`);
        console.log(`- Найдено изображений: %c${foundCount}`, 'color: green;');
        console.log(`- Не найдено изображений: %c${notFoundCount}`, `color: ${notFoundCount > 0 ? 'red' : 'green'};`);

        if (notFoundCount > 0) {
            console.warn('[DEBUG] Список художников с отсутствующими изображениями:');
            console.table(notFoundArtists);
        }
    }
    function createCard(item) {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.artist = item.artist;
        // Карточки можно перетаскивать в любой папке в разделе "Избранное"
        card.draggable = currentView === 'favorites';
        card.dataset.id = item.id;

        const isFavorited = favorites.has(item.id);
        
        // Если активна сортировка по уникальности, показываем ранг
        const rankHTML = sortType === 'uniqueness' && item.uniquenessRank
            ? `<div class="uniqueness-rank" title="Uniqueness Rank">#${item.uniquenessRank}</div>`
            : '';
        const similarityHTML = typeof item.similarityScore === 'number'
            ? `<div class="similarity-score" title="Visual similarity rank and score">#${item.similarityRank} · ${item.similarityPercent || formatSimilarityPercent(item.similarityScore)}</div>`
            : '';

        let favButtonHTML;
        if (currentView === 'favorites') {
            // В "Избранном" всегда показываем кнопку удаления (крестик)
            favButtonHTML = `
                <button 
                    class="favorite-button remove-favorite" 
                    aria-label="Remove from favorites"
                    title="Remove from favorites"
                >
                    ×
                </button>
            `;
        } else {
            // В "Галерее" показываем звездочку
            favButtonHTML = `
                <button 
                    class="favorite-button ${isFavorited ? 'favorited' : ''}" 
                    aria-label="${isFavorited ? 'Remove from favorites' : 'Add to favorites'}"
                    title="${isFavorited ? 'Remove from favorites' : 'Add to favorites'}"
                >
                    
                </button>
            `;
        }

        card.innerHTML = `
            <img class="card__image" src="${item.image}" alt="${item.artist}" loading="lazy" width="832" height="1216">
            <div class="card__info">
                <p class="card__artist">${item.artist}</p>
            </div>
            <div class="works-count" title="Approximate number of training images for this artistic style">
                ${item.worksCount.toLocaleString('en-US')}
            </div>
            ${rankHTML}
            ${similarityHTML}
            ${favButtonHTML}
        `;

        // Копирование имени по клику на карточку (кроме кнопки "избранное")
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('favorite-button')) {
                return;
            }

            // Логика мульти-выделения в "Избранном"
            if (currentView === 'favorites' && e.ctrlKey) {
                e.preventDefault(); // Предотвращаем выделение текста
                if (selectedArtistIds.has(item.id)) {
                    selectedArtistIds.delete(item.id);
                    card.classList.remove('selected');
                } else {
                    selectedArtistIds.add(item.id);
                    card.classList.add('selected');
                }
            } else {
                // Стандартное поведение: копирование имени и сброс выделения
                navigator.clipboard.writeText(item.artist).then(() => {
                    showToast('Artist name copied to clipboard!');
                });
                // Сбрасываем выделение, если кликнули без Ctrl
                selectedArtistIds.clear();
                document.querySelectorAll('.card.selected').forEach(c => c.classList.remove('selected'));
            }
        });

        const favButton = card.querySelector('.favorite-button');
        favButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Предотвращаем копирование имени
            toggleFavorite(item, favButton);
        });

        return card;
    }

    // --- Функции управления данными и отображением ---

    async function loadInitialData() {
        try {
            // Данные теперь берутся из глобальной переменной galleryData из файла data.js
            if (typeof galleryData !== 'undefined' && allItems.length === 0) {
                // Преобразуем новый формат данных в старый, с которым работает приложение
                allItems = galleryData.map(item => ({
                    artist: item.name,
                    image: `${imageBasePath}images/${item.p}/${item.id}.webp`,
                    worksCount: item.post_count,
                    id: String(item.id), // [FIX] Преобразуем ID в строку при загрузке
                    uniqueness_score: item.uniqueness_score
                }));

                // Создаем заранее отсортированную копию для функции jump
                itemsSortedByWorks = [...allItems].sort((a, b) => b.worksCount - a.worksCount);
            }

            // Запускаем отладочную проверку изображений
            await debug_checkImagePaths();

            // Обновляем счетчик стилей
            styleCounter.innerHTML = `Artist-based styles: <span class="style-count-number">${allItems.length.toLocaleString('en-US')}</span>`;

            await loadFavoritesFromDB(); // Загружаем избранное из IndexedDB
            renderView();
            window.appFolders.init(); // Инициализируем логику папок
        } catch (error) {
            console.error('Failed to load gallery data:', error);
            galleryContainer.innerHTML = '<p style="text-align: center; grid-column: 1 / -1;">Failed to load data.</p>';
        }
    }

    function renderView() {
        currentPage = 0;
        galleryContainer.innerHTML = '';
        selectedArtistIds.clear(); // Очищаем выделение при перерисовке
        // Управляем видимостью панели папок в зависимости от состояния
        if (currentView === 'favorites') {
            if (isFoldersPanelVisible && window.innerWidth > 992) {
                window.appFolders.showPanel();
                galleryContainer.parentElement.style.flex = '1';

                const { activeFolderId, getFolderName } = window.appFolders;
                
                if (galleryTitle && activeFolderId && getFolderName) {
                    const folderName = getFolderName(activeFolderId);
                    galleryTitle.innerHTML = `<span class="gallery-title-label">Folder:</span> ${folderName}`;
                    galleryTitle.style.display = 'block';
                }
            } else {
                window.appFolders.hidePanel();
                galleryContainer.parentElement.style.flex = '';
                if (galleryTitle) {
                    galleryTitle.style.display = 'none';
                }
            }
        } else {
            window.appFolders.hidePanel();
            galleryContainer.parentElement.style.flex = ''; // Сбрасываем flex
            if (galleryTitle) {
                galleryTitle.style.display = 'none'; // Скрываем заголовок в галерее
            }
        }
        // Обновляем UI контролов перед отрисовкой
        updateSortButtonsUI();


        // Добавляем или убираем класс для скрытия счетчика работ
        if (sortType === 'uniqueness') {
            galleryContainer.classList.add('uniqueness-view');
            jumpInput.placeholder = 'Jump to rank...';
        } else {
            galleryContainer.classList.remove('uniqueness-view');
            jumpInput.placeholder = 'Jump to work count...';
        }
        // Добавляем класс для вида "Избранное"
        galleryContainer.classList.toggle('favorites-view', currentView === 'favorites');
        galleryContainer.classList.toggle('similarity-view', currentView === 'gallery' && similarityModeActive);

        // --- Логика "Продолжить просмотр" ---
        const jumpToArtistId = localStorage.getItem('jumpToArtistId');
        if (jumpToArtistId && currentView === 'gallery') {
            // Новая логика: если текущая сортировка "случайная", принудительно меняем её на "по работам"
            if (sortType === 'random') {
                sortType = 'works';
                sortDirection = 'desc';
                // Сохраняем новый выбор в localStorage
                localStorage.setItem(SORT_TYPE_KEY, sortType);
                localStorage.setItem(SORT_DIRECTION_KEY, sortDirection);
                updateSortButtonsUI(); // Обновляем UI кнопок сортировки после изменения
            }
                let tempSortedItems = [...allItems];
                const tempDirection = sortDirection === 'asc' ? 1 : -1;
                if (sortType === 'name') {
                    tempSortedItems.sort((a, b) => a.artist.localeCompare(b.artist) * tempDirection);
                } else if (sortType === 'works') {
                    tempSortedItems.sort((a, b) => (a.worksCount - b.worksCount) * tempDirection);
                } else if (sortType === 'uniqueness') {
                    tempSortedItems.sort((a, b) => (b.uniqueness_score || 0) - (a.uniqueness_score || 0));
                }

                const targetIndex = tempSortedItems.findIndex(item => item.id === jumpToArtistId);

                if (targetIndex !== -1) {
                    // Устанавливаем смещение, чтобы начать рендер с нужного места
                    startIndexOffset = targetIndex;
                    isJumpingToArtist = true; // Устанавливаем флаг
                } else {
                    // Если по какой-то причине не нашли, сбрасываем флаг
                    isJumpingToArtist = false;
                }
        }
        // --- Конец логики ---

        window.scrollTo({ top: 0, behavior: 'instant' }); // Мгновенная прокрутка вверх при ререндере
        
        if (similarityModeActive && currentView === 'gallery') {
            currentItems = similarityItems.slice(startIndexOffset);
            if (currentItems.length === 0) {
                const p = document.createElement('p');
                p.style.textAlign = 'center';
                p.style.gridColumn = '1 / -1';
                p.innerText = `No similar style results are available at the current ${getSimilarityThreshold()}% threshold.`;
                galleryContainer.appendChild(p);
                return;
            }
            loadMoreItems();
            return;
        }

        // 1. Сортируем данные
        let sortedItems = [...allItems];
        const direction = sortDirection === 'asc' ? 1 : -1;

        if (sortType === 'name') {
            sortedItems.sort((a, b) => a.artist.localeCompare(b.artist) * direction);
        } else if (sortType === 'works') {
            // Для 'works', 'desc' - это b-a, 'asc' - это a-b.
            // direction = -1 для 'desc', поэтому (a-b) * -1 = b-a.
            sortedItems.sort((a, b) => (a.worksCount - b.worksCount) * direction);
        } else if (sortType === 'uniqueness') {
            // Для 'uniqueness' направление всегда 'desc'
            sortedItems.sort((a, b) => (b.uniqueness_score || 0) - (a.uniqueness_score || 0));
        } else if (sortType === 'random') {
            // Случайная сортировка с использованием алгоритма Фишера-Йетса
            shuffleArray(sortedItems);
        }
        
        // Добавляем ранг после основной сортировки, но до других фильтров
        sortedItems.forEach((item, index) => {
            if (sortType === 'uniqueness') {
                item.uniquenessRank = index + 1;
            } else {
                // Удаляем ранг, если он не нужен, чтобы он не отображался в других видах
                delete item.uniquenessRank;
            }
        });

        // 2. Фильтруем по избранному, если нужно (до поиска, чтобы поиск работал по избранным)
        if (currentView === 'favorites') {
            sortedItems = sortedItems.filter(item => favorites.has(item.id));

            // --- Фильтрация по папкам работает только на десктопе ---
            if (window.innerWidth > 992) {
                const { activeFolderId, getArtistIdsInFolder, getUnsortedArtistIds } = window.appFolders;

                if (activeFolderId && getArtistIdsInFolder && getUnsortedArtistIds) {
                    let artistIdsForFolder;

                    if (activeFolderId === 'unsorted') {
                        artistIdsForFolder = getUnsortedArtistIds(); // Возвращает Set
                    } else {
                        artistIdsForFolder = getArtistIdsInFolder(activeFolderId); // Возвращает Array
                    }

                    if (artistIdsForFolder) {
                        const artistIdsToShow = new Set(artistIdsForFolder); // Гарантированно создаем Set
                        sortedItems = sortedItems.filter(item => artistIdsToShow.has(item.id));
                    }
                }
            }

            // После фильтрации по папке, нам нужно отсортировать `sortedItems`
            // в том же порядке, в котором `getArtistIdsInFolder` вернул ID.
            const { activeFolderId, getArtistIdsInFolder } = window.appFolders;
            if (window.innerWidth > 992 && activeFolderId && activeFolderId !== 'unsorted') {
                const orderedArtistIds = getArtistIdsInFolder(activeFolderId); // Этот массив уже отсортирован по дате добавления в папку
                const orderMap = new Map(orderedArtistIds.map((id, index) => [id, index]));
                sortedItems.sort((a, b) => {
                    return (orderMap.get(a.id) ?? Infinity) - (orderMap.get(b.id) ?? Infinity);
                });
            } else {
                // Для мобильной версии или папки "Unsorted" оставляем старую логику сортировки
                // по общей дате добавления в избранное.
                sortedItems.sort((a, b) => {
                    const timestampA = favorites.get(a.id) || 0;
                    const timestampB = favorites.get(b.id) || 0;
                    return timestampB - timestampA;
                });
            }
        }

        // 3. Фильтруем по строке поиска
        let filteredItems;
        if (searchTerm) {
            filteredItems = sortedItems.filter(item => 
                item.artist.toLowerCase().includes(searchTerm)
            );
        } else {
            filteredItems = sortedItems;
        }

        // 4. Применяем смещение для "перехода к номеру" (только для галереи)
        // Итоговый массив для отображения
        currentItems = filteredItems.slice(startIndexOffset);

        // Проверяем, есть ли результаты ПОСЛЕ всех фильтраций
        if (filteredItems.length === 0) {
            const p = document.createElement('p');
            p.style.textAlign = 'center';
            p.style.gridColumn = '1 / -1';

            if (currentView === 'favorites') {
                if (favorites.size > 0 && searchTerm) {
                    p.innerText = `No artists found for "${searchTerm}" in your favorites.`;
                } else {
                    // Проверяем, выбрана ли папка
                    const { activeFolderId } = window.appFolders;
                    if (activeFolderId && activeFolderId !== 'unsorted') {
                        p.innerText = 'This folder is empty. Drag and drop artists here!';
                    } else {
                        p.innerText = 'You have no favorites yet.';
                    }
                }
            } else if (searchTerm) { // Только для вида "Gallery" с активным поиском
                p.innerText = `No artists found for "${searchTerm}".`;
            } else {
                // Для пустой галереи без поиска (маловероятно, но на всякий случай)
                p.innerText = 'No artists found.';
            }
            galleryContainer.appendChild(p);
            return;
        }
        
        loadMoreItems();
    }

    function loadMoreItems() {
        if (isLoading) return;
        isLoading = true;
        loader.style.display = 'block';

        // Имитация задержки сети для демонстрации загрузчика
        setTimeout(() => {
            const start = currentPage * itemsPerPage;
            const end = start + itemsPerPage;
            const itemsToLoad = currentItems.slice(start, end);

            itemsToLoad.forEach(item => {
                const card = createCard(item);
                galleryContainer.appendChild(card);
            });

            currentPage++;
            isLoading = false;
            loader.style.display = 'none';

            // Если больше нечего загружать, скрываем лоадер навсегда для этой сессии
            if (currentPage * itemsPerPage >= currentItems.length) {
                loader.style.display = 'none';
            } else {
                // Проверяем, нужно ли загрузить еще, если контент не заполняет экран
                checkAndLoadMoreIfContentDoesNotFillScreen();
            }

            // --- Логика "Продолжить просмотр" ---
            // Очищаем флаг после того, как смещение было использовано в renderView
            const jumpToArtistId = localStorage.getItem('jumpToArtistId');
            if (jumpToArtistId) {
                localStorage.removeItem('jumpToArtistId');
                // Флаг isJumpingToArtist будет сброшен при следующем renderView
            }

        }, 500);
    }

    // --- Функции-помощники ---

    function checkAndLoadMoreIfContentDoesNotFillScreen() {
        const hasScrollbar = document.body.scrollHeight > window.innerHeight;
        const hasMoreItems = currentPage * itemsPerPage < currentItems.length;
        if (!isLoading && !hasScrollbar && hasMoreItems) {
            loadMoreItems();
        }
    }

    function toggleFavorite(item, button) {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        if (favorites.has(item.id)) {
            // Удалить из избранного
            store.delete(item.id);
            favorites.delete(item.id);
            showToast('Removed from favorites');
            if (currentView === 'gallery') {
                // button.textContent = '♡'; // Теперь управляется через CSS
                button.title = 'Add to favorites';
                button.setAttribute('aria-label', 'Add to favorites');
                button.classList.remove('favorited');
            }
            // Сообщаем модулю папок, что избранное было удалено,
            // чтобы он мог обновить свои данные (счетчики, миниатюры).
            if (window.appFolders && window.appFolders.handleFavoriteRemoval) {
                window.appFolders.handleFavoriteRemoval(item.id);
            }
        } else {
            // Добавить в избранное
            const favItem = { id: item.id, timestamp: Date.now() };
            store.put(favItem);
            favorites.set(item.id, favItem.timestamp);
            showToast('Added to favorites');
            // В галерее меняем иконку на звезду
            // button.textContent = '♥'; // Теперь управляется через CSS
            button.title = 'Remove from favorites';
            button.setAttribute('aria-label', 'Remove from favorites');
            button.classList.add('favorited');
        }

        // Если мы в избранном, нужно сразу обновить вид
        if (currentView === 'favorites') {
            // Вместо полного перерендера, просто удаляем карточку из DOM
            const card = button.closest('.card');
            if (card) {
                // Анимация исчезновения и схлопывания
                card.style.transition = 'opacity 0.15s ease, transform 0.15s ease, margin 0.15s ease, padding 0.15s ease, max-height 0.15s ease';
                card.style.transform = 'scale(0.8)';
                card.style.opacity = '0';
                card.style.margin = '0';
                card.style.padding = '0';
                card.style.maxHeight = '0px';

                card.addEventListener('transitionend', () => {
                    card.remove();
                    // Если больше нет избранных, показываем сообщение
                    if (favorites.size === 0) {
                        galleryContainer.innerHTML = '<p style="text-align: center; grid-column: 1 / -1;">No favorites yet.</p>';
                    }
                    // Обновляем счетчик в реальном времени
                    styleCounter.innerHTML = `Styles in Favorites: <span class="style-count-number">${favorites.size.toLocaleString('en-US')}</span>`;
                }, { once: true }); // Событие сработает только один раз
            }
        }
        // Обновляем состояние сердечек на видимых карточках в галерее
        updateVisibleFavorites();
    }

    /**
     * Обновляет визуальное состояние кнопок "избранное" для всех видимых карточек в галерее.
     * Вызывается после изменений в избранном, сделанных в других модулях (например, Swipe Mode).
     */
    function updateVisibleFavorites() {
        if (currentView !== 'gallery') return;

        const cards = galleryContainer.querySelectorAll('.card');
        cards.forEach(card => {
            const cardId = card.dataset.id;
            const favButton = card.querySelector('.favorite-button'); // ID уже строка из dataset
            if (cardId && favButton && !favButton.classList.contains('remove-favorite')) {
                const isFavorited = favorites.has(cardId);
                favButton.classList.toggle('favorited', isFavorited);
                const newTitle = isFavorited ? 'Remove from favorites' : 'Add to favorites';
                favButton.title = newTitle;
                favButton.setAttribute('aria-label', newTitle);
            }
        });
    }

    function showToast(message) {
        const toast = document.getElementById('toast-notification');
        if (message) toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }

    function setActiveTab(activeTab) {
        const tabs = [tabGallery, tabFavorites];
        tabs.forEach(tab => tab.classList.remove('active'));
        activeTab.classList.add('active');
    }

    /**
     * Централизованная функция для управления состоянием (включено/выключено) всех контролов.
     */
    function updateControlsState() {
        const isSearchingByName = searchInput.value.trim().length > 0;
        const isJumpingByCount = jumpInput.value.trim().length > 0;
        const isSimilarityLocked = currentView === 'gallery' && (similarityModeActive || similaritySearchInProgress);

        // Блокируем сортировку, если активен любой из поисков
        sortControls.classList.toggle('disabled', isSearchingByName || isJumpingByCount || isSimilarityLocked);
        // Блокируем "Jump", если идет поиск по имени
        jumpControls.classList.toggle('disabled', isSearchingByName || isSimilarityLocked);
        // Блокируем поиск по имени, если идет поиск по "Jump"
        searchInput.parentElement.classList.toggle('disabled', isJumpingByCount || isSimilarityLocked);
        // Блокируем Swipe Mode, если идет поиск по имени или "Jump"
        swipeLaunchControls.classList.toggle('disabled', isSearchingByName || isJumpingByCount || isSimilarityLocked);
        if (getRandomStyleBtn) getRandomStyleBtn.disabled = similaritySearchInProgress;
        if (copyRandomStyleBtn) copyRandomStyleBtn.disabled = similaritySearchInProgress;
        if (similarStyleThresholdInput) similarStyleThresholdInput.disabled = false;
        if (similarStyleConcurrencyInput) similarStyleConcurrencyInput.disabled = similaritySearchInProgress;
    }

    function updateJumpToArtistHint() {
        if (isJumpingToArtist && currentView === 'gallery') {
            jumpToArtistHint.style.display = 'block';
        } else {
            jumpToArtistHint.style.display = 'none';
        }
        updateControlsState(); // Обновляем состояние контролов, т.к. подсказка может влиять на них
    }

    // --- Обработчики событий ---

    // Появление/скрытие кнопки "Наверх"
    window.addEventListener('scroll', () => {
        // Появление/скрытие кнопки "Наверх"
        if (window.scrollY > 300) {
            scrollToTopBtn.classList.add('visible');
        } else {
            scrollToTopBtn.classList.remove('visible');
        }

        // Проверяем, достигли ли мы конца страницы
        if (!isLoading && (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 200) {
            if (currentPage * itemsPerPage < currentItems.length) {
                loadMoreItems();
            }
        }
    });

    // Клик по кнопке "Наверх"
    scrollToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Плавная прокрутка наверх
    });

    tabGallery.addEventListener('click', (e) => {
        e.preventDefault(); // Предотвращаем переход по ссылке
        if (currentView === 'gallery') return;
        setActiveTab(tabGallery);
        favoritesControlsWrapper.style.display = 'none'; // Скрываем кнопки импорта/экспорта
        txtExportContainer.style.display = 'none';
        swipeContinueHint.style.display = 'none'; // Скрываем подсказку
        jumpControls.style.display = 'flex';
        searchInput.parentElement.style.borderBottom = '1px solid var(--border-color)'; // Восстанавливаем разделитель
        swipeLaunchControls.style.display = 'flex';
        sortControls.style.display = 'flex';
        if (styleToolsWrapper) styleToolsWrapper.style.display = 'grid';
        currentView = 'gallery';
        // Сбрасываем флаг принудительно, если пользователь сам переключился на галерею
        isJumpingToArtist = false;
        // Обновляем счетчик для отображения общего количества стилей
        styleCounter.innerHTML = `Artist-based styles: <span class="style-count-number">${allItems.length.toLocaleString('en-US')}</span>`;

        renderView();

        // Очищаем поиск при переключении на галерею
        if (searchInput.value) {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });

    tabFavorites.addEventListener('click', (e) => {
        e.preventDefault(); // Предотвращаем переход по ссылке
        if (currentView === 'favorites') return;
        setActiveTab(tabFavorites);
        favoritesControlsWrapper.style.display = 'flex'; // Показываем кнопки импорта/экспорта
        txtExportContainer.style.display = 'flex'; // Показываем экспорт в TXT
        // Подсказку о переходе в галерею показываем только на десктопе
        if (window.innerWidth > 992) {
            swipeContinueHint.style.display = 'block';
        }
        jumpControls.style.display = 'none';
        searchInput.parentElement.style.borderBottom = 'none'; // Убираем разделитель, т.к. поле Jump скрыто
        swipeLaunchControls.style.display = 'none';
        sortControls.style.display = 'none'; // Скрываем сортировку для избранного
        if (styleToolsWrapper) styleToolsWrapper.style.display = 'none';
        clearSimilaritySearch(false);
        currentView = 'favorites';

        // Обновляем счетчик для отображения количества избранных
        styleCounter.innerHTML = `Styles in Favorites: <span class="style-count-number">${favorites.size.toLocaleString('en-US')}</span>`;

        // Сбрасываем состояние "перехода", так как он не применяется к избранному
        startIndexOffset = 0;
        jumpInput.value = '';
        isJumpingToArtist = false; // Сбрасываем флаг при переходе в избранное
        
        // Также сбрасываем состояние перехода и разблокируем другие контролы
        resetJumpState(false); // false - чтобы не вызывать renderView() повторно

        // Сбрасываем активную папку только на десктопе
        if (window.innerWidth > 992) {
            if (window.appFolders && window.appFolders.setActiveFolder) {
                window.appFolders.setActiveFolder('unsorted', false); // false - не вызывать renderView
            }
        }

        // Очищаем поиск при переключении на избранное
        if (searchInput.value) {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }

        renderView();
    });

    function updateToggleFoldersButton() {
        toggleFoldersBtn.textContent = isFoldersPanelVisible ? 'Close Folders' : 'Open Folders';
    }

    toggleFoldersBtn.addEventListener('click', () => {
        isFoldersPanelVisible = !isFoldersPanelVisible;
        localStorage.setItem(FOLDERS_PANEL_VISIBLE_KEY, isFoldersPanelVisible);

        if (isFoldersPanelVisible) {
            window.appFolders.showPanel();
            toggleFoldersBtn.textContent = 'Close Folders';
            galleryContainer.parentElement.style.flex = '1';
            if (galleryTitle) {
                galleryTitle.style.display = 'block';
            }
        } else {
            window.appFolders.hidePanel();
            toggleFoldersBtn.textContent = 'Open Folders';
            galleryContainer.parentElement.style.flex = '';
            if (galleryTitle) {
                galleryTitle.style.display = 'none';
            }
        }
    });

    // --- Сохранение избранных в файл ---
    const saveFavoritesBtn = document.getElementById('save-favorites-btn');
    const importFavoritesBtn = document.getElementById('import-favorites-btn');
    const exportTxtBtn = document.getElementById('export-txt-btn');

    importFavoritesBtn.addEventListener('click', () => {
        importFavoritesInput.click();
    });

    importFavoritesInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                // 1. Проверяем и импортируем основной список избранного (обратная совместимость)
                if (!data.favorites || !Array.isArray(data.favorites)) {
                    throw new Error('Invalid file format');
                }

                let importedCount = 0;
                const favTransaction = db.transaction(STORE_NAME, 'readwrite');
                const favStore = favTransaction.objectStore(STORE_NAME);

                data.favorites.forEach(fav => {
                    // Проверяем, что ID существует и его еще нет в избранном
                    if (fav.id && fav.timestamp && !favorites.has(String(fav.id))) {
                        favStore.put({ id: String(fav.id), timestamp: fav.timestamp });
                        importedCount++;
                    }
                });

                await new Promise(resolve => favTransaction.oncomplete = resolve);
                await loadFavoritesFromDB(); // Перезагружаем избранное из БД

                // 2. Проверяем и импортируем данные о папках (для новых версий)
                if (data.folderData && Array.isArray(data.folderData.folders) && typeof data.folderData.folderArtists === 'object') {
                    const { folders, folderArtists } = data.folderData;
                    const folderTx = db.transaction(['folders', 'folder_artists'], 'readwrite');
                    const foldersStore = folderTx.objectStore('folders');
                    const folderArtistsStore = folderTx.objectStore('folder_artists');

                    // Очищаем старые данные о папках перед импортом
                    foldersStore.clear();
                    folderArtistsStore.clear();

                    // Импортируем новые папки
                    folders.forEach(folder => {
                        // Проверяем, что все необходимые поля присутствуют
                        if (folder.id && folder.name) {
                            foldersStore.put(folder);
                        }
                    });

                    // Импортируем связи артистов и папок
                    for (const [folderId, artistIds] of Object.entries(folderArtists)) {
                        if (folderId && Array.isArray(artistIds)) {
                            // [FIX] Данные уже в правильном формате {id, added}, просто сохраняем их
                            folderArtistsStore.put({ folderId, artistIds: artistIds });
                        }
                    }

                    await new Promise(resolve => folderTx.oncomplete = resolve);
                    // Перезагружаем данные папок в модуле folders.js
                    if (window.appFolders && window.appFolders.loadData) {
                        await window.appFolders.loadData();
                    }
                }

                // 3. Обновляем UI после всех операций
                showToast(importedCount > 0 
                    ? `${importedCount} new favorites imported!`
                    : 'No new favorites to import.');
                renderView(); // Обновляем основной вид
                // Обновляем счетчик избранных, если мы находимся на этой вкладке
                if (currentView === 'favorites') {
                    styleCounter.innerHTML = `Styles in Favorites: <span class="style-count-number">${favorites.size.toLocaleString('en-US')}</span>`;
                }

            } catch (error) {
                console.error('Error importing favorites:', error);
                showToast('Error: Could not import favorites. Invalid file.');
            } finally {
                // Сбрасываем значение input, чтобы можно было загрузить тот же файл снова
                importFavoritesInput.value = '';
            }
        };
        reader.readAsText(file);
    });

    saveFavoritesBtn.addEventListener('click', () => {
        if (favorites.size === 0) {
            showToast('You have no favorites to save.');
            return;
        }

        // Преобразуем Map в массив объектов, содержащих только id и timestamp
        const favoritesToSave = Array.from(favorites.entries())
          .map(([id, timestamp]) => ({ id, timestamp }))
          .sort((a, b) => b.timestamp - a.timestamp); // Сортируем по дате добавления

        const exportData = {
            metadata: {
                appName: "Illustrious NoobAI Style Explorer",
                exportDate: new Date().toISOString(),
                favoritesCount: favoritesToSave.length
            },
            favorites: favoritesToSave,
            // Добавляем новый блок для данных о папках
            folderData: null
        };

        // Получаем данные о папках из модуля folders.js
        if (window.appFolders) {
            const folders = window.appFolders.folders; // Массив папок
            const folderArtists = window.appFolders.folderArtists; // Map<folderId, artistId[]>

            if (folders && folderArtists) {
                // Преобразуем Map в простой объект для JSON-сериализации
                const folderArtistsObj = Object.fromEntries(folderArtists.entries());
                exportData.folderData = {
                    folders: folders,
                    folderArtists: folderArtistsObj
                };
            }
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        a.download = `style-explorer-favorites-${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('Favorites exported to JSON file!');
    });

    exportTxtBtn.addEventListener('click', () => {
        if (favorites.size === 0) {
            showToast('You have no favorites to save.');
            return;
        }

        let artistIdsToExport = [];
        let folderName = 'all';

        // На десктопе экспортируем только из активной папки
        if (window.innerWidth > 992 && window.appFolders) {
            const { activeFolderId, getArtistIdsInFolder, getUnsortedArtistIds, getFolderName } = window.appFolders;
            if (activeFolderId === 'unsorted') {
                artistIdsToExport = Array.from(getUnsortedArtistIds());
                // Сортируем по дате добавления в избранное (новые сверху)
                artistIdsToExport.sort((a, b) => (favorites.get(b) || 0) - (favorites.get(a) || 0));
            } else {
                // getArtistIdsInFolder уже возвращает отсортированный по дате массив ID
                artistIdsToExport = getArtistIdsInFolder(activeFolderId);
            }
            folderName = getFolderName(activeFolderId).replace(/\s+/g, '-').toLowerCase(); // Для имени файла
        } else {
            // На мобильных устройствах экспортируем всё избранное
            artistIdsToExport = Array.from(favorites.keys())
                .sort((a, b) => (favorites.get(b) || 0) - (favorites.get(a) || 0));
        }

        // 2. Находим имена художников по их ID
        const artistNames = artistIdsToExport.map(id => {
            const artistData = allItems.find(item => item.id === id);
            return artistData ? artistData.artist : null;
        }).filter(Boolean); // Убираем null, если художник не был найден

        // 3. Создаем текстовый файл
        const textContent = artistNames.join('\n');
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' }); // Используем BOM для корректного отображения в Блокноте
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        a.download = `style-explorer-favorites-${folderName}-${date}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // --- Random style and visual similarity tools ---
    if (getRandomStyleBtn) {
        getRandomStyleBtn.addEventListener('click', getRandomStyles);
    }

    if (randomStyleCountInput) {
        randomStyleCountInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                getRandomStyles();
            }
        });
    }

    if (copyRandomStyleBtn) {
        copyRandomStyleBtn.addEventListener('click', () => {
            const text = randomStyleOutput?.value.trim();
            if (!text) {
                showToast('No random styles to copy.');
                return;
            }
            navigator.clipboard.writeText(text).then(() => {
                showToast('Random styles copied to clipboard!');
            }).catch(() => {
                showToast('Could not copy random styles.');
            });
        });
    }

    if (similarStyleUploadBtn && similarStyleInput) {
        similarStyleUploadBtn.addEventListener('click', () => {
            if (similaritySearchInProgress) return;
            similarStyleInput.click();
        });

        similarStyleInput.addEventListener('change', (event) => {
            const files = Array.from(event.target.files || []);
            if (files.length) {
                runSimilarStyleSearch(files);
            }
        });
    }

    if (stopSimilarStyleBtn) {
        stopSimilarStyleBtn.addEventListener('click', stopSimilarStyleSearch);
    }

    if (clearSimilarStyleBtn) {
        clearSimilarStyleBtn.addEventListener('click', () => clearSimilaritySearch(true));
    }

    if (similarStyleThresholdInput) {
        similarStyleThresholdInput.addEventListener('input', () => {
            getSimilarityThreshold();
            if (similarityModeActive && !similaritySearchInProgress) {
                applySimilarityThresholdAndRender(true);
            }
        });
    }

    if (similarStyleConcurrencyInput) {
        similarStyleConcurrencyInput.addEventListener('change', getSimilarityConcurrency);
    }

    // Обработка ввода в строке поиска
    searchInput.addEventListener('input', (e) => {
        const newSearchTerm = e.target.value.toLowerCase().trim();
        const isSearching = newSearchTerm.length > 0;
        clearSearchBtn.style.display = isSearching ? 'flex' : 'none';

        // Если пользователь очистил поиск, сбрасываем смещение от "перехода"
        if (searchTerm.length > 0 && !isSearching) {
            startIndexOffset = 0;
            isJumpingToArtist = false;
        }

        searchTerm = newSearchTerm;
        updateControlsState(); // Обновляем состояние контролов
        renderView();
    });
    
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        // Инициируем событие 'input', чтобы сработала вся логика очистки
        const event = new Event('input', { bubbles: true });
        searchInput.dispatchEvent(event);
    });

    // Скрываем клавиатуру на мобильных при нажатии Enter
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && window.innerWidth <= 992) {
            e.preventDefault(); // Предотвращаем стандартное поведение (например, отправку формы)
            e.target.blur();
        }
    });

    // --- Логика перехода к номеру ---
    function handleJump(isReset = false) {
        const targetValue = parseInt(jumpInput.value, 10);
        if (isReset || !jumpInput.value) {
            resetJumpState();
            isJumpingToArtist = false;
            return;
        }

        // Если активна сортировка по уникальности, переходим к рангу
        if (sortType === 'uniqueness') {
            const targetRank = targetValue;
            if (isNaN(targetRank) || targetRank < 1) {
                resetJumpState();
                return;
            }
            if (targetRank > allItems.length) {
                galleryContainer.innerHTML = `<p style="text-align: center; grid-column: 1 / -1;">Rank not found. The highest rank is ${allItems.length.toLocaleString('en-US')}.</p>`;
                // Не сбрасываем состояние, чтобы пользователь видел, что ввел
                return;
            }
            // Ранг начинается с 1, а индекс с 0
            startIndexOffset = Math.max(0, targetRank - 1);
            isJumpingToArtist = false; // "Прыжок к художнику" и "прыжок к рангу" - разные вещи
            // Сортировка уже правильная, просто перерисовываем
            renderView();
        } else {
            // Старая логика для перехода по количеству работ
            const targetWorksCount = targetValue;

            // Сохраняем текущую сортировку, если это первый ввод в поле Jump
            if (previousSortType === null) {
                previousSortType = sortType;
                previousSortDirection = sortDirection;
            }

            const foundIndex = itemsSortedByWorks.findIndex(item => item.worksCount <= targetWorksCount);

            if (foundIndex === -1) {
                showToast('No artists found with that many works or less.');
                return;
            }

            // Блокируем другие контролы, ТОЛЬКО ЕСЛИ переход успешен
            searchInput.value = ''; // Очищаем поле поиска
            searchTerm = ''; // Сбрасываем поисковый запрос
            updateControlsState(); // Обновляем состояние контролов

            // Устанавливаем смещение точно на найденный индекс, без запаса
            startIndexOffset = foundIndex;
            isJumpingToArtist = false; // "Прыжок к художнику" и "прыжок по работам" - разные вещи
            // Принудительно устанавливаем сортировку по работам (по убыванию)
            sortType = 'works';
            sortDirection = 'desc';
            renderView();
        }

        // Скрываем клавиатуру на мобильных после успешного перехода
        if (window.innerWidth <= 992) {
            jumpInput.blur();
        }
    }

    function resetJumpState(shouldRender = true) {
        startIndexOffset = 0;
        isJumpingToArtist = false; // Сбрасываем и этот флаг тоже

        // Если мы были в режиме перехода по рангу, не меняем сортировку
        if (sortType === 'uniqueness') {
            previousSortType = null;
        }

        // Восстанавливаем предыдущую сортировку, если она была сохранена
        if (previousSortType !== null) {
            sortType = previousSortType;
            sortDirection = previousSortDirection;
            previousSortType = null; // Сбрасываем сохраненное состояние
            previousSortDirection = null;
        }

        updateSortButtonsUI(); // Обновляем UI кнопок сортировки
        updateControlsState(); // Обновляем состояние контролов
        updateJumpToArtistHint(); // Обновляем подсказку


        jumpInput.value = ''; // Очищаем поле только после всех операций
        if (shouldRender) {
            renderView();
        }
        
        // Убедимся, что кнопка сброса скрыта, если поле ввода уже пустое
        if (!jumpInput.value) {
            clearJumpBtn.style.display = 'none';
        }
    }

    jumpInput.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault(); // Блокируем стандартное поведение инкремента/декремента
            return;
        }
        if (e.key === 'Enter') {
            clearTimeout(jumpTimeout); // Отменяем предыдущий таймер, если есть
            handleJump();
        }
    });

    jumpInput.addEventListener('input', () => {
        // Показываем/скрываем крестик в зависимости от наличия текста
        if (jumpInput.value) {
            clearJumpBtn.style.display = 'flex';
        } else {
            // Если поле очищено вручную (например, Backspace), сбрасываем состояние
            resetJumpState();
        }

        updateControlsState(); // Обновляем состояние контролов при каждом вводе

        clearTimeout(jumpTimeout); // Сбрасываем таймер при каждом вводе
        if (jumpInput.value.trim()) { // Запускаем таймер только если в поле что-то есть
            jumpTimeout = setTimeout(() => handleJump(), 800); // Задержка 800мс
        }
    });

    clearJumpBtn.addEventListener('click', () => resetJumpState());

    // --- Управление сортировкой ---
    function updateSortButtonsUI() {
        // Сброс состояния для всех кнопок сортировки
        [sortByNameBtn, sortByWorksBtn, sortByUniquenessBtn, sortByRandomBtn].forEach(btn => {
            btn.classList.remove('active');
            const arrow = btn.querySelector('.sort-arrow');
            if (arrow) arrow.textContent = ''; // Убедимся, что стрелка существует
        });
        // Обновляем состояние блокировки контролов
        updateControlsState();
        updateJumpToArtistHint(); // Обновляем состояние подсказки
        
        // Обновляем активную кнопку и стрелку
        let activeBtn;
        if (sortType === 'name') {
            activeBtn = sortByNameBtn;
        } else if (sortType === 'works') {
            activeBtn = sortByWorksBtn;
        } else if (sortType === 'uniqueness') {
            activeBtn = sortByUniquenessBtn;
        } else if (sortType === 'random') {
            activeBtn = sortByRandomBtn;
        }

        if (activeBtn) {
            activeBtn.classList.add('active');
            const arrow = activeBtn.querySelector('.sort-arrow');
            // Показываем стрелку только для сортировок, у которых есть направление (asc/desc)
            if (arrow && (sortType === 'name' || sortType === 'works')) {
                arrow.textContent = sortDirection === 'asc' ? '▲' : '▼';
            }
        }
    }

    function handleSortClick(clickedType) {
        if (similarityModeActive || similaritySearchInProgress) {
            clearSimilaritySearch(false);
        }
        // Если был активен "прыжок к художнику", сбрасываем его
        if (isJumpingToArtist) {
            startIndexOffset = 0;
            isJumpingToArtist = false;
        }

        // Если активируем "Uniqueness" или "Random", сбрасываем все остальные фильтры
        if ((clickedType === 'uniqueness' || clickedType === 'random') && sortType !== clickedType) {
            resetJumpState(false); // Сбрасываем "Jump"
            
            // Прямой сброс поиска вместо имитации клика для надежности
            if (searchInput.value.trim() !== '') {
                searchInput.value = '';
                searchTerm = '';
                clearSearchBtn.style.display = 'none';
            }
        }

        if (sortType === clickedType) {
            // Если кликнули по активной кнопке, меняем направление,
            // но для 'uniqueness' и 'random' направление всегда 'desc' и не меняется.
            if (clickedType !== 'uniqueness' && clickedType !== 'random') {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            }
        } else {
            // Если кликнули по новой кнопке, активируем ее и устанавливаем направление по умолчанию
            sortType = clickedType;
            // Устанавливаем направление по умолчанию
            // Для 'name' - asc, для 'works' и 'uniqueness' - desc.
            sortDirection = sortType === 'name' ? 'asc' : 'desc';
        }
        updateSortButtonsUI();

        // Отложенное сохранение в localStorage
        clearTimeout(sortUpdateTimeout);
        sortUpdateTimeout = setTimeout(() => {
            localStorage.setItem(SORT_TYPE_KEY, sortType);
            localStorage.setItem(SORT_DIRECTION_KEY, sortDirection);
        }, 1000); // Задержка в 1 секунду
        renderView();
    }

    sortByNameBtn.addEventListener('click', () => handleSortClick('name'));
    sortByWorksBtn.addEventListener('click', () => handleSortClick('works'));
    sortByUniquenessBtn.addEventListener('click', () => handleSortClick('uniqueness'));
    sortByRandomBtn.addEventListener('click', () => handleSortClick('random')); // Обработчик для новой кнопки

    // --- Конец управления сортировкой ---

    // --- Управление сеткой ---
    function handleGridHotkeys(e) {
        // Не меняем колонки, если фокус на поле ввода
        if (e.target.tagName === 'INPUT') return;

        // Добавляем проверку на отсутствие клавиш-модификаторов
        if (e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) {
            return; // Если нажата любая клавиша-модификатор, выходим
        }

        const key = parseInt(e.key, 10);

        // Если нажата цифра от 1 до 9
        if (key >= 4 && key <= 9) {
            gridSlider.value = key;
            updateGridColumns(key);
            triggerGridSave(key);
        }
        // Если нажат 0, ставим 10 колонок
        else if (key === 0) {
            gridSlider.value = 10;
            updateGridColumns(10);
            triggerGridSave(10);
        }
    }

    document.addEventListener('keydown', handleGridHotkeys);




    let gridUpdateTimeout;
    const GRID_COLUMN_KEY = 'gridColumnCount';

    // Обработка изменения ползунка
    function updateGridColumns(value) {
        document.documentElement.style.setProperty('--grid-columns', value);
        gridSliderValue.textContent = value;
    }

    function triggerGridSave(value) {
        // Отложенное сохранение значения в localStorage
        clearTimeout(gridUpdateTimeout);
        gridUpdateTimeout = setTimeout(() => {
            localStorage.setItem(GRID_COLUMN_KEY, value);
            // После изменения сетки может понадобиться догрузить элементы
            // Даем небольшую задержку, чтобы DOM успел перестроиться
            setTimeout(checkAndLoadMoreIfContentDoesNotFillScreen, 100);
        }, 500); // Задержка в 0.5 секунды
    }

    gridSlider.addEventListener('input', (e) => {
        const value = e.target.value;
        updateGridColumns(value);
        triggerGridSave(value);
    });

    // --- Инициализация ---

    // Загружаем и применяем сохраненное количество колонок только на десктопе
    if (window.innerWidth > 992) {
        let savedColumnCount = parseInt(localStorage.getItem(GRID_COLUMN_KEY) || '5', 10);
        // Проверяем, что сохраненное значение находится в новом допустимом диапазоне (4-10)
        if (savedColumnCount < 4) {
            savedColumnCount = 4;
            localStorage.setItem(GRID_COLUMN_KEY, savedColumnCount);
        }
        gridSlider.value = savedColumnCount;
        updateGridColumns(savedColumnCount);
    }

    // Загружаем и применяем сохраненные параметры сортировки
    const savedSortType = localStorage.getItem(SORT_TYPE_KEY);
    const savedSortDirection = localStorage.getItem(SORT_DIRECTION_KEY);
    if (savedSortType && savedSortDirection) {
        sortType = savedSortType;
        sortDirection = savedSortDirection;
    }

    // Загружаем и применяем сохраненное состояние видимости панели папок
    const savedFoldersVisible = localStorage.getItem(FOLDERS_PANEL_VISIBLE_KEY);
    if (savedFoldersVisible !== null) {
        isFoldersPanelVisible = savedFoldersVisible === 'true';
    }

    // Устанавливаем правильный текст на кнопке при загрузке
    updateToggleFoldersButton();

    // Устанавливаем начальное состояние сортировки
    updateSortButtonsUI();

    // --- Инициализация подсказки о "прыжке к художнику" ---
    jumpToArtistHint.id = 'jump-to-artist-hint';
    jumpToArtistHint.className = 'hotkey-hint';
    jumpToArtistHint.style.display = 'none';
    jumpToArtistHint.style.cursor = 'pointer';
    jumpToArtistHint.title = 'Click to reset view';
    jumpToArtistHint.innerHTML = 'Jumping to artist... <span>&times;</span>';
    // Вставляем подсказку после блока поиска
    // searchWrapper.parentNode.insertBefore(jumpToArtistHint, searchWrapper.nextSibling);

    jumpToArtistHint.addEventListener('click', () => {
        startIndexOffset = 0;
        isJumpingToArtist = false;
        renderView();
    });

    // --- Landing Page Modal Logic ---
    const openLandingBtn = document.getElementById('open-landing-btn'); // Кнопка для открытия
    const openLandingBtnAbout = document.getElementById('open-landing-btn-about'); // Кнопка на странице About
    let landingModal = null; // Элемент модального окна будет загружен динамически
    let isModalLoaded = false; // Флаг, чтобы не загружать модальное окно повторно
    
    let lightboxCarouselImages = [];
    let lightboxCurrentIndex = -1;

    function showLandingModal() {
        // Загружаем HTML модального окна, если он еще не загружен
        if (!isModalLoaded) {
            // [FIX] Встраиваем HTML модального окна прямо в JS, чтобы избежать проблем с fetch() для локальных файлов.
            // Это решает проблему "Could not load promotional content."
            const modalHTML = `
            <div id="landing-modal" class="landing-modal-overlay">
                <div class="landing-modal-content">
                    <button id="close-landing-btn" class="landing-modal-close-btn" title="Close (Esc)">&times;</button>
                    <div id="landing-modal-body" class="landing-modal-body">
                        <div class="landing-header">
                            <h1>💎 Anima Preview 3 - Style Explorer</h1>
                        </div>
                        <blockquote>The professional benchmark for Anima P3. 42,000+ Re-generated Styles. Pure Aesthetics. Zero Guesswork.</blockquote>
                        <div class="landing-carousel-container">
                            <div class="carousel-frame">
                                <div class="carousel-images">
                                    <div class="carousel-slide">
                                        <span class="carousel-zoom-btn"></span>
                                        <img src="images/landing/Anima P3 - Style Explorer.png" alt="Anima Preview 3 - Style Explorer" class="carousel-image" loading="lazy">
                                    </div>
                                </div>
                            </div>
                        </div>
                        <hr>
                        <ul class="features-list">
                        <li><span class="feature-icon">🚀</span><strong>Massive Library Expansion:</strong><span>All <strong>20,000</strong> original styles re-generated to unleash their increased power in Anima P3, plus <strong>22,000+</strong> brand new styles. Experience the full potential across <strong>42,000+</strong> entries.</span></li>
                        </ul>
                        <div class="landing-carousel-container collage-carousel" data-has-arrows="true">
                            <div class="carousel-frame">
                                <div class="carousel-images">
                                    ${Array.from({ length: 70 }, (_, i) => `
                                    <div class="carousel-slide">
                                        <span class="carousel-zoom-btn"></span>
                                        <img src="images/landing/collages/${i + 1}.webp" alt="Collage Example ${i + 1}" class="carousel-image" loading="lazy">
                                    </div>
                                    `).join('')}
                                </div>
                                <button class="carousel-arrow prev" data-direction="-1">&#10094;</button>
                                <button class="carousel-arrow next" data-direction="1">&#10095;</button>
                            </div>
                            <div class="carousel-counter">
                                <span class="current-slide-number">1</span> / 70
                            </div>
                        </div>
                        <ul class="features-list">
                        <li><span class="feature-icon">🎯</span><strong>Balanced Quality Modifiers:</strong><span>Generated with <code>masterpiece</code>, <code>best quality</code>, and <code>absurdres</code> for a polished look that <strong>keeps the true artist's DNA</strong>. This ensures your generation results closely match the preview. <strong>Note:</strong> No <code><strong>score_*</strong></code> tags were used to avoid stylistic distortion.</span></li>
                        <li><span class="feature-icon">🔍</span><strong>Verified Artist Database:</strong><span>Our Danbooru artist list is curated based on the <strong>September 2025 knowledge cut-off</strong>. This ensures high-probability recognition by Anima P3 for authentic stylistic influence.</span></li>
                        <li><span class="feature-icon">🧠</span><strong>Visual DNA Over Volume:</strong><span>Anima P3 is already a "master" of anime basics; it only needs <strong>40–60 works</strong> to isolate an artist’s unique signature. Our explorer surfaces <strong>Hidden Gems</strong> where specific artistic deviation is far more powerful than raw data volume.</span></li>
                        <li><span class="feature-icon">📊</span><strong>Data-Driven Sorting:</strong><span>We processed metadata from <strong>9,113,285</strong> Danbooru images to provide sorting based on actual community engagement. Discover artists by <strong>Avg. Favs</strong> - Average favorites per post or <strong>Avg. Score</strong> - Average community rating per post. <br>Metadata source: <a href="https://huggingface.co/datasets/trojblue/danbooru2025-metadata" target="_blank">Hugging Face</a></span></li>
                        <li><span class="feature-icon">🌟</span><strong>Uniqueness Rating (v2):</strong><span>Our updated algorithm identifies <strong>hidden gems</strong>, allowing you to find standout styles in seconds.</span></li>
                        <li><span class="feature-icon">📂</span><strong>Seamless Library Migration:</strong><span>Don’t start from scratch. Easily export your existing styles and import them into Anima P3 to watch your collection evolve instantly.</span></li>
                        <li><span class="feature-icon">⚡</span><strong>100% Offline Browser Power:</strong><span>Zero servers, zero lag, total privacy. Run the entire library locally in your <strong>Desktop browser</strong> with a <strong>single click</strong>.</span></li>
                        <li><span class="feature-icon">📦</span><strong>Instant One-Click Delivery:</strong><span>Immediate access via high-speed Mega/G-Drive mirrors.</span></li>
                        <li><span class="feature-icon">🎁</span><strong>Anima 1.0 Bonus:</strong><span>If we re-generate or expand the library for the final Anima 1.0 release, all current owners will get the <strong>update for free</strong>.</span></li>
                        </ul>
                        <hr>
                        <div class="pricing-section"><h3>🐣 Early Bird Special</h3><p class="price"><span class="old-price">$24.99</span> $9.99</p><a href="https://app.lava.top/products/a1f18bbc-c5a8-4234-a4e2-bdb04a3dc582/76e1334d-44ba-495f-8926-f1e3f1a69c5b?currency=USD" class="cta-button" target="_blank">🔥 GET ACCESS NOW</a><p class="fine-print">One-Time Payment. No Subscriptions. Lifetime access.</p></div>
                    </div>
                </div>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            landingModal = document.getElementById('landing-modal');
            isModalLoaded = true;
            // Добавляем контейнер для просмотра изображений
            const lightboxHTML = `
            <div id="image-lightbox" class="image-lightbox-overlay"> 
                <span class="image-lightbox-close">&times;</span>
                <button class="image-lightbox-arrow prev" id="lightbox-prev">&#10094;</button>
                <img class="image-lightbox-content" id="lightbox-img">
                <button class="image-lightbox-arrow next" id="lightbox-next">&#10095;</button>
            </div>`;
            document.body.insertAdjacentHTML('beforeend', lightboxHTML);

            setupModalEventListeners();
            setupLandingCarousels();
        }

        if (!landingModal) return;
        landingModal.classList.add('visible');
        document.body.style.overflow = 'hidden';
    }

    function closeLandingModal() {
        if (!landingModal) return;

        landingModal.classList.remove('visible');
        document.body.style.overflow = '';
    }

    // Эта функция будет вызвана один раз после загрузки модального окна
    function setupModalEventListeners() {
        const closeLandingBtn = document.getElementById('close-landing-btn');
        if (closeLandingBtn) closeLandingBtn.addEventListener('click', closeLandingModal);

        landingModal.addEventListener('click', (e) => {
            if (e.target === landingModal) {
                closeLandingModal();
            }
        });

        // Обработчики для лайтбокса
        const lightbox = document.getElementById('image-lightbox');
        const lightboxPrevBtn = document.getElementById('lightbox-prev');
        const lightboxNextBtn = document.getElementById('lightbox-next');
        const lightboxClose = document.querySelector('.image-lightbox-close');
        if (lightbox) {
            lightbox.addEventListener('click', (e) => {
                if (e.target === lightbox || e.target === lightboxClose) {
                    lightbox.classList.remove('visible');
                }
            });
        }
        if (lightboxPrevBtn) lightboxPrevBtn.addEventListener('click', () => navigateLightbox(-1));
        if (lightboxNextBtn) lightboxNextBtn.addEventListener('click', () => navigateLightbox(1));

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && lightbox && lightbox.classList.contains('visible')) {
                lightbox.classList.remove('visible');
            }
            // Навигация стрелками клавиатуры в лайтбоксе
            if (lightbox && lightbox.classList.contains('visible')) {
                if (e.key === 'ArrowLeft') navigateLightbox(-1);
                if (e.key === 'ArrowRight') navigateLightbox(1);
            }

        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('carousel-zoom-btn')) showImageInLightbox(e.target);
        });
    }

    // Основные обработчики, которые всегда на странице
    if (openLandingBtn) {
        openLandingBtn.addEventListener('click', showLandingModal);
    }
    // Старый обработчик для openLandingBtnAbout больше не нужен, так как это теперь ссылка.

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && landingModal && landingModal.classList.contains('visible')) closeLandingModal();
    });

    // --- Landing Page Carousel Logic ---
    // --- Логика для открытия модального окна по параметру в URL ---
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('openModal') === 'true') {
        // Убедимся, что кнопка существует на текущей странице (index.html)
        if (openLandingBtn) {
            showLandingModal();
        }
        // Очищаем URL, чтобы при перезагрузке окно не открывалось снова
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    function showImageInLightbox(zoomButton) {
        const slide = zoomButton.closest('.carousel-slide'); 
        const carouselImagesContainer = zoomButton.closest('.carousel-images');
        const allSlides = Array.from(carouselImagesContainer.querySelectorAll('.carousel-slide'));

        // Сохраняем все источники изображений из текущей карусели
        lightboxCarouselImages = allSlides.map(s => s.querySelector('.carousel-image').src);
        
        // Находим индекс текущего слайда
        lightboxCurrentIndex = allSlides.indexOf(slide);

        // Устанавливаем изображение и показываем лайтбокс
        document.getElementById('lightbox-img').src = lightboxCarouselImages[lightboxCurrentIndex];
        document.getElementById('image-lightbox').classList.add('visible');

        // Обновляем видимость стрелок
        updateLightboxArrows();
    }

    function navigateLightbox(direction) {
        if (lightboxCurrentIndex === -1 || lightboxCarouselImages.length === 0) return;

        const totalImages = lightboxCarouselImages.length;
        // Добавляем циклическую навигацию
        const newIndex = (lightboxCurrentIndex + direction + totalImages) % totalImages;
        lightboxCurrentIndex = newIndex;
        document.getElementById('lightbox-img').src = lightboxCarouselImages[lightboxCurrentIndex];
        updateLightboxArrows();
    }
    function setupLandingCarousels() {
        const carousels = document.querySelectorAll('.landing-carousel-container');
        if (!carousels.length) return;

        carousels.forEach(carousel => {
            const imagesContainer = carousel.querySelector('.carousel-images');
            const dots = carousel.querySelectorAll('.nav-dot');
            const counter = carousel.querySelector('.carousel-counter .current-slide-number');
            const arrows = carousel.querySelectorAll('.carousel-frame > .carousel-arrow'); // Ищем стрелки внутри фрейма
            const totalSlides = carousel.querySelectorAll('.carousel-slide').length;
            
            let currentSlide = 0;

            function goToSlide(slideIndex) {
                currentSlide = (slideIndex + totalSlides) % totalSlides;

                imagesContainer.style.transform = `translateX(-${currentSlide * 100}%)`;

                // Обновляем либо точки, либо счетчик
                if (dots.length > 0) {
                    if (!dots[currentSlide]) return;
                    dots.forEach(d => d.classList.remove('active'));
                    dots[currentSlide].classList.add('active');
                } else if (counter) {
                    counter.textContent = currentSlide + 1;
                }
            }

            dots.forEach(dot => {
                dot.addEventListener('click', () => {
                    const slideIndex = parseInt(dot.dataset.slide, 10);
                    goToSlide(slideIndex);
                });
            });

            arrows.forEach(arrow => {
                arrow.addEventListener('click', () => {
                    const direction = parseInt(arrow.dataset.direction, 10);
                    goToSlide(currentSlide + direction);
                });
            });


            // Инициализируем состояние при первой загрузке
            goToSlide(0);
        });
    }
    
    function updateLightboxArrows() {
        const prevArrow = document.getElementById('lightbox-prev');
        const nextArrow = document.getElementById('lightbox-next');
        if (!prevArrow || !nextArrow) return;

        // Показываем стрелки всегда, если изображений больше одного, для циклической прокрутки
        if (lightboxCarouselImages.length > 1) {
            prevArrow.style.display = 'flex';
            nextArrow.style.display = 'flex';
        } else {
            prevArrow.style.display = 'none';
            nextArrow.style.display = 'none';
        }
    }

    // --- Timed Promo Modal Logic (Dynamically Loaded) ---
    function setupTimedPromoModal() {
        const mainCtaBtn = document.getElementById('open-landing-btn');
        if (!mainCtaBtn) return; // Если основной кнопки нет, ничего не делаем

        const PROMO_TIMESTAMP_KEY = 'promoLastShownV3'; // Новая версия ключа для новой логики
        const ONE_DAY_MS = 1 * 24 * 60 * 60 * 1000; // 24 часа в миллисекундах
        const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000; // 48 часов в миллисекундах

        const lastShown = localStorage.getItem(PROMO_TIMESTAMP_KEY);
        const now = Date.now();
        
        let promoTimeout; // Объявляем переменную для хранения ID таймера
        // Показываем окно, только если запись отсутствует или прошло достаточно времени
        if (!lastShown || (now - parseInt(lastShown, 10) > ONE_DAY_MS)) { // Используем 1 день как минимальный интервал
            // Небольшая задержка перед показом, чтобы не было слишком навязчиво
            promoTimeout = setTimeout(() => {
                createAndShowPromoModal();
            }, 25000);
        }

        function createAndShowPromoModal() {
            // Проверяем, не открыто ли уже основное модальное окно.
            const mainLandingModal = document.getElementById('landing-modal');
            if (mainLandingModal && mainLandingModal.classList.contains('visible')) {
                // Если основной лендинг открыт, не показываем промо, но ставим таймер на 1 день.
                localStorage.setItem(PROMO_TIMESTAMP_KEY, Date.now().toString());
                return; // Выходим, не показывая промо-окно
            }

            // Если модальное окно уже есть в DOM, просто показываем его
            let promoModal = document.getElementById('promo-modal');
            if (promoModal) {
                document.body.classList.add('body-scroll-lock');
                promoModal.classList.add('visible');
                return;
            }

            // Создаем HTML-структуру модального окна
           const modalHTML = `
            <div id="promo-modal" class="promo-modal-overlay">
                <div class="promo-modal-content">
                    <button id="promo-modal-close-btn" class="promo-modal-close-btn" title="Close">&times;</button>
                    <div class="promo-modal-body">
                        <div class="promo-header">
                            <h1>💎Anima Preview 3 - Style Explorer</h1>
                            <p>The professional benchmark. Pure Aesthetics. Zero Guesswork.</p>
                        </div>
                        <ul class="promo-features-list">
                            <li><span class="promo-feature-icon">🚀</span><strong>42,000+ Style Expansion</strong>All styles re-generated to unleash the full power and depth of Anima P3.</li>
                            <li><span class="promo-feature-icon">🔄</span><strong>Seamless Library Migration</strong>Keep your library. Quickly import your existing styles and folders directly into the new P3 interface.</li>
                            <li><span class="promo-feature-icon">🌟</span><strong>Uniqueness Rating (v2)</strong>Our updated algorithm identifies "hidden gems" and standout styles in seconds.</li>
                            <li><span class="promo-feature-icon">⚡</span><strong>100% Offline Performance</strong>Zero servers, zero lag. Run the entire library locally with total privacy and instant response.</li>
                        </ul>
                        <a href="#" id="promo-cta-btn" class="promo-cta-button">💎 EXPLORE ALL FEATURES</a>
                        <small class="promo-cta-subtext">Click to see everything included. Early Bird access inside.</small>
                    </div>
                </div>
            </div>`;
            
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            promoModal = document.getElementById('promo-modal');
            
            // Добавляем обработчики событий к новым элементам
            const closeBtn = document.getElementById('promo-modal-close-btn');
            const ctaBtn = document.getElementById('promo-cta-btn');

            const hideAndSetTimestamp = () => {
                // Если промо-окно было показано, ставим таймер на 2 дня.
                document.body.classList.remove('body-scroll-lock');
                promoModal.classList.remove('visible');
                // [FIX] Устанавливаем таймер на 48 часов (2 дня).
                // Предыдущая логика была некорректной и приводила к немедленному повторному показу.
                // Теперь мы просто сохраняем текущее время, а проверка будет `now - lastShown > TWO_DAYS_MS`.
                localStorage.setItem(PROMO_TIMESTAMP_KEY, Date.now().toString());
            };

            closeBtn.addEventListener('click', hideAndSetTimestamp);
            // promoModal.addEventListener('click', (e) => { if (e.target === promoModal) hideAndSetTimestamp(); }); // Убрано закрытие по клику на фон

            ctaBtn.addEventListener('click', (e) => {
                e.preventDefault();
                hideAndSetTimestamp();
                mainCtaBtn.click(); // Программно кликаем по основной кнопке
            });

            // Показываем созданное окно
            document.body.classList.add('body-scroll-lock');
            promoModal.classList.add('visible');
        }

        // Переносим проверку на 2 дня сюда, чтобы она применялась только после того,
        // как пользователь взаимодействовал с окном.
        if (lastShown && (now - parseInt(lastShown, 10) < TWO_DAYS_MS)) {
            // Если с момента последнего показа прошло МЕНЬШЕ 2 дней, отменяем запланированный показ.
            clearTimeout(promoTimeout);
        }
    }



    // --- Advanced Style Explorer tools and enhanced visual matching ---
    const ADVANCED_KEYS = {
        mix: 'advancedStyleMixIds',
        compare: 'advancedStyleCompareIds',
        excluded: 'advancedExcludedStyleIds',
        tags: 'advancedFavoriteTags',
        history: 'advancedStyleHistory',
        template: 'advancedPromptTemplate'
    };
    const ADVANCED_HISTORY_LIMIT = 80;
    const mixSelectedIds = new Set(loadAdvancedArray(ADVANCED_KEYS.mix));
    const compareSelectedIds = new Set(loadAdvancedArray(ADVANCED_KEYS.compare).slice(0, 4));
    const excludedStyleIds = new Set(loadAdvancedArray(ADVANCED_KEYS.excluded));
    let favoriteTagsById = loadAdvancedObject(ADVANCED_KEYS.tags);
    let styleHistory = loadAdvancedArray(ADVANCED_KEYS.history);

    function byId(id) { return document.getElementById(id); }

    function loadAdvancedArray(key) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || '[]');
            return Array.isArray(value) ? value : [];
        } catch (_) {
            return [];
        }
    }

    function loadAdvancedObject(key) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || '{}');
            return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
        } catch (_) {
            return {};
        }
    }

    function saveAdvancedArray(key, value) {
        localStorage.setItem(key, JSON.stringify(Array.from(value)));
    }

    function saveAdvancedObject(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function getItemById(id) {
        const targetId = String(id);
        return (currentItems || []).find(item => item.id === targetId)
            || (similarityItems || []).find(item => item.id === targetId)
            || allItems.find(item => item.id === targetId);
    }

    function getVisibleSourceItems() {
        const items = currentItems && currentItems.length ? currentItems : (similarityModeActive && similarityItems.length ? similarityItems : allItems);
        return items.filter(item => item && !excludedStyleIds.has(item.id) && passesFavoriteTagFilter(item));
    }

    function getFavoriteTags(itemOrId) {
        const id = typeof itemOrId === 'object' ? itemOrId.id : String(itemOrId);
        const tags = favoriteTagsById[id];
        return Array.isArray(tags) ? tags : [];
    }

    function setFavoriteTags(id, tags) {
        const normalized = Array.from(new Set((tags || [])
            .map(tag => String(tag).trim().toLowerCase())
            .filter(Boolean))).slice(0, 12);
        if (normalized.length) favoriteTagsById[id] = normalized;
        else delete favoriteTagsById[id];
        saveAdvancedObject(ADVANCED_KEYS.tags, favoriteTagsById);
        updateFavoriteTagOptions();
    }

    function getSelectedMixItems() {
        return Array.from(mixSelectedIds).map(getItemById).filter(Boolean).filter(item => !excludedStyleIds.has(item.id));
    }

    function getCompareItems() {
        return Array.from(compareSelectedIds).map(getItemById).filter(Boolean);
    }

    function getStrengthPreset(selectId, fallback = 'raw') {
        return byId(selectId)?.value || fallback;
    }

    function getAutoStyleWeight(item) {
        const counts = allItems
            .map(entry => Number(entry.worksCount) || 0)
            .filter(count => count > 0);
        const minWorks = Math.max(1, Math.min(...counts));
        const maxWorks = Math.max(minWorks + 1, Math.max(...counts));
        const count = Math.max(1, Number(item?.worksCount) || minWorks);
        const clampedCount = Math.max(minWorks, Math.min(maxWorks, count));
        const minLog = Math.log(minWorks + 1);
        const maxLog = Math.log(maxWorks + 1);
        const normalizedPopularity = (Math.log(clampedCount + 1) - minLog) / Math.max(0.0001, maxLog - minLog);
        const rarity = 1 - normalizedPopularity; // fewer entries => larger rarity => stronger weight
        const weight = 0.1 + (rarity * 1.4);
        return Math.max(0.1, Math.min(1.5, Number(weight.toFixed(2))));
    }

    function formatWeight(value) {
        return Number(value).toFixed(2).replace(/\.00$/, '').replace(/0$/, '');
    }

    function formatStyleWithPreset(item, preset = 'raw') {
        if (!item) return '';
        const name = item.artist;
        if (preset === 'light') return `(${name}:0.6)`;
        if (preset === 'normal') return `(${name}:1)`;
        if (preset === 'strong') return `(${name}:1.25)`;
        if (preset === 'auto') return `(${name}:${formatWeight(getAutoStyleWeight(item))})`;
        return name;
    }

    function formatStyleList(items, preset = 'raw') {
        return items.map(item => formatStyleWithPreset(item, preset)).join(', ');
    }

    function addHistoryEntry(type, text, meta = {}) {
        if (!text) return;
        styleHistory.unshift({
            type,
            text,
            meta,
            timestamp: Date.now()
        });
        styleHistory = styleHistory.slice(0, ADVANCED_HISTORY_LIMIT);
        localStorage.setItem(ADVANCED_KEYS.history, JSON.stringify(styleHistory));
    }

    function copyTextWithHistory(text, toastMessage, historyType = 'copy', meta = {}) {
        if (!text) {
            showToast('Nothing to copy.');
            return;
        }
        navigator.clipboard.writeText(text).then(() => {
            addHistoryEntry(historyType, text, meta);
            showToast(toastMessage || 'Copied to clipboard!');
        }).catch(() => showToast('Could not copy to clipboard.'));
    }

    function updateMixOutput() {
        const output = byId('style-mix-output');
        const status = byId('style-mix-status');
        const preset = getStrengthPreset('mix-strength-preset');
        const selected = getSelectedMixItems();
        if (output) output.value = formatStyleList(selected, preset);
        if (status) {
            const autoText = preset === 'auto' ? ' Auto weights use post-count rarity: popular styles go lower, rare styles go higher within 0.1–1.5.' : '';
            status.textContent = `${selected.length} style${selected.length === 1 ? '' : 's'} selected.${autoText}`;
        }
        saveAdvancedArray(ADVANCED_KEYS.mix, mixSelectedIds);
        refreshCardStateClasses();
    }

    function updateCompareStatus() {
        const status = byId('compare-status');
        if (status) status.textContent = `${compareSelectedIds.size} / 4 comparison slots used.`;
        saveAdvancedArray(ADVANCED_KEYS.compare, compareSelectedIds);
        refreshCardStateClasses();
    }

    function updateExcludeStatus() {
        const status = byId('exclude-status');
        if (status) status.textContent = `${excludedStyleIds.size.toLocaleString('en-US')} excluded style${excludedStyleIds.size === 1 ? '' : 's'}. Excluded styles are skipped by random output and similarity search.`;
        saveAdvancedArray(ADVANCED_KEYS.excluded, excludedStyleIds);
        refreshCardStateClasses();
    }

    function updateFavoriteTagOptions() {
        const select = byId('favorite-tag-filter');
        if (!select) return;
        const current = select.value || 'all';
        const tags = Array.from(new Set(Object.values(favoriteTagsById).flat().filter(Boolean))).sort((a, b) => a.localeCompare(b));
        select.innerHTML = '<option value="all">All tags</option>' + tags.map(tag => `<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`).join('');
        select.value = tags.includes(current) ? current : 'all';
        updateFavoriteTagStatus();
    }

    function updateFavoriteTagStatus() {
        const status = byId('favorite-tag-status');
        if (!status) return;
        const tagCount = new Set(Object.values(favoriteTagsById).flat().filter(Boolean)).size;
        const artistCount = Object.keys(favoriteTagsById).length;
        status.textContent = `${tagCount} tag${tagCount === 1 ? '' : 's'} on ${artistCount} style${artistCount === 1 ? '' : 's'}.`;
    }

    function passesFavoriteTagFilter(item) {
        const select = byId('favorite-tag-filter');
        const filter = select?.value || 'all';
        if (currentView !== 'favorites' || filter === 'all') return true;
        return getFavoriteTags(item).includes(filter);
    }

    function refreshCardStateClasses() {
        galleryContainer.querySelectorAll('.card').forEach(card => {
            const id = card.dataset.id;
            const item = getItemById(id);
            card.classList.toggle('in-mix', mixSelectedIds.has(id));
            card.classList.toggle('in-compare', compareSelectedIds.has(id));
            card.classList.toggle('is-excluded', excludedStyleIds.has(id));
            card.classList.toggle('tag-filter-hidden', item ? !passesFavoriteTagFilter(item) : false);
            const mixBtn = card.querySelector('.card-action-button.mix');
            const compareBtn = card.querySelector('.card-action-button.compare');
            if (mixBtn) mixBtn.classList.toggle('active', mixSelectedIds.has(id));
            if (compareBtn) compareBtn.classList.toggle('active', compareSelectedIds.has(id));
        });
    }

    function toggleMixItem(item) {
        if (mixSelectedIds.has(item.id)) mixSelectedIds.delete(item.id);
        else mixSelectedIds.add(item.id);
        updateMixOutput();
        showToast(mixSelectedIds.has(item.id) ? 'Added to style mix.' : 'Removed from style mix.');
    }

    function toggleCompareItem(item) {
        if (compareSelectedIds.has(item.id)) {
            compareSelectedIds.delete(item.id);
        } else {
            if (compareSelectedIds.size >= 4) {
                showToast('Compare mode supports up to 4 styles.');
                return;
            }
            compareSelectedIds.add(item.id);
        }
        updateCompareStatus();
    }

    function excludeItem(item) {
        excludedStyleIds.add(item.id);
        mixSelectedIds.delete(item.id);
        compareSelectedIds.delete(item.id);
        updateExcludeStatus();
        updateMixOutput();
        updateCompareStatus();
        if (similarityModeActive && !similaritySearchInProgress) applySimilarityThresholdAndRender(true);
        showToast('Style excluded.');
    }

    function addTagsToItem(item) {
        if (!favorites.has(item.id)) {
            showToast('Add this style to Favorites before tagging it.');
            return;
        }
        const current = getFavoriteTags(item).join(', ');
        const next = prompt(`Tags for ${item.artist}:`, current);
        if (next === null) return;
        const tags = next.split(',').map(tag => tag.trim()).filter(Boolean);
        setFavoriteTags(item.id, tags);
        renderView();
        showToast('Favorite tags updated.');
    }

    function addTagsToMixSelection() {
        const tagInput = byId('favorite-tag-input');
        const tags = (tagInput?.value || '').split(',').map(tag => tag.trim()).filter(Boolean);
        if (!tags.length) {
            showToast('Enter at least one tag.');
            return;
        }
        const selected = getSelectedMixItems().filter(item => favorites.has(item.id));
        if (!selected.length) {
            showToast('Select favorite styles in Mix first.');
            return;
        }
        selected.forEach(item => setFavoriteTags(item.id, Array.from(new Set([...getFavoriteTags(item), ...tags]))));
        if (tagInput) tagInput.value = '';
        renderView();
        showToast(`Tagged ${selected.length} favorite style${selected.length === 1 ? '' : 's'}.`);
    }

    function showCompareModal() {
        const modal = byId('compare-modal');
        const grid = byId('compare-modal-grid');
        if (!modal || !grid) return;
        const items = getCompareItems();
        if (!items.length) {
            showToast('Use Compare on cards first.');
            return;
        }
        grid.innerHTML = items.map(item => {
            const tags = getFavoriteTags(item);
            const similarity = typeof item.similarityScore === 'number' ? `<div>Similarity: ${item.similarityPercent || formatSimilarityPercent(item.similarityScore)}</div>` : '';
            const cluster = item.similarityCluster ? `<div>Cluster: ${escapeHtml(item.similarityCluster)}</div>` : '';
            return `<article class="compare-card">
                <img src="${item.image}" alt="${escapeHtml(item.artist)}">
                <div class="compare-card-info">
                    <strong>${escapeHtml(item.artist)}</strong>
                    <div>Works: ${Number(item.worksCount || 0).toLocaleString('en-US')}</div>
                    <div>Auto strength: ${formatWeight(getAutoStyleWeight(item))}</div>
                    <div>Uniqueness: ${Number(item.uniqueness_score || 0).toFixed(2)}</div>
                    ${similarity}${cluster}
                    ${tags.length ? `<div>Tags: ${tags.map(escapeHtml).join(', ')}</div>` : ''}
                </div>
            </article>`;
        }).join('');
        modal.classList.add('visible');
        modal.setAttribute('aria-hidden', 'false');
    }

    function closeCompareModal() {
        const modal = byId('compare-modal');
        if (modal) {
            modal.classList.remove('visible');
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    function showHistoryModal() {
        const modal = byId('history-modal');
        const list = byId('history-modal-list');
        if (!modal || !list) return;
        if (!styleHistory.length) {
            list.innerHTML = '<p class="advanced-tool-status">No history yet.</p>';
        } else {
            list.innerHTML = styleHistory.map(entry => {
                const date = new Date(entry.timestamp).toLocaleString();
                return `<div class="history-item"><strong>${escapeHtml(entry.type)} · ${escapeHtml(date)}</strong><code>${escapeHtml(entry.text)}</code></div>`;
            }).join('');
        }
        modal.classList.add('visible');
        modal.setAttribute('aria-hidden', 'false');
    }

    function closeHistoryModal() {
        const modal = byId('history-modal');
        if (modal) {
            modal.classList.remove('visible');
            modal.setAttribute('aria-hidden', 'true');
        }
    }

    function rgbToHsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const d = max - min;
        let h = 0;
        if (d !== 0) {
            if (max === r) h = ((g - b) / d) % 6;
            else if (max === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h /= 6;
            if (h < 0) h += 1;
        }
        const s = max === 0 ? 0 : d / max;
        return [h, s, max];
    }

    function normalizeVectorPart(values, weight = 1) {
        const sum = values.reduce((a, b) => a + Math.abs(b), 0) || 1;
        return values.map(v => (v / sum) * weight);
    }

    function extractImageFeature(img) {
        const canvas = document.createElement('canvas');
        canvas.width = SIMILARITY_CANVAS_SIZE;
        canvas.height = SIMILARITY_CANVAS_SIZE;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, SIMILARITY_CANVAS_SIZE, SIMILARITY_CANVAS_SIZE);
        const { data } = ctx.getImageData(0, 0, SIMILARITY_CANVAS_SIZE, SIMILARITY_CANVAS_SIZE);
        const w = SIMILARITY_CANVAS_SIZE;
        const h = SIMILARITY_CANVAS_SIZE;
        const pixelCount = w * h;
        const luma = new Float32Array(pixelCount);
        const hueHist = new Array(12).fill(0);
        const satHist = new Array(8).fill(0);
        const valHist = new Array(8).fill(0);
        const lumaHist = new Array(10).fill(0);
        const edgeOrient = new Array(8).fill(0);
        const edgeGrid = new Array(SIMILARITY_GRID_SIZE * SIMILARITY_GRID_SIZE).fill(0);
        const eyeShape = new Array(16).fill(0);
        const faceLuma = new Array(16).fill(0);
        const colorVarianceGrid = new Array(16).fill(0);
        const gridCounts4 = new Array(16).fill(0);
        let satSum = 0, valueSum = 0, lumaSum = 0, darkInk = 0, flatColorPixels = 0;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const p = y * w + x;
                const i = p * 4;
                const alpha = data[i + 3] / 255;
                const r = data[i] * alpha + 28 * (1 - alpha);
                const g = data[i + 1] * alpha + 28 * (1 - alpha);
                const b = data[i + 2] * alpha + 30 * (1 - alpha);
                const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                const [hh, ss, vv] = rgbToHsv(r, g, b);
                luma[p] = lum;
                hueHist[Math.min(11, Math.floor(hh * 12))] += ss > 0.08 ? 1 : 0.2;
                satHist[Math.min(7, Math.floor(ss * 8))]++;
                valHist[Math.min(7, Math.floor(vv * 8))]++;
                lumaHist[Math.min(9, Math.floor(lum * 10))]++;
                satSum += ss;
                valueSum += vv;
                lumaSum += lum;
                if (lum < 0.22 && ss < 0.45) darkInk++;
                const gx4 = Math.min(3, Math.floor(x / (w / 4)));
                const gy4 = Math.min(3, Math.floor(y / (h / 4)));
                const gi4 = gy4 * 4 + gx4;
                colorVarianceGrid[gi4] += ss * (1 - Math.abs(vv - 0.55));
                gridCounts4[gi4]++;

                if (x > 0 && y > 0) {
                    const prev = ((y - 1) * w + (x - 1)) * 4;
                    const diff = Math.abs(r - data[prev]) + Math.abs(g - data[prev + 1]) + Math.abs(b - data[prev + 2]);
                    if (diff < 20) flatColorPixels++;
                }
            }
        }

        let edgeSum = 0, faceEdgeSum = 0, eyeEdgeSum = 0, horizontalEyeEdges = 0, verticalEyeEdges = 0;
        const gridCell = w / SIMILARITY_GRID_SIZE;
        for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
                const p = y * w + x;
                const gx = (luma[p + 1] - luma[p - 1]) * 0.5;
                const gy = (luma[p + w] - luma[p - w]) * 0.5;
                const mag = Math.sqrt(gx * gx + gy * gy);
                if (mag < 0.018) continue;
                const angle = (Math.atan2(gy, gx) + Math.PI) / (Math.PI * 2);
                const bin = Math.min(7, Math.floor(angle * 8));
                const gridX = Math.min(SIMILARITY_GRID_SIZE - 1, Math.floor(x / gridCell));
                const gridY = Math.min(SIMILARITY_GRID_SIZE - 1, Math.floor(y / gridCell));
                edgeOrient[bin] += mag;
                edgeGrid[gridY * SIMILARITY_GRID_SIZE + gridX] += mag;
                edgeSum += mag;

                const inFace = x >= w * 0.22 && x <= w * 0.78 && y >= h * 0.12 && y <= h * 0.58;
                const inEye = x >= w * 0.18 && x <= w * 0.82 && y >= h * 0.18 && y <= h * 0.42;
                if (inFace) faceEdgeSum += mag;
                if (inEye) {
                    eyeEdgeSum += mag;
                    if (Math.abs(gx) > Math.abs(gy)) verticalEyeEdges += mag;
                    else horizontalEyeEdges += mag;
                    const ex = Math.min(3, Math.floor((x - w * 0.18) / (w * 0.64 / 4)));
                    const ey = Math.min(3, Math.floor((y - h * 0.18) / (h * 0.24 / 4)));
                    if (ex >= 0 && ey >= 0) eyeShape[ey * 4 + ex] += mag;
                }
                if (inFace) {
                    const fx = Math.min(3, Math.floor((x - w * 0.22) / (w * 0.56 / 4)));
                    const fy = Math.min(3, Math.floor((y - h * 0.12) / (h * 0.46 / 4)));
                    if (fx >= 0 && fy >= 0) faceLuma[fy * 4 + fx] += luma[p];
                }
            }
        }

        const avgSat = satSum / pixelCount;
        const avgValue = valueSum / pixelCount;
        const avgLuma = lumaSum / pixelCount;
        const edgeDensity = edgeSum / pixelCount;
        const inkRatio = darkInk / pixelCount;
        const flatness = flatColorPixels / pixelCount;
        const faceEdgeRatio = faceEdgeSum / Math.max(0.0001, edgeSum);
        const eyeEdgeRatio = eyeEdgeSum / Math.max(0.0001, edgeSum);
        const eyeAspectCue = horizontalEyeEdges / Math.max(0.0001, verticalEyeEdges + horizontalEyeEdges);
        const localColorVar = colorVarianceGrid.map((v, i) => v / Math.max(1, gridCounts4[i]));

        const feature = [];
        feature.push(...normalizeVectorPart(hueHist, 1.15));
        feature.push(...normalizeVectorPart(satHist, 0.85));
        feature.push(...normalizeVectorPart(valHist, 0.75));
        feature.push(...normalizeVectorPart(lumaHist, 0.9));
        feature.push(...normalizeVectorPart(edgeOrient, 1.35));
        feature.push(...normalizeVectorPart(edgeGrid, 1.6));
        feature.push(...normalizeVectorPart(eyeShape, 2.1));
        feature.push(...normalizeVectorPart(faceLuma, 1.45));
        feature.push(...normalizeVectorPart(localColorVar, 0.95));
        feature.push(avgSat * 0.9, avgValue * 0.55, avgLuma * 0.55, edgeDensity * 4.0, inkRatio * 1.7, flatness * 0.7, faceEdgeRatio * 1.3, eyeEdgeRatio * 1.9, eyeAspectCue * 1.3);
        const typed = Float32Array.from(feature);
        typed._styleMeta = {
            avgSat,
            avgValue,
            avgLuma,
            edgeDensity,
            inkRatio,
            flatness,
            faceEdgeRatio,
            eyeEdgeRatio,
            eyeAspectCue,
            cluster: classifyStyleMeta({ avgSat, avgValue, avgLuma, edgeDensity, inkRatio, flatness, faceEdgeRatio, eyeEdgeRatio, eyeAspectCue })
        };
        return typed;
    }

    function classifyStyleMeta(meta = {}) {
        const highLine = meta.edgeDensity > 0.052 || meta.inkRatio > 0.12;
        const softLine = meta.edgeDensity < 0.032 && meta.flatness > 0.18;
        const vivid = meta.avgSat > 0.42;
        const muted = meta.avgSat < 0.24;
        const eyeFocus = meta.eyeEdgeRatio > 0.19 || meta.faceEdgeRatio > 0.38;
        const bright = meta.avgValue > 0.68;
        if (eyeFocus && highLine && vivid) return 'eye-focused vivid lineart';
        if (eyeFocus && muted) return 'face/eye-focused muted';
        if (highLine && muted) return 'monochrome / ink lineart';
        if (highLine && vivid) return 'sharp colorful lineart';
        if (softLine && vivid) return 'soft vivid painting';
        if (softLine && muted) return 'soft muted painting';
        if (bright && vivid) return 'bright saturated coloring';
        if (muted) return 'low-saturation soft tone';
        return 'balanced anime style';
    }

    function scoreStyleAgainstQueries(queryFeatures, styleFeature) {
        const scores = queryFeatures.map(queryFeature => cosineSimilarity(queryFeature, styleFeature));
        scores.sort((a, b) => a - b);
        const min = scores[0] || 0;
        const max = scores[scores.length - 1] || 0;
        const avg = scores.reduce((a, b) => a + b, 0) / Math.max(1, scores.length);
        const median = scores[Math.floor(scores.length / 2)] || avg;
        const mode = byId('similar-style-match-mode')?.value || 'common';
        const raw = mode === 'any'
            ? max
            : mode === 'average'
                ? avg
                : (avg * 0.50 + min * 0.38 + median * 0.12);
        // Calibrate cosine similarity into a more useful 0-1 percentage range.
        return Math.max(0, Math.min(1, Math.pow(Math.max(0, (raw - 0.52) / 0.48), 0.82)));
    }

    function readStyleFeatureFromDB(id) {
        return new Promise(resolve => {
            if (!db || !db.objectStoreNames.contains(SIMILARITY_FEATURE_STORE_NAME)) {
                resolve(null);
                return;
            }
            const transaction = db.transaction(SIMILARITY_FEATURE_STORE_NAME, 'readonly');
            const store = transaction.objectStore(SIMILARITY_FEATURE_STORE_NAME);
            const request = store.get(id);
            request.onsuccess = () => {
                const record = request.result;
                if (record && record.version === SIMILARITY_FEATURE_VERSION && Array.isArray(record.feature)) {
                    const feature = Float32Array.from(record.feature);
                    feature._styleMeta = record.meta || null;
                    resolve(feature);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => resolve(null);
        });
    }

    function queueStyleFeatureSave(id, feature) {
        if (!db || !db.objectStoreNames.contains(SIMILARITY_FEATURE_STORE_NAME)) return;
        pendingSimilarityFeatureSaves.push({
            id,
            version: SIMILARITY_FEATURE_VERSION,
            feature: Array.from(feature),
            meta: feature._styleMeta || null
        });
        if (pendingSimilarityFeatureSaves.length >= 250) flushSimilarityFeatureSaves();
        else if (!pendingSimilarityFeatureSaveTimer) pendingSimilarityFeatureSaveTimer = setTimeout(flushSimilarityFeatureSaves, 1000);
    }

    async function getStyleFeature(item, token, signal) {
        if (similarityFeatureCache.has(item.id)) {
            return { feature: similarityFeatureCache.get(item.id), source: 'memory' };
        }
        throwIfSimilarityStopped(token, signal);
        const dbFeature = await readStyleFeatureFromDB(item.id);
        if (dbFeature) {
            similarityFeatureCache.set(item.id, dbFeature);
            return { feature: dbFeature, source: 'indexeddb' };
        }
        throwIfSimilarityStopped(token, signal);
        const drawable = await loadImageForSimilarity(item.image, true, signal);
        try {
            throwIfSimilarityStopped(token, signal);
            const feature = extractImageFeature(drawable);
            similarityFeatureCache.set(item.id, feature);
            queueStyleFeatureSave(item.id, feature);
            return { feature, source: 'new' };
        } finally {
            closeDrawableForSimilarity(drawable);
        }
    }

    function getSimilarityClusterFilter() {
        return byId('similar-style-cluster-filter')?.value || 'all';
    }

    function buildSimilarityItemsFromResults(rawResults) {
        const threshold = getSimilarityThreshold();
        const minimumScore = threshold / 100;
        const clusterFilter = getSimilarityClusterFilter();
        return rawResults
            .filter(result => !excludedStyleIds.has(result.item.id))
            .filter(result => result.score >= minimumScore)
            .filter(result => clusterFilter === 'all' || result.cluster === clusterFilter)
            .sort((a, b) => b.score - a.score)
            .map((result, index) => ({
                ...result.item,
                similarityScore: result.score,
                similarityPercent: formatSimilarityPercent(result.score),
                similarityRank: index + 1,
                similarityCluster: result.cluster || 'balanced anime style'
            }));
    }

    function updateSimilarityClusterOptions(rawResults = similarityAllResults) {
        const select = byId('similar-style-cluster-filter');
        if (!select) return;
        const current = select.value || 'all';
        const clusters = Array.from(new Set(rawResults.map(result => result.cluster).filter(Boolean))).sort((a, b) => a.localeCompare(b));
        select.innerHTML = '<option value="all">All</option>' + clusters.map(cluster => `<option value="${escapeHtml(cluster)}">${escapeHtml(cluster)}</option>`).join('');
        select.value = current === 'all' || clusters.includes(current) ? current : 'all';
    }

    function updateSimilarityResultStatus(stats = similarityLastStats, customMessage = '') {
        if (!stats) return;
        const threshold = getSimilarityThreshold();
        const cluster = getSimilarityClusterFilter();
        const filteredOut = Math.max(0, similarityAllResults.length - similarityItems.length);
        const stoppedText = stats.stopped ? 'Stopped. ' : '';
        const failedText = stats.failed > 0 ? ` · ${stats.failed.toLocaleString('en-US')} skipped` : '';
        const filteredText = threshold > 0 ? ` · ${filteredOut.toLocaleString('en-US')} below/filter hidden` : (cluster !== 'all' ? ` · ${filteredOut.toLocaleString('en-US')} outside cluster` : '');
        const cacheText = stats.cached > 0 ? ` · ${stats.cached.toLocaleString('en-US')} cached` : '';
        const refText = stats.references ? ` · ${stats.references} reference image${stats.references === 1 ? '' : 's'}` : '';
        const base = customMessage || `${stoppedText}Similar style results: ${similarityItems.length.toLocaleString('en-US')} shown / ${similarityAllResults.length.toLocaleString('en-US')} analyzed${refText}${failedText}${filteredText}${cacheText}.`;
        setSimilarStyleStatus(base, false);
    }

    function commitSimilarityResults(rawResults, stats = {}, shouldRender = true) {
        similarityAllResults = [...rawResults].sort((a, b) => b.score - a.score);
        updateSimilarityClusterOptions(similarityAllResults);
        similarityLastStats = {
            total: stats.total || allItems.length,
            processed: stats.processed || rawResults.length,
            failed: stats.failed || 0,
            cached: stats.cached || 0,
            stopped: Boolean(stats.stopped),
            references: stats.references || 1
        };
        similarityItems = buildSimilarityItemsFromResults(similarityAllResults);
        similarityModeActive = true;
        similaritySearchInProgress = false;
        similarityStopRequested = false;
        similarityAbortController = null;
        if (similarStyleUploadBtn) similarStyleUploadBtn.disabled = false;
        if (stopSimilarStyleBtn) {
            stopSimilarStyleBtn.disabled = false;
            stopSimilarStyleBtn.textContent = 'Stop';
            stopSimilarStyleBtn.style.display = 'none';
        }
        if (clearSimilarStyleBtn) clearSimilarStyleBtn.style.display = 'inline-flex';
        setSimilarityProgress(similarityLastStats.processed, similarityLastStats.total);
        styleCounter.innerHTML = `Similar Style Search: <span class="style-count-number">${similarityItems.length.toLocaleString('en-US')}</span>`;
        updateSimilarityResultStatus();
        addHistoryEntry('similarity search', similarityItems.slice(0, 20).map(item => `${item.artist} ${item.similarityPercent}`).join(', '), { count: similarityItems.length });
        updateControlsState();
        if (shouldRender && currentView === 'gallery') renderView();
    }

    async function runSimilarStyleSearch(filesOrFile) {
        const isFileListInput = typeof FileList !== 'undefined' && filesOrFile instanceof FileList;
        const files = Array.from(isFileListInput ? filesOrFile : (Array.isArray(filesOrFile) ? filesOrFile : [filesOrFile])).filter(Boolean);
        if (!files.length) return;
        const invalid = files.find(file => !file.type.startsWith('image/'));
        if (invalid) {
            showToast('Please choose image files only.');
            return;
        }
        if (similaritySearchInProgress) stopSimilarStyleSearch();
        const token = ++similarityAbortToken;
        similarityAbortController = new AbortController();
        const signal = similarityAbortController.signal;
        similarityStopRequested = false;
        similarityModeActive = false;
        similaritySearchInProgress = true;
        similarityItems = [];
        similarityAllResults = [];
        similarityLastStats = null;
        startIndexOffset = 0;
        searchInput.value = '';
        searchTerm = '';
        jumpInput.value = '';
        clearSearchBtn.style.display = 'none';
        clearJumpBtn.style.display = 'none';
        if (clearSimilarStyleBtn) clearSimilarStyleBtn.style.display = 'inline-flex';
        if (stopSimilarStyleBtn) {
            stopSimilarStyleBtn.disabled = false;
            stopSimilarStyleBtn.textContent = 'Stop';
            stopSimilarStyleBtn.style.display = 'inline-flex';
        }
        if (similarStyleUploadBtn) similarStyleUploadBtn.disabled = true;
        const searchableItems = allItems.filter(item => !excludedStyleIds.has(item.id));
        setSimilarityProgress(0, searchableItems.length);
        setSimilarStyleStatus(`Analyzing ${files.length} reference image${files.length === 1 ? '' : 's'}...`, true);
        updateControlsState();
        const objectUrls = [];
        const results = [];
        const stats = {
            total: searchableItems.length,
            processed: 0,
            failed: 0,
            cached: 0,
            extracted: 0,
            startedAt: performance.now(),
            stopped: false,
            references: files.length
        };
        try {
            const queryFeatures = [];
            for (const file of files) {
                throwIfSimilarityStopped(token, signal);
                const url = URL.createObjectURL(file);
                objectUrls.push(url);
                const queryImage = await loadImageForSimilarity(url, false, signal);
                try {
                    queryFeatures.push(extractImageFeature(queryImage));
                } finally {
                    closeDrawableForSimilarity(queryImage);
                }
            }
            let nextIndex = 0;
            let lastStatusUpdate = 0;
            const total = searchableItems.length;
            const workerCount = Math.min(getSimilarityConcurrency(), Math.max(1, total));
            const updateProgress = (force = false) => {
                const now = performance.now();
                if (!force && now - lastStatusUpdate < 140) return;
                lastStatusUpdate = now;
                setSimilarityProgress(stats.processed, total);
                setSimilarStyleStatus(
                    `Analyzing styles... ${stats.processed.toLocaleString('en-US')} / ${total.toLocaleString('en-US')} · ${formatSimilarityRate(stats.processed, stats.startedAt)} · parallel ${workerCount} · refs ${files.length}`,
                    true
                );
            };
            async function similarityWorker() {
                while (token === similarityAbortToken && !similarityStopRequested) {
                    const index = nextIndex++;
                    if (index >= total) break;
                    const item = searchableItems[index];
                    try {
                        const { feature, source } = await getStyleFeature(item, token, signal);
                        throwIfSimilarityStopped(token, signal);
                        const score = scoreStyleAgainstQueries(queryFeatures, feature);
                        const meta = feature._styleMeta || {};
                        results.push({ item, score, cluster: meta.cluster || classifyStyleMeta(meta) });
                        if (source === 'memory' || source === 'indexeddb') stats.cached++;
                        else stats.extracted++;
                    } catch (error) {
                        if (!similarityStopRequested && token === similarityAbortToken && error?.name !== 'AbortError') stats.failed++;
                    } finally {
                        stats.processed++;
                        updateProgress(false);
                        if (stats.processed % 96 === 0) await new Promise(resolve => setTimeout(resolve, 0));
                    }
                }
            }
            await Promise.all(Array.from({ length: workerCount }, () => similarityWorker()));
            await flushSimilarityFeatureSaves();
            if (token !== similarityAbortToken) return;
            stats.stopped = similarityStopRequested;
            if (!results.length) throw new Error('No preview images could be analyzed. Try using a local web server instead of opening index.html directly.');
            updateProgress(true);
            commitSimilarityResults(results, stats, true);
        } catch (error) {
            if (token !== similarityAbortToken) return;
            if (similarityStopRequested && results.length > 0) {
                stats.stopped = true;
                commitSimilarityResults(results, stats, true);
                return;
            }
            console.error('Similar Style Search failed:', error);
            similarityModeActive = false;
            similaritySearchInProgress = false;
            similarityItems = [];
            similarityAllResults = [];
            similarityLastStats = null;
            similarityAbortController = null;
            if (similarStyleUploadBtn) similarStyleUploadBtn.disabled = false;
            if (stopSimilarStyleBtn) {
                stopSimilarStyleBtn.disabled = false;
                stopSimilarStyleBtn.textContent = 'Stop';
                stopSimilarStyleBtn.style.display = 'none';
            }
            setSimilarityProgress(0, 0);
            setSimilarStyleStatus(error.message || 'Similar Style Search failed.', false);
            showToast('Similar Style Search failed.');
            updateControlsState();
        } finally {
            objectUrls.forEach(url => URL.revokeObjectURL(url));
        }
    }

    function getRandomStyles() {
        const count = Math.max(1, Math.min(200, parseInt(randomStyleCountInput?.value, 10) || 1));
        if (randomStyleCountInput) randomStyleCountInput.value = count;
        const preset = randomAutoStrengthCheckbox?.checked ? 'auto' : getStrengthPreset('random-strength-preset');
        const sourceItems = (similarityModeActive && currentView === 'gallery' && similarityItems.length ? similarityItems : allItems)
            .filter(item => !excludedStyleIds.has(item.id));
        if (!sourceItems.length) {
            showToast('No styles available.');
            return;
        }
        const pool = [...sourceItems];
        shuffleArray(pool);
        const pickedItems = pool.slice(0, Math.min(count, pool.length));
        const text = formatStyleList(pickedItems, preset);
        if (randomStyleOutput) {
            randomStyleOutput.value = text;
            randomStyleOutput.focus();
            randomStyleOutput.select();
        }
        addHistoryEntry('random styles', text, { count: pickedItems.length, preset });
        showToast(`${pickedItems.length} random style${pickedItems.length === 1 ? '' : 's'} generated.`);
    }

    function createCard(item) {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.artist = item.artist;
        card.draggable = currentView === 'favorites';
        card.dataset.id = item.id;
        const isFavorited = favorites.has(item.id);
        card.classList.toggle('in-mix', mixSelectedIds.has(item.id));
        card.classList.toggle('in-compare', compareSelectedIds.has(item.id));
        card.classList.toggle('is-excluded', excludedStyleIds.has(item.id));
        card.classList.toggle('tag-filter-hidden', !passesFavoriteTagFilter(item));
        const rankHTML = sortType === 'uniqueness' && item.uniquenessRank
            ? `<div class="uniqueness-rank" title="Uniqueness Rank">#${item.uniquenessRank}</div>`
            : '';
        const similarityHTML = typeof item.similarityScore === 'number'
            ? `<div class="similarity-score" title="Visual similarity rank and score">#${item.similarityRank} · ${item.similarityPercent || formatSimilarityPercent(item.similarityScore)}</div>`
            : '';
        const clusterHTML = item.similarityCluster
            ? `<div class="similarity-cluster" title="Similarity cluster">${escapeHtml(item.similarityCluster)}</div>`
            : '';
        const tags = getFavoriteTags(item);
        const tagsHTML = tags.length
            ? `<div class="card-tag-list">${tags.map(tag => `<span class="card-tag-badge">${escapeHtml(tag)}</span>`).join('')}</div>`
            : '';
        const favButtonHTML = currentView === 'favorites'
            ? `<button class="favorite-button remove-favorite" aria-label="Remove from favorites" title="Remove from favorites">×</button>`
            : `<button class="favorite-button ${isFavorited ? 'favorited' : ''}" aria-label="${isFavorited ? 'Remove from favorites' : 'Add to favorites'}" title="${isFavorited ? 'Remove from favorites' : 'Add to favorites'}"></button>`;
        const toolsHTML = `<div class="card-tools" aria-label="Card tools">
            <button class="card-action-button mix ${mixSelectedIds.has(item.id) ? 'active' : ''}" title="Add/remove from Style Mix">Mix</button>
            <button class="card-action-button compare ${compareSelectedIds.has(item.id) ? 'active' : ''}" title="Add/remove from Compare">Cmp</button>
            <button class="card-action-button tag" title="Edit favorite tags">Tag</button>
            <button class="card-action-button exclude" title="Exclude this style from search/random results">Hide</button>
        </div>`;
        card.innerHTML = `
            <img class="card__image" src="${item.image}" alt="${escapeHtml(item.artist)}" loading="lazy" width="832" height="1216">
            <div class="card__info">
                <p class="card__artist">${escapeHtml(item.artist)}</p>
                ${tagsHTML}
            </div>
            <div class="works-count" title="Approximate number of training images for this artistic style">${Number(item.worksCount || 0).toLocaleString('en-US')}</div>
            ${rankHTML}${similarityHTML}${clusterHTML}${toolsHTML}${favButtonHTML}`;
        card.addEventListener('click', (e) => {
            if (e.target.closest('.favorite-button') || e.target.closest('.card-action-button') || e.target.closest('.card-tag-badge')) return;
            if (currentView === 'favorites' && e.ctrlKey) {
                e.preventDefault();
                if (selectedArtistIds.has(item.id)) {
                    selectedArtistIds.delete(item.id);
                    card.classList.remove('selected');
                } else {
                    selectedArtistIds.add(item.id);
                    card.classList.add('selected');
                }
            } else {
                navigator.clipboard.writeText(item.artist).then(() => {
                    addHistoryEntry('copied artist', item.artist, { id: item.id });
                    showToast('Artist name copied to clipboard!');
                });
                selectedArtistIds.clear();
                document.querySelectorAll('.card.selected').forEach(c => c.classList.remove('selected'));
            }
        });
        card.querySelector('.favorite-button').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(item, e.currentTarget);
        });
        card.querySelector('.card-action-button.mix').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleMixItem(item);
        });
        card.querySelector('.card-action-button.compare').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleCompareItem(item);
        });
        card.querySelector('.card-action-button.exclude').addEventListener('click', (e) => {
            e.stopPropagation();
            excludeItem(item);
        });
        card.querySelector('.card-action-button.tag').addEventListener('click', (e) => {
            e.stopPropagation();
            addTagsToItem(item);
        });
        return card;
    }

    function applyTemplateToStyles() {
        const templateInput = byId('prompt-template-input');
        const output = byId('prompt-template-output');
        const template = templateInput?.value || '{styles}';
        const mixItems = getSelectedMixItems();
        const source = mixItems.length ? mixItems : getVisibleSourceItems().slice(0, Math.max(1, parseInt(byId('bulk-copy-count')?.value, 10) || 1));
        if (!source.length) {
            showToast('No styles available for template.');
            return;
        }
        const preset = getStrengthPreset('mix-strength-preset');
        const rawStyles = source.map(item => item.artist).join(', ');
        const weightedStyles = formatStyleList(source, preset === 'raw' ? 'auto' : preset);
        const first = source[0];
        const rendered = template
            .replaceAll('{styles}', weightedStyles)
            .replaceAll('{weighted_styles}', weightedStyles)
            .replaceAll('{style_list}', rawStyles)
            .replaceAll('{style}', formatStyleWithPreset(first, preset));
        if (output) output.value = rendered;
        addHistoryEntry('prompt template', rendered, { count: source.length });
        copyTextWithHistory(rendered, 'Template output copied!', 'prompt template', { count: source.length });
    }

    function copyTopResults(visibleOnly = false) {
        const count = Math.max(1, Math.min(200, parseInt(byId('bulk-copy-count')?.value, 10) || 10));
        const preset = getStrengthPreset('mix-strength-preset');
        const source = visibleOnly
            ? Array.from(galleryContainer.querySelectorAll('.card:not(.is-excluded):not(.tag-filter-hidden)')).map(card => getItemById(card.dataset.id)).filter(Boolean)
            : getVisibleSourceItems();
        const picked = source.slice(0, count);
        if (!picked.length) {
            showToast('No visible styles to copy.');
            return;
        }
        copyTextWithHistory(formatStyleList(picked, preset), `Copied top ${picked.length} style${picked.length === 1 ? '' : 's'}!`, 'bulk copy', { count: picked.length, preset });
    }

    async function countSimilarityFeatureRecords() {
        if (!db || !db.objectStoreNames.contains(SIMILARITY_FEATURE_STORE_NAME)) return 0;
        return new Promise(resolve => {
            const tx = db.transaction(SIMILARITY_FEATURE_STORE_NAME, 'readonly');
            const store = tx.objectStore(SIMILARITY_FEATURE_STORE_NAME);
            const request = store.count();
            request.onsuccess = () => resolve(request.result || 0);
            request.onerror = () => resolve(0);
        });
    }

    async function clearSimilarityFeatureCache() {
        similarityFeatureCache.clear();
        if (!db || !db.objectStoreNames.contains(SIMILARITY_FEATURE_STORE_NAME)) return;
        await new Promise(resolve => {
            const tx = db.transaction(SIMILARITY_FEATURE_STORE_NAME, 'readwrite');
            tx.objectStore(SIMILARITY_FEATURE_STORE_NAME).clear();
            tx.oncomplete = tx.onerror = tx.onabort = () => resolve();
        });
        const status = byId('cache-status');
        if (status) status.textContent = 'Similarity cache cleared.';
        showToast('Similarity cache cleared.');
    }

    async function updateCacheInfoStatus() {
        const count = await countSimilarityFeatureRecords();
        const status = byId('cache-status');
        if (status) status.textContent = `${count.toLocaleString('en-US')} cached feature record${count === 1 ? '' : 's'} stored. Current feature version: ${SIMILARITY_FEATURE_VERSION}.`;
    }

    async function buildMissingSimilarityCache() {
        if (similaritySearchInProgress) {
            showToast('Stop the current similarity search first.');
            return;
        }
        const token = ++similarityAbortToken;
        similarityAbortController = new AbortController();
        const signal = similarityAbortController.signal;
        similarityStopRequested = false;
        similaritySearchInProgress = true;
        const total = allItems.filter(item => !excludedStyleIds.has(item.id)).length;
        let processed = 0, failed = 0, cached = 0, extracted = 0, nextIndex = 0;
        const items = allItems.filter(item => !excludedStyleIds.has(item.id));
        const workerCount = Math.min(getSimilarityConcurrency(), Math.max(1, items.length));
        const startedAt = performance.now();
        if (stopSimilarStyleBtn) {
            stopSimilarStyleBtn.disabled = false;
            stopSimilarStyleBtn.textContent = 'Stop';
            stopSimilarStyleBtn.style.display = 'inline-flex';
        }
        if (similarStyleUploadBtn) similarStyleUploadBtn.disabled = true;
        const status = byId('cache-status');
        async function cacheWorker() {
            while (token === similarityAbortToken && !similarityStopRequested) {
                const index = nextIndex++;
                if (index >= items.length) break;
                try {
                    const result = await getStyleFeature(items[index], token, signal);
                    if (result.source === 'memory' || result.source === 'indexeddb') cached++;
                    else extracted++;
                } catch (error) {
                    if (error?.name !== 'AbortError') failed++;
                } finally {
                    processed++;
                    if (processed % 40 === 0 || processed === total) {
                        setSimilarityProgress(processed, total);
                        setSimilarStyleStatus(`Building cache... ${processed.toLocaleString('en-US')} / ${total.toLocaleString('en-US')} · ${formatSimilarityRate(processed, startedAt)} · ${cached.toLocaleString('en-US')} cached`, true);
                        if (status) status.textContent = `${processed.toLocaleString('en-US')} / ${total.toLocaleString('en-US')} processed · ${extracted.toLocaleString('en-US')} newly extracted · ${failed.toLocaleString('en-US')} skipped.`;
                        await new Promise(resolve => setTimeout(resolve, 0));
                    }
                }
            }
        }
        try {
            await Promise.all(Array.from({ length: workerCount }, () => cacheWorker()));
            await flushSimilarityFeatureSaves();
            setSimilarityProgress(processed, total);
            setSimilarStyleStatus(`Cache build ${similarityStopRequested ? 'stopped' : 'complete'}: ${processed.toLocaleString('en-US')} processed.`, false);
            await updateCacheInfoStatus();
        } finally {
            similaritySearchInProgress = false;
            similarityAbortController = null;
            similarityStopRequested = false;
            if (stopSimilarStyleBtn) {
                stopSimilarStyleBtn.disabled = false;
                stopSimilarStyleBtn.textContent = 'Stop';
                stopSimilarStyleBtn.style.display = 'none';
            }
            if (similarStyleUploadBtn) similarStyleUploadBtn.disabled = false;
            updateControlsState();
        }
    }



    function initToolCardToggles() {
        const root = document.getElementById('style-tools-wrapper');
        if (!root) return;

        const STORAGE_KEY = 'styleToolCardCollapsedStateV1';
        let collapsedState = {};
        try {
            collapsedState = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
        } catch (error) {
            collapsedState = {};
        }

        const getCardKey = (card, index) => {
            if (card.id) return card.id;
            const labelId = card.getAttribute('aria-labelledby');
            if (labelId) return labelId;
            const heading = card.querySelector(':scope > h3, :scope > .style-tool-header, :scope > summary');
            const headingText = heading ? heading.textContent.trim().toLowerCase().replace(/\s+/g, '-') : '';
            const classKey = Array.from(card.classList).filter(cls => cls !== 'style-tool-card' && cls !== 'advanced-tool-section').join('-');
            return classKey || headingText || `tool-card-${index}`;
        };

        const getHeaderElement = (card) => {
            if (card.tagName === 'DETAILS') return card.querySelector(':scope > summary');
            return card.querySelector(':scope > .style-tool-header, :scope > h3');
        };

        const setCollapsed = (card, button, key, collapsed) => {
            collapsedState[key] = collapsed;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsedState));
            card.classList.toggle('tool-card-collapsed', collapsed);
            button.classList.toggle('is-collapsed', collapsed);
            button.setAttribute('aria-expanded', String(!collapsed));
            button.title = collapsed ? 'Show this tool card' : 'Hide this tool card';
            button.setAttribute('aria-label', collapsed ? 'Show this tool card' : 'Hide this tool card');
            if (card.tagName === 'DETAILS') card.open = true;
        };

        const cards = root.querySelectorAll(':scope > .style-tool-card, .advanced-tool-section');
        cards.forEach((card, index) => {
            if (card.dataset.toolToggleReady === 'true') return;
            const header = getHeaderElement(card);
            if (!header) return;

            if (card.tagName === 'DETAILS') {
                card.open = true;
                header.addEventListener('click', (event) => {
                    if (!event.target.closest('.tool-card-toggle')) event.preventDefault();
                });
            }

            const key = getCardKey(card, index);
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'tool-card-toggle';
            button.innerHTML = '<span></span><span></span><span></span>';
            header.insertBefore(button, header.firstChild);

            const initialCollapsed = Boolean(collapsedState[key]);
            card.classList.toggle('tool-card-collapsed', initialCollapsed);
            button.classList.toggle('is-collapsed', initialCollapsed);
            button.setAttribute('aria-expanded', String(!initialCollapsed));
            button.title = initialCollapsed ? 'Show this tool card' : 'Hide this tool card';
            button.setAttribute('aria-label', initialCollapsed ? 'Show this tool card' : 'Hide this tool card');

            button.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                setCollapsed(card, button, key, !card.classList.contains('tool-card-collapsed'));
            });

            card.dataset.toolToggleReady = 'true';
        });
    }

    function initAdvancedStyleTools() {
        initToolCardToggles();
        const templateInput = byId('prompt-template-input');
        const savedTemplate = localStorage.getItem(ADVANCED_KEYS.template);
        if (templateInput && savedTemplate) templateInput.value = savedTemplate;
        byId('mix-strength-preset')?.addEventListener('change', updateMixOutput);
        byId('random-strength-preset')?.addEventListener('change', () => {
            if (randomStyleOutput?.value.trim()) getRandomStyles();
        });
        randomAutoStrengthCheckbox?.addEventListener('change', () => {
            const presetSelect = byId('random-strength-preset');
            if (presetSelect) presetSelect.disabled = randomAutoStrengthCheckbox.checked;
            if (randomStyleOutput?.value.trim()) getRandomStyles();
        });
        if (randomAutoStrengthCheckbox?.checked) {
            const presetSelect = byId('random-strength-preset');
            if (presetSelect) presetSelect.disabled = true;
        }
        byId('copy-mix-btn')?.addEventListener('click', () => {
            const text = byId('style-mix-output')?.value.trim();
            copyTextWithHistory(text, 'Style mix copied!', 'style mix', { count: getSelectedMixItems().length });
        });
        byId('clear-mix-btn')?.addEventListener('click', () => {
            mixSelectedIds.clear();
            updateMixOutput();
        });
        byId('copy-top-results-btn')?.addEventListener('click', () => copyTopResults(false));
        byId('copy-visible-results-btn')?.addEventListener('click', () => copyTopResults(true));
        byId('apply-template-btn')?.addEventListener('click', applyTemplateToStyles);
        byId('save-template-btn')?.addEventListener('click', () => {
            localStorage.setItem(ADVANCED_KEYS.template, byId('prompt-template-input')?.value || '');
            showToast('Prompt template saved.');
        });
        byId('add-exclude-btn')?.addEventListener('click', () => {
            const input = byId('exclude-style-input');
            const term = (input?.value || '').trim().toLowerCase();
            if (!term) return;
            const matches = allItems.filter(item => item.artist.toLowerCase().includes(term));
            if (!matches.length) {
                showToast('No matching styles found.');
                return;
            }
            matches.forEach(item => excludedStyleIds.add(item.id));
            if (input) input.value = '';
            updateExcludeStatus();
            if (similarityModeActive && !similaritySearchInProgress) applySimilarityThresholdAndRender(true);
            else renderView();
            showToast(`Excluded ${matches.length} style${matches.length === 1 ? '' : 's'}.`);
        });
        byId('clear-exclude-btn')?.addEventListener('click', () => {
            excludedStyleIds.clear();
            updateExcludeStatus();
            renderView();
        });
        byId('add-tag-to-mix-btn')?.addEventListener('click', addTagsToMixSelection);
        byId('favorite-tag-filter')?.addEventListener('change', () => renderView());
        byId('open-compare-btn')?.addEventListener('click', showCompareModal);
        byId('clear-compare-btn')?.addEventListener('click', () => {
            compareSelectedIds.clear();
            updateCompareStatus();
        });
        byId('open-history-btn')?.addEventListener('click', showHistoryModal);
        byId('clear-history-btn')?.addEventListener('click', () => {
            styleHistory = [];
            localStorage.setItem(ADVANCED_KEYS.history, '[]');
            showToast('History cleared.');
        });
        byId('compare-modal-close')?.addEventListener('click', closeCompareModal);
        byId('history-modal-close')?.addEventListener('click', closeHistoryModal);
        byId('compare-modal')?.addEventListener('click', (e) => { if (e.target.id === 'compare-modal') closeCompareModal(); });
        byId('history-modal')?.addEventListener('click', (e) => { if (e.target.id === 'history-modal') closeHistoryModal(); });
        byId('cache-info-btn')?.addEventListener('click', updateCacheInfoStatus);
        byId('clear-cache-btn')?.addEventListener('click', clearSimilarityFeatureCache);
        byId('build-cache-btn')?.addEventListener('click', buildMissingSimilarityCache);
        byId('similar-style-cluster-filter')?.addEventListener('change', () => {
            if (similarityModeActive && !similaritySearchInProgress) applySimilarityThresholdAndRender(true);
        });
        byId('similar-style-match-mode')?.addEventListener('change', () => {
            if (similarityAllResults.length) setSimilarStyleStatus('Match mode changed. Run Similar Style Search again to rescore references.', false);
        });
        updateMixOutput();
        updateCompareStatus();
        updateExcludeStatus();
        updateFavoriteTagOptions();
        updateCacheInfoStatus();
    }
    initDB()
        .then(() => {
            loadInitialData();
            setTimeout(() => {
                updateMixOutput();
                updateCompareStatus();
                updateExcludeStatus();
                updateFavoriteTagOptions();
                updateCacheInfoStatus();
            }, 600);
        })
        .catch(err => {
            console.error(err);
            galleryContainer.innerHTML = '<p style="text-align: center; grid-column: 1 / -1;">Failed to initialize database.</p>';
        });
    setupTimedPromoModal(); // Вызываем новую функцию при инициализации
    initAdvancedStyleTools();

});
