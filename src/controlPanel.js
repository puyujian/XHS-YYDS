/**
 * 小红书私信自动回复助手 - 控制面板
 */

class ControlPanel {
    constructor(app) {
        this.app = app;
        this.panel = null; // 面板元素
        this.visible = false; // 面板是否可见
        this.initialized = false; // 是否已初始化
        this.position = null; // 面板位置
    }

    /**
     * 初始化控制面板
     */
    async initialize() {
        try {
            this.app.utils.logger.info('初始化控制面板');

            // 获取面板位置设置
            this.position = this.app.config.getSetting('ui.floatingPanelPosition', 'bottom-right');

            // 创建面板样式
            this.createStyles();

            // 创建面板DOM
            await this.createPanel();

            // 注册GM菜单项
            this.registerMenus();

            this.initialized = true;

            // 绑定事件
            this.bindEvents();

            return true;
        } catch (error) {
            this.app.utils.logger.error('初始化控制面板失败', error);
            return false;
        }
    }

    /**
     * 创建面板样式
     */
    createStyles() {
        const styles = `
            /* 控制面板样式 */
            .xhs-auto-reply-panel {
                position: fixed;
                width: 300px;
                background-color: #fff;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                z-index: 9999;
                font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
                transition: all 0.3s ease;
                overflow: hidden;
            }

            /* 面板位置 */
            .xhs-auto-reply-panel.top-left {
                top: 20px;
                left: 20px;
            }

            .xhs-auto-reply-panel.top-right {
                top: 20px;
                right: 20px;
            }

            .xhs-auto-reply-panel.bottom-left {
                bottom: 20px;
                left: 20px;
            }

            .xhs-auto-reply-panel.bottom-right {
                bottom: 20px;
                right: 20px;
            }

            /* 面板头部 */
            .xhs-auto-reply-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background-color: #FF2442;
                color: white;
                cursor: move;
            }

            .xhs-auto-reply-panel-title {
                font-weight: bold;
                font-size: 14px;
            }

            .xhs-auto-reply-panel-close {
                cursor: pointer;
                font-size: 16px;
            }

            /* 面板内容 */
            .xhs-auto-reply-panel-content {
                padding: 16px;
            }

            /* 开关样式 */
            .xhs-auto-reply-switch {
                position: relative;
                display: inline-block;
                width: 40px;
                height: 20px;
            }

            .xhs-auto-reply-switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }

            .xhs-auto-reply-switch-slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #ccc;
                transition: .4s;
                border-radius: 34px;
            }

            .xhs-auto-reply-switch-slider:before {
                position: absolute;
                content: "";
                height: 16px;
                width: 16px;
                left: 2px;
                bottom: 2px;
                background-color: white;
                transition: .4s;
                border-radius: 50%;
            }

            .xhs-auto-reply-switch input:checked + .xhs-auto-reply-switch-slider {
                background-color: #FF2442;
            }

            .xhs-auto-reply-switch input:checked + .xhs-auto-reply-switch-slider:before {
                transform: translateX(20px);
            }

            /* 设置项样式 */
            .xhs-auto-reply-setting-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }

            .xhs-auto-reply-setting-label {
                font-size: 14px;
                color: #333;
            }

            /* 按钮样式 */
            .xhs-auto-reply-btn {
                display: inline-block;
                padding: 6px 12px;
                background-color: #FF2442;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: background-color 0.3s;
                text-align: center;
                margin-right: 8px;
            }

            .xhs-auto-reply-btn:hover {
                background-color: #E60033;
            }

            .xhs-auto-reply-btn.secondary {
                background-color: #F0F0F0;
                color: #333;
            }

            .xhs-auto-reply-btn.secondary:hover {
                background-color: #E0E0E0;
            }

            /* 统计信息 */
            .xhs-auto-reply-stats {
                margin-top: 16px;
                padding-top: 16px;
                border-top: 1px solid #eee;
            }

            .xhs-auto-reply-stats-title {
                font-weight: bold;
                margin-bottom: 8px;
                font-size: 14px;
            }

            .xhs-auto-reply-stats-item {
                font-size: 12px;
                color: #666;
                margin-bottom: 4px;
            }

            /* 迷你图标样式 */
            .xhs-auto-reply-mini-icon {
                position: fixed;
                width: 40px;
                height: 40px;
                background-color: #FF2442;
                color: white;
                border-radius: 50%;
                display: flex;
                justify-content: center;
                align-items: center;
                cursor: pointer;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                z-index: 9999;
                font-size: 20px;
                transition: all 0.3s ease;
            }

            .xhs-auto-reply-mini-icon:hover {
                transform: scale(1.1);
            }

            /* 迷你图标位置 */
            .xhs-auto-reply-mini-icon.top-left {
                top: 20px;
                left: 20px;
            }

            .xhs-auto-reply-mini-icon.top-right {
                top: 20px;
                right: 20px;
            }

            .xhs-auto-reply-mini-icon.bottom-left {
                bottom: 20px;
                left: 20px;
            }

            .xhs-auto-reply-mini-icon.bottom-right {
                bottom: 20px;
                right: 20px;
            }

            /* 调试日志面板 */
            .xhs-auto-reply-debug-panel {
                max-height: 0;
                overflow: hidden;
                transition: max-height 0.3s ease;
                background-color: #f9f9f9;
                border-top: 1px solid #eee;
            }

            .xhs-auto-reply-debug-panel.active {
                max-height: 200px;
                overflow-y: auto;
            }

            .xhs-auto-reply-debug-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 16px;
                background-color: #f0f0f0;
                cursor: pointer;
            }

            .xhs-auto-reply-debug-panel-title {
                font-size: 12px;
                font-weight: bold;
                color: #333;
            }

            .xhs-auto-reply-debug-panel-toggle {
                font-size: 12px;
                color: #666;
            }

            .xhs-auto-reply-debug-log {
                padding: 8px 16px;
                font-size: 12px;
                font-family: monospace;
                overflow-y: auto;
                max-height: 160px;
            }

            .xhs-auto-reply-debug-log-item {
                margin-bottom: 4px;
                padding: 2px 0;
                border-bottom: 1px solid #eee;
            }

            .xhs-auto-reply-debug-log-item.error {
                color: #e74c3c;
            }

            .xhs-auto-reply-debug-log-item.warn {
                color: #f39c12;
            }

            .xhs-auto-reply-debug-log-item.info {
                color: #3498db;
            }

            .xhs-auto-reply-debug-log-item.debug {
                color: #7f8c8d;
            }

            .xhs-auto-reply-tabs {
                display: flex;
                border-bottom: 1px solid #eee;
            }

            .xhs-auto-reply-tab {
                padding: 8px 16px;
                font-size: 12px;
                cursor: pointer;
                border-bottom: 2px solid transparent;
            }

            .xhs-auto-reply-tab.active {
                border-bottom-color: #FF2442;
                font-weight: bold;
            }

            .xhs-auto-reply-tab-content {
                display: none;
                padding: 16px;
            }

            .xhs-auto-reply-tab-content.active {
                display: block;
            }
        `;

        GM_addStyle(styles);
        this.app.utils.logger.debug('添加控制面板样式');
    }

