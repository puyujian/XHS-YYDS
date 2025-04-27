/**
 * 小红书私信自动回复助手 - 存储管理工具
 */

// 存储键常量
const STORAGE_KEYS = {
    // 会话历史
    MESSAGE_HISTORY: 'XHS_AUTO_REPLY_MESSAGE_HISTORY',
    // 统计数据
    STATISTICS: 'XHS_AUTO_REPLY_STATISTICS',
    // 追粉系统统计
    FOLLOW_UP_STATS: 'XHS_AUTO_REPLY_FOLLOW_UP_STATS',
    // 用户索引（包含所有用户ID列表）
    CONTACT_INDEX: 'XHS_AUTO_REPLY_CONTACT_INDEX',
    // 联系人数据
    CONTACTS: 'XHS_AUTO_REPLY_CONTACTS'
};

class StorageManager {
    constructor() {
        this.initialized = false;

        // 缓存聊天历史
        this.messageHistory = {};

        // 统计数据
        this.statistics = {
            totalMessages: 0,           // 接收到的总消息数
            totalReplies: 0,            // 发送的总回复数
            aiReplies: 0,               // AI生成的回复数
            templateReplies: 0,         // 模板回复数
            keywordHits: {},            // 关键词命中统计 {关键词ID: 命中次数}
            dailyReplies: {},           // 每日回复数 {YYYY-MM-DD: 回复数}
            userReplies: {},            // 每用户回复数 {用户ID: 回复数}
            successRate: 0,              // 成功率（发送成功/尝试发送）
            averageResponseTime: 0,     // 平均响应时间（毫秒）
            lastUpdate: new Date().toISOString() // 最后更新时间
        };

        // 追粉系统统计数据
        this.followUpStats = {
            totalFollowUps: 0,          // 总追粉次数
            dailyFollowUps: {},         // 每日追粉数 {YYYY-MM-DD: 追粉数}
            successfulFollowUps: 0,     // 成功转化数量
            userStatusCounts: {         // 各状态用户数量
                new: 0,                  // 新用户
                no_response: 0,          // 未开口用户
                no_contact: 0,           // 未留资用户
                converted: 0             // 已转化用户
            },
            followUpHistory: {},        // 追粉历史 {用户ID: [追粉记录]}
            lastUpdate: new Date().toISOString() // 最后更新时间
        };

        // 用户索引
        this.contactIndex = [];
        
        // 联系人数据
        this.contacts = {};
    }

    /**
     * 初始化存储管理器
     */
    async initialize() {
        try {
            await this.loadMessageHistory();
            await this.loadStatistics();
            await this.loadFollowUpStats();
            await this.loadContactIndex();
            await this.loadContacts();

            this.initialized = true;
            console.log('存储管理器初始化完成');
            return true;
        } catch (error) {
            console.error('存储管理器初始化失败:', error);
            return false;
        }
    }

    /**
     * 加载消息历史
     */
    async loadMessageHistory() {
        try {
            const savedHistory = GM_getValue(STORAGE_KEYS.MESSAGE_HISTORY);

            if (savedHistory) {
                this.messageHistory = JSON.parse(savedHistory);
                console.log('加载消息历史成功');
            } else {
                this.messageHistory = {};
                console.log('未找到消息历史，使用空对象');
            }

            return this.messageHistory;
        } catch (error) {
            console.error('加载消息历史失败:', error);
            this.messageHistory = {};
            return this.messageHistory;
        }
    }

    /**
     * 保存消息历史
     */
    async saveMessageHistory() {
        try {
            GM_setValue(STORAGE_KEYS.MESSAGE_HISTORY, JSON.stringify(this.messageHistory));
            console.log('消息历史已保存');
            return true;
        } catch (error) {
            console.error('保存消息历史失败:', error);
            return false;
        }
    }

