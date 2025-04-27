/**
 * 小红书私信自动回复助手 - 追粉系统处理模块
 */

class FollowUpHandler {
    constructor(app) {
        this.app = app;
        this.initialized = false;
        this.checkTimer = null;
        this.currentlySending = false;
        this.todaySentCount = 0;
        this.todaySentByContact = new Map();
        this.lastResetDate = new Date().toDateString();
    }

    /**
     * 初始化追粉系统处理模块
     */
    async initialize() {
        try {
            this.app.utils.logger.info('初始化追粉系统处理模块');

            // 加载统计数据
            await this.resetDailyCountersIfNeeded();

            // 注册设置面板
            this.registerSettings();

            this.initialized = true;
            
            // 如果启用了追粉系统，则启动定时检查
            if (this.isEnabled()) {
                await this.startPeriodicCheck();
            }

            return true;
        } catch (error) {
            this.app.utils.logger.error('初始化追粉系统处理模块失败', error);
            return false;
        }
    }

    /**
     * 注册设置面板
     */
    registerSettings() {
        try {
            // 在实际实现中，这部分代码将注册追粉系统的设置面板
            // 类似于 this.app.ui.settings.registerSection('followUp', {...})
            this.app.utils.logger.debug('追粉系统设置已注册');
        } catch (error) {
            this.app.utils.logger.error('注册追粉系统设置面板失败', error);
        }
    }

    /**
     * 检查追粉系统是否启用
     * @returns {boolean} 是否启用
     */
    isEnabled() {
        return this.app.config.getSetting('followUp.enabled', false);
    }

    /**
     * 检查未开口用户追粉是否启用
     * @returns {boolean} 是否启用
     */
    isNoResponseFollowUpEnabled() {
        return this.isEnabled() && this.app.config.getSetting('followUp.noResponseSettings.enabled', true);
    }

    /**
     * 检查未留资用户追粉是否启用
     * @returns {boolean} 是否启用
     */
    isNoContactFollowUpEnabled() {
        return this.isEnabled() && this.app.config.getSetting('followUp.noContactSettings.enabled', true);
    }

    /**
     * 启动定时检查
     */
    async startPeriodicCheck() {
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
        }

        // 获取检查间隔
        const checkInterval = this.app.config.getSetting('followUp.checkInterval', 30 * 60 * 1000);

        // 设置定时器
        this.checkTimer = setInterval(() => this.checkAndSendFollowUps(), checkInterval);
        
