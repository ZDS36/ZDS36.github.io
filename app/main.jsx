import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import './styles.css';
import avatarUrl from './avatar.jpg';
import { MOMENTS } from './moments.js';
import { groupMoments } from './timeline.js';
import PrivateMessage from './PrivateMessage.jsx';

const TIMELINE = groupMoments(MOMENTS);

const FILM_URL = '/media/sunk-cost/film.mp4?v=20261026-polished';
const FILM_HTML_URL = '/media/sunk-cost/animation.html?v=20261026-polished';
const FILM_POSTER = '/media/sunk-cost/poster.jpg?v=20261026-polished';

const PAGE_IDS = ['top', 'works', 'work-film', 'work-qingping', 'work-site', 'work-dashboard', 'slices', 'about', 'contact'];
const CHAPTERS = ['top', 'works', 'slices', 'about', 'contact'];

const NAV_ITEMS = [
  { id: 'top', label: '首页' },
  { id: 'works', label: '作品' },
  { id: 'slices', label: '年轮' },
  { id: 'about', label: '关于' }
];

const WORKS = [
  {
    id: 'work-film',
    number: '01',
    title: '沉没成本',
    subtitle: '亲密关系中的一次重新判断',
    meta: 'MOTION FILM / 2026 / 02:18',
    summary: '当我们舍不得一段关系，舍不得的究竟是眼前的人，还是已经投入的时间？',
    tone: 'film'
  },
  {
    id: 'work-qingping',
    number: '02',
    title: '张刀宋净化',
    subtitle: '安卓开屏广告辅助工具',
    meta: 'ANDROID / v0.2.3 / 2026',
    summary: '让长辈少找几个开关，让每次打开应用少等一会儿。离线运行，帮助跳过开屏广告。',
    tone: 'sage'
  },
  {
    id: 'work-site',
    number: '03',
    title: '未定态',
    subtitle: '个人网站',
    meta: 'WEB / 2026',
    summary: '围绕个人表达、点击式导航与响应式体验持续打磨的数字空间。',
    decision: '让内容承担主角，动效只负责连接页面与情绪。',
    tone: 'blue'
  },
  {
    id: 'work-dashboard',
    number: '04',
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
  'work-film': '沉没成本 · 动态短片｜张刀宋',
  'work-qingping': '张刀宋净化 · 安卓软件下载｜张刀宋',
  'work-site': '未定态个人网站｜张刀宋',
  'work-dashboard': '课程面板｜张刀宋',
  about: '关于我｜张刀宋',
  slices: '年轮｜张刀宋',
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
    const pointerMotion = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    const followPointer = (event) => {
      if (!pointerMotion.matches || event.pointerType !== 'mouse') return;
      ambient.style.setProperty('--pointer-x', `${event.clientX}px`);
      ambient.style.setProperty('--pointer-y', `${event.clientY}px`);
      ambient.classList.add('is-following');
    };
    const resetPointer = () => ambient.classList.remove('is-following');

    syncVisibility();
    document.addEventListener('visibilitychange', syncVisibility);
    window.addEventListener('pointermove', followPointer, { passive: true });
    pointerMotion.addEventListener('change', resetPointer);
    return () => {
      document.removeEventListener('visibilitychange', syncVisibility);
      window.removeEventListener('pointermove', followPointer);
      pointerMotion.removeEventListener('change', resetPointer);
    };
  }, []);

  return (
    <div ref={ambientRef} className="ambient" aria-hidden="true">
      <span className="aurora aurora--blue" />
      <span className="aurora aurora--violet" />
      <span className="ambient__orbit" />
      <span className="ambient__grid" />
      <span className="ambient__word">BETWEEN<br />STATES</span>
    </div>
  );
}

