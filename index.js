// ==UserScript==
// @name         小红书私信自动回复助手
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  小红书私信自动回复工具，支持AI回复，关键词触发，历史记忆和数据统计
// @author       ChatGPT
// @match        https://*.xiaohongshu.com/*
// @icon         https://www.xiaohongshu.com/favicon.ico
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @connect      api.openai.com
// @connect      *
// @require      https://cdn.jsdelivr.net/npm/vue@3.2.47/dist/vue.global.js
// @require      file:///utils/Logger.js
// @require      file:///utils/DomUtils.js
// @require      file:///utils/StorageManager.js
// @require      file:///utils/ConfigManager.js
// @require      file:///utils/SessionManager.js
// @require      file:///config/defaultSettings.js
// @require      file:///core/AiService.js
// @require      file:///core/MessageHandler.js
// @require      file:///core/MessageDetector.js
// @require      file:///core/AutoReply.js
// @require      file:///core/LeadGenerationHandler.js
// @require      file:///ui/ControlPanel.js
// @require      file:///ui/SettingsPanel.js
// @require      file:///ui/KeywordRuleManager.js
// ==/UserScript==

(function() {
    'use strict';

    // 全局变量
    const app = {
        config: null,
        ui: null,
        core: null,
        utils: null,
        initialized: false
    };

    // 初始化函数
    async function initialize() {
        try {
            console.log('小红书私信自动回复助手: 正在初始化...');

            // 1. 加载工具类
            const utilsLoaded = await loadUtils();
            if (!utilsLoaded) {
                throw new Error('工具类加载失败');
            }

            // 2. 加载配置
            const configLoaded = await loadConfig();
            if (!configLoaded) {
                throw new Error('配置加载失败');
            }

            // 3. 加载核心功能
            const coreLoaded = await loadCore();
            if (!coreLoaded) {
                throw new Error('核心功能加载失败');
            }

            // 4. 加载UI
            const uiLoaded = await loadUI();
            if (!uiLoaded) {
                throw new Error('UI加载失败');
            }

            // 5. 初始化完成
            app.initialized = true;
            app.utils.logger.info('初始化完成');

            // 6. 开始监听消息
            if (app.config.getSetting('autoStart', false)) {
                app.core.messageDetector.start();
                app.utils.logger.info('已自动启动消息监听');
            }

        } catch (error) {
            console.error('小红书私信自动回复助手: 初始化失败', error);
            if (app.utils && app.utils.logger) {
                app.utils.logger.error('初始化失败', error);
            }
        }
    }

    // 加载工具类
    async function loadUtils() {
        try {
            console.log('小红书私信自动回复助手: 工具类加载中...');

            // 1. 创建日志工具实例
            const Logger = window.XHS_AUTO_REPLY_LOGGER;
            if (!Logger) {
                throw new Error('日志工具未加载');
            }
            const logger = new Logger({
                logLevel: 'debug',
                showTimestamp: true,
                prefix: '小红书助手'
            });

            // 2. 创建DOM工具实例
            const DomUtils = window.XHS_AUTO_REPLY_DOM_UTILS;
            if (!DomUtils) {
                throw new Error('DOM工具未加载');
            }
            const dom = new DomUtils();

            // 3. 创建存储工具实例
            const StorageManager = window.XHS_AUTO_REPLY_STORAGE_MANAGER;
            if (!StorageManager) {
                throw new Error('存储工具未加载');
            }
            const storage = new StorageManager();
            await storage.initialize();

            // 4. 创建会话管理器实例
            const SessionManager = window.XHS_AUTO_REPLY_SESSION_MANAGER;
            if (!SessionManager) {
                throw new Error('会话管理器未加载');
            }
            const sessionManager = new SessionManager(app);

            // 设置工具对象
            app.utils = {
                logger,
                dom,
                storage,
                sessionManager
            };

            // 初始化会话管理器（需要在app.utils设置后）
            await sessionManager.initialize();

            logger.info('所有工具类加载完成');
            return true;
        } catch (error) {
            console.error('小红书私信自动回复助手: 工具类加载失败', error);
            if (app.utils && app.utils.logger) {
                app.utils.logger.error('工具类加载失败', error);
            }
            return false;
        }
    }

    // 加载配置
    async function loadConfig() {
        try {
            console.log('小红书私信自动回复助手: 配置加载中...');

            // 1. 检查默认设置
            const defaultSettings = window.XHS_AUTO_REPLY_DEFAULT_SETTINGS;
            if (!defaultSettings) {
                throw new Error('默认设置未加载');
            }

            // 2. 创建配置管理器实例
            const ConfigManager = window.XHS_AUTO_REPLY_CONFIG_MANAGER;
            if (!ConfigManager) {
                throw new Error('配置管理器未加载');
            }

            const config = new ConfigManager();
            await config.initialize();

            // 设置配置对象
            app.config = config;

            app.utils.logger.info('配置加载完成');
            return true;
        } catch (error) {
            app.utils.logger.error('配置加载失败', error);
            return false;
        }
    }

    // 加载核心功能
    async function loadCore() {
        try {
            console.log('小红书私信自动回复助手: 核心功能加载中...');

            // 1. 创建AI服务实例
            const AiService = window.XHS_AUTO_REPLY_AI_SERVICE;
            if (!AiService) {
                throw new Error('AI服务未加载');
            }
            const aiService = new AiService(app);
            await aiService.initialize();

            // 2. 创建自动回复执行模块实例
            const AutoReply = window.XHS_AUTO_REPLY_AUTO_REPLY;
            if (!AutoReply) {
                throw new Error('自动回复模块未加载');
            }
            const autoReply = new AutoReply(app);
            await autoReply.initialize();

            // 3. 创建消息处理模块实例
            const MessageHandler = window.XHS_AUTO_REPLY_MESSAGE_HANDLER;
            if (!MessageHandler) {
                throw new Error('消息处理模块未加载');
            }
            const messageHandler = new MessageHandler(app);
            await messageHandler.initialize();

            // 4. 创建消息检测模块实例
            const MessageDetector = window.XHS_AUTO_REPLY_MESSAGE_DETECTOR;
            if (!MessageDetector) {
                throw new Error('消息检测模块未加载');
            }
            const messageDetector = new MessageDetector(app);
            await messageDetector.initialize();

            // 5. 创建获客工具处理模块实例
            const LeadGenerationHandler = window.XHS_AUTO_REPLY_LEAD_GENERATION_HANDLER;
            if (!LeadGenerationHandler) {
                throw new Error('获客工具处理模块未加载');
            }
            const leadGenerationHandler = new LeadGenerationHandler(app);
            await leadGenerationHandler.initialize();

            // 设置核心功能对象
            app.core = {
                aiService,
                autoReply,
                messageHandler,
                messageDetector,
                leadGenerationHandler
            };

            app.utils.logger.info('核心功能加载完成');
            return true;
        } catch (error) {
            app.utils.logger.error('核心功能加载失败', error);
            return false;
        }
    }

    // 加载UI
    async function loadUI() {
        try {
            console.log('小红书私信自动回复助手: UI加载中...');

            // 1. 创建控制面板实例
            const ControlPanel = window.XHS_AUTO_REPLY_CONTROL_PANEL;
            if (!ControlPanel) {
                throw new Error('控制面板未加载');
            }
            const panel = new ControlPanel(app);
            await panel.initialize();

            // 2. 创建设置面板实例
            const SettingsPanel = window.XHS_AUTO_REPLY_SETTINGS_PANEL;
            if (!SettingsPanel) {
                throw new Error('设置面板未加载');
            }
            const settings = new SettingsPanel(app);
            await settings.initialize();

            // 3. 创建关键词规则管理模块实例
            const KeywordRuleManager = window.XHS_AUTO_REPLY_KEYWORD_RULE_MANAGER;
            if (!KeywordRuleManager) {
                throw new Error('关键词规则管理器未加载');
            }
            const keywordRuleManager = new KeywordRuleManager(app);
            await keywordRuleManager.initialize();

            // 在设置面板中添加关键词规则部分
            if (settings.panel) {
                const form = settings.panel.querySelector('.xhs-auto-reply-settings-form');
                if (form) {
                    keywordRuleManager.createRuleSection(form);
                }
            }

            // 4. 在设置面板中添加获客工具部分
            if (settings.panel && app.core.leadGenerationHandler) {
                const form = settings.panel.querySelector('.xhs-auto-reply-settings-form');
                if (form) {
                    app.core.leadGenerationHandler.createLeadGenerationSection(form);
                }
            }

            // 设置UI对象
            app.ui = {
                panel,
                settings,
                keywordRuleManager
            };

            app.utils.logger.info('UI加载完成');
            return true;
        } catch (error) {
            app.utils.logger.error('UI加载失败', error);
            return false;
        }
    }

    // 检查是否在小红书私信页面
    function isInMessagePage() {
        return window.location.href.includes('xiaohongshu.com') &&
               (window.location.href.includes('/messages') ||
                window.location.href.includes('/im'));
    }

    // 等待页面加载完成
    function waitForPageLoad() {
        return new Promise(resolve => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve);
            }
        });
    }

    // 主函数
    async function main() {
        await waitForPageLoad();

        if (isInMessagePage()) {
            console.log('小红书私信自动回复助手: 检测到私信页面，开始初始化...');
            await initialize();
        } else {
            console.log('小红书私信自动回复助手: 非私信页面，跳过初始化');
        }
    }

    // 启动脚本
    main();

})(); 