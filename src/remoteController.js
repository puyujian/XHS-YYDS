/**
 * 小红书私信自动回复助手 - 远程控制模块
 */

class RemoteController {
    constructor(app) {
        this.app = app;
        this.initialized = false;
        this.checkTimer = null;
        this.isChecking = false;
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    /**
     * 初始化远程控制模块
     */
    async initialize() {
        try {
            this.app.utils.logger.info('初始化远程控制模块');
            
            // 检查是否启用远程控制
            const enabled = this.app.config.getSetting('remoteControl.enabled', true);
            if (!enabled) {
                this.app.utils.logger.info('远程控制功能已禁用');
                return true;
            }

            // 设置初始状态
            this.initialized = true;
            
            // 立即执行第一次检查
            await this.checkRemoteConfig();
            
            // 启动定期检查
            this.startPeriodicCheck();
            
            this.app.utils.logger.info('远程控制模块初始化完成');
            return true;
        } catch (error) {
            this.app.utils.logger.error('初始化远程控制模块失败', error);
            return false;
        }
    }

    /**
     * 启动定期检查
     */
    startPeriodicCheck() {
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
        }
        
        const interval = this.app.config.getSetting('remoteControl.checkInterval', 5 * 60 * 1000);
        this.app.utils.logger.debug(`设置远程配置检查间隔: ${interval}毫秒`);
        
        this.checkTimer = setInterval(() => {
            this.checkRemoteConfig();
        }, interval);
    }

    /**
     * 停止定期检查
     */
    stopPeriodicCheck() {
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
            this.checkTimer = null;
            this.app.utils.logger.debug('已停止远程配置定期检查');
        }
    }

    /**
     * 检查远程配置
     */
    async checkRemoteConfig() {
        if (this.isChecking) {
            this.app.utils.logger.debug('已有检查任务正在进行，跳过');
            return;
        }
        
        this.isChecking = true;
        this.retryCount = 0;
        
        try {
            const configUrl = this.app.config.getSetting('remoteControl.configUrl', '');
            if (!configUrl) {
                this.app.utils.logger.warn('未设置远程配置URL，跳过检查');
                this.isChecking = false;
                return;
            }
            
            this.app.utils.logger.debug(`正在检查远程配置: ${configUrl}`);
            
            // 尝试获取远程配置
            const config = await this.fetchRemoteConfig(configUrl);
            if (!config) {
                this.app.utils.logger.warn('获取远程配置失败');
                this.isChecking = false;
                return;
            }
            
            // 处理远程配置
            await this.processRemoteConfig(config);
            
            // 更新最后检查时间
            await this.app.config.setSetting('remoteControl.lastCheck', new Date().toISOString());
            
            this.app.utils.logger.debug('远程配置检查完成');
        } catch (error) {
            this.app.utils.logger.error('检查远程配置时出错', error);
        } finally {
            this.isChecking = false;
        }
    }

    /**
     * 获取远程配置
     * @param {string} url 远程配置URL
     * @returns {Promise<Object|null>} 远程配置对象，失败返回null
     */
    async fetchRemoteConfig(url) {
        try {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    },
                    onload: (response) => {
                        if (response.status !== 200) {
                            this.app.utils.logger.warn(`获取远程配置失败，状态码: ${response.status}`);
                            reject(new Error(`HTTP错误 ${response.status}`));
                            return;
                        }
                        
                        try {
                            const config = JSON.parse(response.responseText);
                            resolve(config);
                        } catch (error) {
                            this.app.utils.logger.error('解析远程配置JSON失败', error);
                            reject(error);
                        }
                    },
                    onerror: (error) => {
                        this.app.utils.logger.error('获取远程配置网络错误', error);
                        reject(error);
                    },
                    ontimeout: () => {
                        this.app.utils.logger.warn('获取远程配置超时');
                        reject(new Error('请求超时'));
                    }
                });
            });
        } catch (error) {
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                this.app.utils.logger.warn(`获取远程配置失败，正在重试 (${this.retryCount}/${this.maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒后重试
                return this.fetchRemoteConfig(url);
            }
            
            this.app.utils.logger.error('获取远程配置失败，已达到最大重试次数', error);
            return null;
        }
    }

    /**
     * 处理远程配置
     * @param {Object} config 远程配置对象
     */
    async processRemoteConfig(config) {
        try {
            // 提取必要的配置项
            const enabled = config.enabled === undefined ? true : !!config.enabled;
            const message = config.message || '脚本已被远程禁用';
            const lastUpdated = config.lastUpdated || new Date().toISOString();
            
            // 获取当前状态
            const currentStatus = this.app.config.getSetting('remoteControl.status', {
                enabled: true,
                message: '',
                lastUpdated: null
            });
            
            // 检查是否需要更新
            if (currentStatus.enabled !== enabled || 
                currentStatus.message !== message ||
                currentStatus.lastUpdated !== lastUpdated) {
                
                // 更新配置
                await this.app.config.setSetting('remoteControl.status', {
                    enabled: enabled,
                    message: message,
                    lastUpdated: lastUpdated
                });
                
                this.app.utils.logger.info(`远程控制状态已更新: ${enabled ? '启用' : '禁用'}`);
                
                // 根据远程配置执行相应操作
                if (enabled) {
                    this.enableScript();
                } else {
                    this.disableScript(message);
                }
            } else {
                this.app.utils.logger.debug('远程控制状态未变更，无需更新');
            }
        } catch (error) {
            this.app.utils.logger.error('处理远程配置时出错', error);
        }
    }

    /**
     * 启用脚本
     */
    enableScript() {
        try {
            // 检查消息检测器是否正在运行
            if (this.app.core && this.app.core.messageDetector && !this.app.core.messageDetector.running) {
                this.app.utils.logger.info('根据远程控制配置启动脚本');
                this.app.core.messageDetector.start();
                
                // 通知用户
                this.app.utils.dom.showNotification('小红书助手已远程启用', '根据远程配置，脚本已被启用');
            }
        } catch (error) {
            this.app.utils.logger.error('启用脚本时出错', error);
        }
    }

    /**
     * 禁用脚本
     * @param {string} message 禁用原因消息
     */
    disableScript(message) {
        try {
            // 检查消息检测器是否正在运行
            if (this.app.core && this.app.core.messageDetector && this.app.core.messageDetector.running) {
                this.app.utils.logger.info('根据远程控制配置停止脚本');
                this.app.core.messageDetector.stop();
                
                // 通知用户
                this.app.utils.dom.showNotification('小红书助手已远程禁用', message || '根据远程配置，脚本已被禁用');
            }
        } catch (error) {
            this.app.utils.logger.error('禁用脚本时出错', error);
        }
    }

    /**
     * 获取远程控制状态
     */
    getStatus() {
        return this.app.config.getSetting('remoteControl.status', {
            enabled: true,
            message: '',
            lastUpdated: null
        });
    }
} 