function ThemeToggle() {
  const root = document.documentElement;
  const [dark, setDark] = useState(() => root.dataset.theme !== 'light');
  const transitionRef = useRef(null);

  const toggle = (event) => {
    const theme = dark ? 'light' : 'dark';
    transitionRef.current?.skipTransition();
    transitionRef.current = null;
    flushSync(() => setDark(!dark));

    const apply = () => {
      root.dataset.theme = theme;
      document.querySelector('meta[name="theme-color"]').content = getComputedStyle(root).getPropertyValue('--ink').trim();
      try { localStorage.setItem('between-states-theme', theme); } catch { /* Storage may be blocked. */ }
    };
    if (root.dataset.theme === theme || !document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.classList.remove('theme-reveal');
      apply();
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, root.clientWidth - x), Math.max(y, root.clientHeight - y));
    root.style.setProperty('--theme-origin', `${x}px ${y}px`);
    root.style.setProperty('--theme-radius', `${Math.ceil(radius)}px`);
    root.classList.add('theme-reveal');

    const animation = document.startViewTransition(() => {
      if (transitionRef.current === animation) apply();
    });
    transitionRef.current = animation;
    animation.ready.catch(() => {});
    const finish = () => {
      if (transitionRef.current !== animation) return;
      root.classList.remove('theme-reveal');
      transitionRef.current = null;
    };
    animation.finished.then(finish, finish);
  };

  return (
    <button className="theme-toggle" type="button" role="switch" onClick={toggle}
      aria-label="夜晚模式" aria-checked={dark}>
      <span className="theme-toggle__thumb" aria-hidden="true" />
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
      </svg>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20.6 15.3A8.6 8.6 0 0 1 8.7 3.4a8.7 8.7 0 1 0 11.9 11.9Z" />
      </svg>
    </button>
  );
}

function SiteHeader({ page }) {
  const activePage = page.startsWith('work-') ? 'works' : page;
  const trackIndicatorMotion = (event) => {
    if (event.nativeEvent.propertyName === 'transform') {
      event.currentTarget.classList.toggle('is-moving', event.nativeEvent.type === 'transitionrun');
    }
  };

  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="返回首页">
        <svg className="brand__symbol" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 2v28M2 16h28M6.1 6.1l19.8 19.8M6.1 25.9L25.9 6.1" stroke="currentColor" strokeWidth="2" /></svg>
        <span className="brand__name">张刀宋<span className="brand__dot">.</span></span>
        <span className="brand__meta">未定态<br />BETWEEN STATES</span>
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
        <span className="primary-nav__indicator" aria-hidden="true"
          onTransitionRun={trackIndicatorMotion}
          onTransitionEnd={trackIndicatorMotion}
          onTransitionCancel={trackIndicatorMotion} />
      </nav>

      <div className="header-actions">
        <ThemeToggle />
        <a className="contact-button" href="#contact" aria-current={page === 'contact' ? 'page' : undefined}>
          <span>联系我</span>
          <span aria-hidden="true">↗</span>
        </a>
      </div>
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
      <span className="work-visual__orbit" />
      <span className="work-visual__shape">
        {work.id === 'work-film' && <img src={FILM_POSTER} alt="" width="1600" height="900" />}
      </span>
      <span className="work-visual__note">{work.tone === 'blue' ? 'IDEAS IN BLOOM' : 'LESS, BUT BETTER'}</span>
      <strong className="work-visual__title">{work.title}</strong>
    </div>
  );
}

