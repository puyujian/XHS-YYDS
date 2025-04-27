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