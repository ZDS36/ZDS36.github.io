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

function useHashPage() {
  const [page, setPage] = useState(pageFromHash);

  useEffect(() => {
    const syncPage = () => {
      const requested = window.location.hash.slice(1);
      if (requested && !PAGE_IDS.includes(requested)) {
        window.history.replaceState(null, '', '#top');
      }
      setPage(pageFromHash());
    };

    window.addEventListener('hashchange', syncPage);
    syncPage();
    return () => window.removeEventListener('hashchange', syncPage);
  }, []);

  return page;
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

function Hero() {
  return (
    <section className="view home" data-view="top" aria-labelledby="hero-title">
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
        <div className="featured-work__visual" aria-hidden="true">
          <span className="featured-work__orb" />
          <span className="featured-work__name">未<br />定态</span>
          <span className="featured-work__index">01</span>
          <span className="featured-work__caption">BETWEEN STATES / VOL. 01</span>
          <span className="featured-work__seal">未完待续</span>
        </div>
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
      <div className="work-card__visual" aria-hidden="true">
        <span className="work-card__number">{work.number}</span>
        <span className="work-card__shape" />
        <span className="work-card__word">{work.title}</span>
      </div>
      <div className="work-card__copy">
        <p>{work.meta}</p>
        <h2>{work.title}<small>{work.subtitle}</small></h2>
        <span>{work.summary}</span>
        <i aria-hidden="true">↗</i>
      </div>
    </a>
  );
}

function WorksView() {
  return (
    <section className="view page works-page" data-view="works" aria-label="作品">
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

function WorkDetail({ work, nextWork }) {
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
    <section className="view page work-detail" data-view={work.id} aria-label={work.title}>
      <a className="back-link-v2" href="#works"><span aria-hidden="true">←</span> 返回作品</a>
      <header className="work-detail__hero">
        <div>
          <p className="page-kicker"><span>{work.number}</span> / {work.meta}</p>
          <h1 tabIndex="-1">{work.title}</h1>
          <p>{work.summary}</p>
        </div>
        <div className={`work-detail__visual work-detail__visual--${work.tone}`} aria-hidden="true">
          <span>{work.number}</span>
          <strong>{work.subtitle}</strong>
          <i />
        </div>
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
        <div>
          <span>EMAIL</span><strong>公开地址暂未提供</strong><i>—</i>
        </div>
      </div>
      <p className="contact-note">新的公开联系方式确认后，再补进这里。</p>
      <footer className="page-foot"><span>CONTACT / 04</span><span>张刀宋</span></footer>
    </section>
  );
}

function CurrentView({ page }) {
  if (page === 'works') return <WorksView />;
  if (page === 'work-site') return <WorkDetail work={WORKS[0]} nextWork={WORKS[1]} />;
  if (page === 'work-dashboard') return <WorkDetail work={WORKS[1]} nextWork={WORKS[0]} />;
  if (page === 'slices') return <SlicesView />;
  if (page === 'about') return <AboutView />;
  if (page === 'contact') return <ContactView />;
  return <Hero />;
}

function App() {
  const page = useHashPage();
  const mainRef = useRef(null);
  const worksScroll = useRef(0);
  const previousPage = useRef(page);

  useLayoutEffect(() => {
    document.title = PAGE_TITLES[page];

    if (previousPage.current === page) return;
    const main = mainRef.current;
    main.scrollTop = page === 'works' && previousPage.current.startsWith('work-')
      ? worksScroll.current
      : 0;
    main.scrollLeft = 0;
    main.querySelector('h1')?.focus({ preventScroll: true });
    previousPage.current = page;
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
      <main
        ref={mainRef}
        id="main-content"
        className="site-main"
        tabIndex="-1"
        onScroll={(event) => {
          if (page === 'works') worksScroll.current = event.currentTarget.scrollTop;
        }}
      >
        <CurrentView key={page} page={page} />
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
