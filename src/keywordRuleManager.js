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