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
const statusIndicator = document.querySelector('.status-indicator');
const statusText = document.querySelector('.status-text');
const refreshConnectionButton = document.getElementById('refreshConnection');

// 获取当前服务器URL
const apiBaseUrl = window.location.origin; // 使用当前页面的域名和端口
// 重试次数限制和时间间隔(ms)
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// 聊天历史记录
let chatHistory = [
    { role: "system", content: "你是一名专业的生活教练，帮助用户制定目标、克服困难，提供个人成长建议。你的回答应该积极、鼓励、实用。" }
];

// 服务器状态
let serverStatus = {
    isOnline: false,
    apiConfigured: false,
    lastChecked: null
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 绑定发送按钮点击事件
    sendButton.addEventListener('click', sendMessage);
    
    // 绑定刷新连接按钮
    refreshConnectionButton.addEventListener('click', () => {
        checkServerStatus(true);
    });
    
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
async function checkServerStatus(isManualCheck = false) {
    try {
        updateStatusIndicator('checking');
        if (isManualCheck) {
            showSystemMessage('正在检查服务器连接...');
        }
        
        const response = await fetch(`${apiBaseUrl}/api/status`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('服务器状态:', data);
            
            serverStatus.isOnline = true;
            serverStatus.lastChecked = new Date();
            
            if (data.serverInfo && data.serverInfo.apiConfigured) {
                serverStatus.apiConfigured = true;
                updateStatusIndicator('online');
                if (isManualCheck) {
                    showSystemMessage('服务器连接正常，API配置成功');
                }
                console.log('API配置正常');
            } else {
                serverStatus.apiConfigured = false;
                updateStatusIndicator('warning');
                showSystemMessage('API未正确配置，聊天功能可能不可用。请检查服务器的环境变量配置。');
                console.warn('API配置异常');
            }
        } else {
            serverStatus.isOnline = false;
            serverStatus.apiConfigured = false;
            updateStatusIndicator('error');
            const errorMessage = `服务器返回错误状态: ${response.status} ${response.statusText}`;
            showSystemMessage(`服务器连接异常: ${response.status} ${response.statusText}`);
            console.warn(errorMessage);
        }
    } catch (error) {
        serverStatus.isOnline = false;
        serverStatus.apiConfigured = false;
        updateStatusIndicator('offline');
        showSystemMessage('无法连接到服务器，请检查网络连接或服务器状态');
        console.error('无法连接到服务器:', error);
    }
}

// 更新状态指示器
function updateStatusIndicator(status) {
    // 移除所有状态类
    statusIndicator.classList.remove('online', 'offline', 'error', 'warning', 'checking');
    
    // 添加新状态类
    statusIndicator.classList.add(status);
    
    // 更新文本
    switch (status) {
        case 'online':
            statusText.textContent = '在线';
            break;
        case 'offline':
            statusText.textContent = '离线';
            break;
        case 'error':
            statusText.textContent = '错误';
            break;
        case 'warning':
            statusText.textContent = '配置异常';
            break;
        case 'checking':
            statusText.textContent = '检查中...';
            break;
        default:
            statusText.textContent = '未知状态';
    }
    
    // 更新输入框状态
    if (status === 'online') {
        userInput.disabled = false;
        userInput.placeholder = "输入您的问题...";
    } else if (status === 'checking') {
        userInput.disabled = true;
        userInput.placeholder = "检查连接中...";
    } else {
        userInput.disabled = true;
        userInput.placeholder = status === 'offline' ? "服务器离线，无法发送消息" : "服务器异常，无法发送消息";
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

// 显示系统消息到聊天区域
function showSystemMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message system-message-chat';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'system-content';
    
    const icon = document.createElement('i');
    icon.className = 'fas fa-info-circle';
    
    const span = document.createElement('span');
    span.textContent = message;
    
    contentDiv.appendChild(icon);
    contentDiv.appendChild(span);
    messageDiv.appendChild(contentDiv);
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

// 发送消息
async function sendMessage() {
    // 获取用户输入
    const message = userInput.value.trim();
    
    // 如果输入为空，直接返回
    if (!message) return;
    
    // 检查服务器状态
    if (!serverStatus.isOnline) {
        showSystemMessage('服务器目前不可用，请稍后再试');
        return;
    }
    
    // 禁用输入
    setInputEnabled(false);
    
    // 清空输入框
    userInput.value = '';
    autoResizeTextarea();
    
    // 添加用户消息到界面
    appendMessage('user', message);
    
    // 添加用户消息到历史记录
    chatHistory.push({ role: "user", content: message });
    
    // 创建流式响应的消息框
    createStreamingMessage();
    
    try {
        // 获取AI响应
        await fetchRealTimeStreamingResponse(chatHistory);
    } catch (error) {
        // 错误处理
        console.error('获取响应失败:', error);
        finalizeStreamingMessage('抱歉，获取回复时出现错误。请稍后再试。');
        
        // 根据错误类型显示不同的系统消息
        if (error.name === 'AbortError') {
            showSystemMessage('请求超时，可能是网络问题或服务器响应时间过长');
        } else if (error.message && error.message.includes('NetworkError')) {
            showSystemMessage('网络错误，请检查您的网络连接');
            setTimeout(() => checkServerStatus(true), 3000); // 延迟检查服务器状态
        } else if (error.status === 429) {
            showSystemMessage('请求过于频繁，请稍后再试');
        } else if (error.status === 401 || error.status === 403) {
            showSystemMessage('API授权失败，请联系管理员检查API密钥配置');
        } else if (error.status >= 500) {
            showSystemMessage('服务器内部错误，请联系管理员检查服务器日志');
        } else {
            // 通用错误消息
            showSystemMessage(`请求异常: ${error.message || '未知错误'}`);
        }
    } finally {
        // 重新启用输入
        setInputEnabled(true);
    }
}

// 添加消息到界面
function appendMessage(sender, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'avatar';
    
    const avatarIcon = document.createElement('i');
    if (sender === 'user') {
        avatarIcon.className = 'fas fa-user';
    } else if (sender === 'ai') {
        avatarIcon.className = 'fas fa-brain';
    }
    
    avatarDiv.appendChild(avatarIcon);
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const paragraph = document.createElement('p');
    paragraph.textContent = content;
    contentDiv.appendChild(paragraph);
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

// 创建流式响应消息框
function createStreamingMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ai-message streaming';
    messageDiv.id = 'streamingMessage';
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'avatar';
    
    const avatarIcon = document.createElement('i');
    avatarIcon.className = 'fas fa-brain';
    avatarDiv.appendChild(avatarIcon);
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const paragraph = document.createElement('p');
    paragraph.innerHTML = '<span class="loading-dots">思考中<span>.</span><span>.</span><span>.</span></span>';
    contentDiv.appendChild(paragraph);
    
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

// 更新流式响应内容
function updateStreamingMessage(content) {
    const streamingMessage = document.getElementById('streamingMessage');
    if (streamingMessage) {
        const paragraph = streamingMessage.querySelector('p');
        paragraph.textContent = content;
        scrollToBottom();
    }
}

// 完成流式响应
function finalizeStreamingMessage(content) {
    const streamingMessage = document.getElementById('streamingMessage');
    if (streamingMessage) {
        streamingMessage.classList.remove('streaming');
        const paragraph = streamingMessage.querySelector('p');
        paragraph.textContent = content;
        scrollToBottom();
        
        // 添加AI消息到历史记录
        chatHistory.push({ role: "assistant", content: content });
    }
}

// 设置输入状态
function setInputEnabled(enabled) {
    userInput.disabled = !enabled;
    sendButton.disabled = !enabled;
    
    if (enabled) {
        hideLoading();
        userInput.focus();
    } else {
        showLoading();
    }
}

// 获取实时流式响应
async function fetchRealTimeStreamingResponse(history, retryCount = 0) {
    try {
        // 设置请求超时10秒
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        
        // 发送请求
        const response = await fetch(`${apiBaseUrl}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ messages: history }),
            signal: controller.signal
        });
        
        // 清除超时计时器
        clearTimeout(timeoutId);
        
        // 检查响应状态
        if (!response.ok) {
            const errorText = await response.text();
            const error = new Error(`服务器返回错误: ${response.status} ${response.statusText}`);
            error.status = response.status;
            error.text = errorText;
            throw error;
        }
        
        // 如果不是流式响应，直接获取完整响应
        if (!response.headers.get('content-type')?.includes('text/event-stream')) {
            const data = await response.json();
            if (data && data.choices && data.choices[0] && data.choices[0].message) {
                const content = data.choices[0].message.content;
                finalizeStreamingMessage(content);
                return;
            } else {
                throw new Error('服务器返回的数据格式不正确');
            }
        }
        
        // 处理流式响应
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let result = '';
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                // 解码获取的数据块
                const chunk = decoder.decode(value, { stream: true });
                
                // 根据特定格式解析数据块
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data:') && line.trim() !== 'data: [DONE]') {
                        try {
                            const data = JSON.parse(line.slice(5));
                            if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
                                result += data.choices[0].delta.content;
                                updateStreamingMessage(result);
                            }
                        } catch (e) {
                            console.warn('解析响应数据异常:', e, line);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('读取流式响应时发生错误:', error);
            throw error;
        } finally {
            // 完成响应
            finalizeStreamingMessage(result || '回复内容加载失败');
        }
    } catch (error) {
        // 如果遇到网络错误且未超过最大重试次数，尝试重新连接
        if ((error.name === 'TypeError' || error.message?.includes('NetworkError') || error.message?.includes('network')) 
            && retryCount < MAX_RETRIES) {
            console.warn(`网络错误，正在尝试重新连接 (${retryCount + 1}/${MAX_RETRIES})...`);
            updateStreamingMessage(`连接中断，正在尝试重新连接... (${retryCount + 1}/${MAX_RETRIES})`);
            
            // 延迟后重试
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve(fetchRealTimeStreamingResponse(history, retryCount + 1));
                }, RETRY_DELAY * (retryCount + 1)); // 指数退避
            });
        }
        
        // 重试失败或其他错误，直接抛出
        throw error;
    }
}

// 模拟流式响应（用于测试）
async function simulateStreaming(text) {
    return new Promise((resolve) => {
        let index = 0;
        let result = '';
        
        const interval = setInterval(() => {
            if (index < text.length) {
                // 添加字符
                result += text[index];
                updateStreamingMessage(result);
                index++;
            } else {
                // 完成流式响应
                clearInterval(interval);
                finalizeStreamingMessage(result);
                resolve();
            }
        }, 20); // 每20毫秒添加一个字符
    });
}

// 自动调整文本框高度
function autoResizeTextarea() {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 150) + 'px';
}

// 滚动到底部
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
} 