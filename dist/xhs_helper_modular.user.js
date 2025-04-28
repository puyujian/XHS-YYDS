// ==UserScript==
// @name         小红书私信自动回复助手-模块化
// @namespace    http://tampermonkey.net/
// @version      0.2.1
// @description  小红书私信自动回复工具，支持AI回复，关键词触发，历史记忆和数据统计 (Modular Version)
// @author       ChatGPT & You
// @match        https://*.xiaohongshu.com/*
// @icon         https://www.xiaohongshu.com/favicon.ico
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @connect      api.openai.com
// @connect      *
// @require      https://cdn.jsdelivr.net/npm/vue@3.2.47/dist/vue.global.js
// ==/UserScript==

/**
 * 小红书私信自动回复助手 - 日志工具
 */

class Logger {
    constructor(options = {}) {
        this.options = Object.assign({
            // 默认配置
            logLevel: 'info',        // 日志级别：debug, info, warn, error
            showTimestamp: true,     // 显示时间戳
            maxLogs: 100,            // 最大日志数量
            consoleOutput: true,     // 是否输出到控制台
            prefix: '小红书私信助手', // 日志前缀
            suppressDuplicates: true, // 是否抑制重复日志
            suppressDuplicateTime: 5000, // 重复日志抑制时间(毫秒)
            suppressDuplicateCount: 10   // 显示重复日志之前累积的次数
        }, options);

        // 日志级别映射
        this.logLevels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };

        // 日志存储
        this.logs = [];
        
        // 重复日志跟踪
        this.lastLogs = {};
        this.duplicateCounts = {};
    }

    /**
     * 添加日志
     * @param {string} level 日志级别
     * @param {string} message 日志消息
     * @param {*} data 附加数据
     */
    log(level, message, data = null) {
        // 检查日志级别
        if (this.logLevels[level] < this.logLevels[this.options.logLevel]) {
            return;
        }
        
        // 创建日志对象
        const logEntry = {
            level,
            message,
            timestamp: new Date(),
            data
        };

        // 添加到日志存储
        this.logs.push(logEntry);

        // 限制日志数量
        if (this.logs.length > this.options.maxLogs) {
            this.logs.shift();
        }

        // 检查是否需要抑制重复日志
        if (this.options.suppressDuplicates) {
            const logKey = `${level}:${message}:${JSON.stringify(data)}`;
            const now = Date.now();
            const lastLog = this.lastLogs[logKey];
            
            if (lastLog && (now - lastLog) < this.options.suppressDuplicateTime) {
                // 更新最后记录时间
                this.lastLogs[logKey] = now;
                
                // 增加重复计数
                this.duplicateCounts[logKey] = (this.duplicateCounts[logKey] || 0) + 1;
                
                // 达到累积阈值时才显示一次，报告累积的次数
                if (this.duplicateCounts[logKey] === this.options.suppressDuplicateCount) {
                    // 输出到控制台
                    if (this.options.consoleOutput) {
                        this.outputDuplicateWarning(level, message, this.options.suppressDuplicateCount);
                    }
                }
                
                return logEntry;
            }
            
            // 新日志或者超出时间范围的日志
            this.lastLogs[logKey] = now;
            
            // 如果有累积的重复次数，则重置并报告
            if (this.duplicateCounts[logKey]) {
                const count = this.duplicateCounts[logKey];
                delete this.duplicateCounts[logKey];
                
                // 报告之前累积的重复次数
                if (count > 0 && this.options.consoleOutput) {
                    this.outputDuplicateReport(level, count);
                }
            }
        }

        // 输出到控制台
        if (this.options.consoleOutput) {
            this.outputToConsole(logEntry);
        }

        return logEntry;
    }
    
    /**
     * 输出重复警告
     * @param {string} level 日志级别
     * @param {string} message 原始消息
     * @param {number} threshold 阈值
     */
    outputDuplicateWarning(level, message, threshold) {
        const timeStr = this.options.showTimestamp
            ? `[${new Date().toLocaleTimeString()}] `
            : '';
        
        const warningMsg = `${this.options.prefix} ${timeStr}[重复日志] 已收到${threshold}次相同的${level}级日志，原始内容: "${message.substr(0, 50)}${message.length > 50 ? '...' : ''}"，后续相同日志将被静默处理`;
        console.warn(warningMsg);
    }
    
    /**
     * 输出重复报告
     * @param {string} level 日志级别
     * @param {number} count 计数
     */
    outputDuplicateReport(level, count) {
        const timeStr = this.options.showTimestamp
            ? `[${new Date().toLocaleTimeString()}] `
            : '';
        
        const reportMsg = `${this.options.prefix} ${timeStr}[重复日志] 在上一时间段内累积了${count}条被静默处理的${level}级日志`;
        console.info(reportMsg);
    }

    /**
     * 输出日志到控制台
     * @param {object} logEntry 日志条目
     */
    outputToConsole(logEntry) {
        const { level, message, timestamp, data } = logEntry;

        // 格式化时间戳
        const timeStr = this.options.showTimestamp
            ? `[${timestamp.toLocaleTimeString()}] `
            : '';

        // 完整日志消息
        const fullMessage = `${this.options.prefix} ${timeStr}${message}`;

        // 根据级别选择输出方法
        switch (level) {
            case 'debug':
                console.debug(fullMessage, data || '');
                break;
            case 'info':
                console.info(fullMessage, data || '');
                break;
            case 'warn':
                console.warn(fullMessage, data || '');
                break;
            case 'error':
                console.error(fullMessage, data || '');
                break;
            default:
                console.log(fullMessage, data || '');
        }
    }

    /**
     * 调试日志
     * @param {string} message 日志消息
     * @param {*} data 附加数据
     */
    debug(message, data = null) {
        return this.log('debug', message, data);
    }

    /**
     * 信息日志
     * @param {string} message 日志消息
     * @param {*} data 附加数据
     */
    info(message, data = null) {
        return this.log('info', message, data);
    }

    /**
     * 警告日志
     * @param {string} message 日志消息
     * @param {*} data 附加数据
     */
    warn(message, data = null) {
        return this.log('warn', message, data);
    }

    /**
     * 错误日志
     * @param {string} message 日志消息
     * @param {*} data 附加数据
     */
    error(message, data = null) {
        return this.log('error', message, data);
    }

    /**
     * 获取所有日志
     * @param {string} level 日志级别过滤
     * @returns {Array} 日志数组
     */
    getLogs(level = null) {
        if (level && this.logLevels[level] !== undefined) {
            return this.logs.filter(log => log.level === level);
        }
        return [...this.logs];
    }

    /**
     * 清除日志
     */
    clearLogs() {
        this.logs = [];
        return true;
    }

    /**
     * 设置日志选项
     * @param {object} options 选项
     */
    setOptions(options) {
        this.options = Object.assign(this.options, options);
        return this.options;
    }

    /**
     * 获取日志选项
     * @returns {object} 选项
     */
    getOptions() {
        return {...this.options};
    }

    /**
     * 设置日志级别
     * @param {string} level 日志级别
     */
    setLogLevel(level) {
        if (this.logLevels[level] !== undefined) {
            this.options.logLevel = level;
            return true;
        }
        return false;
    }
    
    /**
     * 启用或禁用重复日志抑制
     * @param {boolean} enabled 是否启用
     */
    setSuppressDuplicates(enabled) {
        this.options.suppressDuplicates = !!enabled;
        if (!enabled) {
            // 清空跟踪数据
            this.lastLogs = {};
            this.duplicateCounts = {};
        }
        return this.options.suppressDuplicates;
    }
}


/**
 * 小红书私信自动回复助手 - DOM操作工具
 */

class DomUtils {
    constructor() {
        // 选择器常量
        this.selectors = {
            // 联系人列表相关
            contactList: '.vue-recycle-scroller.ready.direction-vertical',
            contactItem: '.sx-contact-item',
            contactName: '.d-text.--color-text-title.--size-text-paragraph.bold.d-text-nowrap.d-text-ellipsis.nick-name',
            contactLastMessage: '.d-text.--color-text-paragraph.--size-text-small.d-text-nowrap.d-text-ellipsis.content',
            contactTimeoutFlag: '.d-text.--color-danger.--size-text-small',
            contactUnreadBadge: '.d-badge.--color-bg-danger.--color-bg-static.--color-white.d-badge-dot',
            contactAvatar: '.item-avatar img',
            contactTime: '.time',
            contactTag: '.d-tag.d-tag-small.d-tag-theme-light',
            // 添加未读/未回复标记选择器
            contactUnrepliedTag: '.d-text.--color-static.--color-danger.--size-text-small',
            contactUnrepliedText: '[未回复]',

            // 消息列表相关
            messageList: '.vue-recycle-scroller.ready.direction-vertical',
            messageItem: '.im-msg-item',
            rightMessage: '.right',  // 自己发送的消息
            leftMessage: '.left',    // 对方发送的消息
            textMessage: '.text-message',
            messageTimestamp: '[style*="color: var(--Text-placeholder"]',
            messageSender: '[style*="color: var(--Text-placeholder"]',

            // 消息类型相关
            messageMsgType: '[data-msg-type]',        // 消息类型属性
            messageCardContainer: '.card_container',   // 笔记卡片容器
            messageCardTitle: '.card_bottom_title',    // 笔记卡片标题
            messageCardInfo: '.card_bottom_info',      // 笔记卡片信息

            // 操作区域相关
            textArea: '#jarvis-reply-textarea',
            sendButton: '.send_btn',
            
            // 小红书私信列表项相关（根据提供的DOM结构）
            chatListBox: '.chat-list-box',
            contactItemWrapper: '.vue-recycle-scroller__item-wrapper',
            contactItemView: '.vue-recycle-scroller__item-view',
            contactItemMain: '.item-main',
            contactItemCenter: '.item-main-center'
        };

        // 已注册的观察器
        this.observers = {
            contactList: null,
            messageList: null
        };
    }

    /**
     * 等待元素出现
     * @param {string} selector 选择器
     * @param {number} timeout 超时时间（毫秒）
     * @param {Element} parent 父元素，默认为document
     * @returns {Promise<Element>} 元素
     */
    waitForElement(selector, timeout = 10000, parent = document) {
        return new Promise((resolve, reject) => {
            // 先尝试直接获取
            const element = parent.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            // 设置超时
            const timeoutId = setTimeout(() => {
                observer.disconnect();
                reject(new Error(`等待元素 ${selector} 超时`));
            }, timeout);

            // 使用MutationObserver监听DOM变化
            const observer = new MutationObserver((mutations) => {
                const element = parent.querySelector(selector);
                if (element) {
                    observer.disconnect();
                    clearTimeout(timeoutId);
                    resolve(element);
                }
            });

            observer.observe(parent, {
                childList: true,
                subtree: true
            });
        });
    }

    /**
     * 获取元素
     * @param {string} selector 选择器
     * @param {Element} parent 父元素，默认为document
     * @returns {Element|null} 元素
     */
    getElement(selector, parent = document) {
        return parent.querySelector(selector);
    }

    /**
     * 获取多个元素
     * @param {string} selector 选择器
     * @param {Element} parent 父元素，默认为document
     * @returns {NodeList} 元素列表
     */
    getElements(selector, parent = document) {
        return parent.querySelectorAll(selector);
    }

    /**
     * 创建元素
     * @param {string} tag 标签名
     * @param {object} attributes 属性
     * @param {string|Element} content 内容
     * @returns {Element} 创建的元素
     */
    createElement(tag, attributes = {}, content = '') {
        const element = document.createElement(tag);

        // 设置属性
        for (const key in attributes) {
            if (Object.prototype.hasOwnProperty.call(attributes, key)) {
                if (key === 'style' && typeof attributes[key] === 'object') {
                    // 设置样式
                    for (const styleKey in attributes[key]) {
                        if (Object.prototype.hasOwnProperty.call(attributes[key], styleKey)) {
                            element.style[styleKey] = attributes[key][styleKey];
                        }
                    }
                } else {
                    element.setAttribute(key, attributes[key]);
                }
            }
        }

        // 设置内容
        if (typeof content === 'string') {
            element.innerHTML = content;
        } else if (content instanceof Element) {
            element.appendChild(content);
        }

        return element;
    }

    /**
     * 添加事件监听器
     * @param {Element} element 元素
     * @param {string} event 事件名
     * @param {Function} callback 回调函数
     * @param {boolean} options 选项
     */
    addEvent(element, event, callback, options = false) {
        element.addEventListener(event, callback, options);
    }

    /**
     * 移除事件监听器
     * @param {Element} element 元素
     * @param {string} event 事件名
     * @param {Function} callback 回调函数
     * @param {boolean} options 选项
     */
    removeEvent(element, event, callback, options = false) {
        element.removeEventListener(event, callback, options);
    }

    /**
     * 设置元素文本内容
     * @param {Element} element 元素
     * @param {string} text 文本
     */
    setText(element, text) {
        element.textContent = text;
    }

    /**
     * 设置元素HTML内容
     * @param {Element} element 元素
     * @param {string} html HTML
     */
    setHtml(element, html) {
        element.innerHTML = html;
    }

    /**
     * 获取元素文本内容
     * @param {Element} element 元素
     * @returns {string} 文本
     */
    getText(element) {
        return element.textContent || '';
    }

    /**
     * 获取元素HTML内容
     * @param {Element} element 元素
     * @returns {string} HTML
     */
    getHtml(element) {
        return element.innerHTML || '';
    }

    /**
     * 获取表单元素的值
     * @param {Element} element 元素
     * @returns {string} 值
     */
    getValue(element) {
        return element.value || '';
    }

    /**
     * 根据选择器获取元素的值
     * @param {string} selector 元素选择器或元素ID
     * @param {string} defaultValue 元素不存在时返回的默认值
     * @returns {string} 元素的值，如果元素不存在则返回默认值
     */
    getElementValue(selector, defaultValue = '') {
        if (!selector) {
            console.warn('getElementValue: 选择器不能为空');
            return defaultValue;
        }
        
        let element;
        
        try {
            // 如果以#开头且不包含其他选择器字符，视为ID
            if (selector.startsWith('#') && !selector.includes(' ') && !selector.includes(',')) {
                const id = selector.substring(1);
                element = document.getElementById(id);
            } else {
                // 否则作为选择器处理
                element = document.querySelector(selector);
            }
            
            if (!element) {
                console.warn(`getElementValue: 未找到元素 "${selector}"，返回默认值: "${defaultValue}"`);
                return defaultValue;
            }
            
            return this.getValue(element);
        } catch (error) {
            console.error(`getElementValue: 获取元素 "${selector}" 值时出错`, error);
            return defaultValue;
        }
    }

    /**
     * 设置表单元素的值
     * @param {Element} element 元素
     * @param {string} value 值
     */
    setValue(element, value) {
        element.value = value;

        // 触发input事件
        const event = new Event('input', { bubbles: true });
        element.dispatchEvent(event);
    }

    /**
     * 根据选择器设置元素的值
     * @param {string} selector 元素选择器或元素ID
     * @param {string} value 要设置的值
     * @returns {boolean} 设置是否成功
     */
    setElementValue(selector, value) {
        if (!selector) {
            console.warn('setElementValue: 选择器不能为空');
            return false;
        }
        
        let element;
        
        try {
            // 如果以#开头且不包含其他选择器字符，视为ID
            if (selector.startsWith('#') && !selector.includes(' ') && !selector.includes(',')) {
                const id = selector.substring(1);
                element = document.getElementById(id);
            } else {
                // 否则作为选择器处理
                element = document.querySelector(selector);
            }
            
            if (!element) {
                console.warn(`setElementValue: 未找到元素 "${selector}"`);
                return false;
            }
            
            this.setValue(element, value);
            return true;
        } catch (error) {
            console.error(`setElementValue: 设置元素 "${selector}" 值时出错`, error);
            return false;
        }
    }

    /**
     * 模拟鼠标点击
     * @param {Element} element 元素
     */
    simulateClick(element) {
        if (!element) {
            console.warn('无法模拟点击：元素不存在');
            return;
        }

        console.debug(`尝试点击元素: ${element.tagName}${element.id ? '#'+element.id : ''}${element.className ? '.'+String(element.className).replace(/ /g, '.') : ''}`);

        try {
            // 方法1：使用原生click()方法
            console.debug('尝试方法1: 原生click()');
            element.click();
            console.debug('原生click()成功');
        } catch (error) {
            console.warn('原生click()方法失败，尝试使用Event', error);
            try {
                // 方法2：使用基础Event
                console.debug('尝试方法2: 基础Event');
                const event = new Event('click', {
                    bubbles: true,
                    cancelable: true
                });
                element.dispatchEvent(event);
                console.debug('Event方法成功');
            } catch (error2) {
                console.warn('Event方法失败，尝试使用MouseEvent', error2);
                try {
                    // 方法3：使用完整的MouseEvent
                    console.debug('尝试方法3: MouseEvent');

                    // 安全获取view对象
                    let view = null;
                    try {
                        // 首先尝试获取document.defaultView
                        if (document && document.defaultView) {
                            view = document.defaultView;
                        }
                        // 如果不可用，尝试使用window
                        else if (typeof window !== 'undefined') {
                            view = window;
                        }
                    } catch (e) {
                        // 如果访问这些属性出错，使用null
                        console.warn('获取window对象失败', e);
                    }

                    // 尝试不同的方式创建点击事件
                    let event;
                    // 方式1：不指定view参数
                    try {
                        event = new MouseEvent('click', {
                            bubbles: true,
                            cancelable: true,
                            detail: 1
                        });
                    } catch (err) {
                        console.warn(`创建MouseEvent不带view失败: ${err.message}`);
                        // 方式2：使用Event构造函数
                        event = new Event('click', {
                            bubbles: true,
                            cancelable: true
                        });
                    }
                    element.dispatchEvent(event);
                    console.debug('MouseEvent方法成功');
                } catch (error3) {
                    // 方法4：尝试直接设置元素属性
                    console.debug('尝试方法4: 直接调用onclick');
                    try {
                        // 如果元素有onclick属性，直接调用
                        if (typeof element.onclick === 'function') {
                            element.onclick();
                            console.debug('onclick方法成功');
                        } else {
                            console.error('元素没有onclick方法');
                            throw new Error('元素没有onclick方法');
                        }
                    } catch (error4) {
                        console.error('所有点击模拟方法均失败', error4);
                        throw error4;
                    }
                }
            }
        }
    }

