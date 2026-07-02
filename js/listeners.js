(function() {
    // Decision Panel Toggle Functionality
    // This makes the decision-btn toggle the decision-panel popover just like combo-btn toggles user-sticker-picker
    
    const decisionBtn = document.getElementById('decision-btn');
    const decisionPanel = document.getElementById('decision-panel');
    
    // Initialize decision panel if it doesn't exist in HTML
    if (!decisionPanel && decisionBtn) {
        const newPanel = document.createElement('div');
        newPanel.id = 'decision-panel';
        newPanel.className = 'decision-panel-popover';
        newPanel.innerHTML = `
            <div class="decision-panel-header">
                <span style="font-weight:600;color:var(--text-primary);">回答问题</span>
                <button id="decision-panel-close" style="background:none;border:none;cursor:pointer;color:var(--text-secondary);font-size:14px;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="decision-panel-content">
                <div style="margin-bottom:12px;">
                    <label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:6px;">输入问题</label>
                    <input type="text" id="decision-question-input" placeholder="问一个问题..." style="width:100%;padding:8px 10px;border:1px solid var(--border-color);border-radius:8px;background:var(--secondary-bg);color:var(--text-primary);font-size:13px;">
                </div>
                <div style="margin-bottom:12px;">
                    <label style="font-size:12px;color:var(--text-secondary);display:block;margin-bottom:6px;">选项</label>
                    <input type="text" id="decision-options-input" placeholder="选项1,选项2,选项3..." style="width:100%;padding:8px 10px;border:1px solid var(--border-color);border-radius:8px;background:var(--secondary-bg);color:var(--text-primary);font-size:13px;">
                </div>
                <button id="decision-send-btn" style="width:100%;padding:10px;background:var(--accent-color);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:13px;margin-top:8px;">
                    发送
                </button>
            </div>
        `;
        
        // Insert after the combo-btn in the input-buttons div
        const inputButtons = document.querySelector('.input-buttons');
        if (inputButtons) {
            inputButtons.insertBefore(newPanel, inputButtons.querySelector('.send-btn'));
        }
    }
    
    // Get the panel element (either existing or newly created)
    const panel = document.getElementById('decision-panel') || newPanel;
    
    // Toggle panel visibility on decision-btn click
    if (decisionBtn && panel) {
        decisionBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // Close other popovers if they're open
            const userStickerPicker = document.getElementById('user-sticker-picker');
            if (userStickerPicker && userStickerPicker.classList.contains('active')) {
                userStickerPicker.classList.remove('active');
            }
            
            // Toggle decision panel
            panel.classList.toggle('active');
        });
        
        // Close button
        const closeBtn = document.getElementById('decision-panel-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                panel.classList.remove('active');
            });
        }
        
        // Send button functionality
        const sendBtn = document.getElementById('decision-send-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', function() {
                const question = document.getElementById('decision-question-input')?.value.trim();
                const options = document.getElementById('decision-options-input')?.value.trim();
                
                if (question && options) {
                    // Add message with question and options
                    if (typeof addMessage === 'function') {
                        addMessage({
                            id: Date.now(),
                            sender: 'user',
                            text: question + '\n\n' + '选项: ' + options,
                            timestamp: new Date(),
                            type: 'decision',
                            status: 'sent'
                        });
                        
                        // Clear inputs
                        document.getElementById('decision-question-input').value = '';
                        document.getElementById('decision-options-input').value = '';
                        
                        // Close panel
                        panel.classList.remove('active');
                        
                        // Trigger auto-reply
                        if (typeof simulateReply === 'function') {
                            const settings = window.settings || { replyDelayMin: 1000, replyDelayMax: 3000 };
                            const delayRange = settings.replyDelayMax - settings.replyDelayMin;
                            const randomDelay = settings.replyDelayMin + Math.random() * delayRange;
                            setTimeout(simulateReply, randomDelay);
                        }
                        
                        if (typeof showNotification === 'function') {
                            showNotification('问题已发送', 'success', 1200);
                        }
                    }
                } else {
                    if (typeof showNotification === 'function') {
                        showNotification('请填写问题和选项', 'warning');
                    }
                }
            });
        }
    }
    
    // Close panel when clicking outside
    document.addEventListener('click', function(e) {
        const panel = document.getElementById('decision-panel');
        const decisionBtn = document.getElementById('decision-btn');
        if (panel && panel.classList.contains('active')) {
            if (!panel.contains(e.target) && !decisionBtn.contains(e.target)) {
                panel.classList.remove('active');
            }
        }
    });
    
    // Add CSS for decision panel styling
    const style = document.createElement('style');
    style.textContent = `
        .decision-panel-popover {
            position: absolute;
            bottom: 50px;
            right: 10px;
            background: var(--secondary-bg);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 12px;
            width: 240px;
            z-index: 100;
            display: none;
            flex-direction: column;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(10px);
        }
        
        .decision-panel-popover.active {
            display: flex;
        }
        
        .decision-panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(var(--accent-color-rgb, 197, 164, 126), 0.15);
        }
        
        .decision-panel-content {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        #decision-question-input,
        #decision-options-input {
            transition: all 0.2s ease;
        }
        
        #decision-question-input:focus,
        #decision-options-input:focus {
            border-color: var(--accent-color);
            outline: none;
            background: var(--primary-bg);
        }
        
        #decision-send-btn:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }
        
        #decision-send-btn:active {
            transform: translateY(0);
        }
    `;
    document.head.appendChild(style);
})();
