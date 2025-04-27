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