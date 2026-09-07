/* ===== 时光机智能体混剪工作台 前端应用 ===== */

const { createApp, ref, reactive, computed, onMounted, watch, nextTick } = Vue;
const { ElMessage, ElMessageBox, ElNotification } = ElementPlus;

/* ===== 安全的本地存储访问 ===== */
const _safeStorage = {
    _data: {},
    getItem(k) { try { return localStorage.getItem(k); } catch(e) { return this._data[k] || null; } },
    setItem(k, v) { try { localStorage.setItem(k, v); } catch(e) { this._data[k] = v; } },
    removeItem(k) { try { localStorage.removeItem(k); } catch(e) { delete this._data[k]; } }
};

/* ===== API 封装 ===== */
const API = {
    base: '',
    token: _safeStorage.getItem('tm_token') || '',
    async request(url, method='GET', data=null) {
        await new Promise(r => setTimeout(r, 300));
        
        if (url === '/api/auth/login') {
            return { success: true, token: 'demo-token-' + Date.now(), user: { username: (data && data.username) || 'demo' } };
        }
        if (url === '/api/dashboard/stats') {
            return { videos_today: 3, queue_tasks: 2, materials: 128, accounts: 5 };
        }
        if (url === '/api/dashboard/latest-tasks') {
            return [
                { task_id: 'task-001', task_type: 'ip_video_generate', status: 'completed', progress: 100, created_at: '2025-09-07 10:00' },
                { task_id: 'task-002', task_type: 'mix_batch_generate', status: 'running', progress: 65, created_at: '2025-09-07 11:00' },
                { task_id: 'task-003', task_type: 'voice_clone_task', status: 'queued', progress: 0, created_at: '2025-09-07 12:00' },
            ];
        }
        if (url === '/api/ip-agent/extract-text') {
            return {
                title: '\u9707\u60ca\uff0199%\u7684\u4eba\u90fd\u4e0d\u77e5\u9053\u8fd9\u4e2a\u79d8\u5bc6',
                content: '\u4f60\u77e5\u9053\u5417\uff1f\u5728\u8fd9\u4e2a\u4fe1\u606f\u7206\u70b8\u7684\u65f6\u4ee3\uff0c\u771f\u6b63\u6709\u4ef7\u503c\u7684\u5185\u5bb9\u5f80\u5f80\u88ab\u6df9\u6ca1\u5728\u566a\u97f3\u4e4b\u4e2d\u3002\u4eca\u5929\u6211\u8981\u5206\u4eab\u7684\u8fd9\u4e2a\u79d8\u5bc6\uff0c\u53ef\u80fd\u4f1a\u5f7b\u5e95\u6539\u53d8\u4f60\u7684\u8ba4\u77e5\u65b9\u5f0f\u3002',
                tags: ['#\u77e5\u8bc6\u5206\u4eab', '#\u8ba4\u77e5\u63d0\u5347', '#\u5b66\u4e60\u65b9\u6cd5']
            };
        }
        if (url === '/api/ip-agent/rewrite-text') {
            var persona = (data && data.persona) || '\u77e5\u8bc6\u535a\u4e3b';
            var orig = (data && data.text) || '';
            return {
                title: '\u3010' + persona + '\u7248\u3011' + orig.substring(0, 15) + '...',
                content: '\ud83d\udd25 \u4f60\u7edd\u5bf9\u60f3\u4e0d\u5230\uff01\u8fd9\u4e0d\u662f\u666e\u901a\u7684\u5206\u4eab\uff0c\u8fd9\u662f\u6539\u53d8\u8ba4\u77e5\u7684\u5173\u952e\u65f6\u523b\u3002\n\n' + orig + '\n\n\ud83d\udca1 \u5173\u6ce8\u6211\uff0c\u83b7\u53d6\u66f4\u591a\u5e72\u8d27\u5185\u5bb9\uff01',
                tags: ['#' + persona, '#\u77ed\u89c6\u9891', '#\u5e72\u8d27\u5206\u4eab', '#\u70ed\u95e8\u63a8\u8350']
            };
        }
        if (url === '/api/ip-agent/generate-audio') {
            return { duration: 15.5, audio_path: 'mock://audio.mp3' };
        }
        if (url === '/api/ip-agent/generate-video') {
            return { task_id: 'mock-video-' + Date.now() };
        }
        if (url === '/api/ip-agent/generate-cover') {
            var title = (data && data.title) || '\u5c01\u9762';
            var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="#16213E"/><text x="640" y="360" font-size="72" font-weight="bold" fill="#F7B733" text-anchor="middle" font-family="sans-serif">' + title.substring(0,12) + '</text></svg>';
            return { cover_path: 'data:image/svg+xml;base64,' + btoa(svg) };
        }
        if (url.indexOf('/api/mix-agent/create-mix-task') >= 0) {
            return { task_id: 'mock-mix-' + Date.now() };
        }
        if (url.indexOf('/api/mix-agent/task-progress/') >= 0) {
            return { status: 'completed', progress: 100, task_id: url.split('/').pop() };
        }
        if (url.indexOf('/api/material/list') >= 0) {
            return { items: [
                { id: 'm1', name: '\u4ea7\u54c1\u5c55\u793a.mp4', type: 'video', size: 15728640, duration: 15.0, tags: ['\u4ea7\u54c1','\u5c55\u793a'] },
                { id: 'm2', name: '\u80cc\u666f\u97f3\u4e50.mp3', type: 'audio', size: 3145728, tags: ['BGM'] },
                { id: 'm3', name: '\u5c01\u9762\u56fe.png', type: 'image', size: 524288, tags: ['\u5c01\u9762'] },
            ], folders: [
                { id: 'f1', name: '\u4ea7\u54c1\u7d20\u6750' },
                { id: 'f2', name: '\u80cc\u666f\u97f3\u4e50' },
            ] };
        }
        if (url.indexOf('/api/material/web-search') >= 0) {
            return { items: [
                { id: 'w1', title: '\u57ce\u5e02\u591c\u666f\u822a\u62cd', type: 'video', source: 'Pexels', size: '25MB' },
                { id: 'w2', title: '\u79d1\u6280\u80cc\u666f\u56fe', type: 'image', source: 'Unsplash', size: '3MB' },
            ] };
        }
        if (url.indexOf('/api/voice-clone/list') >= 0) {
            return [
                { id: 'v1', name: '\u6807\u51c6\u7537\u58f0', emotion: 'neutral', status: 'ready' },
                { id: 'v2', name: '\u6e29\u67d4\u5973\u58f0', emotion: 'warm', status: 'ready' },
                { id: 'v3', name: '\u78c1\u6027\u7537\u58f0', emotion: 'passionate', status: 'ready' },
            ];
        }
        if (url.indexOf('/api/avatar/list') >= 0) {
            return [
                { id: 'a1', name: '\u9ed8\u8ba4\u5f62\u8c61', type: 'preset' },
                { id: 'a2', name: '\u5546\u52a1\u7537\u58eb', type: 'preset' },
                { id: 'a3', name: '\u65f6\u5c1a\u5973\u58eb', type: 'preset' },
                { id: 'a4', name: '\u5361\u901a\u5f62\u8c61', type: 'preset' },
            ];
        }
        if (url.indexOf('/api/matrix-account/list') >= 0) {
            return [
                { id: 'acc1', platform: '\u6296\u97f3', account_name: '\u65f6\u5149\u673a\u5b98\u65b9\u53f7', group_name: '\u4e3b\u53f7', status: 'connected', created_at: '2025-09-01' },
                { id: 'acc2', platform: '\u5feb\u624b', account_name: '\u65f6\u5149\u673a\u5206\u53f7', group_name: '\u5206\u53f7', status: 'disconnected', created_at: '2025-09-02' },
            ];
        }
        if (url.indexOf('/api/template/list') >= 0) {
            return [
                { id: 't1', name: '\u79d1\u6280\u611f\u5c01\u9762', category: 'cover', is_custom: false },
                { id: 't2', name: '\u7b80\u7ea6\u767d\u5e95\u5c01\u9762', category: 'cover', is_custom: false },
                { id: 't3', name: '\u6807\u51c6\u5b57\u5e55', category: 'subtitle', is_custom: false },
                { id: 't4', name: '\u94a9\u5b50-\u75db\u70b9-\u5356\u70b9-CTA', category: 'mix_script', is_custom: false },
            ];
        }
        if (url.indexOf('/api/task/list') >= 0) {
            return { items: [
                { task_id: 'task-001', task_type: 'ip_video_generate', status: 'completed', progress: 100, created_at: '2025-09-07 10:00', finished_at: '2025-09-07 10:05', output_files: '[]' },
                { task_id: 'task-002', task_type: 'mix_batch_generate', status: 'running', progress: 65, created_at: '2025-09-07 11:00', finished_at: '', output_files: '[]' },
            ], total: 2 };
        }
        if (url.indexOf('/api/task/') >= 0 && url.indexOf('/log') >= 0) {
            return { log: '[2025-09-07 10:00] \u4efb\u52a1\u542f\u52a8\n[2025-09-07 10:01] \u6587\u6848\u63d0\u53d6\u5b8c\u6210\n[2025-09-07 10:02] AI\u6539\u5199\u5b8c\u6210\n[2025-09-07 10:03] \u97f3\u9891\u5408\u6210\u5b8c\u6210\n[2025-09-07 10:04] \u89c6\u9891\u6e32\u67d3\u4e2d...\n[2025-09-07 10:05] \u4efb\u52a1\u5b8c\u6210' };
        }
        if (url.indexOf('/api/setting/list') >= 0) {
            return { storage_path: '/data', llm_provider: 'openai', api_key_llm: '', tts_provider: 'baidu', api_key_tts: '', max_concurrent_tasks: 3, default_resolution: '1080p', default_fps: '30' };
        }
        return {};
    },
    get(url) { return this.request(url, 'GET'); },
    post(url, data) { return this.request(url, 'POST', data); },
    put(url, data) { return this.request(url, 'PUT', data); },
    del(url) { return this.request(url, 'DELETE'); },
    upload(url, formData) { return this.request(url, 'POST', {}); }
};

