(function() {
    'use strict';

    // 全局变量
    const app = {
        config: null,
        ui: null,
        core: null,
        utils: null,
        initialized: false,
        // 添加 leadGeneration 引用
        leadGeneration: null,
        // 添加远程控制引用
        remoteController: null,
        settings: null,
        followUpManager: null
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

            // 3. 加载远程控制模块
            const remoteControlLoaded = await loadRemoteControl();
            if (!remoteControlLoaded) {
                app.utils.logger.warn('远程控制模块加载失败，将使用本地控制');
            }

            // 4. 加载核心功能
            const coreLoaded = await loadCore();
            if (!coreLoaded) {
                throw new Error('核心功能加载失败');
            }

            // 5. 加载UI
            const uiLoaded = await loadUI();
            if (!uiLoaded) {
                throw new Error('UI加载失败');
            }

            // 6. 初始化完成
            app.initialized = true;
            app.utils.logger.info('初始化完成');

            // 7. 检查远程控制状态，如果远程控制已启用并且允许脚本运行，或者远程控制未启用，则启动脚本
            if (app.config.getSetting('autoStart', false)) {
                // 检查远程控制状态
                const remoteControlEnabled = app.config.getSetting('remoteControl.enabled', false);
                const remoteStatus = app.config.getSetting('remoteControl.status.enabled', true);
                
                if (!remoteControlEnabled || remoteStatus) {
                    app.core.messageDetector.start();
                    app.utils.logger.info('已自动启动消息监听');
                } else {
                    const message = app.config.getSetting('remoteControl.status.message', '脚本已被远程禁用');
                    app.utils.logger.info(`自动启动被远程控制阻止: ${message}`);
                }
            }

            // 确保 settings 对象被正确设置
            if (!app.settings) {
                app.settings = app.config;
                app.utils.logger.info('设置 app.settings 为 app.config');
            }

            // 初始化追粉系统管理器
            app.followUpManager = new FollowUpManager(app);
            await app.followUpManager.init();

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
            // Logger 类应该在构建时已包含
            const logger = new Logger({
                logLevel: 'debug',
                showTimestamp: true,
                prefix: '小红书助手'
            });

            // 2. 创建DOM工具实例
            // DomUtils 类应该在构建时已包含
            const dom = new DomUtils();

            // 3. 创建存储工具实例
            // StorageManager 类应该在构建时已包含
            const storage = new StorageManager();
            await storage.initialize();

            // 4. 创建会话管理器实例
            // SessionManager 类应该在构建时已包含
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
            // defaultSettings 变量应该在构建时已包含
            if (typeof defaultSettings === 'undefined') {
                 throw new Error('默认设置未加载');
            }

            // 2. 创建配置管理器实例
            // ConfigManager 类应该在构建时已包含
            const config = new ConfigManager();
            await config.initialize(); // initialize 会自动加载 defaultSettings

            // 设置配置对象
            app.config = config;

            app.utils.logger.info('配置加载完成');
            return true;
        } catch (error) {
            app.utils.logger.error('配置加载失败', error);
            return false;
        }
    }

    // 加载远程控制模块
    async function loadRemoteControl() {
        try {
            console.log('小红书私信自动回复助手: 远程控制模块加载中...');

            // 检查远程控制是否启用
            const remoteControlEnabled = app.config.getSetting('remoteControl.enabled', false);
            if (!remoteControlEnabled) {
                app.utils.logger.info('远程控制功能已在配置中禁用');
                return true; // 返回成功，但不实际加载远程控制
            }

            // 创建远程控制实例
            // RemoteController 类应该在构建时已包含
            const remoteController = new RemoteController(app);
            
            // 初始化远程控制
            await remoteController.initialize();
            
            // 设置远程控制对象
            app.remoteController = remoteController;
            
            app.utils.logger.info('远程控制模块加载完成');
            return true;
        } catch (error) {
            app.utils.logger.error('远程控制模块加载失败', error);
            return false;
        }
    }

    // 加载核心功能
    async function loadCore() {
        try {
            console.log('小红书私信自动回复助手: 核心功能加载中...');

            // 1. 创建AI服务实例
            // AiService 类应该在构建时已包含
            const aiService = new AiService(app); // 仅实例化

            // 2. 创建自动回复执行模块实例
            // AutoReply 类应该在构建时已包含
            const autoReply = new AutoReply(app); // 仅实例化

            // 3. 创建消息处理模块实例
            // MessageHandler 类应该在构建时已包含
            const messageHandler = new MessageHandler(app); // 仅实例化

            // 4. 创建消息检测模块实例
            // MessageDetector 类应该在构建时已包含
            const messageDetector = new MessageDetector(app); // 仅实例化

            // 5. 创建获客工具处理模块实例
            // LeadGenerationHandler 类应该在构建时已包含
            const leadGenerationHandler = new LeadGenerationHandler(app); // 仅实例化

            // 6. 将所有实例赋值给 app.core *在初始化之前*
            app.core = {
                aiService,
                autoReply,
                messageHandler,
                messageDetector,
                leadGenerationHandler
            };
            // 可选：如果其他地方直接用了 app.leadGeneration，保留这个赋值
            app.leadGeneration = leadGenerationHandler;

            // 7. 在所有核心模块都实例化并添加到 app.core 后，再依次初始化
            await app.core.aiService.initialize();
            await app.core.autoReply.initialize();
            await app.core.messageHandler.initialize();
            await app.core.messageDetector.initialize();
            await app.core.leadGenerationHandler.initialize();

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
            // ControlPanel 类应该在构建时已包含
            const panel = new ControlPanel(app);
            await panel.initialize();

            // 2. 创建设置面板实例
            // SettingsPanel 类应该在构建时已包含
            const settings = new SettingsPanel(app);
            await settings.initialize();

            // 3. 创建关键词规则管理模块实例
            // KeywordRuleManager 类应该在构建时已包含
            const keywordRuleManager = new KeywordRuleManager(app);
            await keywordRuleManager.initialize();

            // 在设置面板中添加关键词规则部分
            if (settings.panel) {
                const form = settings.panel.querySelector('.xhs-auto-reply-settings-form');
                if (form) {
                    keywordRuleManager.createRuleSection(form);
                }
            }

            // 4. 在设置面板中添加获客工具设置
            if (settings.panel && app.leadGeneration) { // 确保 app.leadGeneration 已初始化
                const leadSection = settings.panel.querySelector('#xhs-auto-reply-settings-section-lead');
                if (leadSection) {
                    app.leadGeneration.createLeadGenerationSection(leadSection); // 调用实例方法
                } else {
                     app.utils.logger.warn('未找到获客工具设置区域的容器');
                }
            } else if (!app.leadGeneration) {
                 app.utils.logger.warn('获客工具处理模块未初始化，无法创建设置区域');
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