    /**
     * 加载统计数据
     */
    async loadStatistics() {
        try {
            const savedStats = GM_getValue(STORAGE_KEYS.STATISTICS);

            if (savedStats) {
                this.statistics = JSON.parse(savedStats);
                console.log('加载统计数据成功');
            } else {
                // 使用默认统计数据
                console.log('未找到统计数据，使用默认值');
            }

            return this.statistics;
        } catch (error) {
            console.error('加载统计数据失败:', error);
            // 保持默认统计数据
            return this.statistics;
        }
    }

    /**
     * 保存统计数据
     */
    async saveStatistics() {
        try {
            // 更新最后更新时间
            this.statistics.lastUpdate = new Date().toISOString();

            GM_setValue(STORAGE_KEYS.STATISTICS, JSON.stringify(this.statistics));
            console.log('统计数据已保存');
            return true;
        } catch (error) {
            console.error('保存统计数据失败:', error);
            return false;
        }
    }

    /**
     * 加载追粉系统统计数据
     */
    async loadFollowUpStats() {
        try {
            const savedStats = GM_getValue(STORAGE_KEYS.FOLLOW_UP_STATS);

            if (savedStats) {
                this.followUpStats = JSON.parse(savedStats);
                console.log('加载追粉系统统计数据成功');
            } else {
                // 使用默认统计数据
                console.log('未找到追粉系统统计数据，使用默认值');
            }

            return this.followUpStats;
        } catch (error) {
            console.error('加载追粉系统统计数据失败:', error);
            // 保持默认统计数据
            return this.followUpStats;
        }
    }

    /**
     * 保存追粉系统统计数据
     */
    async saveFollowUpStats() {
        try {
            // 更新最后更新时间
            this.followUpStats.lastUpdate = new Date().toISOString();

            GM_setValue(STORAGE_KEYS.FOLLOW_UP_STATS, JSON.stringify(this.followUpStats));
            console.log('追粉系统统计数据已保存');
            return true;
        } catch (error) {
            console.error('保存追粉系统统计数据失败:', error);
            return false;
        }
    }

    /**
     * 加载用户索引
     */
    async loadContactIndex() {
        try {
            const savedIndex = GM_getValue(STORAGE_KEYS.CONTACT_INDEX);

            if (savedIndex) {
                this.contactIndex = JSON.parse(savedIndex);
                console.log('加载用户索引成功');
            } else {
                // 从消息历史中提取联系人ID
                this.contactIndex = Object.keys(this.messageHistory);
                await this.saveContactIndex();
                console.log('根据消息历史生成用户索引');
            }

            return this.contactIndex;
        } catch (error) {
            console.error('加载用户索引失败:', error);
            this.contactIndex = [];
            return this.contactIndex;
        }
    }

    /**
     * 保存用户索引
     */
    async saveContactIndex() {
        try {
            GM_setValue(STORAGE_KEYS.CONTACT_INDEX, JSON.stringify(this.contactIndex));
            console.log('用户索引已保存');
            return true;
        } catch (error) {
            console.error('保存用户索引失败:', error);
            return false;
        }
    }

    /**
     * 获取用户历史消息
     * @param {string} userId 用户ID
     * @param {number} limit 限制数量，默认不限制
     * @returns {Array} 消息列表
     */
    getUserMessageHistory(userId, limit = 0) {
        if (!this.messageHistory[userId]) {
            return [];
        }

        const messages = this.messageHistory[userId];

        if (limit > 0 && messages.length > limit) {
            return messages.slice(messages.length - limit);
        }

        return messages;
    }