/* ===== 路由 ===== */
const router = {
    current: ref('login'),
    params: reactive({}),
    routes: {},
    go(name, params={}) {
        this.current.value = name;
        this.params = params;
        location.hash = name;
    },
    init() {
        const hash = location.hash.replace('#', '');
        if (hash) {
            this.current.value = hash;
        }
        window.addEventListener('hashchange', () => {
            const h = location.hash.replace('#', '');
            if (h) this.current.value = h;
        });
    }
};

/* ===== 全局状态 ===== */
const store = reactive({
    user: null,
    sidebarCollapsed: false,
    mobileMenuOpen: false,
    taskPanelCollapsed: true,
    tasks: [],
    taskPollTimer: null,
});

/* ===== 任务轮询 ===== */
async function pollTasks() {
    try {
        const data = await API.get('/api/task/list?page=1&page_size=10');
        store.tasks = data.items || [];
    } catch(e) {}
}

function startTaskPolling() {
    if (store.taskPollTimer) clearInterval(store.taskPollTimer);
    pollTasks();
    store.taskPollTimer = setInterval(pollTasks, 5000);
}

/* ===== 登录页 ===== */
const LoginView = {
    template: `
    <div class="login-container">
        <div class="login-box">
            <div class="login-logo">
                <div class="logo-icon">TM</div>
                <div class="logo-title">时光机智能体混剪工作台</div>
                <div class="logo-sub">无需出镜，搭建属于你的短视频内容流水线</div>
            </div>
            <el-form :model="form" label-width="0" @submit.prevent="handleLogin">
                <el-form-item>
                    <el-input v-model="form.username" placeholder="用户名" size="large" prefix-icon="User" />
                </el-form-item>
                <el-form-item>
                    <el-input v-model="form.password" type="password" placeholder="密码" size="large" prefix-icon="Lock" show-password @keyup.enter="handleLogin" />
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" size="large" style="width:100%" :loading="loading" @click="handleLogin">登 录</el-button>
                </el-form-item>
                <div style="text-align:center;color:var(--text-sub);font-size:13px;">
                    Demo账号: demo / demo123
                </div>
            </el-form>
        </div>
    </div>
    `,
    setup() {
        const form = reactive({ username: 'demo', password: 'demo123' });
        const loading = ref(false);
        const handleLogin = async () => {
            if (!form.username || !form.password) {
                ElMessage.warning('请输入用户名和密码');
                return;
            }
            loading.value = true;
            try {
                const data = await API.post('/api/auth/login', form);
                API.token = data.token;
                _safeStorage.setItem('tm_token', data.token);
                store.user = data.user;
                router.go('dashboard');
                startTaskPolling();
                ElMessage.success('登录成功');
            } catch(e) {
                ElMessage.error(e.message);
            } finally {
                loading.value = false;
            }
        };
        return { form, loading, handleLogin };
    }
};

/* ===== Dashboard ===== */
const DashboardView = {
    template: `
    <div>
        <el-row :gutter="20" class="mb-24">
            <el-col :xs="12" :sm="6" v-for="s in stats" :key="s.label">
                <div class="stat-card">
                    <div class="stat-icon" :style="{background:s.bg, color:s.color}">
                        <el-icon :size="28"><component :is="s.icon" /></el-icon>
                    </div>
                    <div>
                        <div class="stat-value">{{ s.value }}</div>
                        <div class="stat-label">{{ s.label }}</div>
                    </div>
                </div>
            </el-col>
        </el-row>
        <el-row :gutter="20" class="mb-24">
            <el-col :xs="24" :sm="12" v-for="q in quickActions" :key="q.title">
                <div class="quick-card" @click="router.go(q.route)">
                    <div class="quick-icon">{{ q.icon }}</div>
                    <div class="quick-title">{{ q.title }}</div>
                    <div class="quick-desc">{{ q.desc }}</div>
                </div>
            </el-col>
        </el-row>
        <el-card>
            <template #header>最近任务</template>
            <el-table :data="latestTasks" style="width:100%" size="small">
                <el-table-column prop="task_type" label="类型" width="160">
                    <template #default="{row}">
                        <el-tag size="small">{{ taskTypeMap[row.task_type] || row.task_type }}</el-tag>
                    </template>
                </el-table-column>
                <el-table-column prop="status" label="状态" width="100">
                    <template #default="{row}">
                        <el-tag :type="statusType(row.status)" size="small">{{ statusMap[row.status] }}</el-tag>
                    </template>
                </el-table-column>
                <el-table-column prop="progress" label="进度" width="120">
                    <template #default="{row}">
                        <el-progress :percentage="row.progress" :stroke-width="8" />
                    </template>
                </el-table-column>
                <el-table-column prop="created_at" label="创建时间" />
                <el-table-column label="操作" width="100">
                    <template #default="{row}">
                        <el-button size="small" link @click="router.go('task-center')">详情</el-button>
                    </template>
                </el-table-column>
            </el-table>
        </el-card>
    </div>
    `,
    setup() {
        const stats = ref([
            { label: '今日产出视频', value: 0, icon: 'VideoCamera', bg: 'rgba(82,196,26,0.15)', color: '#52c41a' },
            { label: '排队任务', value: 0, icon: 'Clock', bg: 'rgba(250,173,20,0.15)', color: '#faad14' },
            { label: '素材库总量', value: 0, icon: 'Folder', bg: 'rgba(247,183,51,0.15)', color: '#F7B733' },
            { label: '矩阵账号', value: 0, icon: 'Connection', bg: 'rgba(64,169,255,0.15)', color: '#40a9ff' },
        ]);
        const quickActions = [
            { icon: '🎙️', title: '新建 IP 口播项目', desc: '五步精品口播成片流水线', route: 'ip-agent' },
            { icon: '🎬', title: '新建矩阵混剪项目', desc: '六大模式批量矩阵生产', route: 'mix-agent' },
        ];
        const latestTasks = ref([]);
        const taskTypeMap = { ip_video_generate:'IP口播视频', mix_batch_generate:'批量混剪', voice_clone_task:'声音克隆', avatar_train_task:'数字人训练', web_material_download:'素材下载', platform_publish_task:'平台发布' };
        const statusMap = { queued:'排队中', running:'运行中', completed:'已完成', failed:'已失败' };
        const statusType = (s) => ({queued:'info',running:'warning',completed:'success',failed:'danger'}[s]||'info');

        onMounted(async () => {
            try {
                const s = await API.get('/api/dashboard/stats');
                stats.value[0].value = s.videos_today;
                stats.value[1].value = s.queue_tasks;
                stats.value[2].value = s.materials;
                stats.value[3].value = s.accounts;
                const lt = await API.get('/api/dashboard/latest-tasks');
                latestTasks.value = lt;
            } catch(e) { console.error(e); }
        });
        return { stats, quickActions, latestTasks, taskTypeMap, statusMap, statusType, router };
    }
};

