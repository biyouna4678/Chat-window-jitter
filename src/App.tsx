import React, { useState, useEffect } from 'react';
import { 
  Github, 
  GitBranch, 
  FolderGit2, 
  Key, 
  Terminal, 
  ExternalLink, 
  CheckCircle2, 
  Search, 
  Star, 
  GitFork, 
  AlertCircle, 
  FileCode2, 
  Clock, 
  FileText,
  Copy,
  ChevronRight,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Eye,
  Lock,
  Unlock
} from 'lucide-react';

interface RepoData {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  default_branch: string;
  visibility: string;
  updated_at: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

interface TreeItem {
  path: string;
  type: 'blob' | 'tree';
  size?: number;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'explorer' | 'guide' | 'auth'>('explorer');
  const [repoInput, setRepoInput] = useState('facebook/react');
  const [tokenInput, setTokenInput] = useState('');
  const [savedToken, setSavedToken] = useState(() => localStorage.getItem('gh_user_pat') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repoData, setRepoData] = useState<RepoData | null>(null);
  const [treeItems, setTreeItems] = useState<TreeItem[]>([]);
  const [readmeContent, setReadmeContent] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Sync token to localStorage
  const handleSaveToken = () => {
    localStorage.setItem('gh_user_pat', tokenInput);
    setSavedToken(tokenInput);
    setActiveTab('explorer');
  };

  const handleClearToken = () => {
    localStorage.removeItem('gh_user_pat');
    setSavedToken('');
    setTokenInput('');
  };

  const fetchRepoInfo = async (targetRepo: string) => {
    let cleanRepo = targetRepo.trim();
    // Support full URLs like https://github.com/owner/repo
    if (cleanRepo.startsWith('https://github.com/')) {
      cleanRepo = cleanRepo.replace('https://github.com/', '').replace(/\/$/, '');
    } else if (cleanRepo.startsWith('http://github.com/')) {
      cleanRepo = cleanRepo.replace('http://github.com/', '').replace(/\/$/, '');
    }

    if (!cleanRepo.includes('/')) {
      setError('请输入正确的格式：用户名/仓库名 (例如 facebook/react) 或完整的 GitHub URL');
      return;
    }

    setLoading(true);
    setError(null);
    setRepoData(null);
    setTreeItems([]);
    setReadmeContent(null);

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
    };
    if (savedToken) {
      headers.Authorization = `Bearer ${savedToken}`;
    }

    try {
      // 1. Fetch Repository Details
      const res = await fetch(`https://api.github.com/repos/${cleanRepo}`, { headers });
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('未找到该仓库。如果是私有仓库，请先在“Token配置”标签页输入您的 GitHub 访问令牌 (PAT)。');
        } else if (res.status === 403) {
          throw new Error('触发了 GitHub API 速率限制。建议在“Token配置”页面填入您的 GitHub Token 获取更高额度。');
        } else {
          throw new Error(`获取仓库信息失败 (HTTP ${res.status})`);
        }
      }
      const data: RepoData = await res.json();
      setRepoData(data);

      // 2. Fetch Root Directory Contents
      const contentsRes = await fetch(`https://api.github.com/repos/${cleanRepo}/contents`, { headers });
      if (contentsRes.ok) {
        const contents = await contentsRes.json();
        if (Array.isArray(contents)) {
          setTreeItems(
            contents.map((item: { path: string; type: string; size?: number }) => ({
              path: item.path,
              type: item.type === 'dir' ? 'tree' : 'blob',
              size: item.size,
            }))
          );
        }
      }

