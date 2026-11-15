import { CONFIG } from '../config.js';
import { cleanName, format } from '../core/utils.js';
import { Profile } from './profile.js';

const $ = (id) => document.getElementById(id);
const KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'];

/** HTML screens (menu, join, wait, end…) layered over the canvas. */
export class UI {
  constructor(app) {
    this.app = app;
    this.profile = Profile.load();
    this.joinDigits = '';
    this.current = 'menu';
    this.buildMenu();
    this.buildKeypad();
    this.buildLevels();
    this.bind();
  }

  show(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('on', s.id === `scr-${name}`));
    document.body.classList.toggle('overlay', !!name);
    this.current = name;
  }

  showMessage(screen, elementId, text) {
    $(elementId).textContent = text;
    this.show(screen);
  }

  buildChoices(container, items, { isSelected, decorate, pick, className }) {
    container.replaceChildren(...items.map(item => {
      const b = document.createElement('button');
      b.className = className + (isSelected(item) ? ' sel' : '');
      decorate(b, item);
      b.addEventListener('click', () => { pick(item); this.readProfile(); this.buildMenu(); });
      return b;
    }));
  }

  buildMenu() {
    const p = this.profile;
    $('in-name').value = p.name;
    this.buildChoices($('colors'), CONFIG.colors, {
      isSelected: c => c === p.color,
      decorate: (b, c) => { b.style.background = c; b.setAttribute('aria-label', c); },
      pick: c => { p.color = c; },
      className: 'swatch',
    });
    this.buildChoices($('durations'), CONFIG.match.durations, {
      isSelected: m => m === p.minutes,
      decorate: (b, m) => { b.textContent = format(CONFIG.text.minutes, { n: m }); },
      pick: m => { p.minutes = m; },
      className: 'chip',
    });
  }

  buildLevels() {
    $('levels').replaceChildren(...CONFIG.bot.levels.map(level => {
      const b = document.createElement('button');
      b.className = 'big purple';
      b.textContent = level.label;
      b.addEventListener('click', () => this.app.startSolo(level));
      return b;
    }));
  }

  buildKeypad() {
    $('keypad').replaceChildren(...KEYPAD.map(key => {
      const b = document.createElement('button');
      b.textContent = key;
      b.addEventListener('click', () => this.pressKey(key));
      return b;
    }));
  }

  pressKey(key) {
    const complete = () => this.joinDigits.length === CONFIG.net.codeLength;
    if (key === '✓') { if (complete()) this.app.startGuest(this.joinDigits); return; }
    if (key === '⌫') this.joinDigits = this.joinDigits.slice(0, -1);
    else if (!complete()) this.joinDigits += key;
    this.renderJoinCode();
  }

  renderJoinCode() {
    $('join-code').textContent = this.joinDigits.padEnd(CONFIG.net.codeLength, '_');
    $('btn-join-go').disabled = this.joinDigits.length !== CONFIG.net.codeLength;
  }

  readProfile() {
    this.profile.name = cleanName($('in-name').value, CONFIG.defaultNames[0]);
    Profile.save(this.profile);
    return { ...this.profile };
  }

  setNetwork(available) {
    $('btn-host').disabled = !available;
    $('btn-join').disabled = !available;
    $('net-status').textContent = available ? CONFIG.text.netReady : CONFIG.text.netOff;
  }

  showWait(code) { this.showMessage('wait', 'host-code', code); }

  showConnecting(text) { this.showMessage('connect', 'connect-text', text); }

  showError(text) { this.showMessage('error', 'error-text', text); }

  showEnd(state, canRequestOnly) {
    const [a, b] = state.sc;
    $('end-title').textContent = a === b ? CONFIG.text.draw : format(CONFIG.text.win, { name: state.tm[a > b ? 0 : 1].n });
    $('end-score').textContent = `${state.tm[0].n} ${a} – ${b} ${state.tm[1].n}`;
    const btn = $('btn-rematch');
    btn.disabled = false;
    btn.textContent = CONFIG.text.rematch;
    btn.dataset.requestOnly = canRequestOnly ? '1' : '';
    this.show('end');
  }

  bind() {
    const app = this.app;
    const withGesture = (fn) => () => { app.onGesture(); fn(); };
    $('btn-host').addEventListener('click', withGesture(() => app.startHost()));
    $('btn-local').addEventListener('click', withGesture(() => app.startLocal()));
    $('btn-solo').addEventListener('click', withGesture(() => this.show('solo')));
    $('btn-join').addEventListener('click', withGesture(() => { this.joinDigits = ''; this.renderJoinCode(); this.show('join'); }));
    $('btn-join-go').addEventListener('click', () => app.startGuest(this.joinDigits));
    $('btn-pause').addEventListener('click', () => { app.setPaused(true); this.show('pause'); });
    $('btn-resume').addEventListener('click', () => { app.setPaused(false); this.show(null); });
    $('btn-rematch').addEventListener('click', () => {
      const btn = $('btn-rematch');
      app.rematch();
      if (btn.dataset.requestOnly) { btn.disabled = true; btn.textContent = CONFIG.text.rematchAsked; }
    });
    document.querySelectorAll('[data-action=menu]').forEach(b => b.addEventListener('click', () => app.toMenu()));
  }
}