    /**
     * 创建面板DOM
     */
    async createPanel() {
        try {
            this.app.utils.logger.debug('正在创建控制面板DOM');

            const panel = document.createElement('div');
            panel.className = `xhs-auto-reply-panel ${this.position}`;
            panel.style.display = 'none';
            
            // 创建面板内容
            panel.innerHTML = `
                <div class="xhs-auto-reply-panel-header">
                    <div class="xhs-auto-reply-panel-title">小红书私信自动回复助手</div>
                    <div class="xhs-auto-reply-panel-close">×</div>
                </div>
                <div class="xhs-auto-reply-panel-content">
                    <div class="xhs-auto-reply-setting-item">
                        <span class="xhs-auto-reply-setting-label">自动回复</span>
                        <label class="xhs-auto-reply-switch">
                            <input type="checkbox" id="xhs-auto-reply-switch">
                            <span class="xhs-auto-reply-switch-slider"></span>
                        </label>
                    </div>
                    
                    <!-- 远程控制状态 -->
                    <div class="xhs-auto-reply-remote-control" style="margin-bottom: 12px; padding: 8px; border-radius: 4px; background-color: #f8f8f8; display: none;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 14px; color: #333;">远程控制状态</span>
                            <span class="xhs-auto-reply-remote-status" style="font-size: 12px; padding: 2px 6px; border-radius: 10px; background-color: #4CAF50; color: white;">已启用</span>
                        </div>
                        <div class="xhs-auto-reply-remote-message" style="font-size: 12px; color: #666; margin-top: 4px;"></div>
                        <div class="xhs-auto-reply-remote-updated" style="font-size: 11px; color: #999; margin-top: 2px;"></div>
                    </div>
                    
                    <div class="xhs-auto-reply-actions" style="margin-top: 16px;">
                        <button class="xhs-auto-reply-btn" id="xhs-auto-reply-settings-btn">设置</button>
                        <button class="xhs-auto-reply-btn secondary" id="xhs-auto-reply-stats-btn">统计</button>
                    </div>
                    
                    <div class="xhs-auto-reply-stats" id="xhs-auto-reply-stats" style="display: none;">
                        <h4 style="margin-bottom: 8px; font-size: 14px;">统计信息</h4>
                        <div class="xhs-auto-reply-stats-content">
                            <!-- 统计内容将动态插入 -->
                        </div>
                    </div>
                    
                    <div class="xhs-auto-reply-debug-log" style="margin-top: 16px; display: none;">
                        <h4 style="margin-bottom: 8px; font-size: 14px;">调试日志</h4>
                        <div class="xhs-auto-reply-log-content" style="max-height: 150px; overflow-y: auto; font-size: 12px; background-color: #f5f5f5; padding: 8px; border-radius: 4px; font-family: monospace;">
                            <!-- 日志内容将动态插入 -->
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(panel);
            this.panel = panel;
            
            // 创建迷你图标
            this.createMiniIcon();
            
            // 更新开关状态
            const switchElem = panel.querySelector('#xhs-auto-reply-switch');
            if (switchElem) {
                switchElem.checked = this.app.core.messageDetector.running;
            }
            
            // 设置面板可拖动
            this.makeDraggable(panel, panel.querySelector('.xhs-auto-reply-panel-header'));
            
            // 初始化远程控制状态显示
            this.updateRemoteControlStatus();
            
            this.app.utils.logger.debug('控制面板DOM创建完成');
            return true;
        } catch (error) {
            this.app.utils.logger.error('创建控制面板DOM失败', error);
            return false;
        }
    }

    /**
     * 创建设置项
     * @param {string} label 标签文本
     * @param {Element} control 控件元素
     * @returns {Element} 设置项元素
     */
    createSettingItem(label, control) {
        const item = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-setting-item'
        });

        const labelEl = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-setting-label'
        }, label);

        item.appendChild(labelEl);
        item.appendChild(control);

        return item;
    }

    /**
     * 创建开关
     * @param {string} id 开关ID
     * @param {boolean} checked 是否选中
     * @returns {Element} 开关元素
     */
    createSwitch(id, checked) {
        const label = this.app.utils.dom.createElement('label', {
            class: 'xhs-auto-reply-switch'
        });

        const input = this.app.utils.dom.createElement('input', {
            type: 'checkbox',
            id: `xhs-auto-reply-${id}`,
            checked: checked ? 'checked' : ''
        });

        const slider = this.app.utils.dom.createElement('span', {
            class: 'xhs-auto-reply-switch-slider'
        });

        label.appendChild(input);
        label.appendChild(slider);

        return label;
    }

    /**
     * 创建迷你图标
     */
    createMiniIcon() {
        const miniIcon = this.app.utils.dom.createElement('div', {
            class: `xhs-auto-reply-mini-icon ${this.position}`,
            id: 'xhs-auto-reply-mini-icon'
        }, '🤖');

        document.body.appendChild(miniIcon);
    }

    /**
     * 注册GM菜单项
     */
    registerMenus() {
        GM_registerMenuCommand('显示/隐藏控制面板', () => {
            this.togglePanel();
        });

        GM_registerMenuCommand('开始自动回复', () => {
            this.startAutoReply();
        });

        GM_registerMenuCommand('停止自动回复', () => {
            this.stopAutoReply();
        });
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        try {
            this.app.utils.logger.debug('正在绑定控制面板事件');
            
            if (!this.panel) {
                this.app.utils.logger.warn('面板未创建，无法绑定事件');
                return;
            }
            
            // 关闭按钮
            const closeBtn = this.panel.querySelector('.xhs-auto-reply-panel-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.hidePanel();
                });
            }
            
            // 绑定迷你图标点击事件
            const miniIcon = document.getElementById('xhs-auto-reply-mini-icon');
            if (miniIcon) {
                this.app.utils.logger.debug('绑定迷你图标点击事件');
                miniIcon.addEventListener('click', () => {
                    this.togglePanel();
                });
            } else {
                this.app.utils.logger.warn('未找到迷你图标，无法绑定点击事件');
            }
            
            // 自动回复开关
            const switchElem = this.panel.querySelector('#xhs-auto-reply-switch');
            if (switchElem) {
                switchElem.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        this.startAutoReply();
                    } else {
                        this.stopAutoReply();
                    }
                });
            }
            
            // 设置按钮
            const settingsBtn = this.panel.querySelector('#xhs-auto-reply-settings-btn');
            if (settingsBtn) {
                settingsBtn.addEventListener('click', () => {
                    // 在点击时检查设置面板是否存在
                    if (this.app.ui && this.app.ui.settings) {
                        this.app.utils.logger.debug('打开设置面板');
                        this.app.ui.settings.togglePanel();
                    } else {
                        this.app.utils.logger.error('设置面板未初始化，无法打开');
                        // 显示错误通知给用户
                        this.app.utils.dom.showNotification('无法打开设置', '设置面板未正确初始化，请刷新页面重试', 'error');
                    }
                });
            }
            
            // 统计按钮
            const statsBtn = this.panel.querySelector('#xhs-auto-reply-stats-btn');
            if (statsBtn) {
                statsBtn.addEventListener('click', () => {
                    const statsElem = this.panel.querySelector('.xhs-auto-reply-stats');
                    if (statsElem) {
                        const isHidden = statsElem.style.display === 'none';
                        statsElem.style.display = isHidden ? 'block' : 'none';
                        if (isHidden) {
                            this.updateStatistics();
                        }
                    }
                });
            }
            
            // 设置日志监听器
            this.setupLogListener();
            
            // 监听配置变化，用于更新远程控制状态
            // 通过定期检查实现
            setInterval(() => {
                this.updateRemoteControlStatus();
            }, 10000); // 每10秒检查一次
            
            this.app.utils.logger.debug('控制面板事件绑定完成');
        } catch (error) {
            this.app.utils.logger.error('绑定控制面板事件失败', error);
        }
    }

    /**
     * 设置日志监听
     */
    setupLogListener() {
        // 重写原始logger方法，在调用时也更新UI
        const originalLogMethods = {
            debug: this.app.utils.logger.debug,
            info: this.app.utils.logger.info,
            warn: this.app.utils.logger.warn,
            error: this.app.utils.logger.error
        };

        // 最近的日志记录
        this.recentLogs = [];
        const maxLogItems = 100;

        // 重写日志方法
        const self = this;

        ['debug', 'info', 'warn', 'error'].forEach(level => {
            this.app.utils.logger[level] = function() {
                // 调用原始方法
                originalLogMethods[level].apply(this, arguments);

                // 格式化日志消息
                const message = Array.from(arguments).join(' ');
                const timestamp = new Date().toLocaleTimeString();
                const logItem = {
                    level,
                    message,
                    timestamp
                };

                // 添加到最近日志
                self.recentLogs.unshift(logItem);

                // 限制日志数量
                if (self.recentLogs.length > maxLogItems) {
                    self.recentLogs.pop();
                }

                // 更新UI
                self.updateDebugLog();
            };
        });
    }

    /**
     * 更新调试日志面板
     */
    updateDebugLog() {
        try {
            const debugLog = this.panel.querySelector('.xhs-auto-reply-debug-log');
            if (!debugLog) return;

            // 清空当前日志
            debugLog.innerHTML = '';

            // 添加最近的日志
            for (const log of this.recentLogs) {
                const logItem = this.app.utils.dom.createElement('div', {
                    class: `xhs-auto-reply-debug-log-item ${log.level}`
                }, `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`);

                debugLog.appendChild(logItem);
            }
        } catch (error) {
            console.error('更新调试日志面板失败', error);
        }
    }

    /**
     * 显示面板
     */
    showPanel() {
        if (!this.panel) return;

        this.panel.style.display = 'block';
        this.visible = true;

        // 隐藏迷你图标
        const miniIcon = document.getElementById('xhs-auto-reply-mini-icon');
        if (miniIcon) {
            miniIcon.style.display = 'none';
        }

        // 更新统计信息
        this.updateStatistics();
    }

    /**
     * 隐藏面板
     */
    hidePanel() {
        if (!this.panel) return;

        this.panel.style.display = 'none';
        this.visible = false;

        // 显示迷你图标
        const miniIcon = document.getElementById('xhs-auto-reply-mini-icon');
        if (miniIcon) {
            miniIcon.style.display = 'flex';
        }
    }

    /**
     * 切换面板显示/隐藏
     */
    togglePanel() {
        if (this.visible) {
            this.hidePanel();
        } else {
            this.showPanel();
        }
    }

    /**
     * 启动自动回复
     */
    startAutoReply() {
        try {
            // 首先检查核心模块是否已正确初始化
            if (!this.app.core) {
                this.app.utils.logger.error('自动回复失败：核心模块未初始化');
                this.app.utils.dom.showNotification('无法启动', '核心模块未正确初始化，请刷新页面重试', 'error');
                
                // 还原开关状态
                const switchElem = this.panel.querySelector('#xhs-auto-reply-switch');
                if (switchElem) {
                    switchElem.checked = false;
                }
                return;
            }
            
            if (!this.app.core.messageDetector) {
                this.app.utils.logger.error('自动回复失败：消息检测器未初始化');
                this.app.utils.dom.showNotification('无法启动', '消息检测器未正确初始化，请刷新页面重试', 'error');
                
                // 还原开关状态
                const switchElem = this.panel.querySelector('#xhs-auto-reply-switch');
                if (switchElem) {
                    switchElem.checked = false;
                }
                return;
            }
            
            // 检查远程控制状态
            const remoteControlEnabled = this.app.config.getSetting('remoteControl.enabled', false);
            if (remoteControlEnabled) {
                const remoteStatus = this.app.config.getSetting('remoteControl.status.enabled', true);
                if (!remoteStatus) {
                    // 如果远程控制禁用了脚本，则显示提示并返回
                    const message = this.app.config.getSetting('remoteControl.status.message', '脚本已被远程禁用');
                    this.app.utils.dom.showNotification('无法启动', `远程控制已禁用脚本: ${message}`, 'error');
                    
                    // 还原开关状态
                    const switchElem = this.panel.querySelector('#xhs-auto-reply-switch');
                    if (switchElem) {
                        switchElem.checked = false;
                    }
                    
                    return;
                }
            }
            
            // 继续原有的启动逻辑
            this.app.utils.logger.info('用户通过控制面板启动自动回复');
            
            try {
                // 尝试启动消息检测
                const started = this.app.core.messageDetector.start();
                
                // 检查启动状态
                if (started) {
                    this.app.utils.logger.info('自动回复功能启动成功');
                    this.app.utils.dom.showNotification('小红书助手已启动', '自动回复功能已开启');
                } else {
                    // 即使start()返回false，也检查running状态来确认实际运行情况
                    // 这是因为有时start()可能返回false但功能仍在工作
                    this.app.utils.logger.warn('自动回复启动返回失败状态，但将继续检查实际运行状态');
                    
                    // 延迟检查running状态，给初始化过程一些时间
                    setTimeout(() => {
                        // 通过检查running状态来确认是否真正启动
                        if (this.app.core.messageDetector.running) {
                            this.app.utils.logger.info('检测到自动回复功能实际已启动，忽略之前的失败状态');
                            this.app.utils.dom.showNotification('小红书助手已启动', '自动回复功能已开启');
                        } else {
                            // 仅当确认功能真的未运行时才显示错误
                            this.app.utils.logger.error('自动回复功能确认未能启动');
                            this.app.utils.dom.showNotification('启动失败', '请查看日志了解详情', 'error');
                            
                            // 还原开关状态
                            const switchElem = this.panel.querySelector('#xhs-auto-reply-switch');
                            if (switchElem) {
                                switchElem.checked = false;
                            }
                        }
                    }, 1000); // 延迟1秒检查，给初始化过程时间
                }
            } catch (innerError) {
                this.app.utils.logger.error('调用消息检测器start方法时发生错误', innerError);
                this.app.utils.dom.showNotification('启动失败', `消息检测器启动错误: ${innerError.message}`, 'error');
                
                // 还原开关状态
                const switchElem = this.panel.querySelector('#xhs-auto-reply-switch');
                if (switchElem) {
                    switchElem.checked = false;
                }
            }
        } catch (error) {
            this.app.utils.logger.error('启动自动回复失败', error);
            this.app.utils.dom.showNotification('启动失败', error.message, 'error');
            
            // 还原开关状态
            const switchElem = this.panel.querySelector('#xhs-auto-reply-switch');
            if (switchElem) {
                switchElem.checked = false;
            }
        }
    }

    /**
     * 停止自动回复
     */
    stopAutoReply() {
        try {
            this.app.utils.logger.info('用户通过控制面板停止自动回复');
            
            // 检查核心模块是否已正确初始化
            if (!this.app.core) {
                this.app.utils.logger.error('停止自动回复失败：核心模块未初始化');
                this.app.utils.dom.showNotification('无法停止', '核心模块未正确初始化', 'error');
                return;
            }
            
            if (!this.app.core.messageDetector) {
                this.app.utils.logger.error('停止自动回复失败：消息检测器未初始化');
                this.app.utils.dom.showNotification('无法停止', '消息检测器未正确初始化', 'error');
                return;
            }
            
            // 尝试停止消息检测
            try {
                const success = this.app.core.messageDetector.stop();

                if (success) {
                    this.app.utils.logger.info('已成功停止自动回复');
                    this.app.utils.dom.showNotification('小红书助手已停止', '自动回复功能已关闭');

                    // 清空回复队列
                    if (this.app.core.autoReply) {
                        try {
                            this.app.core.autoReply.clearReplyQueue();
                            this.app.utils.logger.debug('已清空回复队列');
                        } catch (queueError) {
                            this.app.utils.logger.warn('清空回复队列失败', queueError);
                        }
                    }

                    // 更新UI状态
                    const startBtn = document.getElementById('xhs-auto-reply-start-btn');
                    const stopBtn = document.getElementById('xhs-auto-reply-stop-btn');

                    if (startBtn) startBtn.style.display = 'inline-block';
                    if (stopBtn) stopBtn.style.display = 'none';
                } else {
                    this.app.utils.logger.error('停止自动回复返回失败状态');
                    this.app.utils.dom.showNotification('停止失败', '请查看日志了解详情', 'error');
                }
            } catch (innerError) {
                this.app.utils.logger.error('调用消息检测器stop方法时发生错误', innerError);
                this.app.utils.dom.showNotification('停止失败', `消息检测器停止错误: ${innerError.message}`, 'error');
            }
        } catch (error) {
            this.app.utils.logger.error('停止自动回复失败', error);
            this.app.utils.dom.showNotification('停止失败', error.message, 'error');
        }
    }

    /**
     * 更新统计信息
     */
    updateStatistics() {
        const statsContainer = document.getElementById('xhs-auto-reply-stats');
        if (!statsContainer) return;

        // 找到统计内容容器
        const statsContentContainer = statsContainer.querySelector('.xhs-auto-reply-stats-content');
        if (!statsContentContainer) return;

        // 清空内容容器
        statsContentContainer.innerHTML = '';

        // 获取统计摘要
        const stats = this.app.utils.storage.getStatisticsSummary();

        // 创建统计项
        const createStatsItem = (label, value) => {
            const item = this.app.utils.dom.createElement('div', {
                class: 'xhs-auto-reply-stats-item'
            });

            this.app.utils.dom.setHtml(item, `${label}: <b>${value}</b>`);

            return item;
        };

        // 添加统计项到内容容器
        statsContentContainer.appendChild(createStatsItem('今日回复', stats.todayReplies));
        statsContentContainer.appendChild(createStatsItem('总消息数', stats.totalMessages));
        statsContentContainer.appendChild(createStatsItem('总回复数', stats.totalReplies));
        statsContentContainer.appendChild(createStatsItem('AI回复数', stats.aiReplies));
        statsContentContainer.appendChild(createStatsItem('模板回复数', stats.templateReplies));
        statsContentContainer.appendChild(createStatsItem('成功率', `${stats.successRate}%`));
        statsContentContainer.appendChild(createStatsItem('平均响应时间', `${stats.averageResponseTime}ms`));

        // 最后更新时间
        const lastUpdate = new Date(stats.lastUpdate).toLocaleString();
        statsContentContainer.appendChild(createStatsItem('最后更新', lastUpdate));

        // 当前状态
        const running = this.app.core.messageDetector?.running || false;
        const statusValue = running ? '<span style="color:#4CAF50">运行中</span>' : '<span style="color:#F44336">已停止</span>';
        statsContentContainer.appendChild(createStatsItem('当前状态', statusValue));
    }

    /**
     * 更新远程控制状态显示
     */
    updateRemoteControlStatus() {
        try {
            // 获取远程控制相关元素
            const remoteControlElem = this.panel.querySelector('.xhs-auto-reply-remote-control');
            const remoteStatusElem = this.panel.querySelector('.xhs-auto-reply-remote-status');
            const remoteMessageElem = this.panel.querySelector('.xhs-auto-reply-remote-message');
            const remoteUpdatedElem = this.panel.querySelector('.xhs-auto-reply-remote-updated');
            
            // 检查远程控制是否启用
            const remoteControlEnabled = this.app.config.getSetting('remoteControl.enabled', false);
            if (!remoteControlEnabled) {
                // 如果远程控制未启用，隐藏整个区域
                remoteControlElem.style.display = 'none';
                return;
            }
            
            // 显示远程控制区域
            remoteControlElem.style.display = 'block';
            
            // 获取远程控制状态
            const remoteStatus = this.app.config.getSetting('remoteControl.status', {
                enabled: true,
                message: '',
                lastUpdated: null
            });
            
            // 更新状态显示
            if (remoteStatus.enabled) {
                remoteStatusElem.textContent = '已启用';
                remoteStatusElem.style.backgroundColor = '#4CAF50'; // 绿色
            } else {
                remoteStatusElem.textContent = '已禁用';
                remoteStatusElem.style.backgroundColor = '#F44336'; // 红色
            }
            
            // 更新消息显示
            if (remoteStatus.message) {
                remoteMessageElem.textContent = remoteStatus.message;
                remoteMessageElem.style.display = 'block';
            } else {
                remoteMessageElem.style.display = 'none';
            }
            
            // 更新最后更新时间
            if (remoteStatus.lastUpdated) {
                const date = new Date(remoteStatus.lastUpdated);
                remoteUpdatedElem.textContent = `最后更新: ${date.toLocaleString()}`;
                remoteUpdatedElem.style.display = 'block';
            } else {
                remoteUpdatedElem.style.display = 'none';
            }
        } catch (error) {
            this.app.utils.logger.error('更新远程控制状态显示失败', error);
        }
    }

    /**
     * 使元素可拖拽
     * @param {Element} element 要拖拽的元素
     * @param {Element} handle 拖拽的把手元素
     */
    makeDraggable(element, handle) {
        if (!element || !handle) return;
        
        this.app.utils.logger.debug('设置元素可拖拽');
        
        let posX = 0, posY = 0, originX = 0, originY = 0;
        
        const mouseDownHandler = (e) => {
            e.preventDefault();
            
            // 获取鼠标当前位置
            originX = e.clientX;
            originY = e.clientY;
            
            // 获取元素当前位置
            const rect = element.getBoundingClientRect();
            posX = rect.left;
            posY = rect.top;
            
            // 添加鼠标移动和释放事件
            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
        };
        
        const mouseMoveHandler = (e) => {
            // 计算鼠标位移
            const deltaX = e.clientX - originX;
            const deltaY = e.clientY - originY;
            
            // 计算新位置
            let newX = posX + deltaX;
            let newY = posY + deltaY;
            
            // 边界检查
            const rect = element.getBoundingClientRect();
            const maxX = window.innerWidth - rect.width;
            const maxY = window.innerHeight - rect.height;
            
            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));
            
            // 更新元素位置
            element.style.left = `${newX}px`;
            element.style.top = `${newY}px`;
            
            // 重置position类
            element.className = element.className.replace(/\btop-left\b|\btop-right\b|\bbottom-left\b|\bbottom-right\b/g, '');
            
            // 元素变为自由定位
            element.style.position = 'fixed';
        };
        
        const mouseUpHandler = () => {
            // 移除鼠标事件
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);
            
            // 保存位置到配置
            if (this.app.config) {
                const rect = element.getBoundingClientRect();
                this.app.config.setSetting('ui.floatingPanelCustomPosition', {
                    left: rect.left,
                    top: rect.top
                });
                this.app.utils.logger.debug('保存面板位置', rect.left, rect.top);
            }
        };
        
        // 绑定鼠标按下事件
        handle.addEventListener('mousedown', mouseDownHandler);
        
        // 尝试恢复保存的位置
        if (this.app.config) {
            const savedPosition = this.app.config.getSetting('ui.floatingPanelCustomPosition', null);
            if (savedPosition) {
                element.style.position = 'fixed';
                element.style.left = `${savedPosition.left}px`;
                element.style.top = `${savedPosition.top}px`;
                
                // 重置position类
                element.className = element.className.replace(/\btop-left\b|\btop-right\b|\bbottom-left\b|\bbottom-right\b/g, '');
                
                this.app.utils.logger.debug('恢复面板位置', savedPosition.left, savedPosition.top);
            }
        }
    }
}