    /**
     * 增强版模拟鼠标点击，包含更完整的事件序列
     * @param {Element} element 目标元素
     * @returns {Promise<boolean>} 点击是否成功
     */
    async simulateAdvancedClick(element) {
        if (!element) {
            console.warn('无法模拟点击：元素不存在');
            return false;
        }

        // 最大重试次数
        const maxRetries = 3;
        let success = false;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                console.debug(`开始增强版点击模拟 (尝试 ${attempt+1}/${maxRetries}): ${element.tagName}${element.id ? '#'+element.id : ''}${element.className ? '.'+String(element.className).replace(/ /g, '.') : ''}`);

                // 模拟鼠标移入元素区域，增加延迟使其更真实
                this.simulateMouseEvent(element, 'mouseover');
                await new Promise(resolve => setTimeout(resolve, 100));

                this.simulateMouseEvent(element, 'mouseenter');
                await new Promise(resolve => setTimeout(resolve, 100));

                // 模拟鼠标在元素上的随机移动，更接近真实用户行为
                const rect = element.getBoundingClientRect();
                for (let i = 0; i < 5; i++) {
                    // 生成元素内的随机位置
                    const randomX = rect.left + Math.random() * rect.width;
                    const randomY = rect.top + Math.random() * rect.height;

                    // 创建带有坐标的鼠标事件
                    let moveEvent;
                    try {
                        moveEvent = new MouseEvent('mousemove', {
                            bubbles: true,
                            cancelable: true,
                            clientX: rect.left + rect.width / 2,
                            clientY: rect.top + rect.height / 2,
                            screenX: rect.left + rect.width / 2,
                            screenY: rect.top + rect.height / 2
                        });
                    } catch (err) {
                        console.warn(`创建mousemove事件失败: ${err.message}`);
                        try {
                            // 使用基础事件
                            moveEvent = new Event('mousemove', {
                                bubbles: true,
                                cancelable: true
                            });
                        } catch (e) {
                            // 如果失败，回退到简单的模拟
                            this.simulateMouseEvent(element, 'mousemove');
                        }
                    }

                    try {
                        element.dispatchEvent(moveEvent);
                    } catch (e) {
                        // 如果失败，回退到简单的模拟
                        this.simulateMouseEvent(element, 'mousemove');
                    }

                    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 50));
                }

                // 模拟鼠标按下，增加延迟
                console.debug('模拟鼠标按下');
                this.simulateMouseEvent(element, 'mousedown');
                await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 100));

                // 模拟鼠标松开
                console.debug('模拟鼠标松开');
                this.simulateMouseEvent(element, 'mouseup');
                await new Promise(resolve => setTimeout(resolve, 50));

                // 模拟点击事件
                console.debug('模拟点击事件');
                this.simulateClick(element);

                // 延迟后再模拟鼠标移出，确保点击事件已被处理
                await new Promise(resolve => setTimeout(resolve, 300));

                try {
                    // 模拟鼠标移出
                    this.simulateMouseEvent(element, 'mouseleave');
                } catch (e) {
                    console.warn('模拟鼠标移出失败', e);
                }

                // 尝试直接触发点击事件处理程序
                try {
                    // 尝试触发原生点击
                    if (typeof element.click === 'function') {
                        element.click();
                        console.debug('原生 click() 方法调用成功');
                    }

                    // 尝试触发onclick事件
                    if (typeof element.onclick === 'function') {
                        element.onclick();
                        console.debug('onclick 事件处理程序调用成功');
                    }
                } catch (directError) {
                    console.warn('直接调用点击方法失败', directError);
                }

                console.debug('增强版点击模拟完成');
                success = true;
                break; // 成功则跳出重试循环
            } catch (error) {
                console.error(`增强版点击模拟失败 (尝试 ${attempt+1}/${maxRetries})`, error);

                // 如果还有重试机会，等待一段时间再试
                if (attempt < maxRetries - 1) {
                    const waitTime = 300 * (attempt + 1); // 每次等待时间增加
                    console.debug(`等待 ${waitTime}ms 后重试...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
        }

        // 如果所有重试都失败，尝试使用原生方法作为最后的备选
        if (!success) {
            try {
                console.debug('所有重试均失败，尝试使用原生click()作为最后手段');
                element.click();
                console.debug('原生click()成功');
                return true;
            } catch (fallbackError) {
                console.error('原生click()也失败', fallbackError);
                return false;
            }
        }

        return success;
    }

    /**
     * 模拟鼠标事件
     * @param {Element} element 目标元素
     * @param {string} eventType 事件类型，如 'mouseenter', 'mouseover', 'mousemove', 'mousedown', 'mouseup'
     */
    simulateMouseEvent(element, eventType) {
        if (!element) return;

        try {
            // 创建MouseEvent
            // 不再尝试获取view对象，直接使用null
            // 在某些环境下，即使获取到了window对象，也可能无法正确用于MouseEvent
            let view = null;

            // 尝试不同的方式创建事件
            let event;
            // 方式1：不指定view参数
            try {
                event = new MouseEvent(eventType, {
                    bubbles: true,
                    cancelable: true,
                    detail: 1
                });
            } catch (err) {
                console.warn(`创建MouseEvent不带view失败: ${err.message}`);
                // 方式2：使用Event构造函数
                event = new Event(eventType, {
                    bubbles: true,
                    cancelable: true
                });
            }

            // 分发事件
            element.dispatchEvent(event);
        } catch (error) {
            console.warn(`MouseEvent方法(${eventType})失败，尝试使用Event`, error);
            try {
                // 备选方法：使用基础Event
                const event = new Event(eventType, {
                    bubbles: true,
                    cancelable: true
                });
                element.dispatchEvent(event);
            } catch (error2) {
                console.error(`所有事件模拟方法(${eventType})均失败`, error2);
                throw error2;
            }
        }
    }

    /**
     * 模拟键盘按键事件
     * @param {Element} element 目标元素
     * @param {string} key 按键名称，如 'Enter', 'Escape', 'Space'等
     */
    simulateKeypress(element, key) {
        if (!element) {
            console.warn('无法模拟键盘事件：元素不存在');
            return;
        }

        console.debug(`尝试模拟键盘事件: ${key} 在元素 ${element.tagName}`);
        
        // 获取键值参数
        const keyParams = this._getKeyEventParams(key);
        
        try {
            // 触发按键按下事件
            this._simulateKeyEvent(element, 'keydown', keyParams);
            
            // 如果是可输入的键，触发keypress事件
            if (keyParams.keyCode !== 9 && // Tab
                keyParams.keyCode !== 27 && // Escape
                !(keyParams.keyCode >= 112 && keyParams.keyCode <= 123)) { // F1-F12
                this._simulateKeyEvent(element, 'keypress', keyParams);
            }
            
            // 如果是Enter键，可能需要触发表单提交
            if (key === 'Enter' && element.form) {
                try {
                    // 尝试触发表单提交
                    const submitEvent = new Event('submit', {
                        bubbles: true,
                        cancelable: true
                    });
                    element.form.dispatchEvent(submitEvent);
                } catch (submitError) {
                    console.warn('表单提交事件触发失败', submitError);
                }
            }
            
            // 触发按键松开事件
            this._simulateKeyEvent(element, 'keyup', keyParams);
            
            // 如果是输入框元素，且按下的是Enter键，尝试触发其他相关事件
            if (key === 'Enter' && 
                (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
                try {
                    // 触发变更事件
                    const changeEvent = new Event('change', {
                        bubbles: true,
                        cancelable: true
                    });
                    element.dispatchEvent(changeEvent);
                    
                    // 触发输入事件
                    const inputEvent = new Event('input', {
                        bubbles: true,
                        cancelable: true
                    });
                    element.dispatchEvent(inputEvent);
                    
                    console.debug('触发了额外的输入事件');
                } catch (extraError) {
                    console.warn('触发额外输入事件失败', extraError);
                }
            }
            
            console.debug(`键盘事件模拟成功: ${key}`);
        } catch (error) {
            console.error(`键盘事件模拟失败: ${key}`, error);
            throw error;
        }
    }
    
    /**
     * 辅助方法：获取键盘事件参数
     * @private
     * @param {string} key 按键名称
     * @returns {Object} 键盘事件参数
     */
    _getKeyEventParams(key) {
        // 常用键的键码映射
        const keyCodeMap = {
            'Enter': 13,
            'Tab': 9,
            'Space': 32,
            'Escape': 27,
            'Esc': 27,
            'ArrowUp': 38,
            'ArrowDown': 40,
            'ArrowLeft': 37,
            'ArrowRight': 39,
            'Backspace': 8,
            'Delete': 46
        };
        
        let keyCode = keyCodeMap[key] || key.charCodeAt(0);
        let charCode = (key === 'Enter' || key === 'Space') ? keyCode : 0;
        
        return {
            key: key,
            keyCode: keyCode,
            charCode: charCode,
            which: keyCode,
            code: key
        };
    }
    
    /**
     * 辅助方法：创建并分发键盘事件
     * @private
     * @param {Element} element 目标元素
     * @param {string} eventType 事件类型，如 'keydown', 'keypress', 'keyup'
     * @param {Object} params 键盘事件参数
     */
    _simulateKeyEvent(element, eventType, params) {
        try {
            // 尝试使用KeyboardEvent构造函数
            const event = new KeyboardEvent(eventType, {
                bubbles: true,
                cancelable: true,
                key: params.key,
                code: params.code,
                keyCode: params.keyCode,
                which: params.which,
                charCode: params.charCode
            });
            
            // 某些浏览器可能忽略keyCode等属性，尝试手动设置
            try {
                Object.defineProperties(event, {
                    keyCode: { value: params.keyCode },
                    which: { value: params.which },
                    charCode: { value: params.charCode }
                });
            } catch (propError) {
                console.warn('无法设置键盘事件的属性', propError);
            }
            
            element.dispatchEvent(event);
        } catch (error) {
            console.warn(`创建KeyboardEvent失败: ${error.message}，尝试备选方案`);
            
            try {
                // 备选方案：创建自定义事件
                const event = new Event(eventType, {
                    bubbles: true,
                    cancelable: true
                });
                
                // 手动添加键盘属性
                event.key = params.key;
                event.keyCode = params.keyCode;
                event.which = params.which;
                event.charCode = params.charCode;
                event.code = params.code;
                
                element.dispatchEvent(event);
            } catch (fallbackError) {
                console.error(`所有键盘事件模拟方法均失败: ${eventType}`, fallbackError);
                throw fallbackError;
            }
        }
    }

     /**
     * 模拟鼠标悬停
     * @param {Element} element 目标元素
     */
    simulateHover(element) {
        if (!element) return;

        // 触发鼠标进入和悬停事件序列
        this.simulateMouseEvent(element, 'mouseenter');
        this.simulateMouseEvent(element, 'mouseover');
        this.simulateMouseEvent(element, 'mousemove');
    }

    /**
     * 增强版模拟鼠标悬停，包含更完整的事件序列
     * @param {Element} element 目标元素
     * @returns {boolean} 悬停是否成功
     */
    simulateAdvancedHover(element) {
        if (!element) return false;

        try {
            // 获取元素的位置和尺寸
            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            // 创建含坐标的鼠标事件
            const createMouseEventWithCoords = (type) => {
                try {
                    // 不再尝试获取view对象，因为在小红书环境中可能会导致错误

                    // 尝试不同的方式创建MouseEvent
                    // 方式1：不指定view参数
                    return new MouseEvent(type, {
                        bubbles: true,
                        cancelable: true,
                        detail: 1,
                        clientX: centerX,
                        clientY: centerY,
                        screenX: centerX,
                        screenY: centerY
                    });
                } catch (eventError) {
                    console.warn(`创建MouseEvent(${type})失败，使用基础Event`, eventError);
                    // 创建基础事件作为备选
                    const event = new Event(type, {
                        bubbles: true,
                        cancelable: true
                    });
                    // 手动添加坐标属性
                    event.clientX = centerX;
                    event.clientY = centerY;
                    event.screenX = centerX;
                    event.screenY = centerY;
                    return event;
                }
            };

            // 触发完整的鼠标悬停事件序列
            element.dispatchEvent(createMouseEventWithCoords('mouseenter'));
            element.dispatchEvent(createMouseEventWithCoords('mouseover'));
            element.dispatchEvent(createMouseEventWithCoords('mousemove'));

            return true;
        } catch (error) {
            console.error('增强版悬停模拟失败', error);
            // 尝试使用基本方法
            try {
                this.simulateHover(element);
                return true;
            } catch (fallbackError) {
                return false;
            }
        }
    }

    /**
     * 监听联系人列表变化
     * @param {Function} callback 回调函数，参数为(newElements, removedElements)
     */
    observeContactList(callback) {
        const contactList = this.getElement(this.selectors.contactList);
        if (!contactList) {
            console.warn('找不到联系人列表元素');
            return null;
        }

        // 取消已有的观察器
        if (this.observers.contactList) {
            this.observers.contactList.disconnect();
            this.observers.contactList = null;
        }

        // 当前联系人列表
        const currentContacts = new Set(Array.from(this.getElements(this.selectors.contactItem)));

        // 创建新的观察器
        const observer = new MutationObserver((mutations) => {
            const newContacts = new Set();
            const removedContacts = new Set(currentContacts);

            // 查找当前所有联系人
            const contacts = this.getElements(this.selectors.contactItem);
            contacts.forEach(contact => {
                if (!currentContacts.has(contact)) {
                    // 新增联系人
                    newContacts.add(contact);
                }

                // 从移除列表中删除
                removedContacts.delete(contact);
            });

            // 更新当前联系人列表
            currentContacts.clear();
            contacts.forEach(contact => currentContacts.add(contact));

            // 调用回调函数
            if (newContacts.size > 0 || removedContacts.size > 0) {
                callback(Array.from(newContacts), Array.from(removedContacts));
            }
        });

        observer.observe(contactList, {
            childList: true,
            subtree: true
        });

        this.observers.contactList = observer;
        return observer;
    }

    /**
     * 监听消息列表变化
     * @param {Function} callback 回调函数，参数为(newMessages, removedMessages)
     */
    observeMessageList(callback) {
        const messageList = this.getElement(this.selectors.messageList);
        if (!messageList) {
            console.warn('找不到消息列表元素');
            return null;
        }

        // 取消已有的观察器
        if (this.observers.messageList) {
            this.observers.messageList.disconnect();
            this.observers.messageList = null;
        }

        // 当前消息列表及其计数器，用于跟踪新旧消息
        const currentMessages = new Map();

        // 初始化消息列表
        const initialMessages = this.getElements(this.selectors.messageItem);
        initialMessages.forEach(message => {
            // 使用节点的ID或生成唯一标识符
            const id = message.id ||
                `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            // 记录消息和最后更新时间
            currentMessages.set(message, {
                id,
                lastSeen: Date.now(),
                isProcessed: false
            });
        });

        // 创建新的观察器
        const observer = new MutationObserver((mutations) => {
            let hasRelevantChanges = false;

            // 检查是否有相关变化
            for (const mutation of mutations) {
                // 只关心节点添加和特性变化
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    hasRelevantChanges = true;
                    break;
                }

                // 或者属性变化中包含data-msg-type属性变化
                if (mutation.type === 'attributes' &&
                    (mutation.attributeName === 'data-msg-type' ||
                     mutation.attributeName === 'class')) {
                    hasRelevantChanges = true;
                    break;
                }
            }

            // 如果没有相关变化，不进行后续处理
            if (!hasRelevantChanges) {
                return;
            }

            const newMessages = [];
            const removedMessages = [];
            const currentTime = Date.now();

            // 查找当前所有消息
            const messages = this.getElements(this.selectors.messageItem);

            // 检查新消息
            messages.forEach(message => {
                if (!currentMessages.has(message)) {
                    // 新增消息
                    const id = message.id ||
                        `msg-${currentTime}-${Math.random().toString(36).substr(2, 9)}`;

                    currentMessages.set(message, {
                        id,
                        lastSeen: currentTime,
                        isProcessed: false
                    });

                    newMessages.push(message);
                } else {
                    // 更新现有消息的最后见到时间
                    const data = currentMessages.get(message);
                    data.lastSeen = currentTime;
                    currentMessages.set(message, data);
                }
            });

            // 检查删除的消息
            currentMessages.forEach((data, message) => {
                if (data.lastSeen < currentTime) {
                    removedMessages.push(message);
                    currentMessages.delete(message);
                }
            });

            // 如果有新增或删除的消息，调用回调函数
            if (newMessages.length > 0 || removedMessages.length > 0) {
                console.log(`检测到消息变化: 新增${newMessages.length}条, 删除${removedMessages.length}条`);
                callback(newMessages, removedMessages);
            }
        });

        observer.observe(messageList, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['data-msg-type', 'class']
        });

        this.observers.messageList = observer;
        return observer;
    }

    /**
     * 停止所有观察
     */
    stopAllObservers() {
        for (const key in this.observers) {
            if (this.observers[key]) {
                this.observers[key].disconnect();
                this.observers[key] = null;
            }
        }
    }

    /**
     * 增强版点击模拟并附带验证机制
     * 尝试多种点击方法，并尝试验证点击是否成功
     * @param {Element} element 要点击的元素
     * @param {Object} options 配置选项
     * @param {Function} options.verificationFn 验证函数，返回布尔值指示点击是否成功
     * @param {number} options.verificationTimeout 等待验证的最长时间（毫秒）
     * @param {number} options.maxRetries 最大重试次数
     * @param {number} options.waitBetweenRetries 重试间隔（毫秒）
     * @returns {Promise<boolean>} 是否成功点击并通过验证
     */
    async enhancedClickWithVerification(element, options = {}) {
        if (!element) {
            console.warn('enhancedClickWithVerification: 元素为空');
            return false;
        }

        // 默认配置
        const config = Object.assign({
            verificationFn: null,        // 验证函数，如果为null则不验证
            verificationTimeout: 3000,   // 验证超时时间
            maxRetries: 3,               // 最大重试次数
            waitBetweenRetries: 500      // 重试间隔
        }, options);

        let success = false;
        let retryCount = 0;

        console.debug('启动增强版点击并验证:', {
            hasVerification: !!config.verificationFn,
            element: element.tagName,
            maxRetries: config.maxRetries
        });

        while (retryCount < config.maxRetries && !success) {
            retryCount++;
            console.debug(`点击尝试 ${retryCount}/${config.maxRetries}`);

            // 确保元素可见，如果不可见则尝试滚动到视图中
            try {
                const rect = element.getBoundingClientRect();
                const isVisible = rect.width > 0 && rect.height > 0 && 
                                  rect.top >= 0 && rect.left >= 0 && 
                                  rect.bottom <= window.innerHeight && rect.right <= window.innerWidth;
                
                if (!isVisible && typeof element.scrollIntoView === 'function') {
                    console.debug('元素不在视图中，尝试滚动');
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            } catch (scrollError) {
                console.warn('滚动元素到视图失败', scrollError);
            }

            // 尝试多种点击方法
            let clickMethodSuccess = false;
            
            // 方法1: 模拟鼠标悬停和事件 - 安全创建 MouseEvent
            try {
                console.debug('尝试点击方法1: 完整鼠标事件序列');
                
                // 模拟鼠标悬停
                this.simulateAdvancedHover(element);
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // 安全地创建和分发 MouseEvent，处理可能的错误
                const safeDispatchMouseEvent = (eventType) => {
                    try {
                        // 首先尝试标准方式创建事件
                        const event = new MouseEvent(eventType, {
                            bubbles: true,
                            cancelable: true,
                            view: window
                        });
                        element.dispatchEvent(event);
                        return true;
                    } catch (error) {
                        // 如果创建 MouseEvent 失败，尝试备选方案
                        try {
                            console.warn(`创建 MouseEvent ${eventType} 失败，尝试备选方法`, error);
                            
                            // 备选方案1: 使用 Event 构造函数
                            const simpleEvent = new Event(eventType, {
                                bubbles: true,
                                cancelable: true
                            });
                            element.dispatchEvent(simpleEvent);
                            return true;
                        } catch (fallbackError) {
                            // 如果备选方案也失败，尝试更原始的方法
                            try {
                                console.warn(`备选方案创建事件也失败，尝试最基础的方法`, fallbackError);
                                
                                // 备选方案2: 使用 document.createEvent (兼容性方法)
                                const legacyEvent = document.createEvent('MouseEvents');
                                legacyEvent.initEvent(eventType, true, true);
                                element.dispatchEvent(legacyEvent);
                                return true;
                            } catch (finalError) {
                                console.error(`所有事件创建方法均失败: ${eventType}`, finalError);
                                return false;
                            }
                        }
                    }
                };
                
                // 使用安全分发方法依次分发事件
                safeDispatchMouseEvent('mousedown');
                await new Promise(resolve => setTimeout(resolve, 50));
                
                safeDispatchMouseEvent('mouseup');
                
                safeDispatchMouseEvent('click');
                
                clickMethodSuccess = true;
                console.debug('点击方法1成功');
            } catch (method1Error) {
                console.warn('点击方法1失败', method1Error);
            }
            
            // 方法2: 使用 simulateAdvancedClick (如果方法1失败)
            if (!clickMethodSuccess) {
                try {
                    console.debug('尝试点击方法2: simulateAdvancedClick');
                    await this.simulateAdvancedClick(element);
                    clickMethodSuccess = true;
                    console.debug('点击方法2成功');
                } catch (method2Error) {
                    console.warn('点击方法2失败', method2Error);
                }
            }
            
            // 方法3: 原生点击 (如果前两种都失败)
            if (!clickMethodSuccess) {
                try {
                    console.debug('尝试点击方法3: 原生click()方法');
                    if (typeof element.click === 'function') {
                        element.click();
                        clickMethodSuccess = true;
                        console.debug('点击方法3成功');
                    }
                } catch (method3Error) {
                    console.warn('点击方法3失败', method3Error);
                }
            }
            
            // 如果所有点击方法都失败
            if (!clickMethodSuccess) {
                console.warn('所有点击方法均失败');
                // 等待后重试
                await new Promise(resolve => setTimeout(resolve, config.waitBetweenRetries));
                continue;
            }
            
            // 如果没有提供验证函数，则假定点击成功
            if (typeof config.verificationFn !== 'function') {
                console.debug('无验证函数，假定点击成功');
                success = true;
                break;
            }
            
            // 等待验证结果
            console.debug(`等待验证点击结果，超时时间: ${config.verificationTimeout}ms`);
            const verificationStartTime = Date.now();
            
            // 轮询验证
            while (Date.now() - verificationStartTime < config.verificationTimeout) {
                try {
                    // 调用验证函数
                    const isVerified = await config.verificationFn();
                    if (isVerified) {
                        console.debug('验证通过，点击成功');
                        success = true;
                        break;
                    }
                } catch (verifyError) {
                    console.warn('验证过程出错', verifyError);
                }
                
                // 轮询间隔
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            // 如果验证成功，退出循环
            if (success) break;
            
            // 验证失败，记录并准备重试
            console.debug('点击验证失败，准备重试');
            await new Promise(resolve => setTimeout(resolve, config.waitBetweenRetries));
        }
        
        console.debug(`点击${success ? '成功' : '失败'}，尝试次数: ${retryCount}`);
        return success;
    }
    
    /**
     * 检查DOM变化以验证点击操作
     * 创建一个简便的方法来验证点击后DOM是否有预期变化
     * @param {Function} checkFn 检查函数，返回布尔值表示DOM是否符合预期
     * @param {Object} options 配置选项
     * @param {number} options.timeout 超时时间（毫秒）
     * @param {number} options.interval 检查间隔（毫秒）
     * @returns {Promise<boolean>} 是否检测到预期的DOM变化
     */
    async waitForDomChange(checkFn, options = {}) {
        const config = Object.assign({
            timeout: 5000,    // 默认超时5秒
            interval: 200     // 默认200ms检查一次
        }, options);
        
        const startTime = Date.now();
        let result = false;
        
        // 立即检查一次
        try {
            result = await checkFn();
            if (result) return true;
        } catch (e) {
            console.warn('首次DOM检查出错', e);
        }
        
        // 设置轮询
        while (Date.now() - startTime < config.timeout) {
            await new Promise(resolve => setTimeout(resolve, config.interval));
            
            try {
                result = await checkFn();
                if (result) return true;
            } catch (e) {
                console.warn('DOM检查出错', e);
            }
        }
        
        console.debug(`DOM变化等待超时(${config.timeout}ms)`);
        return false;
    }

    /**
     * 向页面添加CSS样式
     * @param {string} css CSS样式代码
     */
    addStyle(css) {
        try {
            if (typeof GM_addStyle === 'function') {
                // 优先使用油猴脚本提供的GM_addStyle函数
                GM_addStyle(css);
                return true;
            } else {
                // 如果GM_addStyle不可用，使用DOM API添加样式
                const style = document.createElement('style');
                style.textContent = css;
                document.head.appendChild(style);
                return true;
            }
        } catch (error) {
            console.error('添加样式失败', error);
            return false;
        }
    }

    /**
     * 显示通知消息
     * @param {string} title 通知标题
     * @param {string} message 通知消息内容
     * @param {string} type 通知类型 ('info', 'success', 'warning', 'error')
     * @param {number} duration 显示时长（毫秒），默认3000ms
     */
    showNotification(title, message, type = 'info', duration = 3000) {
        // 尝试使用浏览器原生Notification API
        if ("Notification" in window && Notification.permission === "granted") {
            try {
                new Notification(title, {
                    body: message,
                    icon: type === 'error' ? 'https://img.icons8.com/color/48/000000/high-priority.png' :
                           type === 'warning' ? 'https://img.icons8.com/color/48/000000/warning-shield.png' :
                           type === 'success' ? 'https://img.icons8.com/color/48/000000/ok.png' :
                           'https://img.icons8.com/color/48/000000/info.png'
                });
                return; // 如果原生通知成功，直接返回
            } catch (e) {
                console.warn('原生通知API调用失败，降级使用DOM通知', e);
            }
        }

        // 如果原生通知不可用，使用自定义DOM通知
        
        // 1. 创建通知容器（如果不存在）
        let notificationContainer = document.getElementById('xhs-helper-notifications');
        if (!notificationContainer) {
            notificationContainer = this.createElement('div', {
                id: 'xhs-helper-notifications',
                style: 'position: fixed; top: 20px; right: 20px; z-index: 9999; max-width: 300px;'
            });
            document.body.appendChild(notificationContainer);
        }

        // 2. 确定通知类型样式
        const typeStyles = {
            info: {
                backgroundColor: '#f0f7ff',
                borderColor: '#1890ff',
                titleColor: '#1890ff',
                icon: '💬'
            },
            success: {
                backgroundColor: '#f6ffed',
                borderColor: '#52c41a',
                titleColor: '#52c41a',
                icon: '✅'
            },
            warning: {
                backgroundColor: '#fffbe6',
                borderColor: '#faad14',
                titleColor: '#faad14',
                icon: '⚠️'
            },
            error: {
                backgroundColor: '#fff1f0',
                borderColor: '#ff4d4f',
                titleColor: '#ff4d4f',
                icon: '❌'
            }
        };

        // 使用默认类型，如果提供的类型无效
        const style = typeStyles[type] || typeStyles.info;

        // 3. 创建通知元素
        const notification = this.createElement('div', {
            style: `
                margin-bottom: 10px;
                padding: 10px 15px;
                border-radius: 4px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                border-left: 4px solid ${style.borderColor};
                background-color: ${style.backgroundColor};
                transition: all 0.3s ease;
                opacity: 0;
                transform: translateX(20px);
            `
        });

        // 4. 添加标题
        const titleEl = this.createElement('div', {
            style: `
                font-weight: bold;
                margin-bottom: 5px;
                color: ${style.titleColor};
                display: flex;
                align-items: center;
            `
        }, `${style.icon} ${title}`);
        notification.appendChild(titleEl);

        // 5. 添加消息内容
        const messageEl = this.createElement('div', {
            style: 'color: #333;'
        }, message);
        notification.appendChild(messageEl);

        // 6. 添加到容器
        notificationContainer.appendChild(notification);

        // 7. 显示动画（使用setTimeout以确保DOM更新后应用过渡效果）
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 50);

        // 8. 设置自动消失
        setTimeout(() => {
            // 淡出动画
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(20px)';
            
            // 移除元素
            setTimeout(() => {
                try {
                    notification.remove();
                    
                    // 如果是最后一个通知，也移除容器
                    if (notificationContainer.children.length === 0) {
                        notificationContainer.remove();
                    }
                } catch (e) {
                    console.warn('移除通知元素失败', e);
                }
            }, 300); // 等待过渡动画完成
        }, duration);
    }
}

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