/* ===== IP Agent ===== */
const IPAgentView = {
    template: `
    <div>
        <div class="ip-steps-container">
            <div class="ip-step-nav">
                <div v-for="(s, i) in steps" :key="i"
                     class="ip-step-item"
                     :class="{active: currentStep===i, completed: currentStep>i}"
                     @click="currentStep = i">
                    <div class="step-num">{{ currentStep > i ? '✓' : i+1 }}</div>
                    <div class="step-title">{{ s.title }}</div>
                    <div class="step-desc">{{ s.desc }}</div>
                </div>
            </div>
            <div class="ip-step-content">
                <!-- 步骤1: 提取文案 -->
                <el-card v-if="currentStep===0">
                    <template #header>步骤1 - 提取文案</template>
                    <el-input v-model="extractForm.url" placeholder="粘贴短视频链接 (抖音/快手/小红书/视频号)" size="large" class="mb-16">
                        <template #append>
                            <el-button type="primary" :loading="extractLoading" @click="doExtract">提取文案</el-button>
                        </template>
                    </el-input>
                    <el-divider>或手动粘贴文案</el-divider>
                    <el-input v-model="scriptData.text" type="textarea" :rows="8" placeholder="在此输入或粘贴文案内容..." />
                    <div class="flex gap-12 mt-16">
                        <el-button @click="scriptData.text=''; extractForm.url=''">清空</el-button>
                        <el-button type="primary" @click="currentStep=1">下一步: AI改写</el-button>
                    </div>
                </el-card>

                <!-- 步骤2: AI改写 -->
                <el-card v-if="currentStep===1">
                    <template #header>步骤2 - AI改写定人设</template>
                    <el-form label-width="120px">
                        <el-form-item label="选择人设">
                            <el-radio-group v-model="rewriteForm.persona">
                                <el-radio-button label="知识博主">知识博主</el-radio-button>
                                <el-radio-button label="带货口播">带货口播</el-radio-button>
                                <el-radio-button label="情感解说">情感解说</el-radio-button>
                                <el-radio-button label="干货科普">干货科普</el-radio-button>
                                <el-radio-button label="自定义人设">自定义</el-radio-button>
                            </el-radio-group>
                        </el-form-item>
                        <el-form-item v-if="rewriteForm.persona==='自定义人设'" label="自定义人设">
                            <el-input v-model="rewriteForm.custom_prompt" placeholder="描述你的自定义人设风格..." />
                        </el-form-item>
                        <el-form-item label="原始文案">
                            <el-input v-model="scriptData.text" type="textarea" :rows="5" />
                        </el-form-item>
                    </el-form>
                    <div class="mb-16">
                        <el-button type="primary" :loading="rewriteLoading" @click="doRewrite">AI 一键改写</el-button>
                    </div>
                    <div v-if="rewriteResult">
                        <el-form label-width="80px">
                            <el-form-item label="标题"><el-input v-model="rewriteResult.title" /></el-form-item>
                            <el-form-item label="正文">
                                <el-input v-model="rewriteResult.content" type="textarea" :rows="8" />
                            </el-form-item>
                            <el-form-item label="标签">
                                <el-tag v-for="t in rewriteResult.tags" :key="t" style="margin-right:8px;">{{ t }}</el-tag>
                            </el-form-item>
                        </el-form>
                    </div>
                    <div class="flex gap-12 mt-16">
                        <el-button @click="currentStep=0">上一步</el-button>
                        <el-button type="primary" @click="currentStep=2" :disabled="!scriptData.text">下一步: 配音配置</el-button>
                    </div>
                </el-card>

                <!-- 步骤3: 声音+数字人 -->
                <el-card v-if="currentStep===2">
                    <template #header>步骤3 - 声音克隆 & 数字人配置</template>
                    <el-row :gutter="20">
                        <el-col :span="12">
                            <h4 style="color:var(--accent);margin-bottom:16px;">选择音色</h4>
                            <div v-for="v in voices" :key="v.id"
                                 style="padding:12px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;cursor:pointer;"
                                 :style="{borderColor: audioForm.voice_id===v.id ? 'var(--accent)' : ''}"
                                 @click="audioForm.voice_id=v.id">
                                <div style="display:flex;justify-content:space-between;align-items:center;">
                                    <span>{{ v.name }}</span>
                                    <el-tag size="small">{{ v.emotion }}</el-tag>
                                </div>
                            </div>
                            <div style="margin-top:12px;">
                                <span style="color:var(--text-sub);font-size:13px;">语速</span>
                                <el-slider v-model="audioForm.speed" :min="0.5" :max="2" :step="0.1" />
                            </div>
                        </el-col>
                        <el-col :span="12">
                            <h4 style="color:var(--accent);margin-bottom:16px;">选择数字人</h4>
                            <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
                                <div v-for="a in avatars" :key="a.id"
                                     style="padding:12px;border:1px solid var(--border);border-radius:8px;cursor:pointer;text-align:center;"
                                     :style="{borderColor: videoForm.avatar_id===a.id ? 'var(--accent)' : ''}"
                                     @click="videoForm.avatar_id=a.id">
                                    <div style="width:60px;height:60px;background:var(--bg-input);border-radius:8px;margin:0 auto 8px;display:flex;align-items:center;justify-content:center;font-size:24px;">🧑</div>
                                    <div style="font-size:12px;">{{ a.name }}</div>
                                    <el-tag v-if="a.type==='custom'" size="small" type="warning">自定义</el-tag>
                                </div>
                            </div>
                        </el-col>
                    </el-row>
                    <div class="flex gap-12 mt-16">
                        <el-button @click="currentStep=1">上一步</el-button>
                        <el-button type="primary" @click="doGenerateAudio" :loading="audioLoading">生成口播音频</el-button>
                        <el-button type="primary" @click="currentStep=3" :disabled="!audioForm.voice_id">下一步: 视频合成</el-button>
                    </div>
                </el-card>

                <!-- 步骤4: 剪辑合成 -->
                <el-card v-if="currentStep===3">
                    <template #header>步骤4 - 智能剪辑合成</template>
                    <el-form label-width="140px">
                        <el-form-item label="字幕模板">
                            <el-select v-model="videoForm.subtitle_template" placeholder="选择字幕模板">
                                <el-option label="标准字幕" value="标准字幕" />
                                <el-option label="大字标题" value="大字标题" />
                                <el-option label="底部弹幕" value="底部弹幕" />
                            </el-select>
                        </el-form-item>
                        <el-form-item label="BGM">
                            <el-select v-model="videoForm.bgm_path" placeholder="选择背景音乐" clearable>
                                <el-option label="轻快节奏" value="light" />
                                <el-option label="大气磅礴" value="epic" />
                                <el-option label="温馨抒情" value="warm" />
                                <el-option label="电子科技" value="tech" />
                            </el-select>
                        </el-form-item>
                        <el-form-item label="人声闪避">
                            <el-switch v-model="videoForm.dodge" />
                        </el-form-item>
                        <el-form-item label="分辨率">
                            <el-radio-group v-model="videoForm.resolution">
                                <el-radio-button label="1080p">1080P</el-radio-button>
                                <el-radio-button label="720p">720P</el-radio-button>
                            </el-radio-group>
                        </el-form-item>
                    </el-form>
                    <el-button type="primary" size="large" :loading="videoLoading" @click="doGenerateVideo">
                        提交视频生成任务
                    </el-button>
                    <div v-if="currentTask" style="margin-top:16px;">
                        <el-progress :percentage="currentTask.progress" :status="currentTask.status==='failed'?'exception':currentTask.status==='completed'?'success':''" />
                        <div style="color:var(--text-sub);font-size:13px;margin-top:8px;">{{ taskStatusText }}</div>
                    </div>
                    <div class="flex gap-12 mt-16">
                        <el-button @click="currentStep=2">上一步</el-button>
                        <el-button type="primary" @click="currentStep=4" :disabled="!currentTask || currentTask.status!=='completed'">下一步: 封面发布</el-button>
                    </div>
                </el-card>

                <!-- 步骤5: 封面&发布 -->
                <el-card v-if="currentStep===4">
                    <template #header>步骤5 - 封面生成 & 发布</template>
                    <el-form label-width="120px">
                        <el-form-item label="封面标题">
                            <el-input v-model="coverForm.title" placeholder="输入封面标题文字" />
                        </el-form-item>
                        <el-form-item label="封面模板">
                            <el-radio-group v-model="coverForm.template">
                                <el-radio-button label="科技感封面">科技感</el-radio-button>
                                <el-radio-button label="简约白底">简约白底</el-radio-button>
                                <el-radio-button label="金色质感">金色质感</el-radio-button>
                            </el-radio-group>
                        </el-form-item>
                    </el-form>
                    <el-button type="primary" :loading="coverLoading" @click="doGenerateCover">生成封面</el-button>
                    <div v-if="coverResult" style="margin-top:16px;text-align:center;">
                        <img :src="coverResult.cover_path" style="max-width:100%;border-radius:8px;border:1px solid var(--border);" />
                    </div>
                    <el-divider />
                    <el-button type="success" size="large" @click="router.go('publish-center')">前往发布中心</el-button>
                    <el-button size="large" @click="router.go('task-center')">查看任务</el-button>
                    <el-button @click="resetAll">新建项目</el-button>
                </el-card>
            </div>
        </div>
    </div>
    `,
    setup() {
        const steps = [
            {title:'提取文案', desc:'粘贴链接或手动输入'},
            {title:'AI改写', desc:'定人设一键改写'},
            {title:'配音配置', desc:'声音克隆+数字人'},
            {title:'剪辑合成', desc:'字幕BGM合成'},
            {title:'封面发布', desc:'封面生成+发布'},
        ];
        const currentStep = ref(0);
        const extractForm = reactive({ url: '' });
        const extractLoading = ref(false);
        const scriptData = reactive({ text: '', title: '', tags: [] });
        const rewriteForm = reactive({ persona: '知识博主', custom_prompt: '' });
        const rewriteLoading = ref(false);
        const rewriteResult = ref(null);
        const voices = ref([]);
        const avatars = ref([]);
        const audioForm = reactive({ voice_id: '', speed: 1.0, emotion: 'neutral' });
        const audioLoading = ref(false);
        const videoForm = reactive({ avatar_id: '', subtitle_template: '标准字幕', bgm_path: '', resolution: '1080p', dodge: true });
        const videoLoading = ref(false);
        const currentTask = ref(null);
        const coverForm = reactive({ title: '', template: '科技感封面' });
        const coverLoading = ref(false);
        const coverResult = ref(null);
        let pollTimer = null;

        const taskStatusText = computed(() => {
            if (!currentTask.value) return '';
            const m = {queued:'排队中...', running:'正在处理...', completed:'完成!', failed:'失败: '+currentTask.value.error_msg};
            return m[currentTask.value.status] || '';
        });

        const doExtract = async () => {
            if (!extractForm.url) { ElMessage.warning('请输入链接'); return; }
            extractLoading.value = true;
            try {
                const data = await API.post('/api/ip-agent/extract-text', { url: extractForm.url });
                scriptData.text = data.content;
                scriptData.title = data.title;
                scriptData.tags = data.tags;
                ElMessage.success('文案提取成功');
            } catch(e) {
                ElMessage.warning('链接解析失败，请手动粘贴文案');
            } finally { extractLoading.value = false; }
        };

        const doRewrite = async () => {
            if (!scriptData.text) { ElMessage.warning('请先输入文案'); return; }
            rewriteLoading.value = true;
            try {
                const data = await API.post('/api/ip-agent/rewrite-text', { text: scriptData.text, persona: rewriteForm.persona, custom_prompt: rewriteForm.custom_prompt });
                rewriteResult.value = data;
                scriptData.text = data.content;
                scriptData.title = data.title;
                scriptData.tags = data.tags;
                ElMessage.success('改写完成');
            } catch(e) { ElMessage.error(e.message); }
            finally { rewriteLoading.value = false; }
        };

        const doGenerateAudio = async () => {
            audioLoading.value = true;
            try {
                const data = await API.post('/api/ip-agent/generate-audio', { text: scriptData.text, voice_id: audioForm.voice_id, speed: audioForm.speed, emotion: audioForm.emotion });
                ElMessage.success(`音频生成完成, 时长: ${data.duration.toFixed(1)}秒`);
            } catch(e) { ElMessage.error(e.message); }
            finally { audioLoading.value = false; }
        };

        const doGenerateVideo = async () => {
            videoLoading.value = true;
            try {
                const data = await API.post('/api/ip-agent/generate-video', {
                    text: scriptData.text, voice_id: audioForm.voice_id, avatar_id: videoForm.avatar_id,
                    subtitle_template: videoForm.subtitle_template, bgm_path: videoForm.bgm_path,
                    resolution: videoForm.resolution, dodge: videoForm.dodge
                });
                currentTask.value = { task_id: data.task_id, status: 'queued', progress: 0, error_msg: '' };
                ElMessage.success('任务已提交');
                pollTask(data.task_id);
            } catch(e) { ElMessage.error(e.message); }
            finally { videoLoading.value = false; }
        };

        const pollTask = (taskId) => {
            if (pollTimer) clearInterval(pollTimer);
            pollTimer = setInterval(async () => {
                try {
                    const t = await API.get(`/api/mix-agent/task-progress/${taskId}`);
                    currentTask.value = t;
                    if (t.status === 'completed' || t.status === 'failed') {
                        clearInterval(pollTimer);
                    }
                } catch(e) {}
            }, 2000);
        };

        const doGenerateCover = async () => {
            coverLoading.value = true;
            try {
                const data = await API.post('/api/ip-agent/generate-cover', { title: coverForm.title || scriptData.title, template: coverForm.template });
                coverResult.value = data;
                ElMessage.success('封面生成完成');
            } catch(e) { ElMessage.error(e.message); }
            finally { coverLoading.value = false; }
        };

        const resetAll = () => {
            currentStep.value = 0;
            scriptData.text = '';
            scriptData.title = '';
            rewriteResult.value = null;
            currentTask.value = null;
            coverResult.value = null;
            extractForm.url = '';
        };

        onMounted(async () => {
            try {
                voices.value = await API.get('/api/voice-clone/list');
                avatars.value = await API.get('/api/avatar/list');
            } catch(e) { console.error(e); }
        });

        return { steps, currentStep, extractForm, extractLoading, scriptData, rewriteForm, rewriteLoading, rewriteResult,
                 voices, avatars, audioForm, audioLoading, videoForm, videoLoading, currentTask, taskStatusText,
                 coverForm, coverLoading, coverResult, doExtract, doRewrite, doGenerateAudio, doGenerateVideo,
                 doGenerateCover, resetAll, router };
    }
};

