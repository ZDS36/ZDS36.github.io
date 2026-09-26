import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import avatarUrl from './avatar.jpg';

const PAGE_IDS = ['top', 'works', 'work-site', 'work-dashboard', 'slices', 'about', 'contact'];

const NAV_ITEMS = [
  { id: 'top', label: '首页' },
  { id: 'works', label: '作品' },
  { id: 'slices', label: '切片' },
  { id: 'about', label: '关于' }
];

const WORKS = [
  {
    id: 'work-site',
    number: '01',
    title: '未定态',
    subtitle: '个人网站',
    meta: 'WEB / 2026',
    summary: '围绕个人表达、点击式导航与响应式体验持续打磨的数字空间。',
    decision: '让内容承担主角，动效只负责连接页面与情绪。',
    tone: 'blue'
  },
  {
    id: 'work-dashboard',
    number: '02',
    title: '课程面板',
    subtitle: '实用工具',
    meta: 'TOOL / 2026',
    summary: '把课程信息查看与操作流程整理进一个更清楚的本地网页面板。',
    decision: '把复杂流程收进界面，让重要状态一眼可见。',
    tone: 'coral'
  }
];

const PAGE_TITLES = {
  top: '张刀宋｜未定态 / Between States',
  works: '作品｜张刀宋',
  'work-site': '未定态个人网站｜张刀宋',
  'work-dashboard': '课程面板｜张刀宋',
  about: '关于我｜张刀宋',
  slices: '我的切片｜张刀宋',
  contact: '联系方式｜张刀宋'
};

function pageFromHash() {
  const requested = window.location.hash.slice(1);
  return PAGE_IDS.includes(requested) ? requested : 'top';
}

function visualInViewport(element) {
  const rect = element.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
}

function AmbientLight() {
  const ambientRef = useRef(null);

  useEffect(() => {
    const ambient = ambientRef.current;
    const syncVisibility = () => {
      ambient.classList.toggle('is-paused', document.hidden);
    };

    syncVisibility();
    document.addEventListener('visibilitychange', syncVisibility);
    return () => document.removeEventListener('visibilitychange', syncVisibility);
  }, []);

  return (
    <div ref={ambientRef} className="ambient" aria-hidden="true">
      <span className="aurora aurora--blue" />
      <span className="aurora aurora--violet" />
    </div>
  );
}

function SiteHeader({ page }) {
  const activePage = page.startsWith('work-') ? 'works' : page;

  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="返回首页">
        <span className="brand__name">张刀宋</span>
        <span className="brand__meta">BETWEEN STATES / 00</span>
      </a>

      <nav className="primary-nav" aria-label="主导航">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            aria-current={activePage === item.id ? 'page' : undefined}
          >
            {item.label}
          </a>
        ))}
      </nav>

      <a
        className="contact-button"
        href="#contact"
        aria-current={page === 'contact' ? 'page' : undefined}
      >
        <span>联系我</span>
        <span aria-hidden="true">↗</span>
      </a>
    </header>
  );
}

function ArrowLink({ href, children, className = '' }) {
  return (
    <a className={`arrow-link ${className}`.trim()} href={href}>
      <span>{children}</span>
      <span className="arrow-link__icon" aria-hidden="true">↗</span>
    </a>
  );
}

function WorkVisual({ work, className = '' }) {
  return (
    <div className={`work-visual work-visual--${work.tone} ${className}`.trim()} data-work-visual={work.id} aria-hidden="true">
      <span className="work-visual__caption">{work.meta}</span>
      <span className="work-visual__number">{work.number}</span>
      <span className="work-visual__shape" />
      <strong className="work-visual__title">{work.title}</strong>
    </div>
  );
}

