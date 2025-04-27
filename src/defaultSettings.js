/**
 * 小红书私信自动回复助手 - 默认设置
 */

const defaultSettings = {
    // 基本设置
    autoStart: false,           // 自动启动
    enableNotification: true,   // 启用通知

    // 远程控制设置
    remoteControl: {
        enabled: true,              // 是否启用远程控制功能
        checkInterval: 5 * 60 * 1000, // 检查间隔（毫秒），默认5分钟
        configUrl: 'https://raw.githubusercontent.com/puyujian/xhssxt/main/comfig.json',              // 远程配置文件URL
        lastCheck: null,            // 上次检查时间
        status: {                   // 远程控制状态
            enabled: true,          // 是否允许脚本运行
            message: '',            // 禁用时的提示消息
            lastUpdated: null       // 状态最后更新时间
        }
    },

    // AI设置
    aiService: 'openai',        // AI服务类型：openai或fastgpt
    openai: {
        apiUrl: 'https://api.openai.com/v1',  // API地址
        apiKey: '',                            // API密钥
        model: 'gpt-3.5-turbo',                // 模型
        temperature: 0.7,                      // 温度值（创造性）
        maxTokens: 500,                        // 最大生成令牌数
        systemPrompt: '你是一个友好的小红书助手，负责回复私信。保持回复简短、有礼貌，尽量在2-3句话内完成回复。', // 系统提示词
    },
    fastgpt: {
        apiUrl: 'https://api.fastgpt.in/api',  // FastGPT API地址
        apiKey: '',                     // FastGPT API密钥
        temperature: 0.7,               // 温度值（创造性）
        maxTokens: 500,                 // 最大生成令牌数
        systemPrompt: '你是一个友好的小红书助手，负责回复私信。保持回复简短、有礼貌，尽量在2-3句话内完成回复。', // 系统提示词
        timeout: 30000,                 // 请求超时时间（毫秒）
        retries: 3,                     // 失败重试次数
    },

    // 回复设置
    reply: {
        maxHistoryMessages: 10,       // 记忆的最大历史消息数
        autoReplyDelay: [1000, 3000], // 自动回复延迟范围（毫秒）
        maxRepliesPerDay: 100,        // 每日最大回复次数
        maxRepliesPerUser: 10,        // 每用户每日最大回复次数
        ignoreLeadTags: false,        // 忽略有客资标签的消息
        workingHours: {               // 工作时间
            enabled: false,
            startTime: '09:00',
            endTime: '21:00'
        }
    },

    // 关键词规则
    keywordRules: [
        {
            id: 'default',
            name: '默认回复',
            keywords: ['.*'],           // 匹配所有
            isRegex: true,              // 使用正则
            enabled: true,              // 启用
            response: '', // 留空则使用AI回复
            useAI: true,                // 使用AI回复
            priority: 0,                // 优先级（数字越大越优先）
            messageTypes: ['TEXT', 'CARD', 'SPOTLIGHT'] // 适用的消息类型：普通文本、笔记卡片、聚光进线
        },
        {
            id: 'greeting',
            name: '打招呼',
            keywords: ['你好', '您好', 'hi', 'hello', '嗨', '哈喽'],
            isRegex: false,
            enabled: true,
            response: '你好！很高兴收到你的消息，请问有什么可以帮到你的呢？',
            useAI: false,
            priority: 10,
            messageTypes: ['TEXT'] // 仅适用于普通文本消息
        },
        {
            id: 'price',
            name: '询问价格',
            keywords: ['价格', '多少钱', '费用', '收费', '价位'],
            isRegex: false,
            enabled: true,
            response: '我们的课程价格根据不同的班型和服务内容有所不同，你可以留下微信，我们的老师会详细介绍给你~',
            useAI: false,
            priority: 20,
            messageTypes: ['TEXT'] // 仅适用于普通文本消息
        },
        {
            id: 'contact',
            name: '咨询联系方式',
            keywords: ['微信', 'QQ', '电话', '联系方式', '联系'],
            isRegex: false,
            enabled: true,
            response: '可以添加我的企业微信号与我联系: [您的企业微信号]，期待与您交流！',
            useAI: false,
            priority: 30,
            messageTypes: ['TEXT'] // 仅适用于普通文本消息
        },
        {
            id: 'businessCard',
            name: '商家名片',
            keywords: ['[商家名片]'],
            isRegex: false,
            enabled: true,
            response: '你好！我看到你对我们的服务有兴趣，有任何问题都可以直接问我哦~我们提供专业的指导和服务！',
            useAI: false,
            priority: 40,
            messageTypes: ['TEXT'] // 仅适用于普通文本消息
        },
        {
            id: 'noteCard',
            name: '笔记卡片回复',
            keywords: ['.*'],
            isRegex: true,
            enabled: true,
            response: '感谢你分享的笔记，我已经看到了！对于这个内容我很感兴趣，有什么想要交流的可以直接告诉我哦~',
            useAI: false,
            priority: 50,
            messageTypes: ['CARD'] // 仅适用于笔记卡片
        },
        {
            id: 'spotlight',
            name: '聚光进线回复',
            keywords: ['.*'],
            isRegex: true,
            enabled: true,
            response: '你好！感谢你通过我的内容找到我，很高兴能为你提供帮助。请问有什么具体问题想要了解的吗？',
            useAI: false,
            priority: 60,
            messageTypes: ['SPOTLIGHT'] // 仅适用于聚光进线
        }
    ],
    
    // 获客工具设置
    leadGeneration: {
        enabled: true,              // 是否启用获客工具功能
        autoDetect: true,           // 是否根据关键词自动检测并发送
        preferredToolType: null,    // 首选工具类型 (当无规则匹配时)
        defaultTool: null,          // AI 决策时发送的默认工具 { type: '...', index: ... }
        keywordRules: []            // 获客工具的关键词规则 (与主关键词规则分开)
    },

    // 追粉系统设置
    followUp: {
        enabled: true,                 // 是否启用追粉系统
        checkInterval: 30 * 60 * 1000, // 检查间隔（毫秒），默认30分钟
        dailyLimit: 50,                // 每日最大追粉次数
        maxDailyPerContact: 1,         // 每个联系人每日最大追粉次数
        blacklist: [],                 // 黑名单联系人ID列表
        workingHours: {                // 追粉工作时间
            enabled: true,             // 是否启用工作时间限制
            startTime: '09:00',        // 开始时间
            endTime: '21:00'           // 结束时间
        },
        // 未开口用户追粉设置
        noResponseSettings: {
            enabled: true,                    // 是否启用未开口用户追粉
            interval: 24 * 60 * 60 * 1000,    // 追粉间隔（毫秒），默认24小时
            maxFollowUps: 3,                  // 最大追粉次数
            templates: [                      // 追粉消息模板
                {
                    order: 1,                 // 第一次发送
                    message: '你好，看到你对我的内容感兴趣，有什么我可以帮到你的吗？随时可以和我交流哦~'
                },
                {
                    order: 2,                 // 第二次发送
                    message: '嗨，不知道你最近是否有关注我们的新内容？如果有什么问题，欢迎随时交流。'
                },
                {
                    order: 3,                 // 第三次发送
                    message: '最近我们上新了很多干货内容，如果你感兴趣，可以看看我的主页，或者直接跟我聊聊你关注的话题。'
                }
            ]
        },
        // 未留客资用户追粉设置
        noContactSettings: {
            enabled: true,                    // 是否启用未留客资用户追粉
            interval: 48 * 60 * 60 * 1000,    // 追粉间隔（毫秒），默认48小时
            maxFollowUps: 5,                  // 最大追粉次数
            templates: [                      // 追粉消息模板
                {
                    order: 1,                 // 第一次发送
                    message: '你好，我们之前聊过，想问一下你对我们的服务是否还有兴趣？可以留下你的微信，我们有专业的老师为你提供更详细的咨询。'
                },
                {
                    order: 2,                 // 第二次发送
                    message: '最近我们推出了一些新的优惠活动，如果你感兴趣，可以加我微信详聊：[您的微信号]'
                },
                {
                    order: 3,                 // 第三次发送
                    message: '你好，我看到你之前有咨询我们的服务，不知道你现在考虑得怎么样了？如果还有任何疑问，随时可以联系我~'
                },
                {
                    order: 4,                 // 第四次发送
                    message: '最近有不少客户通过添加微信了解更多后都选择了我们的服务，反馈非常好。如果你也想了解，可以加我微信：[您的微信号]'
                },
                {
                    order: 5,                 // 第五次发送
                    message: '这是最后一次打扰你啦！如果以后有需要，随时可以找我咨询，祝你生活愉快~'
                }
            ]
        },
        // 是否使用获客工具进行追粉
        useLeadTools: true,               // 是否在追粉时使用获客工具
        leadToolFollowUpFrequency: 2      // 每隔几次追粉使用一次获客工具（0表示不使用）
    },

    // 统计设置
    statistics: {
        enabled: true,          // 启用统计
        trackKeywords: true,    // 追踪关键词命中
        saveHistory: true       // 保存历史记录
    },

    // AI 获客决策设置
    aiLeadGeneration: {
        enabled: false,                                     // 是否启用 AI 获客决策
        service: 'openai',                                  // 使用的 AI 服务 (目前仅支持 'openai')
        apiKey: '',                                         // AI 服务 API Key
        apiUrl: 'https://api.openai.com/v1',                // AI 服务 API 地址
        model: 'gpt-3.5-turbo',                             // 使用的 AI 模型
        systemPrompt: '你是一个小红书获客助手。基于用户对话历史和当前消息，判断现在是否是发送预设获客消息的合适时机。你的目标是提高转化率，避免打扰用户。请分析用户意图、对话阶段和潜在价值。请仅回答 "SEND" 或 "DONT_SEND"。', // 新的简化版系统提示词，仅要求判断是否发送
        confidenceThreshold: 0.7,                           // 触发发送的置信度阈值 (0-1)
        maxFrequencyMinutes: 60,                            // 同一用户发送获客消息的最小间隔分钟数
        allowGenerateText: false,                           // 是否允许 AI 生成补充文本
        fixedLeadGenMessage: '',                            // 用户预设的固定获客消息/工具
        fallbackToKeywords: true                            // AI 判断失败或不确定时，是否回退到关键词规则进行获客判断
    },

    // 界面设置
    ui: {
        theme: 'light',                     // 主题：light或dark
        floatingPanelPosition: 'bottom-right', // 悬浮面板位置
        showStatisticsButton: true          // 显示统计按钮
    }
};