/* ===== Mix Agent ===== */
const MixAgentView = {
    template: `
    <div>
        <el-tabs v-model="activeTab" class="mix-tab-content">
            <el-tab-pane label="一剪媒" name="yijianmei">
                <el-card>
                    <template #header>一套素材批量生成多条差异化视频</template>
                    <el-form label-width="120px">
                        <el-form-item label="素材池">
                            <el-button @click="openMaterialPicker">选择素材</el-button>
                            <span style="margin-left:12px;color:var(--text-sub);">已选 {{ selectedMaterials.length }} 个素材</span>
                        </el-form-item>
                        <el-form-item label="产出数量">
                            <el-input-number v-model="mixForm.output_count" :min="1" :max="50" />
                        </el-form-item>
                        <el-form-item label="分辨率">
                            <el-radio-group v-model="mixForm.resolution">
                                <el-radio-button label="1080p">1080P</el-radio-button>
                                <el-radio-button label="720p">720P</el-radio-button>
                            </el-radio-group>
                        </el-form-item>
                    </el-form>
                </el-card>
            </el-tab-pane>
            <el-tab-pane label="随机混剪" name="random">
                <el-card>
                    <template #header>随机抽取素材自动拼接成片</template>
                    <el-form label-width="120px">
                        <el-form-item label="素材池"><el-button @click="openMaterialPicker">选择素材</el-button><span style="margin-left:12px;color:var(--text-sub);">已选 {{ selectedMaterials.length }} 个</span></el-form-item>
                        <el-form-item label="产出条数"><el-input-number v-model="mixForm.output_count" :min="1" :max="30" /></el-form-item>
                    </el-form>
                </el-card>
            </el-tab-pane>
            <el-tab-pane label="分镜王" name="storyboard">
                <el-card>
                    <template #header>可视化时间线编辑器</template>
                    <div class="timeline-editor">
                        <div class="timeline-track">
                            <div v-for="(c,i) in timelineClips" :key="i" class="timeline-clip">
                                镜头{{ i+1 }} ({{ c.duration }}s)
                            </div>
                            <div class="timeline-clip" style="border-style:dashed;" @click="addClip">+ 添加镜头</div>
                        </div>
                    </div>
                </el-card>
            </el-tab-pane>
            <el-tab-pane label="脚本驱动" name="script">
                <el-card>
                    <template #header>表格分镜脚本 - 台词自动TTS配音</template>
                    <el-table :data="scriptRows" style="width:100%" class="script-table" size="small">
                        <el-table-column label="序号" width="60" type="index" />
                        <el-table-column label="台词" min-width="200">
                            <template #default="{row}"><el-input v-model="row.text" placeholder="输入台词..." size="small" /></template>
                        </el-table-column>
                        <el-table-column label="素材" width="160">
                            <template #default="{row}"><el-button size="small" @click="row.material='已选'">选择</el-button> {{ row.material }}</template>
                        </el-table-column>
                        <el-table-column label="时长" width="100"><template #default="{row}"><el-input-number v-model="row.duration" :min="1" :max="60" size="small" /></template></el-table-column>
                        <el-table-column label="操作" width="80"><template #default="$index"><el-button size="small" type="danger" link @click="scriptRows.splice($index,1)">删除</el-button></template></el-table-column>
                    </el-table>
                    <el-button class="mt-12" @click="scriptRows.push({text:'',material:'',duration:5})">+ 添加行</el-button>
                </el-card>
            </el-tab-pane>
            <el-tab-pane label="口播合成" name="voiceover">
                <el-card>
                    <template #header>上传音频/输入文本 AI自动匹配B-roll</template>
                    <el-form label-width="120px">
                        <el-form-item label="文本内容"><el-input v-model="mixForm.script_data" type="textarea" :rows="5" placeholder="输入口播文本..." /></el-form-item>
                        <el-form-item label="素材池"><el-button @click="openMaterialPicker">选择素材</el-button></el-form-item>
                    </el-form>
                </el-card>
            </el-tab-pane>
            <el-tab-pane label="模板化混剪" name="template">
                <el-card>
                    <template #header>钩子-痛点-卖点-CTA 行业模板</template>
                    <el-form label-width="120px">
                        <el-form-item label="选择模板">
                            <el-select v-model="mixForm.template_id" placeholder="选择模板">
                                <el-option label="钩子-痛点-卖点-CTA" value="tpl_hook" />
                                <el-option label="问题-方案-证明-行动" value="tpl_question" />
                            </el-select>
                        </el-form-item>
                        <el-form-item label="钩子文案"><el-input v-model="templateData.hook" placeholder="黄金3秒钩子..." /></el-form-item>
                        <el-form-item label="痛点文案"><el-input v-model="templateData.pain" placeholder="用户痛点..." /></el-form-item>
                        <el-form-item label="卖点文案"><el-input v-model="templateData.selling" placeholder="产品卖点..." /></el-form-item>
                        <el-form-item label="CTA文案"><el-input v-model="templateData.cta" placeholder="行动号召..." /></el-form-item>
                    </el-form>
                </el-card>
            </el-tab-pane>
        </el-tabs>
        <!-- 通用配置 -->
        <el-card class="mt-16">
            <template #header>通用配置</template>
            <el-form label-width="120px" inline>
                <el-form-item label="BGM">
                    <el-select v-model="mixForm.bgm_path" placeholder="选择背景音乐" clearable style="width:160px;">
                        <el-option label="轻快节奏" value="light" /><el-option label="大气磅礴" value="epic" /><el-option label="温馨抒情" value="warm" /><el-option label="电子科技" value="tech" />
                    </el-select>
                </el-form-item>
                <el-form-item label="字幕模板">
                    <el-select v-model="mixForm.subtitle_template" placeholder="选择字幕" clearable style="width:160px;">
                        <el-option label="标准字幕" value="标准字幕" /><el-option label="大字标题" value="大字标题" /><el-option label="底部弹幕" value="底部弹幕" />
                    </el-select>
                </el-form-item>
                <el-form-item label="产出条数"><el-input-number v-model="mixForm.output_count" :min="1" :max="50" /></el-form-item>
                <el-form-item label="分辨率">
                    <el-radio-group v-model="mixForm.resolution">
                        <el-radio-button label="1080p">1080P</el-radio-button><el-radio-button label="720p">720P</el-radio-button>
                    </el-radio-group>
                </el-form-item>
            </el-form>
        </el-card>
        <div class="mt-16 text-center">
            <el-button type="primary" size="large" :loading="submitLoading" @click="submitMixTask">🚀 启动批量混剪</el-button>
        </div>

        <!-- 素材选择弹窗 -->
        <el-dialog v-model="pickerVisible" title="选择素材" width="80%">
            <div v-if="materials.length===0" style="text-align:center;padding:40px;">
                <el-empty description="素材库为空，请先上传素材" />
                <el-button type="primary" @click="pickerVisible=false; router.go('material-lib')">前往素材库</el-button>
            </div>
            <div v-else class="material-grid">
                <div v-for="m in materials" :key="m.id" class="material-card"
                     :class="{selected: selectedMaterials.includes(m.id)}" @click="toggleMaterial(m.id)">
                    <div class="material-thumb">
                        <span v-if="m.type==='video'">🎬</span><span v-else-if="m.type==='image'">🖼️</span><span v-else>🎵</span>
                        <span class="play-icon">+</span>
                    </div>
                    <div class="material-info"><div class="material-name">{{ m.name }}</div><div class="material-meta">{{ m.type }} · {{ (m.size/1024/1024).toFixed(1) }}MB</div></div>
                </div>
            </div>
        </el-dialog>
    </div>
    `,
    setup() {
        const activeTab = ref('yijianmei');
        const mixForm = reactive({ mix_mode: 'yijianmei', output_count: 3, resolution: '1080p', bgm_path: '', subtitle_template: '', material_ids: [], template_id: '', script_data: '' });
        const selectedMaterials = ref([]);
        const pickerVisible = ref(false);
        const materials = ref([]);
        const timelineClips = ref([{duration:5},{duration:3},{duration:4}]);
        const scriptRows = ref([{text:'',material:'',duration:5}]);
        const templateData = reactive({hook:'',pain:'',selling:'',cta:''});
        const submitLoading = ref(false);

        const tabModeMap = {yijianmei:'一剪媒',random:'随机混剪',storyboard:'分镜王',script:'脚本驱动',voiceover:'口播合成',template:'模板化混剪'};

        watch(activeTab, (v) => { mixForm.mix_mode = v; });

        const openMaterialPicker = async () => {
            pickerVisible.value = true;
            try { const data = await API.get('/api/material/list?page=1&page_size=100'); materials.value = data.items; } catch(e) {}
        };
        const toggleMaterial = (id) => {
            const idx = selectedMaterials.value.indexOf(id);
            if (idx >= 0) selectedMaterials.value.splice(idx, 1);
            else selectedMaterials.value.push(id);
        };
        const addClip = () => timelineClips.value.push({duration:5});
        const submitMixTask = async () => {
            if (activeTab.value !== 'storyboard' && activeTab.value !== 'script' && selectedMaterials.value.length === 0) {
                ElMessage.warning('请先选择素材'); return;
            }
            mixForm.material_ids = selectedMaterials.value;
            mixForm.script_data = JSON.stringify(scriptRows.value);
            if (activeTab.value === 'template') mixForm.script_data = JSON.stringify(templateData);
            submitLoading.value = true;
            try {
                const data = await API.post('/api/mix-agent/create-mix-task', mixForm);
                ElMessage.success(`混剪任务已提交 (ID: ${data.task_id.substring(0,8)}...)`);
                router.go('task-center');
            } catch(e) { ElMessage.error(e.message); }
            finally { submitLoading.value = false; }
        };

        return { activeTab, mixForm, selectedMaterials, pickerVisible, materials, timelineClips, scriptRows, templateData, submitLoading,
                 openMaterialPicker, toggleMaterial, addClip, submitMixTask, router };
    }
};

