/**
 * 小红书私信自动回复助手 - 会话管理器
 */

// 用户状态枚举
const UserStatus = {
    NEW: 'new',                // 新用户，尚未处理
    NO_RESPONSE: 'no_response', // 未开口用户
    NO_CONTACT: 'no_contact',   // 未留资客户
    CONVERTED: 'converted'     // 已转化客户
};

class SessionManager {
    constructor(app) {
        this.app = app;
        this.initialized = false;
        this.sessions = new Map(); // 会话缓存
    }

    /**
     * 初始化会话管理器
     */
    async initialize() {
        try {
            this.app.utils.logger.info('初始化会话管理器');
            this.initialized = true;
            return true;
        } catch (error) {
            this.app.utils.logger.error('初始化会话管理器失败', error);
            return false;
        }
    }

    /**
     * 获取会话历史记录
     * @param {string} contactId 联系人ID
     * @returns {Array} 历史消息列表
     */
    async getSessionHistory(contactId) {
        try {
            if (!this.initialized) {
                throw new Error('会话管理器尚未初始化');
            }

            // 从存储中获取历史记录
            return this.app.utils.storage.getUserMessageHistory(contactId);
        } catch (error) {
            this.app.utils.logger.error('获取会话历史记录失败', error);
            return [];
        }
    }

    /**
     * 更新会话历史记录
     * @param {string} contactId 联系人ID
     * @param {object} message 消息对象
     */
    async updateSessionHistory(contactId, message) {
        try {
            if (!this.initialized) {
                throw new Error('会话管理器尚未初始化');
            }

            // 获取最大历史消息数设置
            const maxMessages = this.app.config.getSetting('reply.maxHistoryMessages', 10);

            // 添加消息到历史记录
            await this.app.utils.storage.addMessageToHistory(contactId, message, maxMessages);

            // 更新用户状态（如果是用户消息）
            if (message.role === 'user') {
                // 用户已回复消息，检查是否需要更新状态
                const currentStatus = await this.getUserStatus(contactId);
                if (currentStatus === UserStatus.NEW || currentStatus === UserStatus.NO_RESPONSE) {
                    // 用户已回复，检查是否已留客资
                    const hasContactInfo = await this.hasProvidedContactInfo(contactId);
                    
                    if (hasContactInfo) {
                        // 用户已留客资，标记为已转化
                        await this.setUserStatus(contactId, UserStatus.CONVERTED);
                        this.app.utils.logger.info(`联系人 ${contactId} 已留客资，更新状态为已转化`);
                    } else {
                        // 用户未留客资，设置为未留客资状态
                        await this.setUserStatus(contactId, UserStatus.NO_CONTACT);
                        this.app.utils.logger.info(`联系人 ${contactId} 未留客资，更新状态为未留客资`);
                    }
                }
            }

            return true;
        } catch (error) {
            this.app.utils.logger.error('更新会话历史记录失败', error);
            return false;
        }
    }

    /**
     * 清除会话历史记录
     * @param {string} contactId 联系人ID，如果不提供则清除所有历史记录
     */
    async clearSessionHistory(contactId = null) {
        try {
            if (!this.initialized) {
                throw new Error('会话管理器尚未初始化');
            }

            if (contactId) {
                // 清除指定联系人的历史记录
                await this.app.utils.storage.clearUserMessageHistory(contactId);
            } else {
                // 清除所有历史记录
                await this.app.utils.storage.clearAllMessageHistory();
            }

            return true;
        } catch (error) {
            this.app.utils.logger.error('清除会话历史记录失败', error);
            return false;
        }
    }

