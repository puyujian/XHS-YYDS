/**
 * 小红书私信自动回复助手 - AI服务接口
 */

class AiService {
    constructor(app) {
        this.app = app;
    }

    /**
     * 初始化AI服务
     */
    async initialize() {
        try {
            this.app.utils.logger.info('初始化AI服务');
            return true;
        } catch (error) {
            this.app.utils.logger.error('初始化AI服务失败', error);
            return false;
        }
    }

    /**
     * 生成回复
     * @param {string} message 用户消息
     * @param {Array} history 历史消息
     * @returns {string} 生成的回复
     */
    async generateReply(message, history = []) {
        try {
            this.app.utils.logger.info('正在生成AI回复');

            // 获取AI服务类型
            const aiService = this.app.config.getSetting('aiService', 'openai');

            // 根据服务类型调用不同的API
            if (aiService === 'openai') {
                return await this.generateOpenAIReply(message, history);
            } else if (aiService === 'fastgpt') {
                return await this.generateFastGPTReply(message, history);
            } else {
                throw new Error(`不支持的AI服务类型: ${aiService}`);
            }
        } catch (error) {
            this.app.utils.logger.error('生成AI回复失败', error);
            throw error;
        }
    }

    /**
     * 使用OpenAI生成回复
     * @param {string} message 用户消息
     * @param {Array} history 历史消息
     * @returns {string} 生成的回复
     */
    async generateOpenAIReply(message, history = []) {
        try {
            // 获取OpenAI相关配置
            const openaiConfig = this.app.config.getSetting('openai', {});
            const apiUrl = openaiConfig.apiUrl || 'https://api.openai.com/v1';
            const apiKey = openaiConfig.apiKey || '';
            const model = openaiConfig.model || 'gpt-3.5-turbo';
            const systemPrompt = openaiConfig.systemPrompt || '你是一个友好的小红书助手，负责回复私信。保持回复简短、有礼貌，尽量在2-3句话内完成回复。';
            const temperature = openaiConfig.temperature || 0.7;
            const maxTokens = openaiConfig.maxTokens || 500;

            if (!apiKey) {
                this.app.utils.logger.error('未设置OpenAI API密钥');
                throw new Error('未设置OpenAI API密钥');
            }

            // 构建消息列表
            const messages = [
                { role: 'system', content: systemPrompt }
            ];

            // 添加历史消息（最多10条）
            if (history && history.length > 0) {
                // 只取最近的消息，防止超出token限制
                const recentHistory = history.slice(-10);

                for (const h of recentHistory) {
                    messages.push({
                        role: h.role, // 'user' or 'assistant'
                        content: h.content
                    });
                }
            }

            // 添加当前用户消息
            messages.push({ role: 'user', content: message });

            // 请求OpenAI API
            const response = await this.callOpenAI(
                `${apiUrl}/chat/completions`,
                apiKey,
                {
                    model,
                    messages,
                    temperature,
                    max_tokens: maxTokens,
                    n: 1
                }
            );

            if (response && response.choices && response.choices.length > 0) {
                const replyContent = response.choices[0].message.content.trim();
                this.app.utils.logger.info('成功生成OpenAI回复');
                return replyContent;
            } else {
                throw new Error('OpenAI API返回结果格式错误或为空');
            }
        } catch (error) {
            this.app.utils.logger.error('生成OpenAI回复失败', error);
            throw error;
        }
    }

    /**
     * 使用FastGPT生成回复
     * @param {string} message 用户消息
     * @param {Array} history 历史消息
     * @returns {string} 生成的回复
     */
    async generateFastGPTReply(message, history = []) {
        try {
            // 获取FastGPT相关配置
            const fastgptConfig = this.app.config.getSetting('fastgpt', {});
            const apiUrl = fastgptConfig.apiUrl || 'https://fastgpt.run';
            const apiKey = fastgptConfig.apiKey || '';
            const temperature = fastgptConfig.temperature || 0.7;
            const maxTokens = fastgptConfig.maxTokens || 500;
            const timeout = fastgptConfig.timeout || 30000;
            const maxRetries = fastgptConfig.retries || 3;

            if (!apiKey) {
                this.app.utils.logger.error('未设置FastGPT API密钥');
                throw new Error('未设置FastGPT API密钥');
            }

            // 构建消息列表
            const chatMessages = [];

            // 添加历史消息（最多10条）
            if (history && history.length > 0) {
                // 只取最近的消息，防止超出token限制
                const recentHistory = history.slice(-10);

                for (const h of recentHistory) {
                    chatMessages.push({
                        obj: h.role === 'user' ? 'Human' : 'AI',
                        value: h.content
                    });
                }
            }

            // 添加当前用户消息
            chatMessages.push({
                obj: 'Human',
                value: message
            });

            // 构建请求数据
            const requestData = {
                chatId: undefined,  // 可选
                stream: false,
                detail: false,
                messages: chatMessages
            };

            return await this.callFastGPT(requestData);
        } catch (error) {
            this.app.utils.logger.error('生成FastGPT回复失败', error);
            throw error;
        }
    }