/* ===== Material Library ===== */
const MaterialLibView = {
    template: `
    <div>
        <el-row :gutter="16">
            <el-col :xs="24" :sm="6" :md="5">
                <div class="folder-tree">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                        <span style="color:var(--accent);font-weight:600;">文件夹</span>
                        <el-button size="small" link @click="newFolderVisible=true">+ 新建</el-button>
                    </div>
                    <div class="folder-item" :class="{active:!currentFolder}" @click="currentFolder=null">全部素材</div>
                    <div v-for="f in folders" :key="f.id" class="folder-item" :class="{active:currentFolder===f.id}" @click="currentFolder=f.id">
                        📁 {{ f.name }}
                    </div>
                </div>
            </el-col>
            <el-col :xs="24" :sm="18" :md="19">
                <el-card>
                    <template #header>
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <span>素材库</span>
                            <div class="flex gap-12">
                                <el-input v-model="searchKeyword" placeholder="搜索素材..." size="small" style="width:160px;" clearable @clear="loadMaterials" @keyup.enter="loadMaterials" />
                                <el-button size="small" @click="uploadVisible=true">本地上传</el-button>
                                <el-button size="small" @click="webSearchVisible=true">全网搜索</el-button>
                            </div>
                        </div>
                    </template>
                    <div v-if="materials.length===0" style="padding:40px;"><el-empty description="暂无素材" /></div>
                    <div v-else class="material-grid">
                        <div v-for="m in materials" :key="m.id" class="material-card" @contextmenu.prevent="showMaterialMenu(m)">
                            <div class="material-thumb">
                                <span v-if="m.type==='video'" style="font-size:32px;">🎬</span>
                                <span v-else-if="m.type==='image'" style="font-size:32px;">🖼️</span>
                                <span v-else style="font-size:32px;">🎵</span>
                            </div>
                            <div class="material-info">
                                <div class="material-name">{{ m.name }}</div>
                                <div class="material-meta">{{ m.type }} · {{ formatSize(m.size) }}<span v-if="m.duration"> · {{ m.duration.toFixed(1) }}s</span></div>
                                <div v-if="m.tags && m.tags.length" style="margin-top:4px;">
                                    <el-tag v-for="t in (typeof m.tags==='string'?JSON.parse(m.tags):m.tags)" :key="t" size="small" style="margin-right:4px;">{{ t }}</el-tag>
                                </div>
                            </div>
                        </div>
                    </div>
                </el-card>
            </el-col>
        </el-row>

        <!-- 上传弹窗 -->
        <el-dialog v-model="uploadVisible" title="批量本地上传" width="500px">
            <el-upload drag multiple :auto-upload="false" :on-change="onFileChange" :file-list="uploadFiles" accept="video/*,image/*,audio/*">
                <el-icon style="font-size:48px;color:var(--text-sub);"><Upload /></el-icon>
                <div style="margin-top:8px;color:var(--text-sub);">拖拽文件到此处或点击上传</div>
                <template #tip><div style="color:var(--text-sub);font-size:12px;">支持视频/图片/音频，分片断点续传</div></template>
            </el-upload>
            <div v-if="uploadFiles.length" style="margin-top:12px;">
                <el-progress v-if="uploading" :percentage="uploadProgress" />
            </div>
            <template #footer>
                <el-button @click="uploadVisible=false">取消</el-button>
                <el-button type="primary" :loading="uploading" @click="doUpload">开始上传</el-button>
            </template>
        </el-dialog>

        <!-- 全网搜索弹窗 -->
        <el-dialog v-model="webSearchVisible" title="全网素材搜索" width="80%">
            <div class="copyright-notice mb-16">
                <el-icon><WarningFilled /></el-icon>
                素材仅供创意参考，商用请获取版权方授权
            </div>
            <div class="flex gap-12 mb-16">
                <el-input v-model="searchForm.keyword" placeholder="输入关键词搜索素材..." @keyup.enter="doWebSearch" />
                <el-select v-model="searchForm.type" style="width:120px;">
                    <el-option label="视频" value="video" /><el-option label="图片" value="image" /><el-option label="音频" value="audio" />
                </el-select>
                <el-button type="primary" @click="doWebSearch">搜索</el-button>
            </div>
            <div v-if="webResults.length" class="material-grid">
                <div v-for="r in webResults" :key="r.id" class="material-card">
                    <div class="material-thumb"><span style="font-size:32px;">{{ r.type==='video'?'🎬':r.type==='image'?'🖼️':'🎵' }}</span></div>
                    <div class="material-info">
                        <div class="material-name">{{ r.title }}</div>
                        <div class="material-meta">{{ r.source }} · {{ r.size }}</div>
                        <el-button size="small" type="primary" link @click="saveWebMaterial(r)">保存到素材库</el-button>
                    </div>
                </div>
            </div>
        </el-dialog>

        <!-- 新建文件夹 -->
        <el-dialog v-model="newFolderVisible" title="新建文件夹" width="400px">
            <el-input v-model="newFolderName" placeholder="文件夹名称" />
            <template #footer><el-button @click="newFolderVisible=false">取消</el-button><el-button type="primary" @click="createFolder">创建</el-button></template>
        </el-dialog>
    </div>
    `,
    setup() {
        const materials = ref([]);
        const folders = ref([]);
        const currentFolder = ref(null);
        const searchKeyword = ref('');
        const uploadVisible = ref(false);
        const uploadFiles = ref([]);
        const uploading = ref(false);
        const uploadProgress = ref(0);
        const webSearchVisible = ref(false);
        const searchForm = reactive({ keyword: '', type: 'video' });
        const webResults = ref([]);
        const newFolderVisible = ref(false);
        const newFolderName = ref('');

        const formatSize = (bytes) => { if (!bytes) return '0B'; const u=['B','KB','MB','GB']; const i=Math.floor(Math.log(bytes)/Math.log(1024)); return (bytes/Math.pow(1024,i)).toFixed(1)+u[i]; };

        const loadMaterials = async () => {
            try {
                let url = `/api/material/list?page=1&page_size=100`;
                if (currentFolder.value) url += `&folder_id=${currentFolder.value}`;
                if (searchKeyword.value) url += `&keyword=${encodeURIComponent(searchKeyword.value)}`;
                const data = await API.get(url);
                materials.value = data.items;
                folders.value = data.folders;
            } catch(e) { console.error(e); }
        };

        const onFileChange = (file, fileList) => { uploadFiles.value = fileList; };

        const doUpload = async () => {
            if (uploadFiles.value.length === 0) { ElMessage.warning('请选择文件'); return; }
            uploading.value = true;
            uploadProgress.value = 0;
            for (let i = 0; i < uploadFiles.value.length; i++) {
                const f = uploadFiles.value[i];
                const chunkSize = 1024 * 1024;
                const totalChunks = Math.ceil(f.size / chunkSize);
                const fileType = f.raw.type.startsWith('video') ? 'video' : f.raw.type.startsWith('image') ? 'image' : 'audio';
                for (let c = 0; c < totalChunks; c++) {
                    const chunk = f.raw.slice(c * chunkSize, (c + 1) * chunkSize);
                    const fd = new FormData();
                    fd.append('file', chunk);
                    fd.append('chunkIndex', c);
                    fd.append('totalChunks', totalChunks);
                    fd.append('fileName', f.name);
                    await API.upload('/api/material/upload-chunk', fd);
                }
                const mergeFd = new FormData();
                mergeFd.append('fileName', f.name);
                mergeFd.append('totalChunks', String(totalChunks));
                mergeFd.append('fileType', fileType);
                mergeFd.append('folderId', currentFolder.value || '');
                await API.upload('/api/material/merge-chunk', mergeFd);
                uploadProgress.value = Math.round((i + 1) / uploadFiles.value.length * 100);
            }
            uploading.value = false;
            uploadVisible.value = false;
            uploadFiles.value = [];
            ElMessage.success('上传完成');
            loadMaterials();
        };

        const doWebSearch = async () => {
            if (!searchForm.keyword) { ElMessage.warning('请输入关键词'); return; }
            try {
                const data = await API.post('/api/material/web-search', searchForm);
                webResults.value = data.items;
            } catch(e) { ElMessage.error(e.message); }
        };

        const saveWebMaterial = async (r) => {
            try {
                await API.post('/api/material/save-web-material', { name: r.title, type: r.type, url: r.id });
                ElMessage.success('已提交下载任务');
            } catch(e) { ElMessage.error(e.message); }
        };

        const createFolder = async () => {
            if (!newFolderName.value) { ElMessage.warning('请输入名称'); return; }
            try {
                await API.post('/api/material/folder/create', { name: newFolderName.value, parent_id: currentFolder.value || '' });
                ElMessage.success('创建成功');
                newFolderVisible.value = false;
                newFolderName.value = '';
                loadMaterials();
            } catch(e) { ElMessage.error(e.message); }
        };

        const showMaterialMenu = (m) => {
            ElMessageBox.confirm(`删除素材 "${m.name}"?`, '确认', { type: 'warning' }).then(async () => {
                await API.del(`/api/material/${m.id}`);
                ElMessage.success('已删除');
                loadMaterials();
            }).catch(() => {});
        };

        watch(currentFolder, loadMaterials);
        onMounted(loadMaterials);

        return { materials, folders, currentFolder, searchKeyword, uploadVisible, uploadFiles, uploading, uploadProgress,
                 webSearchVisible, searchForm, webResults, newFolderVisible, newFolderName,
                 formatSize, loadMaterials, onFileChange, doUpload, doWebSearch, saveWebMaterial,
                 createFolder, showMaterialMenu, router };
    }
};

