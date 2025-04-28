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
        followUpManager: null,
        // 添加初始化状态标记
        initializing: false,
        startupErrors: [],
        componentStatus: {}
    };

    // 初始化函数
    async function initialize() {
        // 防止重复初始化
        if (app.initializing) {
            console.log('初始化已在进行中，请等待...');
            return false;
        }
        if (app.initialized) {
            console.log('已经初始化完成，无需重复初始化');
            return true;
        }

        app.initializing = true;
        app.startupErrors = [];
        app.componentStatus = {
            utils: false,
            config: false,
            remoteControl: false,
            core: false,
            ui: false
        };

        try {
            console.log('小红书私信自动回复助手: 正在初始化...');

            // 1. 加载工具类
            const utilsLoaded = await loadUtils();
            if (!utilsLoaded) {
                app.startupErrors.push('工具类加载失败');
                throw new Error('工具类加载失败');
            }
            app.componentStatus.utils = true;

            // 2. 加载配置
            const configLoaded = await loadConfig();
            if (!configLoaded) {
                app.startupErrors.push('配置加载失败');
                throw new Error('配置加载失败');
            }
            app.componentStatus.config = true;

            // 3. 加载远程控制模块
            const remoteControlLoaded = await loadRemoteControl();
            if (!remoteControlLoaded) {
                app.utils.logger.warn('远程控制模块加载失败，将使用本地控制');
            } else {
                app.componentStatus.remoteControl = true;
            }

            // 4. 加载核心功能
            const coreLoaded = await loadCore();
            if (!coreLoaded) {
                app.startupErrors.push('核心功能加载失败');
                throw new Error('核心功能加载失败');
            }
            app.componentStatus.core = true;

            // 5. 加载UI
            const uiLoaded = await loadUI();
            if (!uiLoaded) {
                app.startupErrors.push('UI加载失败');
                throw new Error('UI加载失败');
            }
            app.componentStatus.ui = true;

            // 6. 初始化完成
            app.initialized = true;
            app.initializing = false;
            app.utils.logger.info('初始化完成');

            // 7. 检查远程控制状态，如果远程控制已启用并且允许脚本运行，或者远程控制未启用，则启动脚本
            if (app.config.getSetting('autoStart', false)) {
                // 检查远程控制状态
                const remoteControlEnabled = app.config.getSetting('remoteControl.enabled', false);
                const remoteStatus = app.config.getSetting('remoteControl.status.enabled', true);
                
                if (!remoteControlEnabled || remoteStatus) {
                    // 延迟启动以确保其他组件完全就绪
                    setTimeout(() => {
                        startMessageDetection();
                    }, 1000);
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

            return true;
        } catch (error) {
            console.error('小红书私信自动回复助手: 初始化失败', error);
            if (app.utils && app.utils.logger) {
                app.utils.logger.error('初始化失败', error);
            }
            app.initializing = false;
            return false;
        }
    }

    /**
     * 安全启动消息检测
     */
    function startMessageDetection() {
        try {
            // 双重检查确保所有依赖组件已初始化
            if (!app.initialized) {
                app.utils.logger.warn('应用尚未初始化完成，无法启动消息检测');
                return false;
            }

            if (!app.core || !app.core.messageDetector) {
                app.utils.logger.error('消息检测器未初始化，无法启动');
                return false;
            }

            // 启动消息检测
            const result = app.core.messageDetector.start();
            if (result) {
                app.utils.logger.info('消息检测成功启动');
            } else {
                app.utils.logger.error('消息检测启动失败');
            }
            return result;
        } catch (error) {
            app.utils.logger.error('启动消息检测时发生错误', error);
            return false;
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

            // 1. 创建设置面板
            // SettingsPanel 类应该在构建时已包含
            const settingsPanel = new SettingsPanel(app);
            await settingsPanel.initialize();

            // 2. 创建控制面板
            // ControlPanel 类应该在构建时已包含
            const controlPanel = new ControlPanel(app);
            await controlPanel.initialize();

            // 设置UI对象
            app.ui = {
                settingsPanel,
                controlPanel
            };

            app.utils.logger.info('UI加载完成');
            return true;
        } catch (error) {
            app.utils.logger.error('UI加载失败', error);
            return false;
        }
    }

    // 检查是否在私信页面
    function isInMessagePage() {
        return (
            window.location.href.includes('xiaohongshu.com/im') || 
            window.location.href.includes('xiaohongshu.com/message')
        );
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
        try {
            await waitForPageLoad();

            // 如果不在私信页面，则不初始化
            if (!isInMessagePage()) {
                console.log('小红书私信自动回复助手: 当前不在私信页面，不进行初始化');
                return;
            }

            // 延迟初始化，确保页面完全加载
            setTimeout(async () => {
                // 尝试初始化
                const success = await initialize();
                if (!success) {
                    console.error('小红书私信自动回复助手: 初始化失败，请刷新页面重试');
                    
                    // 添加重试机制
                    if (app.startupErrors && app.startupErrors.length > 0) {
                        console.error('初始化错误列表:', app.startupErrors);
                    }
                    
                    // 尝试再次初始化，最多3次
                    let retryCount = 0;
                    const maxRetries = 3;
                    const retryInterval = 5000; // 5秒
                    
                    const retryInitialize = async () => {
                        if (retryCount >= maxRetries || app.initialized) return;
                        
                        retryCount++;
                        console.log(`小红书私信自动回复助手: 尝试重新初始化 (${retryCount}/${maxRetries})...`);
                        
                        const retrySuccess = await initialize();
                        if (!retrySuccess && retryCount < maxRetries) {
                            setTimeout(retryInitialize, retryInterval);
                        }
                    };
                    
                    setTimeout(retryInitialize, retryInterval);
                }
            }, 2000); // 延迟2秒初始化
        } catch (error) {
            console.error('小红书私信自动回复助手: 主函数执行失败', error);
        }
    }

    // 启动
    main();

})();