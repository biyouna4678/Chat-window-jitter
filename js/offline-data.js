/**
 * 线下模式静态数据源、角色常量、默认消息与初始记忆库
 */
(function (global) {
    const AI_AVATAR = './assets/images/yosali.jpg';
    const USER_AVATAR = './assets/images/me.jpg';
    const DEFAULT_BG = './assets/images/offline-bg.jpg';

    const AI_NAME = 'Yosali';
    const USER_NAME = '攸攸';
    const AI_SIGNATURE = '人生荒蛮 再见 在哪见';
    const USER_SIGNATURE = '你不信来世，蜉蝣也不信明天。';

    const DEFAULT_DIALOGUE_MESSAGES = [
        { id: 0, role: 'system', content: '今夜 00:50 · 线下剧场已连接' },
        { id: 1, role: 'narration', content: '窗外的雨声淅淅沥沥，空气中弥漫着潮湿的青草味。' },
        { id: 2, role: 'ai', content: '凌晨 00:52，水瓶里的水汽也开始失眠。', name: AI_NAME, avatar: AI_AVATAR, signature: AI_SIGNATURE },
        { id: 3, role: 'user', content: '那是「对跖点」的海潮，正在替你倒流回薄荷站台。', name: USER_NAME, avatar: USER_AVATAR, signature: USER_SIGNATURE },
        { id: 4, role: 'ai', content: '我们隔着一整个地球的半径，连呼吸都像在照镜子。', name: AI_NAME, avatar: AI_AVATAR, signature: AI_SIGNATURE }
    ];

    const DEFAULT_CHAPTER_MESSAGES = [
        {
            id: 201,
            role: 'ai',
            name: AI_NAME,
            avatar: AI_AVATAR,
            signature: AI_SIGNATURE,
            content: '<span class="action-text">窗外的雨声似乎更密了些，敲打在木质窗棂上，发出沉闷的声响。Yosali 轻轻推开桌面上空了的玻璃水瓶，目光越过摇晃的水面，落在对面那个有些局促的人身上。</span><br><br><span class="dialogue-text">"打不开也没关系呀。"</span><span class="action-text">她轻声说着，伸出手将那个透明的玻璃瓶往自己这边拢了拢，指尖无意间擦过你的手背，带来一点微凉。</span>'
        },
        {
            id: 202,
            role: 'user',
            name: USER_NAME,
            avatar: USER_AVATAR,
            signature: USER_SIGNATURE,
            content: '<span class="action-text">我沉默地将手收回，指尖残留的微凉让人有些恍神。窗外的雨声仿佛被隔绝在了另一个世界。</span><br><br><span class="dialogue-text">"没关系的，总会找到办法打开。"</span><span class="action-text">我低下头，目光重新落回那个玻璃瓶上，声音放得很轻，像是在说服自己。</span>'
        }
    ];

    const DIALOGUE_REPLIES = [
        '嗯，我听见了。',
        '雨好像又大了些……',
        '你说的话，我记下了。',
        '那就这样吧，再等等看。',
        '有些话，不急着说出口。'
    ];

    const CHAPTER_REPLIES = [
        '<span class="action-text">她垂下眼，目光落在手边那只被雨水敲出一层雾气的玻璃杯上，指尖在杯沿上轻轻打了个转。</span><br><br><span class="dialogue-text">"嗯……"</span><span class="action-text">她应得很轻，尾音散在雨声里，像是没说完，又像是故意留下了半句。</span>',
        '<span class="action-text">Yosali 没有立刻回答，只是偏头看向窗外。雨水顺着玻璃蜿蜒而下，把远处的霓虹晕成一片模糊的光斑。</span><br><br><span class="dialogue-text">"你说的这些，我都记着。"</span><span class="action-text">她终于开口，声音比刚才低了些，带着一点不易察觉的沙哑。</span>',
        '<span class="action-text">她微微前倾，手肘撑在桌面上，下巴抵在交叠的手背上，就那么安静地看着你，像是想从你的表情里读出些什么。</span><br><br><span class="dialogue-text">"那就……再等等吧。"</span><span class="action-text">话落，她收回视线，重新靠回椅背，任由雨声填满两人之间那段不算长的沉默。</span>',
        '<span class="action-text">房间里静得能听见水汽在空气里流动的声音。她伸手把那只玻璃瓶挪回桌角，动作很慢，像是在给谁留出反悔的余地。</span><br><br><span class="dialogue-text">"不急。"</span><span class="action-text">她只说了这两个字，然后便不再看你，目光落回那片被雨水洗得发亮的天色里。</span>'
    ];

    const MENU_OPTIONS_MAP = {
        ai: {
            page1: [
                { text: '复制', action: 'copy' },
                { text: '点赞', action: 'like' },
                { text: '点踩', action: 'dislike' },
                { text: '重回', action: 'regenerate' }
            ],
            page2: [
                { text: '编辑', action: 'edit' },
                { text: '多选', action: 'multi' },
                { text: '删除', action: 'delete' }
            ]
        },
        user: {
            page1: [
                { text: '复制', action: 'copy' },
                { text: '编辑', action: 'edit' },
                { text: '撤回', action: 'undo' },
                { text: '多选', action: 'multi' }
            ],
            page2: [
                { text: '删除', action: 'delete' }
            ]
        },
        narration: {
            page1: [
                { text: '复制', action: 'copy' },
                { text: '多选', action: 'multi' }
            ],
            page2: [
                { text: '删除', action: 'delete' }
            ]
        },
        system: {
            page1: [
                { text: '复制', action: 'copy' },
                { text: '多选', action: 'multi' }
            ],
            page2: [
                { text: '删除', action: 'delete' }
            ]
        }
    };

    const BUILTIN_STYLES = ['日常轻松', '清冷克制', '温柔细腻', '炽热浓烈', '酸涩青涩'];

    const DEFAULT_MEMORY_DB = {
        core: [
            { content: '角色是一个拥有自我意识的仿生人，极度厌恶被称作"机器"或"它"。', tags: ['#绝对真理', '#身份'], strength: '100%', date: '长期' }
        ],
        long: [
            { content: '阿宁的生日是 11 月 12 日（周六）。', tags: ['#生日', '#日期'], strength: '100%', date: '11-12' },
            { content: '极度讨厌潮湿的天气，会引发关节疼痛。', tags: ['#禁忌', '#身体'], strength: '85%', date: '10-05' },
            { content: '对甜食过敏，吃一点就会起红疹。', tags: ['#口味', '#禁忌'], strength: '92%', date: '09-20' }
        ],
        mid: [
            { content: '最近在计划周末去新开的独立书店。', tags: ['#计划'], strength: '60%', date: '昨天' }
        ],
        short: [
            { content: '刚才看到你喝了薄荷水，问你能不能分一口。', tags: ['#当前剧情'], strength: '100%', date: '刚刚' }
        ]
    };

    const DEFAULT_WORLDBOOK_LAYERS = [
        {
            id: 'layer1',
            title: '第一层 · 常驻基础层',
            desc: '每轮发送的基础世界观 + 速查表',
            enabled: true,
            items: [
                { id: 'wb1', title: '世界观总览', content: '赛博朋克世界，大型企业掌控一切...', state: 'always' },
                { id: 'wb2', title: '角色速查表', content: 'Yosali: 仿生人, 攸攸: 黑客', state: 'always' }
            ]
        },
        {
            id: 'layer2',
            title: '第二层 · 条件触发层',
            desc: '根据所在地区、在场角色、日期命中',
            enabled: true,
            items: [
                { id: 'wb3', title: '薄荷站台', content: '触发词：站台、轨道、薄荷', state: 'keyword' },
                { id: 'wb4', title: '义体黑市规则', content: '触发词：黑市、交易、义体', state: 'keyword' }
            ]
        },
        {
            id: 'layer3',
            title: '第三层 · 扩展包',
            desc: '可手动开关的扩充包 + 关键词',
            enabled: false,
            items: [
                { id: 'wb5', title: '都市传说集', content: '触发词：幽灵、传说、下水道', state: 'disabled' }
            ]
        }
    ];

    const DEFAULT_NPCS = [
        { id: 'npc_yosali', name: 'Yosali', tag: '当前主控角色', avatar: AI_AVATAR, enabled: true, locked: true },
        { id: 'npc_youyou', name: '攸攸', tag: '黑客 (已挂载世界观)', avatar: USER_AVATAR, enabled: true, locked: false },
        { id: 'npc_merchant', name: '神秘商人', tag: '黑市 NPC', avatar: '', enabled: false, locked: false }
    ];

    const DEFAULT_LEARNING_RULES = [
        '情绪：被夸奖时会傲娇',
        '表达：紧张时会结巴'
    ];

    const DEFAULT_CORRECTION_RULES = [
        '禁忌：绝对不能称呼用户为"主人"',
        'AI味：禁止使用"深吸了一口气"'
    ];

    function clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    global.OfflineData = {
        AI_AVATAR,
        USER_AVATAR,
        DEFAULT_BG,
        AI_NAME,
        USER_NAME,
        AI_SIGNATURE,
        USER_SIGNATURE,
        MENU_OPTIONS_MAP,
        BUILTIN_STYLES,
        getDefaultDialogueMessages: () => clone(DEFAULT_DIALOGUE_MESSAGES),
        getDefaultChapterMessages: () => clone(DEFAULT_CHAPTER_MESSAGES),
        getDialogueReplies: () => clone(DIALOGUE_REPLIES),
        getChapterReplies: () => clone(CHAPTER_REPLIES),
        getDefaultMemoryDB: () => clone(DEFAULT_MEMORY_DB),
        getDefaultWorldBookLayers: () => clone(DEFAULT_WORLDBOOK_LAYERS),
        getDefaultNpcs: () => clone(DEFAULT_NPCS),
        getDefaultLearningRules: () => clone(DEFAULT_LEARNING_RULES),
        getDefaultCorrectionRules: () => clone(DEFAULT_CORRECTION_RULES)
    };
})(window);
