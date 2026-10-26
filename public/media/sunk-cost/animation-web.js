(() => {
  const stage = document.getElementById('stage');
  const frame = document.createElement('div');
  frame.id = 'web-stage';
  document.body.append(frame);
  frame.append(stage);
  const resize = () => {
    const scale = Math.min(frame.clientWidth / 1920, frame.clientHeight / 1080);
    stage.style.zoom = '1';
    stage.style.transformOrigin = '0 0';
    stage.style.transform = `scale(${scale})`;
    stage.style.left = `${(frame.clientWidth - 1920 * scale) / 2}px`;
    stage.style.top = `${(frame.clientHeight - 1080 * scale) / 2}px`;
  };
  window.addEventListener('resize', resize);
  resize();
  const setup = document.getElementById('setup');
  document.body.append(setup);
  document.querySelector('#setup .hint').textContent = '建议横屏观看。下方可暂停、拖动进度和重播；也可返回网站切换省流视频。';
  const controls = document.createElement('nav');
  controls.className = 'web-controls';
  controls.setAttribute('aria-label', '动画播放控制');
  controls.innerHTML = '<a href="/#work-film">返回网站</a><button id="web-play" disabled>播放</button><button id="web-replay" disabled>重播</button><button id="web-fullscreen">全屏</button><input id="web-seek" type="range" min="0" max="137.613063" value="0" step=".1" aria-label="播放进度" disabled><output id="web-time">0:00 / 2:18</output>';
  document.body.append(controls);
  const status = document.createElement('p');
  status.className = 'web-status';
  status.setAttribute('role', 'status');
  document.body.append(status);
  const play = document.getElementById('web-play');
  const replay = document.getElementById('web-replay');
  const seek = document.getElementById('web-seek');
  const time = document.getElementById('web-time');
  let dragging = false;
  const format = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  const syncControls = () => {
    if (!window.READY || document.hidden) return;
    const report = window.Film.report();
    play.disabled = replay.disabled = seek.disabled = false;
    play.textContent = report.playing || report.counting ? '暂停' : '播放';
    if (!dragging) { seek.value = String(report.time); time.textContent = `${format(report.time)} / 2:18`; }
  };
  const attempt = async action => {
    try { status.textContent = ''; await action(); }
    catch { status.textContent = '动画暂时无法播放，请返回网站切换省流视频。'; }
    syncControls();
  };
  const toggle = () => attempt(async () => {
    const report = window.Film.report();
    if (report.playing || report.counting) window.Film.pause();
    else await window.Film.play(report.ended ? 0 : report.time, false);
  });
  play.addEventListener('click', toggle);
  replay.addEventListener('click', () => attempt(() => window.Film.play(0, false)));
  document.getElementById('start').addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    attempt(() => window.Film.play(0, false));
  }, true);
  document.getElementById('web-fullscreen').addEventListener('click', () => attempt(async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    else status.textContent = '此浏览器不支持页面全屏，可以横屏观看。';
  }));
  seek.addEventListener('input', () => { dragging = true; time.textContent = `${format(Number(seek.value))} / 2:18`; });
  seek.addEventListener('change', () => attempt(async () => {
    const resume = window.Film.report().playing;
    window.Film.seek(Number(seek.value));
    dragging = false;
    if (resume) await window.Film.play(Number(seek.value), false);
  }));
  setInterval(syncControls, 500);
})();
