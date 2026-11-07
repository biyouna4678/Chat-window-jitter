document.addEventListener('alpine:init', () => {
    Alpine.data('transferManager', () => ({
        isTransferModalOpen: false,
        isBankCardModalOpen: false,
        isPasswordModalOpen: false,
        isSuccessModalOpen: false,
        
        payMethod: 'balance', 
        amount: '', 
        message: '记得按时吃饭，照顾好自己呀~', 
        successPayMethodInfo: '',
        
        selectedBankCardIndex: 0,
        cardNames: ['白金卡 (尾号2640)', '摩根大通卡', 'Yulia 专属卡', '蓝宝石卡'],

        password: '',
        passwordError: false,
        isShaking: false,

        limitAmount(e) {
            let val = e.target.value.replace(/[^\d.]/g, '');
            val = val.replace(/\.{2,}/g, '.');
            val = val.replace('.', '$#$').replace(/\./g, '').replace('$#$', '.');
            if (val.indexOf('.') !== -1) {
                val = val.substring(0, val.indexOf('.') + 3);
            }
            if (val.startsWith('.')) {
                val = '0' + val;
            }
            this.amount = val;
            e.target.value = val;
        },

        togglePayMethod() {
            this.payMethod = this.payMethod === 'balance' ? 'bankCard' : 'balance';
        },

        handleConfirmTransfer() {
            if (!this.amount || parseFloat(this.amount) <= 0) return;
            if (this.payMethod === 'balance') {
                this.successPayMethodInfo = '零钱 (余额 ¥8,888.00)';
                this.openPasswordModal();
            } else {
                this.isTransferModalOpen = false;
                this.isBankCardModalOpen = true;
            }
        },

        confirmBankCardRecharge() {
            this.successPayMethodInfo = this.cardNames[this.selectedBankCardIndex];
            this.openPasswordModal();
        },

        openPasswordModal() {
            this.password = '';
            this.passwordError = false;
            this.isTransferModalOpen = false;
            this.isBankCardModalOpen = false;
            this.isPasswordModalOpen = true;
        },

        inputPassword(num) {
            if (this.password.length >= 6) return;
            this.password += num.toString();
            if (this.password.length === 6) this.checkPassword();
        },

        deletePassword() {
            if (this.password.length > 0) this.password = this.password.slice(0, -1);
        },

        clearPassword() {
            this.password = '';
            this.passwordError = false;
        },

        checkPassword() {
            setTimeout(() => {
                if (this.password === '123456') {
                    this.isPasswordModalOpen = false;
                    this.isSuccessModalOpen = true;
                    
                    // 发送转账数据
                    const now = new Date();
                    const timeStr = `今天 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    
                    this.messages.push({
                        id: Date.now(),
                        type: 'transfer',
                        sender: 'me',
                        data: {
                            amount: this.amount,
                            message: this.message,
                            payMethod: this.successPayMethodInfo,
                            status: 'pending' // pending(待接收), accepted(已收), rejected(已退回)
                        },
                        time: timeStr
                    });
                    this.scrollToBottom();
                    
                    // 【修复】去掉了这里的 setTimeout 清空，改到关闭成功弹窗时清空
                } else {
                    this.passwordError = true;
                    this.isShaking = true;
                    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
                    setTimeout(() => {
                        this.password = '';
                        this.isShaking = false;
                        setTimeout(() => { this.passwordError = false; }, 1500);
                    }, 400);
                }
            }, 200);
        },

        handleCarouselScroll(e) {
            const container = e.target;
            const cardWidth = 170;
            const gap = 16;
            const step = cardWidth + gap;
            const scrollLeft = container.scrollLeft;
            const index = Math.round(scrollLeft / step);
            if (index >= 0 && index < 4 && index !== this.selectedBankCardIndex) {
                this.selectedBankCardIndex = index;
            }
        },

        selectBankCard(index, event) {
            this.selectedBankCardIndex = index;
            const cardElement = event.currentTarget;
            cardElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }));
});
