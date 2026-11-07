document.addEventListener('alpine:init', () => {
    Alpine.data('mapManager', () => ({
        showLocationModal: false,
        showLocationDetail: false,
        newLocation: { name: '', subtitle: '', address: '' },
        selectedLocation: null,
        
        sendLocation() {
            // 如果名字、外文、地址全为空，给个默认占位
            if(!this.newLocation.name.trim() && !this.newLocation.subtitle.trim() && !this.newLocation.address.trim()) {
                this.newLocation.name = '未命名地点';
            }
            const now = new Date();
            const timeStr = `今天 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            
            // 调用 chatApp 模块中的 messages 数组和 scrollToBottom 方法
            this.messages.push({
                id: Date.now(),
                type: 'location',
                sender: 'me',
                data: { ...this.newLocation },
                time: timeStr
            });
            
            this.showLocationModal = false;
            this.scrollToBottom();

            // 延迟清空，防止弹窗关得太快闪烁
            setTimeout(() => { this.newLocation = { name: '', subtitle: '', address: '' }; }, 300);
        }
    }));
});
