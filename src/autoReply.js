/**
 * 小红书私信自动回复助手 - 自动回复执行模块
 */

class AutoReply {
    constructor(app) {
        this.app = app;
        this.replyQueue = []; // 回复队列
        this.processing = false; // 是否正在处理回复
        this.sendRetries = {}; // 发送重试计数器
        this.maxSendRetries = 3; // 最大发送重试次数
        this.sendRetryDelay = 1000; // 重试延迟时间（毫秒）
    }

    /**
     * 初始化自动回复模块
     */
    async initialize() {
        try {
            this.app.utils.logger.info('初始化自动回复模块');
            return true;
        } catch (error) {
            this.app.utils.logger.error('初始化自动回复模块失败', error);
            return false;
        }
    }

    /**
     * 发送回复
     * @param {string} contactId 联系人ID
     * @param {string} content 回复内容
     * @returns {Promise<boolean>} 是否成功
     */
    async sendReply(contactId, content) {
        // 添加到回复队列
        return new Promise((resolve, reject) => {
            this.app.utils.logger.debug(`将回复添加到队列: ${content}`);

            // 创建唯一的消息ID
            const messageId = `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            this.replyQueue.push({
                id: messageId,
                contactId,
                content,
                resolve,
                reject,
                timestamp: Date.now()
            });

            // 如果当前没有在处理回复，则启动处理
            if (!this.processing) {
                this.processReplyQueue();
            }
        });
    }

    /**
     * 处理回复队列
     */
    async processReplyQueue() {
        if (this.replyQueue.length === 0 || this.processing) {
            return;
        }

        this.processing = true;

        try {
            // 取出队列中第一个回复
            const reply = this.replyQueue.shift();

            this.app.utils.logger.debug(`开始处理回复: ${reply.content}`);

            // 计算处理延迟
            const processingDelay = Date.now() - reply.timestamp;

            // 尝试发送回复
            let success = false;
            let error = null;
            
            try {
                success = await this.executeReply(reply.contactId, reply.content, reply.id);
            } catch (replyError) {
                // 捕获并记录executeReply中的错误，但不中断处理流程
                error = replyError;
                this.app.utils.logger.error('发送回复时出错', replyError);
                success = false;
            }

            // 更新响应时间统计（只在成功时更新）
            if (success) {
                await this.app.utils.storage.updateAverageResponseTime(processingDelay);
            }

            // 更新成功率统计
            await this.app.utils.storage.updateSuccessRate(success);

            // 解决promise
            if (success) {
                reply.resolve(true);
            } else {
                // 创建一个具体的错误对象，包含更多信息
                let errorMessage = '发送回复失败';
                if (error) {
                    errorMessage += `: ${error.message || '未知内部错误'}`;
                }
                    
                const errorObj = new Error(errorMessage);
                
                // 添加额外的调试信息
                errorObj.originalError = error; // 保留原始错误对象引用
                errorObj.contactId = reply.contactId;
                errorObj.contentPreview = reply.content.substring(0, 50) + (reply.content.length > 50 ? '...' : '');
                
                this.app.utils.logger.error('回复处理失败', errorObj, error); // 传递原始错误给logger
                
                reply.reject(errorObj);
            }

            // 处理下一个回复
            this.processing = false;
            this.processReplyQueue();
        } catch (error) {
            // 捕获processReplyQueue方法本身的错误
            this.app.utils.logger.error('处理回复队列出错', error);

            // 如果当前正在处理回复的Promise还存在，尝试拒绝它，防止资源泄漏
            if (this.replyQueue.length > 0) {
                try {
                    const pendingReply = this.replyQueue[0];
                    if (pendingReply && typeof pendingReply.reject === 'function') {
                        pendingReply.reject(new Error(`处理回复队列时出错: ${error.message || '未知错误'}`));
                        this.replyQueue.shift(); // 移除已处理的回复
                    }
                } catch (promiseError) {
                    // 忽略Promise处理错误
                    this.app.utils.logger.error('拒绝待处理回复Promise时出错', promiseError);
                }
            }

            // 释放处理锁，确保队列可以继续处理
            this.processing = false;
            
            // 添加短暂延迟，避免立即重试可能导致的错误重复
            setTimeout(() => {
                this.processReplyQueue();
            }, 500);
        }
    }

    /**
     * 执行回复操作
     * @param {string} contactId 联系人ID
     * @param {string} content 回复内容
     * @param {string} messageId 消息唯一ID
     * @returns {Promise<boolean>} 是否成功
     */
    async executeReply(contactId, content, messageId) {
        // 获取当前重试次数
        const retryCount = this.sendRetries[messageId] || 0;
        
        // 检查是否已达到最大重试次数
        if (retryCount >= this.maxSendRetries) {
            this.app.utils.logger.error(`消息 ${messageId} 已达到最大重试次数 ${this.maxSendRetries}，停止重试`);
            delete this.sendRetries[messageId]; // 清理重试计数
            return false;
        }
        
        let processPhase = '初始化';
        
        try {
            this.app.utils.logger.info(`正在回复: ${content.substring(0, 30)}${content.length > 30 ? '...' : ''}`);
            
            // 记录详细的消息参数
            this.app.utils.logger.debug(`回复参数详情: 联系人ID=${contactId}, 内容长度=${content.length}, 重试次数=${retryCount}`);

            processPhase = '规范化联系人ID';
            // 规范化目标联系人ID
            const originalContactId = contactId; // 保存原始ID用于日志
            contactId = this.app.core.messageDetector.normalizeContactId(contactId);

            // 获取并规范化当前联系人ID
            let currentId = this.app.core.messageDetector.currentContactId;
            const originalCurrentId = currentId; // 保存原始ID用于日志
            currentId = this.app.core.messageDetector.normalizeContactId(currentId);
            
            this.app.utils.logger.debug(`联系人ID信息:
                当前原始ID: ${originalCurrentId}
                当前规范化ID: ${currentId}
                目标原始ID: ${originalContactId}
                目标规范化ID: ${contactId}`);

            // 如果当前联系人不是目标联系人，尝试切换
            if (currentId !== contactId) {
                processPhase = '联系人切换';
                this.app.utils.logger.warn('当前联系人不是目标联系人，尝试切换...');

                // 查找联系人元素 - 增强版
                const contactElements = this.app.utils.dom.getElements(this.app.utils.dom.selectors.contactItem);
                let targetContactElement = null;
                
                // 记录所有找到的联系人ID供调试
                const foundContactIds = [];

                // 第一步：遍历联系人列表，查找完全匹配的联系人
                this.app.utils.logger.debug(`开始查找联系人，目标ID: ${contactId}`);
                
                for (const element of contactElements) {
                    // 收集所有可能的ID属性
                    const idAttributes = [
                        element.getAttribute('data-key'),
                        element.getAttribute('data-id'),
                        element.getAttribute('data-contactusemid'),
                        element.id,
                        element.getAttribute('data-uid'),
                    ];
                    
                    // 过滤掉null和undefined
                    const validIds = idAttributes.filter(id => id);
                    
                    // 记录所有找到的ID
                    if (validIds.length > 0) {
                        foundContactIds.push(...validIds);
                    }
                    
                    // 检查任何一个ID是否匹配
                    if (validIds.some(id => this.isContactIdMatch(id, contactId))) {
                        targetContactElement = element;
                        break;
                    }
                }
                
                this.app.utils.logger.debug(`联系人查找结果，找到的所有ID: ${foundContactIds.join(', ')}`);

                if (!targetContactElement) {
                    this.app.utils.logger.error(`无法找到目标联系人（ID: ${contactId}）`);
                    this.handleSendError(messageId, '找不到联系人元素');
                    return false;
                }

                // 尝试点击目标联系人
                this.app.utils.logger.debug('尝试点击目标联系人');
                
                try {
                    // 使用增强的点击方法
                    const clickSuccess = await this.app.utils.dom.enhancedClickWithVerification(
                        targetContactElement,
                        {
                            // 验证函数：检查联系人是否变为活跃状态
                            verificationFn: () => {
                                return targetContactElement.classList.contains('active');
                            },
                            verificationTimeout: 3000,
                            maxRetries: 3
                        }
                    );
                    
                    if (!clickSuccess) {
                        this.app.utils.logger.warn('点击联系人失败，尝试备用方案');
                        // 尝试简单点击
                        this.app.utils.dom.simulateClick(targetContactElement);
                    }
                } catch (clickError) {
                    this.app.utils.logger.error('点击联系人出错', clickError);
                    this.app.utils.dom.simulateClick(targetContactElement);
                }
                
                // 等待切换完成
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // 重新获取当前联系人ID
                const newCurrentId = this.app.core.messageDetector.currentContactId;
                this.app.utils.logger.debug(`切换后的当前联系人ID: ${newCurrentId}`);
                
                // 验证切换是否成功
                if (!this.isContactIdMatch(newCurrentId, contactId)) {
                    this.app.utils.logger.error('切换联系人失败，当前联系人ID与目标不匹配');
                    this.handleSendError(messageId, '切换联系人失败');
                    return false;
                }
                
                this.app.utils.logger.info('成功切换到目标联系人');
            }

            // 执行发送
            processPhase = '发送消息';
            this.app.utils.logger.debug('准备发送消息内容...');
            
            // 获取输入框
            const textArea = this.app.utils.dom.getElement(this.app.utils.dom.selectors.textArea);
            if (!textArea) {
                this.app.utils.logger.error('找不到消息输入框');
                this.handleSendError(messageId, '找不到消息输入框');
                return false;
            }
            
            // 清空输入框
            textArea.value = '';
            this.app.utils.dom.setValue(textArea, '');
            
            // 模拟点击输入框，确保激活
            this.app.utils.dom.simulateClick(textArea);
            
            // 等待输入框激活
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // 输入内容
            this.app.utils.dom.setValue(textArea, content);
            
            // 分发输入事件
            const inputEvent = new Event('input', { bubbles: true });
            textArea.dispatchEvent(inputEvent);
            
            // 等待消息内容加载
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // 检查发送按钮是否可点击
            const sendButton = this.app.utils.dom.getElement(this.app.utils.dom.selectors.sendButton);
            if (!sendButton) {
                this.app.utils.logger.error('找不到发送按钮');
                this.handleSendError(messageId, '找不到发送按钮');
                return false;
            }
            
            // 点击发送按钮
            this.app.utils.logger.debug('点击发送按钮');
            
            // 使用增强的点击方法
            try {
                await this.app.utils.dom.enhancedClickWithVerification(
                    sendButton,
                    {
                        // 验证函数：检查输入框是否已清空
                        verificationFn: () => {
                            return !textArea.value || textArea.value.trim() === '';
                        },
                        verificationTimeout: 2000,
                        maxRetries: 2
                    }
                );
            } catch (sendError) {
                this.app.utils.logger.warn('增强点击发送失败，尝试备用方法', sendError);
                this.app.utils.dom.simulateClick(sendButton);
                
                // 等待一小段时间，让发送操作完成
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            // 验证发送成功 - 检查输入框是否已清空
            if (textArea.value && textArea.value.trim() !== '') {
                this.app.utils.logger.warn('发送后输入框未清空，可能发送失败');
                this.handleSendError(messageId, '发送后输入框未清空');
                return false;
            }
            
            // 清理重试计数
            delete this.sendRetries[messageId];
            
            this.app.utils.logger.info('消息发送成功');
            return true;
        } catch (error) {
            this.handleSendError(messageId, processPhase, { error });
            return false;
        }
    }

    /**
     * 处理发送错误
     * @param {string} messageId 消息ID
     * @param {string} phase 失败阶段
     * @param {object} details 额外详情
     */
    handleSendError(messageId, phase, details = {}) {
        // 增加重试计数
        this.sendRetries[messageId] = (this.sendRetries[messageId] || 0) + 1;
        const currentRetry = this.sendRetries[messageId];
        
        // 记录错误详情
        this.app.utils.logger.error(`发送消息失败，阶段: ${phase}，重试次数: ${currentRetry}/${this.maxSendRetries}`, details);
        
        // 如果未达到最大重试次数，将消息重新加入队列
        if (currentRetry < this.maxSendRetries) {
            this.app.utils.logger.info(`将在 ${this.sendRetryDelay}ms 后重试发送消息`);
            
            // 延迟一段时间后重新加入队列
            setTimeout(() => {
                // 将当前处理的消息重新加入队列最前面
                if (this.replyQueue[0] && this.replyQueue[0].id === messageId) {
                    // 已经在队列中，不需要再添加
                    this.app.utils.logger.debug(`消息 ${messageId} 已在队列中，不再重新添加`);
                } else {
                    for (let i = 0; i < this.replyQueue.length; i++) {
                        if (this.replyQueue[i].id === messageId) {
                            // 已经在队列中，移到队首
                            const msg = this.replyQueue.splice(i, 1)[0];
                            this.replyQueue.unshift(msg);
                            this.app.utils.logger.debug(`消息 ${messageId} 已移到队首`);
                            return;
                        }
                    }
                }
            }, this.sendRetryDelay);
        } else {
            this.app.utils.logger.error(`消息 ${messageId} 已达到最大重试次数 ${this.maxSendRetries}，不再重试`);
            delete this.sendRetries[messageId]; // 清理重试计数
        }
    }

    /**
     * 清空回复队列
     */
    clearReplyQueue() {
        const queueLength = this.replyQueue.length;
        
        if (queueLength > 0) {
            this.app.utils.logger.info(`清空回复队列，共有 ${queueLength} 条未处理的回复`);
            
            // 拒绝所有待处理的回复
            for (const reply of this.replyQueue) {
                if (typeof reply.reject === 'function') {
                    reply.reject(new Error('回复队列已被清空'));
                }
            }
            
            this.replyQueue = [];
        }
    }

    /**
     * 检查两个联系人ID是否匹配
     * @param {string} id1 第一个ID
     * @param {string} id2 第二个ID
     * @returns {boolean} 是否匹配
     */
    isContactIdMatch(id1, id2) {
        if (!id1 || !id2) return false;
        
        // 直接比较是否完全相同
        if (id1 === id2) return true;
        
        // 规范化后比较
        const normalized1 = this.app.core.messageDetector.normalizeContactId(id1);
        const normalized2 = this.app.core.messageDetector.normalizeContactId(id2);
        
        return normalized1 === normalized2;
    }
}