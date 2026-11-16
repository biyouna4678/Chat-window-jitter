/**
 * 线下模式 Alpine 根组装入口：
 * 聚合 offline-chat 与 offline-settings（完整保留 getter 描述符），并挂载全局防缩放与防选中监听
 */
(function (global) {
    function mergeWithDescriptors(target, ...sources) {
        sources.forEach(src => {
            if (src) {
                Object.defineProperties(target, Object.getOwnPropertyDescriptors(src));
            }
        });
        return target;
    }

    document.addEventListener('alpine:init', () => {
        Alpine.data('offlineApp', () => {
            const chatMod = global.createOfflineChatModule();
            const settingsMod = global.createOfflineSettingsModule();

            const root = mergeWithDescriptors({}, chatMod, settingsMod, {
                init() {
                    // 1. 从本地存储恢复设定与消息
                    this.restoreSettings();
                    this.restoreMessages();
                    this.scrollToBottom();

                    // 2. 自动持久化核心状态变化
                    this.$watch('statusText', () => this.persistSettings());
                    this.$watch('theaterHtml', () => this.persistSettings());
                    this.$watch('minWords', () => this.persistSettings());
                    this.$watch('maxWords', () => this.persistSettings());

                    // 3. 全局点击空白处关闭长按弹出菜单
                    document.addEventListener('touchstart', (e) => {
                        if (this.isMenuOpen && !e.target.closest('#feedbackPopup') && !this.isMultiSelectMode) {
                            this.hideMenu();
                        }
                    });
                    document.addEventListener('mousedown', (e) => {
                        if (this.isMenuOpen && !e.target.closest('#feedbackPopup') && !this.isMultiSelectMode) {
                            this.hideMenu();
                        }
                    });

                    // 4. 全局禁止文本选中
                    document.addEventListener('selectstart', (e) => {
                        if (!e.target.closest || !e.target.closest('input, textarea')) {
                            e.preventDefault();
                        }
                    }, { passive: false });

                    // 5. 篇章区域 contextmenu 兜底拦截
                    document.addEventListener('contextmenu', (e) => {
                        if (e.target.closest('.chapter-bubble, .chapter-paragraph, .chapter-item')) {
                            e.preventDefault();
                        }
                    });
                }
            });

            return root;
        });
    });

    // 彻底禁用 iOS Safari 双指缩放、手势缩放与快速双击放大
    document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gestureend', (e) => e.preventDefault(), { passive: false });
    window.addEventListener('touchmove', (e) => {
        if (e.scale && e.scale !== 1) e.preventDefault();
    }, { passive: false });

    let lastTouch = 0;
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouch <= 300) {
            // 允许输入框/弹窗内操作，仅拦截连续双击放大行为
            if (!e.target.closest || !e.target.closest('input, textarea')) {
                e.preventDefault();
            }
        }
        lastTouch = now;
    }, { passive: false });
})(window);
