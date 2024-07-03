import type { Action } from 'svelte/action';

interface ShineEffectParameters {
  interval?: number;
  duration?: number;
  enabled?: boolean;
}

export const shineEffect: Action<HTMLElement, ShineEffectParameters> = (node, initialParameters = {}) => {
  let { interval = 10000, duration = 700, enabled = true } = initialParameters;
  let intervalId: number | undefined;

  // スタイルを動的に追加
  const style = document.createElement('style');
  const className = `shine-effect-${Math.random().toString(36).substr(2, 9)}`;
  const updateStyle = () => {
    style.textContent = `
      .${className} {
        position: relative;
        overflow: hidden;
      }
      .${className}::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -100%;
        width: 100%;
        height: 200%;
        background: linear-gradient(
          to right,
          rgba(255,255,255,0) 0%,
          rgba(255,255,255,0.8) 50%,
          rgba(255,255,255,0) 100%
        );
        transform: rotate(25deg);
      }
      .${className}.shine::before {
        animation: shine-${className} ${duration}ms linear;
      }
      @keyframes shine-${className} {
        0% { left: -100%; }
        100% { left: 150%; }
      }
    `;
  };
  updateStyle();
  document.head.appendChild(style);

  // クラスを適用
  node.classList.add(className);

  // 光る効果を開始
  const startShine = () => {
    if (!enabled) return;
    console.log('Starting shine effect'); // デバッグ用ログ
    node.classList.remove('shine');
    void node.offsetWidth; // 強制的にリフロー
    node.classList.add('shine');
    setTimeout(() => {
      node.classList.remove('shine');
    }, duration);
  };

  // インターバルを設定
  const setupInterval = () => {
    if (intervalId) clearInterval(intervalId);
    if (enabled) {
      intervalId = window.setInterval(startShine, interval);
    }
  };

  // 初期化
  if (enabled) {
    startShine();
    setupInterval();
  }

  return {
    destroy() {
      // クリーンアップ: スタイルとインターバルを削除
      document.head.removeChild(style);
      if (intervalId) clearInterval(intervalId);
    },
    update(newParameters: ShineEffectParameters) {
      const { interval: newInterval, duration: newDuration, enabled: newEnabled } = newParameters;
      let updated = false;

      if (newInterval !== undefined && newInterval !== interval) {
        interval = newInterval;
        updated = true;
      }
      if (newDuration !== undefined && newDuration !== duration) {
        duration = newDuration;
        updated = true;
      }
      if (newEnabled !== undefined && newEnabled !== enabled) {
        enabled = newEnabled;
        updated = true;
      }

      if (updated) {
        updateStyle();
        setupInterval();
      }
    }
  };
};