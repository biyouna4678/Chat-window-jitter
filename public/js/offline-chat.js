/**
 * 线下模式核心交互模块：
 * 对白/篇章双模式切换、消息发送与模拟回复、长按弹窗定位、多选批量删除、消息编辑与返回线上
 */
(function (global) {
    global.createOfflineChatModule = function () {
        const Data = global.OfflineData;

        return {
            /* ============ 角色常量 ============ */
            AI_AVATAR: Data.AI_AVATAR,
            USER_AVATAR: Data.USER_AVATAR,
            AI_NAME: Data.AI_NAME,
            USER_NAME: Data.USER_NAME,
            AI_SIGNATURE: Data.AI_SIGNATURE,
            USER_SIGNATURE: Data.USER_SIGNATURE,

            /* ============ 聊天状态 ============ */
            currentMode: 'dialogue',
            chatInput: '',
            pressingMsgId: null,
            pressTimer: null,
            nextMsgId: 1000,

            /* ============ 消息数据（两套独立） ============ */
            dialogueMessages: Data.getDefaultDialogueMessages(),
            chapterMessages: Data.getDefaultChapterMessages(),
            dialogueReplies: Data.getDialogueReplies(),
            chapterReplies: Data.getChapterReplies(),

            /* ============ 多选 ============ */
            isMultiSelectMode: false,
            selectedIds: [],

            /* ============ 长按菜单 ============ */
            isMenuOpen: false,
            menuPage: 1,
            currentTargetMsgId: null,
            menuPosition: { top: 0, left: 0, tailLeft: 50, isBottom: false },
            menuOptionsMap: Data.MENU_OPTIONS_MAP,

            /* ============ 编辑 ============ */
            isEditModalOpen: false,
            editingMsgId: null,
            editText: '',

            /* ============ Toast ============ */
            toastMessage: '',
            toastTimer: null,
            isLeavingOffline: false,

            /* ============ 计算属性 (保留 getter 响应式) ============ */
            get currentMessages() {
                return this.currentMode === 'chapter' ? this.chapterMessages : this.dialogueMessages;
            },
            get selectAllLabel() {
                const all = this.currentMessages.length;
                return (all > 0 && this.selectedIds.length === all) ? '取消全选' : '全选';
            },
            get currentMenuOptions() {
                if (this.currentTargetMsgId == null) return { page1: [], page2: [] };
                const msg = this.currentMessages.find(m => m.id === this.currentTargetMsgId);
                const roleKey = msg ? (msg.role || msg.sender) : null;
                return (roleKey && this.menuOptionsMap[roleKey]) || { page1: [], page2: [] };
            },

            /* ============ 跨页面返回线上 ============ */
            warmOnlineAssets() {
                const runWarm = () => {
                    const assets = [
                        './index.html',
                        './css/style.css?v=27',
                        './js/chat.js?v=27',
                        './js/call.js?v=27',
                        './js/map.js?v=27',
                        './js/transfer.js?v=27',
                        './js/jelly.js?v=27'
                    ];
                    assets.forEach(url => {
                        fetch(url, { credentials: 'same-origin' }).catch(() => {});
                    });

                    let onlineWallUrl = './assets/images/bg.jpg';
                    if (global.ChatStorage) {
                        const savedOnlineBg = global.ChatStorage.load(global.ChatStorage.KEYS.ONLINE_WALLPAPER, null);
                        const extracted = global.ChatStorage.extractUrlsFromBg(savedOnlineBg);
                        if (extracted.length > 0) onlineWallUrl = extracted[0];
                    }
                    const preloadImg = new Image();
                    preloadImg.src = onlineWallUrl;
                    if (typeof preloadImg.decode === 'function') {
                        preloadImg.decode().catch(() => {});
                    }
                };

                if ('requestIdleCallback' in global) {
                    global.requestIdleCallback(runWarm, { timeout: 1500 });
                } else {
                    setTimeout(runWarm, 600);
                }
            },

            goBackToOnline() {
                if (this.isLeavingOffline) return;
                this.isLeavingOffline = true;

                requestAnimationFrame(() => {
                    setTimeout(() => {
                        this.persistMessages();
                        if (global.ChatStorage) {
                            global.ChatStorage.syncOfflineContext(
                                this.currentMode,
                                this.currentMessages,
                                this.memorySync
                            );
                        }
                        try {
                            sessionStorage.setItem('chatwindow_nav_from', 'offline');
                        } catch (_) {}
                        window.location.assign('./index.html');
                    }, 180);
                });
            },

            /* ============ 持久化消息 ============ */
            persistMessages() {
                if (!global.ChatStorage) return;
                global.ChatStorage.save(global.ChatStorage.KEYS.OFFLINE_DIALOGUE, this.dialogueMessages);
                global.ChatStorage.save(global.ChatStorage.KEYS.OFFLINE_CHAPTER, this.chapterMessages);
            },

            restoreMessages() {
                if (!global.ChatStorage) return;
                const savedDialogue = global.ChatStorage.load(global.ChatStorage.KEYS.OFFLINE_DIALOGUE, null);
                const savedChapter = global.ChatStorage.load(global.ChatStorage.KEYS.OFFLINE_CHAPTER, null);
                if (Array.isArray(savedDialogue) && savedDialogue.length > 0) {
                    this.dialogueMessages = savedDialogue;
                }
                if (Array.isArray(savedChapter) && savedChapter.length > 0) {
                    this.chapterMessages = savedChapter;
                }
                const maxId = Math.max(
                    1000,
                    ...this.dialogueMessages.map(m => Number(m.id) || 0),
                    ...this.chapterMessages.map(m => Number(m.id) || 0)
                );
                this.nextMsgId = maxId;
            },

            /* ============ 工具 ============ */
            escapeHtml(str) {
                return String(str).replace(/[&<>"']/g, s => ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;'
                }[s]));
            },
            stripHtml(html) {
                const tmp = document.createElement('div');
                tmp.innerHTML = html;
                return tmp.innerText || tmp.textContent || '';
            },
            showToast(msg) {
                this.toastMessage = msg;
                clearTimeout(this.toastTimer);
                this.toastTimer = setTimeout(() => { this.toastMessage = ''; }, 2500);
            },
            scrollToBottom() {
                this.$nextTick(() => {
                    const area = document.getElementById('chat-area');
                    if (area) area.scrollTop = area.scrollHeight;
                });
            },

            /* ============ 渲染辅助 ============ */
            rowClasses(msg) {
                const c = [];
                if (msg.role === 'system' || msg.sender === 'system') c.push('system');
                else if (msg.role === 'narration') c.push('narration');
                else if (msg.role === 'ai') c.push('left');
                else c.push('right');
                if (this.selectedIds.includes(msg.id)) c.push('selected');
                return c.join(' ');
            },
            chapterClasses(msg) {
                const c = [];
                if (msg.role === 'system' || msg.sender === 'system') c.push('system');
                if (msg.role === 'narration') c.push('narration');
                if (msg.role === 'user') c.push('right');
                if (this.selectedIds.includes(msg.id)) c.push('selected');
                return c.join(' ');
            },

            /* ============ 发送消息 ============ */
            sendMessage() {
                const text = this.chatInput.trim();
                if (!text) return;

                const isChapter = this.currentMode === 'chapter';
                const arr = isChapter ? this.chapterMessages : this.dialogueMessages;
                arr.push({
                    id: ++this.nextMsgId,
                    role: 'user',
                    content: isChapter ? this.escapeHtml(text) : text,
                    name: this.USER_NAME,
                    avatar: this.USER_AVATAR,
                    signature: this.USER_SIGNATURE
                });

                this.chatInput = '';
                this.persistMessages();
                this.scrollToBottom();

                setTimeout(() => {
                    const replyMode = this.currentMode;
                    const targetArr = replyMode === 'chapter' ? this.chapterMessages : this.dialogueMessages;
                    const pool = replyMode === 'chapter' ? this.chapterReplies : this.dialogueReplies;
                    const reply = pool[Math.floor(Math.random() * pool.length)];
                    targetArr.push({
                        id: ++this.nextMsgId,
                        role: 'ai',
                        content: reply,
                        name: this.AI_NAME,
                        avatar: this.AI_AVATAR,
                        signature: this.AI_SIGNATURE
                    });
                    this.persistMessages();
                    if (this.currentMode === replyMode) this.scrollToBottom();
                }, 1200);
            },

            /* ============ 模式切换 ============ */
            setMode(mode) {
                if (this.isMultiSelectMode) this.cancelMultiSelect();
                if (this.isMenuOpen) this.hideMenu();
                this.currentMode = mode;
                if (typeof this.persistSettings === 'function') this.persistSettings();
                this.scrollToBottom();
            },

            /* ============ 长按交互与弹出菜单定位 ============ */
            handleRowClick(e, msg) {
                if (this.isMultiSelectMode) {
                    e.stopPropagation();
                    this.toggleSelect(msg.id);
                }
            },
            startPress(e, msg, targetEl) {
                if (this.isMultiSelectMode || this.isMenuOpen) return;
                this.currentTargetMsgId = msg.id;
                this.pressingMsgId = msg.id;
                this.pressTimer = setTimeout(() => {
                    this.showMenu(msg.id, targetEl);
                }, 400);
            },
            endPress() {
                clearTimeout(this.pressTimer);
                if (!this.isMenuOpen) this.pressingMsgId = null;
            },
            cancelPress() {
                clearTimeout(this.pressTimer);
                if (!this.isMenuOpen) this.pressingMsgId = null;
            },
            showMenuFromEvent(e, msg, targetEl) {
                if (this.isMultiSelectMode || this.isMenuOpen) return;
                this.currentTargetMsgId = msg.id;
                this.pressingMsgId = msg.id;
                this.showMenu(msg.id, targetEl);
            },
            showMenu(msgId, targetEl) {
                this.currentTargetMsgId = msgId;
                this.menuPage = 1;
                this.isMenuOpen = true;
                this.$nextTick(() => {
                    this.updateMenuPosition(targetEl);
                });
            },
            updateMenuPosition(targetEl) {
                if (!targetEl) return;
                const rect = targetEl.getBoundingClientRect();
                const popup = document.getElementById('feedbackPopup');
                if (!popup) return;

                const popupWidth = popup.offsetWidth;
                const popupHeight = popup.offsetHeight;
                const spacing = 12;

                let top, isBottom;
                if (rect.top > popupHeight + spacing + 20) {
                    top = rect.top - popupHeight - spacing;
                    isBottom = false;
                } else {
                    top = rect.bottom + spacing;
                    isBottom = true;
                }

                let left = rect.left + (rect.width / 2) - (popupWidth / 2);
                if (left < 10) left = 10;
                if (left + popupWidth > window.innerWidth - 10) left = window.innerWidth - popupWidth - 10;

                if (top + popupHeight > window.innerHeight - 10) {
                    top = window.innerHeight - popupHeight - 10;
                }

                const contentCenterX = rect.left + (rect.width / 2);
                let tailLeft = contentCenterX - left;
                if (tailLeft < 20) tailLeft = 20;
                if (tailLeft > popupWidth - 20) tailLeft = popupWidth - 20;

                this.menuPosition = { top, left, tailLeft, isBottom };
            },
            hideMenu() {
                if (!this.isMenuOpen) return;
                this.isMenuOpen = false;
                this.currentTargetMsgId = null;
                this.pressingMsgId = null;
            },

            /* ============ 菜单动作 ============ */
            handleAction(action) {
                if (this.currentTargetMsgId == null) return;
                const msgId = this.currentTargetMsgId;
                const msg = this.currentMessages.find(m => m.id === msgId);
                if (!msg) { this.hideMenu(); return; }

                const isChapter = this.currentMode === 'chapter';
                const contentText = this.stripHtml(msg.content);
                this.hideMenu();

                if (action === 'like') {
                    this.showToast('Ta 似乎感受到了你的喜欢');
                } else if (action === 'dislike') {
                    this.showToast('Ta 暗自记下了你的雷区');
                } else if (action === 'edit') {
                    this.editingMsgId = msgId;
                    this.editText = contentText;
                    this.isEditModalOpen = true;
                } else if (action === 'copy') {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(contentText).then(() => this.showToast('已复制')).catch(() => this.showToast('已复制'));
                    } else {
                        this.showToast('当前环境不支持剪贴板写入');
                    }
                } else if (action === 'delete') {
                    this.removeMessageById(msgId);
                    this.persistMessages();
                    this.showToast('消息已删除');
                } else if (action === 'undo') {
                    if (msg.role === 'user') {
                        this.removeMessageById(msgId);
                        this.persistMessages();
                        this.showToast('消息已撤回');
                    }
                } else if (action === 'regenerate') {
                    const loading = '时间倒流，Ta 正在重新斟酌字句...';
                    msg.content = isChapter ? this.escapeHtml(loading) : loading;

                    setTimeout(() => {
                        const newText = isChapter
                            ? '<span class="action-text">她顿了顿，目光落在窗外被雨水打湿的街道上，霓虹在水面上碎成一地的光。</span><br><br><span class="dialogue-text">"那就……等下一个雨季吧。"</span><span class="action-text">她说完便收回视线，指尖在桌面轻轻扣了两下，像是给这段对话画上了句点。</span>'
                            : '她微微愣了一下，随即低下头，轻声道："那就……等下一个雨季吧。"';
                        msg.content = newText;
                        this.persistMessages();
                    }, 1500);
                } else if (action === 'multi') {
                    this.enterMultiSelectMode();
                }
            },
            removeMessageById(id) {
                const arr = this.currentMessages;
                const idx = arr.findIndex(m => m.id === id);
                if (idx > -1) arr.splice(idx, 1);
            },

            /* ============ 多选 ============ */
            enterMultiSelectMode() {
                this.isMultiSelectMode = true;
                this.selectedIds = [];
            },
            toggleSelect(id) {
                const idx = this.selectedIds.indexOf(id);
                if (idx > -1) this.selectedIds.splice(idx, 1);
                else this.selectedIds.push(id);
            },
            toggleSelectAll() {
                const all = this.currentMessages;
                if (this.selectedIds.length === all.length) {
                    this.selectedIds = [];
                } else {
                    this.selectedIds = all.map(m => m.id);
                }
            },
            cancelMultiSelect() {
                this.isMultiSelectMode = false;
                this.selectedIds = [];
            },
            deleteSelectedMessages() {
                if (this.selectedIds.length === 0) {
                    this.showToast('未选择任何消息');
                    return;
                }
                const arr = this.currentMessages;
                for (let i = arr.length - 1; i >= 0; i--) {
                    if (this.selectedIds.includes(arr[i].id)) arr.splice(i, 1);
                }
                this.persistMessages();
                this.cancelMultiSelect();
                this.showToast('已批量删除');
            },

            /* ============ 编辑弹窗 ============ */
            closeEditModal() {
                this.isEditModalOpen = false;
                this.editingMsgId = null;
                this.editText = '';
            },
            saveEditMessage() {
                if (this.editingMsgId == null) return;
                const text = this.editText.trim();
                if (!text) return;

                const msg = this.currentMessages.find(m => m.id === this.editingMsgId);
                if (msg) {
                    msg.content = this.currentMode === 'chapter' ? this.escapeHtml(text) : text;
                    this.persistMessages();
                }
                this.closeEditModal();
            }
        };
    };
})(window);
