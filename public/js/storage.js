/**
 * 跨页面共享存储与记忆同步中枢 (index.html <-> offline.html)
 * 安全封装 localStorage，兼容 Safari 无痕模式与容量限制，并提供壁纸亮度自动识别
 */
(function (global) {
    const PREFIX = 'chatwindow_v1_';

    const KEYS = {
        ONLINE_MESSAGES: PREFIX + 'online_messages',
        ONLINE_WALLPAPER: PREFIX + 'online_wallpaper',
        OFFLINE_DIALOGUE: PREFIX + 'offline_dialogue_messages',
        OFFLINE_CHAPTER: PREFIX + 'offline_chapter_messages',
        OFFLINE_SETTINGS: PREFIX + 'offline_settings',
        OFFLINE_WALLPAPER: PREFIX + 'offline_wallpaper',
        OFFLINE_FONT: PREFIX + 'offline_custom_font',
        OFFLINE_MEMORY_DB: PREFIX + 'offline_memory_db',
        MEMORY_BRIDGE_SUMMARY: PREFIX + 'memory_bridge_summary',
        THEME_DARK: PREFIX + 'theme_dark',
        THEME_AUTO: PREFIX + 'theme_auto',
        ONLINE_THEME_DARK: PREFIX + 'online_theme_dark',
        OFFLINE_THEME_DARK: PREFIX + 'offline_theme_dark'
    };

    function load(key, fallback) {
        try {
            const raw = global.localStorage.getItem(key);
            if (raw === null || raw === undefined) return fallback;
            return JSON.parse(raw);
        } catch (err) {
            console.warn('[ChatStorage] 读取失败:', key, err);
            return fallback;
        }
    }

    function save(key, value) {
        try {
            global.localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (err) {
            console.warn('[ChatStorage] 写入失败(可能超出配额或无痕模式):', key, err);
            return false;
        }
    }

    function remove(key) {
        try {
            global.localStorage.removeItem(key);
        } catch (err) {
            console.warn('[ChatStorage] 删除失败:', key, err);
        }
    }

    function applyDarkMode(enabled, scope) {
        if (typeof document === 'undefined') return;
        const isDark = Boolean(enabled);
        if (document.body) {
            document.body.classList.toggle('theme-dark', isDark);
        }
        if (document.documentElement) {
            document.documentElement.classList.toggle('theme-dark', isDark);
        }
        if (scope === 'online') {
            save(KEYS.ONLINE_THEME_DARK, isDark);
        } else if (scope === 'offline') {
            save(KEYS.OFFLINE_THEME_DARK, isDark);
        }
    }

    function getDarkMode() {
        return Boolean(load(KEYS.THEME_DARK, false));
    }

    function setDarkMode(enabled, scope) {
        const isDark = Boolean(enabled);
        save(KEYS.THEME_DARK, isDark);
        save(KEYS.ONLINE_THEME_DARK, isDark);
        save(KEYS.OFFLINE_THEME_DARK, isDark);
        applyDarkMode(isDark, scope);
        return isDark;
    }

    function getThemeAuto() {
        const val = load(KEYS.THEME_AUTO, null);
        return val === null ? true : Boolean(val);
    }

    function setThemeAuto(enabled) {
        const isAuto = Boolean(enabled);
        save(KEYS.THEME_AUTO, isAuto);
        return isAuto;
    }

    /* ============ 壁纸亮度自动识别引擎 ============ */
    const LUMINANCE_THRESHOLD = 132;

    function extractUrlsFromBg(bgValue) {
        if (!bgValue || bgValue === 'none') return [];
        const urls = [];
        const regex = /url\(\s*(['"]?)(.*?)\1\s*\)/g;
        let match;
        while ((match = regex.exec(bgValue)) !== null) {
            const url = (match[2] || '').trim();
            if (url) urls.push(url);
        }
        return urls;
    }

    function computeImageLuminance(img) {
        try {
            const cw = 32;
            const ch = 48;
            const canvas = document.createElement('canvas');
            canvas.width = cw;
            canvas.height = ch;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return null;

            const iw = img.naturalWidth || img.width || cw;
            const ih = img.naturalHeight || img.height || ch;
            // 模拟 background-size: cover; background-position: center
            const scale = Math.max(cw / iw, ch / ih);
            const dw = iw * scale;
            const dh = ih * scale;
            const dx = (cw - dw) / 2;
            const dy = (ch - dh) / 2;
            ctx.drawImage(img, dx, dy, dw, dh);

            const pixels = ctx.getImageData(0, 0, cw, ch).data;
            let weightedSum = 0;
            let totalWeight = 0;

            for (let y = 0; y < ch; y++) {
                // 中部聊天消息主区域略微加权 (1.3x)，兼顾上下栏可读性
                const rowWeight = (y >= 7 && y <= 40) ? 1.3 : 1.0;
                for (let x = 0; x < cw; x++) {
                    const idx = (y * cw + x) * 4;
                    const alpha = pixels[idx + 3] / 255;
                    if (alpha < 0.05) continue;
                    const r = pixels[idx];
                    const g = pixels[idx + 1];
                    const b = pixels[idx + 2];
                    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
                    weightedSum += luma * rowWeight * alpha;
                    totalWeight += rowWeight * alpha;
                }
            }

            if (totalWeight <= 0) return null;
            return Math.round(weightedSum / totalWeight);
        } catch (err) {
            console.warn('[ChatStorage] 亮度计算受限(可能是跨域图片):', err);
            return null;
        }
    }

    function detectImageDarkness(srcOrList, callback, threshold) {
        const limit = typeof threshold === 'number' ? threshold : LUMINANCE_THRESHOLD;
        const candidates = Array.isArray(srcOrList) ? srcOrList.filter(Boolean) : [srcOrList].filter(Boolean);
        let idx = 0;

        function tryNext() {
            if (idx >= candidates.length) {
                if (typeof callback === 'function') callback({ luma: null, isDark: null });
                return;
            }
            const src = candidates[idx++];
            const img = new Image();
            if (!src.startsWith('data:') && !src.startsWith('blob:')) {
                try {
                    const resolved = new URL(src, global.location.href);
                    if (resolved.origin !== global.location.origin) {
                        img.crossOrigin = 'anonymous';
                    }
                } catch (_) {}
            }
            img.onload = function () {
                const luma = computeImageLuminance(img);
                if (luma === null) {
                    tryNext();
                    return;
                }
                if (typeof callback === 'function') {
                    callback({ luma, isDark: luma < limit, src });
                }
            };
            img.onerror = function () {
                tryNext();
            };
            img.src = src;
        }

        tryNext();
    }

    function detectBackgroundDarkness(targetEl, fallbackUrls, callback, threshold) {
        let urls = [];
        if (targetEl && typeof global.getComputedStyle === 'function') {
            const inlineBg = targetEl.style && targetEl.style.backgroundImage;
            const computedBg = global.getComputedStyle(targetEl).backgroundImage;
            urls = [
                ...extractUrlsFromBg(inlineBg),
                ...extractUrlsFromBg(computedBg)
            ];
        }
        if (Array.isArray(fallbackUrls)) {
            urls.push(...fallbackUrls);
        } else if (typeof fallbackUrls === 'string') {
            urls.push(fallbackUrls);
        }
        // 去重
        const uniqueUrls = Array.from(new Set(urls.filter(Boolean)));
        detectImageDarkness(uniqueUrls, callback, threshold);
    }

    function processWallpaperFile(file, callback, options) {
        if (!file) return;
        const opts = options || {};
        const maxSide = opts.maxSide || 1600;
        const quality = opts.quality || 0.86;
        const threshold = typeof opts.threshold === 'number' ? opts.threshold : LUMINANCE_THRESHOLD;

        const reader = new FileReader();
        reader.onload = function (e) {
            const rawDataUrl = e.target && e.target.result;
            if (!rawDataUrl) return;

            const img = new Image();
            img.onload = function () {
                const luma = computeImageLuminance(img);
                const isDark = luma !== null ? luma < threshold : null;
                let finalUrl = rawDataUrl;

                // 若原图体积较大，压缩至适口分辨率以免超出 localStorage 5MB 配额并加速解码
                try {
                    const iw = img.naturalWidth || img.width;
                    const ih = img.naturalHeight || img.height;
                    const needsResize = iw > maxSide || ih > maxSide || rawDataUrl.length > 480000;
                    if (needsResize && iw > 0 && ih > 0) {
                        const scale = Math.min(1, maxSide / Math.max(iw, ih));
                        const tw = Math.max(1, Math.round(iw * scale));
                        const th = Math.max(1, Math.round(ih * scale));
                        const canvas = document.createElement('canvas');
                        canvas.width = tw;
                        canvas.height = th;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(img, 0, 0, tw, th);
                            const compressed = canvas.toDataURL('image/jpeg', quality);
                            if (compressed && compressed.length < rawDataUrl.length) {
                                finalUrl = compressed;
                            }
                        }
                    }
                } catch (err) {
                    console.warn('[ChatStorage] 壁纸压缩跳过:', err);
                }

                if (typeof callback === 'function') {
                    callback({ dataUrl: finalUrl, luma, isDark });
                }
            };
            img.onerror = function () {
                if (typeof callback === 'function') {
                    callback({ dataUrl: rawDataUrl, luma: null, isDark: null });
                }
            };
            img.src = rawDataUrl;
        };
        reader.readAsDataURL(file);
    }

    /**
     * 线上跳转线下前，将线上最近消息提炼为跨端记忆摘要，供线下短期记忆读取
     */
    function syncOnlineContext(messages) {
        if (!Array.isArray(messages) || messages.length === 0) return;
        const compactMessages = messages.slice(-30).map(m => {
            if (m.type === 'image' && typeof m.url === 'string' && m.url.length > 120000) {
                return { ...m, url: '' };
            }
            return m;
        });
        save(KEYS.ONLINE_MESSAGES, compactMessages);

        const recentText = messages
            .slice(-3)
            .map(m => {
                if (m.sender === 'system') return `[系统] ${m.text || ''}`;
                if (m.type === 'text') return `${m.sender === 'me' ? '攸攸' : 'Yosali'}: ${m.text}`;
                if (m.type === 'location') return `[位置分享] ${m.data?.name || ''}`;
                if (m.type === 'transfer') return `[转账] ¥${m.data?.amount || ''}`;
                if (m.type === 'image') return `[发送了图片]`;
                return '';
            })
            .filter(Boolean)
            .join(' | ');

        if (recentText) {
            save(KEYS.MEMORY_BRIDGE_SUMMARY, {
                source: 'online',
                content: `刚从线上聊天切换至线下：${recentText}`,
                tags: ['#线上记忆同步', '#上下文'],
                strength: '100%',
                date: '刚刚',
                updatedAt: Date.now()
            });
        }
    }

    /**
     * 线下返回线上前，记录线下最新剧情摘要
     */
    function syncOfflineContext(mode, messages, enabled) {
        if (!enabled || !Array.isArray(messages) || messages.length === 0) return;
        const last = messages[messages.length - 1];
        const tmp = document.createElement('div');
        tmp.innerHTML = last.content || last.text || '';
        const plain = (tmp.innerText || tmp.textContent || '').trim().slice(0, 60);
        if (plain) {
            save(KEYS.MEMORY_BRIDGE_SUMMARY, {
                source: 'offline',
                mode,
                content: `线下(${mode === 'chapter' ? '篇章' : '对白'})刚结束于：${plain}...`,
                tags: ['#线下归档', '#记忆连贯'],
                strength: '100%',
                date: '刚刚',
                updatedAt: Date.now()
            });
        }
    }

    global.ChatStorage = {
        KEYS,
        load,
        save,
        remove,
        getDarkMode,
        setDarkMode,
        applyDarkMode,
        getThemeAuto,
        setThemeAuto,
        extractUrlsFromBg,
        computeImageLuminance,
        detectImageDarkness,
        detectBackgroundDarkness,
        processWallpaperFile,
        syncOnlineContext,
        syncOfflineContext
    };
})(window);