    /**
     * 添加消息到历史记录
     * @param {string} userId 用户ID
     * @param {object} message 消息对象 {role: 'user'|'assistant', content: string, timestamp: number}
     * @param {number} maxMessages 最大消息数，超过则删除最早的消息
     */
    async addMessageToHistory(userId, message, maxMessages = 100) {
        if (!this.initialized) {
            console.warn('存储管理器尚未初始化');
            return false;
        }

        // 确保用户历史记录存在
        if (!this.messageHistory[userId]) {
            this.messageHistory[userId] = [];
        }

        // 添加消息
        this.messageHistory[userId].push(message);

        // 限制历史记录长度
        if (maxMessages > 0 && this.messageHistory[userId].length > maxMessages) {
            this.messageHistory[userId] = this.messageHistory[userId].slice(
                this.messageHistory[userId].length - maxMessages
            );
        }

        // 如果是用户消息，更新统计数据
        if (message.role === 'user') {
            this.statistics.totalMessages++;
        } else if (message.role === 'assistant') {
            this.statistics.totalReplies++;

            // 更新每日回复数
            const today = new Date().toISOString().split('T')[0];
            this.statistics.dailyReplies[today] = (this.statistics.dailyReplies[today] || 0) + 1;

            // 更新每用户回复数
            this.statistics.userReplies[userId] = (this.statistics.userReplies[userId] || 0) + 1;
        }

        // 确保用户ID在索引中
        if (!this.contactIndex.includes(userId)) {
            this.contactIndex.push(userId);
            await this.saveContactIndex();
        }

        // 保存更新后的数据
        await this.saveMessageHistory();
        await this.saveStatistics();

        return true;
    }

    /**
     * 清除用户历史消息
     * @param {string} userId 用户ID
     */
    async clearUserMessageHistory(userId) {
        if (!this.initialized) {
            console.warn('存储管理器尚未初始化');
            return false;
        }

        if (this.messageHistory[userId]) {
            delete this.messageHistory[userId];
            await this.saveMessageHistory();
            console.log(`已清除用户 ${userId} 的历史消息`);
            return true;
        }

        return false;
    }

    /**
     * 清除所有历史消息
     */
    async clearAllMessageHistory() {
        if (!this.initialized) {
            console.warn('存储管理器尚未初始化');
            return false;
        }

        this.messageHistory = {};
        await this.saveMessageHistory();
        console.log('已清除所有历史消息');
        return true;
    }

    /**
     * 更新统计数据
     * @param {object} stats 统计数据对象
     */
    async updateStatistics(stats) {
        if (!this.initialized) {
            console.warn('存储管理器尚未初始化');
            return false;
        }

        // 更新统计数据
        Object.assign(this.statistics, stats);

        // 保存统计数据
        await this.saveStatistics();

        return true;
    }

    /**
     * 记录关键词命中
     * @param {string} keywordId 关键词ID
     */
    async recordKeywordHit(keywordId) {
        if (!this.initialized) {
            console.warn('存储管理器尚未初始化');
            return false;
        }

        // 确保关键词命中统计存在
        if (!this.statistics.keywordHits[keywordId]) {
            this.statistics.keywordHits[keywordId] = 0;
        }

        // 更新命中次数
        this.statistics.keywordHits[keywordId]++;

        // 保存统计数据
        await this.saveStatistics();

        return true;
    }

    /**
     * 记录AI回复
     */
    async recordAiReply() {
        if (!this.initialized) {
            console.warn('存储管理器尚未初始化');
            return false;
        }

        this.statistics.aiReplies++;
        await this.saveStatistics();

        return true;
    }

    /**
     * 记录模板回复
     */
    async recordTemplateReply() {
        if (!this.initialized) {
            console.warn('存储管理器尚未初始化');
            return false;
        }

        this.statistics.templateReplies++;
        await this.saveStatistics();

        return true;
    }

    /**
     * 更新回复成功率
     * @param {boolean} success 是否成功
     */
    async updateSuccessRate(success) {
        if (!this.initialized) {
            console.warn('存储管理器尚未初始化');
            return false;
        }

        // 计算新的成功率
        const total = this.statistics.totalReplies;
        const successful = success
            ? (this.statistics.successRate * (total - 1) + 1)
            : (this.statistics.successRate * (total - 1));

        this.statistics.successRate = total > 0 ? successful / total : 0;

        await this.saveStatistics();

        return true;
    }

