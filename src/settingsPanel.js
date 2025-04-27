/**
 * 小红书私信自动回复助手 - 设置面板
 */

class SettingsPanel {
    constructor(app) {
        this.app = app;
        this.panel = null; // 设置面板元素
        this.visible = false; // 面板是否可见
        this.initialized = false; // 是否已初始化
        this.currentTab = 'general'; // 当前标签页
        this.leadSectionInitialized = false; // 获客工具设置区域是否已初始化
    }

    /**
     * 初始化设置面板
     */
    async initialize() {
        try {
            this.app.utils.logger.info('初始化设置面板');

            // 创建面板样式
            this.createStyles();

            // 创建面板DOM
            await this.createPanel();

            this.initialized = true;

            // 绑定事件
            this.bindEvents();

            return true;
        } catch (error) {
            this.app.utils.logger.error('初始化设置面板失败', error);
            return false;
        }
    }

    /**
     * 创建面板样式
     */
    createStyles() {
        const styles = `
            /* 设置面板样式 */
            .xhs-auto-reply-settings {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                z-index: 10000;
                display: none;
                justify-content: center;
                align-items: center;
                font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
            }

            .xhs-auto-reply-settings-container {
                width: 800px;
                max-width: 90%;
                max-height: 90%;
                background-color: #fff;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            /* 设置面板头部 */
            .xhs-auto-reply-settings-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                background-color: #FF2442;
                color: white;
            }

            .xhs-auto-reply-settings-title {
                font-weight: bold;
                font-size: 18px;
            }

            .xhs-auto-reply-settings-close {
                cursor: pointer;
                font-size: 20px;
            }

            /* 设置面板内容 */
            .xhs-auto-reply-settings-content {
                display: flex;
                flex: 1;
                overflow: hidden;
            }

            /* 设置面板标签页 */
            .xhs-auto-reply-settings-tabs {
                width: 200px;
                background-color: #f5f5f5;
                padding: 20px 0;
                overflow-y: auto;
            }

            .xhs-auto-reply-settings-tab {
                padding: 12px 20px;
                cursor: pointer;
                font-size: 14px;
                color: #333;
                border-left: 3px solid transparent;
            }

            .xhs-auto-reply-settings-tab:hover {
                background-color: #e8e8e8;
            }

            .xhs-auto-reply-settings-tab.active {
                background-color: #e8e8e8;
                border-left-color: #FF2442;
                font-weight: bold;
            }

            /* 设置面板表单 */
            .xhs-auto-reply-settings-form {
                flex: 1;
                padding: 20px;
                overflow-y: auto;
            }

            .xhs-auto-reply-settings-section {
                margin-bottom: 24px;
                display: none;
            }

            .xhs-auto-reply-settings-section.active {
                display: block;
            }

            .xhs-auto-reply-settings-section-title {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 16px;
                color: #333;
                border-bottom: 1px solid #eee;
                padding-bottom: 8px;
            }

            /* 设置项 */
            .xhs-auto-reply-settings-item {
                margin-bottom: 16px;
            }

            .xhs-auto-reply-settings-item-label {
                font-size: 14px;
                margin-bottom: 8px;
                display: block;
                color: #333;
            }

            .xhs-auto-reply-settings-item-description {
                font-size: 12px;
                color: #666;
                margin-top: 4px;
            }

            /* 输入框和选择框样式 */
            .xhs-auto-reply-settings-input,
            .xhs-auto-reply-settings-select,
            .xhs-auto-reply-settings-textarea {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
                box-sizing: border-box;
            }

            .xhs-auto-reply-settings-textarea {
                min-height: 100px;
                resize: vertical;
            }

            /* 设置面板底部 */
            .xhs-auto-reply-settings-footer {
                padding: 16px 20px;
                background-color: #f5f5f5;
                display: flex;
                justify-content: flex-end;
                border-top: 1px solid #eee;
            }

            .xhs-auto-reply-settings-btn {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                font-size: 14px;
                cursor: pointer;
                margin-left: 12px;
            }

            .xhs-auto-reply-settings-btn.primary {
                background-color: #FF2442;
                color: white;
            }

            .xhs-auto-reply-settings-btn.primary:hover {
                background-color: #E60033;
            }

            .xhs-auto-reply-settings-btn.secondary {
                background-color: #f0f0f0;
                color: #333;
            }

            .xhs-auto-reply-settings-btn.secondary:hover {
                background-color: #e0e0e0;
            }
        `;

        GM_addStyle(styles);
        this.app.utils.logger.debug('添加设置面板样式');
    }

