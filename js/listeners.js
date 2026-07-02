function setupEventListeners() {
    try {
        initCoreListeners();
        initModalListeners();
        initChatActionListeners();
        initHeaderAndSettingsListeners();
        initDataManagementListeners();
        initNewFeatureListeners();
        setupTutorialListeners();
        initMoodListeners();
        initDecisionModule(); 
        initAnniversaryModule(); 
        initThemeEditor(); 
        initThemeSchemes();
        
        initComboMenu(); 
        
    } catch (e) {
        console.error("事件监听器初始化失败:", e);
    }
}

function initChatActionListeners() {
        DOMElements.chatContainer.addEventListener('click', (e) => {

            if (isBatchFavoriteMode) {
                const wrapper = e.target.closest('.message-wrapper');
                if (wrapper && !e.target.closest('.message-meta-actions')) {
                    const messageId = Number(wrapper.dataset.id);
                    const index = selectedMessages.indexOf(messageId);

                    if (index > -1) {
                        selectedMessages.splice(index, 1);
                        wrapper.classList.remove('selected');
                    } else {
                        selectedMessages.push(messageId);
                        wrapper.classList.add('selected');
                    }

                    const confirmBtn = document.getElementById('confirm-batch-favorite');
                    if (confirmBtn) {
                        confirmBtn.textContent = `确认收藏 (${selectedMessages.length})`;
                    }
                    return;
                }
            }

            const favoriteBtn = e.target.closest('.favorite-action-btn'); 
            if (favoriteBtn) {
                const wrapper = e.target.closest('.message-wrapper');
                const messageId = Number(wrapper.dataset.id);
                const message = messages.find(m => m.id === messageId);
                
                if (message) {
                    message.favorited = !message.favorited;
                    
                    showNotification(message.favorited ? '⭐ 已收藏': '⭐ 取消收藏', 'success', 1500);
                    playSound('favorite');
                    
                    throttledSaveData();
                    
                    renderMessages(true);
                }
                return;
            }

            const target = e.target.closest('.meta-action-btn');
            if (!target) return;
            
            const wrapper = e.target.closest('.message-wrapper');
            if (!wrapper) return; 
            
            const messageId = Number(wrapper.dataset.id);
            const message = messages.find(m => m.id === messageId);
            if (!message) return;

if (target.classList.contains('delete-btn')) {
    if (confirm('确认要永久删除这条消息吗？')) {
        const index = messages.findIndex(m => m.id === messageId);
        if (index > -1) {
            const savedScrollTop = DOMElements.chatContainer.scrollTop;
            messages.splice(index, 1); 
            throttledSaveData(); 
            renderMessages(true);
            requestAnimationFrame(() => {
                DOMElements.chatContainer.scrollTop = savedScrollTop;
            });
            showNotification('消息已删除', 'success');
        }
    }
    return;
}
            if (target.classList.contains('reply-btn')) {
                currentReplyTo = {
                    id: message.id,
                    sender: message.sender,
                    text: message.text,
                    image: message.image || null,
                    voice: message.voice || null
                };
                updateReplyPreview();
                DOMElements.messageInput.focus();
                const targetMessageElement = DOMElements.chatContainer.querySelector(`[data-id="${message.id}"]`);
                if (targetMessageElement) targetMessageElement.scrollIntoView({
                    behavior: 'smooth', block: 'center'
                });
                return;
            }
            throttledSaveData();
        });

        DOMElements.batchPreview.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('.batch-preview-remove');
            if (removeBtn) {
                const index = removeBtn.closest('.batch-preview-item').dataset.index;
                batchMessages.splice(index, 1); updateBatchPreview();
                return;
            }
            const editBtn = e.target.closest('.batch-preview-edit');
            if (editBtn) {
                const item = editBtn.closest('.batch-preview-item');
                const index = parseInt(item.dataset.index);
                const msg = batchMessages[index];
                if (!msg || msg.image) return;
                const newText = prompt('编辑消息内容：', msg.text);
                if (newText !== null) {
                    batchMessages[index].text = newText.trim();
                    updateBatchPreview();
                }
                return;
            }
            const sendBtn = e.target.closest('.batch-send-btn');
            if (sendBtn && !sendBtn.disabled) sendBatchMessages();
            if (e.target.matches('.batch-cancel-btn')) {
                isBatchMode = false; DOMElements.batchBtn.classList.remove('active');
                DOMElements.batchPreview.style.display = 'none';
                const placeholder = "";
                DOMElements.messageInput.placeholder = placeholder.length > 20 ? placeholder.substring(0, 20) + "...": placeholder;
                batchMessages = [];
            }
        });
    }

    function initModalListeners() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            const cancelBtns = modal.querySelectorAll('.modal-buttons .modal-btn-secondary');
            cancelBtns.forEach(cancelBtn => {
                if (!cancelBtn.getAttribute('onclick') && !cancelBtn.dataset.noAutoClose) {
                    cancelBtn.addEventListener('click', () => hideModal(modal));
                }
            });
        });

        const closeChatBtn = document.getElementById('close-chat');
        if (closeChatBtn) {
            closeChatBtn.addEventListener('click', () => {
                hideModal(DOMElements.chatModal.modal);
            });
        }

        const closeDataBtn = document.getElementById('close-data');
        if (closeDataBtn) {
            closeDataBtn.addEventListener('click', () => {
                hideModal(DOMElements.dataModal.modal);
            });
        }

        DOMElements.editModal.input.addEventListener('input', () => {
            DOMElements.editModal.save.disabled = !DOMElements.editModal.input.value.trim();
        });
        DOMElements.pokeModal.save.addEventListener('click', () => {
            const verb = DOMElements.pokeModal.input.value.trim() || settings.myPokeText || '拍了拍';
            let pokeText = `${settings.myName} ${verb} ${settings.partnerName}`;
            if (typeof window._sanitizePokeTextForDisplay === 'function') {
                pokeText = window._sanitizePokeTextForDisplay(pokeText);
            }
            const pokeSaveChecked = document.getElementById('poke-save-to-library');
            const shouldSaveToLibrary = pokeSaveChecked ? !!pokeSaveChecked.checked : false;
            addMessage({
                id: Date.now(), text: _formatPokeText(pokeText), timestamp: new Date(), type: 'system'
            });
            if (typeof playSound === 'function') playSound('poke');

            if (shouldSaveToLibrary) {
                try {
                    if (!Array.isArray(customPokes)) customPokes = [];
                    const exists = customPokes.some(r => String(r) === String(pokeText));
                    if (!exists) {
                        customPokes.unshift(pokeText);
                        if (typeof throttledSaveData === 'function') throttledSaveData();
                        if (typeof renderReplyLibrary === 'function') renderReplyLibrary();
                    }
                } catch (e) {
                    console.warn('保存拍一拍到库失败:', e);
                }
            }
            hideModal(DOMElements.pokeModal.modal);
            DOMElements.pokeModal.input.value = settings.myPokeText || '';
            const delayRange = settings.replyDelayMax - settings.replyDelayMin;
            const randomDelay = settings.replyDelayMin + Math.random() * delayRange;
            setTimeout(simulateReply, randomDelay);
        });


        DOMElements.cancelCoinResult.addEventListener('click', () => {
            DOMElements.coinTossOverlay.classList.remove('visible', 'finished');
            lastCoinResult = null;
        });


        DOMElements.sendCoinResult.addEventListener('click', () => {
            if (lastCoinResult) {
                sendMessage(`🪙 ${lastCoinResult}`, 'normal');
                DOMElements.coinTossOverlay.classList.remove('visible', 'finished');
                lastCoinResult = null;
            }
        });


        const retryBtn = document.getElementById('retry-coin-toss');

        if (retryBtn) {
            retryBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();

                startCoinFlipAnimation();
            });
        }
    }


    function initHeaderAndSettingsListeners() {

        const openNameModal = (isPartner) => {
            const modal = DOMElements.editModal;
            showModal(modal.modal, modal.input);
            modal.title.textContent = `修改${isPartner ? (settings.partnerName || '对方'): '我'}的昵称`;
            modal.input.value = isPartner ? settings.partnerName: settings.myName;
            modal.save.disabled = !modal.input.value.trim();
            modal.save.onclick = () => {
                const newName = modal.input.value.trim();
                if (newName) {
                    isPartner ? settings.partnerName = newName: settings.myName = newName;
                    throttledSaveData();
                    updateUI();
                    showNotification('昵称已更新', 'success');
                }
                hideModal(modal.modal);
            };
        };

        const openAvatarModal = (isPartner) => {
            const modal = DOMElements.avatarModal;

            modal.modal.querySelector('.modal-content').innerHTML = `
            <div class="modal-title"><i class="fas fa-portrait"></i><span id="avatar-modal-title">上传${isPartner ? '对方' : '我'}的头像</span></div>
            <div style="margin-bottom: 16px;">
            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                <button class="modal-btn modal-btn-secondary" id="upload-file-btn" style="flex: 1;">📁 上传文件</button>
            <button class="modal-btn modal-btn-secondary" id="paste-url-btn" style="flex: 1;">🔗 粘贴URL</button>
            </div>
            <input type="file" class="modal-input" id="avatar-file-input" accept="image/*" style="display: none;">
            <input type="text" class="modal-input" id="avatar-url-input" placeholder="输入图片URL地址" style="display: none;">
            <div id="avatar-preview" style="text-align: center; margin-top: 10px; display: none;">
            <img id="preview-image" style="max-width: 100px; max-height: 100px; border-radius: 50%; border: 2px solid var(--border-color);">
            </div>
            </div>
            <div class="modal-buttons">
            <button class="modal-btn modal-btn-secondary" id="cancel-avatar">取消</button>
            <button class="modal-btn modal-btn-primary" id="save-avatar" disabled>保存</button>
            </div>
            `;

            showModal(modal.modal);

            const fileInput = document.getElementById('avatar-file-input');
            const urlInput = document.getElementById('avatar-url-input');
            const uploadBtn = document.getElementById('upload-file-btn');
            const pasteUrlBtn = document.getElementById('paste-url-btn');
            const previewDiv = document.getElementById('avatar-preview');
            const previewImg = document.getElementById('preview-image');
            const saveBtn = document.getElementById('save-avatar');
            const cancelBtn = document.getElementById('cancel-avatar');

            let currentAvatarData = null;


            uploadBtn.addEventListener('click', () => {
                fileInput.click();
                urlInput.style.display = 'none';
            uploadBtn.classList.add('active');
            pasteUrlBtn.classList.remove('active');
            });


            pasteUrlBtn.addEventListener('click', () => {
                urlInput.style.display = 'block';
            fileInput.style.display = 'none';
            pasteUrlBtn.classList.add('active');
            uploadBtn.classList.remove('active');
            urlInput.focus();
            });


fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        if (file.size > MAX_AVATAR_SIZE) {
            showNotification('头像大小超过限制(最大5MB)', 'error');
            return;
        }

         showNotification('图片处理中...', 'info', 1000);
        
        cropImageToSquare(file, 300).then(base64Data => {
             currentAvatarData = base64Data;
            previewImg.src = currentAvatarData;
            previewDiv.style.display = 'block';
            saveBtn.disabled = false;
        }).catch(err => {
            console.error(err);
            showNotification('图片处理失败', 'error');
        });
    }
});


            urlInput.addEventListener('input',
                function() {
                    const url = urlInput.value.trim();
                    if (url) {

                        if (/^(https?:\/\/.*.(?:png|jpg|jpeg|gif|webp))$/i.test(url)) {
                            previewImg.src = url;
                            previewDiv.style.display = 'block';
                            currentAvatarData = url;
                            saveBtn.disabled = false;


                            const img = new Image();
                            img.onload = function() {

                                previewImg.src = url;
                            };
                            img.onerror = function() {
                                    showNotification('图片URL加载失败，请检查链接', 'error');
                                    saveBtn.disabled = true;
                                };
                            img.src = url;
                        } else {
                            saveBtn.disabled = true;
                        }
                    } else {
                        saveBtn.disabled = true;
                        previewDiv.style.display = 'none';
                    }
                });


            saveBtn.addEventListener('click',
                () => {
                    if (currentAvatarData) {
                        updateAvatar(isPartner ? DOMElements.partner.avatar: DOMElements.me.avatar, currentAvatarData);
                        throttledSaveData();
                        showNotification('头像已更新', 'success');
                        hideModal(modal.modal);
                    }
                });


            cancelBtn.addEventListener('click',
                () => {
                    hideModal(modal.modal);
                });
        };

        DOMElements.partner.name.addEventListener('click', () => openNameModal(true));
        DOMElements.me.name.addEventListener('click', () => openNameModal(false));
        DOMElements.partner.avatar.addEventListener('click', () => openAvatarModal(true));
        DOMElements.me.avatar.addEventListener('click', () => openAvatarModal(false));

        DOMElements.me.statusContainer.addEventListener('click', () => {
            const statusTextElement = DOMElements.me.statusText; const statusContainer = DOMElements.me.statusContainer;
            if (statusContainer.querySelector('input')) return;
            const input = document.createElement('input'); input.type = 'text'; input.id = 'my-status-input'; input.value = statusTextElement.textContent;
            const saveStatus = () => {
                const newStatus = input.value.trim() || '在线';
                if (newStatus !== settings.myStatus) {
                    settings.myStatus = newStatus;
                    updateUI();
                    throttledSaveData();
                }
            };
            const handleInputKeyDown = (e) => {
                if (e.key === 'Enter') {
                    saveStatus();
                } else if (e.key === 'Escape') {
                    statusContainer.removeChild(input);
                    input.removeEventListener('keydown', handleInputKeyDown);
                    input.removeEventListener('blur', saveStatus);
                }
            };
            input.addEventListener('keydown', handleInputKeyDown);
            input.addEventListener('blur', saveStatus);
            statusContainer.appendChild(input);
            input.focus();
        });

        DOMElements.sessionManagerBtn.addEventListener('click', () => {
            showModal(DOMElements.chatModal.modal);
        });

        DOMElements.groupChatBtn.addEventListener('click', () => {
            showModal(DOMElements.groupChatModal);
        });

        DOMElements.envelopeHeaderBtn.addEventListener('click', () => {
            showModal(DOMElements.envelopeModal);
        });

        DOMElements.companionBtn.addEventListener('click', () => {
            showModal(DOMElements.companionModal);
        });

        DOMElements.settingsBtn.addEventListener('click', () => {
            showModal(DOMElements.settingsModal);
        });
    }

    function initDataManagementListeners() {
        const closeSettings = document.getElementById('cancel-settings');
        if (closeSettings) {
            closeSettings.onclick = () => {
                hideModal(document.getElementById('settings-modal'));
            };
        }
    }

    function initNewFeatureListeners() {}

// Decision Panel Toggle Functionality
function initDecisionModule() {
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
}