    /**
     * 更新平均响应时间
     * @param {number} responseTime 响应时间（毫秒）
     */
    async updateAverageResponseTime(responseTime) {
        if (!this.initialized) {
            console.warn('存储管理器尚未初始化');
            return false;
        }

        // 计算新的平均响应时间
        const total = this.statistics.totalReplies;
        const avgTime = this.statistics.averageResponseTime;

        this.statistics.averageResponseTime = total > 1
            ? ((avgTime * (total - 1)) + responseTime) / total
            : responseTime;

        await this.saveStatistics();

        return true;
    }

    /**
     * 检查用户今日回复次数是否超过限制
     * @param {string} userId 用户ID
     * @param {number} maxReplies 最大回复次数
     * @returns {boolean} 是否超过限制
     */
    isUserReplyLimitExceeded(userId, maxReplies) {
        if (!this.initialized) {
            console.warn('存储管理器尚未初始化');
            return false;
        }

        const today = new Date().toISOString().split('T')[0];

        // 获取用户当日回复次数
        let userTodayReplies = 0;

        if (this.messageHistory[userId]) {
            userTodayReplies = this.messageHistory[userId].filter(msg => {
                const msgDate = new Date(msg.timestamp).toISOString().split('T')[0];
                return msg.role === 'assistant' && msgDate === today;
            }).length;
        }

        return userTodayReplies >= maxReplies;
    }

    /**
     * 检查今日总回复次数是否超过限制
     * @param {number} maxReplies 最大回复次数
     * @returns {boolean} 是否超过限制
     */
    isDailyReplyLimitExceeded(maxReplies) {
        if (!this.initialized) {
            console.warn('存储管理器尚未初始化');
            return false;
        }

        const today = new Date().toISOString().split('T')[0];
        const todayReplies = this.statistics.dailyReplies[today] || 0;

        return todayReplies >= maxReplies;
    }

    /**
     * 获取统计摘要
     * @returns {object} 统计摘要
     */
    getStatisticsSummary() {
        const today = new Date().toISOString().split('T')[0];

        return {
            totalMessages: this.statistics.totalMessages,
            totalReplies: this.statistics.totalReplies,
            todayReplies: this.statistics.dailyReplies[today] || 0,
            aiReplies: this.statistics.aiReplies,
            templateReplies: this.statistics.templateReplies,
            successRate: Math.round(this.statistics.successRate * 100),
            averageResponseTime: Math.round(this.statistics.averageResponseTime),
            lastUpdate: this.statistics.lastUpdate
        };
    }

    /**
     * 获取关键词命中率统计
     * @param {Array} keywordRules 关键词规则列表
     * @returns {Array} 关键词命中统计
     */
    getKeywordHitStatistics(keywordRules) {
        const result = [];

        // 遍历关键词规则
        keywordRules.forEach(rule => {
            const hits = this.statistics.keywordHits[rule.id] || 0;

            result.push({
                id: rule.id,
                name: rule.name,
                hits,
                percentage: this.statistics.totalMessages > 0
                    ? (hits / this.statistics.totalMessages * 100).toFixed(2)
                    : 0
            });
        });

        // 按命中次数排序
        return result.sort((a, b) => b.hits - a.hits);
    }

    /**
     * 获取所有联系人ID列表
     * @returns {Array<string>} 联系人ID列表
     */
    getAllContactIds() {
        return [...this.contactIndex];
    }

    /**
     * 记录追粉操作
     * @param {string} userId 用户ID
     * @param {string} status 用户状态
     * @param {number} followUpCount 追粉次数
     * @param {boolean} success 是否成功
     */
    async recordFollowUp(userId, status, followUpCount, success = true) {
        if (!this.initialized) {
            console.warn('存储管理器尚未初始化');
            return false;
        }

        // 确保追粉历史存在
        if (!this.followUpStats.followUpHistory[userId]) {
            this.followUpStats.followUpHistory[userId] = [];
        }

        // 创建追粉记录
        const record = {
            timestamp: Date.now(),
            status,
            followUpCount,
            success
        };

        // 添加到历史记录
        this.followUpStats.followUpHistory[userId].push(record);

        // 更新总追粉次数
        this.followUpStats.totalFollowUps++;

        // 更新每日追粉数
        const today = new Date().toISOString().split('T')[0];
        this.followUpStats.dailyFollowUps[today] = (this.followUpStats.dailyFollowUps[today] || 0) + 1;

        // 保存追粉统计数据
        await this.saveFollowUpStats();

        return true;
    }

