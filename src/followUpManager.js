class FollowUpManager {
    constructor(app) {
        this.app = app;
        this.db = app.utils.storage;
        this.settings = app.settings;
        this.lastCheck = null;
        this.checkTimer = null;
        this.isRunning = false;
        this.todayFollowupCount = 0;
        this.todayDate = new Date().toDateString();
    }

    /**
     * 初始化追粉系统
     */
    async init() {
        console.log('初始化追粉系统...');
        try {
            // 加载今日已发送的追粉消息数量
            await this.loadTodayFollowupCount();
            // 启动定时检查
            await this.startChecking();
            console.log('追粉系统初始化完成，当前状态：' + (this.isEnabled() ? '已启用' : '未启用'));
            return true;
        } catch (error) {
            console.error('追粉系统初始化失败', error);
            return false;
        }
    }

    /**
     * 加载今日已发送的追粉消息数量
     */
    async loadTodayFollowupCount() {
        try {
            const today = new Date().toDateString();
            if (this.todayDate !== today) {
                // 如果日期变了，重置计数
                this.todayFollowupCount = 0;
                this.todayDate = today;
                return;
            }

            if (!this.db || typeof this.db.getStats !== 'function') {
                console.error('数据存储对象不可用');
                this.todayFollowupCount = 0;
                return;
            }

            const stats = await this.db.getStats();
            if (stats && stats.dailyFollowups && stats.dailyFollowups[today]) {
                this.todayFollowupCount = stats.dailyFollowups[today];
            } else {
                this.todayFollowupCount = 0;
            }
        } catch (error) {
            console.error('加载今日追粉数量失败:', error);
            this.todayFollowupCount = 0;
        }
    }

    /**
     * 更新今日已发送的追粉消息数量
     */
    async updateTodayFollowupCount() {
        try {
            if (!this.db || typeof this.db.getStats !== 'function' || typeof this.db.saveStats !== 'function') {
                console.error('数据存储对象不可用');
                return;
            }

            const today = new Date().toDateString();
            const stats = await this.db.getStats() || {};
            
            if (!stats.dailyFollowups) {
                stats.dailyFollowups = {};
            }
            
            stats.dailyFollowups[today] = this.todayFollowupCount;
            await this.db.saveStats(stats);
        } catch (error) {
            console.error('更新今日追粉数量失败:', error);
        }
    }

    /**
     * 启动定时检查
     */
    async startChecking() {
        try {
            if (this.checkTimer) {
                clearInterval(this.checkTimer);
                this.checkTimer = null;
                console.log('已清除之前的追粉检查定时器');
            }

            if (!this.settings || typeof this.settings.get !== 'function') {
                console.error('追粉系统设置不可用，无法启动追粉系统');
                return false;
            }

            const settings = this.settings.get();
            console.log('获取追粉系统设置:', JSON.stringify(settings.followUp));

            if (!settings.followUp) {
                console.error('追粉系统设置不存在，无法启动追粉系统');
                return false;
            }

            if (!settings.followUp.enabled) {
                console.log('追粉系统未启用，不启动定时检查');
                return false;
            }

            // 设置检查间隔（小时转为毫秒）
            const checkIntervalHours = settings.followUp.checkInterval || 1;
            const checkInterval = checkIntervalHours * 60 * 60 * 1000; // 转换为毫秒
            console.log(`启动追粉系统定时检查，间隔: ${checkIntervalHours}小时 (${checkInterval}ms)`);
            
            this.checkTimer = setInterval(() => this.checkFollowUps(), checkInterval);
            // 立即执行一次检查
            this.checkFollowUps();
            
            return true;
        } catch (error) {
            console.error('启动追粉系统定时检查失败', error);
            return false;
        }
    }

    /**
     * 停止定时检查
     */
    stopChecking() {
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
            this.checkTimer = null;
        }
        this.isRunning = false;
        console.log('追粉系统已停止');
    }

    /**
     * 检查追粉系统是否启用
     * @returns {boolean} 是否启用
     */
    isEnabled() {
        try {
            if (!this.settings || typeof this.settings.get !== 'function') {
                console.error('追粉系统设置不可用');
                return false;
            }

            const settings = this.settings.get();
            if (!settings || !settings.followUp) {
                console.error('追粉系统设置不存在');
                return false;
            }

            console.log('追粉系统启用状态:', settings.followUp.enabled);
            return !!settings.followUp.enabled;
        } catch (error) {
            console.error('检查追粉系统启用状态时出错', error);
            return false;
        }
    }

    /**
     * 检查需要追踪的私信
     */
    async checkFollowUps() {
        if (this.isRunning) {
            console.log('追粉检查已在进行中，跳过本次检查');
            return;
        }

        this.isRunning = true;
        console.log('开始追粉检查...');
        
        try {
            const settings = this.settings.get();
            if (!settings.followUp || !settings.followUp.enabled) {
                console.log('追粉系统未启用');
                this.isRunning = false;
                return;
            }

            // 加载今日已发送的追粉消息数量
            await this.loadTodayFollowupCount();
            
            // 检查是否达到每日上限
            const dailyLimit = settings.followUp.dailyLimit || 50;
            if (this.todayFollowupCount >= dailyLimit) {
                console.log(`已达到每日追粉上限(${dailyLimit})，跳过本次检查`);
                this.isRunning = false;
                return;
            }

            // 检查工作时间
            if (!this.isWithinWorkingHours()) {
                console.log('当前不在工作时间内，跳过本次检查');
                this.isRunning = false;
                return;
            }

            // 处理无回复的联系人
            await this.processNoResponseContacts();
            
            // 处理无联系方式的联系人
            await this.processNoContactContacts();
            
            console.log('追粉检查完成');
        } catch (error) {
            console.error('追粉检查出错:', error);
        }
        
        this.isRunning = false;
    }

    /**
     * 判断当前是否在工作时间内
     */
    isWithinWorkingHours() {
        const settings = this.settings.get();
        if (!settings.followUp || !settings.followUp.workingHours || !settings.followUp.workingHours.enabled) {
            return true; // 如果未启用工作时间限制，则始终返回true
        }

        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = currentHour * 60 + currentMinute; // 转换为分钟数
        
        const startTime = settings.followUp.workingHours.startTime || '09:00';
        const endTime = settings.followUp.workingHours.endTime || '18:00';
        
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);
        
        const workStartTime = startHour * 60 + startMinute;
        const workEndTime = endHour * 60 + endMinute;
        
        return currentTime >= workStartTime && currentTime <= workEndTime;
    }

    /**
     * 处理无回复的联系人
     */
    async processNoResponseContacts() {
        const settings = this.settings.get();
        if (!settings.followUp.noResponseSettings || !settings.followUp.noResponseSettings.enabled) {
            console.log('未启用无回复追粉功能，跳过处理');
            return;
        }

        // 将小时转换为毫秒
        const intervalHours = settings.followUp.noResponseSettings.interval || 24;
        const interval = intervalHours * 60 * 60 * 1000; // 毫秒
        const maxFollowups = settings.followUp.noResponseSettings.maxFollowups || 3;
        const templates = settings.followUp.noResponseSettings.templates || [];
        
        if (templates.length === 0) {
            console.log('未配置无回复追粉模板，跳过处理');
            return;
        }

        // 获取所有需要跟进的联系人
        const contacts = await this.db.getContactsForNoResponseFollowup(interval);
        console.log(`找到${contacts.length}个无回复需要追踪的联系人`);
        
        for (const contact of contacts) {
            // 检查是否达到每日上限
            if (this.todayFollowupCount >= settings.followUp.dailyLimit) {
                console.log(`已达到每日追粉上限(${settings.followUp.dailyLimit})，停止处理`);
                break;
            }

            // 检查该联系人的追粉次数是否达到上限
            const followupCount = contact.followups ? contact.followups.length : 0;
            if (followupCount >= maxFollowups) {
                console.log(`联系人 ${contact.name || contact.id} 已达到最大追粉次数 ${maxFollowups}，跳过`);
                continue;
            }

            if (followupCount >= templates.length) {
                console.log(`联系人 ${contact.name || contact.id} 已用完所有追粉模板，跳过`);
                continue;
            }

            // 获取模板
            const template = templates[followupCount];
            if (!template) continue;

            // 发送追粉消息
            try {
                await this.sendFollowupMessage(contact, template);
                
                // 更新联系人追粉记录
                if (!contact.followups) {
                    contact.followups = [];
                }
                
                contact.followups.push({
                    type: 'noResponse',
                    time: new Date().toISOString(),
                    template: followupCount + 1
                });
                
                await this.db.updateContactInfo(contact.id, contact);
                
                // 更新今日追粉计数
                this.todayFollowupCount++;
                await this.updateTodayFollowupCount();
                
                console.log(`成功向联系人 ${contact.name || contact.id} 发送第 ${followupCount + 1} 次无回复追粉消息`);
            } catch (error) {
                console.error(`向联系人 ${contact.name || contact.id} 发送追粉消息失败:`, error);
            }
        }
    }

    /**
     * 处理无联系方式的联系人
     */
    async processNoContactContacts() {
        const settings = this.settings.get();
        if (!settings.followUp.noContactSettings || !settings.followUp.noContactSettings.enabled) {
            console.log('未启用未留客资追粉功能，跳过处理');
            return;
        }

        // 将小时转换为毫秒
        const intervalHours = settings.followUp.noContactSettings.interval || 24;
        const interval = intervalHours * 60 * 60 * 1000; // 毫秒
        const maxFollowups = settings.followUp.noContactSettings.maxFollowups || 3;
        const templates = settings.followUp.noContactSettings.templates || [];
        
        if (templates.length === 0) {
            console.log('未配置未留客资追粉模板，跳过处理');
            return;
        }

        // 获取所有需要跟进的联系人
        const contacts = await this.db.getContactsForNoContactFollowup(interval);
        console.log(`找到${contacts.length}个未留客资需要追踪的联系人`);
        
        for (const contact of contacts) {
            // 检查是否达到每日上限
            if (this.todayFollowupCount >= settings.followUp.dailyLimit) {
                console.log(`已达到每日追粉上限(${settings.followUp.dailyLimit})，停止处理`);
                break;
            }

            // 检查该联系人的追粉次数是否达到上限
            const followupCount = contact.followups ? contact.followups.length : 0;
            if (followupCount >= maxFollowups) {
                console.log(`联系人 ${contact.name || contact.id} 已达到最大追粉次数 ${maxFollowups}，跳过`);
                continue;
            }

            if (followupCount >= templates.length) {
                console.log(`联系人 ${contact.name || contact.id} 已用完所有追粉模板，跳过`);
                continue;
            }

            // 获取模板
            const template = templates[followupCount];
            if (!template) continue;

            // 发送追粉消息
            try {
                await this.sendFollowupMessage(contact, template);
                
                // 更新联系人追粉记录
                if (!contact.followups) {
                    contact.followups = [];
                }
                
                contact.followups.push({
                    type: 'noContact',
                    time: new Date().toISOString(),
                    template: followupCount + 1
                });
                
                await this.db.updateContactInfo(contact.id, contact);
                
                // 更新今日追粉计数
                this.todayFollowupCount++;
                await this.updateTodayFollowupCount();
                
                console.log(`成功向联系人 ${contact.name || contact.id} 发送第 ${followupCount + 1} 次无联系方式追粉消息`);
            } catch (error) {
                console.error(`向联系人 ${contact.name || contact.id} 发送追粉消息失败:`, error);
            }
        }
    }

    /**
     * 发送追粉消息
     * @param {Object} contact 联系人信息
     * @param {String} template 消息模板
     */
    async sendFollowupMessage(contact, template) {
        // 替换模板中的变量
        const message = this.app.utils.template.replaceTemplateVariables(template, contact);
        
        // 调用发送消息API
        await this.app.api.sendMessage(contact.id, message);
        
        return true;
    }

    /**
     * 重置追粉系统
     */
    reset() {
        console.log('重置追粉系统...');
        this.stopChecking();

        // 检查系统是否启用
        if (this.isEnabled()) {
            console.log('追粉系统已启用，重新启动定时检查');
            this.startChecking();
        } else {
            console.log('追粉系统未启用，不重新启动');
        }
    }

    /**
     * 手动触发追粉检查
     */
    async manualCheck() {
        if (this.isRunning) {
            return {success: false, message: '追粉检查已在进行中'};
        }
        
        await this.checkFollowUps();
        return {success: true, message: '追粉检查已完成'};
    }
} 