/**
 * 小红书私信自动回复助手 - 配置管理
 */

// 配置键名
const CONFIG_KEY = 'XHS_AUTO_REPLY_CONFIG';

class ConfigManager {
    constructor() {
        this.settings = null;
        this.defaultSettings = null;
        this.initialized = false;
    }

    /**
     * 初始化配置管理器
     */
    async initialize() {
        try {
            // 获取默认设置
            // 注意：这里假设 defaultSettings.js 已经被加载并赋值给 window.XHS_AUTO_REPLY_DEFAULT_SETTINGS
            // 在模块化构建中，需要确保 defaultSettings 在 ConfigManager 之前被定义或导入
            if (typeof defaultSettings !== 'undefined') {
                this.defaultSettings = defaultSettings;
            } else {
                console.error('找不到默认设置，请确保 defaultSettings.js 已加载');
                this.defaultSettings = {}; // 提供一个空对象作为回退
            }

            // 从存储加载设置
            await this.loadSettings();

            this.initialized = true;
            console.log('配置管理器初始化完成');
            return true;
        } catch (error) {
            console.error('配置管理器初始化失败:', error);
            return false;
        }
    }

    /**
     * 从GM存储加载设置
     */
    async loadSettings() {
        try {
            const savedSettings = GM_getValue(CONFIG_KEY);

            if (savedSettings) {
                // 合并默认设置和已保存设置
                this.settings = this.mergeSettings(this.defaultSettings, JSON.parse(savedSettings));
                console.log('从存储加载设置成功');
            } else {
                // 使用默认设置
                this.settings = JSON.parse(JSON.stringify(this.defaultSettings));
                console.log('未找到已保存设置，使用默认设置');
            }

            return this.settings;
        } catch (error) {
            console.error('加载设置失败:', error);
            this.settings = JSON.parse(JSON.stringify(this.defaultSettings));
            return this.settings;
        }
    }

    /**
     * 保存设置到GM存储
     */
    async saveSettings() {
        try {
            GM_setValue(CONFIG_KEY, JSON.stringify(this.settings));
            console.log('设置已保存到存储');
            return true;
        } catch (error) {
            console.error('保存设置失败:', error);
            return false;
        }
    }

    /**
     * 获取设置
     * @param {string} key 设置键，用.分隔层级
     * @param {*} defaultValue 默认值
     */
    getSetting(key, defaultValue = null) {
        if (!this.initialized) {
            console.warn('配置管理器尚未初始化');
            return defaultValue;
        }

        try {
            const keys = key.split('.');
            let value = this.settings;

            for (const k of keys) {
                if (value === null || value === undefined || !Object.prototype.hasOwnProperty.call(value, k)) {
                    return defaultValue;
                }
                value = value[k];
            }

            return value;
        } catch (error) {
            console.error(`获取设置[${key}]失败:`, error);
            return defaultValue;
        }
    }

    /**
     * 获取所有设置
     * @returns {object} 完整的设置对象
     */
    getSettings() {
        if (!this.initialized) {
            console.warn('配置管理器尚未初始化');
            return {};
        }

        try {
            // 返回设置的深拷贝，避免外部直接修改
            return JSON.parse(JSON.stringify(this.settings));
        } catch (error) {
            console.error('获取所有设置失败:', error);
            return {};
        }
    }

    /**
     * 获取所有设置的别名方法
     * @returns {object} 完整的设置对象
     */
    get() {
        return this.getSettings();
    }

    /**
     * 递归设置嵌套值的辅助方法
     * @param {object} obj 目标对象
     * @param {array} keys 键数组
     * @param {*} value 要设置的值
     * @param {number} index 当前处理的键索引
     * @private
     */
    _setNestedValue(obj, keys, value, index = 0) {
        const key = keys[index];

        // 如果是最后一个键，直接设置值
        if (index === keys.length - 1) {
            obj[key] = value;
            return;
        }

        // 如果中间层级不存在，需要初始化
        if (!Object.prototype.hasOwnProperty.call(obj, key)) {
            // 如果下一层是数字索引，初始化为数组，否则初始化为对象
            obj[key] = /^\d+$/.test(keys[index + 1]) ? [] : {};
        } else if (obj[key] === null || typeof obj[key] !== 'object') {
            // 如果当前层级存在但不是对象，需要转换为对象
            obj[key] = {};
        }

        // 递归设置下一层
        this._setNestedValue(obj[key], keys, value, index + 1);
    }

    /**
     * 设置设置项
     * @param {string} key 设置键，用.分隔层级
     * @param {*} value 设置值
     */
    async setSetting(key, value) {
        if (!this.initialized) {
            console.warn('配置管理器尚未初始化');
            return false;
        }

        try {
            const keys = key.split('.');

            // 使用递归方法设置值
            this._setNestedValue(this.settings, keys, value);

            // 保存到存储
            await this.saveSettings();

            return true;
        } catch (error) {
            console.error(`设置设置项[${key}]失败:`, error);
            return false;
        }
    }

    /**
     * 重置所有设置为默认值
     */
    async resetAllSettings() {
        try {
            this.settings = JSON.parse(JSON.stringify(this.defaultSettings));
            await this.saveSettings();
            console.log('所有设置已重置为默认值');
            return true;
        } catch (error) {
            console.error('重置所有设置失败:', error);
            return false;
        }
    }

    /**
     * 深度合并设置
     * @param {object} defaultObj 默认设置
     * @param {object} savedObj 已保存设置
     */
    mergeSettings(defaultObj, savedObj) {
        const result = JSON.parse(JSON.stringify(defaultObj));

        for (const key in savedObj) {
            if (Object.prototype.hasOwnProperty.call(savedObj, key)) {
                if (savedObj[key] !== null && typeof savedObj[key] === 'object' && !Array.isArray(savedObj[key]) &&
                    defaultObj[key] !== null && typeof defaultObj[key] === 'object' && !Array.isArray(defaultObj[key])) {
                    // 如果都是对象，递归合并
                    result[key] = this.mergeSettings(defaultObj[key], savedObj[key]);
                } else {
                    // 否则直接使用保存的值
                    result[key] = savedObj[key];
                }
            }
        }

        return result;
    }
}

/**
 * 小红书私信自动回复助手 - 远程控制模块
 */

class RemoteController {
    constructor(app) {
        this.app = app;
        this.initialized = false;
        this.checkTimer = null;
        this.isChecking = false;
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    /**
     * 初始化远程控制模块
     */
    async initialize() {
        try {
            this.app.utils.logger.info('初始化远程控制模块');
            
            // 检查是否启用远程控制
            const enabled = this.app.config.getSetting('remoteControl.enabled', true);
            if (!enabled) {
                this.app.utils.logger.info('远程控制功能已禁用');
                return true;
            }

            // 设置初始状态
            this.initialized = true;
            
            // 立即执行第一次检查
            await this.checkRemoteConfig();
            
            // 启动定期检查
            this.startPeriodicCheck();
            
            this.app.utils.logger.info('远程控制模块初始化完成');
            return true;
        } catch (error) {
            this.app.utils.logger.error('初始化远程控制模块失败', error);
            return false;
        }
    }

    /**
     * 启动定期检查
     */
    startPeriodicCheck() {
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
        }
        
        const interval = this.app.config.getSetting('remoteControl.checkInterval', 5 * 60 * 1000);
        this.app.utils.logger.debug(`设置远程配置检查间隔: ${interval}毫秒`);
        
        this.checkTimer = setInterval(() => {
            this.checkRemoteConfig();
        }, interval);
    }

