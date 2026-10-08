import './style.css';
import { createIcons, VolumeX, Volume2, Maximize, Minimize, Minimize2, ArrowUpRight, Pause, Play, Camera } from 'lucide';
import { createScene } from './scene.js';
import { createAmbience } from './audio.js';

// Experience: an unframed moonlit garden, scarlet botanical detail, silver water.
// First viewport: title left, sculpted flowers right, open river through the middle.
const icons = { VolumeX, Volume2, Maximize, Minimize, Minimize2, ArrowUpRight, Pause, Play, Camera };
createIcons({ icons });
const $ = (selector) => document.querySelector(selector);
const ambience = createAmbience();
let noticeTimer;
function notify(message) {
  clearTimeout(noticeTimer);
  $('#notice').textContent = message;
  $('#notice').classList.add('visible');
  noticeTimer = setTimeout(() => $('#notice').classList.remove('visible'), 2600);
}
function replaceIcon(button, name) {
  button.innerHTML = `<i data-lucide="${name}"></i>`;
  createIcons({ icons });
}
$('#retry-button').addEventListener('click', () => location.reload());

try {
  const scene = await createScene($('#scene'));
  $('#loading-state').classList.add('ready');
  window.__sceneDiagnostics = () => scene.diagnostics();
  function updatePauseButton() {
    const paused = scene.paused;
    const button = $('#pause-button');
    button.setAttribute('aria-pressed', String(paused));
    button.setAttribute('aria-label', paused ? '继续动态' : '暂停动态');
    button.dataset.tooltip = paused ? '继续动态' : '暂停动态';
    replaceIcon(button, paused ? 'play' : 'pause');
  }
  updatePauseButton();
  const captions = { moon: '月照忘川，花开彼岸', ember: '余晖未尽，一念如燃', mist: '雾起无声，花落有期' };
  document.querySelectorAll('.scene-option').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.scene-option').forEach((option) => {
        const selected = option === button;
        option.classList.toggle('active', selected);
        option.setAttribute('aria-pressed', String(selected));
      });
      scene.setMode(button.dataset.mode);
      ambience.setMode(button.dataset.mode);
      $('#scene-caption').textContent = captions[button.dataset.mode];
      document.body.dataset.mode = button.dataset.mode;
    });
  });
  function setImmersed(value) {
    document.body.classList.toggle('immersed', value);
    document.querySelectorAll('.chrome').forEach((element) => { element.inert = value; });
    $('#exit-button').inert = !value;
    scene.setImmersed(value);
    (value ? $('#exit-button') : $('#enter-button')).focus({ preventScroll: true });
  }
  $('#exit-button').inert = true;
  $('#enter-button').addEventListener('click', () => setImmersed(true));
  $('#exit-button').addEventListener('click', () => setImmersed(false));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && document.body.classList.contains('immersed')) setImmersed(false); });
  $('#sound-button').addEventListener('click', async () => {
    try {
      const enabled = await ambience.toggle();
      const button = $('#sound-button');
      button.setAttribute('aria-pressed', String(enabled));
      button.setAttribute('aria-label', enabled ? '关闭环境音' : '开启环境音');
      replaceIcon(button, enabled ? 'volume-2' : 'volume-x');
    } catch { notify('环境音暂不可用'); }
  });
  $('#pause-button').addEventListener('click', () => { scene.setPaused(!scene.paused); updatePauseButton(); });
  $('#capture-button').addEventListener('click', async () => {
    const button = $('#capture-button');
    button.disabled = true;
    try {
      const blob = await scene.capture();
      if (!blob) throw new Error('Empty capture');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `other-shore-${document.body.dataset.mode || 'moon'}.png`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      notify('此刻，已珍藏');
    } catch { notify('画面保存失败，请重试'); }
    finally { button.disabled = false; }
  });
  const fullscreenButton = $('#fullscreen-button');
  if (!document.fullscreenEnabled) fullscreenButton.hidden = true;
  fullscreenButton.addEventListener('click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { notify('当前浏览器暂不支持全屏'); }
  });
  document.addEventListener('fullscreenchange', () => {
    const active = Boolean(document.fullscreenElement);
    fullscreenButton.setAttribute('aria-label', active ? '退出全屏' : '全屏');
    fullscreenButton.dataset.tooltip = active ? '退出全屏' : '全屏';
    replaceIcon(fullscreenButton, active ? 'minimize' : 'maximize');
  });
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  motionPreference.addEventListener('change', (event) => { scene.setPaused(event.matches); updatePauseButton(); });
  $('#scene canvas').addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    $('#error-state').hidden = false;
    $('#loading-state').hidden = true;
  });
  window.addEventListener('pagehide', () => { scene.dispose(); ambience.dispose(); });
} catch (error) {
  console.error('Scene initialization failed:', error);
  $('#loading-state').hidden = true;
  $('#error-state').hidden = false;
}
