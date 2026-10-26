import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import avatarUrl from './avatar.jpg';

const PAGE_IDS = ['top', 'works', 'work-film', 'work-qingping', 'work-site', 'work-dashboard', 'slices', 'about', 'contact'];
const CHAPTERS = ['top', 'works', 'slices', 'about', 'contact'];

const NAV_ITEMS = [
  { id: 'top', label: '首页' },
  { id: 'works', label: '作品' },
  { id: 'slices', label: '切片' },
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
        <span className="primary-nav__indicator" aria-hidden="true"
          onTransitionRun={trackIndicatorMotion}
          onTransitionEnd={trackIndicatorMotion}
          onTransitionCancel={trackIndicatorMotion} />
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
      <span className="work-visual__shape">
        {work.id === 'work-film' && <img src="/media/sunk-cost/poster.jpg" alt="" width="1600" height="900" />}
      </span>
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
          <span>这里收集网页、工具与影像，也记录把想法变成作品的过程。</span>
        </div>

        <div className="home__actions">
          <ArrowLink href="#works">查看作品</ArrowLink>
          <a className="text-link" href="#about">关于这个空间 <span aria-hidden="true">→</span></a>
        </div>
      </div>

      <a className="featured-work" href="#work-film" aria-label="观看精选短片：沉没成本">
        <WorkVisual work={WORKS[0]} className="featured-work__visual" />
        <div className="featured-work__copy">
          <span>FEATURED / 01</span>
          <div>
            <h2>沉没成本 · 动态短片</h2>
            <p>亲密关系中的一次重新判断。</p>
          </div>
          <span className="featured-work__arrow" aria-hidden="true">▶</span>
        </div>
        <span className="featured-work__watch">观看短片 <span>02:18 ↗</span></span>
      </a>

      <div className="home__foot">
        <p><span>LATEST</span> 新的表达，留在影像里。</p>
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
        <video ref={playerRef} controls playsInline preload="none" poster="/media/sunk-cost/poster.jpg" width="1600" height="900" aria-label="沉没成本完整短片，约2分18秒，音乐与屏幕文字，无旁白">
          <source src="/media/sunk-cost/film.mp4" type="video/mp4" />
          当前浏览器无法播放视频，<a href="/media/sunk-cost/film.mp4">打开完整短片</a>。
        </video>
        <span className="work-visual__shape film-player__shape" aria-hidden="true" />
      </div>
      <p className="film-player__note">点击播放 · 建议开启声音，全屏观看<span>完整短片 / 16:9</span></p>
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
  const slices = [
    ['09.29', '想弹会的一首歌', '最近在练吉他，想学会弹唱 h3R3 刘清云的《还是会想你》。现在还在慢慢练。'],
    ['09.29', '还在冲钻石', '最近在冲无畏契约的钻石段位，不过打得挺菜，打着打着就有点迷茫。'],
    ['09.29', '先做着玩', '还没想清楚为什么要做这个个人网站，就是想做着玩一下。先把喜欢的东西和折腾的过程放在这里。']
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
            <p>最近在练吉他，因为喜欢 h3R3 刘清云。最想学会弹唱的是《还是会想你》，现在还在慢慢练。</p>
            <p>也在冲无畏契约的钻石段位，不过打得挺菜，打着打着就有点迷茫。</p>
            <p>至于为什么做这个网站，其实还没想清楚。一开始就是想做着玩，那就先把喜欢的东西、折腾的过程，慢慢放在这里。</p>
          </div>
          <dl className="about-facts">
            <div><dt>正在练</dt><dd>吉他 ·《还是会想你》</dd></div>
            <div><dt>小目标</dt><dd>无畏契约打上钻石</dd></div>
            <div><dt>这个网站</dt><dd>先做着玩，慢慢想</dd></div>
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
          section.classList.add('is-revealed');
          const drift = Math.max(-70, Math.min(70, (height / 2 - top - section.offsetHeight / 2) * .12));
          section.style.setProperty('--drift', motion.matches ? '0px' : `${drift}px`);
        }
      }
      if (!isDetail && current && current.dataset.view !== pageRef.current) {
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
