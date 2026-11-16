/**
 * 线下模式设定与美化引擎：
 * 统一收口所有原分散开关（人称、修辞、节奏、记忆开关、防OOC开关、世界书、NPC、演进规则）
 * 并管理 10 个功能弹窗、自定义 CSS/字体/壁纸 与 JSON 主题导入导出
 */
(function (global) {
    global.createOfflineSettingsModule = function () {
        const Data = global.OfflineData;

        return {
            /* ============ 设置页导航 ============ */
            showSettingsPanel: false,
            activeTab: 'settings',

            /* ============ 统一收口的设定状态 ============ */
            perspective: 'third',       // 'first' | 'second' | 'third'
            minWords: 550,
            maxWords: 700,
            rhetoricDensity: 'moderate', // 'simple' | 'moderate' | 'ornate'
            narrativePace: 'moderate',   // 'fast' | 'moderate' | 'slow'

            /* ============ 记忆连贯 & 防 OOC 开关 ============ */
            memorySync: true,
            semanticRecall: true,
            forgettingCurve: true,
            personaFilter: true,
            similarityCheck: true,
            dynamicEvolution: true,
            preferenceLearning: false,

            /* ============ 世界书 & NPC & 规则 ============ */
            worldBookLayers: Data.getDefaultWorldBookLayers(),
            npcMode: 'group', // 'group' | 'single'
            npcs: Data.getDefaultNpcs(),
            learningRules: Data.getDefaultLearningRules(),
            correctionRules: Data.getDefaultCorrectionRules(),

            /* ============ 美化配置 ============ */
            isDarkMode: false,
            statusText: 'Night reveals stars the daylight cannot show.',
            customCss: '',
            statusBarCss: '',
            theaterHtml: '',

            /* ============ 10 大弹窗显示状态 ============ */
            showWorldBookModal: false,
            showNpcModal: false,
            showPresetModal: false,
            showSystemPromptModal: false,
            showCustomStyleModal: false,
            showMemoryModal: false,
            showMemoryDetailModal: false,
            showEvolutionModal: false,
            showRulesModal: false,
            showBranchModal: false,
            showLoraInfo: false,

            /* ============ 预设 / 提示词 / 分支 ============ */
            presets: ['默认设定'],
            currentPreset: '默认设定',
            presetConfigs: {},
            newPresetName: '',
            showSavePresetInput: false,

            systemPromptTitle: '',
            systemPromptContent: '',

            branches: ['主线剧情 (当前存档)'],
            currentBranch: '主线剧情 (当前存档)',
            branchSnapshots: {},

            /* ============ 文风 ============ */
            builtinStyles: Data.BUILTIN_STYLES,
            customStyles: [],
            customStyleDescriptions: {},
            currentStyle: '温柔细腻',
            newStyleName: '',
            newStyleDesc: '',

            /* ============ 禁词 ============ */
            globalBadwords: [],
            localBadwords: [],
            globalBadwordInput: '',
            localBadwordInput: '',

            /* ============ 记忆图谱 ============ */
            memoryDetailTitle: '',
            memoryDetailList: [],
            memoryDB: Data.getDefaultMemoryDB(),

            /* ============ 实时计算短期记忆条数 ============ */
            get shortMemoryCountText() {
                const bridge = global.ChatStorage
                    ? global.ChatStorage.load(global.ChatStorage.KEYS.MEMORY_BRIDGE_SUMMARY, null)
                    : null;
                const extra = bridge ? 1 : 0;
                const len = (this.memoryDB.short?.length || 0) + extra;
                return `${len} 项`;
            },

            /* ============ 持久化读写 ============ */
            collectSettingsSnapshot() {
                return {
                    currentMode: this.currentMode,
                    perspective: this.perspective,
                    minWords: this.minWords,
                    maxWords: this.maxWords,
                    rhetoricDensity: this.rhetoricDensity,
                    narrativePace: this.narrativePace,
                    memorySync: this.memorySync,
                    semanticRecall: this.semanticRecall,
                    forgettingCurve: this.forgettingCurve,
                    personaFilter: this.personaFilter,
                    similarityCheck: this.similarityCheck,
                    dynamicEvolution: this.dynamicEvolution,
                    preferenceLearning: this.preferenceLearning,
                    worldBookLayers: this.worldBookLayers,
                    npcMode: this.npcMode,
                    npcs: this.npcs,
                    learningRules: this.learningRules,
                    correctionRules: this.correctionRules,
                    statusText: this.statusText,
                    customCss: this.customCss,
                    statusBarCss: this.statusBarCss,
                    theaterHtml: this.theaterHtml,
                    presets: this.presets,
                    currentPreset: this.currentPreset,
                    presetConfigs: this.presetConfigs,
                    systemPromptTitle: this.systemPromptTitle,
                    systemPromptContent: this.systemPromptContent,
                    branches: this.branches,
                    currentBranch: this.currentBranch,
                    branchSnapshots: this.branchSnapshots,
                    customStyles: this.customStyles,
                    customStyleDescriptions: this.customStyleDescriptions,
                    currentStyle: this.currentStyle,
                    globalBadwords: this.globalBadwords,
                    localBadwords: this.localBadwords
                };
            },

            persistSettings() {
                if (!global.ChatStorage) return;
                global.ChatStorage.save(
                    global.ChatStorage.KEYS.OFFLINE_SETTINGS,
                    this.collectSettingsSnapshot()
                );
            },

            restoreSettings() {
                if (!global.ChatStorage) return;
                const saved = global.ChatStorage.load(global.ChatStorage.KEYS.OFFLINE_SETTINGS, null);
                if (saved && typeof saved === 'object') {
                    const keys = Object.keys(this.collectSettingsSnapshot());
                    keys.forEach(k => {
                        if (saved[k] !== undefined) {
                            this[k] = saved[k];
                        }
                    });
                }

                // 恢复并同步深浅色模式
                const hasPresetDark = document.body.classList.contains('theme-dark') || document.documentElement.classList.contains('theme-dark');
                const prefersDark = Boolean(global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches);
                const storedDark = global.ChatStorage.load(global.ChatStorage.KEYS.THEME_DARK, null);
                this.isDarkMode = storedDark !== null ? Boolean(storedDark) : (hasPresetDark || prefersDark);
                global.ChatStorage.applyDarkMode(this.isDarkMode);

                // 恢复自定义壁纸
                const savedBg = global.ChatStorage.load(global.ChatStorage.KEYS.OFFLINE_WALLPAPER, null);
                if (savedBg) {
                    const layer = document.querySelector('.bg-layer');
                    if (layer) layer.style.backgroundImage = savedBg;
                }

                // 恢复自定义字体
                const savedFont = global.ChatStorage.load(global.ChatStorage.KEYS.OFFLINE_FONT, null);
                if (savedFont) {
                    this.injectCustomFont(savedFont);
                }

                // 注入自定义 CSS 与状态栏 CSS
                this.applyCustomCSS();
                this.applyStatusBarCSS();
            },

            toggleDarkMode() {
                this.isDarkMode = !this.isDarkMode;
                if (global.ChatStorage) {
                    global.ChatStorage.setDarkMode(this.isDarkMode);
                } else {
                    document.body.classList.toggle('theme-dark', this.isDarkMode);
                    document.documentElement.classList.toggle('theme-dark', this.isDarkMode);
                }
            },

            /* ============ 世界书三态切换 ============ */
            cycleWbItemState(item) {
                if (item.state === 'always') {
                    item.state = 'keyword';
                } else if (item.state === 'keyword') {
                    item.state = 'disabled';
                } else {
                    item.state = 'always';
                }
                this.persistSettings();
            },
            wbStateLabel(state) {
                if (state === 'always') return '始终';
                if (state === 'keyword') return '关键词';
                return '禁用';
            },
            wbStateClass(state) {
                if (state === 'always') return 'state-always';
                if (state === 'keyword') return 'state-keyword';
                return 'state-disabled';
            },

            /* ============ 预设与专属提示词 ============ */
            openPresetModal() {
                this.showSavePresetInput = false;
                this.newPresetName = '';
                this.showPresetModal = true;
            },
            selectPreset(name) {
                this.currentPreset = name;
                const snap = this.presetConfigs[name];
                if (snap) {
                    if (snap.perspective) this.perspective = snap.perspective;
                    if (snap.minWords) this.minWords = snap.minWords;
                    if (snap.maxWords) this.maxWords = snap.maxWords;
                    if (snap.currentStyle) this.currentStyle = snap.currentStyle;
                    if (snap.rhetoricDensity) this.rhetoricDensity = snap.rhetoricDensity;
                    if (snap.narrativePace) this.narrativePace = snap.narrativePace;
                    if (snap.systemPromptTitle !== undefined) this.systemPromptTitle = snap.systemPromptTitle;
                    if (snap.systemPromptContent !== undefined) this.systemPromptContent = snap.systemPromptContent;
                }
                this.persistSettings();
                this.showPresetModal = false;
                this.showToast(`已切换至：${name}`);
            },
            saveNewPreset() {
                const name = this.newPresetName.trim();
                if (!name) {
                    this.showToast('请输入预设名称');
                    return;
                }
                if (!this.presets.includes(name)) this.presets.push(name);
                this.presetConfigs[name] = {
                    perspective: this.perspective,
                    minWords: this.minWords,
                    maxWords: this.maxWords,
                    currentStyle: this.currentStyle,
                    rhetoricDensity: this.rhetoricDensity,
                    narrativePace: this.narrativePace,
                    systemPromptTitle: this.systemPromptTitle,
                    systemPromptContent: this.systemPromptContent
                };
                this.currentPreset = name;
                this.newPresetName = '';
                this.showSavePresetInput = false;
                this.showPresetModal = false;
                this.persistSettings();
                this.showToast(`已保存新预设：${name}`);
            },
            saveSystemPrompt() {
                const title = this.systemPromptTitle.trim();
                if (!title) {
                    this.showToast('请填写提示词标题');
                    return;
                }
                this.showSystemPromptModal = false;
                this.persistSettings();
                this.showToast('预设专属提示词已保存');
            },

            /* ============ 文风 ============ */
            saveCustomStyle() {
                const name = this.newStyleName.trim();
                if (!name) {
                    this.showToast('请填写文风名称');
                    return;
                }
                if (!this.customStyles.includes(name)) {
                    this.customStyles.push(name);
                }
                if (this.newStyleDesc.trim()) {
                    this.customStyleDescriptions[name] = this.newStyleDesc.trim();
                }
                this.currentStyle = name;
                this.showCustomStyleModal = false;
                this.persistSettings();
                this.showToast(`已保存并应用文风：${name}`);
                this.newStyleName = '';
                this.newStyleDesc = '';
            },

            /* ============ 记忆图谱 ============ */
            openMemoryDetail(type, title) {
                this.memoryDetailTitle = title;
                const list = [...(this.memoryDB[type] || [])];
                if (type === 'short' && global.ChatStorage) {
                    const bridge = global.ChatStorage.load(global.ChatStorage.KEYS.MEMORY_BRIDGE_SUMMARY, null);
                    if (bridge) {
                        list.unshift(bridge);
                    }
                }
                this.memoryDetailList = list;
                this.showMemoryDetailModal = true;
            },

            /* ============ 演进与规则 ============ */
            openEvolutionModal() {
                this.showLoraInfo = false;
                this.showEvolutionModal = true;
            },
            removeRule(type, index) {
                if (type === 'learning') {
                    this.learningRules.splice(index, 1);
                } else {
                    this.correctionRules.splice(index, 1);
                }
                this.persistSettings();
            },

            /* ============ 分支线 ============ */
            createBranch() {
                // 存档当前分支
                this.branchSnapshots[this.currentBranch] = {
                    dialogueMessages: JSON.parse(JSON.stringify(this.dialogueMessages)),
                    chapterMessages: JSON.parse(JSON.stringify(this.chapterMessages))
                };
                const name = `分支 ${this.branches.length} (独立记忆)`;
                this.branches.push(name);
                this.branchSnapshots[name] = {
                    dialogueMessages: JSON.parse(JSON.stringify(this.dialogueMessages)),
                    chapterMessages: JSON.parse(JSON.stringify(this.chapterMessages))
                };
                this.currentBranch = name;
                this.persistSettings();
                this.showToast('已创建新分支并自动存档');
            },
            selectBranch(name) {
                // 切换前保存当前分支消息
                this.branchSnapshots[this.currentBranch] = {
                    dialogueMessages: JSON.parse(JSON.stringify(this.dialogueMessages)),
                    chapterMessages: JSON.parse(JSON.stringify(this.chapterMessages))
                };
                this.currentBranch = name;
                const snap = this.branchSnapshots[name];
                if (snap) {
                    if (Array.isArray(snap.dialogueMessages)) this.dialogueMessages = snap.dialogueMessages;
                    if (Array.isArray(snap.chapterMessages)) this.chapterMessages = snap.chapterMessages;
                    this.persistMessages();
                }
                this.persistSettings();
                this.showBranchModal = false;
                this.showToast(`已切换至：${name}`);
            },

            /* ============ 禁词 ============ */
            addBadword(type) {
                const input = type === 'global' ? this.globalBadwordInput : this.localBadwordInput;
                const arr = type === 'global' ? this.globalBadwords : this.localBadwords;
                if (!input.trim()) {
                    this.showToast('请输入内容');
                    return;
                }
                input.split(/[、,，]/).map(w => w.trim()).filter(Boolean).forEach(w => {
                    if (!arr.includes(w)) arr.push(w);
                });
                if (type === 'global') this.globalBadwordInput = '';
                else this.localBadwordInput = '';
                this.persistSettings();
            },

            /* ============ 字体 ============ */
            injectCustomFont(dataUrl) {
                let style = document.getElementById('user-custom-font');
                if (!style) {
                    style = document.createElement('style');
                    style.id = 'user-custom-font';
                    document.head.appendChild(style);
                }
                const fontName = 'UserCustomFont';
                style.innerHTML = `
                    @font-face { font-family: '${fontName}'; src: url('${dataUrl}'); }
                    body, .bubble, .chapter-paragraph, .profile-name, .profile-signature, .status-text, .narration-text, .glass-input, .edit-textarea,
                    .mode-btn, .settings-item, .tag, .badword-tag, .modal-input, .modal-textarea, .menu-btn {
                        font-family: '${fontName}', -apple-system, sans-serif !important;
                    }
                `;
            },
            handleFontUpload(event) {
                const file = event.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.injectCustomFont(e.target.result);
                    if (global.ChatStorage) {
                        global.ChatStorage.save(global.ChatStorage.KEYS.OFFLINE_FONT, e.target.result);
                    }
                    this.showToast('字体已成功替换');
                };
                reader.readAsDataURL(file);
                event.target.value = '';
            },

            /* ============ 自定义 CSS & 状态栏 CSS ============ */
            applyCustomCSS() {
                const el = document.getElementById('user-custom-css');
                if (el) el.innerHTML = this.customCss || '';
                this.persistSettings();
            },
            applyStatusBarCSS() {
                const el = document.getElementById('user-statusbar-css');
                if (el) el.innerHTML = this.statusBarCss || '';
                this.persistSettings();
            },

            /* ============ 主题导入导出 ============ */
            exportTheme() {
                const layer = document.querySelector('.bg-layer');
                const themeData = {
                    customCss: this.customCss,
                    statusBarCss: this.statusBarCss,
                    theaterHtml: this.theaterHtml,
                    background: layer ? layer.style.backgroundImage : '',
                    statusText: this.statusText
                };
                const blob = new Blob([JSON.stringify(themeData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `主题_${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                this.showToast('主题已导出');
            },
            importTheme(event) {
                const file = event.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        if (data.customCss !== undefined) {
                            this.customCss = data.customCss;
                            this.applyCustomCSS();
                        }
                        if (data.statusBarCss !== undefined) {
                            this.statusBarCss = data.statusBarCss;
                            this.applyStatusBarCSS();
                        }
                        if (data.theaterHtml !== undefined) {
                            this.theaterHtml = data.theaterHtml;
                        }
                        if (data.background && data.background !== 'none') {
                            const layer = document.querySelector('.bg-layer');
                            if (layer) layer.style.backgroundImage = data.background;
                            if (global.ChatStorage) {
                                global.ChatStorage.save(global.ChatStorage.KEYS.OFFLINE_WALLPAPER, data.background);
                            }
                        }
                        if (data.statusText !== undefined) this.statusText = data.statusText;
                        this.persistSettings();
                        this.showToast('主题导入成功');
                    } catch (err) {
                        this.showToast('JSON 解析失败');
                    }
                };
                reader.readAsText(file);
                event.target.value = '';
            },

            /* ============ 壁纸 ============ */
            changeWallpaper(event) {
                const file = event.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const bgVal = `url('${e.target.result}')`;
                        const layer = document.querySelector('.bg-layer');
                        if (layer) layer.style.backgroundImage = bgVal;
                        if (global.ChatStorage) {
                            global.ChatStorage.save(global.ChatStorage.KEYS.OFFLINE_WALLPAPER, bgVal);
                        }
                        this.showToast('壁纸替换成功');
                    };
                    reader.readAsDataURL(file);
                }
                event.target.value = '';
            }
        };
    };
})(window);