function Hero({ sharedEntering }) {
  return (
    <section className={`view home${sharedEntering ? ' view--shared-enter' : ''}`} data-view="top" aria-labelledby="hero-title">
      <div className="home__intro">
        <p className="page-kicker"><span>00 —</span> 张刀宋的个人档案</p>

        <h1 className="home__title" id="hero-title" tabIndex="-1" aria-label="未定态 Between States">Between<br /><em>States.</em><svg className="home__title-dot" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 2v28M2 16h28M6.1 6.1l19.8 19.8M6.1 25.9L25.9 6.1" stroke="currentColor" strokeWidth="1.5" /></svg></h1>

        <div className="home__identity">
          <div className="home__portrait">
            <img className="portrait__image" src={avatarUrl} alt="张刀宋的头像" />
          </div>
          <div>
            <p className="home__name">张刀宋 <span>/ 未定态</span></p>
            <p className="home__state"><i aria-hidden="true" /> 网页 · 工具 · 影像</p>
          </div>
        </div>

        <div className="home__statement">
          <p>把正在做的东西，<em>认真地留下来。</em></p>
          <span>这里收藏我的作品，也记录生活里的小事。</span>
        </div>

        <div className="home__actions">
          <ArrowLink href="#works">查看作品</ArrowLink>
          <a className="text-link" href="#about">关于这个空间 <span aria-hidden="true">→</span></a>
        </div>
      </div>

      <a className="featured-work" href="#work-film" aria-label="观看精选短片：沉没成本">
        <WorkVisual work={WORKS[0]} className="featured-work__visual" />
        <div className="featured-work__copy">
          <div>
            <p>精选短片 <span aria-hidden="true">·</span> 02:18</p>
            <h2>沉没成本</h2>
          </div>
          <span className="featured-work__arrow" aria-hidden="true">▶</span>
        </div>
      </a>

      <div className="home__foot">
        <p><span className="home__foot-status" /> 一个仍在生长的个人空间</p>
        <a href="#slices">读一读年轮 <span aria-hidden="true">↘</span></a>
        <p className="home__edition">PERSONAL ARCHIVE / 2026</p>
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
        <p><span>{work.number}</span> / {work.meta}</p>
        <h2>{work.title}</h2>
        <p className="work-card__subtitle">{work.subtitle}</p>
        <p className="work-card__summary">{work.summary}</p>
        <span className="work-card__action" aria-hidden="true">{work.tone === 'film' ? '观看短片 ' : ''}↗</span>
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
        intro="一部动态短片、两个实用工具，以及这个个人网站。"
      />
      <div className="works-grid">
        {WORKS.map((work) => <WorkCard key={work.id} work={work} />)}
      </div>
      <footer className="page-foot"><span>04 PROJECTS</span><span>MORE / IN PROGRESS</span></footer>
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

function SoftwareDetail({ backPage, sharedEntering }) {
  const work = WORKS[1];
  return (
    <section className={`view page work-detail app-detail${sharedEntering ? ' view--shared-enter' : ''}`} data-view="work-qingping" aria-label="张刀宋净化">
      <a className="back-link-v2" href={`#${backPage}`}><span aria-hidden="true">←</span> 返回{backPage === 'top' ? '首页' : '作品'}</a>
      <header className="work-detail__hero">
        <div>
          <p className="page-kicker"><span>02</span> / ANDROID TOOL / 2026</p>
          <h1 tabIndex="-1">张刀宋净化</h1>
          <p>{work.summary}</p>
        </div>
        <WorkVisual work={work} className="work-detail__visual" />
      </header>

      <section className="app-download" aria-labelledby="app-download-title">
        <div>
          <p className="page-kicker">LESS WAITING / 更容易上手</p>
          <h2 id="app-download-title">把注意力，留给想看的内容。</h2>
          <p>一个面向日常使用、也考虑长辈操作习惯的安卓小工具。在刚打开应用、出现可识别的广告跳过按钮时，尝试帮你完成点击。</p>
          <p className="app-compatibility">Android 8.0 及以上 · 加强跳过需 Android 13 及以上 · 无需电脑</p>
        </div>
        <div className="app-download__action">
          <a className="app-download__button" href="/downloads/zhangdaosong/ZhangDaoSongJinghua-0.2.3.apk" download="ZhangDaoSongJinghua-0.2.3.apk">下载安卓安装包 <span aria-hidden="true">↓</span></a>
          <p>v0.2.3 · APK · 约 54 KB<br />已有旧版？直接覆盖安装，保留设置与次数。</p>
          <a className="text-link" href="/downloads/zhangdaosong/quick-start.txt" download>下载文字使用说明 <span aria-hidden="true">↓</span></a>
        </div>
      </section>

      <div className="app-features" aria-label="软件功能">
        <article><span>01 / 自动帮忙</span><h2>少点一次“跳过”</h2><p>只在选中应用刚打开时，识别并尝试点击广告跳过按钮。Android 13 起可开启加强跳过；短时遮挡帮助防止手指误点。</p></article>
        <article><span>02 / 一键配置</span><h2>少找几个开关</h2><p>首页一个大按钮，为当前能列出的应用开启保护、加强跳过和防误点。字体与点击区域加大，后续设置按步骤提示。</p></article>
        <article><span>03 / 本地离线</span><h2>数据留在手机</h2><p>没有联网权限，不截图、不上传页面内容。本机只保存应用选择、规则和成功次数；随时可以单独关闭应用或全部暂停。</p></article>
      </div>

      <section className="app-guide" aria-labelledby="app-guide-title">
        <div><p className="page-kicker">GET STARTED / 三步开始</p><h2 id="app-guide-title">装好后，跟着首页做。</h2></div>
        <ol>
          <li><h3>安装并打开软件</h3><p>在安卓手机上下载 APK，按系统提示确认安装。更新时直接覆盖原版本，不需要先卸载。</p></li>
          <li><h3>点“一键配置全部应用 + 加强跳过”</h3><p>阅读说明并确认，软件会配置当前能列出的应用。新装应用需要再次配置；不想保护的应用可以单独关闭。</p></li>
          <li><h3>按提示完成手机授权</h3><p>亲自开启本软件的无障碍、允许后台运行，并到手机设置允许开机自启。每次设置后返回软件，继续点首页大按钮。然后回桌面重新打开其他应用试一试。</p></li>
        </ol>
      </section>

      <aside className="app-boundaries" aria-labelledby="app-boundaries-title">
        <h2 id="app-boundaries-title">使用前，先知道这些。</h2>
        <p>这是开屏广告辅助跳过工具，不能保证识别所有广告，也不能屏蔽“摇一摇”。无障碍权限范围较大，能够读取屏幕和代你操作；加强跳过仍可能误点或误跳使用引导。可在“应用”中关闭不需要的应用或加强跳过。</p>
        <p>无障碍与厂商开机自启必须由本人在系统页面开启。开机自启显示的是用户的手动确认，软件无法核验厂商开关。分身、工作空间、后台清理和不同机型可能影响效果；Android 13 以下使用普通跳过。</p>
        <details><summary>核对安装包 SHA-256</summary><code>c1cef88c9a37fa758f188a023e11a512b2abe2df77c22f96096a6a45a3cc3253</code></details>
      </aside>
      <a className="next-work" href="#work-site"><span>NEXT PROJECT / 03</span><strong>未定态 · 个人网站</strong><i aria-hidden="true">→</i></a>
    </section>
  );
}

function FilmDetail({ backPage, sharedEntering }) {
  const playerRef = useRef(null);
  const [playbackError, setPlaybackError] = useState(false);
  useEffect(() => {
    const pauseWhenHidden = () => { if (document.hidden) playerRef.current?.pause(); };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => document.removeEventListener('visibilitychange', pauseWhenHidden);
  }, []);

  return (
    <section className={`view page film-detail${sharedEntering ? ' view--shared-enter' : ''}`} data-view="work-film" aria-label="沉没成本">
      <a className="back-link-v2" href={`#${backPage}`}><span aria-hidden="true">←</span> 返回{backPage === 'top' ? '首页' : '作品'}</a>
      <header className="film-heading">
        <p className="page-kicker"><span>01</span> / MOTION FILM / 2026</p>
        <h1 tabIndex="-1">沉没成本<span>SUNK COST</span></h1>
        <p>亲密关系中的一次重新判断</p>
        <span className="film-heading__meta">02:18 · 动态文字 / 粒子 / 音乐</span>
      </header>
      <div className="film-player" data-work-visual="work-film">
        <video ref={playerRef} controls playsInline preload="none" poster={FILM_POSTER} width="960" height="540" onError={() => setPlaybackError(true)} aria-label="沉没成本完整短片，约2分18秒，音乐与屏幕文字，无旁白">
          <source src={FILM_URL} type="video/mp4" onError={() => setPlaybackError(true)} />
          当前浏览器无法播放视频，<a href={FILM_HTML_URL}>打开 HTML 动画版</a>。
        </video>
        <span className="work-visual__shape film-player__shape" aria-hidden="true" />
      </div>
      <p className="film-player__note">点击播放 · 建议开启声音，全屏观看<span>完整短片 / 16:9</span></p>
      <div className="film-alternatives">
        <div><span>两种方式，观看同一支短片。</span><p>当前为省流视频 · 约 5.8 MB。也可以打开 HTML 动画版，横屏观看。</p></div>
        <a className="film-html-link" href={FILM_HTML_URL}>HTML 动画版 <span aria-hidden="true">↗</span></a>
        <a className="text-link" href={FILM_URL}>直接打开视频 <span aria-hidden="true">↗</span></a>
      </div>
      {playbackError && <p className="film-error" role="alert">视频暂时无法加载，请尝试上方的 HTML 动画版，或直接打开视频。</p>}
      <div className="film-story">
        <blockquote>“都已经在一起<br />这么久了。”</blockquote>
        <div>
          <p>一句熟悉的话，有时会让过去的投入，变成继续投入的理由。</p>
          <p>《沉没成本》从亲密关系中的日常对话出发，用动态文字、粒子形态与音乐节奏，呈现投入、不甘、犹豫与重新判断的过程。它把问题留给当下：如果从今天开始，你还愿意选择这段关系吗？</p>
        </div>
      </div>
      <div className="film-stills" aria-label="片中画面">
        <figure><img src="/media/sunk-cost/past.jpg" alt="片中画面：把已经发生的四年与未来的选择分开看" loading="lazy" width="960" height="540" /><figcaption><span>01 / 过去</span> 已经发生，也曾有价值。</figcaption></figure>
        <figure><img src="/media/sunk-cost/weight.jpg" alt="片中画面：暗色空间里，粒子呈现过去投入的重量" loading="lazy" width="960" height="540" /><figcaption><span>02 / 不甘</span> 让抽象的重量被看见。</figcaption></figure>
        <figure><img src="/media/sunk-cost/release.jpg" alt="片中画面：松开过去，重新看当下" loading="lazy" width="960" height="540" /><figcaption><span>03 / 松开</span> 把选择留给未来。</figcaption></figure>
      </div>
      <div className="film-making">
        <p className="page-kicker">BEHIND THE FILM / 创作介绍</p>
        <p>绷紧的线、下坠的锚、倾斜的天平与逐渐松开的粒子，让抽象的心理感受变成可以看见的运动。画面随着音乐经历收紧、暗沉与舒展，把过去的投入和未来的选择慢慢分开。</p>
        <p className="film-boundary">片中案例为虚构，图表用于概念示意。继续或离开，都需要结合当下的真实处境判断。</p>
        <div className="film-credits"><span>作品呈现 / 张刀宋 · 2026</span><span>内容参考 / <a href="https://doi.org/10.1016/0749-5978(85)90049-4" target="_blank" rel="noreferrer">Arkes &amp; Blumer, 1985 ↗</a> · <a href="https://doi.org/10.1007/s12144-016-9529-9" target="_blank" rel="noreferrer">Rego et al., 2018 ↗</a></span></div>
      </div>
      <a className="next-work" href="#work-qingping"><span>NEXT PROJECT / 02</span><strong>张刀宋净化</strong><i aria-hidden="true">→</i></a>
    </section>
  );
}

function SlicesView() {
  const [photo, setPhoto] = useState(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!photo) return;
    const dialog = dialogRef.current;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [photo]);

  return (
    <section className="view page slices-page" data-view="slices" aria-label="年轮">
      <PageHeader index="02" label="LIFE, IN RINGS" title="年轮" intro="不必每天发生大事。小小的日常，也值得长成一圈年轮。" />
      <div className="moments-layout">
        <aside className="moments-profile" aria-label="年轮介绍">
          <div className="moments-profile__heading">
            <h2>时间索引</h2>
            <p>{MOMENTS.length} 条片段</p>
          </div>
          <nav className="timeline-index" aria-label="年轮时间索引">
            {TIMELINE.map(({ year, months }) => (
              <div key={year}>
                <strong>{year}</strong>
                {months.map(({ month, entries }) => (
                  <button key={month} type="button" onClick={() => {
                    document.getElementById(`ring-${year}-${month}`).scrollIntoView({ block: 'start' });
                  }}>{Number(month)} 月<span>{entries.length} 条</span></button>
                ))}
              </div>
            ))}
          </nav>
        </aside>
        <div className="time-tree">
          <div className="time-tree__intro"><span>沿途的生活</span><span>由近及远 ↓</span></div>
          {TIMELINE.map(({ year, months }) => (
            <section className="time-tree__year" key={year} aria-labelledby={`ring-year-${year}`}>
              <h2 id={`ring-year-${year}`}><span>{year}</span><small>这一年，慢慢成形</small></h2>
              {months.map(({ month, entries }) => (
                <section className="time-tree__month" id={`ring-${year}-${month}`} key={month} aria-label={`${year} 年 ${Number(month)} 月`} tabIndex="-1">
                  <h3><span>{Number(month).toString().padStart(2, '0')}</span> 月<small>{entries.length} 个片段</small></h3>
                  <ol className="moments-feed">
                    {entries.map(moment => (
                      <li className="moment" key={moment.id}>
                        <time className="moment__date" dateTime={moment.date}><strong>{moment.date.slice(8)}</strong><span>{Number(month)} 月</span></time>
                        <article className="moment-card" aria-labelledby={`moment-${moment.id}`}>
                          <header>
                            <h4 id={`moment-${moment.id}`}>{moment.title}</h4>
                            <span className="moment-card__tag">{moment.tag}</span>
                          </header>
                          <p className="moment-card__text">{moment.text}</p>
                          {moment.photos.length > 0 && <div className={`moment-photos${moment.photos.length === 1 ? ' moment-photos--single' : ''}`}>
                            {moment.photos.map((image, index) => (
                              <button key={image.src} type="button" onClick={() => setPhoto(image)} aria-label={`放大图片：${image.alt}`}>
                                <img src={image.src} alt={image.alt} loading="lazy" width="512" height="512" />
                                <span aria-hidden="true">{index + 1} / {moment.photos.length} ↗</span>
                              </button>
                            ))}
                          </div>}
                        </article>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </section>
          ))}
          <p className="time-tree__end"><span aria-hidden="true" /> 故事从这里发芽，也还会继续。</p>
        </div>
      </div>
      <footer className="page-foot"><span>LITTLE THINGS / LASTING TRACES</span><span>BETWEEN STATES</span></footer>
      <dialog className="photo-viewer" ref={dialogRef} aria-label="查看年轮配图" onClose={() => setPhoto(null)}>
        <form method="dialog"><button type="submit" autoFocus>关闭 <span aria-hidden="true">×</span></button></form>
        {photo && <figure><img src={photo.src} alt={photo.alt} /><figcaption>{photo.alt}</figcaption></figure>}
      </dialog>
    </section>
  );
}

function AboutView() {
  return (
    <section className="view page about-page" data-view="about" aria-label="关于我">
      <PageHeader index="03" label="ABOUT" title="关于" />
      <div className="about-layout">
        <p className="about-layout__lead">我是张刀宋，<br />欢迎来到未定态。</p>
        <figure className="about-layout__image">
          <img src={avatarUrl} alt="本站使用的花朵图像" />
        </figure>
        <div className="about-layout__story">
          <div className="about-layout__copy">
            <p>最初做这个网站，只是想做着玩。慢慢地，这里有了网页和实用工具，也有了短片、照片与生活记录。想做的东西，就试着做出来；想留住的瞬间，就放进这里。</p>
            <p>现在的作品里，有动态短片《沉没成本》、安卓工具「张刀宋净化」、课程面板，还有这个不断变化的网站。「作品」放做出来的东西，「年轮」记下沿途的日常。</p>
            <p>最近在练吉他，因为喜欢 h3R3 刘清云。最想学会弹唱的是《还是会想你》，现在还在慢慢练。</p>
            <p>之前想在无畏契约打上钻石，这个小目标已经完成了，现在是超凡一。</p>
          </div>
          <dl className="about-facts">
            <div><dt>正在练</dt><dd>吉他 ·《还是会想你》</dd></div>
            <div><dt>小目标</dt><dd>钻石已达成 · 现在超凡一</dd></div>
            <div><dt>在折腾</dt><dd>网页 · 实用工具 · 动态短片</dd></div>
            <div><dt>留在这里</dt><dd>作品、照片，还有生活的小片段</dd></div>
          </dl>
          <div className="home__actions">
            <ArrowLink href="#works">看看作品</ArrowLink>
            <a className="text-link" href="#slices">逛逛年轮 <span aria-hidden="true">→</span></a>
          </div>
        </div>
      </div>
      <footer className="page-foot"><span>PERSONAL ARCHIVE</span><span>OPEN / EVOLVING</span></footer>
    </section>
  );
}

function ContactView() {
  return (
    <section className="view page contact-page" data-view="contact" aria-label="联系方式">
      <PageHeader index="04" label="CONTACT" title="打个招呼。" intro="关于作品，关于想法，或只是说声你好。" />
      <PrivateMessage />
      <div className="contact-panel">
        <a href="https://github.com/ZDS36" target="_blank" rel="noreferrer">
          <span>GITHUB</span><strong>ZDS36</strong><i aria-hidden="true">↗</i>
        </a>
      </div>
      <p className="contact-note">也可以在 GitHub 上，看看我正在折腾的东西。</p>
      <footer className="page-foot"><span>CONTACT / 04</span><span>张刀宋</span></footer>
    </section>
  );
}

function CurrentView({ page, backPage, sharedEntering }) {
  if (page === 'works') return <WorksView sharedEntering={sharedEntering} />;
  if (page === 'work-film') return <FilmDetail backPage={backPage} sharedEntering={sharedEntering} />;
  if (page === 'work-qingping') return <SoftwareDetail backPage={backPage} sharedEntering={sharedEntering} />;
  if (page === 'work-site') return <WorkDetail work={WORKS[2]} nextWork={WORKS[3]} backPage={backPage} sharedEntering={sharedEntering} />;
  if (page === 'work-dashboard') return <WorkDetail work={WORKS[3]} nextWork={WORKS[0]} backPage={backPage} sharedEntering={sharedEntering} />;
  if (page === 'slices') return <SlicesView />;
  if (page === 'about') return <AboutView />;
  if (page === 'contact') return <ContactView />;
  return <Hero sharedEntering={sharedEntering} />;
}

function App() {
  const [page, setPage] = useState(pageFromHash);
  const [navigation, setNavigation] = useState(() => ({ page: pageFromHash(), animate: false }));
  const mainRef = useRef(null);
  const maskRef = useRef(null);
  const pageRef = useRef(page);
  const originRef = useRef(null);
  const pendingRef = useRef(null);
  const activeRef = useRef(null);
  const maskAnimation = useRef(null);
  const isDetail = navigation.page.startsWith('work-');

  useEffect(() => {
    const main = mainRef.current;
    const shell = main.closest('.app-shell');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const oldRestoration = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    const clearTransition = () => {
      maskAnimation.current?.cancel();
      maskAnimation.current = null;
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
      main.querySelector('dialog[open]')?.close();
      const nextPage = pageFromHash();
      if (window.location.hash !== `#${nextPage}`) history.replaceState(null, '', `#${nextPage}`);
      const oldPage = pageRef.current;
      clearTransition();
      const enteringWork = !oldPage.startsWith('work-') && nextPage.startsWith('work-');
      const returning = oldPage.startsWith('work-') && originRef.current?.workId === oldPage && originRef.current.page === nextPage;
      if (enteringWork) {
        originRef.current = { page: oldPage, workId: nextPage, scroll: main.scrollTop };
      } else if (oldPage.startsWith('work-') && nextPage.startsWith('work-')) {
        originRef.current = null;
      }
      if ((enteringWork || returning) && !reducedMotion.matches) {
        const workId = enteringWork ? nextPage : oldPage;
        const source = main.querySelector(`[data-view="${oldPage}"] [data-work-visual="${workId}"]`);
        if (source && visualInViewport(source)) {
          const rect = source.getBoundingClientRect();
          const overlay = source.cloneNode(true);
          overlay.querySelector('.work-visual__shape').style.transform = getComputedStyle(source.querySelector('.work-visual__shape')).transform;
          Object.assign(overlay.style, {
            position: 'fixed', left: `${rect.left}px`, top: `${rect.top}px`,
            width: `${rect.width}px`, height: `${rect.height}px`, zIndex: '1000', pointerEvents: 'none'
          });
          overlay.setAttribute('aria-hidden', 'true');
          document.body.append(overlay);
          pendingRef.current = { overlay, from: rect, toPage: nextPage, workId };
        }
      }
      pageRef.current = nextPage;
      setPage(nextPage);
      setNavigation({ page: nextPage, focus: true, animate: !reducedMotion.matches, restore: returning ? originRef.current.scroll : null });
    };
    const onClick = (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const nextPage = link.getAttribute('href').slice(1);
      if (!PAGE_IDS.includes(nextPage)) return;
      event.preventDefault();
      if (location.hash !== `#${nextPage}`) history.pushState(null, '', `#${nextPage}`);
      syncPage();
    };
    const onVisibilityChange = () => { if (document.hidden) clearTransition(); };
    const onMotionChange = () => { if (reducedMotion.matches) clearTransition(); };
    const onScroll = () => {
      const active = activeRef.current;
      if (active && Math.abs(active.target.getBoundingClientRect().top - active.to.top) > 2) clearTransition();
    };
    window.addEventListener('hashchange', syncPage);
    window.addEventListener('resize', clearTransition);
    main.addEventListener('scroll', onScroll, { passive: true });
    main.addEventListener('wheel', clearTransition, { passive: true });
    main.addEventListener('touchstart', clearTransition, { passive: true });
    shell.addEventListener('click', onClick);
    document.addEventListener('visibilitychange', onVisibilityChange);
    reducedMotion.addEventListener('change', onMotionChange);
    if (location.hash !== `#${pageFromHash()}`) history.replaceState(null, '', `#${pageFromHash()}`);
    return () => {
      history.scrollRestoration = oldRestoration;
      window.removeEventListener('hashchange', syncPage);
      window.removeEventListener('resize', clearTransition);
      main.removeEventListener('scroll', onScroll);
      main.removeEventListener('wheel', clearTransition);
      main.removeEventListener('touchstart', clearTransition);
      shell.removeEventListener('click', onClick);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      reducedMotion.removeEventListener('change', onMotionChange);
      clearTransition();
    };
  }, []);

  useEffect(() => { document.title = PAGE_TITLES[page]; }, [page]);

  useLayoutEffect(() => {
    const main = mainRef.current;
    const section = main.querySelector(`[data-view="${navigation.page}"]`);
    if (!section) return;
    main.scrollTop = navigation.restore ?? section.offsetTop;
    main.scrollLeft = 0;
    if (navigation.focus) section.querySelector('h1')?.focus({ preventScroll: true });
    // Replay the existing paper arrival only for explicitly selected chapters.
    section.classList.remove('is-arriving');
    if (navigation.animate) {
      void section.offsetWidth;
      section.classList.add('is-arriving');
      if (typeof maskRef.current.animate === 'function') {
        maskAnimation.current = maskRef.current.animate([
          { backdropFilter: 'blur(10px)', opacity: 1 },
          { backdropFilter: 'blur(0px)', opacity: 0 }
        ], { duration: 620, easing: 'cubic-bezier(.2, .65, .3, 1)' });
      }
    }
    const pending = pendingRef.current;
    if (!pending || pending.toPage !== navigation.page) return;
    pendingRef.current = null;
    const target = section.querySelector(`[data-work-visual="${pending.workId}"]`);
    if (!target || !visualInViewport(target) || typeof pending.overlay.animate !== 'function') {
      pending.overlay.remove();
      return;
    }
    const to = target.getBoundingClientRect();
    target.classList.add('work-visual--hidden');
    let animation;
    try {
      const timing = { duration: 700, easing: 'cubic-bezier(.22, .68, .3, 1)', fill: 'forwards' };
      const shape = pending.overlay.querySelector('.work-visual__shape');
      shape.animate([
        { transform: shape.style.transform },
        { transform: getComputedStyle(target.querySelector('.work-visual__shape')).transform }
      ], timing);
      animation = pending.overlay.animate([
        { left: `${pending.from.left}px`, top: `${pending.from.top}px`, width: `${pending.from.width}px`, height: `${pending.from.height}px` },
        { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px` }
      ], timing);
    } catch {
      target.classList.remove('work-visual--hidden');
      pending.overlay.remove();
      return;
    }
    const active = { animation, target, overlay: pending.overlay, to };
    activeRef.current = active;
    animation.onfinish = () => {
      if (activeRef.current !== active) return;
      activeRef.current = null;
      target.classList.remove('work-visual--hidden');
      pending.overlay.remove();
    };
  }, [navigation]);

  useEffect(() => {
    const main = mainRef.current;
    const shell = main.closest('.app-shell');
    const sections = [...main.querySelectorAll('[data-view]')];
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    const update = () => {
      frame = 0;
      if (document.hidden) return;
      const height = main.clientHeight;
      const progress = main.scrollTop / Math.max(1, main.scrollHeight - height);
      shell.style.setProperty('--journey', progress);
      shell.style.setProperty('--depth', motion.matches ? '0px' : `${progress * -320}px`);
      let current = sections[0];
      for (const section of sections) {
        const top = section.offsetTop - main.scrollTop;
        if (top <= height * .35) current = section;
        if (top < height && top + section.offsetHeight > 0) {
          const drift = Math.max(-70, Math.min(70, (height / 2 - top - section.offsetHeight / 2) * .12));
          section.style.setProperty('--drift', motion.matches ? '0px' : `${drift}px`);
        }
      }
      // Let pending hash navigation settle before scroll tracking can replace its destination.
      if (!isDetail && current && location.hash === `#${pageRef.current}` && current.dataset.view !== pageRef.current) {
        pageRef.current = current.dataset.view;
        setPage(current.dataset.view);
        // Update the address without adding history entries or moving keyboard focus.
        history.replaceState(null, '', `#${current.dataset.view}`);
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const visibility = () => {
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
      else schedule();
    };
    const resize = new ResizeObserver(schedule);
    sections.forEach(section => resize.observe(section));
    main.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    document.addEventListener('visibilitychange', visibility);
    motion.addEventListener('change', schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      main.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      document.removeEventListener('visibilitychange', visibility);
      motion.removeEventListener('change', schedule);
    };
  }, [isDetail, navigation.page]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content" onClick={(event) => {
        event.preventDefault();
        mainRef.current.focus({ preventScroll: true });
      }}>跳到主要内容</a>
      <AmbientLight />
      <SiteHeader page={page} />
      <main ref={mainRef} id="main-content" className="site-main" tabIndex="-1">
        {isDetail ? (
          <CurrentView key={navigation.page} page={navigation.page}
            backPage={originRef.current?.workId === navigation.page ? originRef.current.page : 'works'}
            sharedEntering={pendingRef.current?.toPage === navigation.page} />
        ) : (
          <div className="archive">
            {CHAPTERS.map(id => <CurrentView key={id} page={id} sharedEntering={pendingRef.current?.toPage === id} />)}
          </div>
        )}
      </main>
      <div ref={maskRef} className="chapter-mask" aria-hidden="true" />
      <div className="reading-progress" aria-hidden="true" />
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
