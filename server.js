// 加载环境变量
require('env').config();

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

// 从环境变量中获取API密钥和URL
const API_KEY = process.env.DEEPSEEK_API_KEY;
const API_URL = process.env.DEEPSEEK_API_URL || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

// 增强日志记录，用于调试
console.log('环境检查:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`- PORT配置: ${PORT}`);
console.log(`- API_URL配置: ${API_URL ? '已配置' : '未配置'}`);
console.log(`- API_KEY配置: ${API_KEY ? '已配置 (已隐藏具体值)' : '未配置'}`);

// 检查是否设置了必要的环境变量
if (!API_KEY) {
    console.error('错误: 未设置DEEPSEEK_API_KEY环境变量');
    // 在生产环境中，我们不希望因为缺少API密钥而导致整个应用崩溃
    if (process.env.NODE_ENV === 'production') {
        console.error('在生产环境中，应用将继续运行，但API功能将不可用');
    } else {
        console.error('请创建一个.env文件并设置DEEPSEEK_API_KEY');
    }
}

// 中间件设置
app.use(cors()); // 启用CORS
app.use(bodyParser.json()); // 解析JSON请求
app.use(express.static(__dirname)); // 静态文件服务

// 记录请求日志的中间件
app.use((req, res, next) => {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - 开始处理`);
    
    // 添加响应完成后的日志记录
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - 完成处理 [${res.statusCode}] ${duration}ms`);
    });
    next();
});

// 设置请求超时时间为45秒（Vercel的无服务器函数超时时间为60秒）
const axiosInstance = axios.create({
    timeout: 45000
});

// 服务器状态端点
app.get('/api/status', (req, res) => {
    // 检查环境变量是否有改变（例如在Vercel重新部署后）
    const currentApiKey = process.env.DEEPSEEK_API_KEY;
    
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        serverInfo: {
            port: req.socket.localPort,
            version: '1.0.1',
            apiConfigured: !!currentApiKey,
            environment: process.env.NODE_ENV || 'development',
            platform: process.env.VERCEL ? 'vercel' : 'other'
        }
    });
});

// 统一错误处理中间件
const errorHandler = (err, req, res, next) => {
    const errorId = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    
    console.error(`[ERROR ${errorId}] ${err.message}`);
    if (err.stack) {
        console.error(`[STACK ${errorId}]`, err.stack);
    }
    
    // 错误响应
    res.status(err.statusCode || 500).json({
        error: err.code || 'SERVER_ERROR',
        message: process.env.NODE_ENV === 'production' 
            ? '服务器处理请求时遇到问题' 
            : err.message,
        errorId: errorId,
        details: process.env.NODE_ENV === 'production' ? undefined : err.details
    });
};

// 处理所有API请求的统一端点，默认使用流式响应
app.post('/api/chat', async (req, res, next) => {
    if (!API_KEY) {
        return res.status(503).json({ 
            error: 'API_NOT_CONFIGURED',
            message: '服务器未正确配置API密钥，无法处理请求'
        });
    }

    // 获取请求的stream参数，默认为true使用流式传输
    const useStream = req.query.stream !== 'false';
    
    try {
        const { messages } = req.body;
        
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ 
                error: 'INVALID_REQUEST_FORMAT',
                message: '请求消息格式不正确，必须提供messages数组' 
            });
        }

        console.log(`处理聊天请求: 消息数量=${messages.length}, 使用流式=${useStream}`);
        
        // 创建API请求体
        const requestBody = {
            model: 'deepseek-r1-250120',
            messages: messages,
            temperature: 0.6,
            stream: useStream
        };
        
        // 如果不使用流式传输，直接返回完整响应
        if (!useStream) {
            try {
                const response = await axiosInstance.post(API_URL, requestBody, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${API_KEY}`
                    }
                });
                
                if (response.data) {
                    return res.json(response.data);
                } else {
                    throw new Error('无效的API响应');
                }
            } catch (error) {
                handleApiError(error, res);
                return;
            }
        }
        
        // 否则使用流式传输
        console.log(`发送流式请求到API: ${API_URL.replace(/\/[^\/]+$/, '/***')}`);
        
        // 设置响应头，支持流式传输
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        try {
            // 流式传输处理
            const response = await axiosInstance.post(API_URL, requestBody, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                responseType: 'stream'
            });
            
            console.log('流式连接建立成功');
            
            // 处理流式响应
            response.data.on('data', (chunk) => {
                try {
                    const dataString = chunk.toString('utf8');
                    
                    // 直接将API返回的SSE格式数据转发给客户端
                    res.write(dataString);
                } catch (e) {
                    console.error('处理数据块出错:', e);
                }
            });
            
            // 处理流结束或错误
            response.data.on('end', () => {
                console.log('流式响应完成');
                res.write('data: [DONE]\n\n');
                res.end();
            });
            
            response.data.on('error', (err) => {
                console.error('流错误:', err);
                // 尝试发送错误信息给客户端
                res.write(`data: ${JSON.stringify({ error: true, message: err.message })}\n\n`);
                res.end();
            });
            
            // 处理客户端断开连接
            req.on('close', () => {
                console.log('客户端关闭连接');
                response.data.destroy();
            });
        } catch (error) {
            // 如果在建立流式连接时出错，尝试以SSE格式发送错误
            console.error('建立流式连接出错:', error.message);
            res.write(`data: ${JSON.stringify({ error: true, message: "无法连接到API服务器" })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
        }
    } catch (error) {
        // 处理其他异常
        next(error);
    }
});

