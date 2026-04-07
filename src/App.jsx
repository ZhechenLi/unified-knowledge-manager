import React, { useEffect, useState } from "react";
import {
  BrowserRouter,
  HashRouter,
  MemoryRouter,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams
} from "react-router-dom";

import { createAppApi } from "./api/client.js";

function useLoad(loader, deps) {
  const [state, setState] = useState({ status: "loading", data: null, error: null });

  useEffect(() => {
    let active = true;
    setState({ status: "loading", data: null, error: null });
    loader()
      .then((data) => {
        if (active) {
          setState({ status: "success", data, error: null });
        }
      })
      .catch((error) => {
        if (active) {
          setState({ status: "error", data: null, error });
        }
      });
    return () => {
      active = false;
    };
  }, deps);

  return state;
}

function PageFrame({ eyebrow, title, children, actions = null }) {
  return (
    <section className="page-frame">
      <div className="page-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
        </div>
        {actions ? <div className="page-actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function Layout({ children }) {
  return (
    <div className="shell">
      <aside className="shell-sidebar">
        <div>
          <p className="logo-mark">UKM</p>
          <h2>统一知识管理工具</h2>
          <p className="shell-copy">本地优先的 Cursor / Codex 知识工作台</p>
        </div>
        <nav className="shell-nav">
          <NavLink to="/">首页</NavLink>
          <NavLink to="/sources/cursor/setup">数据源初始化</NavLink>
          <NavLink to="/sources/codex/sessions">会话与汇总</NavLink>
          <NavLink to="/review/candidates">候选审核</NavLink>
          <NavLink to="/knowledge">知识库</NavLink>
        </nav>
      </aside>
      <main className="shell-main">{children}</main>
    </div>
  );
}

function StatusPill({ children }) {
  return <span className="status-pill">{children}</span>;
}

function HomePage({ api }) {
  const dashboard = useLoad(() => api.getDashboard(), [api]);

  return (
    <PageFrame eyebrow="Overview" title="统一知识管理工具">
      {dashboard.status === "loading" ? <p>加载首页总览...</p> : null}
      {dashboard.status === "error" ? <p>加载失败</p> : null}
      {dashboard.data ? (
        <div className="grid two-up">
          <section className="panel">
            <h3>支持的数据源</h3>
            <div className="stack">
              {dashboard.data.sources.map((source) => (
                <article key={source.dataSourceId} className="data-card">
                  <div>
                    <strong>{source.dataSourceId}</strong>
                    <p>{source.installRoot ?? "默认路径"}</p>
                  </div>
                  <StatusPill>{source.status}</StatusPill>
                </article>
              ))}
            </div>
          </section>
          <section className="panel">
            <h3>最近知识</h3>
            <div className="stack">
              {dashboard.data.recentKnowledge.map((card) => (
                <article key={card.cardId} className="data-card">
                  <div>
                    <strong>{card.title}</strong>
                    <p>{card.summary}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <section className="panel">
            <h3>最近会话</h3>
            <div className="stack">
              {dashboard.data.recentSessions.map((session) => (
                <article key={session.sessionId} className="data-card">
                  <div>
                    <strong>{session.sessionId}</strong>
                    <p>{session.workspacePath || "未捕获 workspace"}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </PageFrame>
  );
}

function SourceSetupPage({ api }) {
  const { dataSourceId } = useParams();
  const setupState = useLoad(() => api.getSourceSetupState(dataSourceId), [api, dataSourceId]);
  const [overwriteExistingHooks, setOverwriteExistingHooks] = useState(false);
  const [actionState, setActionState] = useState(null);

  useEffect(() => {
    setOverwriteExistingHooks(false);
    setActionState(null);
  }, [dataSourceId]);

  async function handlePreview(nextOverwrite = overwriteExistingHooks) {
    setActionState(await api.previewSetup(dataSourceId, { overwriteExistingHooks: nextOverwrite, mode: "initialize" }));
  }

  async function handleInitialize() {
    setActionState(
      await api.initializeSource(dataSourceId, {
        overwriteExistingHooks,
        mode: "initialize"
      })
    );
  }

  const state = actionState ?? setupState.data;

  return (
    <PageFrame
      eyebrow="Setup"
      title="数据源初始化"
      actions={
        <>
          <button onClick={handlePreview}>验证配置</button>
          <button className="cta-button" disabled={!state?.canSubmit} onClick={handleInitialize}>
            初始化数据源
          </button>
        </>
      }
    >
      {setupState.status === "loading" ? <p>加载数据源状态...</p> : null}
      {state ? (
        <div className="grid two-up">
          <section className="panel">
            <h3>{dataSourceId}</h3>
            <p>{state.resolvedInstallRoot}</p>
            <p>{state.resolvedCaptureOutputPath}</p>
          </section>
          <section className="panel">
            <h3>Manifest 预览</h3>
            <ul className="plain-list">
              {Object.entries(state.manifestPreview ?? {}).map(([path, item]) => (
                <li key={path}>
                  <code>{path}</code> · {item.action}
                </li>
              ))}
            </ul>
            {state.conflictFiles?.length ? (
              <label className="checkbox-row">
                <input
                  checked={overwriteExistingHooks}
                  onChange={async (event) => {
                    const nextValue = event.target.checked;
                    setOverwriteExistingHooks(nextValue);
                    await handlePreview(nextValue);
                  }}
                  type="checkbox"
                />
                允许覆盖现有 hooks 和配置文件
              </label>
            ) : null}
          </section>
        </div>
      ) : null}
    </PageFrame>
  );
}

function SessionsPage({ api }) {
  const { dataSourceId } = useParams();
  const navigate = useNavigate();
  const sessionsState = useLoad(() => api.listSessions(dataSourceId), [api, dataSourceId]);
  const [syncState, setSyncState] = useState(null);
  const [summaryState, setSummaryState] = useState(null);

  async function handleSummarize(sessionId) {
    const result = await api.summarizeSessions({
      dataSourceId,
      sessionIds: [sessionId]
    });
    setSummaryState(result);
    if (result.candidateIds?.[0]) {
      navigate(`/review/candidates/${result.candidateIds[0]}`);
    }
  }

  async function handleSync() {
    const result = await api.syncSource(dataSourceId);
    setSyncState(result);
  }

  return (
    <PageFrame
      eyebrow="Sessions"
      title="会话与汇总页"
      actions={<button onClick={handleSync}>同步会话</button>}
    >
      {syncState ? <p>本次同步导入 {syncState.importedSessionIds.length} 条会话</p> : null}
      {summaryState?.candidateIds ? <p>已生成候选卡片：{summaryState.candidateIds.join(", ")}</p> : null}
      <div className="panel">
        {sessionsState.status === "loading" ? <p>加载会话...</p> : null}
        {sessionsState.data ? (
          <div className="stack">
            {sessionsState.data.map((session) => (
              <article className="data-card" key={session.sessionId}>
                <div>
                  <strong>{session.title ?? session.sessionId}</strong>
                  <p>{session.summary ?? session.workspacePath}</p>
                </div>
                <button onClick={() => handleSummarize(session.sessionId)}>手动汇总</button>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </PageFrame>
  );
}

function CandidateListPage({ api }) {
  const candidatesState = useLoad(() => api.listCandidates(), [api]);

  return (
    <PageFrame eyebrow="Review" title="候选卡片审核">
      <div className="panel">
        {candidatesState.status === "loading" ? <p>加载候选卡片...</p> : null}
        {candidatesState.data ? (
          <div className="stack">
            {candidatesState.data.map((candidate) => (
              <article key={candidate.candidateId} className="data-card">
                <div>
                  <strong>{candidate.title}</strong>
                  <p>{candidate.summary}</p>
                </div>
                <NavLink className="mini-link" to={`/review/candidates/${candidate.candidateId}`}>
                  打开
                </NavLink>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </PageFrame>
  );
}

function CandidateReviewPage({ api }) {
  const { candidateId } = useParams();
  const candidateState = useLoad(() => api.getCandidate(candidateId), [api, candidateId]);
  const [confirmState, setConfirmState] = useState(null);

  async function handleConfirm() {
    setConfirmState(await api.confirmCandidate(candidateId));
  }

  return (
    <PageFrame eyebrow="Review" title="候选卡片审核">
      {candidateState.status === "loading" ? <p>加载候选详情...</p> : null}
      {candidateState.data ? (
        <div className="grid two-up">
          <section className="panel">
            <h3>{candidateState.data.title}</h3>
            <p>{candidateState.data.summary}</p>
            <article className="editor-card">{candidateState.data.draftContent}</article>
            <button className="cta-button" onClick={handleConfirm}>
              确认卡片
            </button>
            {confirmState ? <p>已确认为 {confirmState.cardId}</p> : null}
          </section>
          <section className="panel">
            <h3>原子知识候选</h3>
            <ul className="plain-list">
              {(candidateState.data.atomicKnowledgeCandidates ?? []).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </PageFrame>
  );
}

function KnowledgePage({ api }) {
  const knowledgeState = useLoad(() => api.listKnowledge({}), [api]);

  return (
    <PageFrame eyebrow="Library" title="知识库">
      <div className="panel">
        {knowledgeState.status === "loading" ? <p>加载知识库...</p> : null}
        {knowledgeState.data ? (
          <div className="stack">
            {knowledgeState.data.map((card) => (
              <article key={card.cardId} className="data-card">
                <div>
                  <strong>{card.title}</strong>
                  <p>{card.summary}</p>
                </div>
                <NavLink className="mini-link" to={`/knowledge/${card.cardId}`}>
                  打开
                </NavLink>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </PageFrame>
  );
}

function KnowledgeDetailPage({ api }) {
  const { cardId } = useParams();
  const cardState = useLoad(() => api.getKnowledgeCard(cardId), [api, cardId]);

  return (
    <PageFrame eyebrow="Library" title="知识库">
      {cardState.status === "loading" ? <p>加载知识详情...</p> : null}
      {cardState.data ? (
        <div className="grid two-up">
          <section className="panel">
            <h3>{cardState.data.title}</h3>
            <p>{cardState.data.summary}</p>
            <article className="editor-card">{cardState.data.content}</article>
          </section>
          <section className="panel">
            <h3>标签</h3>
            <div className="tag-row">
              {(cardState.data.tags ?? []).map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </PageFrame>
  );
}

export function AppShell({ api, initialEntries }) {
  const Router = initialEntries ? MemoryRouter : typeof window !== "undefined" && window.ukmApi ? HashRouter : BrowserRouter;
  const routerProps = initialEntries ? { initialEntries } : {};

  return (
    <Router {...routerProps}>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage api={api} />} />
          <Route path="/sources/:dataSourceId/setup" element={<SourceSetupPage api={api} />} />
          <Route path="/sources/:dataSourceId/sessions" element={<SessionsPage api={api} />} />
          <Route path="/review/candidates" element={<CandidateListPage api={api} />} />
          <Route path="/review/candidates/:candidateId" element={<CandidateReviewPage api={api} />} />
          <Route path="/knowledge" element={<KnowledgePage api={api} />} />
          <Route path="/knowledge/:cardId" element={<KnowledgeDetailPage api={api} />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default function App() {
  return <AppShell api={createAppApi()} />;
}
