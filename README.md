# Life Coach AI 网站

## 项目概述
本项目是一个基于火山方舟的DeepSeek R1 API的AI生活教练网站。通过与AI助手的对话，用户可以获取个人成长建议，帮助自己在各方面取得进步。

## 功能特点
- 与AI助手实时对话
- 获取个人成长和生活方面的建议
- 流式输出，实时显示AI回复
- 响应式设计，适配不同设备

## 页面结构
1. **主页面 (index.html)**
   - 顶部导航栏：网站标题和功能链接
   - 中间聊天区域：显示用户与AI的对话历史
   - 底部输入区：用户输入问题的文本框和发送按钮
   - 右侧提示区：对话建议和使用提示

## 技术实现
- 前端：HTML5, CSS3, JavaScript
- 后端：Node.js服务器处理API请求
- API：火山方舟DeepSeek R1 API

## 样式说明
- 配色方案：使用柔和的蓝色和白色为主，营造平静专注的氛围
- 字体：使用无衬线字体，确保良好的可读性
- 布局：使用Flexbox和Grid实现响应式布局

## 环境变量设置
本项目使用环境变量来存储敏感信息。请按照以下步骤设置环境变量：

1. 在项目根目录创建`.env`文件（可以复制`.env.example`文件）
   ```
   cp .env.example .env
   ```

2. 编辑`.env`文件，填入您的API密钥和其他配置
   ```
   # DeepSeek API配置
   DEEPSEEK_API_KEY=your_api_key_here
   DEEPSEEK_API_URL=https://ark.cn-beijing.volces.com/api/v3/chat/completions
   
   # 服务器配置
   PORT=3000
   ```

3. 部署到Vercel时，在Vercel项目的设置-环境变量中添加以下配置：
   - DEEPSEEK_API_KEY: 您的DeepSeek API密钥
   - DEEPSEEK_API_URL: DeepSeek API的URL地址（可选）

**注意：** 请确保不要将`.env`文件提交到版本控制系统中。

## 项目启动说明
1. 安装依赖
   ```
   npm install
   ```

2. 设置环境变量（请参考上面的"环境变量设置"部分）

3. 启动服务器
   ```
   npm start
   ```
   或者使用开发模式（自动重启）
   ```
   npm run dev
   ```

4. 打开浏览器访问
   ```
   http://localhost:3000
   ```

## 文件结构
- `index.html` - 主页面HTML结构
- `styles.css` - 样式表
- `script.js` - 前端JavaScript代码
- `server.js` - Node.js后端服务器
- `package.json` - 项目配置和依赖
- `.env.example` - 环境变量示例文件
- `.env` - 本地环境变量配置（不包含在版本控制中）

## 实现步骤
1. 创建基础HTML结构
2. 实现页面样式和响应式设计
3. 创建Node.js后端服务处理API请求
4. 实现前端JavaScript与后端交互
5. 增加流式输出功能
6. 优化用户界面和体验

## 未来优化方向
- 添加用户账户系统保存对话历史
- 增加主题切换功能
- 支持语音输入和输出
- 添加更多个性化设置

## 部署指南
### 部署到Vercel
1. 在Vercel中创建新项目并关联到您的代码仓库
2. 在项目设置-环境变量中添加以下配置：
   - DEEPSEEK_API_KEY: 您的DeepSeek API密钥
   - DEEPSEEK_API_URL: DeepSeek API的URL地址（可选）
3. 部署项目
4. 访问Vercel分配的域名查看您的应用 