      // 3. Fetch README
      const readmeRes = await fetch(`https://api.github.com/repos/${cleanRepo}/readme`, { headers });
      if (readmeRes.ok) {
        const readmeData = await readmeRes.json();
        if (readmeData.content && readmeData.encoding === 'base64') {
          // Decode UTF-8 base64
          try {
            const raw = atob(readmeData.content.replace(/\s/g, ''));
            const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
            const decoded = new TextDecoder().decode(bytes);
            setReadmeContent(decoded.slice(0, 3000) + (decoded.length > 3000 ? '\n\n... (内容已截断预览)' : ''));
          } catch {
            setReadmeContent(atob(readmeData.content.replace(/\s/g, '')));
          }
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '连接仓库出错';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepoInfo(repoInput);
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Github className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">GitHub 仓库连接助手</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  在线就绪
                </span>
              </div>
              <p className="text-xs text-slate-400">一键探索、配置授权与代码库集成</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('explorer')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'explorer'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              仓库探索
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'guide'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              连接与克隆指南
            </button>
            <button
              onClick={() => setActiveTab('auth')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === 'auth'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : savedToken
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>{savedToken ? 'Token 已配置' : 'Token 鉴权'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        {/* Quick Answer Banner */}
        <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-purple-950/50 border border-indigo-500/20 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                可以连接！你可以通过多种方式连接 GitHub 仓库
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                无论是把已有仓库<strong>拉取到当前项目</strong>进行二次开发，还是在网页应用中<strong>集成 GitHub 账号与数据</strong>，我都可以为你无缝处理。
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setActiveTab('guide')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl transition shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
              >
                查看连接方式
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tab 1: Repo Explorer */}
        {activeTab === 'explorer' && (
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  fetchRepoInfo(repoInput);
                }}
                className="flex flex-col sm:flex-row gap-3"
              >
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={repoInput}
                    onChange={(e) => setRepoInput(e.target.value)}
                    placeholder="输入 GitHub 仓库名 (如 facebook/react 或 https://github.com/...)"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-950 border border-slate-700/80 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm transition flex items-center gap-2 justify-center"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>连接中...</span>
                      </>
                    ) : (
                      <>
                        <FolderGit2 className="w-4 h-4" />
                        <span>测试连接并浏览</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Quick Suggestions */}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span>快速试用热门仓库：</span>
                {['facebook/react', 'tailwindlabs/tailwindcss', 'shadcn-ui/ui', 'torvalds/linux'].map((sample) => (
                  <button
                    key={sample}
                    onClick={() => {
                      setRepoInput(sample);
                      fetchRepoInfo(sample);
                    }}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold text-red-200">连接出现提示</div>
                  <p>{error}</p>
                  {error.includes('私有仓库') && (
                    <button
                      onClick={() => setActiveTab('auth')}
                      className="mt-2 text-xs font-semibold text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      前往配置 Personal Access Token &rarr;
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Repo Details Display */}
            {repoData && (
              <div className="space-y-6">
                {/* Header Card */}
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={repoData.owner.avatar_url}
                        alt={repoData.owner.login}
                        className="w-14 h-14 rounded-xl border border-slate-700 shadow"
                      />
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h1 className="text-xl font-bold text-white tracking-tight">{repoData.full_name}</h1>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                            {repoData.visibility === 'private' ? (
                              <>
                                <Lock className="w-3 h-3 text-amber-400" /> 私有仓库
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3 h-3 text-emerald-400" /> 公开仓库
                              </>
                            )}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 mt-1">{repoData.description || '暂无描述'}</p>
                      </div>
                    </div>

                    <a
                      href={repoData.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition border border-slate-700"
                    >
                      在 GitHub 上打开
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Stats Bar */}
                  <div className="mt-6 pt-5 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <div className="flex items-center justify-center gap-1.5 text-amber-400 text-xs mb-1">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span>Stars</span>
                      </div>
                      <div className="text-lg font-bold text-white">{repoData.stargazers_count.toLocaleString()}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <div className="flex items-center justify-center gap-1.5 text-blue-400 text-xs mb-1">
                        <GitFork className="w-3.5 h-3.5" />
                        <span>Forks</span>
                      </div>
                      <div className="text-lg font-bold text-white">{repoData.forks_count.toLocaleString()}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <div className="flex items-center justify-center gap-1.5 text-purple-400 text-xs mb-1">
                        <GitBranch className="w-3.5 h-3.5" />
                        <span>默认分支</span>
                      </div>
                      <div className="text-lg font-bold text-white">{repoData.default_branch}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                      <div className="flex items-center justify-center gap-1.5 text-emerald-400 text-xs mb-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>最近更新</span>
                      </div>
                      <div className="text-xs font-semibold text-white mt-1">
                        {new Date(repoData.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Two Column Layout: File Tree & Readme */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* File List */}
                  <div className="lg:col-span-1 p-5 rounded-2xl bg-slate-900 border border-slate-800 h-fit">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm font-semibold text-white flex items-center gap-2">
                        <FolderGit2 className="w-4 h-4 text-indigo-400" />
                        <span>根目录文件列表</span>
                      </div>
                      <span className="text-xs text-slate-500">{treeItems.length} 项</span>
                    </div>

                    <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
                      {treeItems.map((item) => (
                        <div
                          key={item.path}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-950/50 hover:bg-slate-800/60 text-xs text-slate-300 border border-slate-800/50 transition"
                        >
                          <div className="flex items-center gap-2 truncate">
                            {item.type === 'tree' ? (
                              <FolderGit2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            ) : (
                              <FileCode2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            )}
                            <span className="truncate">{item.path}</span>
                          </div>
                          {item.type === 'tree' ? (
                            <ChevronRight className="w-3 h-3 text-slate-600" />
                          ) : (
                            <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                              {item.size ? `${Math.round(item.size / 1024)} KB` : ''}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* README Preview */}
                  <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900 border border-slate-800">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                      <div className="text-sm font-semibold text-white flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-indigo-400" />
                        <span>README 预览</span>
                      </div>
                      <span className="text-xs text-slate-500">渲染摘要</span>
                    </div>

                    {readmeContent ? (
                      <div className="p-4 rounded-xl bg-slate-950 font-mono text-xs text-slate-300 leading-relaxed max-h-[460px] overflow-y-auto whitespace-pre-wrap border border-slate-800/80">
                        {readmeContent}
                      </div>
                    ) : (
                      <div className="p-12 text-center text-slate-500 text-xs">
                        未检测到 README 文件或加载中
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Connection Guide */}
        {activeTab === 'guide' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Method 1: Ask me to clone directly */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-indigo-500/30 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                    1
                  </div>
                  <h3 className="text-base font-bold text-white">直接发送仓库链接给我</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    如果你想让我把公开仓库的代码导入到当前开发环境，只需在对话框中告诉我：
                  </p>
                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-indigo-300">
                    &quot;请帮我把 https://github.com/用户名/仓库名 克隆到项目中，并改造成一个 React 页面&quot;
                  </div>
                  <p className="text-xs text-slate-400">
                    我可以直接使用工作区终端命令帮你拉取仓库、提取代码并重构成完整运行的 Web 项目。
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <span className="text-xs text-emerald-400 font-medium">推荐用于：快速复刻开源项目</span>
                </div>
              </div>

              {/* Method 2: Private Repo with PAT */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                    2
                  </div>
                  <h3 className="text-base font-bold text-white">私有仓库授权 (Token)</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    如果你的仓库是私有的（Private），请在 GitHub 生成一个只读权限的 <strong>Personal Access Token (classic 或 fine-grained)</strong>。
                  </p>
                  <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                    <li>访问 GitHub &gt; Settings &gt; Developer Settings</li>
                    <li>选择 Personal Access Tokens</li>
                    <li>勾选 <code className="text-purple-300 bg-slate-950 px-1 py-0.5 rounded">repo</code> 权限</li>
                  </ul>
                  <p className="text-xs text-slate-400">
                    在当前应用的“Token鉴权”面板输入 Token 后，即可读取你的私有代码库。
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <button
                    onClick={() => setActiveTab('auth')}
                    className="text-xs text-indigo-400 font-medium hover:underline flex items-center gap-1"
                  >
                    前往配置 Token &rarr;
                  </button>
                </div>
              </div>

              {/* Method 3: GitHub OAuth for Web App */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    3
                  </div>
                  <h3 className="text-base font-bold text-white">构建完整的 GitHub 应用</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    如果你需要这个 Web 页面支持<strong>“登录 GitHub”</strong>、管理你的个人 Issues、查看提交记录等：
                  </p>
                  <p className="text-xs text-slate-400">
                    我可以为这个应用实现完整的第三方 GitHub OAuth 授权或 API 客户端，让访客一键授权并操作其个人仓库。
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <span className="text-xs text-slate-400">只需告诉我你需要的功能模块</span>
                </div>
              </div>
            </div>

            {/* Useful Terminal Commands for Workspace */}
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <Terminal className="w-4 h-4 text-indigo-400" />
                <span>工作区终端常用 Git 指令速查</span>
              </div>
              <p className="text-xs text-slate-400">
                如果需要我在终端执行特定的 git 命令（如拉取子模块、导出 zip 等），你可以随时直接发指令：
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300">git clone --depth=1 &lt;URL&gt;</span>
                  <button
                    onClick={() => copyToClipboard('git clone --depth=1 <URL>', 'c1')}
                    className="text-slate-500 hover:text-white transition"
                  >
                    {copied === 'c1' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300">curl -L https://api.github.com/repos/...</span>
                  <button
                    onClick={() => copyToClipboard('curl -L https://api.github.com/repos/...', 'c2')}
                    className="text-slate-500 hover:text-white transition"
                  >
                    {copied === 'c2' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Token Auth Configuration */}
        {activeTab === 'auth' && (
          <div className="max-w-xl mx-auto p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">配置 GitHub Personal Access Token</h3>
                <p className="text-xs text-slate-400">用于访问你的私有仓库或提升 GitHub API 速率上限 (5000次/小时)</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  GitHub Token (仅保存在当前浏览器本地，不外传)
                </label>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder={savedToken ? '••••••••••••••••••••••••' : 'ghp_xxxxxxxxxxxxxxxxxxxx'}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {savedToken ? (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>当前已保存有效 Token</span>
                  </div>
                  <button
                    onClick={handleClearToken}
                    className="text-red-400 hover:underline text-[11px]"
                  >
                    清除 Token
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
                  <div className="font-semibold text-slate-300">如何创建 Token：</div>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>登录 GitHub，点击右上角头像 &gt; Settings</li>
                    <li>左侧菜单滚动到底部，点击 Developer settings</li>
                    <li>选择 Personal access tokens &gt; Tokens (classic)</li>
                    <li>点击 Generate new token，勾选 repo 权限并复制</li>
                  </ol>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setActiveTab('explorer')}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveToken}
                  disabled={!tokenInput}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium transition"
                >
                  保存并使用
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        Google AI Studio &bull; GitHub 集成工作台
      </footer>
    </div>
  );
}
