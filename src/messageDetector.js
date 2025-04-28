/**
 * 小红书私信自动回复助手 - 消息检测模块
 */

class MessageDetector {
    constructor(app) {
        this.app = app;
        this.running = false;
        this.observer = null;
        this.currentContactId = null;
        this.lastProcessedMessages = new Set();
        this.checkInterval = null;
        this.contactCheckInterval = null;
        this.contactObserver = null;
        this.pendingMessages = []; // 待处理消息队列
        this.justSwitchedContact = false; // 标记是否刚刚切换联系人
        this.switchContactTimeout = null; // 用于切换联系人状态重置的定时器
        this.lastCheckState = {
            contactId: null,
            processedMessages: new Set(),
            lastCheckTime: 0
        };
        // 添加消息处理失败计数器
        this.failedMessagesCount = 0;
        this.maxConsecutiveFailures = 5; // 允许的最大连续失败次数
        this.recoveryAttempts = 0; // 恢复尝试次数
        this.maxRecoveryAttempts = 3; // 最大恢复尝试次数
    }

    /**
     * 初始化消息检测
     */
    async initialize() {
        try {
            this.app.utils.logger.info('初始化消息检测模块');

            // 初始化消息类型检测相关配置
            this.app.utils.logger.debug('配置消息类型检测功能');

            // 重置处理状态
            this.lastProcessedMessages.clear();
            this.justSwitchedContact = false;
            if (this.switchContactTimeout) {
                clearTimeout(this.switchContactTimeout);
                this.switchContactTimeout = null;
            }

            // 重置失败计数器
            this.failedMessagesCount = 0;
            this.recoveryAttempts = 0;

            // 等待页面加载完成
            await this.waitForPageElements();

            this.app.utils.logger.info('消息检测模块初始化完成');
            return true;
        } catch (error) {
            this.app.utils.logger.error('初始化消息检测模块失败', error);
            return false;
        }
    }

    /**
     * 检查联系人是否有客资标签
     * @param {Element} contactElement 联系人元素
     * @returns {Object} 包含是否有标签和标签文本的对象
     */
    checkContactLeadTag(contactElement) {
        try {
            if (!contactElement) return { hasLeadTag: false, leadTagText: '' };
            
            const tagElement = contactElement.querySelector(this.app.utils.dom.selectors.contactTag);
            const hasLeadTag = tagElement !== null;
            const leadTagText = hasLeadTag ? this.app.utils.dom.getText(tagElement) : '';
            
            return { hasLeadTag, leadTagText };
        } catch (error) {
            this.app.utils.logger.error('检查联系人客资标签失败', error);
            return { hasLeadTag: false, leadTagText: '' };
        }
    }

    /**
     * 等待页面元素加载完成
     */
    async waitForPageElements() {
        try {
            // 等待联系人列表元素加载
            const contactList = await this.app.utils.dom.waitForElement(
                this.app.utils.dom.selectors.contactList,
                30000
            );

            this.app.utils.logger.debug('联系人列表元素已加载');

            return true;
        } catch (error) {
            this.app.utils.logger.error('等待页面元素加载失败', error);
            throw error;
        }
    }

    /**
     * 启动消息检测
     */
    start() {
        if (this.running) {
            this.app.utils.logger.warn('消息检测已经在运行中');
            return false;
        }

        try {
            this.app.utils.logger.info('启动消息检测');

            // 清除之前的处理状态
            this.lastProcessedMessages.clear();
            this.app.utils.logger.debug('清除先前处理的消息缓存');

            // 重置失败计数器
            this.failedMessagesCount = 0;
            this.recoveryAttempts = 0;

            // 开始监听联系人变化
            this.startContactListObserver();
            this.app.utils.logger.debug('联系人监听已启动');

            // 开始监听消息变化
            this.startMessageObserver();
            this.app.utils.logger.debug('消息监听已启动');

            // 定时检查未读消息（作为备用机制）
            this.startBackupCheck();
            this.app.utils.logger.debug('备用检查机制已启动');

            this.running = true;
            this.app.utils.logger.info('消息检测已成功启动，准备接收新消息');
            return true;
        } catch (error) {
            this.app.utils.logger.error('启动消息检测失败', error);
            return false;
        }
    }