    /**
     * 创建设置面板DOM
     */
    async createPanel() {
        // 1. 创建设置面板容器
        this.panel = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings'
        });

        // 2. 创建设置面板
        const container = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-container'
        });

        // 3. 创建面板头部
        const header = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-header'
        });

        const title = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-title'
        }, '小红书私信自动回复助手设置');

        const closeBtn = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-close'
        }, '×');

        header.appendChild(title);
        header.appendChild(closeBtn);

        // 4. 创建面板内容
        const content = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-content'
        });

        // 5. 创建标签页
        const tabs = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-tabs'
        });

        const tabItems = [
            { id: 'general', name: '基本设置' },
            { id: 'ai', name: 'AI设置' },
            { id: 'reply', name: '回复设置' },
            { id: 'followup', name: '追粉系统' },
            { id: 'remote', name: '远程控制' },
            { id: 'lead', name: '获客工具' },
            { id: 'keyword', name: '关键词规则' },
            { id: 'statistics', name: '统计设置' },
            { id: 'ui', name: '界面设置' }
        ];

        tabItems.forEach(tab => {
            const tabEl = this.app.utils.dom.createElement('div', {
                class: `xhs-auto-reply-settings-tab ${tab.id === this.currentTab ? 'active' : ''}`,
                'data-tab': tab.id
            }, tab.name);

            tabs.appendChild(tabEl);
        });

        // 6. 创建表单区域
        const form = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-form'
        });

        // 7. 创建各个设置区域
        this.createGeneralSection(form);
        this.createAISection(form);
        this.createReplySection(form);
        this.createFollowUpSection(form);
        this.createRemoteControlSection(form);
        this.createKeywordSection(form);
        this.createStatisticsSection(form);
        this.createUISection(form);

        // 创建获客工具设置区域的容器，但不填充内容
        // 内容将在switchTab方法中按需创建
        const leadSection = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-section ' + (this.currentTab === 'lead' ? 'active' : ''),
            id: 'xhs-auto-reply-settings-section-lead'
        });
        form.appendChild(leadSection);

        content.appendChild(tabs);
        content.appendChild(form);

        // 8. 创建底部按钮区域
        const footer = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-footer'
        });

        const resetBtn = this.app.utils.dom.createElement('button', {
            class: 'xhs-auto-reply-settings-btn secondary',
            id: 'xhs-auto-reply-settings-reset'
        }, '恢复默认设置');

        const saveBtn = this.app.utils.dom.createElement('button', {
            class: 'xhs-auto-reply-settings-btn primary',
            id: 'xhs-auto-reply-settings-save'
        }, '保存设置');

        footer.appendChild(resetBtn);
        footer.appendChild(saveBtn);

        // 9. 将所有元素添加到容器
        container.appendChild(header);
        container.appendChild(content);
        container.appendChild(footer);

        this.panel.appendChild(container);

        // 10. 添加到body
        document.body.appendChild(this.panel);

        this.app.utils.logger.debug('创建设置面板DOM');
    }

    /**
     * 创建常规设置区域
     * @param {Element} form 表单容器
     */
    createGeneralSection(form) {
        const section = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-section ' + (this.currentTab === 'general' ? 'active' : ''),
            id: 'xhs-auto-reply-settings-section-general'
        });

        const title = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-section-title'
        }, '常规设置');

        section.appendChild(title);

        // 自动启动设置
        const autoStartItem = this.createSettingItem(
            'autoStart',
            '自动启动',
            '打开页面后自动启动回复功能',
            'checkbox',
            this.app.config.getSetting('autoStart', false)
        );

        // 启用通知设置
        const enableNotificationItem = this.createSettingItem(
            'enableNotification',
            '启用通知',
            '接收到新消息时显示通知',
            'checkbox',
            this.app.config.getSetting('enableNotification', true)
        );

        section.appendChild(autoStartItem);
        section.appendChild(enableNotificationItem);

        form.appendChild(section);
    }

    /**
     * 创建AI设置区域
     * @param {Element} form 表单容器
     */
    createAISection(form) {
        const section = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-section ' + (this.currentTab === 'ai' ? 'active' : ''),
            id: 'xhs-auto-reply-settings-section-ai'
        });

        const title = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-section-title'
        }, 'AI设置');

        section.appendChild(title);

        // AI服务类型选择
        const aiServiceItem = this.createSettingItem(
            'aiService',
            'AI服务提供商',
            '选择使用的AI服务提供商',
            'select',
            this.app.config.getSetting('aiService', 'openai'),
            [
                { value: 'openai', label: 'OpenAI (ChatGPT)' },
                { value: 'fastgpt', label: 'FastGPT' }
            ]
        );

        section.appendChild(aiServiceItem);

        // 创建OpenAI设置部分
        const openaiSection = this.app.utils.dom.createElement('div', {
            class: 'openai-settings',
            style: 'margin-top: 20px; padding-top: 10px; border-top: 1px dashed #eee;'
        });

        const openaiTitle = this.app.utils.dom.createElement('div', {
            style: 'font-weight: bold; margin-bottom: 15px;'
        }, 'OpenAI设置');

        openaiSection.appendChild(openaiTitle);

        // API URL设置
        const apiUrlItem = this.createSettingItem(
            'openai.apiUrl',
            'API地址',
            'OpenAI API的地址',
            'text',
            this.app.config.getSetting('openai.apiUrl', 'https://api.openai.com/v1')
        );

        // API Key设置
        const apiKeyItem = this.createSettingItem(
            'openai.apiKey',
            'API密钥',
            'OpenAI API的密钥',
            'password',
            this.app.config.getSetting('openai.apiKey', '')
        );

        // 模型设置
        const modelItem = this.createSettingItem(
            'openai.model',
            '模型',
            '使用的OpenAI模型',
            'select',
            this.app.config.getSetting('openai.model', 'gpt-3.5-turbo'),
            [
                { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
                { value: 'gpt-4', label: 'GPT-4' },
                { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' }
            ]
        );

        // 温度设置
        const temperatureItem = this.createSettingItem(
            'openai.temperature',
            '温度值',
            '控制回复的随机性（0-1），越高越随机创造性，越低越确定',
            'range',
            this.app.config.getSetting('openai.temperature', 0.7),
            { min: 0, max: 1, step: 0.1 }
        );

        // 最大令牌数设置
        const maxTokensItem = this.createSettingItem(
            'openai.maxTokens',
            '最大生成令牌数',
            '控制回复的最大长度',
            'number',
            this.app.config.getSetting('openai.maxTokens', 500),
            { min: 100, max: 4000 }
        );

        // 系统提示词设置
        const systemPromptItem = this.createSettingItem(
            'openai.systemPrompt',
            '系统提示词',
            '指导AI如何回复的系统提示词',
            'textarea',
            this.app.config.getSetting('openai.systemPrompt', '你是一个友好的小红书助手，负责回复私信。保持回复简短、有礼貌，尽量在2-3句话内完成回复。')
        );

        openaiSection.appendChild(apiUrlItem);
        openaiSection.appendChild(apiKeyItem);
        openaiSection.appendChild(modelItem);
        openaiSection.appendChild(temperatureItem);
        openaiSection.appendChild(maxTokensItem);
        openaiSection.appendChild(systemPromptItem);

        // 创建FastGPT设置部分
        const fastgptSection = this.app.utils.dom.createElement('div', {
            class: 'fastgpt-settings',
            style: 'margin-top: 20px; padding-top: 10px; border-top: 1px dashed #eee;'
        });

        const fastgptTitle = this.app.utils.dom.createElement('div', {
            style: 'font-weight: bold; margin-bottom: 15px;'
        }, 'FastGPT设置');

        fastgptSection.appendChild(fastgptTitle);

        // FastGPT API URL设置
        const fastgptApiUrlItem = this.createSettingItem(
            'fastgpt.apiUrl',
            'API地址',
            'FastGPT API的地址',
            'text',
            this.app.config.getSetting('fastgpt.apiUrl', 'https://api.fastgpt.in/api')
        );

        // FastGPT API Key设置
        const fastgptApiKeyItem = this.createSettingItem(
            'fastgpt.apiKey',
            'API密钥',
            'FastGPT API的密钥',
            'password',
            this.app.config.getSetting('fastgpt.apiKey', '')
        );

        // FastGPT温度设置
        const fastgptTemperatureItem = this.createSettingItem(
            'fastgpt.temperature',
            '温度值',
            '控制回复的随机性（0-1），越高越随机创造性，越低越确定',
            'range',
            this.app.config.getSetting('fastgpt.temperature', 0.7),
            { min: 0, max: 1, step: 0.1 }
        );

        // FastGPT最大令牌数设置
        const fastgptMaxTokensItem = this.createSettingItem(
            'fastgpt.maxTokens',
            '最大生成令牌数',
            '控制回复的最大长度',
            'number',
            this.app.config.getSetting('fastgpt.maxTokens', 500),
            { min: 100, max: 4000 }
        );

        // FastGPT系统提示词设置
        const fastgptSystemPromptItem = this.createSettingItem(
            'fastgpt.systemPrompt',
            '系统提示词',
            '指导AI如何回复的系统提示词',
            'textarea',
            this.app.config.getSetting('fastgpt.systemPrompt', '你是一个友好的小红书助手，负责回复私信。保持回复简短、有礼貌，尽量在2-3句话内完成回复。')
        );

        fastgptSection.appendChild(fastgptApiUrlItem);
        fastgptSection.appendChild(fastgptApiKeyItem);
        fastgptSection.appendChild(fastgptTemperatureItem);
        fastgptSection.appendChild(fastgptMaxTokensItem);
        fastgptSection.appendChild(fastgptSystemPromptItem);

        section.appendChild(openaiSection);
        section.appendChild(fastgptSection);

        // 添加事件监听器，根据所选AI服务显示/隐藏对应的设置部分
        const aiServiceSelect = aiServiceItem.querySelector('select');
        if (aiServiceSelect) {
            aiServiceSelect.addEventListener('change', (event) => {
                const selectedService = event.target.value;
                if (selectedService === 'openai') {
                    openaiSection.style.display = 'block';
                    fastgptSection.style.display = 'none';
                } else if (selectedService === 'fastgpt') {
                    openaiSection.style.display = 'none';
                    fastgptSection.style.display = 'block';
                }
            });

            // 初始化显示状态
            const initialService = this.app.config.getSetting('aiService', 'openai');
            if (initialService === 'openai') {
                openaiSection.style.display = 'block';
                fastgptSection.style.display = 'none';
            } else if (initialService === 'fastgpt') {
                openaiSection.style.display = 'none';
                fastgptSection.style.display = 'block';
            }
        }

        // --- AI 获客决策设置 ---
        const leadGenSeparator = this.app.utils.dom.createElement('hr', { style: 'margin: 20px 0;' });
        section.appendChild(leadGenSeparator);

        const leadGenTitle = this.app.utils.dom.createElement('h3', {
            style: 'font-size: 15px; font-weight: bold; margin-bottom: 15px; color: #555;'
        }, 'AI 获客决策设置');
        section.appendChild(leadGenTitle);

        // 启用 AI 获客决策
        const leadGenEnabledItem = this.createSettingItem(
            'aiLeadGeneration.enabled',
            '启用 AI 获客决策',
            '使用 AI 判断是否发送获客工具',
            'checkbox',
            this.app.config.getSetting('aiLeadGeneration.enabled', false)
        );
        section.appendChild(leadGenEnabledItem);

        // AI 服务 (目前固定为 OpenAI)
        const leadGenServiceItem = this.createSettingItem(
            'aiLeadGeneration.service',
            'AI 服务',
            '选择用于获客决策的 AI 服务',
            'select',
            this.app.config.getSetting('aiLeadGeneration.service', 'openai'),
            [
                { value: 'openai', label: 'OpenAI' } // 目前仅支持 OpenAI
                // 未来可扩展其他服务
            ]
        );
        section.appendChild(leadGenServiceItem);

        // API Key
        const leadGenApiKeyItem = this.createSettingItem(
            'aiLeadGeneration.apiKey',
            'API 密钥',
            '获客决策 AI 服务的 API 密钥',
            'password',
            this.app.config.getSetting('aiLeadGeneration.apiKey', '')
        );
        section.appendChild(leadGenApiKeyItem);

        // API URL
        const leadGenApiUrlItem = this.createSettingItem(
            'aiLeadGeneration.apiUrl',
            'API 地址',
            '获客决策 AI 服务的 API 地址',
            'text',
            this.app.config.getSetting('aiLeadGeneration.apiUrl', 'https://api.openai.com/v1')
        );
        section.appendChild(leadGenApiUrlItem);

        // 模型
        const leadGenModelItem = this.createSettingItem(
            'aiLeadGeneration.model',
            '模型',
            '选择用于获客决策的 AI 模型',
            'select',
            this.app.config.getSetting('aiLeadGeneration.model', 'gpt-3.5-turbo'),
            [
                { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
                { value: 'gpt-4', label: 'GPT-4' },
                { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' }
                // 可以添加更多模型选项
            ]
        );
        section.appendChild(leadGenModelItem);

        // 系统提示词
        const leadGenSystemPromptItem = this.createSettingItem(
            'aiLeadGeneration.systemPrompt',
            '系统提示词 (获客决策)',
            '指导 AI 如何进行获客决策的系统提示词。占位符 {toolList} 会被替换为可用工具列表。',
            'textarea',
            this.app.config.getSetting('aiLeadGeneration.systemPrompt', '你是一个小红书获客助手。基于用户对话历史和当前消息，判断是否是发送获客工具（如留资卡、名片）的合适时机和对象。你的目标是提高转化率，避免打扰用户。请分析用户意图、对话阶段和潜在价值。可用工具有：[{toolList}]。请以 JSON 格式输出你的决策，包含字段：shouldSend (boolean), reason (string), toolType (string, 从可用工具类型中选择), toolIndex (number, 对应类型工具的索引), generatedText (string, 可选的补充文本), confidenceScore (number, 0-1)。')
        );
        section.appendChild(leadGenSystemPromptItem);

        // 置信度阈值
        const leadGenConfidenceThresholdItem = this.createSettingItem(
            'aiLeadGeneration.confidenceThreshold',
            '置信度阈值',
            'AI 判断结果的置信度高于此阈值时才触发发送 (0-1)',
            'range',
            this.app.config.getSetting('aiLeadGeneration.confidenceThreshold', 0.7),
            { min: 0, max: 1, step: 0.1 }
        );
        section.appendChild(leadGenConfidenceThresholdItem);

        // 最大频率
        const leadGenMaxFrequencyItem = this.createSettingItem(
            'aiLeadGeneration.maxFrequencyMinutes',
            '最小发送间隔 (分钟)',
            '同一用户两次发送获客消息的最小间隔时间',
            'number',
            this.app.config.getSetting('aiLeadGeneration.maxFrequencyMinutes', 60),
            { min: 0 }
        );
        section.appendChild(leadGenMaxFrequencyItem);

        // 允许生成补充文本
        const leadGenAllowGenerateTextItem = this.createSettingItem(
            'aiLeadGeneration.allowGenerateText',
            '允许 AI 生成补充文本',
            '允许 AI 在发送获客工具时生成额外的补充说明文本',
            'checkbox',
            this.app.config.getSetting('aiLeadGeneration.allowGenerateText', false)
        );
        section.appendChild(leadGenAllowGenerateTextItem);

        // 回退到关键词
        const leadGenFallbackToKeywordsItem = this.createSettingItem(
            'aiLeadGeneration.fallbackToKeywords',
            'AI 失败时回退到关键词规则',
            '当 AI 判断失败或置信度不足时，是否使用关键词规则进行获客判断',
            'checkbox',
            this.app.config.getSetting('aiLeadGeneration.fallbackToKeywords', true)
        );
        section.appendChild(leadGenFallbackToKeywordsItem);

        // 新增：固定获客消息/工具设置
        const fixedLeadGenMessageItem = this.createSettingItem(
            'aiLeadGeneration.fixedLeadGenMessage',
            '固定获客消息/工具',
            '当 AI 决定发送时，使用的固定消息或工具。格式: "类型-标识符" (例如: "名片-主名片" 或 "留资卡-0")',
            'text',
            this.app.config.getSetting('aiLeadGeneration.fixedLeadGenMessage', '')
        );
        section.appendChild(fixedLeadGenMessageItem);

        form.appendChild(section);
    }

    /**
     * 创建回复设置区域
     * @param {Element} form 表单容器
     */
    createReplySection(form) {
        const section = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-section ' + (this.currentTab === 'reply' ? 'active' : ''),
            id: 'xhs-auto-reply-settings-section-reply'
        });

        const title = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-section-title'
        }, '回复设置');

        section.appendChild(title);

        // 最大历史消息数设置
        const maxHistoryMessagesItem = this.createSettingItem(
            'reply.maxHistoryMessages',
            '最大历史消息数',
            '记忆的最大历史消息数，用于AI回复时提供上下文',
            'number',
            this.app.config.getSetting('reply.maxHistoryMessages', 10),
            { min: 0, max: 50 }
        );

        // 自动回复延迟设置
        const minDelayItem = this.createSettingItem(
            'reply.autoReplyDelay.0',
            '最小回复延迟(毫秒)',
            '自动回复的最小延迟时间，模拟人工回复',
            'number',
            this.app.config.getSetting('reply.autoReplyDelay', [1000, 3000])[0],
            { min: 0, max: 10000, step: 100 }
        );

        const maxDelayItem = this.createSettingItem(
            'reply.autoReplyDelay.1',
            '最大回复延迟(毫秒)',
            '自动回复的最大延迟时间，模拟人工回复',
            'number',
            this.app.config.getSetting('reply.autoReplyDelay', [1000, 3000])[1],
            { min: 0, max: 10000, step: 100 }
        );

        // 每日最大回复次数设置
        const maxRepliesPerDayItem = this.createSettingItem(
            'reply.maxRepliesPerDay',
            '每日最大回复次数',
            '每天允许的最大回复次数，防止过度使用',
            'number',
            this.app.config.getSetting('reply.maxRepliesPerDay', 100),
            { min: 1, max: 1000 }
        );

        // 每用户每日最大回复次数设置
        const maxRepliesPerUserItem = this.createSettingItem(
            'reply.maxRepliesPerUser',
            '每用户每日最大回复次数',
            '每个用户每天允许的最大回复次数，防止过度回复同一用户',
            'number',
            this.app.config.getSetting('reply.maxRepliesPerUser', 10),
            { min: 1, max: 100 }
        );

        // 工作时间启用设置
        const workingHoursEnabledItem = this.createSettingItem(
            'reply.workingHours.enabled',
            '启用工作时间',
            '只在设定的工作时间内回复',
            'checkbox',
            this.app.config.getSetting('reply.workingHours.enabled', false)
        );

        // 工作开始时间设置
        const workingHoursStartItem = this.createSettingItem(
            'reply.workingHours.startTime',
            '工作开始时间',
            '每天开始回复的时间',
            'time',
            this.app.config.getSetting('reply.workingHours.startTime', '09:00')
        );

        // 工作结束时间设置
        const workingHoursEndItem = this.createSettingItem(
            'reply.workingHours.endTime',
            '工作结束时间',
            '每天停止回复的时间',
            'time',
            this.app.config.getSetting('reply.workingHours.endTime', '21:00')
        );

        // 忽略客资标签设置
        const ignoreLeadTagsItem = this.createSettingItem(
            'reply.ignoreLeadTags',
            '忽略客资标签',
            '忽略带有客资标签（如无意向、留客资）的客户，只回复精准客资',
            'checkbox',
            this.app.config.getSetting('reply.ignoreLeadTags', false)
        );

        section.appendChild(maxHistoryMessagesItem);
        section.appendChild(minDelayItem);
        section.appendChild(maxDelayItem);
        section.appendChild(maxRepliesPerDayItem);
        section.appendChild(maxRepliesPerUserItem);
        section.appendChild(ignoreLeadTagsItem);
        section.appendChild(workingHoursEnabledItem);
        section.appendChild(workingHoursStartItem);
        section.appendChild(workingHoursEndItem);

        form.appendChild(section);
    }

    /**
     * 创建统计设置区域
     * @param {Element} form 表单容器
     */
    createStatisticsSection(form) {
        const section = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-section ' + (this.currentTab === 'statistics' ? 'active' : ''),
            id: 'xhs-auto-reply-settings-section-statistics'
        });

        const title = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-section-title'
        }, '统计设置');

        section.appendChild(title);

        // 启用统计设置
        const enabledItem = this.createSettingItem(
            'statistics.enabled',
            '启用统计',
            '记录和统计回复相关数据',
            'checkbox',
            this.app.config.getSetting('statistics.enabled', true)
        );

        // 跟踪关键词命中设置
        const trackKeywordsItem = this.createSettingItem(
            'statistics.trackKeywords',
            '跟踪关键词命中',
            '记录每个关键词规则的命中次数',
            'checkbox',
            this.app.config.getSetting('statistics.trackKeywords', true)
        );

        // 保存历史记录设置
        const saveHistoryItem = this.createSettingItem(
            'statistics.saveHistory',
            '保存历史记录',
            '保存消息历史记录',
            'checkbox',
            this.app.config.getSetting('statistics.saveHistory', true)
        );

        section.appendChild(enabledItem);
        section.appendChild(trackKeywordsItem);
        section.appendChild(saveHistoryItem);

        form.appendChild(section);
    }

    /**
     * 创建UI设置区域
     * @param {Element} form 表单容器
     */
    createUISection(form) {
        const section = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-section ' + (this.currentTab === 'ui' ? 'active' : ''),
            id: 'xhs-auto-reply-settings-section-ui'
        });

        const title = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-section-title'
        }, '界面设置');

        section.appendChild(title);

        // 主题设置
        const themeItem = this.createSettingItem(
            'ui.theme',
            '主题',
            '选择界面主题',
            'select',
            this.app.config.getSetting('ui.theme', 'light'),
            [
                { value: 'light', label: '浅色主题' },
                { value: 'dark', label: '深色主题' }
            ]
        );

        // 悬浮面板位置设置
        const floatingPanelPositionItem = this.createSettingItem(
            'ui.floatingPanelPosition',
            '悬浮面板位置',
            '控制面板在屏幕上的位置',
            'select',
            this.app.config.getSetting('ui.floatingPanelPosition', 'bottom-right'),
            [
                { value: 'top-left', label: '左上角' },
                { value: 'top-right', label: '右上角' },
                { value: 'bottom-left', label: '左下角' },
                { value: 'bottom-right', label: '右下角' }
            ]
        );

        // 显示统计按钮设置
        const showStatisticsButtonItem = this.createSettingItem(
            'ui.showStatisticsButton',
            '显示统计按钮',
            '在控制面板上显示统计按钮',
            'checkbox',
            this.app.config.getSetting('ui.showStatisticsButton', true)
        );

        section.appendChild(themeItem);
        section.appendChild(floatingPanelPositionItem);
        section.appendChild(showStatisticsButtonItem);

        form.appendChild(section);
    }

    /**
     * 创建获客工具设置区域
     * @param {Element} sectionContainer 获客工具设置区域的容器元素
     */
    createLeadGenerationSection(sectionContainer) {
        this.app.utils.logger.debug('Creating lead generation section UI via LeadGenerationHandler');

        // 调用 LeadGenerationHandler 创建基础 UI
        let baseUiCreated = false;
        if (this.app.leadGeneration && typeof this.app.leadGeneration.createLeadGenerationSection === 'function') {
            try {
                // 调用 LeadGenerationHandler 中的方法来创建完整的 UI
                // 所有获客工具相关设置（包括默认工具选择器）统一由 LeadGenerationHandler 处理
                // 这样可以避免在面板中显示重复的获客工具设置
                this.app.leadGeneration.createLeadGenerationSection(sectionContainer);
                this.app.utils.logger.debug('Successfully called LeadGenerationHandler.createLeadGenerationSection');
                baseUiCreated = true;
            } catch (error) {
                this.app.utils.logger.error('Error calling LeadGenerationHandler.createLeadGenerationSection:', error);
                const errorNotice = this.app.utils.dom.createElement('div', { style: 'color: red; margin: 20px 0;' }, '加载获客工具设置 UI 时出错。');
                sectionContainer.appendChild(errorNotice);
            }
        } else {
            // 获客工具模块未初始化或方法不存在
            this.app.utils.logger.error('LeadGenerationHandler or its createLeadGenerationSection method is not available.');
            const notice = this.app.utils.dom.createElement('div', {
                style: 'color: #999; font-style: italic; margin: 20px 0;'
            }, '错误：获客工具模块未能正确加载。');
            sectionContainer.appendChild(notice);
        }
    }

    /**
     * 创建关键词规则设置区域
     * @param {Element} form 表单容器
     */
    createKeywordSection(form) {
        const section = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-section ' + (this.currentTab === 'keyword' ? 'active' : ''),
            id: 'xhs-auto-reply-settings-section-keyword'
        });

        const title = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-section-title'
        }, '关键词规则设置');

        section.appendChild(title);

        // 添加占位符或调用 KeywordRuleManager 来构建UI
        const placeholder = this.app.utils.dom.createElement('div', {
            style: 'padding: 10px; background-color: #f8f8f8; border-radius: 4px; font-size: 14px;'
        }, '关键词规则配置界面将在此处显示。'); // 临时占位符

        section.appendChild(placeholder);

        // 实际实现可能需要调用 this.app.keywordRuleManager.createSettingsUI(section) 等

        form.appendChild(section);
    }

    /**
     * 创建追粉系统设置区域
     * @param {Element} form 表单容器
     */
    createFollowUpSection(form) {
        const section = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-section ' + (this.currentTab === 'followup' ? 'active' : ''),
            id: 'xhs-auto-reply-settings-section-followup'
        });

        const title = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-section-title'
        }, '追粉系统设置');

        section.appendChild(title);

        // 追粉系统是否启用
        const enabledItem = this.createSettingItem(
            'followUp.enabled',
            '启用追粉系统',
            '启用后会根据设置的规则自动向未回复或未留联系方式的用户发送私信',
            'checkbox',
            this.app.config.getSetting('followUp.enabled', false)
        );
        section.appendChild(enabledItem);

        // 追粉系统检查间隔
        const checkIntervalItem = this.createSettingItem(
            'followUp.checkInterval',
            '检查间隔(小时)',
            '多长时间检查一次需要追踪的用户，建议设置为1-24小时',
            'number',
            this.app.config.getSetting('followUp.checkInterval', 2)
        );
        section.appendChild(checkIntervalItem);

        // 每日上限
        const dailyLimitItem = this.createSettingItem(
            'followUp.dailyLimit',
            '每日追粉上限',
            '每天最多发送的追粉消息数量',
            'number',
            this.app.config.getSetting('followUp.dailyLimit', 50)
        );
        section.appendChild(dailyLimitItem);

        // 每用户每日上限
        const maxPerContactItem = this.createSettingItem(
            'followUp.maxDailyPerContact',
            '每用户每日上限',
            '每个用户每天最多发送的追粉消息数量',
            'number',
            this.app.config.getSetting('followUp.maxDailyPerContact', 1)
        );
        section.appendChild(maxPerContactItem);

        // 工作时间设置
        const workingHoursEnabledItem = this.createSettingItem(
            'followUp.workingHours.enabled',
            '启用工作时间限制',
            '只在指定的时间段内发送追粉消息',
            'checkbox',
            this.app.config.getSetting('followUp.workingHours.enabled', true)
        );
        section.appendChild(workingHoursEnabledItem);

        // 工作开始时间
        const workingHoursStartItem = this.createSettingItem(
            'followUp.workingHours.startTime',
            '工作开始时间',
            '格式: HH:MM, 24小时制',
            'time',
            this.app.config.getSetting('followUp.workingHours.startTime', '09:00')
        );
        section.appendChild(workingHoursStartItem);

        // 工作结束时间
        const workingHoursEndItem = this.createSettingItem(
            'followUp.workingHours.endTime',
            '工作结束时间',
            '格式: HH:MM, 24小时制',
            'time',
            this.app.config.getSetting('followUp.workingHours.endTime', '18:00')
        );
        section.appendChild(workingHoursEndItem);

        // 无回复追粉设置
        const noResponseTitle = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-section-subtitle',
            style: 'font-weight: bold; margin-top: 20px; margin-bottom: 10px; padding-top: 15px; border-top: 1px dashed #eee;'
        }, '无回复追粉设置');
        section.appendChild(noResponseTitle);

        // 是否启用无回复追粉
        const noResponseEnabledItem = this.createSettingItem(
            'followUp.noResponseSettings.enabled',
            '启用无回复追粉',
            '向未回复你消息的用户自动发送追踪消息',
            'checkbox',
            this.app.config.getSetting('followUp.noResponseSettings.enabled', false)
        );
        section.appendChild(noResponseEnabledItem);

        // 无回复追踪间隔
        const noResponseIntervalItem = this.createSettingItem(
            'followUp.noResponseSettings.interval',
            '追踪间隔(小时)',
            '首次发送消息后多久检查回复并发送追踪消息',
            'number',
            this.app.config.getSetting('followUp.noResponseSettings.interval', 24)
        );
        section.appendChild(noResponseIntervalItem);

        // 最大追踪次数
        const noResponseMaxFollowupsItem = this.createSettingItem(
            'followUp.noResponseSettings.maxFollowups',
            '最大追踪次数',
            '对同一用户最多发送几次追踪消息',
            'number',
            this.app.config.getSetting('followUp.noResponseSettings.maxFollowups', 3)
        );
        section.appendChild(noResponseMaxFollowupsItem);

        // 追踪模板
        this.createNoResponseTemplateItems(section);

        // 无联系方式追粉设置
        const noContactTitle = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-section-subtitle',
            style: 'font-weight: bold; margin-top: 20px; margin-bottom: 10px; padding-top: 15px; border-top: 1px dashed #eee;'
        }, '未留客资追粉设置');
        section.appendChild(noContactTitle);

        // 是否启用无联系方式追粉
        const noContactEnabledItem = this.createSettingItem(
            'followUp.noContactSettings.enabled',
            '启用未留客资追粉',
            '向已开口但未留下客资信息(未含客资标签)的用户自动发送追踪消息',
            'checkbox',
            this.app.config.getSetting('followUp.noContactSettings.enabled', false)
        );
        section.appendChild(noContactEnabledItem);

        // 无联系方式追踪间隔
        const noContactIntervalItem = this.createSettingItem(
            'followUp.noContactSettings.interval',
            '追踪间隔(小时)',
            '首次交流后多久检查是否留有客资信息并发送追踪消息',
            'number',
            this.app.config.getSetting('followUp.noContactSettings.interval', 24)
        );
        section.appendChild(noContactIntervalItem);

        // 最大追踪次数
        const noContactMaxFollowupsItem = this.createSettingItem(
            'followUp.noContactSettings.maxFollowups',
            '最大追踪次数',
            '对同一用户最多发送几次追踪消息',
            'number',
            this.app.config.getSetting('followUp.noContactSettings.maxFollowups', 3)
        );
        section.appendChild(noContactMaxFollowupsItem);

        // 联系方式识别关键词 (保留但说明已不再使用)
        const contactKeywordsItem = this.createSettingItem(
            'followUp.contactKeywords',
            '联系方式识别关键词 (已不再使用)',
            '系统现已改为使用客资标签判断，此设置已不再生效',
            'textarea',
            this.app.config.getSetting('followUp.contactKeywords', 'qq,微信,电话,手机,vx,wx,v信,tel,phone,号码,加我,联系方式')
        );
        section.appendChild(contactKeywordsItem);

        // 追踪模板
        this.createNoContactTemplateItems(section);

        form.appendChild(section);
    }

    /**
     * 创建远程控制设置区域
     * @param {Element} form 表单容器
     */
    createRemoteControlSection(form) {
        const section = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-section ' + (this.currentTab === 'remote' ? 'active' : ''),
            id: 'xhs-auto-reply-settings-section-remote'
        });

        const title = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-section-title'
        }, '远程控制设置');

        section.appendChild(title);

        // 启用远程控制
        const enabledItem = this.createSettingItem(
            'remoteControl.enabled',
            '启用远程控制',
            '启用后可以通过远程配置控制脚本的行为',
            'checkbox',
            this.app.config.getSetting('remoteControl.enabled', false)
        );
        section.appendChild(enabledItem);

        // 远程配置URL
        const configUrlItem = this.createSettingItem(
            'remoteControl.configUrl',
            '远程配置URL',
            '远程配置文件的URL地址，需要返回JSON格式',
            'text',
            this.app.config.getSetting('remoteControl.configUrl', '')
        );
        section.appendChild(configUrlItem);

        // 检查间隔
        const checkIntervalItem = this.createSettingItem(
            'remoteControl.checkInterval',
            '检查间隔(毫秒)',
            '多久检查一次远程配置，单位为毫秒，建议设置为5分钟以上(300000)',
            'number',
            this.app.config.getSetting('remoteControl.checkInterval', 300000)
        );
        section.appendChild(checkIntervalItem);

        // 状态信息
        const statusTitle = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-section-subtitle',
            style: 'font-weight: bold; margin-top: 20px; margin-bottom: 10px; padding-top: 15px; border-top: 1px dashed #eee;'
        }, '远程控制状态');
        section.appendChild(statusTitle);

        // 当前状态
        const currentStatus = this.app.config.getSetting('remoteControl.status', {
            enabled: true,
            message: '',
            lastUpdated: null
        });

        const statusEnabledText = currentStatus.enabled ? '启用' : '禁用';
        const statusItem = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-item'
        }, `<div class="xhs-auto-reply-settings-item-label">当前状态: <span style="color: ${currentStatus.enabled ? 'green' : 'red'};">${statusEnabledText}</span></div>`);
        section.appendChild(statusItem);

        // 状态消息
        if (currentStatus.message) {
            const messageItem = this.app.utils.dom.createElement('div', {
                class: 'xhs-auto-reply-settings-item'
            }, `<div class="xhs-auto-reply-settings-item-label">状态消息: ${currentStatus.message}</div>`);
            section.appendChild(messageItem);
        }

        // 上次更新时间
        if (currentStatus.lastUpdated) {
            const lastUpdatedItem = this.app.utils.dom.createElement('div', {
                class: 'xhs-auto-reply-settings-item'
            }, `<div class="xhs-auto-reply-settings-item-label">上次更新: ${new Date(currentStatus.lastUpdated).toLocaleString()}</div>`);
            section.appendChild(lastUpdatedItem);
        }

        // 手动刷新按钮
        const refreshBtnContainer = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-item',
            style: 'margin-top: 15px;'
        });

        const refreshBtn = this.app.utils.dom.createElement('button', {
            class: 'xhs-auto-reply-settings-btn secondary',
            id: 'xhs-auto-reply-settings-remote-refresh',
            style: 'margin-left: 0;'
        }, '立即检查远程配置');

        refreshBtnContainer.appendChild(refreshBtn);
        section.appendChild(refreshBtnContainer);

        form.appendChild(section);
        return section;
    }

    /**
     * 创建未开口用户追粉模板设置项
     * @param {Element} section 设置区域容器
     */
    createNoResponseTemplateItems(section) {
        const templates = this.app.config.getSetting('followUp.noResponseSettings.templates', []);
        
        // 模板容器
        const templatesContainer = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-templates-container',
            id: 'no-response-templates-container',
            style: 'margin-top: 20px;'
        });
        
        // 模板标题
        const templatesTitle = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-item-label'
        }, '未开口用户追粉消息模板');
        templatesContainer.appendChild(templatesTitle);
        
        // 模板说明
        const templatesDesc = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-item-description'
        }, '不同追粉次数对应的消息模板，可根据需要修改');
        templatesContainer.appendChild(templatesDesc);
        
        // 创建模板输入区域
        const maxCount = Math.max(3, templates.length);
        for (let i = 0; i < maxCount; i++) {
            const template = templates[i] || { order: i + 1, message: '' };
            
            const templateContainer = this.app.utils.dom.createElement('div', {
                class: 'xhs-auto-reply-settings-template-item',
                style: 'margin-top: 10px; padding: 10px; border: 1px solid #eee; border-radius: 4px;'
            });
            
            const templateTitle = this.app.utils.dom.createElement('div', {
                class: 'xhs-auto-reply-settings-item-label'
            }, `第 ${i + 1} 次追粉消息`);
            templateContainer.appendChild(templateTitle);
            
            const templateInput = this.app.utils.dom.createElement('textarea', {
                class: 'xhs-auto-reply-settings-textarea',
                id: `xhs-auto-reply-settings-followUp-noResponseSettings-templates-${i}`,
                'data-key': `followUp.noResponseSettings.templates[${i}].message`,
                'data-order': i + 1
            });
            templateInput.value = template.message || '';
            templateContainer.appendChild(templateInput);
            
            templatesContainer.appendChild(templateContainer);
        }
        
        section.appendChild(templatesContainer);
    }

    /**
     * 创建未留客资追粉模板设置项
     * @param {Element} section 设置区域容器
     */
    createNoContactTemplateItems(section) {
        const templates = this.app.config.getSetting('followUp.noContactSettings.templates', []);
        
        // 模板容器
        const templatesContainer = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-templates-container',
            id: 'no-contact-templates-container',
            style: 'margin-top: 20px;'
        });
        
        // 模板标题
        const templatesTitle = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-item-label'
        }, '未留客资用户追粉消息模板');
        templatesContainer.appendChild(templatesTitle);
        
        // 模板说明
        const templatesDesc = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-item-description'
        }, '不同追粉次数对应的消息模板，可根据需要修改');
        templatesContainer.appendChild(templatesDesc);
        
        // 创建模板输入区域
        const maxCount = Math.max(5, templates.length);
        for (let i = 0; i < maxCount; i++) {
            const template = templates[i] || { order: i + 1, message: '' };
            
            const templateContainer = this.app.utils.dom.createElement('div', {
                class: 'xhs-auto-reply-settings-template-item',
                style: 'margin-top: 10px; padding: 10px; border: 1px solid #eee; border-radius: 4px;'
            });
            
            const templateTitle = this.app.utils.dom.createElement('div', {
                class: 'xhs-auto-reply-settings-item-label'
            }, `第 ${i + 1} 次追粉消息`);
            templateContainer.appendChild(templateTitle);
            
            const templateInput = this.app.utils.dom.createElement('textarea', {
                class: 'xhs-auto-reply-settings-textarea',
                id: `xhs-auto-reply-settings-followUp-noContactSettings-templates-${i}`,
                'data-key': `followUp.noContactSettings.templates[${i}].message`,
                'data-order': i + 1
            });
            templateInput.value = template.message || '';
            templateContainer.appendChild(templateInput);
            
            templatesContainer.appendChild(templateContainer);
        }
        
        section.appendChild(templatesContainer);
    }

    /**
     * 创建设置项
     * @param {string} key 设置键
     * @param {string} label 标签文本
     * @param {string} description 描述文本
     * @param {string} type 控件类型
     * @param {*} value 当前值
     * @param {*} options 可选项
     * @returns {Element} 设置项元素
     */
    createSettingItem(key, label, description, type, value, options = null) {
        const item = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-item'
        });

        const labelEl = this.app.utils.dom.createElement('label', {
            class: 'xhs-auto-reply-settings-item-label',
            for: `xhs-auto-reply-settings-${key.replace(/\./g, '-')}`
        }, label);

        item.appendChild(labelEl);

        let control;

        switch (type) {
            case 'text':
            case 'password':
            case 'number':
            case 'time':
                control = this.app.utils.dom.createElement('input', {
                    class: 'xhs-auto-reply-settings-input',
                    type: type,
                    id: `xhs-auto-reply-settings-${key.replace(/\./g, '-')}`,
                    'data-key': key,
                    value: value || ''
                });

                if (type === 'number' && options) {
                    if (options.min !== undefined) control.setAttribute('min', options.min);
                    if (options.max !== undefined) control.setAttribute('max', options.max);
                    if (options.step !== undefined) control.setAttribute('step', options.step);
                }
                break;

            case 'checkbox':
                control = this.app.utils.dom.createElement('input', {
                    type: 'checkbox',
                    id: `xhs-auto-reply-settings-${key.replace(/\./g, '-')}`,
                    'data-key': key,
                    checked: value ? 'checked' : ''
                });
                break;

            case 'select':
                control = this.app.utils.dom.createElement('select', {
                    class: 'xhs-auto-reply-settings-select',
                    id: `xhs-auto-reply-settings-${key.replace(/\./g, '-')}`,
                    'data-key': key
                });

                if (options && Array.isArray(options)) {
                    options.forEach(option => {
                        const optionEl = this.app.utils.dom.createElement('option', {
                            value: option.value
                        }, option.label);

                        if (option.value === value) {
                            optionEl.setAttribute('selected', 'selected');
                        }

                        control.appendChild(optionEl);
                    });
                }
                break;

            case 'textarea':
                control = this.app.utils.dom.createElement('textarea', {
                    class: 'xhs-auto-reply-settings-textarea',
                    id: `xhs-auto-reply-settings-${key.replace(/\./g, '-')}`,
                    'data-key': key
                }, value || '');
                break;

            case 'range':
                control = this.app.utils.dom.createElement('input', {
                    type: 'range',
                    id: `xhs-auto-reply-settings-${key.replace(/\./g, '-')}`,
                    'data-key': key,
                    value: value || 0,
                    min: options && options.min !== undefined ? options.min : 0,
                    max: options && options.max !== undefined ? options.max : 1,
                    step: options && options.step !== undefined ? options.step : 0.1
                });
                break;

            default:
                control = this.app.utils.dom.createElement('input', {
                    class: 'xhs-auto-reply-settings-input',
                    type: 'text',
                    id: `xhs-auto-reply-settings-${key.replace(/\./g, '-')}`,
                    'data-key': key,
                    value: value || ''
                });
        }

        item.appendChild(control);

        if (description) {
            const descEl = this.app.utils.dom.createElement('div', {
                class: 'xhs-auto-reply-settings-item-description'
            }, description);

            item.appendChild(descEl);
        }

        return item;
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 标签切换事件
        const tabs = this.panel.querySelectorAll('.xhs-auto-reply-settings-tab');
        tabs.forEach(tab => {
            this.app.utils.dom.addEvent(tab, 'click', () => {
                const tabId = tab.getAttribute('data-tab');
                this.switchTab(tabId);
            });
        });

        // 关闭按钮点击事件
        const closeBtn = this.panel.querySelector('.xhs-auto-reply-settings-close');
        if (closeBtn) {
            this.app.utils.dom.addEvent(closeBtn, 'click', () => {
                this.hide();
            });
        }

        // 保存按钮点击事件
        const saveBtn = document.getElementById('xhs-auto-reply-settings-save');
        if (saveBtn) {
            this.app.utils.dom.addEvent(saveBtn, 'click', async () => {
                await this.saveSettings();
            });
        }

        // 重置按钮点击事件
        const resetBtn = document.getElementById('xhs-auto-reply-settings-reset');
        if (resetBtn) {
            this.app.utils.dom.addEvent(resetBtn, 'click', async () => {
                if (confirm('确定要恢复所有设置到默认值吗？此操作不可撤销。')) {
                    await this.resetSettings();
                }
            });
        }

        // 远程控制立即检查按钮点击事件
        const remoteCheckBtn = document.getElementById('xhs-auto-reply-remote-check-btn');
        if (remoteCheckBtn && this.app.remoteController) {
            remoteCheckBtn.addEventListener('click', async () => {
                // 由于按钮已设为禁用状态，此事件处理函数实际上不会被触发
                // 保留代码逻辑但不会执行
                remoteCheckBtn.disabled = true;
                remoteCheckBtn.textContent = '检查中...';
                
                try {
                    await this.app.remoteController.checkRemoteConfig();
                    remoteCheckBtn.textContent = '检查完成';
                    
                    // 重新加载远程控制设置区域，显示最新状态
                    const remoteSection = document.getElementById('xhs-auto-reply-settings-section-remote');
                    if (remoteSection) {
                        const newSection = this.createRemoteControlSection(remoteSection.parentElement);
                        remoteSection.parentElement.replaceChild(newSection, remoteSection);
                    }
                    
                    setTimeout(() => {
                        if (remoteCheckBtn) {
                            remoteCheckBtn.disabled = true; // 保持禁用状态
                            remoteCheckBtn.textContent = '立即检查';
                        }
                    }, 2000);
                } catch (error) {
                    this.app.utils.logger.error('手动检查远程配置失败', error);
                    remoteCheckBtn.textContent = '检查失败';
                    
                    setTimeout(() => {
                        if (remoteCheckBtn) {
                            remoteCheckBtn.disabled = true; // 保持禁用状态
                            remoteCheckBtn.textContent = '立即检查';
                        }
                    }, 2000);
                }
            });
        }
    }

    /**
     * 切换标签页
     * @param {string} tabId 标签页ID
     */
    switchTab(tabId) {
        // 更新当前标签
        this.currentTab = tabId;

        // 更新标签样式
        const tabs = this.panel.querySelectorAll('.xhs-auto-reply-settings-tab');
        tabs.forEach(tab => {
            if (tab.getAttribute('data-tab') === tabId) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // 更新内容显示
        const sections = this.panel.querySelectorAll('.xhs-auto-reply-settings-section');
        sections.forEach(section => {
            if (section.id === `xhs-auto-reply-settings-section-${tabId}`) {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });

        // 特殊处理获客工具设置区域
        if (tabId === 'lead') {
            // 如果当前是获客工具标签页，并且获客工具设置区域不存在，则创建它
            const leadSection = this.panel.querySelector('#xhs-auto-reply-settings-section-lead');
            if (leadSection && this.app.leadGeneration && !this.leadSectionInitialized) {
                // 清空现有内容
                while (leadSection.firstChild) {
                    leadSection.removeChild(leadSection.firstChild);
                }

                // 重新创建标题
                const title = this.app.utils.dom.createElement('div', {
                    class: 'xhs-auto-reply-settings-section-title'
                }, '获客工具设置');

                leadSection.appendChild(title); // 保留创建标题

                // 创建获客工具设置内容，传入容器
                this.createLeadGenerationSection(leadSection); // 现在直接填充 leadSection
                this.leadSectionInitialized = true; // 标记为已初始化
            }
        }

        // 处理远程控制标签页特殊逻辑，刷新远程控制状态
        if (tabId === 'remote' && this.app.remoteController) {
            const remoteSection = document.getElementById('xhs-auto-reply-settings-section-remote');
            if (remoteSection) {
                const newSection = this.createRemoteControlSection(remoteSection.parentElement);
                remoteSection.parentElement.replaceChild(newSection, remoteSection);
            }
        }
    }

    /**
     * 保存设置
     */
    async saveSettings() {
        try {
            const settings = this.app.config.getSettings();

            // 辅助函数：安全获取元素值，如果元素不存在则使用配置中的当前值或默认值
            const safeGetElementValue = (selector, configPath, defaultValue = '') => {
                // 尝试获取元素
                const element = document.querySelector(selector);
                if (!element) {
                    // 如果元素不存在，从配置中获取当前值
                    return this.app.config.getSetting(configPath, defaultValue);
                }
                
                // 元素存在，根据类型获取值
                if (element.type === 'checkbox') {
                    return element.checked;
                } else if (element.type === 'number') {
                    return parseFloat(element.value);
                } else {
                    return element.value;
                }
            };

            // 获取所有设置项
            const settingInputs = this.panel.querySelectorAll('[data-key]');

            // 保存当前的获客工具关键词规则，确保不会被覆盖
            const leadGeneration = settings.leadGeneration || {};
            const leadGenKeywordRules = leadGeneration.keywordRules || [];
            
            // 保存当前的自动回复关键词规则，确保不会被覆盖
            const autoReplyKeywordRules = settings.keywordRules || [];

            // 直接在 settings 上更新
            for (const input of settingInputs) {
                const key = input.getAttribute('data-key');
                let value;

                // 即使元素被禁用，仍然读取其值进行保存
                switch (input.type) {
                    case 'checkbox':
                        value = input.checked;
                        break;
                    case 'number':
                        value = parseFloat(input.value);
                        break;
                    case 'select-one':
                        value = input.value;
                        break;
                    default:
                        value = input.value;
                }

                 // 直接更新 settings
                 // 特殊处理：如果是默认获客工具，值是 JSON 字符串
                 if (key === 'leadGeneration.defaultTool') {
                    try {
                        const toolData = value ? JSON.parse(value) : null; // 解析 JSON 或设为 null
                        this._setNestedValue(settings, key.split('.'), toolData); // 更新 settings
                   } catch (e) {
                        this.app.utils.logger.error(`Error parsing default lead tool setting for key ${key}:`, e);
                        this._setNestedValue(settings, key.split('.'), null); // 更新 settings
                   }
                } else {
                    this._setNestedValue(settings, key.split('.'), value); // 更新 settings
                }
            }

            // 特殊处理 - 自动回复延迟数组
            const minDelayInput = document.getElementById('xhs-auto-reply-settings-reply-autoReplyDelay-0');
            const maxDelayInput = document.getElementById('xhs-auto-reply-settings-reply-autoReplyDelay-1');

            if (minDelayInput && maxDelayInput) {
                const minDelay = parseFloat(minDelayInput.value);
                const maxDelay = parseFloat(maxDelayInput.value);

                if (!isNaN(minDelay) && !isNaN(maxDelay)) {
                    // 确保 reply 对象存在
                    if (!settings.reply) settings.reply = {};
                    settings.reply.autoReplyDelay = [minDelay, maxDelay]; // 直接更新 settings
                } else {
                    // 如果输入无效，保留 settings 中的现有值
                }
            }

            // 确保leadGeneration存在
            if (!settings.leadGeneration) {
                settings.leadGeneration = {};
            }
            
            // 确保获客工具关键词规则不被覆盖
            settings.leadGeneration.keywordRules = leadGenKeywordRules;
            
            // 确保自动回复关键词规则不被覆盖
            settings.keywordRules = autoReplyKeywordRules;

            // 保存追粉系统设置
            const followUpSettings = {
                enabled: safeGetElementValue('#xhs-auto-reply-settings-followUp-enabled', 'followUp.enabled', false),
                checkInterval: parseInt(safeGetElementValue('#xhs-auto-reply-settings-followUp-checkInterval', 'followUp.checkInterval', 2), 10),
                dailyLimit: parseInt(safeGetElementValue('#xhs-auto-reply-settings-followUp-dailyLimit', 'followUp.dailyLimit', 50), 10),
                maxDailyPerContact: parseInt(safeGetElementValue('#xhs-auto-reply-settings-followUp-maxDailyPerContact', 'followUp.maxDailyPerContact', 1), 10),
                workingHours: {
                    enabled: safeGetElementValue('#xhs-auto-reply-settings-followUp-workingHours-enabled', 'followUp.workingHours.enabled', true),
                    startTime: safeGetElementValue('#xhs-auto-reply-settings-followUp-workingHours-startTime', 'followUp.workingHours.startTime', '09:00'),
                    endTime: safeGetElementValue('#xhs-auto-reply-settings-followUp-workingHours-endTime', 'followUp.workingHours.endTime', '18:00')
                },
                // 未开口用户追粉设置
                noResponseSettings: {
                    enabled: safeGetElementValue('#xhs-auto-reply-settings-followUp-noResponseSettings-enabled', 'followUp.noResponseSettings.enabled', false),
                    interval: parseInt(safeGetElementValue('#xhs-auto-reply-settings-followUp-noResponseSettings-interval', 'followUp.noResponseSettings.interval', 24), 10),
                    maxFollowups: parseInt(safeGetElementValue('#xhs-auto-reply-settings-followUp-noResponseSettings-maxFollowups', 'followUp.noResponseSettings.maxFollowups', 3), 10),
                    templates: []
                },
                noContactSettings: {
                    enabled: safeGetElementValue('#xhs-auto-reply-settings-followUp-noContactSettings-enabled', 'followUp.noContactSettings.enabled', false),
                    interval: parseInt(safeGetElementValue('#xhs-auto-reply-settings-followUp-noContactSettings-interval', 'followUp.noContactSettings.interval', 24), 10),
                    maxFollowups: parseInt(safeGetElementValue('#xhs-auto-reply-settings-followUp-noContactSettings-maxFollowups', 'followUp.noContactSettings.maxFollowups', 3), 10),
                    templates: []
                }
            };
            
            // 获取追粉模板
            for (let i = 0; i < 5; i++) {
                const noResponseTemplate = safeGetElementValue(`#xhs-auto-reply-settings-followUp-noResponseSettings-templates-${i}`, `followUp.noResponseSettings.templates[${i}].message`, '');
                if (noResponseTemplate && noResponseTemplate.trim()) {
                    followUpSettings.noResponseSettings.templates.push({
                        order: i + 1,
                        message: noResponseTemplate
                    });
                }
                
                const noContactTemplate = safeGetElementValue(`#xhs-auto-reply-settings-followUp-noContactSettings-templates-${i}`, `followUp.noContactSettings.templates[${i}].message`, '');
                if (noContactTemplate && noContactTemplate.trim()) {
                    followUpSettings.noContactSettings.templates.push({
                        order: i + 1,
                        message: noContactTemplate
                    });
                }
            }
            
            settings.followUp = followUpSettings;
            
            // 添加详细的追粉系统设置日志
            this.app.utils.logger.info('保存的追粉系统设置:', JSON.stringify(followUpSettings, null, 2));

            // 将更新后的 settings 保存回 app.config
            this.app.config.settings = settings;

            // 保存到存储
            await this.app.config.saveSettings();

            // 可选：如果获客工具处理模块已初始化，同步设置到该模块（它将使用更新后的 config.settings）
            if (this.app.leadGeneration && this.app.config.settings.leadGeneration) {
                this.app.leadGeneration.settings = { 
                    ...this.app.leadGeneration.settings, 
                    ...this.app.config.settings.leadGeneration,
                    // 确保获客工具关键词规则不被覆盖
                    keywordRules: this.app.config.settings.leadGeneration.keywordRules 
                };
                this.app.utils.logger.debug('已同步获客工具设置到模块', this.app.leadGeneration.settings);
            }
            
            // 同步更新KeywordRuleManager中的规则（如果已初始化）
            if (this.app.keywordRuleManager && this.app.keywordRuleManager.initialized) {
                this.app.keywordRuleManager.rules = this.app.config.settings.keywordRules || [];
                this.app.utils.logger.debug('已同步自动回复关键词规则到模块', this.app.keywordRuleManager.rules);
            }
            
            this.app.utils.logger.info('设置已保存', this.app.config.settings); // 记录最终保存的设置

            // 显示保存成功提示
            alert('设置已保存成功！');

            // 隐藏设置面板
            this.hide();

            // 通知控制面板刷新
            if (this.app.ui.panel && this.app.ui.panel.initialized) {
                this.app.ui.panel.updateStatistics(); // 保持对UI面板的更新通知
            }

            // 如果追粉系统设置已改变，重新初始化追粉系统
            if (this.app.followUpManager) {
                this.app.utils.logger.info('正在重置追粉系统以应用新设置...');
                try {
                    await this.app.followUpManager.reset();
                    this.app.utils.logger.info('追粉系统已重置');
                    
                    // 如果设置了自动启动，立即执行一次检查
                    if (settings.followUp && settings.followUp.enabled) {
                        this.app.utils.logger.info('追粉系统已启用，正在执行首次检查...');
                        await this.app.followUpManager.checkFollowUps();
                    }
                } catch (error) {
                    this.app.utils.logger.error('重置追粉系统失败', error);
                }
            }

            return true;
        } catch (error) {
            this.app.utils.logger.error('保存设置失败', error);
            alert('保存设置失败: ' + error.message);
            return false;
        }
    }

    /**
     * 获取所有扫描到的获客工具选项列表
     * @returns {Array} 选项列表 [{ type, index, name, label }]
     * @private
     */
    _getAllToolOptions() {
        const options = [];
        if (this.app.leadGeneration && this.app.leadGeneration.tools) {
            const tools = this.app.leadGeneration.tools;
            for (const type in tools) {
                if (tools.hasOwnProperty(type) && Array.isArray(tools[type])) {
                    tools[type].forEach((tool, index) => {
                        if (tool && tool.title) { // 确保工具有效且有标题
                            options.push({
                                type: type, // 工具类型
                                index: index, // 工具索引
                                name: tool.title, // 工具名称
                                label: this.app.leadGeneration.toolTypes[type] || type // 工具类型标签 (e.g., '留资卡')
                            });
                        }
                    });
                }
            }
        }
        // 可以按类型排序
        options.sort((a, b) => a.label.localeCompare(b.label));
        return options;
    }

    /**
     * 递归设置嵌套值的辅助方法
     * @param {Object} obj 目标对象
     * @param {Array} keys 键数组
     * @param {*} value 值
     * @param {Number} index 当前键索引
     * @private
     */
    _setNestedValue(obj, keys, value, index = 0) {
        const key = keys[index];

        // 如果是最后一个键，直接设置值
        if (index === keys.length - 1) {
            obj[key] = value;
            return;
        }

        // 确保对象存在
        if (!obj[key] || typeof obj[key] !== 'object') {
            obj[key] = {};
        }

        // 递归设置下一级
        this._setNestedValue(obj[key], keys, value, index + 1);
    }

    /**
     * 重置设置
     */
    async resetSettings() {
        try {
            // 重置所有设置为默认值
            await this.app.config.resetAllSettings();

            this.app.utils.logger.info('设置已重置为默认值');

            // 重新加载设置面板
            this.hide();
            setTimeout(() => {
                this.show();
            }, 100);
        } catch (error) {
            this.app.utils.logger.error('重置设置失败', error);
            alert('重置设置失败: ' + error.message);
        }
    }

    /**
     * 显示设置面板
     */
    show() {
        if (!this.panel) return;

        this.panel.style.display = 'flex';
        this.visible = true;
    }

    /**
     * 隐藏设置面板
     */
    hide() {
        if (!this.panel) return;

        this.panel.style.display = 'none';
        this.visible = false;
    }

    /**
     * 切换设置面板显示/隐藏
     */
    toggle() {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * togglePanel - 与ControlPanel保持API一致的别名方法
     * 切换设置面板显示/隐藏
     */
    togglePanel() {
        // 简单调用toggle方法，保持API一致性
        this.toggle();
    }

    /**
     * 加载设置到面板
     */
    async loadSettings() {
        try {
            // 获取设置
            const settings = this.app.config.getSettings();
            
            // 加载通用设置
            if (settings.autoStart !== undefined) {
                this.app.utils.dom.setElementValue('#auto-start', settings.autoStart ? 'true' : 'false');
            }
            
            if (settings.enableNotification !== undefined) {
                this.app.utils.dom.setElementValue('#enable-notification', settings.enableNotification ? 'true' : 'false');
            }
            
            // 加载AI设置
            if (settings.aiService) {
                this.app.utils.dom.setElementValue('#ai-service', settings.aiService);
            }
            
            // OpenAI设置
            if (settings.openai) {
                this.app.utils.dom.setElementValue('#openai-api-url', settings.openai.apiUrl || '');
                this.app.utils.dom.setElementValue('#openai-api-key', settings.openai.apiKey || '');
                this.app.utils.dom.setElementValue('#openai-model', settings.openai.model || 'gpt-3.5-turbo');
                this.app.utils.dom.setElementValue('#openai-temperature', settings.openai.temperature || 0.7);
                this.app.utils.dom.setElementValue('#openai-max-tokens', settings.openai.maxTokens || 500);
                this.app.utils.dom.setElementValue('#openai-system-prompt', settings.openai.systemPrompt || '');
            }
            
            // FastGPT设置
            if (settings.fastgpt) {
                this.app.utils.dom.setElementValue('#fastgpt-api-url', settings.fastgpt.apiUrl || '');
                this.app.utils.dom.setElementValue('#fastgpt-api-key', settings.fastgpt.apiKey || '');
                this.app.utils.dom.setElementValue('#fastgpt-temperature', settings.fastgpt.temperature || 0.7);
                this.app.utils.dom.setElementValue('#fastgpt-max-tokens', settings.fastgpt.maxTokens || 500);
                this.app.utils.dom.setElementValue('#fastgpt-system-prompt', settings.fastgpt.systemPrompt || '');
            }
            
            // 回复设置
            if (settings.reply) {
                this.app.utils.dom.setElementValue('#reply-max-history', settings.reply.maxHistoryMessages || 10);
                
                // 自动回复延迟
                if (Array.isArray(settings.reply.autoReplyDelay) && settings.reply.autoReplyDelay.length === 2) {
                    this.app.utils.dom.setElementValue('#reply-auto-reply-delay-min', settings.reply.autoReplyDelay[0] || 1000);
                    this.app.utils.dom.setElementValue('#reply-auto-reply-delay-max', settings.reply.autoReplyDelay[1] || 3000);
                }
                
                this.app.utils.dom.setElementValue('#reply-max-replies-per-day', settings.reply.maxRepliesPerDay || 100);
                this.app.utils.dom.setElementValue('#reply-max-replies-per-user', settings.reply.maxRepliesPerUser || 10);
                this.app.utils.dom.setElementValue('#reply-ignore-lead-tags', settings.reply.ignoreLeadTags ? 'true' : 'false');
                
                // 工作时间设置
                if (settings.reply.workingHours) {
                    this.app.utils.dom.setElementValue('#reply-working-hours-enabled', settings.reply.workingHours.enabled ? 'true' : 'false');
                    this.app.utils.dom.setElementValue('#reply-working-hours-start', settings.reply.workingHours.startTime || '09:00');
                    this.app.utils.dom.setElementValue('#reply-working-hours-end', settings.reply.workingHours.endTime || '21:00');
                }
            }
            
            // 统计设置
            if (settings.statistics) {
                this.app.utils.dom.setElementValue('#statistics-enabled', settings.statistics.enabled ? 'true' : 'false');
                this.app.utils.dom.setElementValue('#statistics-track-keywords', settings.statistics.trackKeywords ? 'true' : 'false');
                this.app.utils.dom.setElementValue('#statistics-save-history', settings.statistics.saveHistory ? 'true' : 'false');
            }
            
            // UI设置
            if (settings.ui) {
                this.app.utils.dom.setElementValue('#ui-theme', settings.ui.theme || 'light');
                this.app.utils.dom.setElementValue('#ui-floating-panel-position', settings.ui.floatingPanelPosition || 'bottom-right');
                this.app.utils.dom.setElementValue('#ui-show-statistics-button', settings.ui.showStatisticsButton ? 'true' : 'false');
            }
            
            // 远程控制设置
            if (settings.remoteControl) {
                this.app.utils.dom.setElementValue('#remote-control-enabled', settings.remoteControl.enabled ? 'true' : 'false');
                this.app.utils.dom.setElementValue('#remote-control-config-url', settings.remoteControl.configUrl || '');
                this.app.utils.dom.setElementValue('#remote-control-check-interval', Math.floor(settings.remoteControl.checkInterval / 60000) || 5);
            }
            
            // 获客工具设置
            if (settings.leadGeneration) {
                this.app.utils.dom.setElementValue('#lead-generation-enabled', settings.leadGeneration.enabled ? 'true' : 'false');
                this.app.utils.dom.setElementValue('#lead-generation-auto-detect', settings.leadGeneration.autoDetect ? 'true' : 'false');
                
                if (settings.leadGeneration.preferredToolType) {
                    this.app.utils.dom.setElementValue('#lead-generation-preferred-tool-type', settings.leadGeneration.preferredToolType);
                }
            }
            
            // AI获客决策设置
            if (settings.aiLeadGeneration) {
                this.app.utils.dom.setElementValue('#ai-lead-generation-enabled', settings.aiLeadGeneration.enabled ? 'true' : 'false');
                this.app.utils.dom.setElementValue('#ai-lead-generation-api-key', settings.aiLeadGeneration.apiKey || '');
                this.app.utils.dom.setElementValue('#ai-lead-generation-api-url', settings.aiLeadGeneration.apiUrl || 'https://api.openai.com/v1');
                this.app.utils.dom.setElementValue('#ai-lead-generation-model', settings.aiLeadGeneration.model || 'gpt-3.5-turbo');
                this.app.utils.dom.setElementValue('#ai-lead-generation-confidence', settings.aiLeadGeneration.confidenceThreshold || 0.7);
                this.app.utils.dom.setElementValue('#ai-lead-generation-frequency', settings.aiLeadGeneration.maxFrequencyMinutes || 60);
                this.app.utils.dom.setElementValue('#ai-lead-generation-fallback', settings.aiLeadGeneration.fallbackToKeywords ? 'true' : 'false');
                
                if (settings.aiLeadGeneration.systemPrompt) {
                    this.app.utils.dom.setElementValue('#ai-lead-generation-system-prompt', settings.aiLeadGeneration.systemPrompt);
                }
            }
            
            // 加载追粉系统设置
            if (settings.followUp) {
                this.app.utils.dom.setElementValue('#followUp-enabled', settings.followUp.enabled ? 'true' : 'false');
                this.app.utils.dom.setElementValue('#followUp-check-interval', settings.followUp.checkInterval || 60);
                this.app.utils.dom.setElementValue('#followUp-daily-limit', settings.followUp.dailyLimit || 50);
                this.app.utils.dom.setElementValue('#followUp-max-per-contact', settings.followUp.maxFollowupsPerContact || 3);
                this.app.utils.dom.setElementValue('#followUp-working-hours-enabled', settings.followUp.workingHoursEnabled ? 'true' : 'false');
                this.app.utils.dom.setElementValue('#followUp-working-hours-start', settings.followUp.workingHoursStart || '09:00');
                this.app.utils.dom.setElementValue('#followUp-working-hours-end', settings.followUp.workingHoursEnd || '18:00');
                
                if (settings.followUp.noResponseSettings) {
                    this.app.utils.dom.setElementValue('#followUp-noResponseSettings-enabled', settings.followUp.noResponseSettings.enabled ? 'true' : 'false');
                    this.app.utils.dom.setElementValue('#followUp-noResponseSettings-interval', settings.followUp.noResponseSettings.interval || 24);
                    this.app.utils.dom.setElementValue('#followUp-noResponseSettings-maxFollowups', settings.followUp.noResponseSettings.maxFollowups || 3);
                    
                    // 加载无回复模板
                    if (settings.followUp.noResponseSettings.templates && settings.followUp.noResponseSettings.templates.length > 0) {
                        for (let i = 0; i < settings.followUp.noResponseSettings.templates.length && i < 5; i++) {
                            const template = settings.followUp.noResponseSettings.templates[i];
                            if (template && template.message) {
                                this.app.utils.dom.setElementValue(`#followUp-noResponseSettings-templates-${i}`, template.message);
                            }
                        }
                    }
                }
                
                if (settings.followUp.noContactSettings) {
                    this.app.utils.dom.setElementValue('#followUp-noContactSettings-enabled', settings.followUp.noContactSettings.enabled ? 'true' : 'false');
                    this.app.utils.dom.setElementValue('#followUp-noContactSettings-interval', settings.followUp.noContactSettings.interval || 24);
                    this.app.utils.dom.setElementValue('#followUp-noContactSettings-maxFollowups', settings.followUp.noContactSettings.maxFollowups || 3);
                    
                    // 加载无联系方式模板
                    if (settings.followUp.noContactSettings.templates && settings.followUp.noContactSettings.templates.length > 0) {
                        for (let i = 0; i < settings.followUp.noContactSettings.templates.length && i < 5; i++) {
                            const template = settings.followUp.noContactSettings.templates[i];
                            if (template && template.message) {
                                this.app.utils.dom.setElementValue(`#followUp-noContactSettings-templates-${i}`, template.message);
                            }
                        }
                    }
                }
            }
            
            // 更新界面状态
            this.updateUI();
            
            this.app.utils.logger.info('设置已加载到面板');
            return settings;
        } catch (error) {
            this.app.utils.logger.error('加载设置到面板失败', error);
            return null;
        }
    }
}