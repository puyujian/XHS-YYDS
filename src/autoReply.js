/**
 * 小红书私信自动回复助手 - 自动回复执行模块
 */

class AutoReply {
    constructor(app) {
        this.app = app;
        this.replyQueue = []; // 回复队列
        this.processing = false; // 是否正在处理回复
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

            this.replyQueue.push({
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
                success = await this.executeReply(reply.contactId, reply.content);
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
                    // 尝试包含堆栈信息，如果日志库能处理或需要字符串形式
                    // errorMessage += `\nStack: ${error.stack || 'N/A'}`; 
                }
                    
                const errorObj = new Error(errorMessage);
                
                // 添加额外的调试信息
                errorObj.originalError = error; // 保留原始错误对象引用
                errorObj.contactId = reply.contactId;
                errorObj.contentPreview = reply.content.substring(0, 50) + (reply.content.length > 50 ? '...' : '');
                
                // {{ Rationale: Pass the original error object 'error' as an additional argument to the logger for potentially more detailed logging, assuming the logger supports it. }}
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
     * @returns {Promise<boolean>} 是否成功
     */
    async executeReply(contactId, content) {
        let processPhase = '初始化';
        
        try {
            this.app.utils.logger.info(`正在回复: ${content.substring(0, 30)}${content.length > 30 ? '...' : ''}`);
            
            // 记录详细的消息参数
            this.app.utils.logger.debug(`回复参数详情: 联系人ID=${contactId}, 内容长度=${content.length}`);

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
                        element.getAttribute('id')
                    ].filter(Boolean); // 过滤掉null和undefined
                    
                    foundContactIds.push(...idAttributes);
                    
                    // 尝试所有ID属性查找精确匹配
                    for (const attr of idAttributes) {
                        const normalizedAttr = this.app.core.messageDetector.normalizeContactId(attr);
                        if (normalizedAttr === contactId) {
                            this.app.utils.logger.debug(`找到完全匹配联系人元素: ${attr} => ${normalizedAttr}`);
                            targetContactElement = element;
                            break;
                        }
                    }
                    
                    if (targetContactElement) break;
                }
                
                // 第二步：如果没有找到精确匹配，尝试部分匹配
                if (!targetContactElement) {
                    this.app.utils.logger.debug(`未找到完全匹配联系人，尝试部分匹配...`);
                    
                    for (const element of contactElements) {
                        const idAttributes = [
                            element.getAttribute('data-key'),
                            element.getAttribute('data-id'),
                            element.getAttribute('data-contactusemid'),
                            element.id,
                            element.getAttribute('data-uid'),
                            element.getAttribute('id')
                        ].filter(Boolean);
                        
                        for (const attr of idAttributes) {
                            const normalizedAttr = this.app.core.messageDetector.normalizeContactId(attr);
                            
                            // 检查部分包含关系
                            if (normalizedAttr.includes(contactId) || contactId.includes(normalizedAttr)) {
                                this.app.utils.logger.debug(`找到部分匹配联系人元素: ${attr} => ${normalizedAttr}`);
                                targetContactElement = element;
                                break;
                            }
                        }
                        
                        if (targetContactElement) break;
                    }
                }
                
                // 第三步：如果仍未找到，尝试通过联系人名称查找
                if (!targetContactElement) {
                    this.app.utils.logger.debug(`未找到ID匹配联系人，尝试通过名称或关联信息查找...`);
                    
                    // 可以通过会话历史获取联系人名称或其他信息进行匹配
                    // 此处需要根据实际情况添加额外的联系人查找逻辑
                }

                // 调试信息：记录所有找到的联系人ID
                this.app.utils.logger.debug(`所有找到的联系人ID: ${JSON.stringify(foundContactIds)}`);

                // 如果找到了联系人元素，尝试切换
                if (targetContactElement) {
                    this.app.utils.logger.debug('找到目标联系人元素，尝试切换');

                    // 模拟点击联系人 - 使用增强点击
                    this.app.utils.logger.debug('使用增强点击方法切换联系人');
                    try {
                        // 首先尝试使用高级点击方法
                        await this.app.utils.dom.enhancedClickWithVerification(targetContactElement, {
                            verifyClick: true,
                            maxAttempts: 3,
                            clickDelayMs: 300
                        });
                    } catch (clickError) {
                        // 如果高级点击失败，尝试标准点击
                        this.app.utils.logger.warn('增强点击失败，尝试标准点击', clickError);
                        this.app.utils.dom.simulateClick(targetContactElement);
                    }

                    // 强制更新当前联系人ID
                    this.app.core.messageDetector.currentContactId = contactId;

                    // 增加等待时间以确保UI完全更新
                    this.app.utils.logger.debug('等待联系人切换完成...');
                    const waitTime = 2000; // 增加到2秒
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    
                    // 额外检查是否切换成功
                    const afterSwitchId = this.app.core.messageDetector.currentContactId;
                    this.app.utils.logger.debug(`切换后的联系人ID: ${afterSwitchId}`);
                    
                    // 保险措施：再次点击确保激活
                    if (!this.isContactIdMatch(afterSwitchId, contactId)) {
                        this.app.utils.logger.warn('联系人可能未正确切换，尝试再次点击');
                        this.app.utils.dom.simulateClick(targetContactElement);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }

                    this.app.utils.logger.debug('联系人切换流程完成');
                } else {
                    this.app.utils.logger.warn('未找到目标联系人元素，无法切换');
                }
            }

            processPhase = '联系人ID验证';
            // 重新检查当前联系人是否是目标联系人 - 增强版
            let updatedCurrentId = this.app.core.messageDetector.currentContactId;
            updatedCurrentId = this.app.core.messageDetector.normalizeContactId(updatedCurrentId);
            
            // 增强的ID匹配逻辑
            const isTargetContact = this.isContactIdMatch(updatedCurrentId, contactId);

            this.app.utils.logger.debug(`增强ID比较:
                当前ID=${updatedCurrentId}
                目标ID=${contactId}
                匹配结果=${isTargetContact}`);

            if (!isTargetContact) {
                // 最后尝试：检查界面上是否存在包含目标ID的元素
                const pageElements = document.querySelectorAll('*[data-id], *[data-key], *[id]');
                let foundMatchInPage = false;
                
                for (const element of pageElements) {
                    const elementIds = [
                        element.getAttribute('data-id'),
                        element.getAttribute('data-key'),
                        element.id
                    ].filter(Boolean);
                    
                    for (const id of elementIds) {
                        const normalizedId = this.app.core.messageDetector.normalizeContactId(id);
                        if (this.isContactIdMatch(normalizedId, contactId)) {
                            foundMatchInPage = true;
                            this.app.utils.logger.debug(`在页面元素中找到匹配的ID: ${id}`);
                            break;
                        }
                    }
                    
                    if (foundMatchInPage) break;
                }
                
                if (foundMatchInPage) {
                    this.app.utils.logger.info(`虽然当前联系人ID不匹配，但在页面上找到了相关元素，尝试继续发送回复`);
                } else {
                    this.app.utils.logger.warn(`当前联系人(${updatedCurrentId})不是目标联系人(${contactId})，无法发送回复`);
                    return false;
                }
            }

            processPhase = '获取输入框';
            // 1. 获取输入框元素
            this.app.utils.logger.debug('尝试获取输入框元素');
            const textArea = await this.app.utils.dom.waitForElement(
                this.app.utils.dom.selectors.textArea,
                5000
            ).catch(error => {
                this.handleReplyError(error, processPhase, { selector: this.app.utils.dom.selectors.textArea });
                return null;
            });

            if (!textArea) {
                this.app.utils.logger.error('未找到输入框元素');
                return false;
            }

            this.app.utils.logger.debug('成功找到输入框元素');

            processPhase = '获取发送按钮';
            // 2. 获取发送按钮
            this.app.utils.logger.debug('尝试获取发送按钮');
            const sendButton = await this.app.utils.dom.waitForElement(
                this.app.utils.dom.selectors.sendButton,
                5000
            ).catch(error => {
                this.handleReplyError(error, processPhase, { selector: this.app.utils.dom.selectors.sendButton });
                return null;
            });

            if (!sendButton) {
                this.app.utils.logger.error('未找到发送按钮');
                return false;
            }

            this.app.utils.logger.debug('成功找到发送按钮');

            processPhase = '输入内容';
            // 3. 在输入框中输入内容
            this.app.utils.logger.debug('设置输入框内容');
            try {
                this.app.utils.dom.setValue(textArea, content);
            } catch (inputError) {
                this.handleReplyError(inputError, processPhase, { contentLength: content.length });
                return false;
            }

            // 等待一小段时间确保输入完成
            await new Promise(resolve => setTimeout(resolve, 500)); // 增加到500ms

            processPhase = '检查发送按钮状态';
            // 4. 检查发送按钮是否可用
            const isDisabled = sendButton.classList.contains('disabled') ||
                             sendButton.disabled ||
                             sendButton.getAttribute('aria-disabled') === 'true';

            if (isDisabled) {
                this.app.utils.logger.warn('发送按钮不可用，尝试检查其他原因');
                
                // 记录按钮状态详情
                this.app.utils.logger.debug(`按钮状态详情: 
                    类名: ${sendButton.className}
                    disabled属性: ${sendButton.disabled}
                    aria-disabled属性: ${sendButton.getAttribute('aria-disabled')}
                `);

                // 尝试激活按钮
                const isContentEmpty = textArea.value.trim() === '';
                if (isContentEmpty) {
                    this.app.utils.logger.warn('输入框内容为空，重新设置内容');
                    this.app.utils.dom.setValue(textArea, content);
                    await new Promise(resolve => setTimeout(resolve, 300));
                }

                // 如果按钮还是不可用，尝试模拟Enter键
                if (sendButton.classList.contains('disabled') || sendButton.disabled) {
                    this.app.utils.logger.warn('发送按钮仍不可用，尝试使用Enter键发送');
                    this.app.utils.dom.simulateKeypress(textArea, 'Enter');

                    // 等待一小段时间确保发送完成
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // 检查输入框是否已清空（发送成功的标志）
                    const afterEnterValue = this.app.utils.dom.getValue(textArea);
                    if (afterEnterValue === '') {
                        this.app.utils.logger.info('通过Enter键成功发送回复');
                        return true;
                    } else {
                        this.app.utils.logger.warn('通过Enter键发送可能失败，输入框未清空');
                    }

                    return false;
                }
            }

            processPhase = '点击发送按钮';
            // 5. 点击发送按钮
            this.app.utils.logger.debug('点击发送按钮');
            try {
                this.app.utils.dom.simulateClick(sendButton);
            } catch (clickError) {
                this.handleReplyError(clickError, processPhase, { 
                    buttonClass: sendButton.className,
                    buttonDisabled: sendButton.disabled
                });
                
                // 尝试使用更高级的点击方法
                try {
                    this.app.utils.logger.debug('尝试使用增强点击方法');
                    await this.app.utils.dom.enhancedClickWithVerification(sendButton, {
                        verifyClick: true,
                        maxAttempts: 2
                    });
                } catch (advancedClickError) {
                    this.handleReplyError(advancedClickError, '增强点击发送按钮', {
                        buttonClass: sendButton.className
                    });
                    return false;
                }
            }

            // 等待一小段时间确保发送完成
            await new Promise(resolve => setTimeout(resolve, 800)); // 增加到800ms

            processPhase = '验证发送结果';
            // 检查输入框是否已清空（发送成功的标志）
            const afterSendValue = this.app.utils.dom.getValue(textArea);

            if (afterSendValue === '') {
                this.app.utils.logger.info('回复已成功发送');
                return true;
            } else {
                this.app.utils.logger.warn('回复可能未成功发送，输入框未清空', {
                    inputValueAfterSend: afterSendValue,
                    inputValueLength: afterSendValue.length
                });

                // 如果点击按钮失败，尝试再次点击
                this.app.utils.logger.debug('尝试再次点击发送按钮');
                this.app.utils.dom.simulateClick(sendButton);

                await new Promise(resolve => setTimeout(resolve, 500));

                const afterSecondClick = this.app.utils.dom.getValue(textArea);
                if (afterSecondClick === '') {
                    this.app.utils.logger.info('第二次尝试发送成功');
                    return true;
                } else {
                    this.app.utils.logger.warn('两次尝试发送均失败');
                    return false;
                }
            }
        } catch (error) {
            this.handleReplyError(error, processPhase, { 
                contactId,
                contentPreview: content.substring(0, 30) + (content.length > 30 ? '...' : '')
            });
            return false;
        }
    }

    /**
     * 清空回复队列
     */
    clearReplyQueue() {
        const count = this.replyQueue.length;

        // 拒绝所有等待中的回复
        for (const reply of this.replyQueue) {
            reply.reject(new Error('回复队列已清空'));
        }

        this.replyQueue = [];
        this.app.utils.logger.info(`已清空回复队列，共${count}条回复`);
    }

    /**
     * 增强的联系人ID匹配逻辑
     * @param {string} id1 第一个ID
     * @param {string} id2 第二个ID
     * @returns {boolean} 是否匹配
     */
    isContactIdMatch(id1, id2) {
        if (!id1 || !id2) return false;
        
        // 规范化处理
        id1 = String(id1).trim();
        id2 = String(id2).trim();
        
        // 完全匹配
        if (id1 === id2) return true;
        
        // 包含关系匹配
        if (id1.includes(id2) || id2.includes(id1)) return true;
        
        // 提取数字部分进行匹配（小红书ID通常有一定规律）
        const numbers1 = id1.replace(/[^0-9]/g, '');
        const numbers2 = id2.replace(/[^0-9]/g, '');
        
        if (numbers1 && numbers2) {
            // 数字部分完全匹配
            if (numbers1 === numbers2) return true;
            
            // 数字部分包含关系（至少8位数字）
            if (numbers1.length >= 8 && numbers2.length >= 8) {
                if (numbers1.includes(numbers2) || numbers2.includes(numbers1)) return true;
            }
        }
        
        return false;
    }

    /**
     * 处理回复操作过程中出现的错误
     * @param {Error} error 错误对象
     * @param {string} phase 处理阶段
     * @param {Object} details 附加信息
     */
    handleReplyError(error, phase, details = {}) {
        // 构建增强的错误信息
        const enhancedError = {
            originalError: error,
            message: error.message || '未知错误',
            phase: phase,
            stack: error.stack,
            details: details
        };
        
        // 确定错误级别和详细程度
        let errorLevel = 'error';
        
        // 某些特定错误可以降级为警告
        const warningPatterns = [
            '未找到元素',
            '超时',
            '联系人不匹配'
        ];
        
        if (warningPatterns.some(pattern => enhancedError.message.includes(pattern))) {
            errorLevel = 'warn';
        }
        
        // 记录错误
        this.app.utils.logger[errorLevel](`回复过程中出错 [${phase}]: ${enhancedError.message}`, enhancedError);
        
        // 根据错误阶段和类型，尝试建议修复措施
        let suggestion = '';
        if (phase === '联系人切换') {
            suggestion = '请检查联系人ID格式是否正确，并确认联系人是否存在于列表中';
        } else if (phase === '输入内容') {
            suggestion = '请检查输入框是否可交互，内容是否合规';
        } else if (phase === '点击发送') {
            suggestion = '请检查发送按钮是否可用，可能需要点击输入框激活它';
        }
        
        if (suggestion) {
            this.app.utils.logger.debug(`错误修复建议: ${suggestion}`);
        }
    }
}