    /**
     * 停止定期检查
     */
    stopPeriodicCheck() {
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
            this.checkTimer = null;
            this.app.utils.logger.debug('已停止远程配置定期检查');
        }
    }

    /**
     * 检查远程配置
     */
    async checkRemoteConfig() {
        if (this.isChecking) {
            this.app.utils.logger.debug('已有检查任务正在进行，跳过');
            return;
        }
        
        this.isChecking = true;
        this.retryCount = 0;
        
        try {
            const configUrl = this.app.config.getSetting('remoteControl.configUrl', '');
            if (!configUrl) {
                this.app.utils.logger.warn('未设置远程配置URL，跳过检查');
                this.isChecking = false;
                return;
            }
            
            this.app.utils.logger.debug(`正在检查远程配置: ${configUrl}`);
            
            // 尝试获取远程配置
            const config = await this.fetchRemoteConfig(configUrl);
            if (!config) {
                this.app.utils.logger.warn('获取远程配置失败');
                this.isChecking = false;
                return;
            }
            
            // 处理远程配置
            await this.processRemoteConfig(config);
            
            // 更新最后检查时间
            await this.app.config.setSetting('remoteControl.lastCheck', new Date().toISOString());
            
            this.app.utils.logger.debug('远程配置检查完成');
        } catch (error) {
            this.app.utils.logger.error('检查远程配置时出错', error);
        } finally {
            this.isChecking = false;
        }
    }

    /**
     * 获取远程配置
     * @param {string} url 远程配置URL
     * @returns {Promise<Object|null>} 远程配置对象，失败返回null
     */
    async fetchRemoteConfig(url) {
        try {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    },
                    onload: (response) => {
                        if (response.status !== 200) {
                            this.app.utils.logger.warn(`获取远程配置失败，状态码: ${response.status}`);
                            reject(new Error(`HTTP错误 ${response.status}`));
                            return;
                        }
                        
                        try {
                            const config = JSON.parse(response.responseText);
                            resolve(config);
                        } catch (error) {
                            this.app.utils.logger.error('解析远程配置JSON失败', error);
                            reject(error);
                        }
                    },
                    onerror: (error) => {
                        this.app.utils.logger.error('获取远程配置网络错误', error);
                        reject(error);
                    },
                    ontimeout: () => {
                        this.app.utils.logger.warn('获取远程配置超时');
                        reject(new Error('请求超时'));
                    }
                });
            });
        } catch (error) {
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                this.app.utils.logger.warn(`获取远程配置失败，正在重试 (${this.retryCount}/${this.maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒后重试
                return this.fetchRemoteConfig(url);
            }
            
            this.app.utils.logger.error('获取远程配置失败，已达到最大重试次数', error);
            return null;
        }
    }

    /**
     * 处理远程配置
     * @param {Object} config 远程配置对象
     */
    async processRemoteConfig(config) {
        try {
            // 提取必要的配置项
            const enabled = config.enabled === undefined ? true : !!config.enabled;
            const message = config.message || '脚本已被远程禁用';
            const lastUpdated = config.lastUpdated || new Date().toISOString();
            
            // 获取当前状态
            const currentStatus = this.app.config.getSetting('remoteControl.status', {
                enabled: true,
                message: '',
                lastUpdated: null
            });
            
            // 检查是否需要更新
            if (currentStatus.enabled !== enabled || 
                currentStatus.message !== message ||
                currentStatus.lastUpdated !== lastUpdated) {
                
                // 更新配置
                await this.app.config.setSetting('remoteControl.status', {
                    enabled: enabled,
                    message: message,
                    lastUpdated: lastUpdated
                });
                
                this.app.utils.logger.info(`远程控制状态已更新: ${enabled ? '启用' : '禁用'}`);
                
                // 根据远程配置执行相应操作
                if (enabled) {
                    this.enableScript();
                } else {
                    this.disableScript(message);
                }
            } else {
                this.app.utils.logger.debug('远程控制状态未变更，无需更新');
            }
        } catch (error) {
            this.app.utils.logger.error('处理远程配置时出错', error);
        }
    }

    /**
     * 启用脚本
     */
    enableScript() {
        try {
            // 检查消息检测器是否正在运行
            if (this.app.core && this.app.core.messageDetector && !this.app.core.messageDetector.running) {
                this.app.utils.logger.info('根据远程控制配置启动脚本');
                this.app.core.messageDetector.start();
                
                // 通知用户
                this.app.utils.dom.showNotification('小红书助手已远程启用', '根据远程配置，脚本已被启用');
            }
        } catch (error) {
            this.app.utils.logger.error('启用脚本时出错', error);
        }
    }

    /**
     * 禁用脚本
     * @param {string} message 禁用原因消息
     */
    disableScript(message) {
        try {
            // 检查消息检测器是否正在运行
            if (this.app.core && this.app.core.messageDetector && this.app.core.messageDetector.running) {
                this.app.utils.logger.info('根据远程控制配置停止脚本');
                this.app.core.messageDetector.stop();
                
                // 通知用户
                this.app.utils.dom.showNotification('小红书助手已远程禁用', message || '根据远程配置，脚本已被禁用');
            }
        } catch (error) {
            this.app.utils.logger.error('禁用脚本时出错', error);
        }
    }

    /**
     * 获取远程控制状态
     */
    getStatus() {
        return this.app.config.getSetting('remoteControl.status', {
            enabled: true,
            message: '',
            lastUpdated: null
        });
    }
} 

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


/**
 * 小红书私信自动回复助手 - 追粉系统处理模块
 */

class FollowUpHandler {
    constructor(app) {
        this.app = app;
        this.initialized = false;
        this.checkTimer = null;
        this.currentlySending = false;
        this.todaySentCount = 0;
        this.todaySentByContact = new Map();
        this.lastResetDate = new Date().toDateString();
    }

    /**
     * 初始化追粉系统处理模块
     */
    async initialize() {
        try {
            this.app.utils.logger.info('初始化追粉系统处理模块');

            // 加载统计数据
            await this.resetDailyCountersIfNeeded();

            // 注册设置面板
            this.registerSettings();

            this.initialized = true;
            
            // 如果启用了追粉系统，则启动定时检查
            if (this.isEnabled()) {
                await this.startPeriodicCheck();
            }

            return true;
        } catch (error) {
            this.app.utils.logger.error('初始化追粉系统处理模块失败', error);
            return false;
        }
    }

    /**
     * 注册设置面板
     */
    registerSettings() {
        try {
            // 在实际实现中，这部分代码将注册追粉系统的设置面板
            // 类似于 this.app.ui.settings.registerSection('followUp', {...})
            this.app.utils.logger.debug('追粉系统设置已注册');
        } catch (error) {
            this.app.utils.logger.error('注册追粉系统设置面板失败', error);
        }
    }

    /**
     * 检查追粉系统是否启用
     * @returns {boolean} 是否启用
     */
    isEnabled() {
        return this.app.config.getSetting('followUp.enabled', false);
    }

    /**
     * 检查未开口用户追粉是否启用
     * @returns {boolean} 是否启用
     */
    isNoResponseFollowUpEnabled() {
        return this.isEnabled() && this.app.config.getSetting('followUp.noResponseSettings.enabled', true);
    }

    /**
     * 检查未留资用户追粉是否启用
     * @returns {boolean} 是否启用
     */
    isNoContactFollowUpEnabled() {
        return this.isEnabled() && this.app.config.getSetting('followUp.noContactSettings.enabled', true);
    }

    /**
     * 启动定时检查
     */
    async startPeriodicCheck() {
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
        }

        // 获取检查间隔
        const checkInterval = this.app.config.getSetting('followUp.checkInterval', 30 * 60 * 1000);

        // 设置定时器
        this.checkTimer = setInterval(() => this.checkAndSendFollowUps(), checkInterval);
        
        // 立即执行一次检查
        this.app.utils.logger.info('追粉系统已启动，立即执行首次检查');
        await this.checkAndSendFollowUps();
    }

    /**
     * 停止定时检查
     */
    stopPeriodicCheck() {
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
            this.checkTimer = null;
            this.app.utils.logger.info('追粉系统已停止');
        }
    }

    /**
     * 重新启动追粉系统
     */
    async restart() {
        this.stopPeriodicCheck();
        if (this.isEnabled()) {
            await this.startPeriodicCheck();
        }
    }

    /**
     * 重置每日计数器（如果需要）
     */
    async resetDailyCountersIfNeeded() {
        const today = new Date().toDateString();
        if (today !== this.lastResetDate) {
            this.todaySentCount = 0;
            this.todaySentByContact.clear();
            this.lastResetDate = today;
            this.app.utils.logger.info('重置追粉系统每日计数器');
        }
    }

    /**
     * 检查是否在追粉工作时间内
     * @returns {boolean} 是否在工作时间内
     */
    isInWorkingHours() {
        // 获取工作时间设置
        const workingHoursEnabled = this.app.config.getSetting('followUp.workingHours.enabled', false);
        
        // 如果工作时间限制未启用，则总是返回 true
        if (!workingHoursEnabled) return true;
        
        const startTime = this.app.config.getSetting('followUp.workingHours.startTime', '09:00');
        const endTime = this.app.config.getSetting('followUp.workingHours.endTime', '21:00');
        
        // 解析时间
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);
        
        // 转换为分钟进行比较
        const currentTimeInMinutes = currentHour * 60 + currentMinute;
        const startTimeInMinutes = startHour * 60 + startMinute;
        const endTimeInMinutes = endHour * 60 + endMinute;
        
        // 检查是否在工作时间内
        return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes;
    }

    /**
     * 检查是否超过每日发送限制
     * @param {string} contactId 联系人ID
     * @returns {boolean} 是否超过限制
     */
    isFollowUpLimitExceeded(contactId) {
        // 重置每日计数器（如果需要）
        this.resetDailyCountersIfNeeded();
        
        // 获取限制设置
        const dailyLimit = this.app.config.getSetting('followUp.dailyLimit', 30);
        const maxDailyPerContact = this.app.config.getSetting('followUp.maxDailyPerContact', 1);
        
        // 检查每日总发送数
        if (this.todaySentCount >= dailyLimit) {
            this.app.utils.logger.info(`已达到每日追粉上限 (${dailyLimit})`);
            return true;
        }
        
        // 检查每个联系人每日发送数
        const contactSentCount = this.todaySentByContact.get(contactId) || 0;
        if (contactSentCount >= maxDailyPerContact) {
            this.app.utils.logger.info(`联系人 ${contactId} 已达到每日追粉上限 (${maxDailyPerContact})`);
            return true;
        }
        
        return false;
    }

    /**
     * 记录发送追粉消息
     * @param {string} contactId 联系人ID
     */
    recordFollowUpSent(contactId) {
        // 重置每日计数器（如果需要）
        this.resetDailyCountersIfNeeded();
        
        // 更新计数
        this.todaySentCount++;
        this.todaySentByContact.set(contactId, (this.todaySentByContact.get(contactId) || 0) + 1);
    }

    /**
     * 检查并发送追粉消息
     */
    async checkAndSendFollowUps() {
        try {
            // 防止并发执行
            if (this.currentlySending || !this.initialized) {
                return;
            }
            
            this.currentlySending = true;
            
            // 检查是否启用
            if (!this.isEnabled()) {
                this.app.utils.logger.debug('追粉系统未启用，跳过检查');
                this.currentlySending = false;
                return;
            }
            
            // 检查是否在工作时间内
            if (!this.isInWorkingHours()) {
                this.app.utils.logger.debug('当前不在追粉工作时间内，跳过检查');
                this.currentlySending = false;
                return;
            }
            
            // 重置每日计数器（如果需要）
            await this.resetDailyCountersIfNeeded();
            
            // 获取需要追粉的联系人
            // 先处理未开口用户，再处理未留资用户
            let contactsToFollowUp = [];
            
            // 1. 处理未开口用户
            if (this.isNoResponseFollowUpEnabled()) {
                const noResponseContacts = await this.app.utils.sessionManager.getNoResponseContactsForFollowUp();
                contactsToFollowUp = [...contactsToFollowUp, ...noResponseContacts];
            }
            
            // 2. 处理未留资用户
            if (this.isNoContactFollowUpEnabled()) {
                const noContactContacts = await this.app.utils.sessionManager.getNoContactContactsForFollowUp();
                contactsToFollowUp = [...contactsToFollowUp, ...noContactContacts];
            }
            
            if (contactsToFollowUp.length === 0) {
                this.app.utils.logger.debug('没有需要追粉的联系人');
                this.currentlySending = false;
                return;
            }
            
            this.app.utils.logger.info(`找到 ${contactsToFollowUp.length} 个需要追粉的联系人`);
            
            // 获取黑名单
            const blacklist = this.app.config.getSetting('followUp.blacklist', []);
            
            // 处理每个需要追粉的联系人
            for (const contact of contactsToFollowUp) {
                // 检查是否在黑名单中
                if (blacklist.includes(contact.contactId)) {
                    this.app.utils.logger.debug(`联系人 ${contact.contactId} 在黑名单中，跳过追粉`);
                    continue;
                }
                
                // 检查是否超过每日发送限制
                if (this.isFollowUpLimitExceeded(contact.contactId)) {
                    continue;
                }
                
                // 发送追粉消息
                await this.sendFollowUpMessage(contact);
                
                // 短暂延迟，避免连续发送
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
        } catch (error) {
            this.app.utils.logger.error('执行追粉检查失败', error);
        } finally {
            this.currentlySending = false;
        }
    }

    /**
     * 根据用户状态和追粉次数获取对应的消息模板
     * @param {string} status 用户状态
     * @param {number} followUpCount 追粉次数
     * @returns {string|null} 消息模板或null
     */
    getFollowUpTemplate(status, followUpCount) {
        try {
            let templates = [];
            let settingsPath = '';
            
            // 根据用户状态选择模板组
            if (status === 'no_response') {
                settingsPath = 'followUp.noResponseSettings.templates';
            } else if (status === 'no_contact') {
                settingsPath = 'followUp.noContactSettings.templates';
            } else {
                this.app.utils.logger.warn(`不支持的用户状态 ${status} 的追粉模板`);
                return null;
            }
            
            // 获取模板组
            templates = this.app.config.getSetting(settingsPath, []);
            if (templates.length === 0) {
                this.app.utils.logger.warn(`未配置 ${status} 状态的追粉消息模板`);
                return null;
            }
            
            // 追粉次数是从0开始的，但模板数组从0开始索引
            const templateIndex = Math.min(followUpCount, templates.length - 1);
            const template = templates[templateIndex];
            
            if (!template || !template.message) {
                this.app.utils.logger.warn(`未找到 ${status} 状态第 ${followUpCount+1} 次追粉的消息模板`);
                return null;
            }
            
            return template.message;
        } catch (error) {
            this.app.utils.logger.error('获取追粉模板失败', error);
            return null;
        }
    }

    /**
     * 发送追粉消息
     * @param {Object} contact 联系人信息对象 {contactId, status, followUpCount}
     */
    async sendFollowUpMessage(contact) {
        try {
            const { contactId, status, followUpCount } = contact;
            
            // 根据用户状态和追粉次数获取消息模板
            const templateMessage = this.getFollowUpTemplate(status, followUpCount);
            if (!templateMessage) {
                this.app.utils.logger.warn(`未找到适合联系人 ${contactId} (状态: ${status}, 追粉次数: ${followUpCount}) 的追粉模板`);
                return;
            }
            
            // 如果是未开口用户的第一次追粉，且配置了使用获客工具，则发送获客工具
            const useLeadTools = this.app.config.getSetting('followUp.useLeadTools', false);
            const leadToolFrequency = this.app.config.getSetting('followUp.leadToolFollowUpFrequency', 0);
            
            let sentLeadTool = false;
            
            if (useLeadTools && leadToolFrequency > 0 && (followUpCount % leadToolFrequency === 0)) {
                sentLeadTool = await this.sendFollowUpLeadCard(contactId);
                // 如果发送了获客工具，延迟一段时间再发送文本消息
                if (sentLeadTool) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            // 发送文本追粉消息
            this.app.utils.logger.info(`向联系人 ${contactId} 发送状态为 ${status} 的第 ${followUpCount+1} 次追粉消息`);
            const sentSuccess = await this.app.core.autoReply.sendReply(contactId, templateMessage);
            
            if (sentSuccess) {
                // 记录发送成功
                this.recordFollowUpSent(contactId);
                
                // 记录到会话历史
                await this.app.utils.sessionManager.updateSessionHistory(contactId, {
                    role: 'assistant',
                    content: templateMessage,
                    isFollowUp: true,
                    followUpStatus: status,
                    followUpCount: followUpCount,
                    timestamp: Date.now()
                });
                
                // 增加用户的追粉次数记录并记录追粉时间
                await this.app.utils.sessionManager.incrementFollowUpCount(contactId);
                await this.app.utils.sessionManager.recordFollowUpTime(contactId);
                
                this.app.utils.logger.info(`成功向联系人 ${contactId} 发送追粉消息`);
            } else {
                this.app.utils.logger.warn(`向联系人 ${contactId} 发送追粉消息失败`);
            }
        } catch (error) {
            this.app.utils.logger.error(`发送追粉消息给联系人 ${contact.contactId} 失败`, error);
        }
    }

    /**
     * 发送追粉获客工具
     * @param {string} contactId 联系人ID
     * @returns {Promise<boolean>} 是否发送成功
     */
    async sendFollowUpLeadCard(contactId) {
        try {
            if (!this.app.core.leadGenerationHandler) {
                this.app.utils.logger.warn('获客工具处理器未初始化，无法发送追粉获客工具');
                return false;
            }
            
            // 获取配置的获客工具信息
            const defaultTool = this.app.config.getSetting('leadGeneration.defaultTool', null);
            
            if (!defaultTool || !defaultTool.type) {
                this.app.utils.logger.debug('未配置默认获客工具，跳过发送');
                return false;
            }
            
            // 查找获客工具
            const tool = this.findLeadTool(defaultTool.type, defaultTool.index);
            if (!tool) {
                this.app.utils.logger.warn(`未找到类型为 ${defaultTool.type} 索引为 ${defaultTool.index} 的获客工具`);
                return false;
            }
            
            // 发送获客工具
            this.app.utils.logger.info(`向联系人 ${contactId} 发送追粉获客工具: ${tool.title}`);
            const sentSuccess = await this.app.core.leadGenerationHandler.sendTool(tool);
            
            if (sentSuccess) {
                this.app.utils.logger.info(`成功向联系人 ${contactId} 发送追粉获客工具`);
                
                // 记录获客工具发送时间
                if (this.app.utils.sessionManager.recordLeadSentTime) {
                    await this.app.utils.sessionManager.recordLeadSentTime(contactId);
                }
                
                return true;
            } else {
                this.app.utils.logger.warn(`向联系人 ${contactId} 发送追粉获客工具失败`);
                return false;
            }
        } catch (error) {
            this.app.utils.logger.error(`发送追粉获客工具给联系人 ${contactId} 失败`, error);
            return false;
        }
    }

    /**
     * 查找获客工具
     * @param {string} toolType 工具类型
     * @param {number} toolIndex 工具索引
     * @returns {Object|null} 获客工具对象或null
     */
    findLeadTool(toolType, toolIndex) {
        try {
            if (!this.app.core.leadGenerationHandler || !this.app.core.leadGenerationHandler.tools) {
                return null;
            }
            
            const tools = this.app.core.leadGenerationHandler.tools[toolType];
            if (!tools || !Array.isArray(tools) || tools.length === 0) {
                return null;
            }
            
            if (toolIndex < 0 || toolIndex >= tools.length) {
                return tools[0]; // 如果索引越界，使用第一个工具
            }
            
            return tools[toolIndex];
        } catch (error) {
            this.app.utils.logger.error('查找获客工具失败', error);
            return null;
        }
    }

    /**
     * 手动向指定联系人发送追粉消息
     * @param {string} contactId 联系人ID
     * @param {string} status 用户状态，'no_response' 或 'no_contact'
     * @returns {Promise<boolean>} 是否发送成功
     */
    async manualSendFollowUp(contactId, status = 'no_response') {
        try {
            // 获取用户当前追粉次数
            const followUpCount = await this.app.utils.sessionManager.getFollowUpCount(contactId);
            
            // 构造联系人信息对象
            const contact = {
                contactId,
                status,
                followUpCount
            };
            
            // 发送追粉消息
            await this.sendFollowUpMessage(contact);
            
            return true;
        } catch (error) {
            this.app.utils.logger.error(`手动发送追粉消息给联系人 ${contactId} 失败`, error);
            return false;
        }
    }

    /**
     * 将用户标记为新用户（未开口）
     * @param {string} contactId 联系人ID
     * @returns {Promise<boolean>} 是否成功
     */
    async markAsNoResponse(contactId) {
        try {
            const result = await this.app.utils.sessionManager.setUserStatus(contactId, 'no_response');
            if (result) {
                this.app.utils.logger.info(`已将联系人 ${contactId} 标记为未开口用户`);
            }
            return result;
        } catch (error) {
            this.app.utils.logger.error(`标记联系人 ${contactId} 为未开口用户失败`, error);
            return false;
        }
    }

    /**
     * 将用户标记为未留资用户
     * @param {string} contactId 联系人ID
     * @returns {Promise<boolean>} 是否成功
     */
    async markAsNoContact(contactId) {
        try {
            const result = await this.app.utils.sessionManager.setUserStatus(contactId, 'no_contact');
            if (result) {
                this.app.utils.logger.info(`已将联系人 ${contactId} 标记为未留资用户`);
            }
            return result;
        } catch (error) {
            this.app.utils.logger.error(`标记联系人 ${contactId} 为未留资用户失败`, error);
            return false;
        }
    }

    /**
     * 将用户标记为已转化
     * @param {string} contactId 联系人ID
     * @returns {Promise<boolean>} 是否成功
     */
    async markAsConverted(contactId) {
        try {
            const result = await this.app.utils.sessionManager.markUserAsConverted(contactId);
            if (result) {
                this.app.utils.logger.info(`已将联系人 ${contactId} 标记为已转化用户`);
            }
            return result;
        } catch (error) {
            this.app.utils.logger.error(`标记联系人 ${contactId} 为已转化用户失败`, error);
            return false;
        }
    }
} 

class FollowUpManager {
    constructor(app) {
        this.app = app;
        this.db = app.utils.storage;
        this.settings = app.settings;
        this.lastCheck = null;
        this.checkTimer = null;
        this.isRunning = false;
        this.todayFollowupCount = 0;
        this.todayDate = new Date().toDateString();
    }

    /**
     * 初始化追粉系统
     */
    async init() {
        console.log('初始化追粉系统...');
        try {
            // 加载今日已发送的追粉消息数量
            await this.loadTodayFollowupCount();
            // 启动定时检查
            await this.startChecking();
            console.log('追粉系统初始化完成，当前状态：' + (this.isEnabled() ? '已启用' : '未启用'));
            return true;
        } catch (error) {
            console.error('追粉系统初始化失败', error);
            return false;
        }
    }

    /**
     * 加载今日已发送的追粉消息数量
     */
    async loadTodayFollowupCount() {
        try {
            const today = new Date().toDateString();
            if (this.todayDate !== today) {
                // 如果日期变了，重置计数
                this.todayFollowupCount = 0;
                this.todayDate = today;
                return;
            }

            if (!this.db || typeof this.db.getStats !== 'function') {
                console.error('数据存储对象不可用');
                this.todayFollowupCount = 0;
                return;
            }

            const stats = await this.db.getStats();
            if (stats && stats.dailyFollowups && stats.dailyFollowups[today]) {
                this.todayFollowupCount = stats.dailyFollowups[today];
            } else {
                this.todayFollowupCount = 0;
            }
        } catch (error) {
            console.error('加载今日追粉数量失败:', error);
            this.todayFollowupCount = 0;
        }
    }

    /**
     * 更新今日已发送的追粉消息数量
     */
    async updateTodayFollowupCount() {
        try {
            if (!this.db || typeof this.db.getStats !== 'function' || typeof this.db.saveStats !== 'function') {
                console.error('数据存储对象不可用');
                return;
            }

            const today = new Date().toDateString();
            const stats = await this.db.getStats() || {};
            
            if (!stats.dailyFollowups) {
                stats.dailyFollowups = {};
            }
            
            stats.dailyFollowups[today] = this.todayFollowupCount;
            await this.db.saveStats(stats);
        } catch (error) {
            console.error('更新今日追粉数量失败:', error);
        }
    }

    /**
     * 启动定时检查
     */
    async startChecking() {
        try {
            if (this.checkTimer) {
                clearInterval(this.checkTimer);
                this.checkTimer = null;
                console.log('已清除之前的追粉检查定时器');
            }

            if (!this.settings || typeof this.settings.get !== 'function') {
                console.error('追粉系统设置不可用，无法启动追粉系统');
                return false;
            }

            const settings = this.settings.get();
            console.log('获取追粉系统设置:', JSON.stringify(settings.followUp));

            if (!settings.followUp) {
                console.error('追粉系统设置不存在，无法启动追粉系统');
                return false;
            }

            if (!settings.followUp.enabled) {
                console.log('追粉系统未启用，不启动定时检查');
                return false;
            }

            // 设置检查间隔（小时转为毫秒）
            const checkIntervalHours = settings.followUp.checkInterval || 1;
            const checkInterval = checkIntervalHours * 60 * 60 * 1000; // 转换为毫秒
            console.log(`启动追粉系统定时检查，间隔: ${checkIntervalHours}小时 (${checkInterval}ms)`);
            
            this.checkTimer = setInterval(() => this.checkFollowUps(), checkInterval);
            // 立即执行一次检查
            this.checkFollowUps();
            
            return true;
        } catch (error) {
            console.error('启动追粉系统定时检查失败', error);
            return false;
        }
    }

    /**
     * 停止定时检查
     */
    stopChecking() {
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
            this.checkTimer = null;
        }
        this.isRunning = false;
        console.log('追粉系统已停止');
    }

    /**
     * 检查追粉系统是否启用
     * @returns {boolean} 是否启用
     */
    isEnabled() {
        try {
            if (!this.settings || typeof this.settings.get !== 'function') {
                console.error('追粉系统设置不可用');
                return false;
            }

            const settings = this.settings.get();
            if (!settings || !settings.followUp) {
                console.error('追粉系统设置不存在');
                return false;
            }

            console.log('追粉系统启用状态:', settings.followUp.enabled);
            return !!settings.followUp.enabled;
        } catch (error) {
            console.error('检查追粉系统启用状态时出错', error);
            return false;
        }
    }

    /**
     * 检查需要追踪的私信
     */
    async checkFollowUps() {
        if (this.isRunning) {
            console.log('追粉检查已在进行中，跳过本次检查');
            return;
        }

        this.isRunning = true;
        console.log('开始追粉检查...');
        
        try {
            const settings = this.settings.get();
            if (!settings.followUp || !settings.followUp.enabled) {
                console.log('追粉系统未启用');
                this.isRunning = false;
                return;
            }

            // 加载今日已发送的追粉消息数量
            await this.loadTodayFollowupCount();
            
            // 检查是否达到每日上限
            const dailyLimit = settings.followUp.dailyLimit || 50;
            if (this.todayFollowupCount >= dailyLimit) {
                console.log(`已达到每日追粉上限(${dailyLimit})，跳过本次检查`);
                this.isRunning = false;
                return;
            }

            // 检查工作时间
            if (!this.isWithinWorkingHours()) {
                console.log('当前不在工作时间内，跳过本次检查');
                this.isRunning = false;
                return;
            }

            // 处理无回复的联系人
            await this.processNoResponseContacts();
            
            // 处理无联系方式的联系人
            await this.processNoContactContacts();
            
            console.log('追粉检查完成');
        } catch (error) {
            console.error('追粉检查出错:', error);
        }
        
        this.isRunning = false;
    }

    /**
     * 判断当前是否在工作时间内
     */
    isWithinWorkingHours() {
        const settings = this.settings.get();
        if (!settings.followUp || !settings.followUp.workingHours || !settings.followUp.workingHours.enabled) {
            return true; // 如果未启用工作时间限制，则始终返回true
        }

        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = currentHour * 60 + currentMinute; // 转换为分钟数
        
        const startTime = settings.followUp.workingHours.startTime || '09:00';
        const endTime = settings.followUp.workingHours.endTime || '18:00';
        
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);
        
        const workStartTime = startHour * 60 + startMinute;
        const workEndTime = endHour * 60 + endMinute;
        
        return currentTime >= workStartTime && currentTime <= workEndTime;
    }

    /**
     * 处理无回复的联系人
     */
    async processNoResponseContacts() {
        const settings = this.settings.get();
        if (!settings.followUp.noResponseSettings || !settings.followUp.noResponseSettings.enabled) {
            console.log('未启用无回复追粉功能，跳过处理');
            return;
        }

        // 将小时转换为毫秒
        const intervalHours = settings.followUp.noResponseSettings.interval || 24;
        const interval = intervalHours * 60 * 60 * 1000; // 毫秒
        const maxFollowups = settings.followUp.noResponseSettings.maxFollowups || 3;
        const templates = settings.followUp.noResponseSettings.templates || [];
        
        if (templates.length === 0) {
            console.log('未配置无回复追粉模板，跳过处理');
            return;
        }

        // 获取所有需要跟进的联系人
        const contacts = await this.db.getContactsForNoResponseFollowup(interval);
        console.log(`找到${contacts.length}个无回复需要追踪的联系人`);
        
        for (const contact of contacts) {
            // 检查是否达到每日上限
            if (this.todayFollowupCount >= settings.followUp.dailyLimit) {
                console.log(`已达到每日追粉上限(${settings.followUp.dailyLimit})，停止处理`);
                break;
            }

            // 检查该联系人的追粉次数是否达到上限
            const followupCount = contact.followups ? contact.followups.length : 0;
            if (followupCount >= maxFollowups) {
                console.log(`联系人 ${contact.name || contact.id} 已达到最大追粉次数 ${maxFollowups}，跳过`);
                continue;
            }

            if (followupCount >= templates.length) {
                console.log(`联系人 ${contact.name || contact.id} 已用完所有追粉模板，跳过`);
                continue;
            }

            // 获取模板
            const template = templates[followupCount];
            if (!template) continue;

            // 发送追粉消息
            try {
                await this.sendFollowupMessage(contact, template);
                
                // 更新联系人追粉记录
                if (!contact.followups) {
                    contact.followups = [];
                }
                
                contact.followups.push({
                    type: 'noResponse',
                    time: new Date().toISOString(),
                    template: followupCount + 1
                });
                
                await this.db.updateContactInfo(contact.id, contact);
                
                // 更新今日追粉计数
                this.todayFollowupCount++;
                await this.updateTodayFollowupCount();
                
                console.log(`成功向联系人 ${contact.name || contact.id} 发送第 ${followupCount + 1} 次无回复追粉消息`);
            } catch (error) {
                console.error(`向联系人 ${contact.name || contact.id} 发送追粉消息失败:`, error);
            }
        }
    }

    /**
     * 处理无联系方式的联系人
     */
    async processNoContactContacts() {
        const settings = this.settings.get();
        if (!settings.followUp.noContactSettings || !settings.followUp.noContactSettings.enabled) {
            console.log('未启用未留客资追粉功能，跳过处理');
            return;
        }

        // 将小时转换为毫秒
        const intervalHours = settings.followUp.noContactSettings.interval || 24;
        const interval = intervalHours * 60 * 60 * 1000; // 毫秒
        const maxFollowups = settings.followUp.noContactSettings.maxFollowups || 3;
        const templates = settings.followUp.noContactSettings.templates || [];
        
        if (templates.length === 0) {
            console.log('未配置未留客资追粉模板，跳过处理');
            return;
        }

        // 获取所有需要跟进的联系人
        const contacts = await this.db.getContactsForNoContactFollowup(interval);
        console.log(`找到${contacts.length}个未留客资需要追踪的联系人`);
        
        for (const contact of contacts) {
            // 检查是否达到每日上限
            if (this.todayFollowupCount >= settings.followUp.dailyLimit) {
                console.log(`已达到每日追粉上限(${settings.followUp.dailyLimit})，停止处理`);
                break;
            }

            // 检查该联系人的追粉次数是否达到上限
            const followupCount = contact.followups ? contact.followups.length : 0;
            if (followupCount >= maxFollowups) {
                console.log(`联系人 ${contact.name || contact.id} 已达到最大追粉次数 ${maxFollowups}，跳过`);
                continue;
            }

            if (followupCount >= templates.length) {
                console.log(`联系人 ${contact.name || contact.id} 已用完所有追粉模板，跳过`);
                continue;
            }

            // 获取模板
            const template = templates[followupCount];
            if (!template) continue;

            // 发送追粉消息
            try {
                await this.sendFollowupMessage(contact, template);
                
                // 更新联系人追粉记录
                if (!contact.followups) {
                    contact.followups = [];
                }
                
                contact.followups.push({
                    type: 'noContact',
                    time: new Date().toISOString(),
                    template: followupCount + 1
                });
                
                await this.db.updateContactInfo(contact.id, contact);
                
                // 更新今日追粉计数
                this.todayFollowupCount++;
                await this.updateTodayFollowupCount();
                
                console.log(`成功向联系人 ${contact.name || contact.id} 发送第 ${followupCount + 1} 次无联系方式追粉消息`);
            } catch (error) {
                console.error(`向联系人 ${contact.name || contact.id} 发送追粉消息失败:`, error);
            }
        }
    }

    /**
     * 发送追粉消息
     * @param {Object} contact 联系人信息
     * @param {String} template 消息模板
     */
    async sendFollowupMessage(contact, template) {
        // 替换模板中的变量
        const message = this.app.utils.template.replaceTemplateVariables(template, contact);
        
        // 调用发送消息API
        await this.app.api.sendMessage(contact.id, message);
        
        return true;
    }

    /**
     * 重置追粉系统
     */
    reset() {
        console.log('重置追粉系统...');
        this.stopChecking();

        // 检查系统是否启用
        if (this.isEnabled()) {
            console.log('追粉系统已启用，重新启动定时检查');
            this.startChecking();
        } else {
            console.log('追粉系统未启用，不重新启动');
        }
    }

    /**
     * 手动触发追粉检查
     */
    async manualCheck() {
        if (this.isRunning) {
            return {success: false, message: '追粉检查已在进行中'};
        }
        
        await this.checkFollowUps();
        return {success: true, message: '追粉检查已完成'};
    }
} 

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

/**
     * 小红书私信自动回复助手 - 消息处理模块
     */

    class MessageHandler {
        constructor(app) {
            this.app = app;
            this.processingMessage = false; // 是否正在处理消息
            this.messageRetryQueue = []; // 添加一个重试队列，用于存储处理失败的消息
            this.maxRetries = 3; // 最大重试次数
            this.retryInterval = 2000; // 重试间隔（毫秒）
            this.retryTimeoutId = null; // 重试的定时器ID
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

                // 启动重试机制
                this.startRetryTimer();

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
                // 添加到重试队列，确保后续处理
                this.addToRetryQueue({message, retryCount: 0});
                return;
            }

            try {
                this.processingMessage = true;

                // 检查配置初始化是否完成
                if (!this.app.config || !this.app.config.initialized) {
                    this.app.utils.logger.warn('配置初始化尚未完成，将消息添加到重试队列');
                    this.addToRetryQueue({message, retryCount: 0});
                    this.processingMessage = false; // 释放锁
                    return;
                }

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
                if (!this.app.utils.sessionManager) {
                    this.app.utils.logger.error('会话管理器未初始化，将消息添加到重试队列');
                    this.addToRetryQueue({message, retryCount: 0});
                    this.processingMessage = false; // 释放锁
                    return;
                }
                if (!this.app.core.aiService) {
                    this.app.utils.logger.error('AI 服务未初始化，将消息添加到重试队列');
                    this.addToRetryQueue({message, retryCount: 0});
                    this.processingMessage = false; // 释放锁
                    return;
                }
                if (!this.app.core.leadGenerationHandler) {
                    this.app.utils.logger.error('获客工具处理器未初始化，将消息添加到重试队列');
                    this.addToRetryQueue({message, retryCount: 0});
                    this.processingMessage = false; // 释放锁
                    return;
                }
                if (!this.app.core.autoReply) {
                    this.app.utils.logger.error('自动回复模块未初始化，将消息添加到重试队列');
                    this.addToRetryQueue({message, retryCount: 0});
                    this.processingMessage = false; // 释放锁
                    return;
                }
                if (!message || !message.contactId || message.content === undefined) {
                    this.app.utils.logger.error('消息数据不完整，跳过处理');
                    this.processingMessage = false; // 释放锁
                    return;
                }

                // [新增] 检查联系人是否有客资标签且启用了忽略功能
                const ignoreLeadTags = this.app.config.getSetting('reply.ignoreLeadTags', false);
                if (ignoreLeadTags) {
                    // 查找联系人元素
                    const contactSelector = `[data-contactusemid="${message.contactId}"]`;
                    const contactElement = document.querySelector(contactSelector);
                    
                    if (contactElement) {
                        // 检查客资标签
                        const { hasLeadTag, leadTagText } = this.app.core.messageDetector.checkContactLeadTag(contactElement);
                        
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
                // 添加到重试队列
                this.addToRetryQueue({message, retryCount: 0});
            } finally {
                this.processingMessage = false;
            }
        }

        /**
         * 添加消息到重试队列
         * @param {Object} retryData 包含消息和重试次数的对象
         */
        addToRetryQueue(retryData) {
            // 检查是否已经在队列中
            const existingIndex = this.messageRetryQueue.findIndex(item => 
                item.message.id === retryData.message.id);
            
            if (existingIndex >= 0) {
                // 更新已存在的条目
                this.messageRetryQueue[existingIndex].retryCount = Math.max(
                    this.messageRetryQueue[existingIndex].retryCount,
                    retryData.retryCount
                );
                this.app.utils.logger.debug(`更新重试队列中的消息，ID: ${retryData.message.id}，重试次数: ${this.messageRetryQueue[existingIndex].retryCount}`);
            } else {
                // 添加新条目
                this.messageRetryQueue.push(retryData);
                this.app.utils.logger.debug(`将消息添加到重试队列，ID: ${retryData.message.id}，重试次数: ${retryData.retryCount}`);
            }
        }

        /**
         * 启动重试计时器
         */
        startRetryTimer() {
            if (this.retryTimeoutId) {
                clearTimeout(this.retryTimeoutId);
            }

            this.retryTimeoutId = setTimeout(() => {
                this.processRetryQueue();
            }, this.retryInterval);
        }

        /**
         * 处理重试队列中的消息
         */
        async processRetryQueue() {
            if (this.messageRetryQueue.length === 0) {
                // 队列为空，继续等待
                this.startRetryTimer();
                return;
            }

            if (this.processingMessage) {
                // 当前正在处理消息，稍后再试
                this.app.utils.logger.debug('当前正在处理消息，延迟处理重试队列');
                this.startRetryTimer();
                return;
            }

            // 取出第一个待重试的消息
            const retryData = this.messageRetryQueue.shift();
            
            // 检查重试次数
            if (retryData.retryCount >= this.maxRetries) {
                this.app.utils.logger.warn(`消息 ${retryData.message.id} 已达到最大重试次数 ${this.maxRetries}，放弃处理`);
                // 继续处理下一个消息
                this.startRetryTimer();
                return;
            }

            // 更新重试次数
            retryData.retryCount++;
            
            this.app.utils.logger.info(`尝试重新处理消息，ID: ${retryData.message.id}，重试次数: ${retryData.retryCount}/${this.maxRetries}`);
            
            // 尝试处理消息
            try {
                await this.handleMessage(retryData.message);
            } catch (error) {
                this.app.utils.logger.error(`重试处理消息失败，ID: ${retryData.message.id}`, error);
                // 如果还没达到最大重试次数，重新加入队列
                if (retryData.retryCount < this.maxRetries) {
                    this.addToRetryQueue(retryData);
                }
            }

            // 继续处理队列中的下一个消息
            this.startRetryTimer();
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

/**
 * 小红书私信自动回复助手 - 控制面板
 */

class ControlPanel {
    constructor(app) {
        this.app = app;
        this.panel = null; // 面板元素
        this.visible = false; // 面板是否可见
        this.initialized = false; // 是否已初始化
        this.position = null; // 面板位置
    }

    /**
     * 初始化控制面板
     */
    async initialize() {
        try {
            this.app.utils.logger.info('初始化控制面板');

            // 获取面板位置设置
            this.position = this.app.config.getSetting('ui.floatingPanelPosition', 'bottom-right');

            // 创建面板样式
            this.createStyles();

            // 创建面板DOM
            await this.createPanel();

            // 注册GM菜单项
            this.registerMenus();

            this.initialized = true;

            // 绑定事件
            this.bindEvents();

            return true;
        } catch (error) {
            this.app.utils.logger.error('初始化控制面板失败', error);
            return false;
        }
    }

    /**
     * 创建面板样式
     */
    createStyles() {
        const styles = `
            /* 控制面板样式 */
            .xhs-auto-reply-panel {
                position: fixed;
                width: 300px;
                background-color: #fff;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                z-index: 9999;
                font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
                transition: all 0.3s ease;
                overflow: hidden;
            }

            /* 面板位置 */
            .xhs-auto-reply-panel.top-left {
                top: 20px;
                left: 20px;
            }

            .xhs-auto-reply-panel.top-right {
                top: 20px;
                right: 20px;
            }

            .xhs-auto-reply-panel.bottom-left {
                bottom: 20px;
                left: 20px;
            }

            .xhs-auto-reply-panel.bottom-right {
                bottom: 20px;
                right: 20px;
            }

            /* 面板头部 */
            .xhs-auto-reply-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                background-color: #FF2442;
                color: white;
                cursor: move;
            }

            .xhs-auto-reply-panel-title {
                font-weight: bold;
                font-size: 14px;
            }

            .xhs-auto-reply-panel-close {
                cursor: pointer;
                font-size: 16px;
            }

            /* 面板内容 */
            .xhs-auto-reply-panel-content {
                padding: 16px;
            }

            /* 开关样式 */
            .xhs-auto-reply-switch {
                position: relative;
                display: inline-block;
                width: 40px;
                height: 20px;
            }

            .xhs-auto-reply-switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }

            .xhs-auto-reply-switch-slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #ccc;
                transition: .4s;
                border-radius: 34px;
            }

            .xhs-auto-reply-switch-slider:before {
                position: absolute;
                content: "";
                height: 16px;
                width: 16px;
                left: 2px;
                bottom: 2px;
                background-color: white;
                transition: .4s;
                border-radius: 50%;
            }

            .xhs-auto-reply-switch input:checked + .xhs-auto-reply-switch-slider {
                background-color: #FF2442;
            }

            .xhs-auto-reply-switch input:checked + .xhs-auto-reply-switch-slider:before {
                transform: translateX(20px);
            }

            /* 设置项样式 */
            .xhs-auto-reply-setting-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }

            .xhs-auto-reply-setting-label {
                font-size: 14px;
                color: #333;
            }

            /* 按钮样式 */
            .xhs-auto-reply-btn {
                display: inline-block;
                padding: 6px 12px;
                background-color: #FF2442;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                transition: background-color 0.3s;
                text-align: center;
                margin-right: 8px;
            }

            .xhs-auto-reply-btn:hover {
                background-color: #E60033;
            }

            .xhs-auto-reply-btn.secondary {
                background-color: #F0F0F0;
                color: #333;
            }

            .xhs-auto-reply-btn.secondary:hover {
                background-color: #E0E0E0;
            }

            /* 统计信息 */
            .xhs-auto-reply-stats {
                margin-top: 16px;
                padding-top: 16px;
                border-top: 1px solid #eee;
            }

            .xhs-auto-reply-stats-title {
                font-weight: bold;
                margin-bottom: 8px;
                font-size: 14px;
            }

            .xhs-auto-reply-stats-item {
                font-size: 12px;
                color: #666;
                margin-bottom: 4px;
            }

            /* 迷你图标样式 */
            .xhs-auto-reply-mini-icon {
                position: fixed;
                width: 40px;
                height: 40px;
                background-color: #FF2442;
                color: white;
                border-radius: 50%;
                display: flex;
                justify-content: center;
                align-items: center;
                cursor: pointer;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                z-index: 9999;
                font-size: 20px;
                transition: all 0.3s ease;
            }

            .xhs-auto-reply-mini-icon:hover {
                transform: scale(1.1);
            }

            /* 迷你图标位置 */
            .xhs-auto-reply-mini-icon.top-left {
                top: 20px;
                left: 20px;
            }

            .xhs-auto-reply-mini-icon.top-right {
                top: 20px;
                right: 20px;
            }

            .xhs-auto-reply-mini-icon.bottom-left {
                bottom: 20px;
                left: 20px;
            }

            .xhs-auto-reply-mini-icon.bottom-right {
                bottom: 20px;
                right: 20px;
            }

            /* 调试日志面板 */
            .xhs-auto-reply-debug-panel {
                max-height: 0;
                overflow: hidden;
                transition: max-height 0.3s ease;
                background-color: #f9f9f9;
                border-top: 1px solid #eee;
            }

            .xhs-auto-reply-debug-panel.active {
                max-height: 200px;
                overflow-y: auto;
            }

            .xhs-auto-reply-debug-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 16px;
                background-color: #f0f0f0;
                cursor: pointer;
            }

            .xhs-auto-reply-debug-panel-title {
                font-size: 12px;
                font-weight: bold;
                color: #333;
            }

            .xhs-auto-reply-debug-panel-toggle {
                font-size: 12px;
                color: #666;
            }

            .xhs-auto-reply-debug-log {
                padding: 8px 16px;
                font-size: 12px;
                font-family: monospace;
                overflow-y: auto;
                max-height: 160px;
            }

            .xhs-auto-reply-debug-log-item {
                margin-bottom: 4px;
                padding: 2px 0;
                border-bottom: 1px solid #eee;
            }

            .xhs-auto-reply-debug-log-item.error {
                color: #e74c3c;
            }

            .xhs-auto-reply-debug-log-item.warn {
                color: #f39c12;
            }

            .xhs-auto-reply-debug-log-item.info {
                color: #3498db;
            }

            .xhs-auto-reply-debug-log-item.debug {
                color: #7f8c8d;
            }

            .xhs-auto-reply-tabs {
                display: flex;
                border-bottom: 1px solid #eee;
            }

            .xhs-auto-reply-tab {
                padding: 8px 16px;
                font-size: 12px;
                cursor: pointer;
                border-bottom: 2px solid transparent;
            }

            .xhs-auto-reply-tab.active {
                border-bottom-color: #FF2442;
                font-weight: bold;
            }

            .xhs-auto-reply-tab-content {
                display: none;
                padding: 16px;
            }

            .xhs-auto-reply-tab-content.active {
                display: block;
            }
        `;

        GM_addStyle(styles);
        this.app.utils.logger.debug('添加控制面板样式');
    }

    /**
     * 创建面板DOM
     */
    async createPanel() {
        try {
            this.app.utils.logger.debug('正在创建控制面板DOM');

            const panel = document.createElement('div');
            panel.className = `xhs-auto-reply-panel ${this.position}`;
            panel.style.display = 'none';
            
            // 创建面板内容
            panel.innerHTML = `
                <div class="xhs-auto-reply-panel-header">
                    <div class="xhs-auto-reply-panel-title">小红书私信自动回复助手</div>
                    <div class="xhs-auto-reply-panel-close">×</div>
                </div>
                <div class="xhs-auto-reply-panel-content">
                    <div class="xhs-auto-reply-setting-item">
                        <span class="xhs-auto-reply-setting-label">自动回复</span>
                        <label class="xhs-auto-reply-switch">
                            <input type="checkbox" id="xhs-auto-reply-switch">
                            <span class="xhs-auto-reply-switch-slider"></span>
                        </label>
                    </div>
                    
                    <!-- 远程控制状态 -->
                    <div class="xhs-auto-reply-remote-control" style="margin-bottom: 12px; padding: 8px; border-radius: 4px; background-color: #f8f8f8; display: none;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 14px; color: #333;">远程控制状态</span>
                            <span class="xhs-auto-reply-remote-status" style="font-size: 12px; padding: 2px 6px; border-radius: 10px; background-color: #4CAF50; color: white;">已启用</span>
                        </div>
                        <div class="xhs-auto-reply-remote-message" style="font-size: 12px; color: #666; margin-top: 4px;"></div>
                        <div class="xhs-auto-reply-remote-updated" style="font-size: 11px; color: #999; margin-top: 2px;"></div>
                    </div>
                    
                    <div class="xhs-auto-reply-actions" style="margin-top: 16px;">
                        <button class="xhs-auto-reply-btn" id="xhs-auto-reply-settings-btn">设置</button>
                        <button class="xhs-auto-reply-btn secondary" id="xhs-auto-reply-stats-btn">统计</button>
                    </div>
                    
                    <div class="xhs-auto-reply-stats" id="xhs-auto-reply-stats" style="display: none;">
                        <h4 style="margin-bottom: 8px; font-size: 14px;">统计信息</h4>
                        <div class="xhs-auto-reply-stats-content">
                            <!-- 统计内容将动态插入 -->
                        </div>
                    </div>
                    
                    <div class="xhs-auto-reply-debug-log" style="margin-top: 16px; display: none;">
                        <h4 style="margin-bottom: 8px; font-size: 14px;">调试日志</h4>
                        <div class="xhs-auto-reply-log-content" style="max-height: 150px; overflow-y: auto; font-size: 12px; background-color: #f5f5f5; padding: 8px; border-radius: 4px; font-family: monospace;">
                            <!-- 日志内容将动态插入 -->
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(panel);
            this.panel = panel;
            
            // 创建迷你图标
            this.createMiniIcon();
            
            // 更新开关状态
            const switchElem = panel.querySelector('#xhs-auto-reply-switch');
            if (switchElem) {
                switchElem.checked = this.app.core.messageDetector.running;
            }
            
            // 设置面板可拖动
            this.makeDraggable(panel, panel.querySelector('.xhs-auto-reply-panel-header'));
            
            // 初始化远程控制状态显示
            this.updateRemoteControlStatus();
            
            this.app.utils.logger.debug('控制面板DOM创建完成');
            return true;
        } catch (error) {
            this.app.utils.logger.error('创建控制面板DOM失败', error);
            return false;
        }
    }

    /**
     * 创建设置项
     * @param {string} label 标签文本
     * @param {Element} control 控件元素
     * @returns {Element} 设置项元素
     */
    createSettingItem(label, control) {
        const item = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-setting-item'
        });

        const labelEl = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-setting-label'
        }, label);

        item.appendChild(labelEl);
        item.appendChild(control);

        return item;
    }

    /**
     * 创建开关
     * @param {string} id 开关ID
     * @param {boolean} checked 是否选中
     * @returns {Element} 开关元素
     */
    createSwitch(id, checked) {
        const label = this.app.utils.dom.createElement('label', {
            class: 'xhs-auto-reply-switch'
        });

        const input = this.app.utils.dom.createElement('input', {
            type: 'checkbox',
            id: `xhs-auto-reply-${id}`,
            checked: checked ? 'checked' : ''
        });

        const slider = this.app.utils.dom.createElement('span', {
            class: 'xhs-auto-reply-switch-slider'
        });

        label.appendChild(input);
        label.appendChild(slider);

        return label;
    }

    /**
     * 创建迷你图标
     */
    createMiniIcon() {
        const miniIcon = this.app.utils.dom.createElement('div', {
            class: `xhs-auto-reply-mini-icon ${this.position}`,
            id: 'xhs-auto-reply-mini-icon'
        }, '🤖');

        document.body.appendChild(miniIcon);
    }

    /**
     * 注册GM菜单项
     */
    registerMenus() {
        GM_registerMenuCommand('显示/隐藏控制面板', () => {
            this.togglePanel();
        });

        GM_registerMenuCommand('开始自动回复', () => {
            this.startAutoReply();
        });

        GM_registerMenuCommand('停止自动回复', () => {
            this.stopAutoReply();
        });
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        try {
            this.app.utils.logger.debug('正在绑定控制面板事件');
            
            if (!this.panel) {
                this.app.utils.logger.warn('面板未创建，无法绑定事件');
                return;
            }
            
            // 关闭按钮
            const closeBtn = this.panel.querySelector('.xhs-auto-reply-panel-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    this.hidePanel();
                });
            }
            
            // 绑定迷你图标点击事件
            const miniIcon = document.getElementById('xhs-auto-reply-mini-icon');
            if (miniIcon) {
                this.app.utils.logger.debug('绑定迷你图标点击事件');
                miniIcon.addEventListener('click', () => {
                    this.togglePanel();
                });
            } else {
                this.app.utils.logger.warn('未找到迷你图标，无法绑定点击事件');
            }
            
            // 自动回复开关
            const switchElem = this.panel.querySelector('#xhs-auto-reply-switch');
            if (switchElem) {
                switchElem.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        this.startAutoReply();
                    } else {
                        this.stopAutoReply();
                    }
                });
            }
            
            // 设置按钮
            const settingsBtn = this.panel.querySelector('#xhs-auto-reply-settings-btn');
            if (settingsBtn) {
                settingsBtn.addEventListener('click', () => {
                    // 在点击时检查设置面板是否存在
                    if (this.app.ui && this.app.ui.settings) {
                        this.app.utils.logger.debug('打开设置面板');
                        this.app.ui.settings.togglePanel();
                    } else {
                        this.app.utils.logger.error('设置面板未初始化，无法打开');
                        // 显示错误通知给用户
                        this.app.utils.dom.showNotification('无法打开设置', '设置面板未正确初始化，请刷新页面重试', 'error');
                    }
                });
            }
            
            // 统计按钮
            const statsBtn = this.panel.querySelector('#xhs-auto-reply-stats-btn');
            if (statsBtn) {
                statsBtn.addEventListener('click', () => {
                    const statsElem = this.panel.querySelector('.xhs-auto-reply-stats');
                    if (statsElem) {
                        const isHidden = statsElem.style.display === 'none';
                        statsElem.style.display = isHidden ? 'block' : 'none';
                        if (isHidden) {
                            this.updateStatistics();
                        }
                    }
                });
            }
            
            // 设置日志监听器
            this.setupLogListener();
            
            // 监听配置变化，用于更新远程控制状态
            // 通过定期检查实现
            setInterval(() => {
                this.updateRemoteControlStatus();
            }, 10000); // 每10秒检查一次
            
            this.app.utils.logger.debug('控制面板事件绑定完成');
        } catch (error) {
            this.app.utils.logger.error('绑定控制面板事件失败', error);
        }
    }

    /**
     * 设置日志监听
     */
    setupLogListener() {
        // 重写原始logger方法，在调用时也更新UI
        const originalLogMethods = {
            debug: this.app.utils.logger.debug,
            info: this.app.utils.logger.info,
            warn: this.app.utils.logger.warn,
            error: this.app.utils.logger.error
        };

        // 最近的日志记录
        this.recentLogs = [];
        const maxLogItems = 100;

        // 重写日志方法
        const self = this;

        ['debug', 'info', 'warn', 'error'].forEach(level => {
            this.app.utils.logger[level] = function() {
                // 调用原始方法
                originalLogMethods[level].apply(this, arguments);

                // 格式化日志消息
                const message = Array.from(arguments).join(' ');
                const timestamp = new Date().toLocaleTimeString();
                const logItem = {
                    level,
                    message,
                    timestamp
                };

                // 添加到最近日志
                self.recentLogs.unshift(logItem);

                // 限制日志数量
                if (self.recentLogs.length > maxLogItems) {
                    self.recentLogs.pop();
                }

                // 更新UI
                self.updateDebugLog();
            };
        });
    }

    /**
     * 更新调试日志面板
     */
    updateDebugLog() {
        try {
            const debugLog = this.panel.querySelector('.xhs-auto-reply-debug-log');
            if (!debugLog) return;

            // 清空当前日志
            debugLog.innerHTML = '';

            // 添加最近的日志
            for (const log of this.recentLogs) {
                const logItem = this.app.utils.dom.createElement('div', {
                    class: `xhs-auto-reply-debug-log-item ${log.level}`
                }, `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`);

                debugLog.appendChild(logItem);
            }
        } catch (error) {
            console.error('更新调试日志面板失败', error);
        }
    }

    /**
     * 显示面板
     */
    showPanel() {
        if (!this.panel) return;

        this.panel.style.display = 'block';
        this.visible = true;

        // 隐藏迷你图标
        const miniIcon = document.getElementById('xhs-auto-reply-mini-icon');
        if (miniIcon) {
            miniIcon.style.display = 'none';
        }

        // 更新统计信息
        this.updateStatistics();
    }

    /**
     * 隐藏面板
     */
    hidePanel() {
        if (!this.panel) return;

        this.panel.style.display = 'none';
        this.visible = false;

        // 显示迷你图标
        const miniIcon = document.getElementById('xhs-auto-reply-mini-icon');
        if (miniIcon) {
            miniIcon.style.display = 'flex';
        }
    }

    /**
     * 切换面板显示/隐藏
     */
    togglePanel() {
        if (this.visible) {
            this.hidePanel();
        } else {
            this.showPanel();
        }
    }

    /**
     * 启动自动回复
     */
    startAutoReply() {
        try {
            // 首先检查核心模块是否已正确初始化
            if (!this.app.core) {
                this.app.utils.logger.error('自动回复失败：核心模块未初始化');
                this.app.utils.dom.showNotification('无法启动', '核心模块未正确初始化，请刷新页面重试', 'error');
                
                // 还原开关状态
                const switchElem = this.panel.querySelector('#xhs-auto-reply-switch');
                if (switchElem) {
                    switchElem.checked = false;
                }
                return;
            }
            
            if (!this.app.core.messageDetector) {
                this.app.utils.logger.error('自动回复失败：消息检测器未初始化');
                this.app.utils.dom.showNotification('无法启动', '消息检测器未正确初始化，请刷新页面重试', 'error');
                
                // 还原开关状态
                const switchElem = this.panel.querySelector('#xhs-auto-reply-switch');
                if (switchElem) {
                    switchElem.checked = false;
                }
                return;
            }
            
            // 检查远程控制状态
            const remoteControlEnabled = this.app.config.getSetting('remoteControl.enabled', false);
            if (remoteControlEnabled) {
                const remoteStatus = this.app.config.getSetting('remoteControl.status.enabled', true);
                if (!remoteStatus) {
                    // 如果远程控制禁用了脚本，则显示提示并返回
                    const message = this.app.config.getSetting('remoteControl.status.message', '脚本已被远程禁用');
                    this.app.utils.dom.showNotification('无法启动', `远程控制已禁用脚本: ${message}`, 'error');
                    
                    // 还原开关状态
                    const switchElem = this.panel.querySelector('#xhs-auto-reply-switch');
                    if (switchElem) {
                        switchElem.checked = false;
                    }
                    
                    return;
                }
            }
            
            // 继续原有的启动逻辑
            this.app.utils.logger.info('用户通过控制面板启动自动回复');
            
            try {
                // 尝试启动消息检测
                const started = this.app.core.messageDetector.start();
                
                // 检查启动状态
                if (started) {
                    this.app.utils.logger.info('自动回复功能启动成功');
                    this.app.utils.dom.showNotification('小红书助手已启动', '自动回复功能已开启');
                } else {
                    // 即使start()返回false，也检查running状态来确认实际运行情况
                    // 这是因为有时start()可能返回false但功能仍在工作
                    this.app.utils.logger.warn('自动回复启动返回失败状态，但将继续检查实际运行状态');
                    
                    // 延迟检查running状态，给初始化过程一些时间
                    setTimeout(() => {
                        // 通过检查running状态来确认是否真正启动
                        if (this.app.core.messageDetector.running) {
                            this.app.utils.logger.info('检测到自动回复功能实际已启动，忽略之前的失败状态');
                            this.app.utils.dom.showNotification('小红书助手已启动', '自动回复功能已开启');
                        } else {
                            // 仅当确认功能真的未运行时才显示错误
                            this.app.utils.logger.error('自动回复功能确认未能启动');
                            this.app.utils.dom.showNotification('启动失败', '请查看日志了解详情', 'error');
                            
                            // 还原开关状态
                            const switchElem = this.panel.querySelector('#xhs-auto-reply-switch');
                            if (switchElem) {
                                switchElem.checked = false;
                            }
                        }
                    }, 1000); // 延迟1秒检查，给初始化过程时间
                }
            } catch (innerError) {
                this.app.utils.logger.error('调用消息检测器start方法时发生错误', innerError);
                this.app.utils.dom.showNotification('启动失败', `消息检测器启动错误: ${innerError.message}`, 'error');
                
                // 还原开关状态
                const switchElem = this.panel.querySelector('#xhs-auto-reply-switch');
                if (switchElem) {
                    switchElem.checked = false;
                }
            }
        } catch (error) {
            this.app.utils.logger.error('启动自动回复失败', error);
            this.app.utils.dom.showNotification('启动失败', error.message, 'error');
            
            // 还原开关状态
            const switchElem = this.panel.querySelector('#xhs-auto-reply-switch');
            if (switchElem) {
                switchElem.checked = false;
            }
        }
    }

    /**
     * 停止自动回复
     */
    stopAutoReply() {
        try {
            this.app.utils.logger.info('用户通过控制面板停止自动回复');
            
            // 检查核心模块是否已正确初始化
            if (!this.app.core) {
                this.app.utils.logger.error('停止自动回复失败：核心模块未初始化');
                this.app.utils.dom.showNotification('无法停止', '核心模块未正确初始化', 'error');
                return;
            }
            
            if (!this.app.core.messageDetector) {
                this.app.utils.logger.error('停止自动回复失败：消息检测器未初始化');
                this.app.utils.dom.showNotification('无法停止', '消息检测器未正确初始化', 'error');
                return;
            }
            
            // 尝试停止消息检测
            try {
                const success = this.app.core.messageDetector.stop();

                if (success) {
                    this.app.utils.logger.info('已成功停止自动回复');
                    this.app.utils.dom.showNotification('小红书助手已停止', '自动回复功能已关闭');

                    // 清空回复队列
                    if (this.app.core.autoReply) {
                        try {
                            this.app.core.autoReply.clearReplyQueue();
                            this.app.utils.logger.debug('已清空回复队列');
                        } catch (queueError) {
                            this.app.utils.logger.warn('清空回复队列失败', queueError);
                        }
                    }

                    // 更新UI状态
                    const startBtn = document.getElementById('xhs-auto-reply-start-btn');
                    const stopBtn = document.getElementById('xhs-auto-reply-stop-btn');

                    if (startBtn) startBtn.style.display = 'inline-block';
                    if (stopBtn) stopBtn.style.display = 'none';
                } else {
                    this.app.utils.logger.error('停止自动回复返回失败状态');
                    this.app.utils.dom.showNotification('停止失败', '请查看日志了解详情', 'error');
                }
            } catch (innerError) {
                this.app.utils.logger.error('调用消息检测器stop方法时发生错误', innerError);
                this.app.utils.dom.showNotification('停止失败', `消息检测器停止错误: ${innerError.message}`, 'error');
            }
        } catch (error) {
            this.app.utils.logger.error('停止自动回复失败', error);
            this.app.utils.dom.showNotification('停止失败', error.message, 'error');
        }
    }

    /**
     * 更新统计信息
     */
    updateStatistics() {
        const statsContainer = document.getElementById('xhs-auto-reply-stats');
        if (!statsContainer) return;

        // 找到统计内容容器
        const statsContentContainer = statsContainer.querySelector('.xhs-auto-reply-stats-content');
        if (!statsContentContainer) return;

        // 清空内容容器
        statsContentContainer.innerHTML = '';

        // 获取统计摘要
        const stats = this.app.utils.storage.getStatisticsSummary();

        // 创建统计项
        const createStatsItem = (label, value) => {
            const item = this.app.utils.dom.createElement('div', {
                class: 'xhs-auto-reply-stats-item'
            });

            this.app.utils.dom.setHtml(item, `${label}: <b>${value}</b>`);

            return item;
        };

        // 添加统计项到内容容器
        statsContentContainer.appendChild(createStatsItem('今日回复', stats.todayReplies));
        statsContentContainer.appendChild(createStatsItem('总消息数', stats.totalMessages));
        statsContentContainer.appendChild(createStatsItem('总回复数', stats.totalReplies));
        statsContentContainer.appendChild(createStatsItem('AI回复数', stats.aiReplies));
        statsContentContainer.appendChild(createStatsItem('模板回复数', stats.templateReplies));
        statsContentContainer.appendChild(createStatsItem('成功率', `${stats.successRate}%`));
        statsContentContainer.appendChild(createStatsItem('平均响应时间', `${stats.averageResponseTime}ms`));

        // 最后更新时间
        const lastUpdate = new Date(stats.lastUpdate).toLocaleString();
        statsContentContainer.appendChild(createStatsItem('最后更新', lastUpdate));

        // 当前状态
        const running = this.app.core.messageDetector?.running || false;
        const statusValue = running ? '<span style="color:#4CAF50">运行中</span>' : '<span style="color:#F44336">已停止</span>';
        statsContentContainer.appendChild(createStatsItem('当前状态', statusValue));
    }

    /**
     * 更新远程控制状态显示
     */
    updateRemoteControlStatus() {
        try {
            // 获取远程控制相关元素
            const remoteControlElem = this.panel.querySelector('.xhs-auto-reply-remote-control');
            const remoteStatusElem = this.panel.querySelector('.xhs-auto-reply-remote-status');
            const remoteMessageElem = this.panel.querySelector('.xhs-auto-reply-remote-message');
            const remoteUpdatedElem = this.panel.querySelector('.xhs-auto-reply-remote-updated');
            
            // 检查远程控制是否启用
            const remoteControlEnabled = this.app.config.getSetting('remoteControl.enabled', false);
            if (!remoteControlEnabled) {
                // 如果远程控制未启用，隐藏整个区域
                remoteControlElem.style.display = 'none';
                return;
            }
            
            // 显示远程控制区域
            remoteControlElem.style.display = 'block';
            
            // 获取远程控制状态
            const remoteStatus = this.app.config.getSetting('remoteControl.status', {
                enabled: true,
                message: '',
                lastUpdated: null
            });
            
            // 更新状态显示
            if (remoteStatus.enabled) {
                remoteStatusElem.textContent = '已启用';
                remoteStatusElem.style.backgroundColor = '#4CAF50'; // 绿色
            } else {
                remoteStatusElem.textContent = '已禁用';
                remoteStatusElem.style.backgroundColor = '#F44336'; // 红色
            }
            
            // 更新消息显示
            if (remoteStatus.message) {
                remoteMessageElem.textContent = remoteStatus.message;
                remoteMessageElem.style.display = 'block';
            } else {
                remoteMessageElem.style.display = 'none';
            }
            
            // 更新最后更新时间
            if (remoteStatus.lastUpdated) {
                const date = new Date(remoteStatus.lastUpdated);
                remoteUpdatedElem.textContent = `最后更新: ${date.toLocaleString()}`;
                remoteUpdatedElem.style.display = 'block';
            } else {
                remoteUpdatedElem.style.display = 'none';
            }
        } catch (error) {
            this.app.utils.logger.error('更新远程控制状态显示失败', error);
        }
    }

    /**
     * 使元素可拖拽
     * @param {Element} element 要拖拽的元素
     * @param {Element} handle 拖拽的把手元素
     */
    makeDraggable(element, handle) {
        if (!element || !handle) return;
        
        this.app.utils.logger.debug('设置元素可拖拽');
        
        let posX = 0, posY = 0, originX = 0, originY = 0;
        
        const mouseDownHandler = (e) => {
            e.preventDefault();
            
            // 获取鼠标当前位置
            originX = e.clientX;
            originY = e.clientY;
            
            // 获取元素当前位置
            const rect = element.getBoundingClientRect();
            posX = rect.left;
            posY = rect.top;
            
            // 添加鼠标移动和释放事件
            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
        };
        
        const mouseMoveHandler = (e) => {
            // 计算鼠标位移
            const deltaX = e.clientX - originX;
            const deltaY = e.clientY - originY;
            
            // 计算新位置
            let newX = posX + deltaX;
            let newY = posY + deltaY;
            
            // 边界检查
            const rect = element.getBoundingClientRect();
            const maxX = window.innerWidth - rect.width;
            const maxY = window.innerHeight - rect.height;
            
            newX = Math.max(0, Math.min(newX, maxX));
            newY = Math.max(0, Math.min(newY, maxY));
            
            // 更新元素位置
            element.style.left = `${newX}px`;
            element.style.top = `${newY}px`;
            
            // 重置position类
            element.className = element.className.replace(/\btop-left\b|\btop-right\b|\bbottom-left\b|\bbottom-right\b/g, '');
            
            // 元素变为自由定位
            element.style.position = 'fixed';
        };
        
        const mouseUpHandler = () => {
            // 移除鼠标事件
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);
            
            // 保存位置到配置
            if (this.app.config) {
                const rect = element.getBoundingClientRect();
                this.app.config.setSetting('ui.floatingPanelCustomPosition', {
                    left: rect.left,
                    top: rect.top
                });
                this.app.utils.logger.debug('保存面板位置', rect.left, rect.top);
            }
        };
        
        // 绑定鼠标按下事件
        handle.addEventListener('mousedown', mouseDownHandler);
        
        // 尝试恢复保存的位置
        if (this.app.config) {
            const savedPosition = this.app.config.getSetting('ui.floatingPanelCustomPosition', null);
            if (savedPosition) {
                element.style.position = 'fixed';
                element.style.left = `${savedPosition.left}px`;
                element.style.top = `${savedPosition.top}px`;
                
                // 重置position类
                element.className = element.className.replace(/\btop-left\b|\btop-right\b|\bbottom-left\b|\bbottom-right\b/g, '');
                
                this.app.utils.logger.debug('恢复面板位置', savedPosition.left, savedPosition.top);
            }
        }
    }
}

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

