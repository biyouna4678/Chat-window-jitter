document.addEventListener('alpine:init', () => {
    Alpine.data('callManager', () => ({
        callState: 'idle', // 'idle' | 'calling' | 'receiving' | 'active'
        callType: null,    // 'voice' | 'video'
        isMinimized: false,
        callTimer: '00:00',
        callInterval: null,
        lastToggleTime: 0,
        
        // 语音专用状态
        micOn: true,
        recognition: null,
        isListening: false,
        interimTranscript: '',
        showCallSettings: false,
        startMode: 'them',
        subtitlesOn: true,
        voiceSubtitles: [
            { speaker: 'Yosali', original: '今日、お元気ですか？', translation: '你今天开心吗？' },
            { speaker: 'Yosali', original: '元気だよ。そっちは？', translation: '挺好的。你呢？' }
        ],

        // 视频专用状态
        cameraOn: true,
        isFrontCamera: true,
        mediaStream: null,
        isStartingCamera: false,
        videoSubtitlesOn: true,
        isTyping: false,
        textMessage: '',
        videoSubtitles: [
            { type: 'narration', text: '(对方轻轻扶了一下眼镜，嘴角微微上扬)' },
            { type: 'dialogue', speaker: 'Yosali', original: 'Can you see me clearly now?', translation: '你现在能清楚地看到我吗？' }
        ],

        // 拖拽 PiP 状态
        pipX: 0,
        pipY: 0,
        isDragging: false,
        dragStartX: 0,
        dragStartY: 0,
        pipStartX: 0,
        pipStartY: 0,

        initCall() {
            this.pipX = window.innerWidth - 105;
            this.pipY = 80;
        },

        /* ================= 通话核心逻辑 ================= */
        startCall(type = 'voice', state = 'calling') {
            this.callType = type;
            this.callState = state;
            this.isMinimized = false;
            this.showCallSelector = false;
            
            if (state === 'active') {
                this.startTimer();
                if (type === 'video') this.startCamera().catch(() => {});
                this.initSpeechRecognition();
            }
        },
        
        acceptCall() {
            this.callState = 'active';
            this.startTimer();
            if (this.callType === 'video') this.startCamera().catch(() => {});
            this.initSpeechRecognition();
        },

        endCall() {
            this.callState = 'idle';
            this.callType = null;
            this.isMinimized = false;
            this.stopTimer();
            
            if (this.recognition && this.isListening) {
                this.isListening = false;
                this.recognition.stop();
            }
            this.stopCamera();
        },

        startTimer() {
            this.callTimer = '00:00';
            let seconds = 0;
            this.stopTimer();
            this.callInterval = setInterval(() => {
                seconds++;
                const m = String(Math.floor(seconds / 60)).padStart(2, '0');
                const s = String(seconds % 60).padStart(2, '0');
                this.callTimer = `${m}:${s}`;
            }, 1000);
        },
        stopTimer() {
            if (this.callInterval) clearInterval(this.callInterval);
        },

        /* ================= 视频摄像头控制 ================= */
        stopCamera() {
            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(track => track.stop());
                this.mediaStream = null;
            }
            if (this.$refs.videoElement) this.$refs.videoElement.srcObject = null;
            if (this.$refs.pipVideoElement) this.$refs.pipVideoElement.srcObject = null;
        },

        async startCamera() {
            if (!this.cameraOn || this.isStartingCamera) return;
            if (!navigator?.mediaDevices?.getUserMedia) {
                console.warn('[Camera] getUserMedia is not supported in this environment');
                this.cameraOn = false;
                return;
            }
            this.isStartingCamera = true;
            this.stopCamera(); 

            try {
                const constraints = { 
                    video: { facingMode: this.isFrontCamera ? 'user' : 'environment' }, 
                    audio: false 
                };
                let stream;
                try {
                    stream = await navigator.mediaDevices.getUserMedia(constraints);
                } catch {
                    // Fallback to generic video constraint
                    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                }
                
                if (!this.cameraOn || this.callState === 'idle') {
                    if (stream) stream.getTracks().forEach(track => track.stop());
                    this.isStartingCamera = false;
                    return;
                }
                this.mediaStream = stream;
                this.bindVideoStream();
            } catch (err) { 
                console.warn('[Camera] Camera access was denied or device not found:', err?.message || err);
                this.cameraOn = false; 
            } finally {
                this.isStartingCamera = false;
            }
        },

        bindVideoStream() {
            this.$nextTick(() => {
                if (this.$refs.videoElement) this.$refs.videoElement.srcObject = null;
                if (this.$refs.pipVideoElement) this.$refs.pipVideoElement.srcObject = null;

                if (!this.isMinimized && this.$refs.videoElement) {
                    this.$refs.videoElement.srcObject = this.mediaStream;
                } else if (this.isMinimized && this.$refs.pipVideoElement) {
                    this.$refs.pipVideoElement.srcObject = this.mediaStream;
                }
            });
        },
        
        switchCamera() {
            this.isFrontCamera = !this.isFrontCamera;
            if (this.cameraOn) this.startCamera();
        },
        
        toggleCamera() {
            this.cameraOn = !this.cameraOn;
            if (this.cameraOn) {
                this.$nextTick(() => this.startCamera());
            } else {
                this.stopCamera(); 
            }
        },

        toggleMinimize() {
            if (Date.now() - this.lastToggleTime < 300) return;
            this.lastToggleTime = Date.now();

            this.isMinimized = !this.isMinimized;
            if (this.callType === 'video' && this.mediaStream) {
                this.bindVideoStream();
            }
        },

        /* ================= 视频字幕/文字交互 ================= */
        sendTextMessage() {
            if (!this.textMessage.trim()) return;
            this.videoSubtitles.push({ type: 'dialogue', speaker: 'Me', original: this.textMessage.trim(), translation: '' });
            this.textMessage = '';
            this.isTyping = false;
            this.scrollVideoToBottom();
        },
        
        toggleTyping() {
            this.isTyping = !this.isTyping;
            if (this.isTyping) {
                if (this.micOn) {
                    this.micOn = false;
                    if (this.isListening) { 
                        this.isListening = false; 
                        if (this.recognition) this.recognition.stop(); 
                    }
                }
                // 修复 2：加上可选链 ?，防止在 DOM 还没完全渲染时尝试 focus 报错
                this.$nextTick(() => { this.$refs.textInput?.focus(); });
            }
            this.scrollVideoToBottom();
        },
        
        scrollVideoToBottom() {
            this.$nextTick(() => {
                const container = this.$refs.videoSubtitleBox;
                if(container) container.scrollTop = container.scrollHeight;
            });
        },

        /* ================= 语音识别逻辑 ================= */
        initSpeechRecognition() {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            
            // 修复 4：识别引擎不可用时的兜底提示 (iOS PWA 环境下常常不可用)
            if (!SpeechRecognition) {
                console.warn('当前浏览器/PWA环境不支持语音识别 API (webkitSpeechRecognition)，麦克风字幕功能不可用。');
                return;
            }
            
            if (this.recognition) {
                if (this.micOn && !this.isListening) {
                    this.isListening = true;
                    try { this.recognition.start(); } catch(e) {}
                }
                return;
            }

            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true; 
            this.recognition.interimResults = true; 
            
            // 修复 4：支持多语言，优先识别日文，其次中文和英文
            this.recognition.lang = ['ja-JP', 'zh-CN', 'en-US']; 

            this.recognition.onresult = (event) => {
                let interim = ''; let final = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) final += event.results[i][0].transcript;
                    else interim += event.results[i][0].transcript;
                }
                this.interimTranscript = interim;
                if (final) {
                    if (this.callType === 'voice') {
                        this.voiceSubtitles.push({ speaker: 'Me', original: final, translation: '' });
                        this.$nextTick(() => {
                            const c = this.$refs.subtitleBox;
                            if(c) c.scrollTop = c.scrollHeight;
                        });
                    } else if (this.callType === 'video') {
                        this.videoSubtitles.push({ type: 'dialogue', speaker: 'Me', original: final, translation: '' });
                        this.scrollVideoToBottom();
                    }
                    this.interimTranscript = '';
                }
            };
            
            this.recognition.onerror = (e) => {
                if(e.error === 'not-allowed') { this.micOn = false; this.isListening = false; }
            };
            
            this.recognition.onend = () => {
                if (this.micOn && this.isListening && this.callState === 'active') {
                    try { this.recognition.start(); } catch(e) {}
                }
            };
            
            if (this.micOn) this.toggleMic(true);
        },
        
        toggleMic(forceStart = false) {
            if (!forceStart) {
                this.micOn = !this.micOn;
                if(this.micOn) this.isTyping = false;
            }
            if (this.micOn) {
                if (this.recognition && !this.isListening) {
                    this.isListening = true;
                    try { this.recognition.start(); } catch(e) {}
                }
            } else {
                if (this.recognition && this.isListening) {
                    this.isListening = false;
                    this.recognition.stop();
                    this.interimTranscript = '';
                }
            }
        },

        /* ================= PiP 拖拽逻辑 ================= */
        handleDragStart(e) {
            this.isDragging = false; 
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            this.dragStartX = clientX;
            this.dragStartY = clientY;
            this.pipStartX = this.pipX;
            this.pipStartY = this.pipY;
            
            const onMouseMove = (ev) => this.handleDragMove(ev);
            const onMouseUp = (ev) => this.handleDragEnd(ev, onMouseMove, onMouseUp);
            
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
            window.addEventListener('touchmove', onMouseMove, { passive: false });
            window.addEventListener('touchend', onMouseUp);
            
            // 修复 3：增加 touchcancel 监听，防止系统打断触摸（如下拉通知栏）时状态卡死
            window.addEventListener('touchcancel', onMouseUp);
        },
        
        handleDragMove(e) {
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            const dx = clientX - this.dragStartX;
            const dy = clientY - this.dragStartY;
            
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                this.isDragging = true;
                if (e.cancelable) e.preventDefault(); 
                
                let newX = this.pipStartX + dx;
                let newY = this.pipStartY + dy;
                
                const padding = 16;
                const maxX = window.innerWidth - 90 - padding; 
                const maxY = window.innerHeight - 120 - padding; 
                
                this.pipX = Math.max(padding, Math.min(newX, maxX));
                this.pipY = Math.max(padding, Math.min(newY, maxY));
            }
        },
        
        handleDragEnd(e, moveFn, upFn) {
            window.removeEventListener('mousemove', moveFn);
            window.removeEventListener('mouseup', upFn);
            window.removeEventListener('touchmove', moveFn);
            window.removeEventListener('touchend', upFn);
            // 修复 3：配套移除 touchcancel
            window.removeEventListener('touchcancel', upFn);
            
            if (e && e.cancelable) e.preventDefault();
            
            if (!this.isDragging) {
                this.toggleMinimize();
            }
        }
    }));
});