function Hero({ sharedEntering }) {
  return (
    <section className={`view home${sharedEntering ? ' view--shared-enter' : ''}`} data-view="top" aria-labelledby="hero-title">
      <div className="home__intro">
        <p className="page-kicker"><span>00</span> / PERSONAL ARCHIVE</p>

        <div className="home__identity">
          <div className="home__portrait">
            <img className="portrait__image" src={avatarUrl} alt="张刀宋的头像" />
          </div>
          <div>
            <p className="home__state"><i aria-hidden="true" /> STATUS / OPEN</p>
            <h1 id="hero-title" tabIndex="-1">张刀宋</h1>
          </div>
        </div>

        <div className="home__statement">
          <p>把正在做的东西，<br /><em>认真地留下来。</em></p>
          <span>这里收集网页、工具与过程中的判断。内容仍在生长，但每一项都来自真实完成的工作。</span>
        </div>

        <div className="home__actions">
          <ArrowLink href="#works">查看作品</ArrowLink>
          <a className="text-link" href="#about">关于这个空间 <span aria-hidden="true">→</span></a>
        </div>
      </div>

      <a className="featured-work" href="#work-site" aria-label="查看精选作品：未定态个人网站">
        <WorkVisual work={WORKS[0]} className="featured-work__visual" />
        <div className="featured-work__copy">
          <span>FEATURED / 01</span>
          <div>
            <h2>未定态 · 个人网站</h2>
            <p>一次关于内容、秩序与个人表达的持续设计。</p>
          </div>
          <span className="featured-work__arrow" aria-hidden="true">↗</span>
        </div>
      </a>

      <div className="home__foot">
        <p><span>NOW</span> 正在重做这个网站</p>
        <p><span>FOCUS</span> WEB · TOOLS · INTERACTION</p>
      </div>
    </section>
  );
}

function PageHeader({ index, label, title, intro }) {
  return (
    <header className="page-heading">
      <p className="page-kicker"><span>{index}</span> / {label}</p>
      <h1 tabIndex="-1">{title}</h1>
      {intro && <p className="page-heading__intro">{intro}</p>}
    </header>
  );
}

function WorkCard({ work }) {
  return (
    <a className={`work-card work-card--${work.tone}`} href={`#${work.id}`}>
      <WorkVisual work={work} className="work-card__visual" />
      <div className="work-card__copy">
        <p>{work.meta}</p>
        <h2>{work.title}<small>{work.subtitle}</small></h2>
        <span>{work.summary}</span>
        <i aria-hidden="true">↗</i>
      </div>
    </a>
  );
}

function WorksView({ sharedEntering }) {
  return (
    <section className={`view page works-page${sharedEntering ? ' view--shared-enter' : ''}`} data-view="works" aria-label="作品">
      <PageHeader
        index="01"
        label="SELECTED WORKS"
        title="作品"
        intro="少量、真实、能够完整讲清楚的项目。"
      />
      <div className="works-grid">
        {WORKS.map((work) => <WorkCard key={work.id} work={work} />)}
      </div>
      <footer className="page-foot"><span>02 PROJECTS</span><span>MORE / IN PROGRESS</span></footer>
    </section>
  );
}

function WorkDetail({ work, nextWork, backPage, sharedEntering }) {
  const isSite = work.id === 'work-site';
  const facts = isSite
    ? [
        ['目标', '让个人表达、作品入口与浏览体验形成一个整体。'],
        ['负责', '信息架构、界面设计、前端实现与响应式适配。'],
        ['方式', 'React + CSS，保留轻量 Hash 导航和无障碍基础。']
      ]
    : [
        ['目标', '把分散的课程操作与状态集中到一个本地界面。'],
        ['负责', '流程整理、界面实现、状态反馈与安全发布。'],
        ['原则', '真实账户与公开版本隔离，运行数据不进入公开副本。']
      ];

  return (
    <section className={`view page work-detail${sharedEntering ? ' view--shared-enter' : ''}`} data-view={work.id} aria-label={work.title}>
      <a className="back-link-v2" href={`#${backPage}`}><span aria-hidden="true">←</span> 返回{backPage === 'top' ? '首页' : '作品'}</a>
      <header className="work-detail__hero">
        <div>
          <p className="page-kicker"><span>{work.number}</span> / {work.meta}</p>
          <h1 tabIndex="-1">{work.title}</h1>
          <p>{work.summary}</p>
        </div>
        <WorkVisual work={work} className="work-detail__visual" />
      </header>

      <div className="work-detail__body">
        <blockquote>“{work.decision}”</blockquote>
        <dl>
          {facts.map(([label, value]) => (
            <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
          ))}
        </dl>
      </div>

      <a className="next-work" href={`#${nextWork.id}`}>
        <span>NEXT PROJECT / {nextWork.number}</span>
        <strong>{nextWork.title}</strong>
        <i aria-hidden="true">→</i>
      </a>
    </section>
  );
}

