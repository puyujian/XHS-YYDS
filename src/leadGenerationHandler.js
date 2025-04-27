/**
 * 小红书私信自动回复助手 - 获客工具处理模块
 */

class LeadGenerationHandler {
    constructor(app) {
        this.app = app;
        this.toolTypes = {
            LEAD_CARD: '留资卡',
            BUSINESS_CARD: '名片',
            LANDING_PAGE: '落地页'
        };
        // 存储获取到的所有获客工具
        this.tools = {
            [this.toolTypes.LEAD_CARD]: [],
            [this.toolTypes.BUSINESS_CARD]: [],
            [this.toolTypes.LANDING_PAGE]: []
        };
        // 存储工具名称映射（工具类型 -> [工具名称列表]）
        this.toolNames = {
            [this.toolTypes.LEAD_CARD]: [],
            [this.toolTypes.BUSINESS_CARD]: [],
            [this.toolTypes.LANDING_PAGE]: []
        };
        this.currentToolType = null;
        this.isToolPanelOpen = false;
        // 选择器常量
        this.selectors = {
            // 获客工具入口
            toolEntryButton: 'svg.servicePage-icon[data-v-5afe0aea]', // Updated selector based on user feedback
            // 工具类型选择
            toolTypeSegment: '.d-segment',
            toolTypeItems: '.d-segment-item',
            // 留资卡选择器
            leadCardContainer: '.card-wrap',
            leadCards: '.card-wrap .card',
            leadCardTitle: '.card-box__content-title .d-text',
            leadCardDesc: '.card-box__content-desc',
            leadCardButton: '.d-button .d-button-content',
            // 名片选择器 (支持最新的DOM结构)
            businessCardContainer: '.business-card, .card-wrap',
            businessCards: '.business-card .card, .card-wrap .card[data-v-abb814da], div[data-v-7dfe39e8] .card',
            businessCardTitle: '.card-box__content-title .d-text, .card-box__content-title span.d-text',
            businessCardDesc: '.card-box__content-desc',
            businessCardButton: '.buttomContent, div[data-v-7dfe39e8] .buttomContent, .d-button .buttomContent, span[data-v-7dfe39e8].d-icon + span.d-text, button.d-button span.d-text, button.d-button-default span.d-text',
            // 发送按钮通用选择器 - 更新为最新DOM结构
            sendButton: 'button.d-button.d-button-default[data-v-7dfe39e8], button.d-button-with-content, button.d-button.d-button-default.d-button-with-content' // Updated general send button selector
        };

        // 额外存储备选选择器，用于当主选择器无法找到元素时
        this.fallbackSelectors = {
            businessCards: [
                '.business-card .card',          // 旧版名片
                '.card-wrap .card[data-v-abb814da]',  // 旧版名片/落地页
                '.card-wrap .card',              // 通用结构
                'div[data-v-7dfe39e8] .card'     // 最新版名片结构
            ]
        };

        // 存储设置项
        this.settings = {
            enabled: true,
            autoDetect: true,
            preferredToolType: null,
            keywordRules: []
        };

        // 添加防止重复发送的缓存
        this.recentlySentTools = new Map(); // 存储最近发送的工具信息
        this.duplicateSendPreventionTime = 10000; // 防重发的时间窗口(毫秒)，从2秒增加到10秒
        
        // 添加发送锁，防止并发发送
        this.isSendingTool = false;
        this.sendingToolTimeout = 15000; // 发送超时时间，15秒
    }

    /**
     * 初始化获客工具处理模块
     */
    async initialize() {
        try {
            this.app.utils.logger.info('初始化获客工具处理模块');

            // 从存储加载设置
            await this.loadSettings();

            // 注册设置面板
            this.registerSettings();

            return true;
        } catch (error) {
            this.app.utils.logger.error('初始化获客工具处理模块失败', error);
            return false;
        }
    }

    /**
     * 加载设置
     */
    async loadSettings() {
        try {
            const settings = this.app.config.getSetting('leadGeneration', null);
            if (settings) {
                this.settings = { 
                    ...this.settings, 
                    ...settings 
                };
                
                // 确保 keywordRules 被正确加载
                if (!this.settings.keywordRules) {
                    this.settings.keywordRules = [];
                }
                
                this.app.utils.logger.debug('成功加载获客工具设置', this.settings);
            } else {
                // 保存默认设置
                await this.saveSettings();
                this.app.utils.logger.debug('使用默认获客工具设置', this.settings);
            }
        } catch (error) {
            this.app.utils.logger.error('加载获客工具设置失败', error);
        }
    }

    /**
     * 保存设置
     */
    async saveSettings() {
        try {
            // 获取当前完整的 leadGeneration 设置
            const currentSettings = this.app.config.getSetting('leadGeneration', {});
            
            // 合并当前设置，确保不会覆盖 keywordRules
            const mergedSettings = {
                ...currentSettings,
                ...this.settings,
                // 确保保留 keywordRules，如果当前设置和已保存设置都有，则优先使用当前设置
                keywordRules: this.settings.keywordRules || currentSettings.keywordRules
            };
            
            await this.app.config.setSetting('leadGeneration', mergedSettings);
            this.app.utils.logger.debug('保存获客工具设置成功');
        } catch (error) {
            this.app.utils.logger.error('保存获客工具设置失败', error);
        }
    }


    /**
     * 注册设置面板
     */
    registerSettings() {
        try {
            // 在SettingsPanel中已经通过createLeadGenerationSection方法添加设置，
            // 所以这里不再需要重复添加设置区域
            this.app.utils.logger.debug('获客工具设置已注册，将通过SettingsPanel集成');
        } catch (error) {
            this.app.utils.logger.error('注册获客工具设置面板失败', error);
        }
    }

    /**
     * 打开获客工具面板
     */
    async openToolPanel() {
        if (this.isToolPanelOpen) {
            this.app.utils.logger.debug('获客工具面板已经打开');
            return true;
        }

        try {
            this.app.utils.logger.debug('尝试打开获客工具面板');

            // 查找并点击获客工具入口按钮
            const entryButton = await this.app.utils.dom.waitForElement(this.selectors.toolEntryButton, 5000);
            if (!entryButton) {
                this.app.utils.logger.warn('未找到获客工具入口按钮');
                return false;
            }

            // 模拟点击
            this.app.utils.dom.simulateClick(entryButton);

            // 等待工具类型选择器出现
            const typeSegment = await this.app.utils.dom.waitForElement(this.selectors.toolTypeSegment, 5000);
            if (!typeSegment) {
                this.app.utils.logger.warn('未找到工具类型选择器，获客工具面板可能未正确打开');
                return false;
            }

            this.isToolPanelOpen = true;
            this.app.utils.logger.info('获客工具面板已打开');
            return true;
        } catch (error) {
            this.app.utils.logger.error('打开获客工具面板失败', error);
            return false;
        }
    }

    /**
     * 切换工具类型
     * @param {string} toolType 工具类型
     */
    async switchToolType(toolType) {
        if (!this.isToolPanelOpen) {
            const opened = await this.openToolPanel();
            if (!opened) {
                return false;
            }
        }

        try {
            this.app.utils.logger.debug(`尝试切换到工具类型: ${toolType}`);

            // 获取所有工具类型项
            const typeItems = this.app.utils.dom.getElements(this.selectors.toolTypeItems);
            if (!typeItems || typeItems.length === 0) {
                this.app.utils.logger.warn('未找到工具类型项');
                return false;
            }

            // 查找匹配的类型项
            let targetItem = null;
            for (const item of typeItems) {
                if (item.textContent.includes(toolType)) {
                    targetItem = item;
                    break;
                }
            }

            if (!targetItem) {
                this.app.utils.logger.warn(`未找到类型为 ${toolType} 的选项`);
                return false;
            }

            // 如果已经选中，则不需要点击
            if (targetItem.classList.contains('active')) {
                this.currentToolType = toolType;
                this.app.utils.logger.debug(`工具类型 ${toolType} 已经是激活状态`);
                return true;
            }

            // 点击切换
            this.app.utils.dom.simulateClick(targetItem);

            // 等待切换完成
            await new Promise(resolve => setTimeout(resolve, 500));

            this.currentToolType = toolType;
            this.app.utils.logger.info(`已切换到工具类型: ${toolType}`);
            return true;
        } catch (error) {
            this.app.utils.logger.error(`切换工具类型到 ${toolType} 失败`, error);
            return false;
        }
    }

    /**
     * 扫描所有获客工具
     */
    async scanAllTools() {
        try {
            this.app.utils.logger.info('开始扫描所有获客工具');

            // 重置工具缓存
            this.tools = {
                [this.toolTypes.LEAD_CARD]: [],
                [this.toolTypes.BUSINESS_CARD]: [],
                [this.toolTypes.LANDING_PAGE]: []
            };

            // 打开面板
            const panelOpened = await this.openToolPanel();
            if (!panelOpened) {
                return false;
            }

            // 依次扫描三种类型的工具
            for (const toolType of Object.values(this.toolTypes)) {
                await this.switchToolType(toolType);
                await this.scanCurrentTools();
            }

            this.app.utils.logger.info('所有获客工具扫描完成', {
                leadCards: this.tools[this.toolTypes.LEAD_CARD].length,
                businessCards: this.tools[this.toolTypes.BUSINESS_CARD].length,
                landingPages: this.tools[this.toolTypes.LANDING_PAGE].length
            });

            return true;
        } catch (error) {
            this.app.utils.logger.error('扫描所有获客工具失败', error);
            return false;
        }
    }