    /**
     * 获取指定联系人上次通过 AI 发送获客消息的时间戳
     * @param {string} contactId 联系人ID
     * @returns {Promise<number | null>} 时间戳或 null
     */
    async getLastLeadSentTime(contactId) {
        if (!this.initialized) {
            this.app.utils.logger.warn('尝试在 SessionManager 初始化前调用 getLastLeadSentTime');
            return null;
        }
        try {
            const sessionData = await this.getSessionData(contactId);
            if (sessionData && typeof sessionData.lastLeadSentTimestamp === 'number') {
                return sessionData.lastLeadSentTimestamp;
            }
            return null; // 没有找到数据、解析失败或时间戳无效
        } catch (error) {
            this.app.utils.logger.error(`获取联系人 ${contactId} 的 lastLeadSentTimestamp 失败`, error);
            return null; // 出错时返回 null
        }
    }

    /**
     * 记录当前时间为指定联系人最后一次通过 AI 发送获客消息的时间戳
     * @param {string} contactId 联系人ID
     * @returns {Promise<void>}
     */
    async recordLeadSentTime(contactId) {
        if (!this.initialized) {
            this.app.utils.logger.warn('尝试在 SessionManager 初始化前调用 recordLeadSentTime');
            return;
        }
        try {
            await this.updateSessionData(contactId, { lastLeadSentTimestamp: Date.now() });
        } catch (error) {
            this.app.utils.logger.error(`记录联系人 ${contactId} 的 lastLeadSentTimestamp 失败`, error);
            // 记录失败，但不抛出错误，避免影响主流程
        }
    }

    /**
     * 获取用户会话数据
     * @param {string} contactId 联系人ID
     * @returns {Promise<Object|null>} 会话数据或null
     */
    async getSessionData(contactId) {
        if (!this.initialized) {
            this.app.utils.logger.warn('尝试在 SessionManager 初始化前调用 getSessionData');
            return null;
        }
        try {
            const storageKey = `XHS_SESSION_DATA_${contactId}`;
            const rawData = GM_getValue(storageKey);
            if (!rawData) return {};
            
            try {
                return JSON.parse(rawData);
            } catch (parseError) {
                this.app.utils.logger.error(`解析联系人 ${contactId} 的会话数据失败`, parseError);
                return {};
            }
        } catch (error) {
            this.app.utils.logger.error(`获取联系人 ${contactId} 的会话数据失败`, error);
            return {};
        }
    }

    /**
     * 更新用户会话数据
     * @param {string} contactId 联系人ID
     * @param {Object} dataToUpdate 要更新的数据对象
     * @returns {Promise<boolean>} 是否成功
     */
    async updateSessionData(contactId, dataToUpdate) {
        if (!this.initialized) {
            this.app.utils.logger.warn('尝试在 SessionManager 初始化前调用 updateSessionData');
            return false;
        }
        try {
            const storageKey = `XHS_SESSION_DATA_${contactId}`;
            const currentData = await this.getSessionData(contactId) || {};
            const updatedData = { ...currentData, ...dataToUpdate };
            GM_setValue(storageKey, JSON.stringify(updatedData));
            return true;
        } catch (error) {
            this.app.utils.logger.error(`更新联系人 ${contactId} 的会话数据失败`, error);
            return false;
        }
    }

    /**
     * 获取用户状态
     * @param {string} contactId 联系人ID
     * @returns {Promise<string>} 用户状态
     */
    async getUserStatus(contactId) {
        try {
            const sessionData = await this.getSessionData(contactId);
            return sessionData.userStatus || UserStatus.NEW;
        } catch (error) {
            this.app.utils.logger.error(`获取联系人 ${contactId} 的状态失败`, error);
            return UserStatus.NEW;
        }
    }

    /**
     * 设置用户状态
     * @param {string} contactId 联系人ID
     * @param {string} status 用户状态
     * @returns {Promise<boolean>} 是否成功
     */
    async setUserStatus(contactId, status) {
        try {
            const validStatus = Object.values(UserStatus).includes(status);
            if (!validStatus) {
                throw new Error(`无效的用户状态: ${status}`);
            }
            
            await this.updateSessionData(contactId, { userStatus: status });
            this.app.utils.logger.info(`更新联系人 ${contactId} 的状态为 ${status}`);
            return true;
        } catch (error) {
            this.app.utils.logger.error(`设置联系人 ${contactId} 的状态失败`, error);
            return false;
        }
    }