function SlicesView() {
  const slices = [
    ['09.25', '此刻', '正在重新整理这个网站，让真实内容成为视觉中心。'],
    ['09.24', '选择', '保留点击式页面结构，让每次进入都像翻开一页档案。'],
    ['长期', '原则', '只展示确认过的经历与作品，不用漂亮话填满空白。']
  ];

  return (
    <section className="view page slices-page" data-view="slices" aria-label="我的切片">
      <PageHeader index="02" label="FRAGMENTS" title="切片" intro="一些正在发生的事，以及我愿意留下来的判断。" />
      <ol className="journal-list">
        {slices.map(([date, title, copy], index) => (
          <li key={title}>
            <span>0{index + 1}</span>
            <time>{date}</time>
            <h2>{title}</h2>
            <p>{copy}</p>
          </li>
        ))}
      </ol>
      <footer className="page-foot"><span>UPDATED / 2026</span><span>BETWEEN STATES</span></footer>
    </section>
  );
}

function AboutView() {
  return (
    <section className="view page about-page" data-view="about" aria-label="关于我">
      <PageHeader index="03" label="ABOUT" title="关于" />
      <div className="about-layout">
        <figure className="about-layout__image">
          <img src={avatarUrl} alt="本站使用的花朵图像" />
          <figcaption>AN OPEN ARCHIVE / 03</figcaption>
        </figure>
        <div className="about-layout__story">
          <p className="about-layout__lead">这里是张刀宋的<br />个人数字空间。</p>
          <div className="about-layout__copy">
            <p>我用它收集正在完成的网页、工具与视觉实验，也记录过程里值得留下的判断。</p>
            <p>比起堆满标签，我更愿意让具体作品说明问题。这里会持续更新，但不会用未经确认的经历填充页面。</p>
          </div>
          <dl className="about-facts">
            <div><dt>现在</dt><dd>持续整理个人项目</dd></div>
            <div><dt>本站关注</dt><dd>网页设计 · 实用工具 · 交互体验</dd></div>
            <div><dt>更新方式</dt><dd>少量、真实、慢慢完善</dd></div>
          </dl>
        </div>
      </div>
      <footer className="page-foot"><span>PERSONAL ARCHIVE</span><span>OPEN / EVOLVING</span></footer>
    </section>
  );
}

function ContactView() {
  return (
    <section className="view page contact-page" data-view="contact" aria-label="联系方式">
      <PageHeader index="04" label="CONTACT" title="联系" intro="目前只展示已经确认公开的渠道。" />
      <div className="contact-panel">
        <a href="https://github.com/ZDS36" target="_blank" rel="noreferrer">
          <span>GITHUB</span><strong>ZDS36</strong><i aria-hidden="true">↗</i>
        </a>
      </div>
      <p className="contact-note">邮箱暂未公开；新的公开联系方式确认后会更新。</p>
      <footer className="page-foot"><span>CONTACT / 04</span><span>张刀宋</span></footer>
    </section>
  );
}

function CurrentView({ page, backPage, sharedEntering }) {
  if (page === 'works') return <WorksView sharedEntering={sharedEntering} />;
  if (page === 'work-site') return <WorkDetail work={WORKS[0]} nextWork={WORKS[1]} backPage={backPage} sharedEntering={sharedEntering} />;
  if (page === 'work-dashboard') return <WorkDetail work={WORKS[1]} nextWork={WORKS[0]} backPage={backPage} sharedEntering={sharedEntering} />;
  if (page === 'slices') return <SlicesView />;
  if (page === 'about') return <AboutView />;
  if (page === 'contact') return <ContactView />;
  return <Hero sharedEntering={sharedEntering} />;
}