    /**
     * 停止消息检测
     */
    stop() {
        if (!this.running) {
            this.app.utils.logger.warn('消息检测已经停止');
            return false;
        }

        try {
            this.app.utils.logger.info('正在停止消息检测...');

            // 停止联系人变化监听
            if (this.contactObserver) {
                this.contactObserver.disconnect();
                this.contactObserver = null;
                this.app.utils.logger.debug('已停止联系人观察器');
            }

            // 停止消息变化监听
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
                this.app.utils.logger.debug('已停止消息观察器');
            }

            // 停止定时检查
            if (this.checkInterval) {
                clearInterval(this.checkInterval);
                this.checkInterval = null;
                this.app.utils.logger.debug('已停止消息周期检查');
            }

            if (this.contactCheckInterval) {
                clearInterval(this.contactCheckInterval);
                this.contactCheckInterval = null;
                this.app.utils.logger.debug('已停止联系人周期检查');
            }

            // 清除切换联系人状态
            if (this.switchContactTimeout) {
                clearTimeout(this.switchContactTimeout);
                this.switchContactTimeout = null;
                this.app.utils.logger.debug('已清除联系人切换状态');
            }

            this.justSwitchedContact = false;

            this.running = false;
            this.app.utils.logger.info('消息检测已成功停止');
            return true;
        } catch (error) {
            this.app.utils.logger.error('停止消息检测失败', error);
            return false;
        }
    }

    /**
     * 启动联系人列表观察器
     */
    startContactListObserver() {
        this.app.utils.logger.debug('启动联系人列表观察');

        // 监听联系人列表变化
        this.contactObserver = this.app.utils.dom.observeContactList((newContacts, removedContacts) => {
            this.handleContactListChange(newContacts, removedContacts);
        });

        // 初始检查未读联系人
        this.checkUnreadContacts();

        // 定时检查未读联系人
        this.contactCheckInterval = setInterval(() => {
            this.checkUnreadContacts();
        }, 5000); // 每5秒检查一次
    }

    /**
     * 处理联系人列表变化
     * @param {Array} newContacts 新增联系人
     * @param {Array} removedContacts 移除联系人
     */
    handleContactListChange(newContacts, removedContacts) {
        if (newContacts.length > 0) {
            this.app.utils.logger.debug(`检测到${newContacts.length}个新联系人`);

            // 检查新联系人中是否有未读消息
            for (const contact of newContacts) {
                this.checkContactUnread(contact);
            }
        }
    }

    /**
     * 检查联系人是否有未读消息
     * @param {Element} contact 联系人元素
     */
    checkContactUnread(contact) {
        try {
            // 检查是否有红点标记
            const redDot = contact.querySelector('.d-badge--color-bg-danger');
            
            // 检查是否有[未回复]标记
            const unrepliedTag = contact.querySelector(this.app.utils.dom.selectors.contactUnrepliedTag);
            const hasUnrepliedTag = unrepliedTag !== null;
            const unrepliedText = hasUnrepliedTag ? this.app.utils.dom.getText(unrepliedTag) : '';
            const isUnreplied = hasUnrepliedTag && unrepliedText.includes(this.app.utils.dom.selectors.contactUnrepliedText);

            if (redDot || isUnreplied) {
                // 提取联系人ID
                const contactKey = contact.getAttribute('data-key');

                if (contactKey) {
                    // 使用通用的规范化方法处理联系人ID
                    const contactId = this.normalizeContactId(contactKey);

                    this.app.utils.logger.debug(`联系人原始ID: ${contactKey}, 规范化ID: ${contactId}`);
                    
                    // 检查是否有客资标签
                    const tagElement = contact.querySelector(this.app.utils.dom.selectors.contactTag);
                    const hasLeadTag = tagElement !== null;
                    const leadTagText = hasLeadTag ? this.app.utils.dom.getText(tagElement) : '';

                    // 检查是否启用了忽略客资标签设置
                    const ignoreLeadTags = this.app.config.getSetting('reply.ignoreLeadTags', false);

                    if (isUnreplied) {
                        this.app.utils.logger.info(`检测到未回复标记: ${unrepliedText} 联系人: ${contactId}`);
                        
                        // 如果有客资标签且开启了忽略客资标签设置，则跳过该联系人
                        if (hasLeadTag && ignoreLeadTags) {
                            this.app.utils.logger.info(`跳过处理带有客资标签(${leadTagText})的未回复联系人: ${contactId}`);
                            return;
                        } else {
                            this.app.utils.logger.info(`准备处理未回复联系人: ${contactId}${hasLeadTag ? ` (带有客资标签: ${leadTagText})` : ''}`);
                        }
                    }

                    // 获取联系人名称
                    const nameElement = contact.querySelector(this.app.utils.dom.selectors.contactName);
                    const contactName = nameElement ? this.app.utils.dom.getText(nameElement) : '未知用户';

                    // 获取最后一条消息预览
                    const lastMessageElement = contact.querySelector(this.app.utils.dom.selectors.contactLastMessage);
                    const lastMessagePreview = lastMessageElement ? this.app.utils.dom.getText(lastMessageElement) : '';

                    // 检查是否是超时未回复标记
                    const timeoutElement = contact.querySelector(this.app.utils.dom.selectors.contactTimeoutFlag);
                    const isTimeout = timeoutElement !== null;

                    // 如果有客资标签且开启了忽略客资标签设置，则跳过该联系人
                    if (hasLeadTag && ignoreLeadTags) {
                        this.app.utils.logger.info(`跳过带有客资标签(${leadTagText})的联系人: ${contactName}`);
                        return;
                    }

                    const contactInfo = {
                        id: contactId,
                        rawId: contactKey, // 保存原始ID，便于后续查找元素
                        name: contactName,
                        lastMessage: lastMessagePreview,
                        isTimeout,
                        hasLeadTag,
                        leadTagText,
                        isUnreplied, // 添加未回复标记状态
                        unrepliedText, // 添加未回复标记文本
                        element: contact
                    };

                    // 切换到此联系人并获取消息
                    this.switchToContact(contactInfo);
                }
            }
        } catch (error) {
            this.app.utils.logger.error('检查联系人未读消息失败', error);
        }
    }

    /**
     * 检查所有未读联系人
     */
    checkUnreadContacts() {
        try {
            const contacts = this.app.utils.dom.getElements(this.app.utils.dom.selectors.contactItem);

            if (contacts.length === 0) {
                this.app.utils.logger.debug('未找到联系人列表');
                return;
            }

            for (const contact of contacts) {
                this.checkContactUnread(contact);
            }
        } catch (error) {
            this.app.utils.logger.error('检查未读联系人失败', error);
        }
    }

    /**
     * 切换到指定联系人
     * @param {Object} contactInfo 联系人信息
     */
    async switchToContact(contactInfo) {
        try {
            this.app.utils.logger.debug(`切换到联系人: ${contactInfo.name}`);

            // 如果当前已在此联系人对话框，则不需要切换
            if (this.currentContactId === contactInfo.id) {
                this.app.utils.logger.debug('已在当前联系人对话框，无需切换');
                return;
            }

            // 模拟点击联系人
            this.app.utils.dom.simulateClick(contactInfo.element);

            // 更新当前联系人ID
            this.currentContactId = contactInfo.id;

            // 设置刚刚切换联系人标记，用于新消息检测
            this.justSwitchedContact = true;

            // 清除之前的超时器（如果存在）
            if (this.switchContactTimeout) {
                clearTimeout(this.switchContactTimeout);
            }

            // 设置一个10秒后重置标记的超时器
            this.switchContactTimeout = setTimeout(() => {
                this.justSwitchedContact = false;
                this.app.utils.logger.debug('重置切换联系人标记');
            }, 10000);

            // 等待消息加载完成
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 检查新消息
            this.checkNewMessages();
        } catch (error) {
            this.app.utils.logger.error('切换联系人失败', error);
        }
    }

    /**
     * 启动消息观察器
     */
    startMessageObserver() {
        // 检查备份方法是否存在
        if (!this.app.utils.dom.observeMessageList) {
            this.app.utils.logger.error('消息观察器方法不存在，将使用备用检查机制');
            return;
        }

        try {
            // 开始观察消息列表
            this.observer = this.app.utils.dom.observeMessageList((newMessages, removedMessages) => {
                this.handleMessageListChange(newMessages, removedMessages);
            });

            if (!this.observer) {
                this.app.utils.logger.warn('消息观察器创建失败，将依赖备用检查机制');
            } else {
                this.app.utils.logger.debug('消息观察器已启动');
            }
        } catch (error) {
            this.app.utils.logger.error('启动消息观察器失败，将使用备用检查机制', error);
        }
    }

    /**
     * 处理消息列表变化
     * @param {Array} newMessages 新增消息
     * @param {Array} removedMessages 移除消息
     */
    handleMessageListChange(newMessages, removedMessages) {
        if (newMessages.length > 0) {
            this.app.utils.logger.debug(`检测到${newMessages.length}条新消息`);

            // 处理新消息
            for (const messageElement of newMessages) {
                this.processNewMessage(messageElement);
            }
        }
    }

    /**
     * 处理新消息
     * @param {Element} messageElement 消息元素
     */
    async processNewMessage(messageElement) {
        if (!messageElement) {
            this.app.utils.logger.debug('消息元素为空');
            return;
        }

        try {
            // 检查是否是对方发送的消息
            const leftMessageElement = messageElement.querySelector(this.app.utils.dom.selectors.leftMessage);

            if (!leftMessageElement) {
                this.app.utils.logger.debug('不是对方发送的消息，忽略');
                return;
            }

            // 获取当前活跃联系人，检查是否有客资标签
            const activeContact = document.querySelector('.sx-contact-item.active');
            if (activeContact) {
                const tagElement = activeContact.querySelector(this.app.utils.dom.selectors.contactTag);
                const hasLeadTag = tagElement !== null;
                const leadTagText = hasLeadTag ? this.app.utils.dom.getText(tagElement) : '';

                // 检查是否启用了忽略客资标签设置
                const ignoreLeadTags = this.app.config && this.app.config.getSetting
                    ? this.app.config.getSetting('reply.ignoreLeadTags', false)
                    : false;

                // 如果有客资标签且开启了忽略客资标签设置，则跳过该消息
                if (hasLeadTag && ignoreLeadTags) {
                    const nameElement = activeContact.querySelector(this.app.utils.dom.selectors.contactName);
                    const contactName = nameElement ? this.app.utils.dom.getText(nameElement) : '未知用户';
                    this.app.utils.logger.info(`跳过带有客资标签(${leadTagText})的联系人消息: ${contactName}`);
                    return;
                }
            }

            // 检查消息发送时间以避免处理旧消息
            const timestampElement = messageElement.querySelector(this.app.utils.dom.selectors.messageTimestamp);
            const timestampText = timestampElement ? timestampElement.textContent.trim() : '';

            // 如果消息有明确的时间戳，检查是否是近期消息（最近2分钟内）
            if (timestampText) {
                // 提取时间戳中的时间部分 (HH:MM:SS)
                const timeMatch = timestampText.match(/\d{2}:\d{2}:\d{2}/);
                if (timeMatch) {
                    const currentTime = new Date();
                    const msgTime = new Date();

                    const [hours, minutes, seconds] = timeMatch[0].split(':').map(Number);
                    msgTime.setHours(hours, minutes, seconds);

                    // 如果时间差超过2分钟且不是刚刚收到的消息，则可能是旧消息
                    const timeDiff = Math.abs(currentTime - msgTime);

                    // 如果时间差超过2分钟，且不是刚跳转到该对话，跳过该消息
                    if (timeDiff > 2 * 60 * 1000 && !this.justSwitchedContact) {
                        this.app.utils.logger.debug(`跳过可能的旧消息: ${timestampText}`);
                        return;
                    }
                }
            }

            // 提取消息ID，使用更多特征确保唯一性
            let messageIdParts = [];

            // 使用消息的id属性
            if (messageElement.id) {
                messageIdParts.push(messageElement.id);
            }

            // 添加发送时间作为特征
            if (timestampText) {
                messageIdParts.push(timestampText.replace(/\s+/g, '_'));
            }

            // 获取消息类型
            const msgTypeAttr = leftMessageElement.getAttribute('data-msg-type');
            let msgType = msgTypeAttr || 'UNKNOWN';
            messageIdParts.push(msgType);

            // 如果上述都没有，添加当前时间戳和随机值
            if (messageIdParts.length === 0) {
                messageIdParts.push(`msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
            }

            // 生成最终的消息ID
            const messageId = messageIdParts.join('_');

            // 检查是否已处理过此消息
            if (this.lastProcessedMessages.has(messageId)) {
                this.app.utils.logger.debug(`消息已处理过，跳过: ${messageId}`);
                return;
            }

            // 根据消息类型提取内容
            let messageText = '';
            let messageTitle = '';
            let messageType = '';
            let messageSource = null;

            this.app.utils.logger.debug(`处理消息类型: ${msgTypeAttr || 'UNKNOWN'}`);

            if (msgType === 'CARD') {
                // 处理卡片消息
                messageType = 'CARD';
                const cardContainer = leftMessageElement.querySelector(this.app.utils.dom.selectors.messageCardContainer);
                if (!cardContainer) {
                    this.app.utils.logger.debug('未找到卡片容器，无法处理');
                    return;
                }

                // 获取卡片标题
                const titleElement = cardContainer.querySelector(this.app.utils.dom.selectors.messageCardTitle);
                messageTitle = titleElement ? titleElement.textContent.trim() : '';

                // 获取卡片信息
                const infoElement = cardContainer.querySelector(this.app.utils.dom.selectors.messageCardInfo);
                messageText = infoElement ? infoElement.textContent.trim() : messageTitle;

                if (!messageText && !messageTitle) {
                    this.app.utils.logger.debug('卡片内容为空，无法处理');
                    return;
                }

                this.app.utils.logger.debug(`检测到卡片消息，标题: ${messageTitle}, 内容: ${messageText}`);
            } else if (messageElement.querySelector('.source-tip')) {
                // 处理聚光进线消息
                messageType = 'SPOTLIGHT';
                const sourceTip = messageElement.querySelector('.source-tip');
                messageSource = sourceTip ? sourceTip.textContent.trim() : null;

                // 处理普通文本消息部分
                const textMessageElement = leftMessageElement.querySelector(this.app.utils.dom.selectors.textMessage);

                if (!textMessageElement) {
                    this.app.utils.logger.debug('未找到文本消息内容，无法处理');
                    return;
                }

                messageText = textMessageElement.textContent.trim();

                this.app.utils.logger.debug(`检测到聚光进线消息，来源: ${messageSource}, 内容: ${messageText}`);
            } else {
                // 处理普通文本消息
                messageType = 'TEXT';
                const textMessageElement = leftMessageElement.querySelector(this.app.utils.dom.selectors.textMessage);

                if (!textMessageElement) {
                    this.app.utils.logger.debug('未找到文本消息内容，无法处理');
                    return;
                }

                messageText = textMessageElement.textContent.trim();

                if (!messageText) {
                    this.app.utils.logger.debug('消息内容为空');
                    return;
                }
            }

            // 标记为已处理
            this.lastProcessedMessages.add(messageId);

            // 如果缓存过多，清理最早的
            if (this.lastProcessedMessages.size > 100) {
                const iterator = this.lastProcessedMessages.values();
                this.lastProcessedMessages.delete(iterator.next().value);
            }

            // 获取发送者信息
            const senderElement = messageElement.querySelector(this.app.utils.dom.selectors.messageSender);
            const senderInfo = senderElement ? senderElement.textContent.trim().split(' ')[0] : '未知用户';

            // 获取联系人ID
            const contactId = this.extractContactId(messageElement);
            if (!contactId) {
                this.app.utils.logger.error('无法获取联系人ID');
                return;
            }

            // 创建消息对象
            const message = {
                id: messageId,
                contactId: contactId,
                sender: senderInfo,
                content: messageText,
                type: messageType,
                title: messageTitle, // 对于卡片类型有用
                sourceInfo: messageSource, // 对于聚光进线消息有用
                timestamp: Date.now(),
                element: messageElement,
                isSystemMessage: messageType === 'SPOTLIGHT' // 聚光进线消息标记为系统消息
            };

            this.app.utils.logger.info(`收到来自 ${message.sender} 的新消息[${message.type}]: ${message.content}${messageSource ? ', 来源: ' + messageSource : ''}`);

            // 添加到待处理队列
            this.pendingMessages.push(message);

            // 记录到历史
            try {
                await this.app.utils.storage.addMessageToHistory(
                    contactId,
                    {
                        role: message.isSystemMessage ? 'system' : 'user',
                        content: messageText,
                        type: messageType,
                        title: messageTitle,
                        sourceInfo: messageSource,
                        timestamp: Date.now()
                    }
                );
            } catch (error) {
                this.app.utils.logger.error('添加消息到历史记录失败', error);
            }

            // 处理消息
            try {
                // 检查核心组件是否已初始化
                if (!this.app.core || !this.app.core.messageHandler) {
                    this.app.utils.logger.warn('消息处理器未初始化，跳过消息处理');
                    this.failedMessagesCount++;
                    if (this.failedMessagesCount >= this.maxConsecutiveFailures) {
                        this.attemptRecovery();
                    }
                    return;
                }

                await this.app.core.messageHandler.handleMessage(message);
                
                // 成功处理消息，重置失败计数器
                this.failedMessagesCount = 0;
            } catch (error) {
                this.app.utils.logger.error('处理消息失败', error);
                this.failedMessagesCount++;
                
                if (this.failedMessagesCount >= this.maxConsecutiveFailures) {
                    this.attemptRecovery();
                }
            }
        } catch (error) {
            this.app.utils.logger.error('处理新消息失败', error);
            this.failedMessagesCount++;
            
            if (this.failedMessagesCount >= this.maxConsecutiveFailures) {
                this.attemptRecovery();
            }
        }
    }

    /**
     * 检查新消息（备用机制，以防观察器没有触发）
     */
    checkNewMessages() {
        try {
            const messages = this.app.utils.dom.getElements(this.app.utils.dom.selectors.messageItem);

            if (messages.length === 0) {
                this.app.utils.logger.debug('未找到消息列表');
                return;
            }

            for (const messageElement of messages) {
                this.processNewMessage(messageElement);
            }
        } catch (error) {
            this.app.utils.logger.error('检查新消息失败', error);
        }
    }

    /**
     * 启动备用检查机制
     */
    startBackupCheck() {
        this.app.utils.logger.debug('启动备用检查机制');

        // 上次处理的状态，用于比较避免重复日志
        this.lastCheckState = {
            contactId: null,
            processedMessages: new Set(),
            lastCheckTime: 0
        };

        // 定期检查未读联系人
        this.checkInterval = setInterval(() => {
            if (this.running) {
                // 限制检查频率 - 确保两次检查至少间隔5秒
                const now = Date.now();
                if (now - this.lastCheckState.lastCheckTime < 5000) {
                    return;
                }
                
                this.lastCheckState.lastCheckTime = now;
                
                // 检查未读联系人
                this.checkUnreadContacts();

                // 仅当当前联系人ID与上次不同时才记录日志
                if (this.currentContactId && this.currentContactId !== this.lastCheckState.contactId) {
                    this.app.utils.logger.debug(`当前联系人已切换: ${this.lastCheckState.contactId} -> ${this.currentContactId}`);
                    this.lastCheckState.contactId = this.currentContactId;
                    this.checkNewMessages();
                } else if (this.currentContactId) {
                    // 静默检查新消息，减少日志输出
                    this.checkNewMessagesQuiet();
                }
            }
        }, 10000); // 每10秒检查一次
    }
    
    /**
     * 静默检查新消息（不产生重复日志）
     */
    checkNewMessagesQuiet() {
        try {
            const messages = this.app.utils.dom.getElements(this.app.utils.dom.selectors.messageItem);
            if (messages.length === 0) return;
            
            // 只处理尚未处理过的消息
            for (const messageElement of messages) {
                const messageId = messageElement.id;
                if (messageId && !this.lastProcessedMessages.has(messageId) && 
                   !this.lastCheckState.processedMessages.has(messageId)) {
                    this.processNewMessage(messageElement);
                    this.lastCheckState.processedMessages.add(messageId);
                }
            }
            
            // 限制缓存大小
            if (this.lastCheckState.processedMessages.size > 100) {
                const iterator = this.lastCheckState.processedMessages.values();
                this.lastCheckState.processedMessages.delete(iterator.next().value);
            }
        } catch (error) {
            // 静默失败，不记录错误日志
        }
    }

    /**
     * 从消息元素中提取联系人ID
     * @param {Element} messageElement 消息元素
     * @returns {string|null} 联系人ID
     */
    extractContactId(messageElement) {
        try {
            // 从消息ID中提取联系人ID
            const messageId = messageElement.id;
            if (messageId) {
                const parts = messageId.split('.');
                if (parts.length >= 3) {
                    let contactId = parts[1]; // 联系人ID通常是第二部分
                    // 规范化ID - 去除前缀
                    contactId = this.normalizeContactId(contactId);
                    this.app.utils.logger.debug(`从消息ID提取联系人ID: ${contactId}`);
                    return contactId;
                }
            }

            // 尝试从data-id属性提取
            const dataId = messageElement.getAttribute('data-id');
            if (dataId) {
                const parts = dataId.split('.');
                let contactId;
                if (parts.length >= 2) {
                    contactId = parts[1]; // 可能的联系人ID格式
                } else {
                    contactId = dataId; // 直接返回data-id
                }
                // 规范化ID - 去除前缀
                contactId = this.normalizeContactId(contactId);
                this.app.utils.logger.debug(`从data-id属性提取联系人ID: ${contactId}`);
                return contactId;
            }

            // 尝试从最近的消息容器提取
            const container = messageElement.closest('.im-chat-container');
            if (container) {
                let contactId = container.getAttribute('data-id');
                if (contactId) {
                    // 规范化ID - 去除前缀
                    contactId = this.normalizeContactId(contactId);
                    this.app.utils.logger.debug(`从消息容器提取联系人ID: ${contactId}`);
                    return contactId;
                }
            }

            // 尝试从父元素提取
            const parent = messageElement.closest('[data-id]');
            if (parent) {
                let contactId = parent.getAttribute('data-id');
                // 规范化ID - 去除前缀
                contactId = this.normalizeContactId(contactId);
                this.app.utils.logger.debug(`从父元素提取联系人ID: ${contactId}`);
                return contactId;
            }

            // 尝试从活跃联系人提取
            const activeContact = document.querySelector('.sx-contact-item.active');
            if (activeContact) {
                let contactId = activeContact.getAttribute('data-key');
                if (contactId) {
                    // 规范化ID - 去除前缀
                    contactId = this.normalizeContactId(contactId);
                    this.app.utils.logger.debug(`从活跃联系人提取ID: ${contactId}`);
                    return contactId;
                }
            }

            // 如果从消息ID中无法提取，尝试从其他属性获取
            if (this.currentContactId) {
                // 确保当前联系人ID也被规范化
                const contactId = this.normalizeContactId(this.currentContactId);
                this.app.utils.logger.debug(`使用当前联系人ID: ${contactId}`);
                return contactId;
            }

            this.app.utils.logger.warn('无法提取联系人ID');
            return null;
        } catch (error) {
            this.app.utils.logger.error('提取联系人ID失败', error);
            return null;
        }
    }

    /**
     * 规范化联系人ID - 去除常见前缀和统一格式
     * @param {string} contactId 原始联系人ID
     * @returns {string} 规范化后的联系人ID
     */
    normalizeContactId(contactId) {
        if (!contactId) return contactId;
        
        // 转换为字符串类型（防止数字类型ID）
        contactId = String(contactId).trim();
        
        // 去除常见前缀
        const prefixes = ['Total-', 'Active-', 'User-', 'Contact-', 'User_', 'Contact_'];
        for (const prefix of prefixes) {
            if (contactId.startsWith(prefix)) {
                contactId = contactId.substring(prefix.length);
                break; // 只移除一个前缀
            }
        }
        
        // 清理ID中的非法字符
        contactId = contactId.replace(/[^a-zA-Z0-9_-]/g, '');
        
        // 确保返回的ID不为空
        return contactId || '未知ID';
    }

    /**
     * 尝试恢复消息检测系统
     */
    async attemptRecovery() {
        if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
            this.app.utils.logger.error(`已达到最大恢复尝试次数(${this.maxRecoveryAttempts})，放弃恢复`);
            return;
        }
        
        this.recoveryAttempts++;
        this.app.utils.logger.warn(`检测到连续失败(${this.failedMessagesCount}次)，正在尝试恢复消息检测系统 (尝试 ${this.recoveryAttempts}/${this.maxRecoveryAttempts})`);
        
        try {
            // 停止当前的观察器
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
            
            // 重置处理状态
            this.lastProcessedMessages.clear();
            this.failedMessagesCount = 0;
            
            // 重新启动消息观察器
            this.startMessageObserver();
            this.app.utils.logger.info('消息观察器已重新启动');
            
            // 清空并释放资源
            this.pendingMessages = [];
            
            // 如果恢复成功，重置恢复尝试计数
            this.recoveryAttempts = 0;
            
            this.app.utils.logger.info('消息检测系统恢复完成');
        } catch (error) {
            this.app.utils.logger.error('恢复消息检测系统失败', error);
        }
    }
}