    /**
     * 更新用户状态计数
     * @param {string} prevStatus 先前状态
     * @param {string} newStatus 新状态
     */
    async updateUserStatusCount(prevStatus, newStatus) {
        if (!this.initialized) {
            console.warn('存储管理器尚未初始化');
            return false;
        }

        // 更新用户状态计数
        if (prevStatus && this.followUpStats.userStatusCounts[prevStatus] > 0) {
            this.followUpStats.userStatusCounts[prevStatus]--;
        }

        if (newStatus) {
            this.followUpStats.userStatusCounts[newStatus] = (this.followUpStats.userStatusCounts[newStatus] || 0) + 1;
        }

        // 如果是转化状态，增加成功转化数
        if (newStatus === 'converted') {
            this.followUpStats.successfulFollowUps++;
        }

        // 保存追粉统计数据
        await this.saveFollowUpStats();

        return true;
    }

    /**
     * 获取追粉系统统计摘要
     * @returns {object} 统计摘要
     */
    getFollowUpStatsSummary() {
        const today = new Date().toISOString().split('T')[0];

        return {
            totalFollowUps: this.followUpStats.totalFollowUps,
            todayFollowUps: this.followUpStats.dailyFollowUps[today] || 0,
            successfulFollowUps: this.followUpStats.successfulFollowUps,
            userStatusCounts: { ...this.followUpStats.userStatusCounts },
            conversionRate: this.followUpStats.totalFollowUps > 0
                ? (this.followUpStats.successfulFollowUps / this.followUpStats.totalFollowUps * 100).toFixed(2)
                : 0,
            lastUpdate: this.followUpStats.lastUpdate
        };
    }

    /**
     * 获取用户的追粉历史
     * @param {string} userId 用户ID
     * @returns {Array} 追粉历史记录
     */
    getUserFollowUpHistory(userId) {
        if (!this.initialized || !this.followUpStats.followUpHistory[userId]) {
            return [];
        }

        return [...this.followUpStats.followUpHistory[userId]];
    }

    /**
     * 获取追粉统计数据 (用于 FollowUpManager)
     * @returns {object} 追粉统计数据
     */
    async getStats() {
        if (!this.initialized) {
            console.warn('存储管理器尚未初始化');
            return null;
        }
        
        // 转换格式以兼容 FollowUpManager 的预期结构
        const stats = {
            dailyFollowups: this.followUpStats.dailyFollowUps || {}
        };
        
        return stats;
    }

    /**
     * 保存追粉统计数据 (用于 FollowUpManager)
     * @param {object} stats 追粉统计数据
     * @returns {boolean} 是否保存成功
     */
    async saveStats(stats) {
        if (!this.initialized) {
            console.warn('存储管理器尚未初始化');
            return false;
        }

        // 从传入的 stats 对象提取数据并更新到 followUpStats
        if (stats && stats.dailyFollowups) {
            this.followUpStats.dailyFollowUps = stats.dailyFollowups;
            
            // 保存更新后的追粉统计数据
            await this.saveFollowUpStats();
            return true;
        }
        
        return false;
    }

    /**
     * 加载联系人数据
     */
    async loadContacts() {
        try {
            const savedContacts = GM_getValue(STORAGE_KEYS.CONTACTS);

            if (savedContacts) {
                this.contacts = JSON.parse(savedContacts);
                console.log('加载联系人数据成功');
            } else {
                this.contacts = {};
                console.log('未找到联系人数据，使用空对象');
            }

            return this.contacts;
        } catch (error) {
            console.error('加载联系人数据失败:', error);
            this.contacts = {};
            return this.contacts;
        }
    }