function App() {
  const [page, setPage] = useState(pageFromHash);
  const mainRef = useRef(null);
  const pageRef = useRef(page);
  const sourceScroll = useRef({ top: 0, works: 0 });
  const originRef = useRef(null);
  const pendingRef = useRef(null);
  const activeRef = useRef(null);
  const previousPage = useRef(page);

  useEffect(() => {
    const clearTransition = () => {
      if (pendingRef.current) {
        pendingRef.current.overlay.remove();
        pendingRef.current = null;
      }
      const active = activeRef.current;
      if (!active) return;
      activeRef.current = null;
      active.animation.cancel();
      active.target.classList.remove('work-visual--hidden');
      active.overlay.remove();
    };

    const syncPage = () => {
      const requested = window.location.hash.slice(1);
      if (requested && !PAGE_IDS.includes(requested)) {
        window.history.replaceState(null, '', '#top');
      }

      const nextPage = pageFromHash();
      const oldPage = pageRef.current;
      if (nextPage === oldPage) return;
      clearTransition();

      const enteringWork = !oldPage.startsWith('work-') && nextPage.startsWith('work-');
      const returningToSource = oldPage.startsWith('work-') && originRef.current?.workId === oldPage && originRef.current.page === nextPage;
      if (enteringWork && (oldPage === 'top' || oldPage === 'works')) {
        originRef.current = { page: oldPage, workId: nextPage };
      } else if (oldPage.startsWith('work-') && nextPage.startsWith('work-')) {
        originRef.current = null;
      }

      if ((enteringWork || returningToSource) && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const workId = enteringWork ? nextPage : oldPage;
        const source = mainRef.current?.querySelector(`[data-work-visual="${workId}"]`);
        if (source && visualInViewport(source)) {
          const rect = source.getBoundingClientRect();
          const overlay = source.cloneNode(true);
          overlay.style.position = 'fixed';
          overlay.style.left = `${rect.left}px`;
          overlay.style.top = `${rect.top}px`;
          overlay.style.width = `${rect.width}px`;
          overlay.style.height = `${rect.height}px`;
          overlay.style.zIndex = '1000';
          overlay.style.pointerEvents = 'none';
          overlay.setAttribute('aria-hidden', 'true');
          document.body.append(overlay);
          pendingRef.current = { overlay, from: rect, toPage: nextPage, workId };
        }
      }

      setPage(nextPage);
    };

    const onVisibilityChange = () => {
      if (document.hidden) clearTransition();
    };
    window.addEventListener('hashchange', syncPage);
    document.addEventListener('visibilitychange', onVisibilityChange);
    syncPage();
    return () => {
      window.removeEventListener('hashchange', syncPage);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearTransition();
    };
  }, []);

  useLayoutEffect(() => {
    document.title = PAGE_TITLES[page];

    const main = mainRef.current;
    if (previousPage.current !== page) {
      const returning = previousPage.current.startsWith('work-') && originRef.current?.page === page;
      main.scrollTop = returning && (page === 'top' || page === 'works') ? sourceScroll.current[page] : 0;
      main.scrollLeft = 0;
      main.querySelector('h1')?.focus({ preventScroll: true });
      previousPage.current = page;
    }
    pageRef.current = page;

    const pending = pendingRef.current;
    if (!pending || pending.toPage !== page) return;
    pendingRef.current = null;
    const target = main.querySelector(`[data-work-visual="${pending.workId}"]`);
    if (!target || !visualInViewport(target) || typeof pending.overlay.animate !== 'function') {
      pending.overlay.remove();
      return;
    }

    const to = target.getBoundingClientRect();
    target.classList.add('work-visual--hidden');
    let animation;
    try {
      animation = pending.overlay.animate([
        { left: `${pending.from.left}px`, top: `${pending.from.top}px`, width: `${pending.from.width}px`, height: `${pending.from.height}px` },
        { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px` }
      ], { duration: 520, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'forwards' });
    } catch {
      target.classList.remove('work-visual--hidden');
      pending.overlay.remove();
      return;
    }
    const active = { animation, target, overlay: pending.overlay };
    activeRef.current = active;
    animation.onfinish = () => {
      if (activeRef.current !== active) return;
      activeRef.current = null;
      target.classList.remove('work-visual--hidden');
      pending.overlay.remove();
    };
  }, [page]);

  const focusMain = (event) => {
    event.preventDefault();
    mainRef.current.focus({ preventScroll: true });
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content" onClick={focusMain}>跳到主要内容</a>
      <AmbientLight />
      <SiteHeader page={page} />
      <span key={page} className="route-soften" aria-hidden="true" />
      <main
        ref={mainRef}
        id="main-content"
        className="site-main"
        tabIndex="-1"
        onScroll={(event) => {
          if (page === 'top' || page === 'works') sourceScroll.current[page] = event.currentTarget.scrollTop;
        }}
      >
        <CurrentView
          key={page}
          page={page}
          backPage={originRef.current?.workId === page ? originRef.current.page : 'works'}
          sharedEntering={pendingRef.current?.toPage === page}
        />
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
