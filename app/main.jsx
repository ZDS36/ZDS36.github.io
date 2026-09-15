import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import avatarUrl from './avatar.jpg';

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

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

const LIGHT_PALETTES = [
  ['88, 120, 221', '229, 151, 99'],
  ['126, 98, 205', '224, 116, 149'],
  ['66, 137, 172', '210, 134, 88'],
  ['91, 108, 194', '196, 103, 132'],
  ['72, 143, 151', '218, 124, 102']
];

function createDriftStyle(minDuration, maxDuration, spread, palette) {
  const duration = randomBetween(minDuration, maxDuration);
  const point = () => `${randomBetween(-spread, spread).toFixed(1)}%`;

  return {
    '--drift-duration': `${duration.toFixed(1)}s`,
    '--drift-delay': `-${randomBetween(0, duration).toFixed(1)}s`,
    '--x0': point(),
    '--y0': point(),
    '--x1': point(),
    '--y1': point(),
    '--x2': point(),
    '--y2': point(),
    '--x3': point(),
    '--y3': point(),
    '--r0': `${randomBetween(-3, 3).toFixed(1)}deg`,
    '--r1': `${randomBetween(-3, 3).toFixed(1)}deg`,
    '--r2': `${randomBetween(-3, 3).toFixed(1)}deg`,
    '--r3': `${randomBetween(-3, 3).toFixed(1)}deg`,
    '--light-a': palette[0],
    '--light-b': palette[1],
    '--blob-a-w': `${randomBetween(34, 52).toFixed(1)}%`,
    '--blob-a-h': `${randomBetween(28, 45).toFixed(1)}%`,
    '--blob-a-x': `${randomBetween(20, 76).toFixed(1)}%`,
    '--blob-a-y': `${randomBetween(20, 72).toFixed(1)}%`,
    '--blob-b-w': `${randomBetween(22, 36).toFixed(1)}%`,
    '--blob-b-h': `${randomBetween(18, 31).toFixed(1)}%`,
    '--blob-b-x': `${randomBetween(18, 82).toFixed(1)}%`,
    '--blob-b-y': `${randomBetween(24, 80).toFixed(1)}%`,
    '--light-a-alpha': randomBetween(0.68, 0.84).toFixed(2),
    '--light-b-alpha': randomBetween(0.48, 0.66).toFixed(2),
    '--aurora-opacity': randomBetween(0.44, 0.57).toFixed(2)
  };
}

const paletteIndex = Math.floor(Math.random() * LIGHT_PALETTES.length);
const AMBIENT_MOTION = {
  blue: createDriftStyle(31, 46, 15, LIGHT_PALETTES[paletteIndex]),
  cyan: createDriftStyle(46, 68, 18, LIGHT_PALETTES[(paletteIndex + 3) % LIGHT_PALETTES.length]),
  violet: createDriftStyle(37, 54, 14, LIGHT_PALETTES[(paletteIndex + 1 + Math.floor(Math.random() * 3)) % LIGHT_PALETTES.length])
};

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
  const sweepRef = useRef(null);
  const shimmerRef = useRef(null);

  useEffect(() => {
    const sweep = sweepRef.current;
    const shimmer = shimmerRef.current;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!sweep || !shimmer || reducedMotion) return undefined;

    let sweepTimer;
    let shimmerTimer;
    let stopped = false;

    const scheduleSweep = (firstRun = false) => {
      const wait = firstRun ? randomBetween(3500, 9500) : randomBetween(16000, 34000);
      sweepTimer = window.setTimeout(() => {
        if (stopped) return;

        const leftToRight = Math.random() > 0.5;
        sweep.style.setProperty('--sweep-from-x', leftToRight ? '-28%' : '28%');
        sweep.style.setProperty('--sweep-to-x', leftToRight ? '28%' : '-28%');
        sweep.style.setProperty('--sweep-from-y', `${randomBetween(-12, 5).toFixed(1)}%`);
        sweep.style.setProperty('--sweep-to-y', `${randomBetween(-4, 13).toFixed(1)}%`);
        sweep.style.setProperty('--sweep-rotate', `${randomBetween(-5, 5).toFixed(1)}deg`);
        sweep.style.setProperty('--sweep-duration', `${randomBetween(7, 10.5).toFixed(1)}s`);
        sweep.style.setProperty('--sweep-peak', randomBetween(0.34, 0.48).toFixed(2));
        sweep.classList.add('is-sweeping');
      }, wait);
    };

    const scheduleShimmer = (firstRun = false) => {
      const wait = firstRun ? randomBetween(7000, 14000) : randomBetween(19000, 38000);
      shimmerTimer = window.setTimeout(() => {
        if (stopped) return;

        const leftToRight = Math.random() > 0.5;
        shimmer.style.setProperty('--shimmer-from-x', leftToRight ? '-18%' : '18%');
        shimmer.style.setProperty('--shimmer-to-x', leftToRight ? '18%' : '-18%');
        shimmer.style.setProperty('--shimmer-y', `${randomBetween(-9, 10).toFixed(1)}%`);
        shimmer.style.setProperty('--shimmer-rotate', `${randomBetween(-5, 5).toFixed(1)}deg`);
        shimmer.style.setProperty('--shimmer-duration', `${randomBetween(8.5, 12.5).toFixed(1)}s`);
        shimmer.style.setProperty('--shimmer-peak', randomBetween(0.2, 0.3).toFixed(2));
        shimmer.classList.add('is-shimmering');
      }, wait);
    };

    const handleSweepEnd = () => {
      sweep.classList.remove('is-sweeping');
      scheduleSweep();
    };

    const handleShimmerEnd = () => {
      shimmer.classList.remove('is-shimmering');
      scheduleShimmer();
    };

    sweep.addEventListener('animationend', handleSweepEnd);
    shimmer.addEventListener('animationend', handleShimmerEnd);
    scheduleSweep(true);
    scheduleShimmer(true);

    return () => {
      stopped = true;
      window.clearTimeout(sweepTimer);
      window.clearTimeout(shimmerTimer);
      sweep.removeEventListener('animationend', handleSweepEnd);
      shimmer.removeEventListener('animationend', handleShimmerEnd);
      sweep.classList.remove('is-sweeping');
      shimmer.classList.remove('is-shimmering');
    };
  }, []);

  return (
    <div className="ambient" aria-hidden="true">
      <span className="aurora aurora--blue" style={AMBIENT_MOTION.blue} />
      <span className="aurora aurora--cyan" style={AMBIENT_MOTION.cyan} />
      <span className="aurora aurora--violet" style={AMBIENT_MOTION.violet} />
      <span ref={shimmerRef} className="aurora aurora--coral" />
      <span ref={sweepRef} className="aurora aurora--amber" />
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
        <div className="portrait">
          <img className="portrait__image" src={avatarUrl} alt="张刀宋的头像" />
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
      <div className="detail__shell" data-index={index}>
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
