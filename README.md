# 小红书私信自动回复助手

[![版本](https://img.shields.io/badge/版本-0.2-blue.svg)](https://github.com/puyujian/XHS-YYDS)
[![语言](https://img.shields.io/badge/语言-JavaScript-yellow.svg)](https://github.com/puyujian/XHS-YYDS)
[![平台](https://img.shields.io/badge/平台-Tampermonkey-green.svg)](https://tampermonkey.net/)

一个为小红书用户设计的强大私信自动回复工具，帮助创作者提高消息处理效率，优化粉丝互动体验。

## ✨ 主要功能

- **AI智能回复**：集成OpenAI API，实现智能化对话，提供类似真人的沟通体验
- **关键词触发系统**：支持多规则配置，根据消息内容精准匹配自定义回复
- **对话历史记忆**：保存与用户的聊天历史，实现连贯性对话，增强用户体验
- **数据分析统计**：追踪回复量、成功率、平均响应时间等关键指标
- **远程控制机制**：通过配置文件远程启停脚本，无需直接访问设备
- **获客转化工具**：辅助用户拉新和粉丝管理，提升转化效率
- **自动追粉系统**：管理用户后续跟进流程，建立完整获客漏斗
- **完全模块化设计**：代码结构清晰，易于维护和扩展

## 🚀 安装指南

### 前置要求

- 浏览器：Chrome, Firefox, Edge 或其他支持Tampermonkey的现代浏览器
- 已安装Tampermonkey扩展

### 安装步骤

1. **安装Tampermonkey浏览器扩展**
   - [Chrome商店](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - [Firefox附加组件](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
   - [Edge插件商店](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

2. **安装本脚本**
   - 方法一：点击Tampermonkey图标 > 添加新脚本 > 粘贴脚本内容
   - 方法二：直接通过脚本安装链接安装(请联系作者获取)

## 💡 使用指南

### 基本设置

1. 安装脚本后访问小红书网页版
2. 进入私信页面，脚本会自动加载并在页面上显示控制面板
3. 首次使用需配置相关设置:
   - 基本设置：开启/关闭自动回复功能
   - AI回复：配置OpenAI API密钥（如需使用AI功能）
   - 关键词规则：设置触发关键词和对应回复内容

### 高级功能

#### 关键词规则系统

支持多种匹配方式:
- 精确匹配：消息内容与关键词完全一致时触发
- 包含匹配：消息内容包含关键词时触发
- 正则匹配：支持复杂规则的高级匹配方式

#### AI回复配置

- 支持设置AI提示词(Prompt)，自定义AI回复风格和内容
- 可配置最大Token数量和温度参数
- 支持切换不同的AI模型

#### 粉丝管理体系

- 自动标记消息状态：未处理、已回复、需跟进
- 粉丝分级：根据互动频率、购买意向自动分类
- 数据导出：支持导出粉丝数据用于外部分析

## 🔄 远程控制系统

该功能允许您远程控制脚本的运行状态，特别适合需要管理多账号或多设备的用户。

### 设置步骤

1. 在设置面板的"远程控制"选项卡中启用远程控制功能
2. 设置远程配置文件的URL地址
3. 设置检查间隔（建议5-10分钟）

### 配置文件格式

远程配置文件必须是标准JSON格式:

```json
{
  "enabled": true,  // true启用脚本，false禁用脚本
  "message": "当前运行状态提示信息",  // 显示给用户的消息
  "lastUpdated": "2023-08-01T12:00:00Z",  // 更新时间
  "settings": {  // 可选的高级设置
    "aiEnabled": true,  // 是否启用AI回复
    "keywordRulesEnabled": true,  // 是否启用关键词规则
    "checkInterval": 300  // 远程检查间隔(秒)
  }
}
```

### 托管配置文件方法

您可以使用以下服务托管JSON配置文件：

- **GitHub Gist**: 使用原始链接 (Raw URL)
- **JSON Bin**: 通过 https://jsonbin.io/ 托管
- **GitHub Pages / Netlify / Vercel**: 适合需要更多控制的用户
- **自建服务器**: 最大的灵活性，需要自行处理CORS问题

> **注意**: 配置URL必须支持CORS访问，且使用HTTPS协议

## 🛠️ 开发者指南

### 项目结构

```
project
├── src/                      # 源代码目录
│   ├── app.js                # 主应用入口
│   ├── autoReply.js          # 自动回复功能
│   ├── messageDetector.js    # 消息检测器
│   ├── domUtils.js           # DOM操作工具
│   ├── logger.js             # 日志记录
│   ├── followUpManager.js    # 追踪管理
│   ├── aiService.js          # AI服务接口
│   ├── keywordRuleManager.js # 关键词规则管理
│   ├── settingsPanel.js      # 设置面板
│   ├── controlPanel.js       # 控制面板
│   ├── configManager.js      # 配置管理
│   ├── remoteController.js   # 远程控制
│   └── metadata.js           # 脚本元数据
├── dist/                     # 构建输出目录
├── build.js                  # 构建脚本
└── package.json              # 项目依赖
```

### 关键模块说明

- **app.js**: 主程序入口，负责初始化和协调各模块
- **messageDetector.js**: 监听并检测新消息
- **autoReply.js**: 实现自动回复核心逻辑
- **aiService.js**: 处理与AI服务的通信
- **domUtils.js**: 封装DOM操作，确保跨浏览器兼容性
- **remoteController.js**: 实现远程控制功能

### 构建方法

1. 安装依赖:
```bash
npm install
```

2. 构建生产版本(带代码混淆):
```bash
node build.js
```

3. 构建开发版本(不带混淆):
```bash
node build.js --no-obfuscate
```

### 开发建议

- 遵循模块化设计，确保代码解耦
- 使用logger.js进行日志记录，便于调试
- 修改前先理解现有模块间的依赖关系
- 新功能开发建议创建独立模块

## 🔒 隐私和安全

- 本脚本只在本地处理数据，不会将用户数据上传至任何第三方服务器
- 如启用AI功能，消息内容将发送至OpenAI服务，请遵守相关隐私政策
- 所有设置和数据存储在浏览器本地，不会跨设备同步

## 📊 常见问题

1. **Q: 为什么我的AI回复功能不工作?**  
   A: 请检查您的API密钥是否正确设置，以及网络连接是否正常。同时确认API调用额度是否充足。

2. **Q: 脚本会记录聊天内容吗?**  
   A: 脚本会在浏览器本地存储聊天历史以实现连续对话功能，但不会上传至任何服务器。

3. **Q: 如何彻底卸载该脚本?**  
   A: 在Tampermonkey扩展管理界面删除脚本，然后在浏览器的Application/Storage设置中清除相关站点的本地存储数据。

## 📜 许可和版权

本项目采用专有许可证，请联系作者获取商业使用授权。

© 2023 迪迦. 保留所有权利。

## 👨‍💻 贡献者

- 迪迦 - 项目负责人与主要开发者

## 🔗 相关链接

- [项目主页](https://github.com/puyujian/XHS-YYDS)
- [问题反馈](https://github.com/puyujian/XHS-YYDS/issues)
- [小红书官网](https://www.xiaohongshu.com)

## 📝 更新日志

### v0.2 (当前版本)
- 重构为完全模块化架构
- 添加远程控制功能
- 优化AI回复体验
- 增强关键词规则系统

### v0.1
- 初始版本发布
- 基本自动回复功能
- 简单关键词匹配 