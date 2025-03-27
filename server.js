// 引入所需模块
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const bodyParser = require('body-parser');
const http = require('http');
const net = require('net');

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3000;

// API密钥
const API_KEY = '9553bd77-ac9a-4877-836e-6c1bce1ae8ff';
const API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

// 中间件设置
app.use(cors()); // 启用CORS
app.use(bodyParser.json()); // 解析JSON请求
app.use(express.static(__dirname)); // 静态文件服务

// 设置请求超时时间为60秒
const axiosInstance = axios.create({
    timeout: 60000
});

// 服务器状态端点
app.get('/api/status', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        serverInfo: {
            port: req.socket.localPort,
            version: '1.0.0'
        }
    });
});

// 标准API请求处理（非流式）
app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: '无效的请求格式' });
        }
        
        // 创建API请求体
        const requestBody = {
            model: 'deepseek-r1-250120',
            messages: messages,
            temperature: 0.6,
            stream: false // 非流式传输
        };
        
        // 发送请求到火山方舟API
        const response = await axiosInstance.post(API_URL, requestBody, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            }
        });
        
        // 检查响应是否有效
        if (response.data && response.data.choices && response.data.choices.length > 0) {
            const aiResponse = response.data.choices[0].message.content;
            res.json({ response: aiResponse });
        } else {
            throw new Error('无效的API响应');
        }
    } catch (error) {
        console.error('API请求错误:', error.message);
        
        // 返回友好的错误信息
        res.status(500).json({
            error: '服务器错误',
            message: error.message
        });
    }
});

// 流式API请求处理
app.post('/api/chat/stream', async (req, res) => {
    try {
        const { messages } = req.body;
        
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: '无效的请求格式' });
        }
        
        // 设置响应头，支持流式传输
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        // 创建API请求体
        const requestBody = {
            model: 'deepseek-r1-250120',
            messages: messages,
            temperature: 0.6,
            stream: true // 启用流式传输
        };
        
        // 流式传输处理
        const response = await axiosInstance.post(API_URL, requestBody, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            responseType: 'stream'
        });
        
        // 处理流式响应
        response.data.on('data', (chunk) => {
            try {
                const dataString = chunk.toString('utf8');
                
                // 处理SSE数据格式
                const lines = dataString.split('\n').filter(line => line.trim() !== '');
                
                for (const line of lines) {
                    if (line.startsWith('data:')) {
                        const jsonData = line.slice(5).trim();
                        
                        // 跳过流结束标记
                        if (jsonData === '[DONE]') {
                            continue;
                        }
                        
                        try {
                            const data = JSON.parse(jsonData);
                            
                            if (data.choices && data.choices.length > 0) {
                                const delta = data.choices[0].delta;
                                
                                if (delta && delta.content) {
                                    // 发送内容增量给客户端
                                    res.write(`data: ${JSON.stringify({ content: delta.content })}\n\n`);
                                }
                            }
                        } catch (e) {
                            console.error('解析JSON出错:', e);
                        }
                    }
                }
            } catch (e) {
                console.error('处理数据块出错:', e);
            }
        });
        
        // 处理流结束或错误
        response.data.on('end', () => {
            res.write('data: [DONE]\n\n');
            res.end();
        });
        
        response.data.on('error', (err) => {
            console.error('流错误:', err);
            res.end();
        });
        
        // 处理客户端断开连接
        req.on('close', () => {
            response.data.destroy();
        });
    } catch (error) {
        console.error('流式API请求错误:', error.message);
        
        // 尝试发送错误响应
        try {
            res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
            res.end();
        } catch (e) {
            console.error('无法发送错误响应:', e);
        }
    }
});

// 主页路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 检查端口是否可用
function isPortAvailable(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        
        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                // 端口被占用
                resolve(false);
            } else {
                // 其他错误
                resolve(false);
            }
        });
        
        server.once('listening', () => {
            // 关闭服务器，端口可用
            server.close();
            resolve(true);
        });
        
        server.listen(port);
    });
}

// 寻找可用端口
async function findAvailablePort(startPort) {
    let port = startPort;
    while (!(await isPortAvailable(port))) {
        console.log(`端口 ${port} 已被占用，尝试下一个端口...`);
        port++;
        if (port > startPort + 100) {
            throw new Error('无法找到可用端口');
        }
    }
    return port;
}

// 启动服务器（使用可用端口）
async function startServer() {
    try {
        const availablePort = await findAvailablePort(PORT);
        app.listen(availablePort, () => {
            console.log(`服务器运行在 http://localhost:${availablePort}`);
        });
    } catch (error) {
        console.error('启动服务器失败:', error.message);
        process.exit(1);
    }
}

startServer(); 