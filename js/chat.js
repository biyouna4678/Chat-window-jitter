document.addEventListener('alpine:init', () => {
    Alpine.data('chatApp', () => ({
        isMenuOpen: false,
        isDarkMode: false,
        autoThemeByWallpaper: true,
        hasCustomWallpaper: false,
        isTransitioningOffline: false,
        onlineToast: '',
        onlineToastTimer: null,
        showCallSelector: false,
        messageText: '',
        showToolsPanel: false,
        currentPage: 0,
        touchStartX: 0,

        showImagePreview: false,
        previewImageUrl: '',

        messages: [
            { id: 0, type: 'system', sender: 'system', text: '今夜 22:46 · 已进入薄荷站台' },
            { id: 1, type: 'text', sender: 'me', text: '今夜 22:47，雨停在薄荷色的铁轨上。', time: '今夜 22:47' },
            { id: 2, type: 'text', sender: 'yosali', text: '幸福 は 透明色 の まま，', time: '今夜 22:48' },
            { id: 3, type: 'text', sender: 'me', text: '拥有的時候看不見，檢票時才聽見心跳。', time: '今夜 22:49' },
            { id: 4, type: 'text', sender: 'yosali', text: '我把眼淚折成一枚透明車票，塞进猫邮差的铃铛包。', time: '今夜 22:50' },
            { id: 5, type: 'text', sender: 'me', text: 'もしもし、ほしくずさん——', time: '今夜 22:51' },
            { id: 6, type: 'text', sender: 'yosali', text: '请把这封没有地址的信，送到他梦里。', time: '今夜 22:52' }
        ],

        page1: [
            { name: '重回', icon: 'https://i.ibb.co/ycNx3M9d/732-20261017191902.png' },
            { name: '图片', icon: 'https://i.ibb.co/KzVkbYvK/732-20261017191809.png' },
            { name: '拍摄', icon: 'https://i.ibb.co/GYrfdvL/732-20261017191812.png' },
            { name: '语音通话', icon: 'https://i.ibb.co/XZzxhBjK/732-20261017191846.png' },
            { name: '视频通话', icon: 'https://i.ibb.co/SDpwKfYx/732-20261017191841.png' },
            { name: '位置', icon: 'https://i.ibb.co/HprpxH93/732-20261017191851.png' },
            { name: '转账', icon: 'https://i.ibb.co/wZjfGXbP/732-20261017191925.png' },
            { name: '线下模式', icon: 'https://i.ibb.co/0VYRSsTC/732-20261017191957.png' }
        ],
        page2: [
            { name: '礼物', icon: 'https://i.ibb.co/PGmgb89t/732-20261017191936.png' },
            { name: '好友名片', icon: 'https://i.ibb.co/9kGjp5wp/732-20261017191950.png' },
            { name: '一起听', icon: 'https://i.ibb.co/W4Mw368g/732-20261017193040.png' },
            { name: '日记', icon: 'https://i.ibb.co/ZZzDFjNgH/732-20261017191856.png' },
            { name: '游戏', icon: 'https://i.ibb.co/nqjCBx4N/732-20261017191940.png' },
            { name: '链接', icon: 'https://i.ibb.co/pjNPsrPP/732-20261017191930.png' }
        ],

        initChat() {
            const hasPresetDark = document.body.classList.contains('theme-dark') || document.documentElement.classList.contains('theme-dark');
            const prefersDark = Boolean(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

            if (window.ChatStorage) {
                const savedBg = window.ChatStorage.load(window.ChatStorage.KEYS.ONLINE_WALLPAPER, null);
                if (savedBg) {
                    document.documentElement.style.setProperty('--chat-wallpaper', savedBg);
                    this.hasCustomWallpaper = true;
                }

                this.autoThemeByWallpaper = window.ChatStorage.getThemeAuto();
                if (this.autoThemeByWallpaper) {
                    const cachedOnline = window.ChatStorage.load(window.ChatStorage.KEYS.ONLINE_THEME_DARK, null);
                    this.isDarkMode = cachedOnline !== null ? Boolean(cachedOnline) : hasPresetDark;
                    window.ChatStorage.applyDarkMode(this.isDarkMode, 'online');
                    this.detectOnlineWallpaperTheme(false);
                } else {
                    const stored = window.ChatStorage.load(window.ChatStorage.KEYS.THEME_DARK, null);
                    this.isDarkMode = stored !== null ? Boolean(stored) : (hasPresetDark || prefersDark);
                    window.ChatStorage.applyDarkMode(this.isDarkMode, 'online');
                }
            } else {
                this.isDarkMode = hasPresetDark || prefersDark;
            }

            this.scrollToBottom();
            this.warmOfflineAssets();
        },

        showOnlineToast(msg) {
            this.onlineToast = msg;
            clearTimeout(this.onlineToastTimer);
            this.onlineToastTimer = setTimeout(() => {
                this.onlineToast = '';
            }, 2400);
        },

        detectOnlineWallpaperTheme(announce) {
            if (!window.ChatStorage) return;
            const savedBg = window.ChatStorage.load(window.ChatStorage.KEYS.ONLINE_WALLPAPER, null);
            const fallbackUrls = savedBg
                ? window.ChatStorage.extractUrlsFromBg(savedBg)
                : ['./assets/images/bg.jpg', '/assets/images/bg.jpg', 'https://i.ibb.co/RTjD5DMN/IMG-9263.jpg'];

            window.ChatStorage.detectBackgroundDarkness(document.body, fallbackUrls, (res) => {
                if (res && res.isDark !== null && this.autoThemeByWallpaper) {
                    this.isDarkMode = res.isDark;
                    window.ChatStorage.applyDarkMode(this.isDarkMode, 'online');
                    if (announce) {
                        this.showOnlineToast(`已根据壁纸亮度自动适配${this.isDarkMode ? '深色' : '浅色'}玻璃`);
                    }
                }
            });
        },

        toggleDarkMode() {
            this.isDarkMode = !this.isDarkMode;
            this.autoThemeByWallpaper = false;
            if (window.ChatStorage) {
                window.ChatStorage.setThemeAuto(false);
                window.ChatStorage.setDarkMode(this.isDarkMode, 'online');
            } else {
                document.body.classList.toggle('theme-dark', this.isDarkMode);
                document.documentElement.classList.toggle('theme-dark', this.isDarkMode);
            }
            this.showOnlineToast(`已手动切换为${this.isDarkMode ? '深色' : '浅色'}玻璃`);
        },

        toggleAutoTheme() {
            this.autoThemeByWallpaper = !this.autoThemeByWallpaper;
            if (window.ChatStorage) {
                window.ChatStorage.setThemeAuto(this.autoThemeByWallpaper);
            }
            if (this.autoThemeByWallpaper) {
                this.detectOnlineWallpaperTheme(true);
            } else {
                this.showOnlineToast('已关闭壁纸亮度自动识别');
            }
        },

        openOnlineWallpaperPicker() {
            const el = document.getElementById('online-wallpaper-picker');
            if (el) el.click();
        },

        handleOnlineWallpaperUpload(event) {
            const file = event.target.files && event.target.files[0];
            if (!file) return;
            if (!window.ChatStorage) return;

            window.ChatStorage.processWallpaperFile(file, ({ dataUrl, isDark }) => {
                const bgVal = `url('${dataUrl}')`;
                document.documentElement.style.setProperty('--chat-wallpaper', bgVal);
                window.ChatStorage.save(window.ChatStorage.KEYS.ONLINE_WALLPAPER, bgVal);
                this.hasCustomWallpaper = true;

                // 更换壁纸后自动识别其亮度并切换玻璃质感
                this.autoThemeByWallpaper = true;
                window.ChatStorage.setThemeAuto(true);
                if (isDark !== null) {
                    this.isDarkMode = isDark;
                    window.ChatStorage.applyDarkMode(this.isDarkMode, 'online');
                    this.showOnlineToast(`壁纸已更新 · 自动识别为${this.isDarkMode ? '深色' : '浅色'}玻璃`);
                } else {
                    this.showOnlineToast('聊天壁纸已更新');
                }
            });
            event.target.value = '';
        },

        resetOnlineWallpaper() {
            if (!window.ChatStorage) return;
            window.ChatStorage.remove(window.ChatStorage.KEYS.ONLINE_WALLPAPER);
            document.documentElement.style.removeProperty('--chat-wallpaper');
            this.hasCustomWallpaper = false;
            this.autoThemeByWallpaper = true;
            window.ChatStorage.setThemeAuto(true);
            this.detectOnlineWallpaperTheme(false);
            this.showOnlineToast('已恢复默认壁纸并自动适配');
        },

        warmOfflineAssets() {
            const runWarm = () => {
                const assets = [
                    './offline.html',
                    './css/offline-base.css?v=26',
                    './css/offline-components.css?v=26',
                    './js/offline-data.js?v=26',
                    './js/offline-chat.js?v=26',
                    './js/offline-settings.js?v=26',
                    './js/offline-app.js?v=26'
                ];
                assets.forEach(url => {
                    fetch(url, { credentials: 'same-origin' }).catch(() => {});
                });

                // 预解码线下模式壁纸，消除跳转后首次渲染大图解码卡顿
                let offlineWallUrl = './assets/images/offline-bg.jpg';
                if (window.ChatStorage) {
                    const savedOfflineBg = window.ChatStorage.load(window.ChatStorage.KEYS.OFFLINE_WALLPAPER, null);
                    const extracted = window.ChatStorage.extractUrlsFromBg(savedOfflineBg);
                    if (extracted.length > 0) offlineWallUrl = extracted[0];
                }
                const preloadImg = new Image();
                preloadImg.src = offlineWallUrl;
                if (typeof preloadImg.decode === 'function') {
                    preloadImg.decode().catch(() => {});
                }
            };

            if ('requestIdleCallback' in window) {
                window.requestIdleCallback(runWarm, { timeout: 1500 });
            } else {
                setTimeout(runWarm, 600);
            }
        },

        enterOfflineMode() {
            if (this.isTransitioningOffline) return;
            // 关键优化：不收起 showToolsPanel，防止输入框与布局发生跳变和重排
            this.isTransitioningOffline = true;

            requestAnimationFrame(() => {
                setTimeout(() => {
                    if (window.ChatStorage) {
                        window.ChatStorage.syncOnlineContext(this.messages);
                    }
                    try {
                        sessionStorage.setItem('chatwindow_nav_from', 'online');
                    } catch (_) {}
                    window.location.assign('./offline.html');
                }, 180);
            });
        },

        addSystemMessage(text) {
            const content = String(text || '').trim();
            if (!content) return;
            this.messages.push({
                id: Date.now(),
                type: 'system',
                sender: 'system',
                text: content
            });
            this.scrollToBottom();
        },

        hasText() {
            return this.messageText.trim().length > 0;
        },

        handleTouchStart(e) {
            this.touchStartX = e.changedTouches[0].screenX;
        },

        handleTouchEnd(e) {
            let touchEndX = e.changedTouches[0].screenX;
            if (this.touchStartX - touchEndX > 50 && this.currentPage === 0) { this.currentPage = 1; }
            else if (touchEndX - this.touchStartX > 50 && this.currentPage === 1) { this.currentPage = 0; }
        },

        handleToolClick(item) {
            if (item.name === '线下模式') {
                this.enterOfflineMode();
                return;
            }

            this.showToolsPanel = false;

            switch (item.name) {
                case '图片':
                    this.openFilePicker();
                    break;
                case '拍摄':
                    this.openCamera();
                    break;
                case '语音通话':
                    this.startCall('voice', 'calling');
                    break;
                case '视频通话':
                    this.startCall('video', 'calling');
                    break;
                case '位置':
                    this.showLocationModal = true;
                    break;
                case '转账':
                    this.isTransferModalOpen = true;
                    break;
                default:
                    console.log('点击了待开发功能:', item.name);
            }
        },

        openFilePicker() {
            document.getElementById('native-file-picker').click();
        },

        openCamera() {
            document.getElementById('native-camera-picker').click();
        },

        scrollToBottom() {
            this.$nextTick(() => {
                const c = document.getElementById('chat-scroll');
                if (c) c.scrollTop = c.scrollHeight;
            });
        },

        sendMessage() {
            if (!this.messageText.trim()) return;
            const now = new Date();
            const timeStr = `今天 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

            this.messages.push({
                id: Date.now(),
                type: 'text',
                sender: 'me',
                text: this.messageText.trim(),
                time: timeStr
            });

            this.messageText = '';
            this.scrollToBottom();
        },

        handleImageUpload(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                const now = new Date();
                const timeStr = `今天 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                this.messages.push({
                    id: Date.now(),
                    type: 'image',
                    sender: 'me',
                    url: e.target.result,
                    time: timeStr
                });
                this.scrollToBottom();
            };
            reader.readAsDataURL(file);
            event.target.value = '';
        },

        saveImage(url) {
            const a = document.createElement('a');
            a.href = url;
            a.download = 'chat-image-' + Date.now() + '.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }));
});