        /**
     * 扫描当前类型的工具
     */
        async scanCurrentTools() {
            if (!this.currentToolType) {
                this.app.utils.logger.warn('当前没有选择工具类型');
                return false;
            }

            try {
                this.app.utils.logger.debug(`扫描当前工具类型: ${this.currentToolType}`);

                // 先清空当前类型的工具列表
                this.tools[this.currentToolType] = [];
                // 清空当前类型的工具名称列表
                this.toolNames[this.currentToolType] = [];

                // 根据工具类型选择不同的选择器
                let toolElementsSelector;
                let extractMethod;

                switch (this.currentToolType) {
                    case this.toolTypes.LEAD_CARD:
                        toolElementsSelector = this.selectors.leadCards;
                        extractMethod = this.extractLeadCardInfo.bind(this);
                        break;
                    case this.toolTypes.BUSINESS_CARD:
                        toolElementsSelector = this.selectors.businessCards;
                        extractMethod = this.extractBusinessCardInfo.bind(this);
                        break;
                    case this.toolTypes.LANDING_PAGE:
                        // 落地页和名片使用相同的选择器和提取方法
                        toolElementsSelector = this.selectors.businessCards;
                        extractMethod = this.extractBusinessCardInfo.bind(this);
                        break;
                    default:
                        this.app.utils.logger.warn(`未知工具类型: ${this.currentToolType}`);
                        return false;
                }

                // 获取所有工具元素
                let toolElements = this.app.utils.dom.getElements(toolElementsSelector);

                // 如果使用主选择器没有找到元素，尝试使用备选选择器
                if (!toolElements || toolElements.length === 0) {
                    this.app.utils.logger.debug(`使用主选择器未找到工具元素，尝试使用备选选择器`);

                    if (this.fallbackSelectors[toolElementsSelector]) {
                        for (const fallbackSelector of this.fallbackSelectors[toolElementsSelector]) {
                            toolElements = this.app.utils.dom.getElements(fallbackSelector);
                            if (toolElements && toolElements.length > 0) {
                                this.app.utils.logger.debug(`使用备选选择器 ${fallbackSelector} 找到 ${toolElements.length} 个工具元素`);
                                break;
                            }
                        }
                    }
                }

                if (!toolElements || toolElements.length === 0) {
                    this.app.utils.logger.warn(`未找到 ${this.currentToolType} 类型的工具元素`);
                    return false;
                }

                this.app.utils.logger.debug(`找到 ${toolElements.length} 个 ${this.currentToolType} 工具元素`);

                // 提取每个工具的信息
                toolElements.forEach((element, index) => {
                    const toolInfo = extractMethod(element, index);
                    if (toolInfo) {
                        this.tools[this.currentToolType].push(toolInfo);

                        // 添加工具名称到名称列表
                        this.toolNames[this.currentToolType].push({
                            index: index,
                            name: toolInfo.title || `${this.currentToolType} ${index + 1}`
                        });
                    }
                });

                this.app.utils.logger.info(`成功扫描 ${this.tools[this.currentToolType].length} 个 ${this.currentToolType}`);
                return true;
            } catch (error) {
                this.app.utils.logger.error(`扫描 ${this.currentToolType} 失败`, error);
                return false;
            }
        }

    /**
     * 提取留资卡信息
     * @param {Element} cardElement 留资卡元素
     * @param {number} index 索引
     * @returns {Object} 留资卡信息
     */
    extractLeadCardInfo(cardElement, index) {
        try {
            const titleElement = cardElement.querySelector(this.selectors.leadCardTitle);
            const descElement = cardElement.querySelector(this.selectors.leadCardDesc);

            // 提取标题文本，处理可能的嵌套结构
            let title = '';
            if (titleElement) {
                title = titleElement.textContent.trim();
                // 考虑到某些标题可能有嵌套的格式，确保获取所有文本
                if (!title && titleElement.querySelector('.d-text-nowrap')) {
                    title = titleElement.querySelector('.d-text-nowrap').textContent.trim();
                }
            }
            if (!title) {
                title = `留资卡${index + 1}`;
            }

            // 提取描述
            const desc = descElement ? descElement.textContent.trim() : '';

            this.app.utils.logger.debug(`提取留资卡信息: 标题=${title}, 描述=${desc}`);

            return {
                id: `lead_card_${index}`,
                type: this.toolTypes.LEAD_CARD,
                title,
                description: desc,
                element: cardElement,
                index
            };
        } catch (error) {
            this.app.utils.logger.error('提取留资卡信息失败', error);
            return null;
        }
    }

    /**
     * 提取名片或落地页信息
     * @param {Element} cardElement 名片或落地页元素
     * @param {number} index 索引
     * @returns {Object} 名片或落地页信息
     */
    extractBusinessCardInfo(cardElement, index) {
        try {
            // 尝试多种可能的选择器路径来获取标题和描述
            let titleElement = cardElement.querySelector(this.selectors.businessCardTitle);
            let descElement = cardElement.querySelector(this.selectors.businessCardDesc);

            // 如果没找到标题，尝试更多可能的标题选择器
            if (!titleElement) {
                const possibleTitleSelectors = [
                    '.card-box__content-title .d-text',
                    '.card-box__content-title span.d-text',
                    '.card-box__content-title span',
                    '.card-box__title',
                    '.card-box__content-title',
                    'span.d-text.--color-text-title',
                    'span.d-text.d-text-block.--color-static.--color-text-title'
                ];

                for (const selector of possibleTitleSelectors) {
                    titleElement = cardElement.querySelector(selector);
                    if (titleElement) {
                        this.app.utils.logger.debug(`使用备选标题选择器 ${selector} 找到标题`);
                        break;
                    }
                }
            }

            // 如果没找到描述，尝试更多可能的描述选择器
            if (!descElement) {
                const possibleDescSelectors = [
                    '.card-box__content-desc',
                    '.d-text.--color-text-description',
                    '.card-box__desc',
                    '[title]'  // 带有title属性的元素
                ];

                for (const selector of possibleDescSelectors) {
                    descElement = cardElement.querySelector(selector);
                    if (descElement) {
                        this.app.utils.logger.debug(`使用备选描述选择器 ${selector} 找到描述`);
                        break;
                    }
                }
            }

            // 提取标题文本，处理可能的嵌套结构
            let title = '';
            if (titleElement) {
                title = titleElement.textContent.trim();
                // 考虑到某些标题可能有嵌套的格式，确保获取所有文本
                if (!title && titleElement.querySelector('.d-text-nowrap')) {
                    title = titleElement.querySelector('.d-text-nowrap').textContent.trim();
                }

                // 如果有title属性，也可以使用它
                if (!title && titleElement.getAttribute('title')) {
                    title = titleElement.getAttribute('title').trim();
                }
            }

            // 如果仍然没有标题，使用默认值
            if (!title) {
                title = `${this.currentToolType}${index + 1}`;
            }



            // 提取描述
            let desc = '';
            if (descElement) {
                desc = descElement.textContent.trim();
                // 如果有title属性，也可以使用它
                if (!desc && descElement.getAttribute('title')) {
                    desc = descElement.getAttribute('title').trim();
                }
            }

            // 尝试判断是名片还是落地页 (目前仍使用当前工具类型)
            let type = this.currentToolType;

            // 记录提取信息
            this.app.utils.logger.debug(`提取${type}信息: 标题=${title}, 描述=${desc}`);

            return {
                id: `${type === this.toolTypes.BUSINESS_CARD ? 'business_card' : 'landing_page'}_${index}`,
                type,
                title,
                description: desc,
                element: cardElement,
                index
            };
        } catch (error) {
            this.app.utils.logger.error(`提取${this.currentToolType}信息失败`, error);
            return null;
        }
    }

       /**
     * 发送特定工具
     * @param {Object} tool 工具对象
     * @returns {Promise<boolean>} 是否发送成功
     */
       async sendTool(tool) {
        // 检查工具对象是否有效
        if (!tool) {
            this.app.utils.logger.warn('未提供有效的工具对象');
            this.logSendStatus('初始检查', '无效工具对象');
            return false;
        }
        
        // 检查是否正在发送工具
        if (this.isSendingTool) {
            this.app.utils.logger.warn(`工具 "${tool.title}" 请求被拒绝：当前已有正在发送的工具`);
            this.logSendStatus('锁定检查', '当前已有正在发送的工具，跳过本次发送', null, {
                toolTitle: tool.title,
                toolType: tool.type
            });
            return false;
        }
        
        // 检查是否刚刚发送过相同的工具
        if (this.isToolRecentlySent(tool)) {
            this.app.utils.logger.warn(`工具 "${tool.title}" 在短时间内已经发送过，跳过本次发送`);
            this.logSendStatus('重复检查', '工具刚刚发送过，跳过本次发送', null, {
                toolTitle: tool.title,
                toolType: tool.type
            });
            return false;
        }
        
        // 设置锁定状态
        this.isSendingTool = true;
        
        // 设置超时取消锁定
        const lockTimeout = setTimeout(() => {
            this.app.utils.logger.warn(`工具 "${tool.title}" 发送超时，自动解除锁定`);
            this.isSendingTool = false;
        }, this.sendingToolTimeout);
        
        // 记录开始发送的日志
        this.app.utils.logger.info(`开始发送工具: ${tool.title}`);
        this.logSendStatus('开始发送', '正在发送工具', null, {
            toolTitle: tool.title,
            toolType: tool.type,
            toolIndex: tool.index
        });
        
        try {
            // 调用备选发送逻辑
            const result = await this.sendToolFallback(tool);
            
            // 只有发送成功才标记工具为已发送
            if (result) {
                this.markToolAsSent(tool);
            }
            
            return result;
        } catch (error) {
            this.app.utils.logger.error(`发送工具 ${tool.title} 失败`, error);
            this.logSendStatus('发送异常', '发送过程异常', error, {
                toolTitle: tool.title,
                toolType: tool.type,
                errorType: error.name,
                errorLocation: error.stack ? error.stack.split('\n')[1] : '未知'
            });
            return false; // 确保在异常情况下返回false
        } finally {
            // 清除超时定时器
            clearTimeout(lockTimeout);
            // 无论成功与否，最终都解除锁定状态
            this.isSendingTool = false;
            this.app.utils.logger.debug(`工具 "${tool?.title || '未知'}" 发送完成，已解除锁定`);
        }
    }

