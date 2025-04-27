/**
     * 小红书私信自动回复助手 - 消息处理模块
     */

    class MessageHandler {
        constructor(app) {
            this.app = app;
            this.processingMessage = false; // 是否正在处理消息
        }

        /**
         * 初始化消息处理模块
         */
        async initialize() {
            try {
                this.app.utils.logger.info('初始化消息处理模块');

                // 验证必要的工具是否存在
                if (!this.app.utils.sessionManager) {
                    throw new Error('会话管理器未初始化');
                }
                if (!this.app.core.aiService) {
                    this.app.utils.logger.warn('AI 服务未初始化，AI 相关功能将不可用');
                }
                if (!this.app.core.leadGenerationHandler) {
                    this.app.utils.logger.warn('获客工具处理器未初始化，获客工具相关功能将不可用');
                }

                return true;
            } catch (error) {
                this.app.utils.logger.error('初始化消息处理模块失败', error);
                return false;
            }
        }

        /**
         * 处理接收到的消息
         * @param {Object} message 消息对象
         */
        async handleMessage(message) {
            // 防止并发处理消息
            if (this.processingMessage) {
                this.app.utils.logger.debug('正在处理其他消息，稍后处理此消息');
                return;
            }

            try {
                this.processingMessage = true;

                // --- FIX: Add check for config initialization ---
                if (!this.app.config || !this.app.config.initialized) {
                    this.app.utils.logger.warn('Config not initialized yet, skipping message processing.');
                    this.processingMessage = false; // Release lock
                    return;
                }
                // --- END FIX ---

                // 记录消息类型
                if (message.isSystemMessage) {
                    this.app.utils.logger.info(`开始处理系统消息: ${message.content}`);
                    if (message.sourceInfo) {
                        this.app.utils.logger.info(`检测到聚光进线来源: ${message.sourceInfo}`);
                    }
                } else {
                    this.app.utils.logger.info(`开始处理消息: ${message.content}`);
                }

                // 验证必要的工具和数据
                if (!this.app.utils.sessionManager) throw new Error('会话管理器未初始化');
                if (!this.app.core.aiService) throw new Error('AI 服务未初始化');
                if (!this.app.core.leadGenerationHandler) throw new Error('获客工具处理器未初始化');
                if (!this.app.core.autoReply) throw new Error('自动回复模块未初始化');
                if (!message || !message.contactId || message.content === undefined) throw new Error('消息数据不完整');

                // [新增] 检查联系人是否有客资标签且启用了忽略功能
                const ignoreLeadTags = this.app.config.getSetting('reply.ignoreLeadTags', false);
                if (ignoreLeadTags) {
                    // 查找联系人元素
                    const contactSelector = `[data-contactusemid="${message.contactId}"]`;
                    const contactElement = document.querySelector(contactSelector);
                    
                    if (contactElement) {
                        // 检查客资标签
                        const { hasLeadTag, leadTagText } = this.app.utils.messageDetector.checkContactLeadTag(contactElement);
                        
                        if (hasLeadTag) {
                            this.app.utils.logger.info(`跳过处理带有客资标签(${leadTagText})的联系人消息: ${message.contactId}`);
                            this.processingMessage = false; // Release lock
                            return;
                        }
                    }
                }

                // 1. 检查是否在工作时间
                if (!this.isInWorkingHours()) {
                    this.app.utils.logger.info('当前不在工作时间，跳过回复');
                    this.processingMessage = false; // Release lock
                    return;
                }

                // 2. 检查是否超过每日回复限制
                if (this.isReplyLimitExceeded(message.contactId)) {
                    this.app.utils.logger.info('已超过回复限制，跳过回复');
                    this.processingMessage = false; // Release lock
                    return;
                }

                // 3. 更新会话历史
                try {
                    await this.app.utils.sessionManager.updateSessionHistory(message.contactId, {
                        role: message.isSystemMessage ? 'system' : 'user',
                        content: message.content,
                        sourceInfo: message.sourceInfo || null,
                        timestamp: Date.now()
                    });
                } catch (error) {
                    this.app.utils.logger.error('更新会话历史失败', error);
                    // 继续处理消息，但记录错误
                }

                // 4. 确定消息类型，用于匹配规则
                let messageType = 'TEXT'; // 默认为普通文本消息
                let matchContent = message.content;

                // 处理聚光进线消息
                if (message.sourceInfo) {
                    messageType = 'SPOTLIGHT';
                    matchContent = message.sourceInfo; // 使用聚光来源信息进行匹配
                    this.app.utils.logger.info(`使用聚光进线匹配，类型: ${messageType}, 内容: ${matchContent}`);
                }
                // 处理笔记卡片消息
                else if (message.type === 'CARD') {
                    messageType = 'CARD';
                    // 如果有标题，使用标题匹配，否则使用内容
                    matchContent = message.title || message.content;
                    this.app.utils.logger.info(`使用笔记卡片匹配，类型: ${messageType}, 内容: ${matchContent}`);
                }

                // 5. 处理自动回复 (Keyword Reply Logic) - 不阻止后续获客工具处理
                const matchedReplyRule = await this.matchKeywordRules(matchContent, messageType);

                if (matchedReplyRule) {
                    this.app.utils.logger.info(`Matched keyword rule for reply: ${matchedReplyRule.name}`);
                    let replyContent;
                    if (matchedReplyRule.useAI && !matchedReplyRule.response && this.app.core.aiService) {
                         this.app.utils.logger.info(`Rule "${matchedReplyRule.name}" requires AI generation.`);
                         replyContent = await this.generateAIReply(message);
                    } else if (matchedReplyRule.response) {
                         replyContent = matchedReplyRule.response;
                    } else {
                         this.app.utils.logger.warn(`Rule "${matchedReplyRule.name}" matched, but has no response template and AI generation is not enabled or AI service unavailable.`);
                         replyContent = null;
                    }

                    if (replyContent) {
                        const delay = this.getRandomDelay();
                        this.app.utils.logger.debug(`Will send keyword reply in ${delay}ms`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        const sentReply = await this.app.core.autoReply.sendReply(message.contactId, replyContent);

                        if (sentReply) {
                            this.app.utils.logger.info(`Successfully sent keyword-matched reply for rule: ${matchedReplyRule.name}`);
                            try {
                                await this.app.utils.sessionManager.updateSessionHistory(message.contactId, {
                                    role: 'assistant',
                                    content: replyContent,
                                    timestamp: Date.now()
                                });
                            } catch (error) {
                                this.app.utils.logger.error('Failed to update session history after keyword reply', error);
                            }
                            // !! IMPORTANT: No return here, continue to lead generation check !!
                        } else {
                             this.app.utils.logger.warn(`Attempted to send keyword reply for rule '${matchedReplyRule.name}', but sending failed. Continuing to lead generation check.`);
                        }
                    }
                } else {
                    this.app.utils.logger.info(`No keyword rule matched for sending a reply. Proceeding to lead generation check.`);
                }

                // 6. 处理获客工具 (Lead Generation Logic)
                let leadToolHandled = false;

                // 6.1 检查特定获客规则 (Keyword Tool Logic)
                let matchedKeywordTool = null;
                if (this.app.core.leadGenerationHandler) {
                    // Use the already determined matchContent and messageType if applicable,
                    // or let leadGenerationHandler decide based on its internal logic.
                    // Assuming leadGenerationHandler.handleMessage can take the message object directly.
                    matchedKeywordTool = await this.app.core.leadGenerationHandler.handleMessage(message);
                } else {
                    this.app.utils.logger.warn('LeadGenerationHandler not available, skipping keyword tool matching.');
                }

                if (matchedKeywordTool) {
                    this.app.utils.logger.info(`Keyword rule matched for lead tool. Attempting to send tool: ${matchedKeywordTool.title}`);
                    
                    // 添加一个锁定变量，防止同时处理多个工具发送请求
                    const startSendTime = Date.now();
                    const sendTimeout = 15000; // 15秒发送超时
                    
                    try {
                        const sendSuccess = await this.app.core.leadGenerationHandler.sendTool(matchedKeywordTool);
                        
                        // 发送成功日志与后续处理
                        if (sendSuccess) {
                            const sendDuration = Date.now() - startSendTime;
                            this.app.utils.logger.info(`Successfully sent keyword-matched tool '${matchedKeywordTool.title}' in ${sendDuration}ms.`);
                            leadToolHandled = true; // 标记为已处理工具
                            
                            try {
                                if (typeof this.app.utils.sessionManager.recordLeadSentTime === 'function') {
                                    await this.app.utils.sessionManager.recordLeadSentTime(message.contactId);
                                } else {
                                    this.app.utils.logger.warn('sessionManager.recordLeadSentTime method not found. Skipping recording.');
                                }
                            } catch (error) {
                                this.app.utils.logger.error('Failed to record lead sent time after keyword tool', error);
                            }
                            
                            // 成功发送工具后立即返回，避免继续处理后续 AI 决策等步骤
                            this.processingMessage = false; // 释放锁
                            return; // 中断处理，防止后续的AI决策再次发送工具
                        } else {
                            // 添加失败日志
                            this.app.utils.logger.warn(`Failed to send keyword-matched tool '${matchedKeywordTool.title}' or confirmation timed out. Proceeding to AI check.`);
                        }
                    } catch (sendError) {
                        // 处理发送过程中的异常
                        this.app.utils.logger.error(`Error sending keyword-matched tool '${matchedKeywordTool.title}':`, sendError);
                    }
                } else {
                    this.app.utils.logger.info('No keyword rule matched for sending a lead tool. Proceeding to AI check.');
                }

                // 6.2 检查 AI 判断 (Default Tool Logic) - Only if no keyword tool was handled
                if (!leadToolHandled) {
                    const aiLeadGenConfig = this.app.config.getSetting('aiLeadGeneration');
                    if (aiLeadGenConfig && aiLeadGenConfig.enabled) {
                        this.app.utils.logger.info('AI Lead Generation enabled, attempting decision...');
                        try {
                            // Collect context
                            const conversationHistory = await this.app.utils.sessionManager.getSessionHistory(message.contactId);
                            const availableTools = [];
                            const toolTypes = ['LEAD_CARD', 'BUSINESS_CARD', 'LANDING_PAGE'];
                            if (this.app.core.leadGenerationHandler && this.app.core.leadGenerationHandler.tools) {
                                toolTypes.forEach(type => {
                                    if (this.app.core.leadGenerationHandler.tools[type] && Array.isArray(this.app.core.leadGenerationHandler.tools[type])) {
                                        this.app.core.leadGenerationHandler.tools[type].forEach((tool, index) => {
                                            if (tool && tool.title && tool.description) {
                                                availableTools.push({ type: type, index: index, title: tool.title, description: tool.description });
                                            }
                                        });
                                    }
                                });
                            }

                            const context = {
                                contactId: message.contactId,
                                currentMessage: message,
                                conversationHistory: conversationHistory || [],
                                userProfile: {}, // Placeholder
                                availableTools: availableTools
                            };

                            // Call AI Service
                            const aiDecision = await this.app.core.aiService.getIntent(context);
                            this.app.utils.logger.debug('AI Decision:', aiDecision);

                            // Frequency Check
                            let lastSentTime = null;
                            if (typeof this.app.utils.sessionManager.getLastLeadSentTime === 'function') {
                                 lastSentTime = await this.app.utils.sessionManager.getLastLeadSentTime(message.contactId);
                            } else {
                                 this.app.utils.logger.warn('sessionManager.getLastLeadSentTime method not found. Skipping frequency check.');
                            }
                            const timeSinceLastSent = Date.now() - (lastSentTime || 0);
                            const frequencyOk = !lastSentTime || timeSinceLastSent > (aiLeadGenConfig.maxFrequencyMinutes * 60 * 1000);

                            // Process Decision
                            // 添加默认的confidence score
                            const confidenceScore = aiDecision && aiDecision.confidenceScore ? aiDecision.confidenceScore : 1;
                            
                            if (aiDecision && aiDecision.shouldSend && confidenceScore >= aiLeadGenConfig.confidenceThreshold && frequencyOk) {
                                this.app.utils.logger.info(`AI decided to send a lead tool (Confidence: ${confidenceScore}, Reason: ${aiDecision.reason}). Checking for default tool.`);

                                const leadGenSettings = this.app.config.getSetting('leadGeneration');
                                const defaultToolSetting = leadGenSettings ? leadGenSettings.defaultTool : null;

                                if (defaultToolSetting && defaultToolSetting.type && defaultToolSetting.index !== undefined && defaultToolSetting.index !== null) {
                                    const defaultTool = this.findLeadTool(defaultToolSetting.type, defaultToolSetting.index);

                                    if (defaultTool) {
                                        // Optional: Send AI generated text
                                        if (aiLeadGenConfig.allowGenerateText && aiDecision.generatedText) {
                                            this.app.utils.logger.info(`AI generated text: "${aiDecision.generatedText}"`);
                                            await this.app.core.autoReply.sendReply(message.contactId, aiDecision.generatedText);
                                            await new Promise(resolve => setTimeout(resolve, 500));
                                        }

                                        this.app.utils.logger.info(`Sending user-configured default lead tool: '${defaultTool.title}' (Type: ${defaultToolSetting.type}, Index: ${defaultToolSetting.index}) based on AI decision.`);
                                        const sendSuccess = await this.app.core.leadGenerationHandler.sendTool(defaultTool); // Use await and rename var

                                        if (sendSuccess) { // Check the result
                                            this.app.utils.logger.info(`Successfully sent default lead tool '${defaultTool.title}'.`); // Log success only on true
                                            leadToolHandled = true; // Mark as handled
                                            try {
                                                if (typeof this.app.utils.sessionManager.recordLeadSentTime === 'function') {
                                                    await this.app.utils.sessionManager.recordLeadSentTime(message.contactId);
                                                } else {
                                                     this.app.utils.logger.warn('sessionManager.recordLeadSentTime method not found. Skipping recording.');
                                                }
                                            } catch (error) {
                                                this.app.utils.logger.error('Failed to record lead sent time after AI tool', error);
                                            }
                                            // No return needed here, end of conditional logic for this path
                                        } else {
                                            // Add failure log
                                            this.app.utils.logger.warn(`Failed to send default tool '${defaultTool.title}' or confirmation timed out.`);
                                        }
                                    } else {
                                        this.app.utils.logger.warn(`User-configured default tool (Type: ${defaultToolSetting.type}, Index: ${defaultToolSetting.index}) not found. Cannot send.`);
                                    }
                                } else {
                                    this.app.utils.logger.warn('AI decided to send a tool, but no default tool is configured or configuration is invalid in settings.');
                                }
                            } else if (aiDecision && aiDecision.shouldSend && !frequencyOk) {
                                this.app.utils.logger.info(`AI decided to send tool, but skipped due to frequency limit for contact: ${message.contactId}`);
                            } else if (aiDecision && !aiDecision.shouldSend) {
                                this.app.utils.logger.info(`AI decision: Not sending lead tool. Reason: ${aiDecision.reason}`);
                            } else if (aiDecision) {
                                 this.app.utils.logger.info(`AI confidence score (${confidenceScore}) below threshold (${aiLeadGenConfig.confidenceThreshold}). Not sending default tool.`);
                            } else {
                                 this.app.utils.logger.warn('AI decision returned invalid or null.');
                            }

                        } catch (aiError) {
                            this.app.utils.logger.error('AI lead decision call failed:', aiError);
                        }
                    } else {
                         this.app.utils.logger.debug('AI Lead Generation is disabled or config missing.');
                    }
                } // End of if (!leadToolHandled)

            } catch (error) {
                this.app.utils.logger.error('处理消息失败', error);
            } finally {
                this.processingMessage = false;
            }
        }

        /**
         * 检查是否在工作时间
         * @returns {boolean} 是否在工作时间
         */
        isInWorkingHours() {
            const workingHours = this.app.config.getSetting('reply.workingHours', {
                enabled: false,
                startTime: '09:00',
                endTime: '21:00'
            });

            // 如果未启用工作时间限制，则始终返回true
            if (!workingHours.enabled) {
                return true;
            }

            try {
                const now = new Date();
                const currentHour = now.getHours();
                const currentMinute = now.getMinutes();
                const currentTime = currentHour * 60 + currentMinute;

                // 解析工作时间
                const [startHour, startMinute] = workingHours.startTime.split(':').map(Number);
                const [endHour, endMinute] = workingHours.endTime.split(':').map(Number);

                const startTime = startHour * 60 + startMinute;
                const endTime = endHour * 60 + endMinute;

                // 检查当前时间是否在工作时间范围内
                return currentTime >= startTime && currentTime <= endTime;
            } catch (error) {
                this.app.utils.logger.error('检查工作时间失败', error);
                return true; // 出错时默认返回true
            }
        }

        /**
         * 检查是否超过回复限制
         * @param {string} contactId 联系人ID
         * @returns {boolean} 是否超过限制
         */
        isReplyLimitExceeded(contactId) {
            try {
                // 检查每日总回复次数限制
                const maxRepliesPerDay = this.app.config.getSetting('reply.maxRepliesPerDay', 100);
                if (this.app.utils.storage.isDailyReplyLimitExceeded(maxRepliesPerDay)) {
                    this.app.utils.logger.warn(`已达到每日最大回复次数: ${maxRepliesPerDay}`);
                    return true;
                }

                // 检查每用户每日回复次数限制
                const maxRepliesPerUser = this.app.config.getSetting('reply.maxRepliesPerUser', 10);
                if (this.app.utils.storage.isUserReplyLimitExceeded(contactId, maxRepliesPerUser)) {
                    this.app.utils.logger.warn(`已达到该用户每日最大回复次数: ${maxRepliesPerUser}`);
                    return true;
                }

                return false;
            } catch (error) {
                this.app.utils.logger.error('检查回复限制失败', error);
                return false; // 出错时默认不限制
            }
        }

        /**
         * 匹配关键词规则
         * @param {string} content 消息内容
         * @param {string} messageType 消息类型（TEXT, CARD, SPOTLIGHT）
         * @returns {Object|null} 匹配的规则对象
         */
        async matchKeywordRules(content, messageType = 'TEXT') {
            try {
                if (!content) {
                    return null;
                }

                // 获取关键词规则
                const keywordRules = this.app.config.getSetting('keywordRules', []);
                if (!keywordRules || keywordRules.length === 0) {
                    return null;
                }

                // 根据优先级排序
                const sortedRules = [...keywordRules].sort((a, b) => b.priority - a.priority);

                // 遍历规则找到匹配的
                for (const rule of sortedRules) {
                    // 跳过禁用的规则
                    if (!rule.enabled) {
                        continue;
                    }

                    // 检查规则是否适用于当前消息类型
                    if (rule.messageTypes && Array.isArray(rule.messageTypes)) {
                        if (!rule.messageTypes.includes(messageType)) {
                            this.app.utils.logger.debug(`规则"${rule.name}"不适用于消息类型"${messageType}"，跳过匹配`);
                            continue; // 跳过不适用于当前消息类型的规则
                        }
                    }

                    // 尝试匹配规则
                    const isMatch = await this.matchRule(content, rule);
                    if (isMatch) {
                        this.app.utils.logger.info(`消息内容匹配规则"${rule.name}"`);
                        return rule;
                    }
                }

                return null;
            } catch (error) {
                this.app.utils.logger.error('匹配关键词规则失败', error);
                return null;
            }
        }

        /**
         * 匹配单个规则
         * @param {string} content 消息内容
         * @param {Object} rule 规则对象
         * @returns {boolean} 是否匹配
         */
        async matchRule(content, rule) {
            try {
                if (!content || !rule.keywords || rule.keywords.length === 0) {
                    return false;
                }

                // 转小写进行不区分大小写的匹配
                const lowerContent = content.toLowerCase();
                
                // 根据匹配类型选择匹配方法
                const matchType = rule.matchType || (rule.isRegex ? 'regex' : 'contains');
                
                // 匹配函数映射
                const matchFunctions = {
                    contains: (keyword) => lowerContent.includes(keyword.toLowerCase()),
                    exact: (keyword) => lowerContent === keyword.toLowerCase(),
                    startsWith: (keyword) => lowerContent.startsWith(keyword.toLowerCase()),
                    endsWith: (keyword) => lowerContent.endsWith(keyword.toLowerCase()),
                    regex: (pattern) => {
                        try {
                            const regex = new RegExp(pattern, 'i');
                            return regex.test(content);
                        } catch (regexError) {
                            this.app.utils.logger.error(`正则表达式 ${pattern} 格式错误`, regexError);
                            return false;
                        }
                    }
                };
                
                // 获取匹配函数
                const matchFunc = matchFunctions[matchType] || matchFunctions.contains;
                
                // 根据匹配逻辑进行匹配
                const matchLogic = rule.matchLogic || 'OR';
                
                if (matchLogic === 'AND') {
                    // 所有关键词都必须匹配
                    for (const keyword of rule.keywords) {
                        if (!matchFunc(keyword)) {
                            return false; // 只要有一个不匹配就返回false
                        }
                    }
                    return true; // 所有关键词都匹配
                } else {
                    // 任一关键词匹配即可
                    for (const keyword of rule.keywords) {
                        if (matchFunc(keyword)) {
                            return true; // 只要有一个匹配就返回true
                        }
                    }
                    return false; // 没有一个关键词匹配
                }
            } catch (error) {
                this.app.utils.logger.error('匹配规则失败', error);
                return false;
            }
        }

        /**
         * 生成AI回复 (用于关键词规则)
         * @param {Object} message 消息对象
         * @returns {string} 生成的回复内容
         */
        async generateAIReply(message) {
            try {
                // 验证会话管理器
                if (!this.app.utils.sessionManager) {
                    throw new Error('会话管理器未初始化');
                }
                 if (!this.app.core.aiService) {
                    throw new Error('AI 服务未初始化');
                }

                // 获取会话历史记录
                const history = await this.app.utils.sessionManager.getSessionHistory(message.contactId);

                // 使用AI服务生成回复
                // Assuming aiService has a method specifically for keyword-triggered replies
                // If not, adjust this call or use a generic method
                return await this.app.core.aiService.generateReply(message.content, history);
            } catch (error) {
                this.app.utils.logger.error('生成AI回复失败', error);
                // Return empty string or a default message instead of throwing?
                return ""; // Or handle error appropriately
            }
        }

        /**
         * 获取随机延迟时间
         * @returns {number} 延迟时间（毫秒）
         */
        getRandomDelay() {
            const delayRange = this.app.config.getSetting('reply.autoReplyDelay', [1000, 3000]);
            const [min, max] = delayRange;
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        /**
         * 根据类型和索引查找获客工具
         * @param {string} toolType 工具类型 (e.g., 'LEAD_CARD')
         * @param {number} toolIndex 工具在对应类型数组中的索引
         * @returns {Object|null} 找到的工具对象或 null
         */
        findLeadTool(toolType, toolIndex) {
            try {
                if (!this.app.core.leadGenerationHandler || !this.app.core.leadGenerationHandler.tools) {
                    this.app.utils.logger.warn('Lead generation handler or tools not available for finding tool.');
                    return null;
                }
                const toolsOfType = this.app.core.leadGenerationHandler.tools[toolType];
                if (Array.isArray(toolsOfType) && toolIndex >= 0 && toolIndex < toolsOfType.length) {
                    return toolsOfType[toolIndex];
                }
                this.app.utils.logger.warn(`Tool not found for type '${toolType}' and index ${toolIndex}.`);
                return null;
            } catch (error) {
                this.app.utils.logger.error(`Error finding lead tool (Type: ${toolType}, Index: ${toolIndex}):`, error);
                return null;
            }
        }
    }