/**
 * 小红书私信自动回复助手 - 关键词规则管理模块
 */

class KeywordRuleManager {
    constructor(app) {
        this.app = app;
        this.rules = [];
        this.ruleContainer = null;
        this.initialized = false;
    }

    /**
     * 初始化关键词规则管理器
     */
    async initialize() {
        try {
            this.app.utils.logger.info('初始化关键词规则管理器');
            this.loadRules();
            this.initialized = true;
            return true;
        } catch (error) {
            this.app.utils.logger.error('初始化关键词规则管理器失败', error);
            return false;
        }
    }

    /**
     * 为设置面板创建关键词规则部分
     * @param {Element} form 表单容器
     * @returns {Element} 关键词规则部分元素
     */
    createRuleSection(form) {
        const section = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-section',
            id: 'xhs-auto-reply-settings-section-keyword'
        });

        const title = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-section-title'
        }, '关键词规则');

        section.appendChild(title);
        
        // 添加使用说明
        const helpTips = this.app.utils.dom.createElement('div', {
            style: 'background-color: #f9f9f9; border-left: 4px solid #FF2442; padding: 12px; margin-bottom: 20px; border-radius: 4px;'
        });
        
        const helpTitle = this.app.utils.dom.createElement('div', {
            style: 'font-weight: bold; margin-bottom: 8px; color: #333;'
        }, '📌 使用说明');
        
        const helpText = this.app.utils.dom.createElement('div', {
            style: 'font-size: 13px; color: #666; line-height: 1.5;'
        });
        
        helpText.innerHTML = `
            <ul style="margin: 0; padding-left: 20px;">
                <li><b>编辑规则全部内容</b>：点击规则卡片或卡片右侧的 📝 按钮可展开/折叠完整编辑界面</li>
                <li><b>修改规则名称</b>：点击带下划线的规则名称文本</li>
                <li><b>启用/禁用规则</b>：使用规则右侧的开关</li>
                <li><b>编辑关键词</b>：在展开的规则中，前往"关键词管理"区域</li>
                <li><b>调整优先级和匹配设置</b>：在展开的规则中修改相应字段</li>
                <li><b>删除规则</b>：点击规则右侧的 🗑️ 按钮</li>
            </ul>
        `;
        
        helpTips.appendChild(helpTitle);
        helpTips.appendChild(helpText);
        section.appendChild(helpTips);

        // 添加规则列表容器
        this.ruleContainer = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-keyword-rules-container'
        });

        // 添加关键词规则样式
        this.addRuleStyles();

        // 渲染规则列表
        this.renderRules();

        section.appendChild(this.ruleContainer);

        // 添加新规则按钮
        const addButton = this.app.utils.dom.createElement('button', {
            class: 'xhs-auto-reply-settings-btn primary',
            id: 'xhs-auto-reply-add-rule'
        }, '添加新规则');

        this.app.utils.dom.addEvent(addButton, 'click', () => {
            this.addRule();
        });

        const buttonContainer = this.app.utils.dom.createElement('div', {
            style: 'margin-top: 16px;'
        });

        buttonContainer.appendChild(addButton);
        section.appendChild(buttonContainer);

        form.appendChild(section);

        return section;
    }

    /**
     * 添加关键词规则样式
     */
    addRuleStyles() {
        const style = `
        .xhs-auto-reply-keyword-rule {
            margin-bottom: 24px;
            border: 1px solid #e8e8e8;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            background-color: #fff;
        }

        .xhs-auto-reply-keyword-rule-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background-color: #f9f9f9;
            border-bottom: 1px solid #e8e8e8;
            cursor: pointer;
        }

        .xhs-auto-reply-keyword-rule-header:hover {
            background-color: #f0f0f0;
        }

        .xhs-auto-reply-keyword-rule-title {
            font-weight: bold;
            font-size: 15px;
            color: #333;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .xhs-auto-reply-keyword-rule-actions {
            display: flex;
            gap: 12px;
            align-items: center;
        }

        .xhs-auto-reply-keyword-rule-action {
            cursor: pointer;
            background: none;
            border: none;
            font-size: 14px;
            color: #666;
            padding: 4px;
            border-radius: 4px;
            transition: all 0.2s;
        }

        .xhs-auto-reply-keyword-rule-action:hover {
            color: #ff2442;
            background-color: rgba(255, 36, 66, 0.05);
        }

        .xhs-auto-reply-keyword-rule-content {
            padding: 16px;
            transition: all 0.3s ease;
        }

        /* 添加更确定的样式以确保内容区域可以正确显示 */
        .xhs-auto-reply-keyword-rule-content[style*="display: block"] {
            display: block !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            visibility: visible !important;
            opacity: 1 !important;
        }

        /* 优化卡片组样式 */
        .xhs-auto-reply-card-group {
            background-color: #fff;
            border-radius: 6px;
            border: 1px solid #eee;
            margin-bottom: 16px;
            overflow: hidden;
            box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        }

        .xhs-auto-reply-card-header {
            padding: 12px 16px;
            background-color: #f5f5f5;
            font-weight: bold;
            color: #333;
            font-size: 14px;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .xhs-auto-reply-card-header:hover {
            background-color: #f0f0f0;
        }

        .xhs-auto-reply-card-header-icon {
            font-size: 12px;
            cursor: pointer;
            color: #ff2442;
            padding: 4px 8px;
            border-radius: 4px;
            background-color: rgba(255, 36, 66, 0.05);
            transition: all 0.2s;
        }

        .xhs-auto-reply-card-header-icon:hover {
            background-color: rgba(255, 36, 66, 0.1);
        }

        .xhs-auto-reply-card-body {
            padding: 16px;
            border-bottom: 1px solid #eee;
        }

        /* 优化可折叠区域 */
        .xhs-auto-reply-collapsible {
            max-height: 2000px;
            overflow: hidden;
            transition: max-height 0.3s ease-out;
        }

        .xhs-auto-reply-collapsed {
            max-height: 0 !important;
            padding-top: 0 !important;
            padding-bottom: 0 !important;
            border-bottom: none !important;
        }

        /* 新增：提示标签 */
        .xhs-auto-reply-collapse-hint {
            font-size: 12px;
            color: #888;
            margin-left: 8px;
        }

        /* 新增：关键词规则标题区增强 */
        .xhs-auto-reply-keyword-rule-header::after {
            content: "点击此处展开/折叠规则详情";
            font-size: 12px;
            color: #999;
            margin-left: 8px;
            opacity: 0;
            transition: opacity 0.2s;
        }

        .xhs-auto-reply-keyword-rule-header:hover::after {
            opacity: 1;
        }

        /* 新增：表单布局样式 */
        .xhs-auto-reply-form-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
        }

        .xhs-auto-reply-form-full {
            grid-column: 1 / -1;
        }

        /* 优化关键词部分 */
        .xhs-auto-reply-keyword-rule-keywords {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 8px;
            margin-bottom: 12px;
            min-height: 36px;
            padding: 8px;
            border: 1px dashed #ddd;
            border-radius: 4px;
            background-color: #fcfcfc;
        }

        .xhs-auto-reply-keyword-tag {
            display: inline-flex;
            align-items: center;
            background-color: #f0f0f0;
            padding: 5px 10px;
            border-radius: 16px;
            font-size: 13px;
            color: #333;
            border: 1px solid #e0e0e0;
            transition: all 0.2s;
            cursor: pointer;
        }

        .xhs-auto-reply-keyword-tag:hover {
            background-color: #e6e6e6;
        }

        .xhs-auto-reply-keyword-tag-remove {
            margin-left: 6px;
            cursor: pointer;
            color: #999;
            font-size: 15px;
            width: 18px;
            height: 18px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
        }

        .xhs-auto-reply-keyword-tag-remove:hover {
            color: #ff2442;
            background-color: rgba(255, 36, 66, 0.1);
        }
        
        .xhs-auto-reply-keyword-tag-edit {
            margin-left: 6px;
            cursor: pointer;
            color: #0088ff;
            font-size: 14px;
            width: 20px;
            height: 20px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background-color: rgba(0, 136, 255, 0.1);
            transition: all 0.2s;
        }

        .xhs-auto-reply-keyword-tag-edit:hover {
            color: #ffffff;
            background-color: #0088ff;
        }

        .xhs-auto-reply-keyword-add {
            display: flex;
            border: 1px solid #ddd;
            border-radius: 4px;
            overflow: hidden;
        }
        
        .xhs-auto-reply-keyword-add-input {
            flex: 1;
            padding: 8px 12px;
            border: none;
            outline: none;
        }
        
        .xhs-auto-reply-keyword-add-btn {
            padding: 8px 16px;
            background-color: #FF2442;
            color: white;
            border: none;
            cursor: pointer;
        }
        
        .xhs-auto-reply-keyword-add-btn:hover {
            background-color: #E60033;
        }
        
        /* 优化响应textarea */
        .xhs-auto-reply-response-textarea {
            width: 100%;
            min-height: 120px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            resize: vertical;
            font-family: inherit;
            font-size: 14px;
            line-height: 1.5;
            transition: all 0.2s;
        }

        .xhs-auto-reply-response-textarea:focus {
            border-color: #ff2442;
            box-shadow: 0 0 0 2px rgba(255, 36, 66, 0.1);
            outline: none;
        }
        `;

        // 添加样式到页面
        this.app.utils.dom.addStyle(style);
    }

    /**
     * 加载规则
     */
    loadRules() {
        // 从根级别设置中获取 keywordRules，而不是从 leadGeneration 中获取
        this.rules = this.app.config.getSetting('keywordRules', []);
        
        this.app.utils.logger.debug('加载自动回复关键词规则', this.rules);
    }

    /**
     * 渲染规则列表
     */
    renderRules() {
        if (!this.ruleContainer) return;

        // 清空容器
        this.ruleContainer.innerHTML = '';

        // 如果没有规则，显示提示
        if (this.rules.length === 0) {
            const emptyMessage = this.app.utils.dom.createElement('div', {
                style: 'text-align: center; color: #666; padding: 20px;'
            }, '暂无关键词规则，点击下方按钮添加新规则');

            this.ruleContainer.appendChild(emptyMessage);
            return;
        }

        // 渲染每个规则
        this.rules.forEach((rule, index) => {
            const ruleElement = this.createRuleElement(rule, index);
            this.ruleContainer.appendChild(ruleElement);
        });
    }

    /**
     * 创建规则元素
     * @param {object} rule 规则对象
     * @param {number} index 规则索引
     * @returns {Element} 规则元素
     */
    createRuleElement(rule, index) {
        const ruleElement = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-keyword-rule',
            'data-index': index,
            'data-id': rule.id
        });

        // 创建规则头部
        const ruleHeader = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-keyword-rule-header'
        });

        // 规则标题
        const ruleTitle = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-keyword-rule-title'
        });

        // 添加规则名称
        const ruleName = this.app.utils.dom.createElement('span', {
            style: 'cursor: pointer; text-decoration: underline dotted; padding: 2px;',
            title: '点击编辑规则名称'
        }, `${rule.name}`);
        
        // 添加规则名称点击编辑功能
        this.app.utils.dom.addEvent(ruleName, 'click', (e) => {
            e.stopPropagation(); // 阻止事件冒泡，防止触发折叠
            this.editRuleName(index);
        });
        
        ruleTitle.appendChild(ruleName);

        // 添加优先级标签
        const priorityBadge = this.app.utils.dom.createElement('span', {
            class: 'xhs-auto-reply-priority-badge'
        }, `优先级: ${rule.priority}`);
        ruleTitle.appendChild(priorityBadge);

        // 规则操作按钮
        const ruleActions = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-keyword-rule-actions'
        });

        // 启用/禁用开关
        const enabledLabel = this.app.utils.dom.createElement('label', {
            class: 'xhs-auto-reply-switch-small',
            title: rule.enabled ? '已启用' : '已禁用'
        });

        const enabledInput = this.app.utils.dom.createElement('input', {
            type: 'checkbox',
            checked: rule.enabled
        });

        const enabledSlider = this.app.utils.dom.createElement('span', {
            class: 'xhs-auto-reply-slider round'
        });

        enabledLabel.appendChild(enabledInput);
        enabledLabel.appendChild(enabledSlider);

        this.app.utils.dom.addEvent(enabledInput, 'change', (e) => {
            e.stopPropagation(); // 阻止事件冒泡，防止触发折叠
            this.toggleRuleEnabled(index, enabledInput.checked);
        });

        // 删除按钮
        const deleteButton = this.app.utils.dom.createElement('button', {
            class: 'xhs-auto-reply-keyword-rule-action',
            title: '删除规则'
        }, '🗑️');

        this.app.utils.dom.addEvent(deleteButton, 'click', (e) => {
            e.stopPropagation(); // 阻止事件冒泡，防止触发折叠
            if (confirm(`确定要删除规则"${rule.name}"吗？`)) {
                this.deleteRule(index);
            }
        });

        // 添加编辑按钮
        const editButton = this.app.utils.dom.createElement('button', {
            class: 'xhs-auto-reply-keyword-rule-action',
            title: '展开/折叠规则详细内容'
        }, '📝');

        // 创建规则内容区域，默认隐藏
        const ruleContent = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-keyword-rule-content',
            style: 'display: none;' // 默认隐藏，等待点击展开
        });

        // 修复编辑按钮点击事件，确保正确切换内容区域的可见性
        this.app.utils.dom.addEvent(editButton, 'click', (e) => {
            e.stopPropagation(); // 阻止事件冒泡
            
            // 切换内容区域的可见性
            const isVisible = ruleContent.style.display === 'block';
            ruleContent.style.display = isVisible ? 'none' : 'block';
            
            // 更新按钮文字
            editButton.textContent = isVisible ? '📖' : '📝';
            editButton.title = isVisible ? '展开规则详细内容' : '折叠规则详细内容';
            
            // 滚动到规则可见处
            if (!isVisible) {
                ruleElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            
            // 调试输出
            console.log(`规则[${rule.name}] 的详细内容已${isVisible ? '隐藏' : '显示'}`);
        });

        ruleActions.appendChild(enabledLabel);
        ruleActions.appendChild(editButton);
        ruleActions.appendChild(deleteButton);

        ruleHeader.appendChild(ruleTitle);
        ruleHeader.appendChild(ruleActions);
        ruleElement.appendChild(ruleHeader);
        
        // 先添加内容区域到规则元素，然后再添加点击事件
        ruleElement.appendChild(ruleContent);

        // 修复规则头部点击事件，确保正确切换内容区域的可见性
        this.app.utils.dom.addEvent(ruleHeader, 'click', (e) => {
            // 不要让事件冒泡到其他元素
            e.stopPropagation();
            
            // 切换内容区域的可见性
            const isVisible = ruleContent.style.display === 'block';
            ruleContent.style.display = isVisible ? 'none' : 'block';
            
            // 更新编辑按钮文字
            editButton.textContent = isVisible ? '📖' : '📝';
            editButton.title = isVisible ? '展开规则详细内容' : '折叠规则详细内容';
            
            // 滚动到规则可见处
            if (!isVisible) {
                ruleElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            
            // 调试输出
            console.log(`通过点击标题，规则[${rule.name}] 的详细内容已${isVisible ? '隐藏' : '显示'}`);
        });

        // ======== 1. 基本信息卡片 ========
        const basicInfoCard = this.createCardGroup('基本信息', ruleContent);
        const basicInfoBody = basicInfoCard.querySelector('.xhs-auto-reply-card-body');
        const basicInfoGrid = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-form-grid'
        });

        // 名称
        const nameInput = this.createInputItem(
            'name',
            '规则名称',
            rule.name,
            '为这条规则起个名称',
            (value) => this.updateRuleProperty(index, 'name', value)
        );

        // 优先级
        const priorityInput = this.createInputItem(
            'priority',
            '优先级',
            rule.priority,
            '数字越大优先级越高',
            (value) => this.updateRuleProperty(index, 'priority', parseInt(value)),
            'number'
        );

        basicInfoGrid.appendChild(nameInput);
        basicInfoGrid.appendChild(priorityInput);
        basicInfoBody.appendChild(basicInfoGrid);

        // ======== 2. 匹配设置卡片 ========
        const matchSettingsCard = this.createCardGroup('匹配设置', ruleContent);
        const matchSettingsBody = matchSettingsCard.querySelector('.xhs-auto-reply-card-body');
        const matchSettingsGrid = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-form-grid'
        });

        // 设置默认的matchType（如果是旧数据）
        if (!rule.matchType && rule.isRegex) {
            rule.matchType = 'regex';
        } else if (!rule.matchType) {
            rule.matchType = 'contains';
        }

        // 匹配类型下拉选择器
        const matchTypeContainer = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-input-item'
        });

        const matchTypeLabel = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-input-label'
        }, '匹配类型');

        const matchTypeDescription = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-input-description'
        }, '选择如何匹配关键词');

        const matchTypeSelect = this.app.utils.dom.createElement('select', {
            class: 'xhs-auto-reply-settings-select',
            style: 'width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;'
        });

        const matchTypeOptions = [
            { value: 'contains', label: '包含匹配 (消息包含指定文本)' },
            { value: 'exact', label: '精确匹配 (消息与关键词完全相同)' },
            { value: 'startsWith', label: '前缀匹配 (消息以关键词开头)' },
            { value: 'endsWith', label: '后缀匹配 (消息以关键词结尾)' },
            { value: 'regex', label: '正则表达式 (使用正则表达式匹配)' }
        ];

        matchTypeOptions.forEach(option => {
            const optionElement = this.app.utils.dom.createElement('option', {
                value: option.value,
                selected: rule.matchType === option.value
            }, option.label);
            matchTypeSelect.appendChild(optionElement);
        });

        this.app.utils.dom.addEvent(matchTypeSelect, 'change', () => {
            const newMatchType = matchTypeSelect.value;
            this.updateRuleProperty(index, 'matchType', newMatchType);
            
            // 同步更新 isRegex 属性以保持向后兼容
            if (newMatchType === 'regex') {
                this.updateRuleProperty(index, 'isRegex', true);
            } else if (rule.isRegex) {
                this.updateRuleProperty(index, 'isRegex', false);
            }
        });

        matchTypeContainer.appendChild(matchTypeLabel);
        matchTypeContainer.appendChild(matchTypeDescription);
        matchTypeContainer.appendChild(matchTypeSelect);

        // 关键词匹配逻辑选择器
        const matchLogicContainer = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-input-item'
        });

        const matchLogicLabel = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-input-label'
        }, '关键词匹配逻辑');

        const matchLogicDescription = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-input-description'
        }, '多个关键词之间的关系');

        const matchLogicSelect = this.app.utils.dom.createElement('select', {
            class: 'xhs-auto-reply-settings-select',
            style: 'width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;'
        });

        // 设置默认的matchLogic（如果是旧数据）
        if (!rule.matchLogic) {
            rule.matchLogic = 'OR';
        }

        const matchLogicOptions = [
            { value: 'OR', label: '匹配任一关键词 (OR 逻辑)' },
            { value: 'AND', label: '匹配所有关键词 (AND 逻辑)' }
        ];

        matchLogicOptions.forEach(option => {
            const optionElement = this.app.utils.dom.createElement('option', {
                value: option.value,
                selected: rule.matchLogic === option.value
            }, option.label);
            matchLogicSelect.appendChild(optionElement);
        });

        this.app.utils.dom.addEvent(matchLogicSelect, 'change', () => {
            this.updateRuleProperty(index, 'matchLogic', matchLogicSelect.value);
        });

        matchLogicContainer.appendChild(matchLogicLabel);
        matchLogicContainer.appendChild(matchLogicDescription);
        matchLogicContainer.appendChild(matchLogicSelect);

        matchSettingsGrid.appendChild(matchTypeContainer);
        matchSettingsGrid.appendChild(matchLogicContainer);

        // 消息类型选择
        const messageTypesContainer = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-input-item xhs-auto-reply-form-full'
        });

        const messageTypesLabel = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-input-label'
        }, '适用消息类型');

        const messageTypesDescription = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-input-description'
        }, '选择此规则适用的消息类型');

        const messageTypesSelections = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-message-types-selection'
        });

        // 确保rule.messageTypes存在
        if (!rule.messageTypes) {
            rule.messageTypes = ['TEXT']; // 默认为文本消息
        }

        // 消息类型选项
        const messageTypes = [
            { value: 'TEXT', label: '普通文本消息' },
            { value: 'CARD', label: '笔记卡片' },
            { value: 'SPOTLIGHT', label: '聚光进线' }
        ];

        messageTypes.forEach(type => {
            const typeContainer = this.app.utils.dom.createElement('div', {
                class: 'xhs-auto-reply-message-type-option'
            });

            const typeCheckbox = this.app.utils.dom.createElement('input', {
                type: 'checkbox',
                id: `rule-${index}-type-${type.value}`,
                checked: rule.messageTypes.includes(type.value)
            });

            const typeLabel = this.app.utils.dom.createElement('label', {
                for: `rule-${index}-type-${type.value}`
            }, type.label);

            this.app.utils.dom.addEvent(typeCheckbox, 'change', () => {
                let types = [...rule.messageTypes];

                if (typeCheckbox.checked) {
                    if (!types.includes(type.value)) {
                        types.push(type.value);
                    }
                } else {
                    types = types.filter(t => t !== type.value);
                    // 确保至少选择一种消息类型
                    if (types.length === 0) {
                        alert('必须至少选择一种消息类型');
                        typeCheckbox.checked = true;
                        return;
                    }
                }

                this.updateRuleProperty(index, 'messageTypes', types);
            });

            typeContainer.appendChild(typeCheckbox);
            typeContainer.appendChild(typeLabel);
            messageTypesSelections.appendChild(typeContainer);
        });

        messageTypesContainer.appendChild(messageTypesLabel);
        messageTypesContainer.appendChild(messageTypesDescription);
        messageTypesContainer.appendChild(messageTypesSelections);
        
        matchSettingsGrid.appendChild(messageTypesContainer);
        matchSettingsBody.appendChild(matchSettingsGrid);

        // ======== 3. 响应设置卡片 ========
        const responseSettingsCard = this.createCardGroup('响应设置', ruleContent);
        const responseSettingsBody = responseSettingsCard.querySelector('.xhs-auto-reply-card-body');

        // 使用AI回复
        const aiCheck = this.createCheckboxItem(
            'useAI',
            '使用AI回复',
            rule.useAI,
            '使用AI生成回复而不是固定模板',
            (checked) => this.updateRuleProperty(index, 'useAI', checked)
        );
        
        responseSettingsBody.appendChild(aiCheck);

        // 回复内容
        const responseContainer = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-input-item'
        });

        const responseLabel = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-input-label'
        }, '回复内容');

        const responseDescription = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-input-description'
        }, rule.useAI ? '输入AI提示词，用于生成回复内容' : '输入固定回复的内容模板');

        const responseTextarea = this.app.utils.dom.createElement('textarea', {
            class: 'xhs-auto-reply-response-textarea',
            placeholder: rule.useAI ? '请输入AI提示词...' : '请输入回复内容...',
            value: rule.response || ''
        });

        this.app.utils.dom.addEvent(responseTextarea, 'input', (e) => {
            this.updateRuleProperty(index, 'response', e.target.value);
        });

        responseContainer.appendChild(responseLabel);
        responseContainer.appendChild(responseDescription);
        responseContainer.appendChild(responseTextarea);
        
        responseSettingsBody.appendChild(responseContainer);

        // ======== 4. 关键词管理卡片 ========
        const keywordsCard = this.createCardGroup('关键词管理', ruleContent);
        const keywordsBody = keywordsCard.querySelector('.xhs-auto-reply-card-body');

        // 添加关键词管理说明
        const keywordsDescription = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-input-description',
            style: 'margin-bottom: 16px;'
        }, `添加触发此规则的关键词，当前匹配逻辑为: ${rule.matchLogic === 'OR' ? '匹配任一关键词' : '匹配所有关键词'}`);
        
        keywordsBody.appendChild(keywordsDescription);

        // 关键词列表
        const keywordsList = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-keyword-rule-keywords',
            'data-rule-index': index
        });

        // 添加已有关键词
        rule.keywords.forEach((keyword, keywordIndex) => {
            const tag = this.createKeywordTag(keyword, index, keywordIndex);
            keywordsList.appendChild(tag);
        });
        
        keywordsBody.appendChild(keywordsList);

        // 添加关键词输入框
        const keywordAdd = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-keyword-add'
        });

        const keywordInput = this.app.utils.dom.createElement('input', {
            class: 'xhs-auto-reply-keyword-add-input',
            placeholder: '输入关键词后点击添加或按回车'
        });

        const keywordAddBtn = this.app.utils.dom.createElement('button', {
            class: 'xhs-auto-reply-keyword-add-btn'
        }, '添加');

        this.app.utils.dom.addEvent(keywordAddBtn, 'click', () => {
            const value = keywordInput.value.trim();
            if (value) {
                this.addKeyword(index, value);
                keywordInput.value = '';
            }
        });

        this.app.utils.dom.addEvent(keywordInput, 'keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                keywordAddBtn.click();
            }
        });

        keywordAdd.appendChild(keywordInput);
        keywordAdd.appendChild(keywordAddBtn);
        
        keywordsBody.appendChild(keywordAdd);

        // 添加关键词技巧提示
        const keywordTips = this.app.utils.dom.createElement('div', {
            style: 'margin-top: 12px; font-size: 12px; color: #666;'
        }, `提示: 多个关键词间使用 ${rule.matchLogic === 'OR' ? '"或"' : '"与"'} 逻辑，${rule.matchType === 'regex' ? '支持正则表达式' : ''}`);
        
        keywordsBody.appendChild(keywordTips);

        return ruleElement;
    }

    /**
     * 创建卡片分组
     * @param {string} title 分组标题
     * @param {Element} container 容器元素
     * @returns {Element} 卡片分组元素
     */
    createCardGroup(title, container) {
        const cardGroup = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-card-group'
        });

        const cardHeader = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-card-header',
            style: 'cursor: pointer; display: flex; justify-content: space-between; align-items: center;'
        });

        const headerTitle = this.app.utils.dom.createElement('div', {}, title);
        
        // 使用更明显的图标，并添加文字提示
        const headerIcon = this.app.utils.dom.createElement('span', {
            class: 'xhs-auto-reply-card-header-icon',
            style: 'font-weight: bold; color: #FF2442; padding: 4px; border-radius: 4px;'
        }, '▼ 点击折叠');

        cardHeader.appendChild(headerTitle);
        cardHeader.appendChild(headerIcon);
        
        // 确保内容默认展开，设置明确的样式
        const cardBody = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-card-body xhs-auto-reply-collapsible',
            style: 'display: block; max-height: 2000px; overflow: visible;'
        });

        // 改进折叠/展开功能
        this.app.utils.dom.addEvent(cardHeader, 'click', (e) => {
            e.stopPropagation(); // 阻止事件冒泡
            
            // 使用直接的样式切换而不是类
            const isVisible = cardBody.style.display !== 'none';
            
            if (isVisible) {
                // 折叠内容
                cardBody.style.display = 'none';
                headerIcon.textContent = '▶ 点击展开';
            } else {
                // 展开内容
                cardBody.style.display = 'block';
                cardBody.style.maxHeight = '2000px';
                cardBody.style.overflow = 'visible';
                headerIcon.textContent = '▼ 点击折叠';
            }
            
            // 调试输出
            console.log(`卡片 [${title}] 的内容已${isVisible ? '隐藏' : '显示'}`);
        });

        // 添加鼠标悬停效果
        this.app.utils.dom.addEvent(cardHeader, 'mouseover', () => {
            cardHeader.style.backgroundColor = '#f5f5f5';
        });
        
        this.app.utils.dom.addEvent(cardHeader, 'mouseout', () => {
            cardHeader.style.backgroundColor = '';
        });

        cardGroup.appendChild(cardHeader);
        cardGroup.appendChild(cardBody);
        
        container.appendChild(cardGroup);
        
        return cardGroup;
    }

    /**
     * 创建输入项
     * @param {string} property 属性名
     * @param {string} label 标签文本
     * @param {string} value 当前值
     * @param {string} description 描述文本
     * @param {Function} onChange 值变化回调
     * @param {string} type 输入类型
     * @returns {Element} 输入项元素
     */
    createInputItem(property, label, value, description, onChange, type = 'text') {
        const item = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-item'
        });

        const labelEl = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-item-label'
        }, label);

        const input = this.app.utils.dom.createElement('input', {
            class: 'xhs-auto-reply-settings-input',
            type: type,
            value: value || '',
            'data-property': property
        });

        this.app.utils.dom.addEvent(input, 'input', (e) => {
            onChange(e.target.value);
        });

        const descriptionEl = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-item-description'
        }, description);

        item.appendChild(labelEl);
        item.appendChild(input);
        item.appendChild(descriptionEl);

        return item;
    }

    /**
     * 创建复选框输入项
     * @param {string} property 属性名
     * @param {string} label 标签文本
     * @param {boolean} checked 是否选中
     * @param {string} description 描述文本
     * @param {Function} onChange 值变化回调
     * @returns {Element} 复选框输入项元素
     */
    createCheckboxItem(property, label, checked, description, onChange) {
        const item = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-item'
        });

        const checkboxContainer = this.app.utils.dom.createElement('div', {
            style: 'display: flex; align-items: center;'
        });

        const input = this.app.utils.dom.createElement('input', {
            type: 'checkbox',
            checked: checked ? 'checked' : '',
            style: 'margin-right: 8px;',
            'data-property': property
        });

        this.app.utils.dom.addEvent(input, 'change', (e) => {
            onChange(e.target.checked);
        });

        const labelEl = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-item-label',
            style: 'margin-bottom: 0;'
        }, label);

        checkboxContainer.appendChild(input);
        checkboxContainer.appendChild(labelEl);

        const descriptionEl = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-settings-item-description'
        }, description);

        item.appendChild(checkboxContainer);
        item.appendChild(descriptionEl);

        return item;
    }

    /**
     * 创建关键词标签元素
     * @param {string} keyword 关键词
     * @param {number} ruleIndex 规则索引
     * @param {number} keywordIndex 关键词索引
     * @returns {HTMLElement} 关键词标签元素
     */
    createKeywordTag(keyword, ruleIndex, keywordIndex) {
        const tag = this.app.utils.dom.createElement('div', {
            class: 'xhs-auto-reply-keyword-tag',
            'data-rule-index': ruleIndex,
            'data-keyword-index': keywordIndex,
            title: '点击编辑此关键词',
            style: 'position: relative;'
        });

        const text = this.app.utils.dom.createElement('span', {
            style: 'max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;'
        }, keyword);

        const removeBtn = this.app.utils.dom.createElement('span', {
            class: 'xhs-auto-reply-keyword-tag-remove',
            title: '删除此关键词'
        }, '×');

        const editBtn = this.app.utils.dom.createElement('span', {
            class: 'xhs-auto-reply-keyword-tag-edit',
            title: '编辑此关键词'
        }, '✎');

        // 为整个标签添加点击编辑功能
        this.app.utils.dom.addEvent(tag, 'click', (e) => {
            if (e.target !== removeBtn && e.target !== editBtn) {
                this.editKeyword(ruleIndex, keywordIndex);
            }
        });

        // 为编辑按钮添加点击事件
        this.app.utils.dom.addEvent(editBtn, 'click', (e) => {
            e.stopPropagation(); // 防止事件冒泡
            this.editKeyword(ruleIndex, keywordIndex);
        });

        // 为删除按钮添加点击事件
        this.app.utils.dom.addEvent(removeBtn, 'click', (e) => {
            e.stopPropagation(); // 防止事件冒泡
            if (confirm(`确定要删除关键词"${keyword}"吗？`)) {
                this.removeKeyword(ruleIndex, keywordIndex);
            }
        });

        tag.appendChild(text);
        tag.appendChild(editBtn);
        tag.appendChild(removeBtn);

        return tag;
    }

    /**
     * 编辑关键词
     * @param {number} ruleIndex 规则索引
     * @param {number} keywordIndex 关键词索引
     */
    editKeyword(ruleIndex, keywordIndex) {
        if (ruleIndex < 0 || ruleIndex >= this.rules.length) return;
        if (keywordIndex < 0 || keywordIndex >= this.rules[ruleIndex].keywords.length) return;

        const keyword = this.rules[ruleIndex].keywords[keywordIndex];
        const newKeyword = prompt('请编辑关键词:', keyword);

        if (newKeyword !== null && newKeyword.trim() !== '' && newKeyword !== keyword) {
            // 检查是否已存在相同关键词
            if (this.rules[ruleIndex].keywords.includes(newKeyword)) {
                this.showNotification('此关键词已存在', 'warning');
                return;
            }

            // 更新关键词
            this.rules[ruleIndex].keywords[keywordIndex] = newKeyword;
            
            // 保存并更新视图
            this.saveRules();
            this.renderRules();
            
            // 显示编辑成功通知
            this.showNotification('关键词编辑成功', 'success');
        }
    }

    /**
     * 切换规则启用状态
     * @param {number} index 规则索引
     * @param {boolean} enabled 是否启用
     */
    toggleRuleEnabled(index, enabled) {
        if (index < 0 || index >= this.rules.length) return;

        this.rules[index].enabled = enabled;
        this.saveRules();
        
        // 更新规则标题的显示样式
        const ruleElement = document.querySelector(`.xhs-auto-reply-keyword-rule[data-index="${index}"]`);
        if (ruleElement) {
            const ruleHeader = ruleElement.querySelector('.xhs-auto-reply-keyword-rule-header');
            if (ruleHeader) {
                if (enabled) {
                    ruleHeader.style.opacity = '1';
                } else {
                    ruleHeader.style.opacity = '0.6';
                }
            }
        }
        
        // 显示状态变更通知
        const statusText = enabled ? '已启用' : '已禁用';
        this.showNotification(`规则"${this.rules[index].name}"${statusText}`, 'info');
    }

    /**
     * 删除规则
     * @param {number} index 规则索引
     */
    deleteRule(index) {
        if (index < 0 || index >= this.rules.length) return;

        // 保存规则名称用于通知
        const ruleName = this.rules[index].name;

        // 从数组中移除规则
        this.rules.splice(index, 1);
        
        // 保存并更新视图
        this.saveRules();
        this.renderRules();
        
        // 显示删除成功通知
        this.showNotification(`规则"${ruleName}"已删除`, 'success');
    }

    /**
     * 更新规则属性
     * @param {number} index 规则索引
     * @param {string} property 属性名
     * @param {*} value 属性值
     */
    updateRuleProperty(index, property, value) {
        if (index < 0 || index >= this.rules.length) return;

        this.rules[index][property] = value;
        this.saveRules();
    }

    /**
     * 添加关键词
     * @param {number} ruleIndex 规则索引
     * @param {string} keyword 关键词
     */
    addKeyword(ruleIndex, keyword) {
        if (ruleIndex < 0 || ruleIndex >= this.rules.length) return;

        // 处理批量添加（按逗号或换行分隔）
        if (keyword.includes(',') || keyword.includes('\n')) {
            const keywords = keyword.split(/[,\n]/).map(k => k.trim()).filter(k => k);
            if (keywords.length > 0) {
                let added = 0;
                let duplicates = 0;
                
                // 批量添加所有关键词
                keywords.forEach(k => {
                    // 检查是否已存在相同关键词
                    if (this.rules[ruleIndex].keywords.includes(k)) {
                        duplicates++;
                    } else {
                        // 添加关键词
                        this.rules[ruleIndex].keywords.push(k);
                        added++;
                    }
                });
                
                // 保存并更新视图
                this.saveRules();
                this.renderRules();
                
                // 显示添加结果
                const message = `已添加 ${added} 个关键词${duplicates > 0 ? `，${duplicates} 个重复已忽略` : ''}`;
                this.showNotification(message, 'success');
                return;
            }
        }

        // 单个关键词添加流程
        // 检查是否已存在相同关键词
        if (this.rules[ruleIndex].keywords.includes(keyword)) {
            this.showNotification('此关键词已存在', 'warning');
            return;
        }

        // 添加关键词
        this.rules[ruleIndex].keywords.push(keyword);

        // 保存并更新视图
        this.saveRules();

        // 添加关键词标签
        const keywordsList = document.querySelector(`.xhs-auto-reply-keyword-rule-keywords[data-rule-index="${ruleIndex}"]`);
        if (keywordsList) {
            const tag = this.createKeywordTag(keyword, ruleIndex, this.rules[ruleIndex].keywords.length - 1);
            keywordsList.appendChild(tag);
            
            // 显示添加成功通知
            this.showNotification('关键词添加成功', 'success');
        }
    }

    /**
     * 显示通知消息
     * @param {string} message 消息内容
     * @param {string} type 消息类型 (success|warning|error)
     */
    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = this.app.utils.dom.createElement('div', {
            class: `xhs-auto-reply-notification xhs-auto-reply-notification-${type}`,
            style: `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 10px 16px;
                background-color: ${this.getNotificationColor(type)};
                color: white;
                border-radius: 4px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                z-index: 10000;
                font-size: 14px;
                max-width: 300px;
                transition: opacity 0.3s, transform 0.3s;
                opacity: 0;
                transform: translateY(-10px);
            `
        }, message);

        // 添加到页面
        document.body.appendChild(notification);

        // 显示通知
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 10);

        // 定时消失
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-10px)';
            
            // 删除元素
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    /**
     * 获取通知颜色
     * @param {string} type 消息类型
     * @returns {string} 颜色代码
     */
    getNotificationColor(type) {
        switch (type) {
            case 'success': return '#4CAF50';
            case 'warning': return '#FF9800';
            case 'error': return '#F44336';
            default: return '#2196F3';
        }
    }

    /**
     * 移除关键词
     * @param {number} ruleIndex 规则索引
     * @param {number} keywordIndex 关键词索引
     */
    removeKeyword(ruleIndex, keywordIndex) {
        if (ruleIndex < 0 || ruleIndex >= this.rules.length) return;
        if (keywordIndex < 0 || keywordIndex >= this.rules[ruleIndex].keywords.length) return;

        // 获取要删除的关键词
        const keyword = this.rules[ruleIndex].keywords[keywordIndex];
        
        // 移除关键词
        this.rules[ruleIndex].keywords.splice(keywordIndex, 1);

        // 保存并更新视图
        this.saveRules();
        
        // 仅更新关键词列表而不是整个规则
        const keywordsList = document.querySelector(`.xhs-auto-reply-keyword-rule-keywords[data-rule-index="${ruleIndex}"]`);
        if (keywordsList) {
            keywordsList.innerHTML = '';
            
            this.rules[ruleIndex].keywords.forEach((keyword, idx) => {
                const tag = this.createKeywordTag(keyword, ruleIndex, idx);
                keywordsList.appendChild(tag);
            });
            
            // 显示移除成功通知
            this.showNotification(`关键词"${keyword}"已移除`, 'info');
        } else {
            // 如果无法找到关键词列表容器，则重新渲染整个规则列表
            this.renderRules();
        }
    }

    /**
     * 添加新规则
     */
    addRule() {
        // 生成唯一ID
        const id = 'rule_' + Date.now();

        // 创建新规则
        const newRule = {
            id,
            name: '新规则',
            keywords: ['关键词示例'],
            matchType: 'contains', // 默认为包含匹配
            isRegex: false, // 保留向后兼容
            enabled: true,
            response: '感谢您的消息，我会尽快回复您。',
            useAI: false,
            priority: 10,
            messageTypes: ['TEXT'], // 默认适用于普通文本消息
            matchLogic: 'OR', // 关键词之间的逻辑关系：OR(任一匹配)
            conditions: [] // 附加条件，可以用于更复杂的匹配逻辑
        };

        // 添加到规则列表
        this.rules.push(newRule);

        // 渲染规则
        this.renderRules();

        // 保存规则
        this.saveRules();

        // 显示添加成功通知
        this.showNotification('新规则已创建，请完善规则设置', 'success');

        // 自动滚动到新添加的规则
        setTimeout(() => {
            const newRuleElement = document.querySelector(`.xhs-auto-reply-keyword-rule[data-id="${id}"]`);
            if (newRuleElement) {
                newRuleElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);

        this.app.utils.logger.info('添加新规则', newRule);
    }

    /**
     * 保存规则到配置
     */
    async saveRules() {
        // 直接将规则保存到根级别的 keywordRules 设置中
        await this.app.config.setSetting('keywordRules', this.rules);
        
        this.app.utils.logger.debug('自动回复关键词规则已保存', this.rules);
    }

    /**
     * 获取所有规则
     * @returns {Array} 规则列表
     */
    getRules() {
        return this.rules;
    }

    /**
     * 编辑规则名称
     * @param {number} index 规则索引
     */
    editRuleName(index) {
        if (index < 0 || index >= this.rules.length) return;

        const newName = prompt('请编辑规则名称:', this.rules[index].name);

        if (newName !== null && newName.trim() !== '') {
            this.rules[index].name = newName;
            this.saveRules();
            this.renderRules();
            this.showNotification('规则名称已更新', 'success');
        }
    }
}

(function() {
    'use strict';

    // 全局变量
    const app = {
        config: null,
        ui: null,
        core: null,
        utils: null,
        initialized: false,
        // 添加 leadGeneration 引用
        leadGeneration: null,
        // 添加远程控制引用
        remoteController: null,
        settings: null,
        followUpManager: null,
        // 添加初始化状态标记
        initializing: false,
        startupErrors: [],
        componentStatus: {}
    };

    // 初始化函数
    async function initialize() {
        // 防止重复初始化
        if (app.initializing) {
            console.log('初始化已在进行中，请等待...');
            return false;
        }
        if (app.initialized) {
            console.log('已经初始化完成，无需重复初始化');
            return true;
        }

        app.initializing = true;
        app.startupErrors = [];
        app.componentStatus = {
            utils: false,
            config: false,
            remoteControl: false,
            core: false,
            ui: false
        };

        try {
            console.log('小红书私信自动回复助手: 正在初始化...');

            // 1. 加载工具类
            const utilsLoaded = await loadUtils();
            if (!utilsLoaded) {
                app.startupErrors.push('工具类加载失败');
                throw new Error('工具类加载失败');
            }
            app.componentStatus.utils = true;

            // 2. 加载配置
            const configLoaded = await loadConfig();
            if (!configLoaded) {
                app.startupErrors.push('配置加载失败');
                throw new Error('配置加载失败');
            }
            app.componentStatus.config = true;

            // 3. 加载远程控制模块
            const remoteControlLoaded = await loadRemoteControl();
            if (!remoteControlLoaded) {
                app.utils.logger.warn('远程控制模块加载失败，将使用本地控制');
            } else {
                app.componentStatus.remoteControl = true;
            }

            // 4. 加载核心功能
            const coreLoaded = await loadCore();
            if (!coreLoaded) {
                app.startupErrors.push('核心功能加载失败');
                throw new Error('核心功能加载失败');
            }
            app.componentStatus.core = true;

            // 5. 加载UI
            const uiLoaded = await loadUI();
            if (!uiLoaded) {
                app.startupErrors.push('UI加载失败');
                throw new Error('UI加载失败');
            }
            app.componentStatus.ui = true;

            // 6. 初始化完成
            app.initialized = true;
            app.initializing = false;
            app.utils.logger.info('初始化完成');

            // 7. 检查远程控制状态，如果远程控制已启用并且允许脚本运行，或者远程控制未启用，则启动脚本
            if (app.config.getSetting('autoStart', false)) {
                // 检查远程控制状态
                const remoteControlEnabled = app.config.getSetting('remoteControl.enabled', false);
                const remoteStatus = app.config.getSetting('remoteControl.status.enabled', true);
                
                if (!remoteControlEnabled || remoteStatus) {
                    // 延迟启动以确保其他组件完全就绪
                    setTimeout(() => {
                        startMessageDetection();
                    }, 1000);
                } else {
                    const message = app.config.getSetting('remoteControl.status.message', '脚本已被远程禁用');
                    app.utils.logger.info(`自动启动被远程控制阻止: ${message}`);
                }
            }

            // 确保 settings 对象被正确设置
            if (!app.settings) {
                app.settings = app.config;
                app.utils.logger.info('设置 app.settings 为 app.config');
            }

            // 初始化追粉系统管理器
            app.followUpManager = new FollowUpManager(app);
            await app.followUpManager.init();

            return true;
        } catch (error) {
            console.error('小红书私信自动回复助手: 初始化失败', error);
            if (app.utils && app.utils.logger) {
                app.utils.logger.error('初始化失败', error);
            }
            app.initializing = false;
            return false;
        }
    }

    /**
     * 安全启动消息检测
     */
    function startMessageDetection() {
        try {
            // 双重检查确保所有依赖组件已初始化
            if (!app.initialized) {
                app.utils.logger.warn('应用尚未初始化完成，无法启动消息检测');
                return false;
            }

            if (!app.core || !app.core.messageDetector) {
                app.utils.logger.error('消息检测器未初始化，无法启动');
                return false;
            }

            // 启动消息检测
            const result = app.core.messageDetector.start();
            if (result) {
                app.utils.logger.info('消息检测成功启动');
            } else {
                app.utils.logger.error('消息检测启动失败');
            }
            return result;
        } catch (error) {
            app.utils.logger.error('启动消息检测时发生错误', error);
            return false;
        }
    }

    // 加载工具类
    async function loadUtils() {
        try {
            console.log('小红书私信自动回复助手: 工具类加载中...');

            // 1. 创建日志工具实例
            // Logger 类应该在构建时已包含
            const logger = new Logger({
                logLevel: 'debug',
                showTimestamp: true,
                prefix: '小红书助手'
            });

            // 2. 创建DOM工具实例
            // DomUtils 类应该在构建时已包含
            const dom = new DomUtils();

            // 3. 创建存储工具实例
            // StorageManager 类应该在构建时已包含
            const storage = new StorageManager();
            await storage.initialize();

            // 4. 创建会话管理器实例
            // SessionManager 类应该在构建时已包含
            const sessionManager = new SessionManager(app);

            // 设置工具对象
            app.utils = {
                logger,
                dom,
                storage,
                sessionManager
            };

            // 初始化会话管理器（需要在app.utils设置后）
            await sessionManager.initialize();

            logger.info('所有工具类加载完成');
            return true;
        } catch (error) {
            console.error('小红书私信自动回复助手: 工具类加载失败', error);
            if (app.utils && app.utils.logger) {
                app.utils.logger.error('工具类加载失败', error);
            }
            return false;
        }
    }

    // 加载配置
    async function loadConfig() {
        try {
            console.log('小红书私信自动回复助手: 配置加载中...');

            // 1. 检查默认设置
            // defaultSettings 变量应该在构建时已包含
            if (typeof defaultSettings === 'undefined') {
                 throw new Error('默认设置未加载');
            }

            // 2. 创建配置管理器实例
            // ConfigManager 类应该在构建时已包含
            const config = new ConfigManager();
            await config.initialize(); // initialize 会自动加载 defaultSettings

            // 设置配置对象
            app.config = config;

            app.utils.logger.info('配置加载完成');
            return true;
        } catch (error) {
            app.utils.logger.error('配置加载失败', error);
            return false;
        }
    }

    // 加载远程控制模块
    async function loadRemoteControl() {
        try {
            console.log('小红书私信自动回复助手: 远程控制模块加载中...');

            // 检查远程控制是否启用
            const remoteControlEnabled = app.config.getSetting('remoteControl.enabled', false);
            if (!remoteControlEnabled) {
                app.utils.logger.info('远程控制功能已在配置中禁用');
                return true; // 返回成功，但不实际加载远程控制
            }

            // 创建远程控制实例
            // RemoteController 类应该在构建时已包含
            const remoteController = new RemoteController(app);
            
            // 初始化远程控制
            await remoteController.initialize();
            
            // 设置远程控制对象
            app.remoteController = remoteController;
            
            app.utils.logger.info('远程控制模块加载完成');
            return true;
        } catch (error) {
            app.utils.logger.error('远程控制模块加载失败', error);
            return false;
        }
    }

    // 加载核心功能
    async function loadCore() {
        try {
            console.log('小红书私信自动回复助手: 核心功能加载中...');

            // 1. 创建AI服务实例
            // AiService 类应该在构建时已包含
            const aiService = new AiService(app); // 仅实例化

            // 2. 创建自动回复执行模块实例
            // AutoReply 类应该在构建时已包含
            const autoReply = new AutoReply(app); // 仅实例化

            // 3. 创建消息处理模块实例
            // MessageHandler 类应该在构建时已包含
            const messageHandler = new MessageHandler(app); // 仅实例化

            // 4. 创建消息检测模块实例
            // MessageDetector 类应该在构建时已包含
            const messageDetector = new MessageDetector(app); // 仅实例化

            // 5. 创建获客工具处理模块实例
            // LeadGenerationHandler 类应该在构建时已包含
            const leadGenerationHandler = new LeadGenerationHandler(app); // 仅实例化

            // 6. 将所有实例赋值给 app.core *在初始化之前*
            app.core = {
                aiService,
                autoReply,
                messageHandler,
                messageDetector,
                leadGenerationHandler
            };
            // 可选：如果其他地方直接用了 app.leadGeneration，保留这个赋值
            app.leadGeneration = leadGenerationHandler;

            // 7. 在所有核心模块都实例化并添加到 app.core 后，再依次初始化
            await app.core.aiService.initialize();
            await app.core.autoReply.initialize();
            await app.core.messageHandler.initialize();
            await app.core.messageDetector.initialize();
            await app.core.leadGenerationHandler.initialize();

            app.utils.logger.info('核心功能加载完成');
            return true;
        } catch (error) {
            app.utils.logger.error('核心功能加载失败', error);
            return false;
        }
    }

    // 加载UI
    async function loadUI() {
        try {
            console.log('小红书私信自动回复助手: UI加载中...');

            // 1. 创建设置面板
            // SettingsPanel 类应该在构建时已包含
            const settingsPanel = new SettingsPanel(app);
            await settingsPanel.initialize();

            // 2. 创建控制面板
            // ControlPanel 类应该在构建时已包含
            const controlPanel = new ControlPanel(app);
            await controlPanel.initialize();

            // 设置UI对象
            app.ui = {
                settingsPanel,
                controlPanel
            };

            app.utils.logger.info('UI加载完成');
            return true;
        } catch (error) {
            app.utils.logger.error('UI加载失败', error);
            return false;
        }
    }

    // 检查是否在私信页面
    function isInMessagePage() {
        return (
            window.location.href.includes('xiaohongshu.com/im') || 
            window.location.href.includes('xiaohongshu.com/message')
        );
    }

    // 等待页面加载完成
    function waitForPageLoad() {
        return new Promise(resolve => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve);
            }
        });
    }

    // 主函数
    async function main() {
        try {
            await waitForPageLoad();

            // 如果不在私信页面，则不初始化
            if (!isInMessagePage()) {
                console.log('小红书私信自动回复助手: 当前不在私信页面，不进行初始化');
                return;
            }

            // 延迟初始化，确保页面完全加载
            setTimeout(async () => {
                // 尝试初始化
                const success = await initialize();
                if (!success) {
                    console.error('小红书私信自动回复助手: 初始化失败，请刷新页面重试');
                    
                    // 添加重试机制
                    if (app.startupErrors && app.startupErrors.length > 0) {
                        console.error('初始化错误列表:', app.startupErrors);
                    }
                    
                    // 尝试再次初始化，最多3次
                    let retryCount = 0;
                    const maxRetries = 3;
                    const retryInterval = 5000; // 5秒
                    
                    const retryInitialize = async () => {
                        if (retryCount >= maxRetries || app.initialized) return;
                        
                        retryCount++;
                        console.log(`小红书私信自动回复助手: 尝试重新初始化 (${retryCount}/${maxRetries})...`);
                        
                        const retrySuccess = await initialize();
                        if (!retrySuccess && retryCount < maxRetries) {
                            setTimeout(retryInitialize, retryInterval);
                        }
                    };
                    
                    setTimeout(retryInitialize, retryInterval);
                }
            }, 2000); // 延迟2秒初始化
        } catch (error) {
            console.error('小红书私信自动回复助手: 主函数执行失败', error);
        }
    }

    // 启动
    main();

})();