    /**
     * 记录最近一次追粉时间
     * @param {string} contactId 联系人ID
     * @returns {Promise<boolean>} 是否成功
     */
    async recordFollowUpTime(contactId) {
        try {
            await this.updateSessionData(contactId, { 
                lastFollowUpTimestamp: Date.now() 
            });
            return true;
        } catch (error) {
            this.app.utils.logger.error(`记录联系人 ${contactId} 的追粉时间失败`, error);
            return false;
        }
    }

    /**
     * 获取最近一次追粉时间
     * @param {string} contactId 联系人ID
     * @returns {Promise<number|null>} 时间戳或null
     */
    async getLastFollowUpTime(contactId) {
        try {
            const sessionData = await this.getSessionData(contactId);
            return sessionData.lastFollowUpTimestamp || null;
        } catch (error) {
            this.app.utils.logger.error(`获取联系人 ${contactId} 的最近追粉时间失败`, error);
            return null;
        }
    }

    /**
     * 增加追粉次数记录
     * @param {string} contactId 联系人ID 
     * @returns {Promise<number>} 当前追粉次数
     */
    async incrementFollowUpCount(contactId) {
        try {
            const sessionData = await this.getSessionData(contactId);
            const currentCount = sessionData.followUpCount || 0;
            const newCount = currentCount + 1;
            
            await this.updateSessionData(contactId, { followUpCount: newCount });
            return newCount;
        } catch (error) {
            this.app.utils.logger.error(`增加联系人 ${contactId} 的追粉次数失败`, error);
            return 0;
        }
    }

    /**
     * 获取追粉次数
     * @param {string} contactId 联系人ID
     * @returns {Promise<number>} 追粉次数
     */
    async getFollowUpCount(contactId) {
        try {
            const sessionData = await this.getSessionData(contactId);
            return sessionData.followUpCount || 0;
        } catch (error) {
            this.app.utils.logger.error(`获取联系人 ${contactId} 的追粉次数失败`, error);
            return 0;
        }
    }

    /**
     * 检查是否提供了客资信息（基于客资标签判断）
     * @param {string} contactId 联系人ID
     * @returns {Promise<boolean>} 是否提供了客资
     */
    async hasProvidedContactInfo(contactId) {
        try {
            // 查找联系人元素
            const contactSelector = `[data-contactusemid="${contactId}"]`;
            const contactElement = document.querySelector(contactSelector);
            
            if (!contactElement) {
                this.app.utils.logger.debug(`未找到联系人元素: ${contactId}`);
                return false;
            }
            
            // 检查客资标签
            const { hasLeadTag, leadTagText } = this.app.utils.messageDetector.checkContactLeadTag(contactElement);
            
            // 在这里，我们认为有客资标签的联系人就是已留客资
            if (hasLeadTag) {
                this.app.utils.logger.debug(`联系人 ${contactId} 有客资标签: ${leadTagText}`);
                return true;
            }
            
            return false;
        } catch (error) {
            this.app.utils.logger.error(`检查联系人 ${contactId} 客资标签失败`, error);
            return false;
        }
    }

    /**
     * 检查并识别消息中的联系方式关键词（保留作为备用方法）
     * @param {string} message 消息内容
     * @returns {boolean} 是否包含联系方式
     */
    isContactInfoInMessage(message) {
        if (!message) return false;
        
        // 检查常见的联系方式格式
        const patterns = [
            /微信[号:]?\s*[\w-]{5,}/i,            // 匹配微信号 
            /wx[号:]?\s*[\w-]{5,}/i,               // 匹配wx
            /(?:1[3-9])\d{9}/,                    // 匹配手机号
            /(?:联系|加|微信)[号码:]?\s*[\w-]{5,}/i, // 匹配"联系"或"加"后跟微信号
            /v[信x][号:]?\s*[\w-]{5,}/i            // 匹配v信/vx等
        ];
        
        return patterns.some(pattern => pattern.test(message));
    }