        // 立即执行一次检查
        this.app.utils.logger.info('追粉系统已启动，立即执行首次检查');
        await this.checkAndSendFollowUps();
    }

    /**
     * 停止定时检查
     */
    stopPeriodicCheck() {
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
            this.checkTimer = null;
            this.app.utils.logger.info('追粉系统已停止');
        }
    }

    /**
     * 重新启动追粉系统
     */
    async restart() {
        this.stopPeriodicCheck();
        if (this.isEnabled()) {
            await this.startPeriodicCheck();
        }
    }

    /**
     * 重置每日计数器（如果需要）
     */
    async resetDailyCountersIfNeeded() {
        const today = new Date().toDateString();
        if (today !== this.lastResetDate) {
            this.todaySentCount = 0;
            this.todaySentByContact.clear();
            this.lastResetDate = today;
            this.app.utils.logger.info('重置追粉系统每日计数器');
        }
    }

    /**
     * 检查是否在追粉工作时间内
     * @returns {boolean} 是否在工作时间内
     */
    isInWorkingHours() {
        // 获取工作时间设置
        const workingHoursEnabled = this.app.config.getSetting('followUp.workingHours.enabled', false);
        
        // 如果工作时间限制未启用，则总是返回 true
        if (!workingHoursEnabled) return true;
        
        const startTime = this.app.config.getSetting('followUp.workingHours.startTime', '09:00');
        const endTime = this.app.config.getSetting('followUp.workingHours.endTime', '21:00');
        
        // 解析时间
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);
        
        // 转换为分钟进行比较
        const currentTimeInMinutes = currentHour * 60 + currentMinute;
        const startTimeInMinutes = startHour * 60 + startMinute;
        const endTimeInMinutes = endHour * 60 + endMinute;
        
        // 检查是否在工作时间内
        return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes;
    }

    /**
     * 检查是否超过每日发送限制
     * @param {string} contactId 联系人ID
     * @returns {boolean} 是否超过限制
     */
    isFollowUpLimitExceeded(contactId) {
        // 重置每日计数器（如果需要）
        this.resetDailyCountersIfNeeded();
        
        // 获取限制设置
        const dailyLimit = this.app.config.getSetting('followUp.dailyLimit', 30);
        const maxDailyPerContact = this.app.config.getSetting('followUp.maxDailyPerContact', 1);
        
        // 检查每日总发送数
        if (this.todaySentCount >= dailyLimit) {
            this.app.utils.logger.info(`已达到每日追粉上限 (${dailyLimit})`);
            return true;
        }
        
        // 检查每个联系人每日发送数
        const contactSentCount = this.todaySentByContact.get(contactId) || 0;
        if (contactSentCount >= maxDailyPerContact) {
            this.app.utils.logger.info(`联系人 ${contactId} 已达到每日追粉上限 (${maxDailyPerContact})`);
            return true;
        }
        
        return false;
    }

    /**
     * 记录发送追粉消息
     * @param {string} contactId 联系人ID
     */
    recordFollowUpSent(contactId) {
        // 重置每日计数器（如果需要）
        this.resetDailyCountersIfNeeded();
        
        // 更新计数
        this.todaySentCount++;
        this.todaySentByContact.set(contactId, (this.todaySentByContact.get(contactId) || 0) + 1);
    }

    /**
     * 检查并发送追粉消息
     */
    async checkAndSendFollowUps() {
        try {
            // 防止并发执行
            if (this.currentlySending || !this.initialized) {
                return;
            }
            
            this.currentlySending = true;
            
            // 检查是否启用
            if (!this.isEnabled()) {
                this.app.utils.logger.debug('追粉系统未启用，跳过检查');
                this.currentlySending = false;
                return;
            }
            
            // 检查是否在工作时间内
            if (!this.isInWorkingHours()) {
                this.app.utils.logger.debug('当前不在追粉工作时间内，跳过检查');
                this.currentlySending = false;
                return;
            }
            
            // 重置每日计数器（如果需要）
            await this.resetDailyCountersIfNeeded();
            
            // 获取需要追粉的联系人
            // 先处理未开口用户，再处理未留资用户
            let contactsToFollowUp = [];
            
            // 1. 处理未开口用户
            if (this.isNoResponseFollowUpEnabled()) {
                const noResponseContacts = await this.app.utils.sessionManager.getNoResponseContactsForFollowUp();
                contactsToFollowUp = [...contactsToFollowUp, ...noResponseContacts];
            }
            
            // 2. 处理未留资用户
            if (this.isNoContactFollowUpEnabled()) {
                const noContactContacts = await this.app.utils.sessionManager.getNoContactContactsForFollowUp();
                contactsToFollowUp = [...contactsToFollowUp, ...noContactContacts];
            }
            
            if (contactsToFollowUp.length === 0) {
                this.app.utils.logger.debug('没有需要追粉的联系人');
                this.currentlySending = false;
                return;
            }
            
            this.app.utils.logger.info(`找到 ${contactsToFollowUp.length} 个需要追粉的联系人`);
            
            // 获取黑名单
            const blacklist = this.app.config.getSetting('followUp.blacklist', []);
            
            // 处理每个需要追粉的联系人
            for (const contact of contactsToFollowUp) {
                // 检查是否在黑名单中
                if (blacklist.includes(contact.contactId)) {
                    this.app.utils.logger.debug(`联系人 ${contact.contactId} 在黑名单中，跳过追粉`);
                    continue;
                }
                
                // 检查是否超过每日发送限制
                if (this.isFollowUpLimitExceeded(contact.contactId)) {
                    continue;
                }
                
                // 发送追粉消息
                await this.sendFollowUpMessage(contact);
                
                // 短暂延迟，避免连续发送
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
        } catch (error) {
            this.app.utils.logger.error('执行追粉检查失败', error);
        } finally {
            this.currentlySending = false;
        }
    }

    /**
     * 根据用户状态和追粉次数获取对应的消息模板
     * @param {string} status 用户状态
     * @param {number} followUpCount 追粉次数
     * @returns {string|null} 消息模板或null
     */
    getFollowUpTemplate(status, followUpCount) {
        try {
            let templates = [];
            let settingsPath = '';
            
            // 根据用户状态选择模板组
            if (status === 'no_response') {
                settingsPath = 'followUp.noResponseSettings.templates';
            } else if (status === 'no_contact') {
                settingsPath = 'followUp.noContactSettings.templates';
            } else {
                this.app.utils.logger.warn(`不支持的用户状态 ${status} 的追粉模板`);
                return null;
            }
            
            // 获取模板组
            templates = this.app.config.getSetting(settingsPath, []);
            if (templates.length === 0) {
                this.app.utils.logger.warn(`未配置 ${status} 状态的追粉消息模板`);
                return null;
            }
            
            // 追粉次数是从0开始的，但模板数组从0开始索引
            const templateIndex = Math.min(followUpCount, templates.length - 1);
            const template = templates[templateIndex];
            
            if (!template || !template.message) {
                this.app.utils.logger.warn(`未找到 ${status} 状态第 ${followUpCount+1} 次追粉的消息模板`);
                return null;
            }
            
            return template.message;
        } catch (error) {
            this.app.utils.logger.error('获取追粉模板失败', error);
            return null;
        }
    }

    /**
     * 发送追粉消息
     * @param {Object} contact 联系人信息对象 {contactId, status, followUpCount}
     */
    async sendFollowUpMessage(contact) {
        try {
            const { contactId, status, followUpCount } = contact;
            
            // 根据用户状态和追粉次数获取消息模板
            const templateMessage = this.getFollowUpTemplate(status, followUpCount);
            if (!templateMessage) {
                this.app.utils.logger.warn(`未找到适合联系人 ${contactId} (状态: ${status}, 追粉次数: ${followUpCount}) 的追粉模板`);
                return;
            }
            
            // 如果是未开口用户的第一次追粉，且配置了使用获客工具，则发送获客工具
            const useLeadTools = this.app.config.getSetting('followUp.useLeadTools', false);
            const leadToolFrequency = this.app.config.getSetting('followUp.leadToolFollowUpFrequency', 0);
            
            let sentLeadTool = false;
            
            if (useLeadTools && leadToolFrequency > 0 && (followUpCount % leadToolFrequency === 0)) {
                sentLeadTool = await this.sendFollowUpLeadCard(contactId);
                // 如果发送了获客工具，延迟一段时间再发送文本消息
                if (sentLeadTool) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            // 发送文本追粉消息
            this.app.utils.logger.info(`向联系人 ${contactId} 发送状态为 ${status} 的第 ${followUpCount+1} 次追粉消息`);
            const sentSuccess = await this.app.core.autoReply.sendReply(contactId, templateMessage);
            
            if (sentSuccess) {
                // 记录发送成功
                this.recordFollowUpSent(contactId);
                
                // 记录到会话历史
                await this.app.utils.sessionManager.updateSessionHistory(contactId, {
                    role: 'assistant',
                    content: templateMessage,
                    isFollowUp: true,
                    followUpStatus: status,
                    followUpCount: followUpCount,
                    timestamp: Date.now()
                });
                
                // 增加用户的追粉次数记录并记录追粉时间
                await this.app.utils.sessionManager.incrementFollowUpCount(contactId);
                await this.app.utils.sessionManager.recordFollowUpTime(contactId);
                
                this.app.utils.logger.info(`成功向联系人 ${contactId} 发送追粉消息`);
            } else {
                this.app.utils.logger.warn(`向联系人 ${contactId} 发送追粉消息失败`);
            }
        } catch (error) {
            this.app.utils.logger.error(`发送追粉消息给联系人 ${contact.contactId} 失败`, error);
        }
    }

    /**
     * 发送追粉获客工具
     * @param {string} contactId 联系人ID
     * @returns {Promise<boolean>} 是否发送成功
     */
    async sendFollowUpLeadCard(contactId) {
        try {
            if (!this.app.core.leadGenerationHandler) {
                this.app.utils.logger.warn('获客工具处理器未初始化，无法发送追粉获客工具');
                return false;
            }
            
            // 获取配置的获客工具信息
            const defaultTool = this.app.config.getSetting('leadGeneration.defaultTool', null);
            
            if (!defaultTool || !defaultTool.type) {
                this.app.utils.logger.debug('未配置默认获客工具，跳过发送');
                return false;
            }
            
            // 查找获客工具
            const tool = this.findLeadTool(defaultTool.type, defaultTool.index);
            if (!tool) {
                this.app.utils.logger.warn(`未找到类型为 ${defaultTool.type} 索引为 ${defaultTool.index} 的获客工具`);
                return false;
            }
            
            // 发送获客工具
            this.app.utils.logger.info(`向联系人 ${contactId} 发送追粉获客工具: ${tool.title}`);
            const sentSuccess = await this.app.core.leadGenerationHandler.sendTool(tool);
            
            if (sentSuccess) {
                this.app.utils.logger.info(`成功向联系人 ${contactId} 发送追粉获客工具`);
                
                // 记录获客工具发送时间
                if (this.app.utils.sessionManager.recordLeadSentTime) {
                    await this.app.utils.sessionManager.recordLeadSentTime(contactId);
                }
                
                return true;
            } else {
                this.app.utils.logger.warn(`向联系人 ${contactId} 发送追粉获客工具失败`);
                return false;
            }
        } catch (error) {
            this.app.utils.logger.error(`发送追粉获客工具给联系人 ${contactId} 失败`, error);
            return false;
        }
    }

    /**
     * 查找获客工具
     * @param {string} toolType 工具类型
     * @param {number} toolIndex 工具索引
     * @returns {Object|null} 获客工具对象或null
     */
    findLeadTool(toolType, toolIndex) {
        try {
            if (!this.app.core.leadGenerationHandler || !this.app.core.leadGenerationHandler.tools) {
                return null;
            }
            
            const tools = this.app.core.leadGenerationHandler.tools[toolType];
            if (!tools || !Array.isArray(tools) || tools.length === 0) {
                return null;
            }
            
            if (toolIndex < 0 || toolIndex >= tools.length) {
                return tools[0]; // 如果索引越界，使用第一个工具
            }
            
            return tools[toolIndex];
        } catch (error) {
            this.app.utils.logger.error('查找获客工具失败', error);
            return null;
        }
    }

    /**
     * 手动向指定联系人发送追粉消息
     * @param {string} contactId 联系人ID
     * @param {string} status 用户状态，'no_response' 或 'no_contact'
     * @returns {Promise<boolean>} 是否发送成功
     */
    async manualSendFollowUp(contactId, status = 'no_response') {
        try {
            // 获取用户当前追粉次数
            const followUpCount = await this.app.utils.sessionManager.getFollowUpCount(contactId);
            
            // 构造联系人信息对象
            const contact = {
                contactId,
                status,
                followUpCount
            };
            
            // 发送追粉消息
            await this.sendFollowUpMessage(contact);
            
            return true;
        } catch (error) {
            this.app.utils.logger.error(`手动发送追粉消息给联系人 ${contactId} 失败`, error);
            return false;
        }
    }

    /**
     * 将用户标记为新用户（未开口）
     * @param {string} contactId 联系人ID
     * @returns {Promise<boolean>} 是否成功
     */
    async markAsNoResponse(contactId) {
        try {
            const result = await this.app.utils.sessionManager.setUserStatus(contactId, 'no_response');
            if (result) {
                this.app.utils.logger.info(`已将联系人 ${contactId} 标记为未开口用户`);
            }
            return result;
        } catch (error) {
            this.app.utils.logger.error(`标记联系人 ${contactId} 为未开口用户失败`, error);
            return false;
        }
    }

    /**
     * 将用户标记为未留资用户
     * @param {string} contactId 联系人ID
     * @returns {Promise<boolean>} 是否成功
     */
    async markAsNoContact(contactId) {
        try {
            const result = await this.app.utils.sessionManager.setUserStatus(contactId, 'no_contact');
            if (result) {
                this.app.utils.logger.info(`已将联系人 ${contactId} 标记为未留资用户`);
            }
            return result;
        } catch (error) {
            this.app.utils.logger.error(`标记联系人 ${contactId} 为未留资用户失败`, error);
            return false;
        }
    }

    /**
     * 将用户标记为已转化
     * @param {string} contactId 联系人ID
     * @returns {Promise<boolean>} 是否成功
     */
    async markAsConverted(contactId) {
        try {
            const result = await this.app.utils.sessionManager.markUserAsConverted(contactId);
            if (result) {
                this.app.utils.logger.info(`已将联系人 ${contactId} 标记为已转化用户`);
            }
            return result;
        } catch (error) {
            this.app.utils.logger.error(`标记联系人 ${contactId} 为已转化用户失败`, error);
            return false;
        }
    }
} 