    /**
     * 检查工具是否在短时间内已经发送
     * @param {Object} tool 工具对象
     * @returns {boolean} 是否最近已发送
     */
    isToolRecentlySent(tool) {
        if (!tool || !tool.title) return false;
        
        const now = Date.now();
        // 创建更严格的工具键，包含类型和索引
        const strictToolKey = tool.title;
        const toolType = tool.type || 'unknown';
        const toolIndex = tool.index !== undefined ? tool.index : -1;
        
        // 1. 严格匹配：同样的标题+类型+索引
        const strictKey = `${strictToolKey}|${toolType}|${toolIndex}`;
        // 2. 类型匹配：同样的标题+类型
        const typeKey = `${strictToolKey}|${toolType}`;
        // 3. 宽松匹配：只看标题
        const looseKey = strictToolKey;
        
        // 检查所有可能的匹配
        const keysToCheck = [strictKey, typeKey, looseKey];
        
        for (const key of keysToCheck) {
            if (this.recentlySentTools.has(key)) {
                const lastSentTime = this.recentlySentTools.get(key);
                const timeElapsed = now - lastSentTime;
                
                if (timeElapsed < this.duplicateSendPreventionTime) {
                    const matchType = key === strictKey ? '严格匹配' : (key === typeKey ? '类型匹配' : '宽松匹配');
                    this.app.utils.logger.warn(`工具 "${tool.title}" 在 ${timeElapsed}ms 前刚刚发送过(${matchType})，跳过本次发送`);
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * 标记工具为已发送
     * @param {Object} tool 工具对象
     */
    markToolAsSent(tool) {
        if (!tool || !tool.title) return;
        
        const now = Date.now();
        const toolTitle = tool.title;
        const toolType = tool.type || 'unknown';
        const toolIndex = tool.index !== undefined ? tool.index : -1;
        
        // 使用三种不同粒度的键都进行记录
        const strictKey = `${toolTitle}|${toolType}|${toolIndex}`;
        const typeKey = `${toolTitle}|${toolType}`;
        const looseKey = toolTitle;
        
        // 记录所有级别的键
        this.recentlySentTools.set(strictKey, now);
        this.recentlySentTools.set(typeKey, now);
        this.recentlySentTools.set(looseKey, now);
        
        this.app.utils.logger.debug(`工具 "${toolTitle}" 已标记为已发送，防重发时间: ${this.duplicateSendPreventionTime}ms`);
        
        // 清理过期的记录，避免内存泄漏
        if (this.recentlySentTools.size > 30) { // 增加最大缓存数量
            // 获取并排序所有条目，按时间戳从老到新
            const entries = Array.from(this.recentlySentTools.entries())
                .sort((a, b) => a[1] - b[1]);
            
            // 移除最早的1/3条目
            const entriesToRemove = Math.floor(entries.length / 3);
            for (let i = 0; i < entriesToRemove; i++) {
                this.recentlySentTools.delete(entries[i][0]);
            }
            
            this.app.utils.logger.debug(`已清理 ${entriesToRemove} 条过期工具发送记录`);
        }
    }

    /**
     * 根据关键词匹配工具
     * @param {string} content 消息内容
     * @param {string} messageType 消息类型（TEXT, CARD, SPOTLIGHT）
     * @returns {Object|null} 匹配的工具对象
     */
    matchToolByKeyword(content, messageType = 'TEXT') {
        if (!content || !this.settings.keywordRules || this.settings.keywordRules.length === 0) {
            return null;
        }

        try {
            this.app.utils.logger.debug(`根据关键词匹配工具: ${content}，消息类型: ${messageType}`);
            const lowerContent = content.toLowerCase();

            for (const rule of this.settings.keywordRules) {
                if (!rule.enabled || !rule.keywords || rule.keywords.length === 0) {
                    continue;
                }

                // 检查规则是否适用于当前消息类型
                if (rule.messageTypes && Array.isArray(rule.messageTypes)) {
                    if (!rule.messageTypes.includes(messageType)) {
                        this.app.utils.logger.debug(`规则"${rule.name}"不适用于消息类型"${messageType}"，跳过匹配`);
                        continue; // 跳过不适用于当前消息类型的规则
                    }
                }

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
                        } catch (e) {
                            return false;
                        }
                    }
                };

                // 获取匹配方法
                let matchType = rule.matchType || 'contains';
                if (!matchType && rule.isRegex) {
                    matchType = 'regex';
                }
                const matchFunc = matchFunctions[matchType] || matchFunctions.contains;
                
                // 获取匹配逻辑
                const matchLogic = rule.matchLogic || 'OR';
                
                // 执行匹配
                let matched = false;
                if (matchLogic === 'AND') {
                    // 所有关键词都必须匹配
                    matched = rule.keywords.every(keyword => matchFunc(keyword));
                } else {
                    // 任一关键词匹配即可
                    matched = rule.keywords.some(keyword => matchFunc(keyword));
                }

                if (matched) {
                    // 找到工具类型中该索引的工具
                    const toolType = rule.toolType || this.settings.preferredToolType;
                    const toolIndex = rule.toolIndex || 0;

                    // 确保工具类型存在
                    if (!toolType || !this.tools[toolType]) {
                        continue;
                    }

                    // 获取工具对象
                    let tool = null;

                    // 尝试通过索引获取工具
                    if (this.tools[toolType].length > toolIndex) {
                        tool = this.tools[toolType][toolIndex];
                        this.app.utils.logger.debug(`通过索引 ${toolIndex} 匹配到工具：${tool?.title || '未命名'}`);
                    }
                    // 如果没有找到工具但工具列表不为空，返回第一个
                    else if (this.tools[toolType].length > 0) {
                        tool = this.tools[toolType][0];
                        this.app.utils.logger.debug(`无法通过索引匹配，使用第一个工具：${tool.title || '未命名'}`);
                    }

                    if (tool) {
                        return tool;
                    }
                }
            }

            // 如果没有匹配规则但有默认工具类型，返回该类型的第一个工具
            if (this.settings.preferredToolType &&
                this.tools[this.settings.preferredToolType] &&
                this.tools[this.settings.preferredToolType].length > 0) {
                const defaultTool = this.tools[this.settings.preferredToolType][0];
                this.app.utils.logger.debug(`使用默认工具类型的第一个工具：${defaultTool.title || '未命名'}`);
                return defaultTool;
            }

            return null;
        } catch (error) {
            this.app.utils.logger.error('根据关键词匹配工具失败', error);
            return null;
        }
    }

    /**
     * 处理消息
     * @param {Object} message 消息对象
     */
    async handleMessage(message) {
        if (!this.settings.enabled || !this.settings.autoDetect) {
            return null;
        }

        try {
            // 确保已扫描工具
            if (Object.values(this.tools).every(tools => tools.length === 0)) {
                await this.scanAllTools();
            }

            // 确定消息类型和匹配内容
            let messageType = 'TEXT'; // 默认为普通文本消息
            let matchContent = message.content;

            // 处理聚光进线消息
            if (message.sourceInfo) {
                messageType = 'SPOTLIGHT';
                matchContent = message.sourceInfo; // 使用聚光来源信息进行匹配
                this.app.utils.logger.info(`获客工具处理器识别到聚光进线，类型: ${messageType}, 内容: ${matchContent}`);
            }
            // 处理笔记卡片消息
            else if (message.type === 'CARD') {
                messageType = 'CARD';
                // 如果有标题，使用标题匹配，否则使用内容
                matchContent = message.title || message.content;
                this.app.utils.logger.info(`获客工具处理器识别到笔记卡片，类型: ${messageType}, 内容: ${matchContent}`);
            }

            // 匹配工具
            const matchedTool = this.matchToolByKeyword(matchContent, messageType);
            if (!matchedTool) {
                return null;
            }

            this.app.utils.logger.info(`消息匹配到工具: ${matchedTool.title}`);
            return matchedTool;
        } catch (error) {
            this.app.utils.logger.error('处理消息匹配工具失败', error);
            return null;
        }
    }

    /**
     * 创建获客工具设置部分
     * @param {Element} form 设置表单
     */
    createLeadGenerationSection(form) {
        // 修改：不再创建新的section，而是直接使用传入的form参数
        // 为传入的form添加类名
        form.classList.add('lead-generation-settings');
        
        // 添加标题和描述（如果form是空的）
        if (!form.querySelector('.xhs-auto-reply-settings-section-title')) {
            const titleDiv = document.createElement('div');
            titleDiv.className = 'xhs-auto-reply-settings-section-description';
            titleDiv.textContent = '配置获客工具自动发送的相关选项';
            form.appendChild(titleDiv);
        }
        
        // 添加容器
        const itemsContainer = document.createElement('div');
        itemsContainer.className = 'xhs-auto-reply-settings-items';
        form.appendChild(itemsContainer);

        // 添加获客工具设置的特殊样式
        const style = document.createElement('style');
        style.textContent = `
            .lead-generation-settings .xhs-auto-reply-settings-section-description {
                color: #666;
                margin-bottom: 20px;
                font-size: 14px;
                line-height: 1.5;
            }
            .lead-generation-settings .xhs-auto-reply-settings-item {
                margin-bottom: 16px;
                background-color: #fff;
                border-radius: 8px;
                padding: 16px;
                border: 1px solid #eee;
                transition: all 0.2s ease;
            }
            .lead-generation-settings .xhs-auto-reply-settings-item:hover {
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
            }
            .lead-generation-settings .btn {
                background-color: #FF2442;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: background-color 0.2s;
            }
            .lead-generation-settings .btn:hover {
                background-color: #E60033;
            }
            .lead-generation-settings .btn:disabled {
                background-color: #ffb3bd;
                cursor: not-allowed;
            }
            .lead-generation-settings .switch {
                position: relative;
                display: inline-block;
                width: 50px;
                height: 24px;
            }
            .lead-generation-settings .switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            .lead-generation-settings .slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #ccc;
                transition: .4s;
                border-radius: 24px;
            }
            .lead-generation-settings .slider:before {
                position: absolute;
                content: "";
                height: 16px;
                width: 16px;
                left: 4px;
                bottom: 4px;
                background-color: white;
                transition: .4s;
                border-radius: 50%;
            }
            .lead-generation-settings input:checked + .slider {
                background-color: #FF2442;
            }
            .lead-generation-settings input:checked + .slider:before {
                transform: translateX(26px);
            }
            
            /* 小型开关样式 */
            .lead-generation-settings .switch.small {
                width: 40px;
                height: 20px;
            }
            .lead-generation-settings .switch.small .slider:before {
                height: 14px;
                width: 14px;
                left: 3px;
                bottom: 3px;
            }
            .lead-generation-settings .switch.small input:checked + .slider:before {
                transform: translateX(20px);
            }
            
            /* 开关悬停效果 */
            .lead-generation-settings .slider:hover {
                box-shadow: 0 0 3px rgba(255, 36, 66, 0.5);
            }
            .lead-generation-settings input:focus + .slider {
                box-shadow: 0 0 1px #FF2442;
            }
            .lead-generation-settings select,
            .lead-generation-settings input[type="text"] {
                width: 100%;
                padding: 8px 10px;
                border-radius: 4px;
                border: 1px solid #ddd;
                font-size: 14px;
                transition: all 0.2s ease;
            }
            .lead-generation-settings select:hover,
            .lead-generation-settings input[type="text"]:hover {
                border-color: #bbb;
            }
            .lead-generation-settings select:focus,
            .lead-generation-settings input[type="text"]:focus {
                border-color: #FF2442;
                outline: none;
                box-shadow: 0 0 0 2px rgba(255, 36, 66, 0.2);
            }
            
            /* 按钮交互状态 */
            .lead-generation-settings .xhs-auto-reply-settings-btn {
                transition: all 0.2s ease;
                position: relative;
                overflow: hidden;
            }
            .lead-generation-settings .xhs-auto-reply-settings-btn:active {
                transform: translateY(1px);
            }
            .lead-generation-settings .xhs-auto-reply-settings-btn.primary:hover {
                background-color: #E60033;
            }
            .lead-generation-settings .xhs-auto-reply-settings-btn.secondary {
                background-color: #f5f5f5;
                color: #333;
            }
            .lead-generation-settings .xhs-auto-reply-settings-btn.secondary:hover {
                background-color: #e8e8e8;
            }
            
            /* 表单分组样式增强 */
            .form-group {
                margin-bottom: 16px;
            }
            .form-group label {
                display: block;
                margin-bottom: 8px;
                font-weight: 600;
                color: #333;
                font-size: 14px;
            }
            
            /* 消息类型选择样式 */
            .message-types-selection {
                display: flex;
                flex-wrap: wrap;
                gap: 12px;
                margin-top: 8px;
            }
            
            .message-type-option {
                display: flex;
                align-items: center;
                gap: 4px;
            }
            
            .message-type-option input[type="checkbox"] {
                margin: 0;
            }
            
            .form-group-description {
                font-size: 12px;
                color: #666;
                margin-bottom: 8px;
            }
            
            /* 关键词列表和标签样式 */
            .keywords-list {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 10px;
                margin-bottom: 15px;
                min-height: 30px;
            }
            
            /* 通用样式类，与keywordRuleManager保持一致 */
            .keyword-tag, .xhs-auto-reply-keyword-tag {
                display: inline-flex;
                align-items: center;
                background-color: #f0f0f0;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 13px;
                border: 1px solid #e0e0e0;
                color: #333;
                cursor: pointer;
            }
            
            .keyword-tag:hover, .xhs-auto-reply-keyword-tag:hover {
                background-color: #e6e6e6;
            }
            
            .keyword-text {
                display: inline-block;
                max-width: 150px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            
            .keyword-delete, .xhs-auto-reply-keyword-tag-remove {
                margin-left: 6px;
                cursor: pointer;
                color: #999;
                font-size: 14px;
                font-weight: bold;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 0 3px;
            }
            
            .keyword-delete:hover, .xhs-auto-reply-keyword-tag-remove:hover {
                color: #ff2442;
            }
            
            .keyword-edit {
                margin-left: 6px;
                cursor: pointer;
                color: #0088ff;
                font-size: 14px;
                width: 20px;
                height: 20px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 0;
                border-radius: 50%;
                background-color: rgba(0, 136, 255, 0.1);
                transition: all 0.2s;
            }
            
            .keyword-edit:hover {
                color: #ffffff;
                background-color: #0088ff;
            }
            
            .empty-keywords {
                color: #999;
                font-style: italic;
                font-size: 13px;
            }
        `;
        document.head.appendChild(style);

        // 创建设置项 - 直接使用上面创建的 itemsContainer，不再重新获取

        // 启用开关
        const enabledItem = this.createSettingItem(
            'enabled',
            '启用获客工具处理',
            '开启后将处理获客工具相关功能',
            'switch',
            this.settings.enabled
        );

        // 自动检测开关
        const autoDetectItem = this.createSettingItem(
            'autoDetect',
            '自动检测并发送',
            '根据消息内容自动检测并发送匹配的获客工具',
            'switch',
            this.settings.autoDetect
        );

        // 首选工具类型
        const preferredToolTypeItem = this.createSettingItem(
            'preferredToolType',
            '首选工具类型',
            '当没有明确匹配规则时使用的默认工具类型',
            'select',
            this.settings.preferredToolType,
            [
                { value: '', text: '无' },
                { value: this.toolTypes.LEAD_CARD, text: this.toolTypes.LEAD_CARD },
                { value: this.toolTypes.BUSINESS_CARD, text: this.toolTypes.BUSINESS_CARD },
                { value: this.toolTypes.LANDING_PAGE, text: this.toolTypes.LANDING_PAGE }
            ]
        );

        // 添加到容器
        itemsContainer.appendChild(enabledItem);
        itemsContainer.appendChild(autoDetectItem);
        itemsContainer.appendChild(preferredToolTypeItem);

        // 创建关键词规则部分
        const rulesContainer = this.createKeywordRulesSection();
        itemsContainer.appendChild(rulesContainer);

        // 添加扫描工具按钮
        const scanButtonContainer = document.createElement('div');
        scanButtonContainer.className = 'settings-item scan-button-container';
        scanButtonContainer.innerHTML = `
            <div class="scan-button-wrapper">
                <button class="btn scan-tools-btn">
                    <span class="scan-icon">🔍</span>
                    扫描获客工具
                </button>
                <div class="tools-status"></div>
            </div>
            <div class="scan-description">点击按钮扫描小红书中的获客工具，包括留资卡、名片和落地页</div>
        `;

        // 添加扫描按钮的特殊样式
        const scanButtonStyle = document.createElement('style');
        scanButtonStyle.textContent = `
            .scan-button-container {
                text-align: center;
                margin: 25px 0;
                padding: 20px;
                background-color: #f0f8ff;
                border-radius: 8px;
                border: 1px dashed #b3d7ff;
            }
            .scan-button-wrapper {
                margin-bottom: 10px;
            }
            .scan-tools-btn {
                padding: 12px 25px;
                font-size: 16px;
                background-color: #1e88e5;
                box-shadow: 0 3px 5px rgba(0,0,0,0.1);
            }
            .scan-tools-btn:hover {
                background-color: #1976d2;
            }
            .scan-icon {
                margin-right: 8px;
            }
            .tools-status {
                margin-top: 10px;
                font-weight: bold;
            }
            .scan-description {
                color: #666;
                font-size: 13px;
                font-style: italic;
            }
        `;
        document.head.appendChild(scanButtonStyle);

        const scanButton = scanButtonContainer.querySelector('.scan-tools-btn');
        const toolsStatus = scanButtonContainer.querySelector('.tools-status');

        scanButton.addEventListener('click', async () => {
            scanButton.disabled = true;
            scanButton.textContent = '正在扫描...';
            toolsStatus.textContent = '';

            const success = await this.scanAllTools();

            scanButton.disabled = false;
            scanButton.textContent = '扫描获客工具';

            if (success) {
                toolsStatus.textContent = `扫描完成：留资卡 ${this.tools[this.toolTypes.LEAD_CARD].length} 个，名片 ${this.tools[this.toolTypes.BUSINESS_CARD].length} 个，落地页 ${this.tools[this.toolTypes.LANDING_PAGE].length} 个`;
                toolsStatus.style.color = 'green';
            } else {
                toolsStatus.textContent = '扫描失败，请重试';
                toolsStatus.style.color = 'red';
            }
        });

        itemsContainer.appendChild(scanButtonContainer);
    }

    /**
     * 创建关键词规则部分
     */
    createKeywordRulesSection() {
        const container = document.createElement('div');
        container.className = 'keyword-rules-container';
        container.innerHTML = `
            <div class="xhs-auto-reply-settings-item-title">关键词匹配规则</div>
            <div class="tool-preview-description">设置关键词匹配规则，自动发送相应的获客工具</div>
            <div class="rules-list"></div>
            <button class="xhs-auto-reply-settings-btn primary add-rule-btn">
                <span class="btn-icon"></span>添加规则
            </button>
        `;

        // 获取规则列表容器
        const rulesList = container.querySelector('.rules-list');

        // 添加现有规则
        if (this.settings.keywordRules && this.settings.keywordRules.length > 0) {
            this.settings.keywordRules.forEach((rule, index) => {
                const ruleElement = this.createRuleElement(rule, index);
                rulesList.appendChild(ruleElement);
            });
        } else {
            // 没有规则时显示提示
            rulesList.innerHTML = `
                <div class="empty-rules-notice">
                    <div class="empty-icon"></div>
                    <div class="empty-text">暂无关键词规则，点击"添加规则"创建</div>
                </div>
            `;
        }

        // 添加规则按钮事件
        const addRuleBtn = container.querySelector('.add-rule-btn');
        addRuleBtn.addEventListener('click', () => {
            // 创建新规则
            const newRule = {
                id: 'rule_' + Date.now(),
                name: '新规则',
                keywords: [],
                toolType: this.toolTypes.BUSINESS_CARD,
                toolIndex: 0,
                matchType: 'contains', // 默认为包含匹配
                matchLogic: 'OR', // 默认为OR匹配逻辑
                messageTypes: ['TEXT'], // 默认适用于普通文本消息
                enabled: true
            };

            // 添加到规则列表
            this.settings.keywordRules.push(newRule);
            
            // 创建规则元素
            const ruleElement = this.createRuleElement(newRule, this.settings.keywordRules.length - 1);
            
            // 清除空规则提示
            if (rulesList.querySelector('.empty-rules-notice')) {
                rulesList.innerHTML = '';
            }
            
            // 添加到DOM
            rulesList.appendChild(ruleElement);
            
            // 保存设置
            this.saveSettings();
        });

        return container;
    }

    /**
     * 创建关键词规则元素
     * @param {Object} rule 规则对象
     * @param {number} index 规则索引
     * @returns {HTMLElement} 规则元素
     */
    createRuleElement(rule, index) {
        const ruleElement = document.createElement('div');
        ruleElement.className = 'keyword-rule';
        ruleElement.dataset.index = index;
        ruleElement.dataset.id = rule.id;

        // 规则标题和展开/折叠开关
        const header = document.createElement('div');
        header.className = 'rule-header';
        header.innerHTML = `
            <div class="rule-title" style="cursor: pointer; text-decoration: underline dotted; padding: 2px;" title="点击编辑规则名称">${rule.name}</div>
            <div class="rule-actions">
                <label class="switch small">
                    <input type="checkbox" class="rule-enabled" ${rule.enabled ? 'checked' : ''}>
                    <span class="slider round"></span>
                </label>
                <button class="xhs-auto-reply-settings-btn secondary rule-expand-btn">
                    <span class="expand-icon"></span>
                </button>
            </div>
        `;
        ruleElement.appendChild(header);

        // 添加规则名称点击编辑功能
        const ruleTitle = header.querySelector('.rule-title');
        ruleTitle.addEventListener('click', (e) => {
            // 阻止事件冒泡，避免触发规则展开/折叠
            e.stopPropagation();
            
            const newName = prompt('请编辑规则名称:', rule.name);
            if (newName !== null && newName.trim() !== '') {
                rule.name = newName;
                ruleTitle.textContent = newName;
                
                // 更新表单中的名称输入框
                const nameInput = body.querySelector('.rule-name');
                if (nameInput) {
                    nameInput.value = newName;
                }
                
                this.saveSettings();
            }
        });

        // 规则内容（展开后显示）
        const body = document.createElement('div');
        body.className = 'rule-body';
        body.style.display = 'none'; // 默认折叠
        
        // 设置默认值（如果是旧数据）
        if (!rule.matchType) {
            rule.matchType = 'contains';
        }
        if (!rule.matchLogic) {
            rule.matchLogic = 'OR';
        }
        // 确保规则有messageTypes字段，默认为TEXT
        if (!rule.messageTypes || !Array.isArray(rule.messageTypes)) {
            rule.messageTypes = ['TEXT'];
        }
        
        body.innerHTML = `
            <div class="rule-form">
                <div class="form-group">
                    <label for="rule-name-${index}">规则名称</label>
                    <input type="text" id="rule-name-${index}" class="rule-name xhs-auto-reply-settings-input" value="${rule.name}">
                </div>
                <div class="form-group">
                    <label for="rule-tool-type-${index}">工具类型</label>
                    <select id="rule-tool-type-${index}" class="rule-tool-type xhs-auto-reply-settings-select">
                        <option value="${this.toolTypes.LEAD_CARD}" ${rule.toolType === this.toolTypes.LEAD_CARD ? 'selected' : ''}>${this.toolTypes.LEAD_CARD}</option>
                        <option value="${this.toolTypes.BUSINESS_CARD}" ${rule.toolType === this.toolTypes.BUSINESS_CARD ? 'selected' : ''}>${this.toolTypes.BUSINESS_CARD}</option>
                        <option value="${this.toolTypes.LANDING_PAGE}" ${rule.toolType === this.toolTypes.LANDING_PAGE ? 'selected' : ''}>${this.toolTypes.LANDING_PAGE}</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="rule-tool-name-${index}">工具名称</label>
                    <select id="rule-tool-name-${index}" class="rule-tool-name xhs-auto-reply-settings-select">
                        <option value="">请先选择工具类型</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>适用消息类型</label>
                    <div class="form-group-description">选择此规则适用的消息类型</div>
                    <div class="message-types-selection">
                        <div class="message-type-option">
                            <input type="checkbox" id="rule-${index}-type-TEXT" class="message-type-checkbox" data-type="TEXT" ${rule.messageTypes.includes('TEXT') ? 'checked' : ''}>
                            <label for="rule-${index}-type-TEXT">普通文本消息</label>
                        </div>
                        <div class="message-type-option">
                            <input type="checkbox" id="rule-${index}-type-CARD" class="message-type-checkbox" data-type="CARD" ${rule.messageTypes.includes('CARD') ? 'checked' : ''}>
                            <label for="rule-${index}-type-CARD">笔记卡片</label>
                        </div>
                        <div class="message-type-option">
                            <input type="checkbox" id="rule-${index}-type-SPOTLIGHT" class="message-type-checkbox" data-type="SPOTLIGHT" ${rule.messageTypes.includes('SPOTLIGHT') ? 'checked' : ''}>
                            <label for="rule-${index}-type-SPOTLIGHT">聚光进线</label>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label for="rule-match-type-${index}">匹配类型</label>
                    <select id="rule-match-type-${index}" class="rule-match-type xhs-auto-reply-settings-select">
                        <option value="contains" ${rule.matchType === 'contains' ? 'selected' : ''}>包含匹配 (消息包含指定文本)</option>
                        <option value="exact" ${rule.matchType === 'exact' ? 'selected' : ''}>精确匹配 (消息与关键词完全相同)</option>
                        <option value="startsWith" ${rule.matchType === 'startsWith' ? 'selected' : ''}>前缀匹配 (消息以关键词开头)</option>
                        <option value="endsWith" ${rule.matchType === 'endsWith' ? 'selected' : ''}>后缀匹配 (消息以关键词结尾)</option>
                        <option value="regex" ${rule.matchType === 'regex' ? 'selected' : ''}>正则表达式 (使用正则表达式匹配)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="rule-match-logic-${index}">匹配逻辑</label>
                    <select id="rule-match-logic-${index}" class="rule-match-logic xhs-auto-reply-settings-select">
                        <option value="OR" ${rule.matchLogic === 'OR' ? 'selected' : ''}>匹配任一关键词 (OR 逻辑)</option>
                        <option value="AND" ${rule.matchLogic === 'AND' ? 'selected' : ''}>匹配所有关键词 (AND 逻辑)</option>
                    </select>
                </div>
            </div>
            
            <div class="keywords-container">
                <div class="form-group-header">
                    <label>关键词列表</label>
                    <div class="form-group-description">根据上面的匹配类型和匹配逻辑触发规则</div>
                </div>
                <div class="keywords-list"></div>
                <div class="add-keyword-form">
                    <input type="text" class="new-keyword xhs-auto-reply-settings-input" placeholder="输入新关键词">
                    <button class="xhs-auto-reply-settings-btn primary add-keyword-btn">添加</button>
                </div>
            </div>
            
            <div class="rule-actions-container">
                <button class="xhs-auto-reply-settings-btn secondary delete-rule-btn">删除规则</button>
            </div>
        `;
        ruleElement.appendChild(body);

        // 更新关键词列表
        const keywordsList = body.querySelector('.keywords-list');
        const updateKeywordsList = () => {
            keywordsList.innerHTML = '';
            if (rule.keywords && rule.keywords.length > 0) {
                rule.keywords.forEach((keyword, kidx) => {
                    const keywordTag = document.createElement('div');
                    keywordTag.className = 'keyword-tag';
                    keywordTag.title = '点击编辑此关键词';
                    keywordTag.style.position = 'relative';
                    keywordTag.innerHTML = `
                        <span class="keyword-text">${keyword}</span>
                        <span class="keyword-edit" data-index="${kidx}" title="编辑此关键词">✎</span>
                        <span class="keyword-delete" data-index="${kidx}" title="删除此关键词">×</span>
                    `;
                    
                    // 为整个标签添加点击编辑功能
                    keywordTag.addEventListener('click', (e) => {
                        if (!e.target.classList.contains('keyword-delete') && !e.target.classList.contains('keyword-edit')) {
                            // 获取关键词索引
                            const kidx = parseInt(keywordTag.querySelector('.keyword-edit').dataset.index);
                            if (!isNaN(kidx) && kidx >= 0 && kidx < rule.keywords.length) {
                                const keyword = rule.keywords[kidx];
                                const newKeyword = prompt('请编辑关键词:', keyword);
                                
                                if (newKeyword !== null && newKeyword.trim() !== '' && newKeyword !== keyword) {
                                    // 避免重复添加
                                    if (!rule.keywords.includes(newKeyword)) {
                                        rule.keywords[kidx] = newKeyword;
                                        updateKeywordsList();
                                        this.saveSettings();
                                    } else {
                                        // 提示重复
                                        alert('此关键词已存在');
                                    }
                                }
                            }
                        }
                    });
                    
                    keywordsList.appendChild(keywordTag);
                });
            } else {
                keywordsList.innerHTML = '<div class="empty-keywords">无关键词，请添加</div>';
            }
        };
        updateKeywordsList();

        // 工具名称下拉框更新
        const toolTypeSelect = body.querySelector('.rule-tool-type');
        const toolNameSelect = body.querySelector('.rule-tool-name');
        const matchTypeSelect = body.querySelector('.rule-match-type');
        const matchLogicSelect = body.querySelector('.rule-match-logic');
        const messageTypeCheckboxes = body.querySelectorAll('.message-type-checkbox');
        
        // 更新工具名称选项
        const updateToolNameOptions = () => {
            const toolType = toolTypeSelect.value;
            const options = this.getToolNamesList(toolType);
            
            // 保存当前选中值
            const currentValue = toolNameSelect.value;
            
            // 清空现有选项
            toolNameSelect.innerHTML = '';
            
            // 添加新选项
            options.forEach(option => {
                const optElement = document.createElement('option');
                optElement.value = option.value;
                optElement.textContent = option.text;
                if (option.value === rule.toolName) {
                    optElement.selected = true;
                }
                toolNameSelect.appendChild(optElement);
            });
            
            // 如果没有对应的选项，设置为空
            if (options.length === 0) {
                const optElement = document.createElement('option');
                optElement.value = '';
                optElement.textContent = '请先选择工具类型';
                toolNameSelect.appendChild(optElement);
            }
            
            // 如果之前选中的值在新选项中存在，则保持选中
            if (currentValue && toolNameSelect.querySelector(`option[value="${currentValue}"]`)) {
                toolNameSelect.value = currentValue;
            }
        };
        
        // 初始调用一次
        if (rule.toolType) {
            toolTypeSelect.value = rule.toolType;
            updateToolNameOptions();
            if (rule.toolName) {
                toolNameSelect.value = rule.toolName;
            }
        }
        
        // 事件绑定
        
        // 规则展开/折叠
        const expandBtn = header.querySelector('.rule-expand-btn');
        expandBtn.addEventListener('click', () => {
            if (body.style.display === 'none') {
                body.style.display = 'block';
                expandBtn.classList.add('expanded');
            } else {
                body.style.display = 'none';
                expandBtn.classList.remove('expanded');
            }
        });
        
        // 规则启用/禁用
        const enabledSwitch = header.querySelector('.rule-enabled');
        enabledSwitch.addEventListener('change', () => {
            rule.enabled = enabledSwitch.checked;
            this.saveSettings();
        });
        
        // 规则名称修改
        const nameInput = body.querySelector('.rule-name');
        nameInput.addEventListener('change', () => {
            rule.name = nameInput.value;
            header.querySelector('.rule-title').textContent = nameInput.value;
            this.saveSettings();
        });
        
        // 工具类型修改
        toolTypeSelect.addEventListener('change', () => {
            rule.toolType = toolTypeSelect.value;
            updateToolNameOptions();
            this.saveSettings();
        });

        // 消息类型选择修改
        messageTypeCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const type = checkbox.dataset.type;
                if (checkbox.checked) {
                    // 添加消息类型
                    if (!rule.messageTypes.includes(type)) {
                        rule.messageTypes.push(type);
                    }
                } else {
                    // 移除消息类型，但确保至少有一种消息类型被选中
                    const checkedCount = Array.from(messageTypeCheckboxes).filter(cb => cb.checked).length;
                    if (checkedCount === 0) {
                        checkbox.checked = true; // 如果没有选中项，重新选中当前项
                        alert('至少需要选择一种消息类型');
                        return;
                    }
                    rule.messageTypes = rule.messageTypes.filter(t => t !== type);
                }
                this.saveSettings();
            });
        });
        
        // 工具名称下拉框更新
        toolNameSelect.addEventListener('change', () => {
            rule.toolName = toolNameSelect.value;
            this.saveSettings();
        });
        
        // 匹配逻辑修改
        matchLogicSelect.addEventListener('change', () => {
            rule.matchLogic = matchLogicSelect.value;
            this.saveSettings();
        });
        
        // 添加关键词
        const newKeywordInput = body.querySelector('.new-keyword');
        const addKeywordBtn = body.querySelector('.add-keyword-btn');
        
        const addKeyword = () => {
            const keyword = newKeywordInput.value.trim();
            if (keyword) {
                if (!rule.keywords) {
                    rule.keywords = [];
                }
                
                // 避免重复添加
                if (!rule.keywords.includes(keyword)) {
                    rule.keywords.push(keyword);
                    updateKeywordsList();
                    newKeywordInput.value = '';
                    this.saveSettings();
                } else {
                    // 提示重复
                    newKeywordInput.style.borderColor = '#f44336';
                    setTimeout(() => {
                        newKeywordInput.style.borderColor = '';
                    }, 2000);
                }
            }
        };
        
        addKeywordBtn.addEventListener('click', addKeyword);
        newKeywordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addKeyword();
            }
        });
        
        // 删除关键词
        keywordsList.addEventListener('click', (e) => {
            // 删除关键词
            if (e.target.classList.contains('keyword-delete')) {
                const kidx = parseInt(e.target.dataset.index);
                if (!isNaN(kidx) && kidx >= 0 && kidx < rule.keywords.length) {
                    rule.keywords.splice(kidx, 1);
                    updateKeywordsList();
                    this.saveSettings();
                }
            }
            // 编辑关键词
            else if (e.target.classList.contains('keyword-edit')) {
                const kidx = parseInt(e.target.dataset.index);
                if (!isNaN(kidx) && kidx >= 0 && kidx < rule.keywords.length) {
                    const keyword = rule.keywords[kidx];
                    const newKeyword = prompt('请编辑关键词:', keyword);
                    
                    if (newKeyword !== null && newKeyword.trim() !== '' && newKeyword !== keyword) {
                        // 避免重复添加
                        if (!rule.keywords.includes(newKeyword)) {
                            rule.keywords[kidx] = newKeyword;
                            updateKeywordsList();
                            this.saveSettings();
                        } else {
                            // 提示重复
                            alert('此关键词已存在');
                        }
                    }
                }
            }
        });
        
        // 删除规则
        const deleteRuleBtn = body.querySelector('.delete-rule-btn');
        deleteRuleBtn.addEventListener('click', () => {
            if (confirm(`确定要删除规则"${rule.name}"吗？`)) {
                this.settings.keywordRules.splice(index, 1);
                ruleElement.remove();
                this.saveSettings();
                
                // 如果删除后没有规则，显示空提示
                if (this.settings.keywordRules.length === 0) {
                    const rulesList = ruleElement.parentElement;
                    if (rulesList) {
                        rulesList.innerHTML = `
                            <div class="empty-rules-notice">
                                <div class="empty-icon"></div>
                                <div class="empty-text">暂无关键词规则，点击"添加规则"创建</div>
                            </div>
                        `;
                    }
                }
            }
        });
        
        return ruleElement;
    }


    /**
     * 获取特定类型的工具名称列表
     * @param {string} toolType 工具类型
     * @returns {Array} 工具名称列表，格式为 [{value: 索引, text: 名称}]
     */
    getToolNamesList(toolType) {
        try {
            if (!toolType || !this.tools[toolType]) {
                return [{ value: '', text: '无可用工具' }];
            }

            // 如果没有扫描到任何工具
            if (this.tools[toolType].length === 0) {
                return [{ value: '', text: '请先扫描工具' }];
            }

            // 返回工具名称列表
            return this.tools[toolType].map((tool, index) => {
                const name = tool.title || `工具 ${index + 1}`;
                return {
                    value: index.toString(),
                    text: name
                };
            });
        } catch (error) {
            this.app.utils.logger.error('获取工具名称列表失败', error);
            return [{ value: '', text: '获取工具失败' }];
        }
    }


    /**
     * 创建设置项
     */
    createSettingItem(key, label, description, type, value, options = null) {
        const item = document.createElement('div');
        item.className = 'xhs-auto-reply-settings-item';

        let controlHtml = '';

        switch (type) {
            case 'switch':
                controlHtml = `
                    <label class="switch">
                        <input type="checkbox" id="lead-gen-${key}" ${value ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                `;
                break;

            case 'select':
                controlHtml = `
                    <select id="lead-gen-${key}" class="xhs-auto-reply-settings-select">
                        ${options.map(opt => `<option value="${opt.value}" ${value === opt.value ? 'selected' : ''}>${opt.text}</option>`).join('')}
                    </select>
                `;
                break;

            default:
                controlHtml = `<input type="${type}" id="lead-gen-${key}" class="xhs-auto-reply-settings-input" value="${value || ''}">`;
        }

        item.innerHTML = `
            <div class="xhs-auto-reply-settings-item-label">
                <label for="lead-gen-${key}">${label}</label>
                ${description ? `<div class="xhs-auto-reply-settings-item-description">${description}</div>` : ''}
            </div>
            <div class="xhs-auto-reply-settings-item-control">
                ${controlHtml}
            </div>
        `;

        // 绑定事件
        const control = item.querySelector(`#lead-gen-${key}`);
        if (control) {
            if (type === 'switch') {
                control.addEventListener('change', () => {
                    this.settings[key] = control.checked;
                    this.saveSettings();
                });
            } else {
                control.addEventListener('change', () => {
                    this.settings[key] = control.value;
                    this.saveSettings();
                });
            }
        }

        return item;
    }

    /**
     * 备选工具发送逻辑，基于简化版的代码
     * 当主发送逻辑失败时使用此方法作为后备
     * @param {Object} tool 工具对象
     * @returns {Promise<boolean>} 是否发送成功
     */
    async sendToolFallback(tool) {
        try {
            if (!tool || !tool.title) {
                this.app.utils.logger.warn('备选发送：未提供有效的工具对象或标题');
                this.logSendStatus('备选发送-初始检查', '无效工具对象或标题', null, {
                    toolExists: !!tool,
                    hasTitle: tool ? !!tool.title : false
                });
                return false;
            }

            this.app.utils.logger.info(`使用备选逻辑尝试发送工具: ${tool.title}`);
            this.logSendStatus('备选发送-开始', '使用备选逻辑尝试发送工具', null, {
                toolTitle: tool.title,
                toolType: tool ? tool.type : '未知',
                toolIndex: tool ? tool.index : -1
            });
            
            // 确保工具面板已打开
            if (!this.isToolPanelOpen) {
                const opened = await this.openToolPanel();
                if (!opened) {
                    this.app.utils.logger.warn('备选发送：无法打开工具面板');
                    this.logSendStatus('备选发送-无法打开面板', '无法打开工具面板', null, {
                        toolTitle: tool.title,
                        toolType: tool ? tool.type : '未知',
                        toolIndex: tool ? tool.index : -1
                    });
                    return false;
                }
            }
            
            // 切换到工具对应的类型
            if (tool.type) {
                this.app.utils.logger.debug(`备选发送：尝试切换到工具类型 ${tool.type}`);
                await this.switchToolType(tool.type);
            }
            
            // 1. 尝试直接使用findSendButtonByToolName方法查找按钮
            this.app.utils.logger.debug(`备选发送：尝试使用高级查找方法查找 ${tool.title} 的发送按钮`);
            const directSendButton = this.findSendButtonByToolName(tool.title);
            
            if (directSendButton) {
                this.app.utils.logger.debug('备选发送：通过高级查找找到发送按钮，尝试点击');
                
                // 使用增强的点击验证方法
                const clickResult = await this.app.utils.dom.enhancedClickWithVerification(directSendButton, {
                    maxRetries: 3,
                    waitBetweenRetries: 500,
                    verificationFn: null // 暂不使用验证
                });
                
                if (clickResult) {
                    this.app.utils.logger.info(`备选发送：通过高级查找成功发送工具 ${tool.title}`);
                    this.logSendStatus('备选发送-成功', '通过高级查找成功发送工具', null, {
                        toolTitle: tool.title,
                        toolType: tool.type,
                        toolIndex: tool.index
                    });
                    // 标记工具为已发送 - 移除此行，由 sendTool 方法统一处理
                    // this.markToolAsSent(tool);
                    return true;
                }
                
                this.app.utils.logger.warn('备选发送：通过高级查找找到按钮但点击失败，尝试其他方法');
            }
            
            // 2. 尝试传统的span查找方法
            const titleSelectors = [
                'div[data-v-7dfe39e8].card-box__content-title > span.d-text',
                'div[data-v-*].card-box__content-title > span.d-text',
                'div[class*="card-box"] div[class*="title"] > span.d-text',
                '.card-box__content-title span.d-text',
                'span.d-text'
            ];
            
            for (const selector of titleSelectors) {
                const titleSpans = document.querySelectorAll(selector);
                this.app.utils.logger.debug(`备选发送：使用选择器 "${selector}" 找到 ${titleSpans.length} 个标题元素`);
                
                if (titleSpans.length > 0) {
                    const result = await this._sendToolWithElements(tool, titleSpans);
                    if (result) {
                        this.app.utils.logger.info(`备选发送：使用选择器 "${selector}" 成功发送工具`);
                        this.logSendStatus('备选发送-成功', '使用选择器成功发送工具', null, {
                            toolTitle: tool.title,
                            toolType: tool.type,
                            toolIndex: tool.index
                        });
                        // 标记工具为已发送 - 移除此行，由 sendTool 方法统一处理
                        // this.markToolAsSent(tool);
                        return true;
                    }
                }
            }
            
            this.app.utils.logger.warn(`备选发送：所有方法均未能找到并发送工具 ${tool.title}`);
            this.logSendStatus('备选发送-结束', '所有方法均未能找到并发送工具', null, {
                toolTitle: tool.title,
                attemptedMethods: ['findSendButtonByToolName', 'titleSelectors']
            });
            return false;
        } catch (error) {
            this.app.utils.logger.error(`备选发送工具 ${tool?.title || '未知'} 失败`, error);
            this.logSendStatus('备选发送-异常', '备选发送过程异常', error, {
                toolTitle: tool ? tool.title : '未知',
                toolType: tool ? tool.type : '未知',
                errorType: error.name,
                errorLocation: error.stack ? error.stack.split('\n')[1] : '未知'
            });
            return false;
        }
    }
    
    /**
     * 在给定的元素集合中查找并发送工具
     * @private
     * @param {Object} tool 工具对象
     * @param {NodeList} elements 要搜索的元素集合
     * @returns {Promise<boolean>} 是否发送成功
     */
    async _sendToolWithElements(tool, elements) {
        let targetSendButton = null;
        
        // 增强调试信息
        if (elements.length === 0) {
            this.app.utils.logger.debug('_sendToolWithElements: 提供的元素集合为空');
            return false;
        }
        
        this.app.utils.logger.debug(`_sendToolWithElements: 查找匹配 "${tool.title}" 的元素，共 ${elements.length} 个候选元素`);
        
        // 标题匹配逻辑
        for (const span of elements) {
            try {
                // 检查span的文本内容是否包含工具标题
                if (span.textContent && span.textContent.includes(tool.title)) {
                    this.app.utils.logger.debug(`_sendToolWithElements: 找到匹配标题: "${span.textContent}"`);
                    
                    // 从标题span向上找到包含整个卡片的父元素
                    const cardContent = span.closest('div[data-v-7dfe39e8].card-box__content') || 
                                        span.closest('div[class*="card-box"]') || 
                                        span.closest('div[class*="content"]') ||
                                        // 查找5层父级，或许能找到卡片容器
                                        (function() {
                                            let parent = span.parentElement;
                                            let depth = 0;
                                            while (parent && depth < 5) {
                                                if (parent.querySelectorAll('button').length > 0) {
                                                    return parent;
                                                }
                                                parent = parent.parentElement;
                                                depth++;
                                            }
                                            return null;
                                        })();
                                        
                    if (cardContent) {
                        this.app.utils.logger.debug(`_sendToolWithElements: 找到卡片容器`);
                        
                        // 尝试多种选择器查找发送按钮
                        const selectors = [
                            'button span.d-text > div.buttomContent > span.d-text',
                            'button span.d-text',
                            'button[class*="btn"] span.d-text',
                            'button.btn',
                            'button'
                        ];
                        
                        for (const selector of selectors) {
                            const buttonElements = cardContent.querySelectorAll(selector);
                            
                            // 文本匹配
                            const textMatches = ['发送', '添加', '确认', '确定', '获取'];
                            
                            for (const buttonElement of buttonElements) {
                                const buttonText = buttonElement.textContent || '';
                                const hasMatchingText = textMatches.some(match => buttonText.includes(match));
                                
                                if (hasMatchingText) {
                                    // 获取实际按钮元素
                                    targetSendButton = buttonElement.closest('button') || buttonElement;
                                    this.app.utils.logger.debug(`_sendToolWithElements: 找到发送按钮`);
                                    break;
                                }
                            }
                            
                            if (targetSendButton) break;
                        }
                        
                        // 如果没找到包含特定文本的按钮，取最后一个按钮
                        if (!targetSendButton) {
                            const allButtons = cardContent.querySelectorAll('button');
                            if (allButtons.length > 0) {
                                targetSendButton = allButtons[allButtons.length - 1];
                                this.app.utils.logger.debug(`_sendToolWithElements: 未找到包含特定文本的按钮，使用最后一个按钮`);
                            }
                        }
                        
                        if (targetSendButton) break;
                    }
                }
            } catch (error) {
                // 继续处理下一个元素
            }
        }
        
        // 如果找到了目标发送按钮，则模拟点击
        if (targetSendButton) {
            this.app.utils.logger.info('_sendToolWithElements: 找到发送按钮，尝试点击');
            
            // 记录找到的按钮结构，辅助调试
            this.captureCardElementHtml(targetSendButton, `发送按钮:${tool.title}`);
            
            // 使用增强的点击验证方法
            try {
                const clickResult = await this.app.utils.dom.enhancedClickWithVerification(targetSendButton, {
                    maxRetries: 3,
                    waitBetweenRetries: 500
                });
                
                if (clickResult) {
                    this.app.utils.logger.info('_sendToolWithElements: 点击成功');
                    // 标记工具为已发送 - 移除此行，由 sendTool 方法统一处理
                    // this.markToolAsSent(tool);
                    return true;
                } else {
                    // 尝试更原始的点击方法
                    try {
                        // 直接点击
                        this.app.utils.dom.simulateClick(targetSendButton);
                        await new Promise(resolve => setTimeout(resolve, 500));
                        
                        // 尝试原生click
                        if (typeof targetSendButton.click === 'function') {
                            targetSendButton.click();
                        }
                        
                        this.app.utils.logger.info('_sendToolWithElements: 备选点击方法完成，假定成功');
                        // 标记工具为已发送 - 移除此行，由 sendTool 方法统一处理
                        // this.markToolAsSent(tool);
                        return true;
                    } catch (finalClickError) {
                        this.app.utils.logger.error('_sendToolWithElements: 所有点击方法均失败', finalClickError);
                        return false;
                    }
                }
            } catch (clickError) {
                this.app.utils.logger.error('_sendToolWithElements: 点击发送按钮失败', clickError);
                return false;
            }
        } else {
            this.app.utils.logger.warn(`_sendToolWithElements: 未找到 "${tool.title}" 的发送按钮`);
            return false;
        }
    }

    /**
     * 根据工具名称查找工具卡片元素
     * @param {string} toolName 工具名称
     * @returns {Element|null} 找到的工具卡片元素或null
     */
    findToolCardByName(toolName) {
        if (!toolName) {
            this.app.utils.logger.warn('未提供工具名称，无法查找工具卡片');
            return null;
        }

        try {
            this.app.utils.logger.debug(`开始根据名称查找工具卡片: "${toolName}"`);
            
            // 尝试多种选择器以提高鲁棒性
            const selectors = [
                // 1. 精确选择器(基于xhs_helper.user.js中验证过的逻辑)
                'div[data-v-7dfe39e8].card-box__content-title > span.d-text',
                // 2. 适用于可能混淆的选择器
                'div[class*="card-box"] div[class*="title"] span.d-text',
                // 3. 非常通用的选择器(最后尝试)
                'div[class*="card"] span.d-text',
                // 4. 极其通用的选择器(最终尝试)
                'span.d-text'
            ];
            
            // 查找所有可能的卡片标题
            for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                this.app.utils.logger.debug(`使用选择器 "${selector}" 找到 ${elements.length} 个可能的标题元素`);
                
                if (elements.length === 0) continue;
                
                // 遍历元素查找匹配项
                for (const element of elements) {
                    if (element.textContent && element.textContent.includes(toolName)) {
                        this.app.utils.logger.debug(`找到匹配工具名称的标题: "${element.textContent}"`);
                        
                        // 从标题向上查找卡片容器
                        const cardContent = element.closest('div[data-v-7dfe39e8].card-box__content') || 
                                           element.closest('div[class*="card-box"]') || 
                                           element.closest('div[class*="content"]');
                        
                        if (cardContent) {
                            this.app.utils.logger.debug(`找到工具卡片容器: ${cardContent.className}`);
                            return cardContent;
                        }
                    }
                }
            }
            
            this.app.utils.logger.warn(`未找到名称为 "${toolName}" 的工具卡片`);
            return null;
        } catch (error) {
            this.app.utils.logger.error(`查找工具卡片失败: ${error.message}`, error);
            return null;
        }
    }

    /**
     * 根据工具名称查找并返回发送按钮
     * @param {string} toolName 工具名称
     * @returns {Element|null} 发送按钮元素或null
     */
    findSendButtonByToolName(toolName) {
        if (!toolName) return null;
        
        try {
            // 1. 查找工具卡片
            const cardElement = this.findToolCardByName(toolName);
            if (!cardElement) {
                this.app.utils.logger.warn(`未找到名称为 "${toolName}" 的工具卡片，无法获取发送按钮`);
                return null;
            }
            
            // 2. 在卡片中查找发送按钮
            const selectors = [
                // 精确选择器
                'button.btn span.d-text > div.buttomContent > span.d-text',
                // 备选选择器
                'button span.d-text',
                'button[class*="btn"] span.d-text',
                // 通用按钮选择器
                'button.btn',
                'button[class*="btn"]',
                'button'
            ];
            
            for (const selector of selectors) {
                const elements = cardElement.querySelectorAll(selector);
                this.app.utils.logger.debug(`在卡片中使用选择器 "${selector}" 找到 ${elements.length} 个可能的按钮元素`);
                
                // 查找包含"发送"文本的按钮
                for (const element of elements) {
                    if (element.textContent && (
                        element.textContent.includes('发送') || 
                        element.textContent.includes('添加')
                    )) {
                        // 获取实际按钮元素
                        const button = element.closest('button') || element;
                        this.app.utils.logger.debug(`找到发送按钮: ${button.outerHTML}`);
                        return button;
                    }
                }
            }
            
            // 如果找不到明确的"发送"文本，尝试获取卡片中的最后一个按钮
            const allButtons = cardElement.querySelectorAll('button');
            if (allButtons.length > 0) {
                const lastButton = allButtons[allButtons.length - 1];
                this.app.utils.logger.debug(`未找到明确的发送按钮，使用卡片中的最后一个按钮: ${lastButton.outerHTML}`);
                return lastButton;
            }
            
            this.app.utils.logger.warn(`在工具卡片中未找到发送按钮`);
            return null;
        } catch (error) {
            this.app.utils.logger.error(`查找发送按钮失败: ${error.message}`, error);
            return null;
        }
    }

    /**
     * 记录卡片元素的HTML结构，辅助调试
     * @param {Element} element 要记录的元素
     * @param {string} context 上下文信息
     */
    captureCardElementHtml(element, context = '') {
        if (!element) {
            this.app.utils.logger.warn(`无法记录元素HTML：元素为空 (${context})`);
            return;
        }
        
        try {
            // 获取元素的简化HTML（移除冗长的内联样式）
            let html = element.outerHTML;
            
            // 如果HTML过长，则只取关键部分
            const maxLength = 500;
            if (html.length > maxLength) {
                html = html.substring(0, maxLength) + '... [截断]';
            }
            
            // 记录元素信息
            const info = {
                context: context,
                tagName: element.tagName,
                className: element.className,
                id: element.id,
                attributes: Array.from(element.attributes).map(attr => `${attr.name}="${attr.value}"`).join(', '),
                textContent: element.textContent ? 
                    (element.textContent.length > 100 ? 
                        element.textContent.substring(0, 100) + '...' : 
                        element.textContent) : 
                    '',
                childElements: element.children.length,
                html: html
            };
            
            // 记录详细信息到日志
            this.app.utils.logger.debug(`元素结构 [${context}]:`, info);
            
            return info;
        } catch (error) {
            this.app.utils.logger.warn(`记录元素HTML出错 (${context}):`, error);
        }
    }
    
    /**
     * 记录发送过程的详细状态和错误
     * @param {string} step 当前步骤
     * @param {string} status 状态信息
     * @param {Error} [error] 错误对象（可选）
     * @param {Object} [details] 额外详情（可选）
     */
    logSendStatus(step, status, error = null, details = null) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            step,
            status
        };
        
        if (error) {
            logEntry.error = {
                message: error.message,
                stack: error.stack
            };
        }
        
        if (details) {
            logEntry.details = details;
        }
        
        // 根据状态决定日志级别
        if (status.toLowerCase().includes('失败') || status.toLowerCase().includes('错误')) {
            this.app.utils.logger.error(`发送状态 [${step}]: ${status}`, logEntry);
        } else if (status.toLowerCase().includes('警告')) {
            this.app.utils.logger.warn(`发送状态 [${step}]: ${status}`, logEntry);
        } else {
            this.app.utils.logger.info(`发送状态 [${step}]: ${status}`, logEntry);
        }
        
        return logEntry;
    }
}