/* ===== Voice Clone ===== */
const VoiceCloneView = {
    template: `
    <div>
        <el-card class="mb-16">
            <template #header>声音克隆管理中心</template>
            <div class="copyright-notice mb-16"><el-icon><WarningFilled /></el-icon>仅允许克隆本人语音，禁止克隆他人声音</div>
            <el-button type="primary" @click="createVisible=true">+ 新建克隆任务</el-button>
        </el-card>
        <el-row :gutter="16">
            <el-col :xs="24" :sm="8" :md="6" v-for="v in voices" :key="v.id">
                <el-card class="mb-16">
                    <div style="text-align:center;padding:16px 0;">
                        <div style="font-size:48px;">🎤</div>
                        <div style="font-size:16px;font-weight:600;margin-top:8px;">{{ v.name }}</div>
                        <el-tag size="small" style="margin-top:8px;">{{ v.emotion }}</el-tag>
                        <el-tag v-if="v.status==='ready'" size="small" type="success" style="margin-top:4px;">就绪</el-tag>
                    </div>
                    <div class="flex gap-8" style="margin-top:12px;">
                        <el-button size="small" style="flex:1;">试听</el-button>
                        <el-button size="small" type="danger" style="flex:1;" @click="del(v.id)">删除</el-button>
                    </div>
                </el-card>
            </el-col>
        </el-row>
        <el-dialog v-model="createVisible" title="新建声音克隆" width="450px">
            <el-form label-width="100px">
                <el-form-item label="音色名称"><el-input v-model="form.name" placeholder="如: 我的男声" /></el-form-item>
                <el-form-item label="音频样本">
                    <el-upload :auto-upload="false" :on-change="(f)=>form.sample=f" accept="audio/*" :limit="1">
                        <el-button>选择音频文件</el-button>
                    </el-upload>
                </el-form-item>
            </el-form>
            <template #footer><el-button @click="createVisible=false">取消</el-button><el-button type="primary" :loading="loading" @click="create">创建</el-button></template>
        </el-dialog>
    </div>
    `,
    setup() {
        const voices = ref([]);
        const createVisible = ref(false);
        const form = reactive({ name: '', sample: null });
        const loading = ref(false);
        const load = async () => { voices.value = await API.get('/api/voice-clone/list'); };
        const create = async () => {
            loading.value = true;
            try {
                await API.post('/api/voice-clone/create', { name: form.name, sample_path: form.sample ? form.sample.name : '' });
                ElMessage.success('克隆任务已提交');
                createVisible.value = false; form.name = ''; form.sample = null;
                load();
            } catch(e) { ElMessage.error(e.message); } finally { loading.value = false; }
        };
        const del = async (id) => { await API.del(`/api/voice-clone/${id}`); ElMessage.success('已删除'); load(); };
        onMounted(load);
        return { voices, createVisible, form, loading, create, del };
    }
};

/* ===== Avatar Manage ===== */
const AvatarManageView = {
    template: `
    <div>
        <el-card class="mb-16"><template #header>数字人形象资产管理</template>
            <div class="copyright-notice mb-16"><el-icon><WarningFilled /></el-icon>禁止生成伪造人物虚假内容，遵守网络内容规范</div>
            <el-upload :show-file-list="false" :before-upload="uploadAvatar" accept="image/*">
                <el-button type="primary">+ 上传自定义形象</el-button>
            </el-upload>
        </el-card>
        <el-row :gutter="16">
            <el-col :xs="12" :sm="8" :md="6" v-for="a in avatars" :key="a.id">
                <el-card class="mb-16">
                    <div style="text-align:center;padding:16px 0;">
                        <div style="width:80px;height:80px;background:var(--bg-input);border-radius:50%;margin:0 auto;display:flex;align-items:center;justify-content:center;font-size:36px;">🧑</div>
                        <div style="margin-top:8px;font-weight:600;">{{ a.name }}</div>
                        <el-tag v-if="a.type==='preset'" size="small">内置</el-tag>
                        <el-tag v-else size="small" type="warning">自定义</el-tag>
                    </div>
                    <el-button size="small" type="danger" style="width:100%;" @click="del(a.id)">删除</el-button>
                </el-card>
            </el-col>
        </el-row>
    </div>
    `,
    setup() {
        const avatars = ref([]);
        const load = async () => { avatars.value = await API.get('/api/avatar/list'); };
        const uploadAvatar = async (file) => {
            const fd = new FormData();
            fd.append('name', file.name.replace(/\.[^.]+$/, ''));
            fd.append('file', file);
            try {
                await API.upload('/api/avatar/upload-custom', fd);
                ElMessage.success('训练任务已提交');
                load();
            } catch(e) { ElMessage.error(e.message); }
            return false;
        };
        const del = async (id) => { await API.del(`/api/avatar/${id}`); ElMessage.success('已删除'); load(); };
        onMounted(load);
        return { avatars, uploadAvatar, del };
    }
};

/* ===== Matrix Account ===== */
const MatrixAccountView = {
    template: `
    <div>
        <el-card class="mb-16"><template #header>矩阵账号管理</template>
            <div class="flex gap-12">
                <el-button type="primary" @click="dialogVisible=true; editForm={platform:'抖音',account_name:'',credentials:'',group_name:''}">+ 添加账号</el-button>
            </div>
        </el-card>
        <el-table :data="accounts" style="width:100%" size="default">
            <el-table-column prop="platform" label="平台" width="100"><template #default="{row}"><el-tag>{{ row.platform }}</el-tag></template></el-table-column>
            <el-table-column prop="account_name" label="账号名称" />
            <el-table-column prop="group_name" label="分组" width="120" />
            <el-table-column prop="status" label="状态" width="100"><template #default="{row}"><el-tag :type="row.status==='connected'?'success':row.status==='failed'?'danger':'info'" size="small">{{ row.status }}</el-tag></template></el-table-column>
            <el-table-column prop="created_at" label="添加时间" width="180" />
            <el-table-column label="操作" width="200">
                <template #default="{row}">
                    <el-button size="small" @click="testConnect(row.id)">连通测试</el-button>
                    <el-button size="small" type="danger" @click="del(row.id)">删除</el-button>
                </template>
            </el-table-column>
        </el-table>
        <el-dialog v-model="dialogVisible" title="添加矩阵账号" width="450px">
            <el-form label-width="100px">
                <el-form-item label="平台"><el-select v-model="editForm.platform"><el-option label="抖音" value="抖音" /><el-option label="快手" value="快手" /><el-option label="小红书" value="小红书" /><el-option label="视频号" value="视频号" /></el-select></el-form-item>
                <el-form-item label="账号名称"><el-input v-model="editForm.account_name" /></el-form-item>
                <el-form-item label="分组"><el-input v-model="editForm.group_name" placeholder="如: 美妆矩阵" /></el-form-item>
                <el-form-item label="凭证信息"><el-input v-model="editForm.credentials" type="textarea" :rows="3" placeholder="开发者凭证/Cookie等" /></el-form-item>
            </el-form>
            <template #footer><el-button @click="dialogVisible=false">取消</el-button><el-button type="primary" @click="addAccount">添加</el-button></template>
        </el-dialog>
    </div>
    `,
    setup() {
        const accounts = ref([]);
        const dialogVisible = ref(false);
        const editForm = reactive({});
        const load = async () => { accounts.value = await API.get('/api/matrix-account/list'); };
        const addAccount = async () => {
            try { await API.post('/api/matrix-account/add', editForm); ElMessage.success('添加成功'); dialogVisible.value = false; load(); } catch(e) { ElMessage.error(e.message); }
        };
        const testConnect = async (id) => { try { const r = await API.post(`/api/matrix-account/test-connect/${id}`); ElMessage[r.connected?'success':'error'](`${r.platform} ${r.account}: ${r.connected?'连接成功':'连接失败'}`); load(); } catch(e) { ElMessage.error(e.message); } };
        const del = async (id) => { await API.del(`/api/matrix-account/${id}`); ElMessage.success('已删除'); load(); };
        onMounted(load);
        return { accounts, dialogVisible, editForm, addAccount, testConnect, del };
    }
};

