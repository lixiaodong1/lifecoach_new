// 全局变量
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const suggestionItems = document.querySelectorAll('.suggestion-item');
const loadingOverlay = document.getElementById('loadingOverlay');
const clearChatButton = document.getElementById('clearChat');
const aboutLink = document.getElementById('aboutLink');
const guideLink = document.getElementById('guideLink');
const aboutModal = document.getElementById('aboutModal');
const guideModal = document.getElementById('guideModal');
const closeButtons = document.querySelectorAll('.close-button');

// 获取当前服务器URL
const apiBaseUrl = window.location.origin;

// 聊天历史记录
let chatHistory = [
    { role: "system", content: "你是一名专业的生活教练，帮助用户制定目标、克服困难，提供个人成长建议。你的回答应该积极、鼓励、实用。" }
];

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 绑定发送按钮点击事件
    sendButton.addEventListener('click', sendMessage);
    
    // 绑定输入框按下回车键事件
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // 自动增加输入框高度
    userInput.addEventListener('input', autoResizeTextarea);
    
    // 绑定建议项点击事件
    suggestionItems.forEach(item => {
        item.addEventListener('click', () => {
            const suggestionText = item.querySelector('p').innerText.replace(/"/g, '');
            userInput.value = suggestionText;
            sendMessage();
        });
        
        // 键盘支持
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const suggestionText = item.querySelector('p').innerText.replace(/"/g, '');
                userInput.value = suggestionText;
                sendMessage();
            }
        });
    });
    
    // 绑定清空聊天按钮
    clearChatButton.addEventListener('click', clearChat);
    
    // 绑定关于链接
    aboutLink.addEventListener('click', (e) => {
        e.preventDefault();
        showModal(aboutModal);
    });
    
    // 绑定使用指南链接
    guideLink.addEventListener('click', (e) => {
        e.preventDefault();
        showModal(guideModal);
    });
    
    // 绑定关闭按钮
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            hideModal(modal);
        });
    });
    
    // 点击模态框外部关闭
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            hideModal(e.target);
        }
    });
    
    // ESC键关闭模态框
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
    
    // 检查服务器状态
    checkServerStatus();
    
    // 聚焦输入框
    userInput.focus();
});

// 检查服务器状态
async function checkServerStatus() {
    try {
        const response = await fetch(`${apiBaseUrl}/api/status`);
        if (response.ok) {
            console.log('服务器连接正常');
            
            // 显示在线状态
            document.querySelector('.status-indicator').classList.add('online');
            document.querySelector('.status-text').textContent = '在线';
        } else {
            console.warn('服务器状态异常');
            
            // 显示离线状态
            document.querySelector('.status-indicator').classList.remove('online');
            document.querySelector('.status-text').textContent = '连接异常';
        }
    } catch (error) {
        console.error('无法连接到服务器:', error);
        
        // 显示离线状态
        document.querySelector('.status-indicator').classList.remove('online');
        document.querySelector('.status-text').textContent = '离线';
    }
}

// 显示模态框
function showModal(modal) {
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
    document.body.style.overflow = 'hidden'; // 防止背景滚动
}

// 隐藏模态框
function hideModal(modal) {
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300); // 与过渡动画时间相匹配
    document.body.style.overflow = '';
}

// 关闭所有模态框
function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (modal.classList.contains('active')) {
            hideModal(modal);
        }
    });
}

// 显示加载指示器
function showLoading() {
    loadingOverlay.classList.add('active');
}

// 隐藏加载指示器
function hideLoading() {
    loadingOverlay.classList.remove('active');
}

// 清空聊天记录
function clearChat() {
    // 保留系统消息
    chatHistory = [chatHistory[0]];
    
    // 清空聊天界面，只保留初始欢迎消息
    while (chatMessages.children.length > 1) {
        chatMessages.removeChild(chatMessages.lastChild);
    }
    
    // 显示清空成功的提示
    showTemporaryMessage('聊天记录已清空');
}

// 显示临时提示信息
function showTemporaryMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'system-message';
    messageElement.textContent = message;
    messageElement.style.position = 'fixed';
    messageElement.style.bottom = '20px';
    messageElement.style.left = '50%';
    messageElement.style.transform = 'translateX(-50%)';
    messageElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    messageElement.style.color = 'white';
    messageElement.style.padding = '10px 20px';
    messageElement.style.borderRadius = '5px';
    messageElement.style.zIndex = '1000';
    messageElement.style.opacity = '0';
    messageElement.style.transition = 'opacity 0.3s';
    
    document.body.appendChild(messageElement);
    
    // 显示消息
    setTimeout(() => {
        messageElement.style.opacity = '1';
    }, 10);
    
    // 3秒后隐藏消息
    setTimeout(() => {
        messageElement.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(messageElement);
        }, 300);
    }, 3000);
}

