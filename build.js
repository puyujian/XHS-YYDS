const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator'); // 引入混淆库

const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');
const outputFile = path.join(distDir, 'xhs_helper_modular.user.js');

// 定义模块加载顺序，确保依赖关系正确
const moduleOrder = [
    'logger.js',
    'domUtils.js',
    'storageManager.js',
    'defaultSettings.js', // 需要在 ConfigManager 之前
    'configManager.js',
    'remoteController.js', // 远程控制模块，需要在 app.js 之前
    'aiService.js',
    'sessionManager.js', // 需要在 MessageHandler 之前
    'leadGenerationHandler.js', // 需要在 MessageHandler 之前
    'followUpHandler.js', // 需要在 FollowUpManager 之前
    'followUpManager.js', // 需要在 app.js 之前
    'autoReply.js', // 需要在 MessageHandler 之前
    'messageHandler.js',
    'messageDetector.js',
    'controlPanel.js',
    'settingsPanel.js',
    'keywordRuleManager.js',
    'app.js' // 主应用逻辑最后加载
];

// 混淆选项 (可以根据需要调整)
const obfuscationOptions = {
    compact: true, // 压缩代码
    controlFlowFlattening: true, // 控制流平坦化
    controlFlowFlatteningThreshold: 0.75,
    deadCodeInjection: true, // 注入死代码
    deadCodeInjectionThreshold: 0.4,
    debugProtection: false, // 调试保护 (可能影响开发)
    debugProtectionInterval: 0,
    disableConsoleOutput: false, // 禁用 console 输出 (谨慎使用)
    identifierNamesGenerator: 'hexadecimal', // 标识符名称生成器
    log: false,
    numbersToExpressions: true, // 数字转表达式
    renameGlobals: false, // 重命名全局变量 (可能破坏脚本)
    rotateStringArray: true, // 旋转字符串数组
    selfDefending: true, // 自我防御
    shuffleStringArray: true, // 打乱字符串数组
    splitStrings: true, // 分割字符串
    splitStringsChunkLength: 10,
    stringArray: true, // 字符串数组
    stringArrayEncoding: ['base64'], // 字符串数组编码
    stringArrayIndexShift: true,
    stringArrayThreshold: 0.75,
    transformObjectKeys: true, // 转换对象键名
    unicodeEscapeSequence: false // Unicode 转义序列
};


async function buildScript() {
    try {
        // 检查命令行参数是否包含 --no-obfuscate
        const args = process.argv.slice(2); // 获取命令行参数，排除 node 和脚本路径
        const shouldObfuscate = !args.includes('--no-obfuscate');

        console.log(`开始构建油猴脚本... (${shouldObfuscate ? '包含混淆' : '不包含混淆'})`);

        // 确保 dist 目录存在
        if (!fs.existsSync(distDir)) {
            fs.mkdirSync(distDir);
            console.log(`创建目录: ${distDir}`);
        }

        // 1. 读取元数据
        const metadataPath = path.join(srcDir, 'metadata.js');
        if (!fs.existsSync(metadataPath)) {
            throw new Error(`元数据文件未找到: ${metadataPath}`);
        }
        const metadataContent = fs.readFileSync(metadataPath, 'utf8');
        console.log('读取元数据完成.');

        // 2. 读取并合并模块文件
        let combinedContent = '';
        for (const moduleFile of moduleOrder) {
            const modulePath = path.join(srcDir, moduleFile);
            if (fs.existsSync(modulePath)) {
                console.log(`读取模块: ${moduleFile}`);
                const moduleContent = fs.readFileSync(modulePath, 'utf8');
                // 添加换行符确保模块间分隔
                combinedContent += moduleContent + '\n\n';
            } else {
                console.warn(`警告: 模块文件未找到，跳过: ${modulePath}`);
            }
        }
        console.log('合并模块完成.');

        let finalCodeToUse;

        if (shouldObfuscate) {
            // 3. 混淆合并后的代码
            console.log('开始混淆代码...');
            const obfuscatedCode = JavaScriptObfuscator.obfuscate(combinedContent, obfuscationOptions);
            finalCodeToUse = obfuscatedCode.getObfuscatedCode();
            console.log('代码混淆完成.');
        } else {
            // 3. 跳过混淆
            console.log('跳过代码混淆步骤 (使用了 --no-obfuscate 参数)...');
            finalCodeToUse = combinedContent;
        }

        // 4. 组合最终脚本内容 (元数据 + 处理后的代码)
        const finalScriptContent = metadataContent + '\n\n' + finalCodeToUse;

        // 5. 写入目标文件
        fs.writeFileSync(outputFile, finalScriptContent, 'utf8');
        console.log(`构建并混淆成功！脚本已输出到: ${outputFile}`);

    } catch (error) {
        console.error('构建或混淆失败:', error);
        process.exit(1); // 构建失败时退出
    }
}

buildScript();