/* ===== Template Center ===== */
const TemplateCenterView = {
    template: `
    <div>
        <el-card class="mb-16"><template #header>模板中心</template>
            <el-button type="primary" @click="dialogVisible=true; editForm={name:'',category:'cover',config:'{}'}">+ 保存自定义模板</el-button>
        </el-card>
        <el-tabs v-model="activeCat">
            <el-tab-pane label="封面模板" name="cover" />
            <el-tab-pane label="字幕模板" name="subtitle" />
            <el-tab-pane label="混剪脚本模板" name="mix_script" />
        </el-tabs>
        <el-row :gutter="16">
            <el-col :xs="12" :sm="8" :md="6" v-for="t in filteredTemplates" :key="t.id">
                <el-card class="mb-16" style="cursor:pointer;" @click="useTemplate(t)">
                    <div style="text-align:center;padding:16px;">
                        <div style="font-size:36px;">{{ t.category==='cover'?'🖼️':t.category==='subtitle'?'📝':'🎬' }}</div>
                        <div style="font-weight:600;margin-top:8px;">{{ t.name }}</div>
                        <el-tag v-if="t.is_custom" size="small" type="warning" style="margin-top:4px;">自定义</el-tag>
                    </div>
                </el-card>
            </el-col>
        </el-row>
        <el-dialog v-model="dialogVisible" title="保存自定义模板" width="450px">
            <el-form label-width="100px">
                <el-form-item label="模板名称"><el-input v-model="editForm.name" /></el-form-item>
                <el-form-item label="分类"><el-select v-model="editForm.category"><el-option label="封面" value="cover" /><el-option label="字幕" value="subtitle" /><el-option label="混剪脚本" value="mix_script" /></el-select></el-form-item>
                <el-form-item label="配置JSON"><el-input v-model="editForm.config" type="textarea" :rows="4" /></el-form-item>
            </el-form>
            <template #footer><el-button @click="dialogVisible=false">取消</el-button><el-button type="primary" @click="save">保存</el-button></template>
        </el-dialog>
    </div>
    `,
    setup() {
        const templates = ref([]);
        const activeCat = ref('cover');
        const dialogVisible = ref(false);
        const editForm = reactive({});
        const filteredTemplates = computed(() => templates.value.filter(t => t.category === activeCat.value));
        const load = async () => { templates.value = await API.get('/api/template/list'); };
        const save = async () => { try { await API.post('/api/template/save-custom', editForm); ElMessage.success('保存成功'); dialogVisible.value = false; load(); } catch(e) { ElMessage.error(e.message); } };
        const useTemplate = (t) => { ElMessage.success(`已选择模板: ${t.name}`); };
        onMounted(load);
        return { templates, activeCat, filteredTemplates, dialogVisible, editForm, save, useTemplate };
    }
};

/* ===== Task Center ===== */
const TaskCenterView = {
    template: `
    <div>
        <el-card class="mb-16">
            <template #header>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span>全局任务中心</span>
                    <div class="flex gap-12">
                        <el-select v-model="filterType" placeholder="任务类型" clearable size="small" style="width:140px;">
                            <el-option label="IP口播视频" value="ip_video_generate" /><el-option label="批量混剪" value="mix_batch_generate" /><el-option label="声音克隆" value="voice_clone_task" /><el-option label="数字人训练" value="avatar_train_task" /><el-option label="素材下载" value="web_material_download" /><el-option label="平台发布" value="platform_publish_task" />
                        </el-select>
                        <el-select v-model="filterStatus" placeholder="状态" clearable size="small" style="width:100px;">
                            <el-option label="排队中" value="queued" /><el-option label="运行中" value="running" /><el-option label="已完成" value="completed" /><el-option label="已失败" value="failed" />
                        </el-select>
                        <el-button size="small" @click="loadTasks">刷新</el-button>
                    </div>
                </div>
            </template>
            <el-table :data="tasks" style="width:100%" size="small">
                <el-table-column prop="task_type" label="类型" width="130"><template #default="{row}">{{ typeMap[row.task_type]||row.task_type }}</template></el-table-column>
                <el-table-column prop="status" label="状态" width="90"><template #default="{row}"><el-tag :type="statusType(row.status)" size="small">{{ statusMap[row.status] }}</el-tag></template></el-table-column>
                <el-table-column prop="progress" label="进度" width="150"><template #default="{row}"><el-progress :percentage="row.progress" :stroke-width="8" :status="row.status==='failed'?'exception':row.status==='completed'?'success':''" /></template></el-table-column>
                <el-table-column prop="created_at" label="创建时间" width="180" />
                <el-table-column prop="finished_at" label="完成时间" width="180" />
                <el-table-column label="操作" width="220">
                    <template #default="{row}">
                        <el-button size="small" link @click="showLog(row)">日志</el-button>
                        <el-button v-if="row.status==='failed'" size="small" link type="warning" @click="retry(row.task_id)">重试</el-button>
                        <el-button v-if="row.status==='completed'" size="small" link type="success" @click="download(row)">下载</el-button>
                        <el-button size="small" link type="danger" @click="delTask(row.task_id)">删除</el-button>
                    </template>
                </el-table-column>
            </el-table>
            <div style="margin-top:16px;text-align:right;">
                <el-pagination v-model:current-page="page" :page-size="20" :total="total" layout="prev, pager, next" @current-change="loadTasks" />
            </div>
        </el-card>
        <el-dialog v-model="logVisible" title="任务日志" width="700px">
            <pre style="background:var(--bg-input);padding:16px;border-radius:8px;overflow:auto;color:var(--text-main);font-size:13px;max-height:400px;white-space:pre-wrap;">{{ currentLog }}</pre>
        </el-dialog>
    </div>
    `,
    setup() {
        const tasks = ref([]);
        const total = ref(0);
        const page = ref(1);
        const filterType = ref('');
        const filterStatus = ref('');
        const logVisible = ref(false);
        const currentLog = ref('');
        const typeMap = {ip_video_generate:'IP口播视频',mix_batch_generate:'批量混剪',voice_clone_task:'声音克隆',avatar_train_task:'数字人训练',web_material_download:'素材下载',platform_publish_task:'平台发布'};
        const statusMap = {queued:'排队中',running:'运行中',completed:'已完成',failed:'已失败'};
        const statusType = (s) => ({queued:'info',running:'warning',completed:'success',failed:'danger'}[s]||'info');
        const loadTasks = async () => {
            let url = `/api/task/list?page=${page.value}&page_size=20`;
            if (filterType.value) url += `&task_type=${filterType.value}`;
            if (filterStatus.value) url += `&status=${filterStatus.value}`;
            const data = await API.get(url);
            tasks.value = data.items; total.value = data.total;
        };
        const showLog = async (row) => { const data = await API.get(`/api/task/${row.task_id}/log`); currentLog.value = data.log; logVisible.value = true; };
        const retry = async (id) => { await API.post(`/api/task/${id}/retry`); ElMessage.success('已重新提交'); loadTasks(); };
        const download = (row) => { const files = JSON.parse(row.output_files||'[]'); if (files[0]) window.open(files[0], '_blank'); };
        const delTask = async (id) => { ElMessageBox.confirm('确认删除此任务?', '确认', {type:'warning'}).then(async () => { /* TODO: no delete API, just reload */ ElMessage.info('任务已记录'); }); };
        watch([filterType, filterStatus], loadTasks);
        onMounted(loadTasks);
        return { tasks, total, page, filterType, filterStatus, logVisible, currentLog, typeMap, statusMap, statusType, loadTasks, showLog, retry, download, delTask };
    }
};

/* ===== Publish Center ===== */
const PublishCenterView = {
    template: `
    <div>
        <el-card class="mb-16"><template #header>多平台发布中心</template>
            <el-form label-width="100px">
                <el-form-item label="视频文件"><el-input v-model="form.video_path" placeholder="视频文件路径" /></el-form-item>
                <el-form-item label="标题"><el-input v-model="form.title" placeholder="发布标题" /></el-form-item>
                <el-form-item label="话题标签"><el-input v-model="form.tags" placeholder="如: #干货 #热门" /></el-form-item>
                <el-form-item label="封面"><el-input v-model="form.cover_path" placeholder="封面路径" /></el-form-item>
                <el-form-item label="选择账号">
                    <el-checkbox-group v-model="form.account_ids">
                        <el-checkbox v-for="a in accounts" :key="a.id" :label="a.id">{{ a.platform }} - {{ a.account_name }}</el-checkbox>
                    </el-checkbox-group>
                </el-form-item>
            </el-form>
            <el-button type="success" size="large" :loading="loading" @click="submit">提交发布任务</el-button>
        </el-card>
    </div>
    `,
    setup() {
        const form = reactive({ video_path:'', title:'', tags:'', cover_path:'', account_ids:[] });
        const accounts = ref([]);
        const loading = ref(false);
        const submit = async () => {
            if (!form.title || form.account_ids.length===0) { ElMessage.warning('请填写标题并选择账号'); return; }
            loading.value = true;
            try { await API.post('/api/publish/create-publish-task', form); ElMessage.success('发布任务已提交'); router.go('task-center'); } catch(e) { ElMessage.error(e.message); } finally { loading.value = false; }
        };
        onMounted(async () => { accounts.value = await API.get('/api/matrix-account/list'); });
        return { form, accounts, loading, submit, router };
    }
};

/* ===== Settings ===== */
const SettingView = {
    template: `
    <div>
        <el-tabs v-model="activeTab">
            <el-tab-pane label="存储设置" name="storage">
                <el-card><el-form label-width="180px">
                    <el-form-item label="素材存储路径"><el-input v-model="settings.storage_path" style="width:400px;" /></el-form-item>
                </el-form></el-card>
            </el-tab-pane>
            <el-tab-pane label="API密钥配置" name="api">
                <el-card><el-form label-width="180px">
                    <el-form-item label="大模型提供商"><el-select v-model="settings.llm_provider"><el-option label="OpenAI" value="openai" /><el-option label="百度千帆" value="qianfan" /></el-select></el-form-item>
                    <el-form-item label="大模型 API Key"><el-input v-model="settings.api_key_llm" type="password" show-password style="width:400px;" placeholder="sk-..." /></el-form-item>
                    <el-form-item label="TTS提供商"><el-select v-model="settings.tts_provider"><el-option label="百度" value="baidu" /><el-option label="OpenAI" value="openai" /></el-select></el-form-item>
                    <el-form-item label="TTS API Key"><el-input v-model="settings.api_key_tts" type="password" show-password style="width:400px;" /></el-form-item>
                    <el-form-item label="数字人 API Key"><el-input v-model="settings.api_key_digital_human" type="password" show-password style="width:400px;" /></el-form-item>
                    <el-form-item><el-button type="primary" @click="saveSettings">保存配置</el-button></el-form-item>
                </el-form>
                <div class="copyright-notice mt-16"><el-icon><InfoFilled /></el-icon>密钥仅存储在本地数据库，不会上传。未配置时走本地模拟模式。</div>
                </el-card>
            </el-tab-pane>
            <el-tab-pane label="任务队列" name="queue">
                <el-card><el-form label-width="180px">
                    <el-form-item label="最大并发任务数"><el-input-number v-model="settings.max_concurrent_tasks" :min="1" :max="10" /></el-form-item>
                    <el-form-item label="默认分辨率"><el-select v-model="settings.default_resolution"><el-option label="1080P" value="1080p" /><el-option label="720P" value="720p" /></el-select></el-form-item>
                    <el-form-item label="默认帧率"><el-input v-model="settings.default_fps" style="width:100px;" /></el-form-item>
                    <el-form-item><el-button type="primary" @click="saveSettings">保存</el-button></el-form-item>
                </el-form></el-card>
            </el-tab-pane>
            <el-tab-pane label="部署指引" name="deploy">
                <el-card>
                    <div class="help-block"><h4>方案A: Render 免费云部署</h4><p>1. 推送代码到 GitHub</p><p>2. 在 Render 创建 Web Service</p><p>3. 选择仓库, 配置 <code>render.yaml</code></p><p>4. 启动命令: <code>cd backend && pip install -r requirements.txt && python main.py</code></p></div>
                    <div class="help-block"><h4>方案B: Ngrok 内网穿透</h4><p>1. 运行 <code>start.bat</code> 启动本地服务</p><p>2. 运行 <code>ngrok http 8080</code></p><p>3. 复制 ngrok 公网地址访问</p></div>
                </el-card>
            </el-tab-pane>
        </el-tabs>
    </div>
    `,
    setup() {
        const activeTab = ref('api');
        const settings = reactive({});
        const load = async () => { const data = await API.get('/api/setting/list'); Object.assign(settings, data); };
        const saveSettings = async () => {
            for (const [k,v] of Object.entries(settings)) {
                await API.post('/api/setting/update', { key:k, value:String(v) });
            }
            ElMessage.success('配置已保存');
        };
        onMounted(load);
        return { activeTab, settings, saveSettings };
    }
};

