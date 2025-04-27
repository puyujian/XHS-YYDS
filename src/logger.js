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
