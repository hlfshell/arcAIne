export const ToolView = {
    name: 'ToolView',
    props: ['tool', 'contexts', 'searchQuery'],
    data() {
        return {
            isDescriptionExpanded: true,
            isExamplesExpanded: true,
            isTriggersExpanded: true,
            isArgumentsExpanded: true
        }
    },
    computed: {
        // Get all contexts that used this tool
        toolContexts() {
            if (!this.contexts) return [];
            let contexts = Array.from(this.contexts.values())
                .filter(context => context.tool_id === this.tool.id)
                .sort((a, b) => (b.created_at || 0) - (a.created_at || 0));

            // Apply search filter if there's a search query
            if (this.searchQuery?.trim()) {
                const query = this.searchQuery.trim().toLowerCase();
                contexts = contexts.filter(context => {
                    // Check args
                    const argsStr = context.args ? JSON.stringify(context.args).toLowerCase() : '';
                    if (argsStr.includes(query)) return true;

                    // Check output
                    const outputStr = context.output ?
                        (typeof context.output === 'object' ?
                            JSON.stringify(context.output) : context.output).toLowerCase()
                        : '';
                    if (outputStr.includes(query)) return true;

                    // Check error
                    if (context.error?.toLowerCase().includes(query)) return true;

                    return false;
                });
            }

            return contexts;
        },
        // Format arguments for display
        formattedArguments() {
            if (!this.tool.args) return [];
            return this.tool.args.map(arg => ({
                ...arg,
                formattedType: arg.type.charAt(0) + arg.type.slice(1),
                formattedRequired: arg.required ? 'Required' : 'Optional'
            }));
        }
    },
    methods: {
        formatTimestamp(timestamp) {
            if (!timestamp) return 'N/A';
            return new Date(timestamp * 1000).toLocaleString();
        }
    },
    template: `
        <div class= "tool-view">
            <button class="back-button" @click="$emit('back')">&larr; Back</button>
            <div class="tool-header">
                <h2 class="tool-title">{{ tool.name }}</h2>
            </div>
            
            <!-- Description Section -->
            <div class="tool-section">
                <div class="section-header" @click="isDescriptionExpanded = !isDescriptionExpanded">
                    <h3>Description</h3>
                    <span class="expand-icon">{{ isDescriptionExpanded ? '−' : '+' }}</span>
                </div>
                <div v-show="isDescriptionExpanded" class="section-content">
                    <p class="tool-description">{{ tool.description }}</p>
                    
                    <!-- Arguments -->
                    <div class="arguments-section">
                        <div class="section-header" @click="isArgumentsExpanded = !isArgumentsExpanded">
                            <h4>Arguments</h4>
                            <span class="expand-icon">{{ isArgumentsExpanded ? '−' : '+' }}</span>
                        </div>
                        <div v-show="isArgumentsExpanded" class="arguments-grid">
                            <div v-for="arg in formattedArguments" :key="arg.name" class="argument-card">
                                <div class="argument-header">
                                    <span class="argument-name">{{ arg.name }}</span>
                                    <span :class="['argument-badge', arg.required ? 'required' : 'optional']">
                                        {{ arg.formattedRequired }}
                                    </span>
                                </div>
                                <div class="argument-type">{{ arg.formattedType }}</div>
                                <div class="argument-description">{{ arg.description }}</div>
                                <div v-if="arg.default" class="argument-default">
                                    Default: {{ arg.default }}
                                </div>
                            </div>
                        </div>
                    </div >
                    
                    <!--Examples -->
                    <div v-if="tool.examples && tool.examples.length" class="examples-section">
                        <div class="section-header" @click="isExamplesExpanded = !isExamplesExpanded">
                            <h4>Examples</h4>
                            <span class="expand-icon">{{ isExamplesExpanded ? '−' : '+' }}</span>
                        </div>
                        <div v-show="isExamplesExpanded" class="examples-list">
                            <div v-for="(example, index) in tool.examples" :key="index" class="example-card">
                                <div v-if="example.description" class="example-description">
                                    {{ example.description }}
                                </div>
                                <div class="example-code">
                                    <code>{{ tool.name }}({{ 
                                        Object.entries(example.args)
                                            .map(([key, value]) => key + ' = ' + value)
                                            .join(', ') 
                                    }})</code>
                                </div>
                                <div v-if="example.output" class="example-output">
                                    <strong>Returns:</strong>
                                    <pre>{{ example.output }}</pre>
                                </div>
                                <div v-if="example.explanation" class="example-explanation">
                                    {{ example.explanation }}
                                </div>
                            </div>
                        </div >
                    </div >
                </div >
            </div >

            <!--Recent Triggers Section-->
            <div class="tool-section">
                <div class="section-header" @click="isTriggersExpanded = !isTriggersExpanded">
                    <h3>Recent Triggers ({{ toolContexts.length }})</h3>
                    <span class="expand-icon">{{ isTriggersExpanded ? '−' : '+' }}</span>
                </div>
                <div v-show="isTriggersExpanded" class="section-content">
                    <div v-if="toolContexts.length === 0" class="no-triggers">
                        No recent triggers for this tool
                    </div>
                    <div v-else class="triggers-list">
                        <div v-for="context in toolContexts" :key="context.id" class="trigger-card">
                            <div class="trigger-header">
                                <span class="trigger-timestamp">{{ formatTimestamp(context.created_at) }}</span>
                                <span class="trigger-id">Context {{ context.id }}</span>
                                <span :class="['status', 'status-' + context.status]">
                                    {{ context.status }}
                                </span>
                            </div>
                            <div v-if="context.args" class="trigger-output">
                                <h4>Arguments</h4>
                                <pre>{{ JSON.stringify(context.args, null, 2)}}</pre>
                            </div>
                            <div v-if="context.output" class="trigger-output">
                                <h4>Output</h4>
                                <pre>{{ typeof context.output === 'object' ? 
                                    JSON.stringify(context.output, null, 2) : context.output }}</pre>
                            </div>
                            <div v-if="context.error" class="trigger-error">
                                <pre>{{ context.error }}</pre>
                            </div>
                        </div>
                    </div >
                </div >
            </div >
        </div >
    `
};