    /**
     * 获取需要追粉的未开口用户列表
     * @returns {Promise<Array>} 符合追粉条件的用户列表
     */
    async getNoResponseContactsForFollowUp() {
        try {
            const allContactIds = await this.getAllContactIds();
            const followUpSettings = this.app.config.getSetting('followUp', {});
            const followUpInterval = followUpSettings.noResponseInterval || 24 * 60 * 60 * 1000; // 默认24小时
            const maxFollowUps = followUpSettings.maxNoResponseFollowUps || 3; // 最大追粉次数
            
            const result = [];
            const now = Date.now();
            
            for (const contactId of allContactIds) {
                const status = await this.getUserStatus(contactId);
                
                // 只处理未开口用户
                if (status !== UserStatus.NO_RESPONSE) continue;
                
                // 检查追粉次数上限
                const followUpCount = await this.getFollowUpCount(contactId);
                if (followUpCount >= maxFollowUps) continue;
                
                // 检查最后追粉时间
                const lastFollowUpTime = await this.getLastFollowUpTime(contactId);
                if (lastFollowUpTime && (now - lastFollowUpTime < followUpInterval)) continue;
                
                // 添加到结果列表
                result.push({
                    contactId,
                    status,
                    followUpCount,
                    lastFollowUpTime
                });
            }
            
            return result;
        } catch (error) {
            this.app.utils.logger.error('获取需要追粉的未开口用户失败', error);
            return [];
        }
    }

    /**
     * 获取需要追粉的未留客资用户列表
     * @returns {Promise<Array>} 符合追粉条件的用户列表
     */
    async getNoContactContactsForFollowUp() {
        try {
            const allContactIds = await this.getAllContactIds();
            const followUpSettings = this.app.config.getSetting('followUp', {});
            const followUpInterval = followUpSettings.noContactInterval || 48 * 60 * 60 * 1000; // 默认48小时
            const maxFollowUps = followUpSettings.maxNoContactFollowUps || 5; // 最大追粉次数
            
            const result = [];
            const now = Date.now();
            
            for (const contactId of allContactIds) {
                const status = await this.getUserStatus(contactId);
                
                // 只处理未留客资用户
                if (status !== UserStatus.NO_CONTACT) continue;
                
                // 检查追粉次数上限
                const followUpCount = await this.getFollowUpCount(contactId);
                if (followUpCount >= maxFollowUps) continue;
                
                // 检查最后追粉时间
                const lastFollowUpTime = await this.getLastFollowUpTime(contactId);
                if (lastFollowUpTime && (now - lastFollowUpTime < followUpInterval)) continue;
                
                // 添加到结果列表
                result.push({
                    contactId,
                    status,
                    followUpCount,
                    lastFollowUpTime
                });
            }
            
            return result;
        } catch (error) {
            this.app.utils.logger.error('获取需要追粉的未留客资用户失败', error);
            return [];
        }
    }

    /**
     * 获取需要追粉的所有用户列表（合并未开口和未留资）
     * @returns {Promise<Array>} 所有符合追粉条件的用户列表
     */
    async getContactsForFollowUp() {
        try {
            const noResponseContacts = await this.getNoResponseContactsForFollowUp();
            const noContactContacts = await this.getNoContactContactsForFollowUp();
            
            return [...noResponseContacts, ...noContactContacts];
        } catch (error) {
            this.app.utils.logger.error('获取需要追粉的用户失败', error);
            return [];
        }
    }

    /**
     * 获取所有联系人ID列表
     * @returns {Promise<Array<string>>} 联系人ID列表
     */
    async getAllContactIds() {
        try {
            return this.app.utils.storage.getAllContactIds();
        } catch (error) {
            this.app.utils.logger.error('获取所有联系人ID失败', error);
            return [];
        }
    }

    /**
     * 标记用户为已转化
     * @param {string} contactId 联系人ID
     * @returns {Promise<boolean>} 是否成功
     */
    async markUserAsConverted(contactId) {
        return await this.setUserStatus(contactId, UserStatus.CONVERTED);
    }
}