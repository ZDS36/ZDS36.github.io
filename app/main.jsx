import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const PAGE_IDS = ['top', 'about', 'slices', 'contact'];

const NAV_ITEMS = [
  { id: 'top', label: '首页' },
  { id: 'about', label: '关于' },
  { id: 'slices', label: '切片' }
];

const HERO_ACTIONS = [
  { id: 'about', number: '01', label: '关于我', meta: 'PROFILE', tone: 'blue' },
  { id: 'slices', number: '02', label: '我的切片', meta: 'FRAGMENTS', tone: 'violet' },
  { id: 'contact', number: '03', label: '联系方式', meta: 'CONNECT', tone: 'coral' }
];

const PAGE_TITLES = {
  top: '张刀宋｜未定态 / Between States',
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
    const syncPage = () => setPage(pageFromHash());
    const requested = window.location.hash.slice(1);

    if (requested && !PAGE_IDS.includes(requested)) {
      window.history.replaceState(null, '', '#top');
    }

    window.addEventListener('hashchange', syncPage);
    return () => window.removeEventListener('hashchange', syncPage);
  }, []);

  return page;
}

function AmbientLight() {
  return (
    <div className="ambient" aria-hidden="true">
      <span className="aurora aurora--blue" />
      <span className="aurora aurora--cyan" />
      <span className="aurora aurora--violet" />
      <span className="aurora aurora--coral" />
      <span className="aurora aurora--amber" />
      <span className="ambient__grid" />
    </div>
  );
}

function SiteHeader({ page }) {
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
            aria-current={page === item.id ? 'page' : undefined}
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

function LiquidAction({ action }) {
  return (
    <a className={`liquid-action liquid-action--${action.tone}`} href={`#${action.id}`}>
      <span className="liquid-action__number">{action.number}</span>
      <span className="liquid-action__copy">
        <strong>{action.label}</strong>
        <small>{action.meta}</small>
      </span>
      <span className="liquid-action__arrow" aria-hidden="true">→</span>
    </a>
  );
}

function Hero() {
  return (
    <section className="view hero view--enter" data-view="top" aria-labelledby="hero-title">
      <span className="hero__axis hero__axis--left" aria-hidden="true" />
      <span className="hero__axis hero__axis--right" aria-hidden="true" />

      <div className="hero__rail hero__rail--left" aria-hidden="true">
        <span>PERSONAL SITE</span>
        <span>INDEX / 00</span>
      </div>

      <div className="hero__stage">
        <div className="portrait" role="img" aria-label="头像待补">
          <div className="portrait__surface">
            <span className="portrait__mark" aria-hidden="true">＋</span>
            <strong>头像待补</strong>
            <span>PORTRAIT / PENDING</span>
          </div>
        </div>

        <div className="identity">
          <p className="eyebrow">PERSONAL ARCHIVE · STATUS / OPEN</p>
          <h1 id="hero-title" tabIndex="-1">张刀宋</h1>
          <span className="signature-line" aria-hidden="true" />
          <p className="intro-placeholder">[ 个人简介待补 ]</p>
        </div>
      </div>

      <nav className="liquid-nav" aria-label="页面入口">
        {HERO_ACTIONS.map((action) => <LiquidAction key={action.id} action={action} />)}
      </nav>

      <div className="hero__foot" aria-label="站点状态">
        <span className="status-line"><i aria-hidden="true" /> AVAILABLE / OPEN</span>
        <span>CONTENT / PENDING</span>
      </div>

      <div className="hero__rail hero__rail--right" aria-hidden="true">
        <span>UNRESOLVED FORM</span>
        <span>BETWEEN STATES</span>
      </div>
    </section>
  );
}

function DetailShell({ page, index, label, title, children }) {
  return (
    <section className={`view detail detail--${page} view--enter`} data-view={page} aria-labelledby={`${page}-title`}>
      <div className="detail__shell">
        <a className="back-link" href="#top"><span aria-hidden="true">←</span> 返回首页</a>

        <header className="detail__heading">
          <p><span>{index}</span> / {label}</p>
          <h1 id={`${page}-title`} tabIndex="-1">{title}</h1>
        </header>

        <div className="detail__content">{children}</div>

        <footer className="detail__footer">
          <span>张刀宋</span>
          <span>BETWEEN STATES / {index}</span>
        </footer>
      </div>
    </section>
  );
}

function AboutView() {
  return (
    <DetailShell page="about" index="01" label="ABOUT" title="关于我">
      <p className="detail__lead">[ 个人简介待补 ]</p>
      <dl className="info-grid">
        <div><dt>当前身份</dt><dd>[ 待补 ]</dd></div>
        <div><dt>所在城市</dt><dd>[ 待补 ]</dd></div>
        <div><dt>正在关注</dt><dd>[ 待补 ]</dd></div>
      </dl>
    </DetailShell>
  );
}

function SlicesView() {
  const slices = [
    ['此刻', '[ 当前状态或近况待补 ]'],
    ['来路', '[ 经历或背景待补 ]'],
    ['偏好', '[ 兴趣或关注方向待补 ]']
  ];

  return (
    <DetailShell page="slices" index="02" label="SLICES" title="我的切片">
      <ol className="slice-list">
        {slices.map(([title, copy], index) => (
          <li key={title}>
            <span className="slice-list__number">0{index + 1}</span>
            <div><h2>{title}</h2><p>{copy}</p></div>
          </li>
        ))}
      </ol>
    </DetailShell>
  );
}

function ContactView() {
  const contacts = [
    ['邮箱', '[ 待补 ]'],
    ['社交平台', '[ 待补 ]'],
    ['其他方式', '[ 待补 ]']
  ];

  return (
    <DetailShell page="contact" index="03" label="CONTACT" title="联系方式">
      <p className="detail__lead">[ 公开联系方式待补 ]</p>
      <dl className="contact-grid">
        {contacts.map(([label, value]) => (
          <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
        ))}
      </dl>
    </DetailShell>
  );
}

function CurrentView({ page }) {
  if (page === 'about') return <AboutView />;
  if (page === 'slices') return <SlicesView />;
  if (page === 'contact') return <ContactView />;
  return <Hero />;
}

function App() {
  const page = useHashPage();
  const isFirstRender = useRef(true);

  useEffect(() => {
    document.title = PAGE_TITLES[page];

    const main = document.getElementById('main-content');
    if (main) {
      main.scrollTop = 0;
      main.scrollLeft = 0;
    }

    if (isFirstRender.current) {
      isFirstRender.current = false;
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      document.querySelector(`[data-view="${page}"] h1`)?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [page]);

  const focusMain = (event) => {
    event.preventDefault();
    document.getElementById('main-content')?.focus({ preventScroll: true });
  };

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content" onClick={focusMain}>跳到主要内容</a>
      <AmbientLight />
      <SiteHeader page={page} />
      <main id="main-content" className="site-main" tabIndex="-1">
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