    /**
     * 保存联系人数据
     */
    async saveContacts() {
        try {
            GM_setValue(STORAGE_KEYS.CONTACTS, JSON.stringify(this.contacts));
            console.log('联系人数据已保存');
            return true;
        } catch (error) {
            console.error('保存联系人数据失败:', error);
            return false;
        }
    }

    /**
     * 获取联系人信息
     * @param {string} contactId 联系人ID
     * @returns {object|null} 联系人信息
     */
    async getContact(contactId) {
        if (!this.initialized) {
            console.warn('存储管理器尚未初始化');
            return null;
        }

        return this.contacts[contactId] || null;
    }

    /**
     * 保存联系人信息
     * @param {object} contact 联系人对象
     * @returns {boolean} 是否保存成功
     */
    async saveContact(contact) {
        if (!this.initialized || !contact || !contact.id) {
            console.warn('存储管理器尚未初始化或联系人数据无效');
            return false;
        }

        // 保存/更新联系人
        this.contacts[contact.id] = contact;
        
        // 确保联系人ID在索引中
        if (!this.contactIndex.includes(contact.id)) {
            this.contactIndex.push(contact.id);
            await this.saveContactIndex();
        }
        
        // 保存联系人数据
        await this.saveContacts();
        return true;
    }

    /**
     * 更新联系人信息 (用于 FollowUpManager)
     * @param {object} contact 联系人对象
     * @returns {boolean} 是否更新成功
     */
    async updateContact(contact) {
        return await this.saveContact(contact);
    }

    /**
     * 获取需要无回复追粉的联系人列表
     * @param {number} interval 间隔时间(小时)
     * @returns {Array} 联系人列表
     */
    async getContactsForNoResponseFollowup(interval) {
        if (!this.initialized) {
            console.warn('存储管理器尚未初始化');
            return [];
        }

        const now = Date.now();
        const intervalMs = interval * 60 * 60 * 1000; // 转换为毫秒
        const result = [];

        for (const contactId of this.contactIndex) {
            const contact = this.contacts[contactId];
            if (!contact) continue;

            // 判断是否是未回复状态的联系人
            if (contact.status === 'no_response') {
                // 如果没有追粉记录，或者上次追粉时间已超过间隔
                const lastFollowup = contact.followups && contact.followups.length > 0 
                    ? contact.followups[contact.followups.length - 1] 
                    : null;
                
                const lastTime = lastFollowup ? new Date(lastFollowup.time).getTime() : contact.lastActivity || 0;
                
                if (!lastFollowup || (now - lastTime > intervalMs)) {
                    result.push(contact);
                }
            }
        }

        return result;
    }

    /**
     * 获取需要无联系方式追粉的联系人列表
     * @param {number} interval 间隔时间(小时)
     * @returns {Array} 联系人列表
     */
    async getContactsForNoContactFollowup(interval) {
        if (!this.initialized) {
            console.warn('存储管理器尚未初始化');
            return [];
        }

        const now = Date.now();
        const intervalMs = interval * 60 * 60 * 1000; // 转换为毫秒
        const result = [];

        for (const contactId of this.contactIndex) {
            const contact = this.contacts[contactId];
            if (!contact) continue;

            // 判断是否是未留资状态的联系人
            if (contact.status === 'no_contact') {
                // 如果没有追粉记录，或者上次追粉时间已超过间隔
                const lastFollowup = contact.followups && contact.followups.length > 0 
                    ? contact.followups[contact.followups.length - 1] 
                    : null;
                
                const lastTime = lastFollowup ? new Date(lastFollowup.time).getTime() : contact.lastActivity || 0;
                
                if (!lastFollowup || (now - lastTime > intervalMs)) {
                    result.push(contact);
                }
            }
        }

        return result;
    }
}