/* ===== Help ===== */
const HelpView = {
    template: `
    <div>
        <el-card>
            <template #header>帮助文档 FAQ</template>
            <div class="help-block"><h4>1. 快速开始</h4><p>使用 demo 账号登录后，在系统设置填入外部 AI API 密钥即可使用全部功能。</p></div>
            <div class="help-block"><h4>2. IP口播智能体</h4><p>五步成片：提取文案 → AI改写 → 配音数字人 → 剪辑合成 → 封面发布</p></div>
            <div class="help-block"><h4>3. 超级混剪矩阵</h4><p>六种模式：一剪媒、随机混剪、分镜王、脚本驱动、口播合成、模板化混剪</p></div>
            <div class="help-block"><h4>4. 素材管理</h4><p>支持本地批量上传（分片断点续传）和全网素材搜索下载</p></div>
            <div class="help-block"><h4>5. 任务系统</h4><p>所有生成任务异步执行，支持进度查看、失败重试、日志导出</p></div>
            <div class="help-block"><h4>6. 矩阵发布</h4><p>添加各平台账号凭证后，可批量分发视频到抖音/快手/小红书/视频号</p></div>
            <div class="help-block"><h4>7. 版权声明</h4><p>全网搜索素材仅供创意参考，商用请获取版权方授权。声音克隆仅限本人语音。</p></div>
        </el-card>
    </div>
    `
};

/* ===== 主布局 ===== */
const AppLayout = {
    template: `
    <div class="app-layout">
        <!-- 侧边栏 -->
        <div class="sidebar" :class="{collapsed: store.sidebarCollapsed, 'mobile-open': store.mobileMenuOpen}">
            <div class="sidebar-logo">
                <div class="logo-icon">TM</div>
                <span v-if="!store.sidebarCollapsed" class="logo-text">时光机工作台</span>
            </div>
            <el-menu :default-active="router.current.value" @select="handleMenuSelect" :collapse="store.sidebarCollapsed">
                <el-menu-item index="dashboard"><el-icon><Odometer /></el-icon><span>首页仪表盘</span></el-menu-item>
                <el-menu-item index="ip-agent"><el-icon><VideoCamera /></el-icon><span>IP口播智能体</span></el-menu-item>
                <el-menu-item index="mix-agent"><el-icon><Film /></el-icon><span>超级混剪矩阵</span></el-menu-item>
                <el-menu-item index="material-lib"><el-icon><Folder /></el-icon><span>素材资源库</span></el-menu-item>
                <el-menu-item index="voice-clone"><el-icon><Microphone /></el-icon><span>声音克隆管理</span></el-menu-item>
                <el-menu-item index="avatar-manage"><el-icon><Avatar /></el-icon><span>数字人管理</span></el-menu-item>
                <el-menu-item index="matrix-account"><el-icon><Connection /></el-icon><span>矩阵账号管理</span></el-menu-item>
                <el-menu-item index="template-center"><el-icon><Collection /></el-icon><span>模板中心</span></el-menu-item>
                <el-menu-item index="task-center"><el-icon><List /></el-icon><span>全局任务中心</span></el-menu-item>
                <el-menu-item index="publish-center"><el-icon><Share /></el-icon><span>发布中心</span></el-menu-item>
                <el-menu-item index="setting"><el-icon><Setting /></el-icon><span>系统设置</span></el-menu-item>
                <el-menu-item index="help"><el-icon><QuestionFilled /></el-icon><span>帮助文档</span></el-menu-item>
            </el-menu>
        </div>

        <!-- 主区域 -->
        <div class="main-area">
            <div class="topbar">
                <div class="topbar-left">
                    <el-button circle @click="toggleSidebar"><el-icon><Fold v-if="!store.sidebarCollapsed"/><Expand v-else/></el-icon></el-button>
                    <span class="topbar-title">{{ pageTitle }}</span>
                </div>
                <div class="topbar-right">
                    <el-tag type="warning" effect="dark">V1.0</el-tag>
                    <el-dropdown @command="handleCommand">
                        <span style="color:var(--accent);cursor:pointer;">{{ store.user ? store.user.username : 'demo' }} ▾</span>
                        <template #dropdown>
                            <el-dropdown-menu>
                                <el-dropdown-item command="setting">系统设置</el-dropdown-item>
                                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
                            </el-dropdown-menu>
                        </template>
                    </el-dropdown>
                </div>
            </div>
            <div class="content-area">
                <component :is="currentComponent"></component>
            </div>
        </div>

        <!-- 悬浮任务面板 -->
        <div class="task-panel" :class="{collapsed: store.taskPanelCollapsed}">
            <div class="task-panel-header" @click="store.taskPanelCollapsed=!store.taskPanelCollapsed">
                <span>📋 运行中任务 ({{ runningTasks.length }})</span>
                <el-icon v-if="store.taskPanelCollapsed"><ArrowUp /></el-icon>
                <el-icon v-else><ArrowDown /></el-icon>
            </div>
            <div class="task-panel-body" v-if="!store.taskPanelCollapsed">
                <div v-if="store.tasks.length===0" style="text-align:center;padding:20px;color:var(--text-sub);">暂无任务</div>
                <div v-for="t in store.tasks" :key="t.task_id" class="task-panel-item" @click="router.go('task-center')">
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                        <span style="font-size:13px;">{{ typeMap[t.task_type]||t.task_type }}</span>
                        <el-tag :type="statusType(t.status)" size="small">{{ statusMap[t.status] }}</el-tag>
                    </div>
                    <el-progress :percentage="t.progress" :stroke-width="6" :show-text="false" :status="t.status==='failed'?'exception':t.status==='completed'?'success':''" />
                </div>
            </div>
        </div>
    </div>
    `,
    setup() {
        const titleMap = {dashboard:'首页仪表盘','ip-agent':'时光机IP口播智能体','mix-agent':'时光机超级混剪矩阵智能体','material-lib':'可视化素材资源库','voice-clone':'声音克隆管理中心','avatar-manage':'数字人形象资产管理','matrix-account':'矩阵账号管理','template-center':'模板中心','task-center':'全局任务中心','publish-center':'多平台发布中心','setting':'系统设置','help':'帮助文档FAQ'};
        const componentMap = {dashboard:DashboardView,'ip-agent':IPAgentView,'mix-agent':MixAgentView,'material-lib':MaterialLibView,'voice-clone':VoiceCloneView,'avatar-manage':AvatarManageView,'matrix-account':MatrixAccountView,'template-center':TemplateCenterView,'task-center':TaskCenterView,'publish-center':PublishCenterView,'setting':SettingView,'help':HelpView};
        const typeMap = {ip_video_generate:'IP口播',mix_batch_generate:'批量混剪',voice_clone_task:'声音克隆',avatar_train_task:'数字人训练',web_material_download:'素材下载',platform_publish_task:'平台发布'};
        const statusMap = {queued:'排队',running:'运行',completed:'完成',failed:'失败'};
        const statusType = (s) => ({queued:'info',running:'warning',completed:'success',failed:'danger'}[s]||'info');
        const pageTitle = computed(() => titleMap[router.current.value] || '时光机工作台');
        const currentComponent = computed(() => componentMap[router.current.value] || DashboardView);
        const runningTasks = computed(() => store.tasks.filter(t => t.status==='queued'||t.status==='running'));
        const toggleSidebar = () => { store.sidebarCollapsed = !store.sidebarCollapsed; };
        const handleMenuSelect = (key) => { router.go(key); store.mobileMenuOpen = false; };
        const handleCommand = (cmd) => { if (cmd==='logout') { _safeStorage.removeItem('tm_token'); API.token=''; store.user=null; router.go('login'); } else router.go(cmd); };
        return { store, router, pageTitle, currentComponent, runningTasks, typeMap, statusMap, statusType, toggleSidebar, handleMenuSelect, handleCommand };
    }
};

/* ===== 初始化应用 ===== */
const app = createApp({
    setup() {
        onMounted(() => {
            router.init();
            if (API.token) {
                store.user = { username: 'demo' };
                if (router.current.value === 'login') router.go('dashboard');
                startTaskPolling();
            }
        });
        const currentView = computed(() => {
            if (router.current.value === 'login' || !API.token) return LoginView;
            return AppLayout;
        });
        return { currentView };
    },
    template: `<component :is="currentView"></component>`
});

app.use(ElementPlus);

// 全局注册 Element Plus 图标
for (const [key, comp] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, comp);
}

app.mount('#app');
