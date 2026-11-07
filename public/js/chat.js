document.addEventListener('alpine:init', () => {
    Alpine.data('chatApp', () => ({
        isMenuOpen: false,
        showCallSelector: false,
        messageText: '',
        showToolsPanel: false,
        currentPage: 0,
        touchStartX: 0,
        
        showImagePreview: false,
        previewImageUrl: '',

        messages: [
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

        // 【新增】统一处理工具栏点击逻辑，替代 HTML 里的又长又臭的 if else
        handleToolClick(item) {
            this.showToolsPanel = false; // 点击任何按钮后，默认先关闭面板
            
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
                    // 其他未开发功能可以在此处统一拦截
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
                if(c) c.scrollTop = c.scrollHeight;
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
            event.target.value = ''; // 清空以允许重复选同一张图
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
