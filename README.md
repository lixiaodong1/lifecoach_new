# Life Coach AI

一个基于DeepSeek R1 API开发的个人AI教练应用，提供生活、工作、学习等多方面的指导和建议。

## 功能特点

- 个性化AI生活教练对话
- 流式响应，实时显示AI回复
- 简洁美观的用户界面
- 服务器状态监控
- 完善的错误处理机制

## 技术栈

- 前端：原生JavaScript、HTML5、CSS3
- 后端：Node.js、Express
- API：DeepSeek R1 (通过火山方舟)

## 安装步骤

### 前置条件

- Node.js 14.0.0 或更高版本
- npm 6.0.0 或更高版本
- DeepSeek R1 API密钥 (可从[火山方舟](https://ark.cn-beijing.volces.com/)获取)

### 本地安装

1. 克隆仓库

```bash
git clone https://github.com/你的用户名/life-coach-ai.git
cd life-coach-ai
```

2. 安装依赖

```bash
npm install
```

3. 配置环境变量

复制环境变量示例文件并编辑

```bash
cp .env.example .env
```

编辑.env文件，添加你的API密钥：

```
DEEPSEEK_API_KEY=你的API密钥
DEEPSEEK_API_URL=https://ark.cn-beijing.volces.com/api/v3/chat/completions
PORT=3000
```

4. 启动应用

```bash
npm start
```

应用将在 http://localhost:3000 运行

### 开发模式

使用nodemon自动重启服务器：

```bash
npm run dev
```

## 部署指南

### Vercel部署

1. Fork或克隆此仓库到你的GitHub账户
2. 在Vercel上创建新项目并导入你的仓库
3. 在环境变量设置中添加`DEEPSEEK_API_KEY`和`DEEPSEEK_API_URL`
4. 部署应用

## 常见问题

### API没有正确配置

如果遇到"API未正确配置"的错误:
1. 检查你的`.env`文件中是否正确设置了`DEEPSEEK_API_KEY`
2. 确认API密钥没有过期或被禁用
3. 验证`DEEPSEEK_API_URL`是否正确

### 部署后无法连接

如果在Vercel等平台部署后无法连接:
1. 检查环境变量是否正确设置
2. 查看平台的日志输出，寻找可能的错误信息
3. 确认你的API密钥有足够的权限和配额

### 流式响应中断

如果流式响应经常中断:
1. 检查网络连接是否稳定
2. 服务器和API之间可能存在超时问题，可以尝试使用非流式响应
3. 检查是否达到API调用频率限制

## 贡献指南

欢迎提交问题和拉取请求。对于重大更改，请先开issue讨论您想要更改的内容。

## 许可证

[ISC](LICENSE)

## 联系方式

如有任何问题或建议，请通过GitHub Issues联系。 