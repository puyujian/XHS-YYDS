# 小红书私信自动回复助手

一个为小红书用户设计的自动回复私信工具，基于JavaScript/Tampermonkey脚本实现。

## ✨ 主要功能

- **智能回复**：支持AI自动回复私信，提高沟通效率
- **关键词触发**：设置关键词规则，根据消息内容智能匹配回复
- **历史记忆**：记住与用户的聊天历史，实现连续性对话
- **数据统计**：追踪回复效率、成功率等关键指标
- **远程控制**：无需直接访问设备即可控制脚本运行状态
- **获客工具**：辅助用户拉新和用户管理
- **自动追粉**：管理用户后续跟进流程

## 🚀 安装方法

1. 安装Tampermonkey浏览器扩展
   - [Chrome版](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - [Firefox版](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
   - [Edge版](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

2. 安装脚本
   - 点击Tampermonkey图标 > 添加新脚本
   - 或直接通过链接安装(待添加)

## 🔧 使用说明

1. 安装脚本后访问小红书网页版
2. 进入私信页面，脚本会自动加载
3. 点击控制面板设置自动回复规则
4. 根据需要配置AI回复、关键词规则等

## 远程控制功能说明

该功能允许您远程控制脚本的启停状态，无需直接接触用户的设备。

### 设置步骤

1. 在设置面板的"远程控制"选项卡中启用远程控制功能
2. 设置远程配置文件的URL地址
3. 设置检查间隔（建议5分钟或更长）

### 配置文件格式

远程配置文件必须是有效的JSON格式，基本结构如下：

```json
{
  "enabled": true,  // true表示允许脚本运行，false表示禁止运行
  "message": "脚本运行状态提示消息",  // 显示给用户的消息
  "lastUpdated": "2023-08-01T12:00:00Z"  // 最后更新时间（ISO格式）
}
```

### 托管配置文件的方式

您可以使用以下任一服务来托管JSON配置文件：

- **GitHub Gist**: 创建公开的gist，然后使用raw链接（获取方式：创建gist后，点击"Raw"按钮获取链接）
- **JSON Bin**: 使用 https://jsonbin.io/ 服务
- **JSON Storage**: 使用 https://jsonstorage.net/ 服务
- **任何支持静态文件托管的服务**: 如GitHub Pages, Netlify, Vercel等

### 使用示例

1. 创建两个配置文件，一个用于启用脚本，一个用于禁用脚本
2. 当需要远程禁用脚本时，更新您提供给用户的配置文件URL指向禁用版本
3. 脚本将在下次检查时（根据设置的检查间隔）自动停止运行

### 注意事项

- 请确保配置文件可以公开访问，不需要身份验证
- 使用HTTPS链接以确保安全
- 配置文件更新后，脚本最长需要等待一个检查间隔才会生效
- 如果远程配置无法访问，脚本将保持当前状态

## 🛠️ 开发相关

### 项目结构

```
project
├── src/                  # 源代码目录
│   ├── app.js            # 主应用入口
│   ├── autoReply.js      # 自动回复功能
│   ├── messageDetector.js # 消息检测器
│   ├── domUtils.js       # DOM操作工具
│   └── ...               # 其他模块
├── dist/                 # 构建输出目录
├── build.js              # 构建脚本
└── package.json          # 项目依赖
```

### 构建方法

1. 安装依赖:
```
npm install
```

2. 构建脚本:
```
node build.js
```

3. 构建不带混淆的版本（用于开发测试）:
```
node build.js --no-obfuscate
```

## 📜 许可证

请联系作者获取使用许可。

## 👨‍💻 贡献者

- 迪迦

## 🔗 相关链接

- [小红书官网](https://www.xiaohongshu.com)
- [问题反馈](https://github.com/your-username/your-repo/issues) 