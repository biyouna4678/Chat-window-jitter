/**
 * 跨页面共享存储与记忆同步中枢 (index.html <-> offline.html)
 * 安全封装 localStorage，兼容 Safari 无痕模式与容量限制
 */
(function (global) {
    const PREFIX = 'chatwindow_v1_';

    const KEYS = {
        ONLINE_MESSAGES: PREFIX + 'online_messages',
        OFFLINE_DIALOGUE: PREFIX + 'offline_dialogue_messages',
        OFFLINE_CHAPTER: PREFIX + 'offline_chapter_messages',
        OFFLINE_SETTINGS: PREFIX + 'offline_settings',
        OFFLINE_WALLPAPER: PREFIX + 'offline_wallpaper',
        OFFLINE_FONT: PREFIX + 'offline_custom_font',
        OFFLINE_MEMORY_DB: PREFIX + 'offline_memory_db',
        MEMORY_BRIDGE_SUMMARY: PREFIX + 'memory_bridge_summary'
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

    /**
     * 线上跳转线下前，将线上最近消息提炼为跨端记忆摘要，供线下短期记忆读取
     */
    function syncOnlineContext(messages) {
        if (!Array.isArray(messages) || messages.length === 0) return;
        save(KEYS.ONLINE_MESSAGES, messages);
        const recentText = messages
            .slice(-3)
            .map(m => {
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
        tmp.innerHTML = last.content || '';
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
        syncOnlineContext,
        syncOfflineContext
    };
})(window);