// 处理API错误的辅助函数
function handleApiError(error, res) {
    console.error('API请求错误:', error.message);
    
    // 处理特定的错误状态
    if (error.response) {
        console.error(`API错误响应: 状态=${error.response.status}, 数据=`, error.response.data);
        
        // 根据状态码返回相应的错误
        switch (error.response.status) {
            case 401:
            case 403:
                return res.status(error.response.status).json({
                    error: 'API_AUTH_ERROR',
                    message: 'API授权失败，请检查API密钥是否正确'
                });
            case 429:
                return res.status(429).json({
                    error: 'API_RATE_LIMIT',
                    message: 'API请求频率过高，请稍后再试'
                });
            default:
                return res.status(error.response.status || 502).json({
                    error: 'EXTERNAL_API_ERROR',
                    status: error.response.status,
                    message: `API返回错误: ${error.response.status}`,
                    details: process.env.NODE_ENV === 'production' ? undefined : error.response.data
                });
        }
    }
    
    if (error.code === 'ECONNABORTED') {
        return res.status(504).json({
            error: 'API_TIMEOUT',
            message: 'API请求超时，服务器可能负载过高，请稍后再试'
        });
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
        return res.status(502).json({
            error: 'API_CONNECTION_FAILED',
            message: '无法连接到API服务器，请检查网络连接和API URL'
        });
    }
    
    // 其他未知错误
    return res.status(500).json({
        error: 'API_REQUEST_FAILED',
        message: error.message
    });
}

// 注册错误处理中间件
app.use(errorHandler);

// 检查端口是否可用
function isPortAvailable(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        
        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(false);
            } else {
                resolve(true);
            }
        });
        
        server.once('listening', () => {
            server.close();
            resolve(true);
        });
        
        server.listen(port);
    });
}

// 查找可用端口
async function findAvailablePort(startPort) {
    let port = startPort;
    
    while (!(await isPortAvailable(port))) {
        port++;
        
        if (port - startPort > 10) {
            throw new Error('无法找到可用端口');
        }
    }
    
    return port;
}

// 启动服务器
async function startServer() {
    try {
        let actualPort = parseInt(PORT, 10);
        
        // 如果指定的端口不可用，查找一个可用端口
        if (!(await isPortAvailable(actualPort))) {
            const newPort = await findAvailablePort(actualPort + 1);
            console.warn(`警告: 端口 ${actualPort} 已被占用，使用端口 ${newPort} 代替`);
            actualPort = newPort;
        }
        
        const server = http.createServer(app);
        
        server.listen(actualPort, () => {
            console.log(`服务器运行在 http://localhost:${actualPort}`);
            console.log(`API配置状态: ${API_KEY ? '已配置' : '未配置'}`);
        });
        
        // 处理服务器错误
        server.on('error', (err) => {
            console.error('服务器错误:', err);
            if (err.code === 'EADDRINUSE') {
                console.error(`错误: 端口 ${actualPort} 已被占用`);
            }
        });
        
        // 优雅关闭
        process.on('SIGTERM', () => {
            console.log('收到 SIGTERM 信号，正在关闭服务器...');
            server.close(() => {
                console.log('服务器已关闭');
                process.exit(0);
            });
        });
    } catch (err) {
        console.error('启动服务器失败:', err);
        process.exit(1);
    }
}

// 启动服务器
if (require.main === module) {
    startServer();
}

// 导出app实例，用于测试或外部导入
module.exports = { app }; 