    /**
     * 调用OpenAI API
     * @param {string} url API地址
     * @param {string} apiKey API密钥
     * @param {object} data 请求数据
     * @returns {object} 返回结果
     */
    async callOpenAI(url, apiKey, data) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                data: JSON.stringify(data),
                onload: (response) => {
                    try {
                        if (response.status >= 200 && response.status < 300) {
                            const result = JSON.parse(response.responseText);
                            resolve(result);
                        } else {
                            const error = new Error(`OpenAI API请求失败: ${response.status} ${response.statusText}`);
                            error.response = response;
                            reject(error);
                        }
                    } catch (parseError) {
                        reject(new Error(`解析OpenAI API响应失败: ${parseError.message}`));
                    }
                },
                onerror: (error) => {
                    reject(new Error(`OpenAI API请求出错: ${error.error || error.message || '未知错误'}`));
                },
                ontimeout: () => {
                    reject(new Error('OpenAI API请求超时'));
                }
            });
        });
    }

    /**
     * 调用FastGPT API
     * @param {object} requestData 请求数据
     * @returns {string} 返回结果
     */
    async callFastGPT(requestData) {
        const { apiUrl, apiKey, timeout, retries } = this.app.config.getSetting('fastgpt', {});
        let lastError;

        for (let i = 0; i < retries; i++) {
            try {
                const result = await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: 'POST',
                        url: `${apiUrl}/v1/chat/completions`,
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`
                        },
                        data: JSON.stringify(requestData),
                        timeout: timeout,
                        onload: (response) => {
                            try {
                                const result = JSON.parse(response.responseText);
                                if (response.status >= 200 && response.status < 300) {
                                    resolve(result);
                                } else {
                                    const error = new Error(`FastGPT API请求失败: ${response.status} ${response.statusText}`);
                                    error.response = response;
                                    error.result = result;
                                    reject(error);
                                }
                            } catch (parseError) {
                                reject(new Error(`解析FastGPT API响应失败: ${parseError.message}`));
                            }
                        },
                        onerror: (error) => {
                            reject(new Error(`FastGPT API请求出错: ${error.error || error.message || '未知错误'}`));
                        },
                        ontimeout: () => {
                            reject(new Error(`FastGPT API请求超时 (${timeout}ms)`));
                        }
                    });
                });

                return result.choices[0].message.content;
            } catch (error) {
                console.error(`FastGPT API调用失败 (尝试 ${i + 1}/${retries}):`, error);
                lastError = error;

                if (i < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                }
            }
        }

        throw lastError;
    }
    /**
     * 获取用户消息的意图，判断是否应发送引导工具以及发送哪个工具。
     * @param {object} context 上下文信息
     * @param {string} context.contactId 联系人ID
     * @param {object} context.currentMessage 当前消息 { content, type, title?, sourceInfo?, timestamp }
     * @param {Array} context.conversationHistory 历史消息 [{ role, content, timestamp }]
     * @param {object} [context.userProfile] 用户画像 (可选)
     * @param {Array} context.availableTools 可用工具列表 [{ id: string, type: string, index: number, title: string, description: string, keywords?: string[] }]
     * @returns {Promise<object|null>} 决策对象 { shouldSend: boolean, toolId?: string, reason?: string } 或 null (如果无法决策或不应发送)
     */
    async getIntent(context) {
        this.app.utils.logger.info(`[AI Intent] Getting intent for contact: ${context.contactId}`);

        // 1. 获取配置
        const config = this.app.config.getSetting('aiDecision'); // Assuming settings key is 'aiDecision' now
        if (!config) {
            this.app.utils.logger.warn('[AI Intent] AI Decision config not found.');
            return null; // Return null if config is missing
        }

        const {
            enabled,
            service, // 目前仅支持 openai 兼容
            apiKey,
            apiUrl,
            model,
            systemPrompt,
            temperature,
            maxTokens
        } = config;

        // 2. 检查开关
        // Check if AI decision specifically is enabled within the broader config
        if (!config.enableAIDecision) {
            this.app.utils.logger.info('[AI Intent] AI decision specifically disabled via settings.');
            return null; // Return null if AI decision is disabled
        }

        if (service !== 'openai') {
             this.app.utils.logger.warn(`[AI Intent] Unsupported service type: ${service}. Only 'openai' compatible APIs are supported for intent detection.`);
            return null; // Return null for unsupported service
        }

        if (!apiKey || !apiUrl || !model || !systemPrompt) {
            this.app.utils.logger.error('[AI Intent] Missing required AI configuration (apiKey, apiUrl, model, systemPrompt).');
           return null; // Return null for missing config
        }

        // 3. 构建 Prompt
        // Construct the system prompt, including available tools for the AI to choose from
        let toolDescriptions = "Available tools:\n";
        if (context.availableTools && context.availableTools.length > 0) {
            context.availableTools.forEach(tool => {
                // Ensure tool.id exists and is a string
                const toolId = typeof tool.id === 'string' ? tool.id : `tool_${tool.index}`; // Fallback ID if missing
                toolDescriptions += `- ID: "${toolId}", Title: "${tool.title}", Description: "${tool.description || 'No description'}"\n`;
            });
        } else {
            toolDescriptions += "No tools available.\n";
        }

        const finalSystemPrompt = `${systemPrompt}\n\n${toolDescriptions}\n\nBased on the conversation history and the latest user message, decide if sending one of the available tools is appropriate. If yes, respond ONLY with a JSON object containing 'shouldSend: true' and the 'toolId' of the chosen tool. If no tool should be sent, respond ONLY with a JSON object containing 'shouldSend: false'. Example for sending: {"shouldSend": true, "toolId": "some-tool-identifier"}. Example for not sending: {"shouldSend": false}.`;
        // 构建 OpenAI messages 数组
        const messages = [{ role: 'system', content: finalSystemPrompt }];

        // 添加历史消息 (截断以防过长, 比如最近20条)
        const historyLimit = 20;
        if (context.conversationHistory && context.conversationHistory.length > 0) {
            context.conversationHistory.slice(-historyLimit).forEach(msg => {
                // 确保 role 是 'user' 或 'assistant'
                const role = (msg.role === 'customer' || msg.role === 'user') ? 'user' : 'assistant';
                messages.push({ role: role, content: msg.content });
            });
        }

        // 添加当前消息
        if (context.currentMessage && context.currentMessage.content) {
             messages.push({ role: 'user', content: context.currentMessage.content });
        } else {
             this.app.utils.logger.warn('[AI Intent] Current message is missing or empty.');
            return null; // Return null if message is missing
        }


        // 4. 调用 OpenAI API (使用 Promise 包装 GM_xmlhttpRequest)
        const requestBody = {
            model: model,
            messages: messages,
            temperature: temperature ?? 0.5, // 使用 nullish coalescing 提供默认值
            max_tokens: maxTokens ?? 150, // 使用 nullish coalescing 提供默认值
            response_format: { "type": "json_object" } // Request JSON output
        };

        this.app.utils.logger.debug('[AI Intent] Sending request to AI:', JSON.stringify(requestBody, null, 2));

        try {
            const decision = await new Promise((resolve, reject) => {
                const requestUrl = apiUrl.endsWith('/v1/chat/completions') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/v1/chat/completions`;
                this.app.utils.logger.debug(`[AI Intent] Request URL: ${requestUrl}`);
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: requestUrl,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    data: JSON.stringify(requestBody),
                    timeout: 30000, // 30秒超时
                    onload: (response) => {
                        this.app.utils.logger.debug(`[AI Intent] Received response status: ${response.status}`);
                        this.app.utils.logger.debug(`[AI Intent] Received response text: ${response.responseText}`);
                        if (response.status >= 200 && response.status < 300) {
                            try {
                                const result = JSON.parse(response.responseText);
                                if (result.choices && result.choices.length > 0 && result.choices[0].message && result.choices[0].message.content) {
                                    const aiResponseText = result.choices[0].message.content.trim();
                                    this.app.utils.logger.info(`[AI Intent] AI raw response: "${aiResponseText}"`);

                                    try {
                                        // Attempt to parse the entire response as JSON, as requested
                                        const parsedJson = JSON.parse(aiResponseText);

                                        // Validate the structure
                                        if (typeof parsedJson.shouldSend === 'boolean') {
                                            if (parsedJson.shouldSend === true) {
                                                // If shouldSend is true, toolId must exist and be a string
                                                if (typeof parsedJson.toolId === 'string' && parsedJson.toolId.length > 0) {
                                                    // Check if the toolId exists in the available tools
                                                    const validTool = context.availableTools.find(t => t.id === parsedJson.toolId);
                                                    if (validTool) {
                                                        this.app.utils.logger.info(`[AI Intent] Decision: Send tool '${parsedJson.toolId}'.`);
                                                        resolve({ shouldSend: true, toolId: parsedJson.toolId, reason: parsedJson.reason || 'AI decided to send tool.' });
                                                    } else {
                                                        this.app.utils.logger.warn(`[AI Intent] AI requested sending toolId '${parsedJson.toolId}', but it's not in the available tools list. Ignoring.`);
                                                        resolve({ shouldSend: false, reason: `AI requested invalid toolId: ${parsedJson.toolId}` });
                                                    }
                                                } else {
                                                    this.app.utils.logger.warn('[AI Intent] AI response indicated shouldSend=true, but toolId is missing or invalid. Ignoring.');
                                                    resolve({ shouldSend: false, reason: 'AI indicated send but provided invalid toolId.' });
                                                }
                                            } else {
                                                // shouldSend is false
                                                this.app.utils.logger.info('[AI Intent] Decision: Do not send tool.');
                                                resolve({ shouldSend: false, reason: parsedJson.reason || 'AI decided not to send tool.' });
                                            }
                                        } else {
                                            this.app.utils.logger.warn('[AI Intent] AI response JSON is missing boolean "shouldSend" field.');
                                            reject('Invalid JSON structure from AI: missing boolean "shouldSend" field.');
                                        }
                                    } catch (jsonError) {
                                        this.app.utils.logger.error(`[AI Intent] Failed to parse AI response as JSON: ${jsonError.message}. Response: "${aiResponseText}"`);
                                        // Try a simple string check as a fallback (less reliable)
                                        if (aiResponseText.toLowerCase().includes('"shouldsend": false')) {
                                           this.app.utils.logger.warn('[AI Intent] Fallback: Detected "shouldSend: false" string. Assuming do not send.');
                                           resolve({ shouldSend: false, reason: 'Fallback: AI response contained "shouldSend: false".' });
                                        } else {
                                           reject(`Failed to parse AI response as JSON: ${jsonError.message}`);
                                        }
                                    }
                                } else {
                                    this.app.utils.logger.error('[AI Intent] Invalid response structure from AI API (missing choices or content):', response.responseText);
                                    reject('Invalid response structure from AI API');
                                }
                            } catch (parseError) {
                                this.app.utils.logger.error('[AI Intent] Failed to parse AI API response JSON:', response.responseText, parseError);
                                reject('Failed to parse AI API response');
                            }
                        } else {
                             this.app.utils.logger.error(`[AI Intent] AI API request failed with status ${response.status}: ${response.statusText}`, response.responseText);
                             reject(`AI API request failed with status ${response.status}`);
                        }
                    },
                    onerror: (error) => {
                        this.app.utils.logger.error('[AI Intent] AI API request network error:', error);
                        reject(`API request network error: ${error.error || 'Unknown network error'}`);
                    },
                    ontimeout: () => {
                        this.app.utils.logger.error('[AI Intent] AI API request timed out.');
                        reject('API request timed out');
                    }
                });
            });

            // 5. 返回决策 (decision is the object resolved by the promise)
            this.app.utils.logger.info(`[AI Intent] Final intent for contact ${context.contactId}:`, JSON.stringify(decision));
            return decision; // Returns { shouldSend: boolean, toolId?: string, reason?: string }

        } catch (errorReason) {
            // 捕获 Promise reject 的原因 (e.g., API error, parsing error) 或其他同步错误
            this.app.utils.logger.error('[AI Intent] Failed to get AI intent due to rejection or error:', errorReason);
            // 返回 null 表示无法确定意图
            return null;
        }
    }

}