// 发送消息
async function sendMessage() {
    const message = userInput.value.trim();
    
    // 检查消息是否为空
    if (!message) return;
    
    // 显示用户消息
    appendMessage('user', message);
    
    // 清空输入框并重置高度
    userInput.value = '';
    userInput.style.height = 'auto';
    
    // 禁用输入和发送按钮
    setInputEnabled(false);
    
    // 将用户消息添加到聊天历史
    chatHistory.push({ role: "user", content: message });
    
    try {
        // 创建AI消息占位符，用于流式输出
        const aiMessageId = createStreamingMessage();
        
        // 使用API获取回复
        await fetchRealTimeStreamingResponse(chatHistory);
        
        // 重新启用输入
        setInputEnabled(true);
        
        // 焦点回到输入框
        userInput.focus();
    } catch (error) {
        console.error('API请求错误:', error);
        
        // 显示错误消息
        appendMessage('ai', '抱歉，发生了一些错误，请稍后再试。');
        
        // 重新启用输入
        setInputEnabled(true);
    }
    
    // 滚动到最新消息
    scrollToBottom();
}

// 添加消息到聊天区域
function appendMessage(sender, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'avatar';
    
    const icon = document.createElement('i');
    icon.className = sender === 'user' ? 'fas fa-user' : 'fas fa-brain';
    avatarDiv.appendChild(icon);
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const paragraph = document.createElement('p');
    paragraph.textContent = content;
    contentDiv.appendChild(paragraph);
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    
    chatMessages.appendChild(messageDiv);
    
    // 滚动到最新消息
    scrollToBottom();
    
    return messageDiv.id;
}

// 创建用于流式输出的消息
function createStreamingMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai-message';
    messageDiv.id = 'ai-streaming-message';
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'avatar';
    
    const icon = document.createElement('i');
    icon.className = 'fas fa-brain';
    avatarDiv.appendChild(icon);
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const paragraph = document.createElement('p');
    paragraph.id = 'streaming-content';
    paragraph.textContent = '';
    contentDiv.appendChild(paragraph);
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    
    chatMessages.appendChild(messageDiv);
    
    // 滚动到最新消息
    scrollToBottom();
    
    return messageDiv.id;
}

// 更新流式输出消息内容
function updateStreamingMessage(content) {
    const streamingContent = document.getElementById('streaming-content');
    if (streamingContent) {
        streamingContent.textContent = content;
        scrollToBottom();
    }
}

// 完成流式输出后保存消息
function finalizeStreamingMessage(content) {
    const streamingMessage = document.getElementById('ai-streaming-message');
    if (streamingMessage) {
        streamingMessage.id = '';
        updateStreamingMessage(content);
        
        // 将AI回复添加到聊天历史
        chatHistory.push({ role: "assistant", content: content });
    }
}

// 启用或禁用输入
function setInputEnabled(enabled) {
    userInput.disabled = !enabled;
    sendButton.disabled = !enabled;
    
    if (!enabled) {
        sendButton.classList.add('disabled');
    } else {
        sendButton.classList.remove('disabled');
    }
}

// 获取API响应
async function fetchRealTimeStreamingResponse(history) {
    // 显示加载状态
    showLoading();
    
    let fullResponse = '';
    
    try {
        // 发送API请求
        const response = await fetch(`${apiBaseUrl}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ messages: history })
        });
        
        // 隐藏加载状态
        hideLoading();
        
        if (!response.ok) {
            throw new Error(`HTTP错误：${response.status}`);
        }
        
        const data = await response.json();
        const aiResponse = data.response;
        
        // 模拟流式输出
        await simulateStreaming(aiResponse);
        
        // 完成流式输出
        finalizeStreamingMessage(aiResponse);
        
        return aiResponse;
    } catch (error) {
        // 隐藏加载状态
        hideLoading();
        console.error('API请求错误:', error);
        throw error;
    }
}

// 模拟流式输出效果
async function simulateStreaming(text) {
    let currentText = '';
    const words = text.split('');
    
    for (let i = 0; i < words.length; i++) {
        currentText += words[i];
        updateStreamingMessage(currentText);
        
        // 随机延迟模拟真实打字速度，按字符显示，但不同类型的标点符号有不同的速度
        let delay = 20; // 基础延迟
        
        // 标点符号后停顿更长
        if (',.!?;:'.includes(words[i])) {
            if (i < words.length - 1 && words[i+1] === ' ') {
                delay = 120; // 句子结束停顿更长
            } else {
                delay = 60; // 一般标点符号停顿
            }
        } else if (words[i] === ' ') {
            delay = 40; // 单词间隔
        } else {
            // 普通字符有一些随机性
            delay = Math.floor(Math.random() * 20) + 20;
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
    }
}

// 自动调整文本框高度
function autoResizeTextarea() {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 150) + 'px';
}

// 滚动到聊天区域底部
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
} 