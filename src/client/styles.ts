export const styles = String.raw`
[data-usage-stats] {
  --us-bg: var(--dsw-alias-bg-base, #ffffff);
  --us-surface: color-mix(in srgb, var(--dsw-alias-bg-layer-1, #f5f5f5) 92%, var(--us-bg));
  --us-raised: var(--dsw-alias-bg-layer-2, #ffffff);
  --us-hover: var(--dsw-alias-interactive-bg-hover, #eef1f4);
  --us-text: var(--dsw-alias-label-primary, #17191c);
  --us-muted: var(--dsw-alias-label-secondary, #747b86);
  --us-border: var(--dsw-alias-border-l1, #e4e7eb);
  --us-accent: #1677ff;
  --us-blue-2: #65a9ff;
  --us-blue-3: #b9d9ff;
  --us-green: #2aa86f;
  --us-shadow-soft: 0 1px 2px rgba(18, 26, 41, .03), 0 8px 28px rgba(18, 26, 41, .035);
  color: var(--us-text);
  font-family: var(--dsw-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif);
  font-size: 14px;
  box-sizing: border-box;
}
[data-usage-stats], [data-usage-stats] button, [data-usage-stats] input, [data-usage-stats] select, [data-usage-stats] table { font-family: var(--dsw-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif); }
body[data-ds-dark-theme] [data-usage-stats] {
    --us-bg: var(--dsw-alias-bg-base, #18191c);
    --us-surface: var(--dsw-alias-bg-layer-1, #222428);
    --us-raised: var(--dsw-alias-bg-layer-2, #292b30);
    --us-hover: var(--dsw-alias-interactive-bg-hover, #31343a);
    --us-text: var(--dsw-alias-label-primary, #f2f3f5);
    --us-muted: var(--dsw-alias-label-secondary, #a6acb5);
    --us-border: var(--dsw-alias-border-l1, #35383e);
}
[data-usage-stats] *, [data-usage-stats] *::before, [data-usage-stats] *::after { box-sizing: border-box; }
.us-nav { width: 100%; height: 38px; border: 0; border-radius: 10px; display: flex; align-items: center; justify-content: flex-start; gap: 10px; padding: 0 10px; color: var(--us-muted); background: transparent; cursor: pointer; font: inherit; }
.us-nav:hover { color: var(--us-text); background: var(--us-hover); }
.us-nav[data-rail="true"] { width: 36px; padding: 0; justify-content: center; }
.us-nav svg { flex: none; }
.us-shell { position: absolute; inset: 0; display: flex; flex-direction: column; background: var(--us-bg); overflow: hidden; animation: us-enter 180ms ease-out; }
.us-top { min-height: 90px; flex: none; display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 18px clamp(24px, 4vw, 58px) 10px; }
.us-heading { display: flex; align-items: flex-end; gap: 20px; }
.us-title { font-size: clamp(28px, 3vw, 40px); line-height: 1.12; font-weight: 750; letter-spacing: -.045em; }
.us-tab { position: relative; padding: 0 2px 9px; font-size: 16px; color: var(--us-text); }
.us-tab::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 3px; border-radius: 2px; background: var(--us-text); }
.us-back { height: 40px; display: inline-flex; align-items: center; gap: 7px; border: 0; border-radius: 12px; padding: 0 14px; color: var(--us-muted); background: transparent; cursor: pointer; font: inherit; transition: color 150ms ease, background 150ms ease, transform 150ms ease; }
.us-back:hover { color: var(--us-text); background: var(--us-hover); transform: translateX(-2px); }
.us-close, .us-icon-btn { margin-left: auto; width: 36px; height: 36px; display: grid; place-items: center; border: 0; border-radius: 10px; color: var(--us-muted); background: transparent; cursor: pointer; }
.us-close:hover, .us-icon-btn:hover { color: var(--us-text); background: var(--us-hover); }
.us-scroll { overflow: auto; scrollbar-gutter: stable; padding: 10px clamp(24px, 4vw, 58px) 40px; }
.us-content { width: min(1180px, 100%); margin: 0 auto; }
.us-range-row { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin: 0 0 12px; }
.us-range-label { font-size: 16px; font-weight: 520; }
.us-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 14px; }
.us-filterbar { padding: 10px; border: 1px solid color-mix(in srgb, var(--us-border) 72%, transparent); border-radius: 14px; background: color-mix(in srgb, var(--us-surface) 70%, transparent); }
.us-segment { display: inline-flex; gap: 3px; padding: 3px; border: 1px solid var(--us-border); border-radius: 11px; background: var(--us-raised); }
.us-segment button { border: 0; min-width: 98px; padding: 7px 13px; border-radius: 8px; color: var(--us-muted); background: transparent; cursor: pointer; font: inherit; white-space: nowrap; }
.us-segment button[aria-pressed="true"] { color: var(--us-text); background: var(--us-hover); box-shadow: 0 1px 3px rgba(0,0,0,.06); }
.us-field { height: 38px; min-width: 150px; max-width: 260px; padding: 0 32px 0 11px; border: 1px solid transparent; border-radius: 10px; color: var(--us-text); background: var(--us-raised); font: inherit; outline: none; transition: border-color 140ms ease, box-shadow 140ms ease; }
.us-field:hover { border-color: var(--us-border); }
.us-field:focus { border-color: color-mix(in srgb, var(--us-accent) 58%, var(--us-border)); box-shadow: 0 0 0 3px color-mix(in srgb, var(--us-accent) 12%, transparent); }
.us-select { position: relative; min-width: 190px; max-width: 280px; }
.us-select-trigger { width: 100%; height: 38px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 11px; border: 1px solid transparent; border-radius: 10px; color: var(--us-text); background: var(--us-raised); cursor: pointer; font: inherit; text-align: left; outline: none; transition: border-color 140ms ease, box-shadow 140ms ease; }
.us-select-trigger span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.us-select-trigger svg { flex: none; transition: transform 160ms ease; }
.us-select[data-open] .us-select-trigger svg { transform: rotate(180deg); }
.us-select-trigger:hover { border-color: var(--us-border); }
.us-select-trigger:focus-visible, .us-select[data-open] .us-select-trigger { border-color: color-mix(in srgb, var(--us-accent) 58%, var(--us-border)); box-shadow: 0 0 0 3px color-mix(in srgb, var(--us-accent) 12%, transparent); }
.us-select-menu { position: absolute; z-index: 80; top: calc(100% + 6px); left: 0; right: 0; max-height: 248px; display: grid; gap: 4px; overflow-y: auto; padding: 5px; border: 1px solid var(--us-border); border-radius: 10px; color: var(--us-text); background: var(--us-raised); box-shadow: 0 12px 34px rgba(0,0,0,.14); animation: us-select-in 130ms ease-out; }
.us-select-menu button { width: 100%; min-height: 34px; display: block; overflow: hidden; padding: 6px 10px; border: 0; border-radius: 7px; color: inherit; background: transparent; cursor: pointer; font: inherit; text-align: left; text-overflow: ellipsis; white-space: nowrap; }
.us-select-menu button:hover { background: var(--us-hover); }
.us-select-menu button[aria-selected="true"] { color: var(--us-accent); background: color-mix(in srgb, var(--us-accent) 10%, transparent); }
.us-spacer { flex: 1; }
.us-export { height: 38px; display: inline-flex; align-items: center; gap: 7px; border: 0; border-radius: 10px; padding: 0 12px; background: transparent; color: var(--us-muted); text-decoration: none; font-size: 13px; transition: color 140ms ease, background 140ms ease; }
.us-export:hover { color: var(--us-text); background: var(--us-raised); }
.us-cards { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 12px; }
.us-card, .us-panel { border: 1px solid color-mix(in srgb, var(--us-border) 55%, transparent); background: var(--us-surface); border-radius: 16px; box-shadow: var(--us-shadow-soft); }
.us-card { min-height: 112px; padding: 17px 18px; transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease; animation: us-card-in 320ms both; }
.us-card:nth-child(2) { animation-delay: 35ms; } .us-card:nth-child(3) { animation-delay: 70ms; } .us-card:nth-child(4) { animation-delay: 105ms; } .us-card:nth-child(5) { animation-delay: 140ms; } .us-card:nth-child(6) { animation-delay: 175ms; }
.us-card:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--us-border) 88%, transparent); box-shadow: 0 2px 3px rgba(18,26,41,.04), 0 14px 36px rgba(18,26,41,.07); }
.us-card-label { display: flex; align-items: center; gap: 8px; color: var(--us-muted); font-size: 14px; }
.us-card-value { margin-top: 10px; font-size: clamp(29px,3vw,38px); line-height: 1; font-weight: 700; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
.us-card-detail { margin-top: 8px; color: var(--us-muted); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.us-panel { margin-top: 14px; padding: 18px 20px; overflow: hidden; animation: us-panel-in 380ms 90ms both; }
.us-panel-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.us-panel-title { font-size: 16px; font-weight: 620; }
.us-panel-note { color: var(--us-muted); font-size: 12px; }
.us-heat-panel { overflow: visible; }
.us-heat-scroll { display: flex; align-items: flex-start; gap: 8px; width: 100%; overflow: visible; padding: 8px 4px 18px; }
.us-heat-week { flex: none; display: grid; grid-template-rows: repeat(7, 15px); gap: 4px; width: 14px; color: var(--us-muted); font-size: 10px; line-height: 15px; }
.us-heat-week span:nth-child(2) { grid-row: 3; }
.us-heat-week span:nth-child(3) { grid-row: 5; }
.us-heat { flex: 1; min-width: 0; display: grid; grid-template-rows: repeat(7, auto); grid-template-columns: repeat(53, minmax(0, 1fr)); grid-auto-flow: column; gap: clamp(2px, .28vw, 4px); width: 100%; }
.us-cell { width: 100%; max-width: 15px; aspect-ratio: 1; justify-self: center; border-radius: 3px; display: inline-block; background: color-mix(in srgb, var(--us-border) 66%, transparent); }
.us-cell[data-level="1"] { background: #d6e9ff; }
.us-cell[data-level="2"] { background: #a9d1ff; }
.us-cell[data-level="3"] { background: #72b2ff; }
.us-cell[data-level="4"] { background: #368ef2; }
.us-cell[data-level="5"] { background: #1068ca; }
body[data-ds-dark-theme] .us-cell[data-level="1"] { background: #173b63; }
body[data-ds-dark-theme] .us-cell[data-level="2"] { background: #1d568f; }
body[data-ds-dark-theme] .us-cell[data-level="3"] { background: #2173bd; }
body[data-ds-dark-theme] .us-cell[data-level="4"] { background: #2b91e9; }
body[data-ds-dark-theme] .us-cell[data-level="5"] { background: #67b7ff; }
.us-heat-legend { display: inline-flex; align-items: center; gap: 5px; }
.us-heat-legend .us-cell { width: 16px; height: 16px; }
.us-cell-tip { position: relative; cursor: default; outline: none; transition: transform 90ms ease, box-shadow 90ms ease; }
.us-cell-tip:hover, .us-cell-tip:focus-visible { box-shadow: 0 0 0 2px var(--us-bg), 0 0 0 3px var(--us-text); z-index: 3; }
.us-cell-tip:hover, .us-cell-tip:focus-visible { transform: scale(1.12); }
.us-floating-tip { position: fixed; z-index: 200; transform: translate(-50%, -100%); width: max-content; max-width: min(360px, calc(100vw - 24px)); padding: 9px 11px; border: 1px solid var(--us-border); border-radius: 10px; color: var(--us-text); background: color-mix(in srgb, var(--us-raised) 94%, transparent); box-shadow: 0 12px 38px rgba(0,0,0,.16); backdrop-filter: blur(14px); font-size: 12px; line-height: 1.4; pointer-events: none; animation: us-tip-in 110ms ease-out; }
.us-trend { padding: 22px 22px 18px; }
.us-chart-frame { position: relative; height: 330px; padding: 0 8px; border-radius: 12px; background: color-mix(in srgb, var(--us-raised) 38%, transparent); overflow: hidden; }
.us-grid-lines { position: absolute; inset: 26px 36px 47px; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none; }
.us-grid-lines i { display: block; width: 100%; border-top: 1px dashed color-mix(in srgb, var(--us-border) 72%, transparent); }
.us-chart-scroll { position: relative; height: 100%; width: 100%; overflow: hidden; }
.us-chart { height: 100%; width: 100%; min-width: 0; display: flex; align-items: stretch; gap: clamp(8px, 1.4vw, 24px); padding: 26px 36px 0; }
.us-chart[data-dense="true"] { gap: clamp(2px, .35vw, 6px); }
.us-bar-column { min-width: 0; flex: 1 1 0; height: 100%; display: grid; grid-template-rows: minmax(0, 1fr) 46px; align-items: end; }
.us-bar-wrap { width: min(68%, 76px); min-width: 3px; height: 100%; justify-self: center; display: flex; flex-direction: column-reverse; justify-content: flex-start; border-bottom: 1px solid color-mix(in srgb, var(--us-border) 90%, transparent); }
.us-chart[data-dense="true"] .us-bar-wrap { width: clamp(4px, 58%, 22px); }
.us-bar-hit { width: 100%; display: flex; flex-direction: column-reverse; justify-content: flex-start; border-radius: 3px 3px 0 0; outline: none; cursor: default; }
.us-bar-hit:focus-visible { box-shadow: 0 0 0 2px var(--us-bg), 0 0 0 3px var(--us-text); }
.us-bar-segment { flex: none; width: 100%; min-height: 1px; transform-origin: bottom; animation: us-bar-in 560ms cubic-bezier(.2,.8,.2,1) both; transition: filter 140ms ease, opacity 140ms ease; }
.us-bar-segment:last-child { border-radius: 3px 3px 0 0; }
.us-bar-hit:hover .us-bar-segment { filter: saturate(1.12) brightness(1.04); }
.us-date-label { align-self: start; justify-self: center; min-width: 68px; padding-top: 12px; color: var(--us-muted); font-size: 12px; line-height: 20px; text-align: center; white-space: nowrap; }
.us-legend { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 14px 28px; margin-top: 16px; color: var(--us-muted); font-size: 13px; }
.us-chart-tip { position: fixed; z-index: 220; transform: translate(-50%, -50%); min-width: 260px; max-width: min(390px, calc(100vw - 24px)); padding: 12px 14px; border: 1px solid var(--us-border); border-radius: 11px; color: var(--us-text); background: color-mix(in srgb, var(--us-raised) 96%, transparent); box-shadow: 0 14px 38px rgba(0,0,0,.16); backdrop-filter: blur(14px); pointer-events: none; animation: us-chart-tip-in 120ms ease-out; }
.us-chart-tip-head { display: flex; align-items: baseline; gap: 14px; margin-bottom: 8px; font-size: 15px; white-space: nowrap; }
.us-chart-tip-head strong { font-weight: 600; }
.us-chart-tip-head span { color: var(--us-text); }
.us-chart-tip-row { display: grid; grid-template-columns: 5px minmax(0, 1fr) auto; align-items: center; gap: 10px; min-height: 25px; }
.us-chart-tip-row i { width: 5px; height: 18px; border-radius: 3px; }
.us-chart-tip-row span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 550; }
.us-chart-tip-row b { font-weight: 400; font-variant-numeric: tabular-nums; }
.us-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--us-accent); display: inline-block; margin-right: 6px; }
.us-model-layout { display: grid; grid-template-columns: 230px 1fr; align-items: center; gap: 28px; }
.us-donut { width: 190px; aspect-ratio: 1; margin: auto; border-radius: 50%; display: grid; place-items: center; background: conic-gradient(var(--us-accent) 0 var(--us-p1), var(--us-green) var(--us-p1) var(--us-p2), var(--us-blue-3) var(--us-p2)); position: relative; }
.us-donut::after { content: ''; position: absolute; inset: 28px; border-radius: 50%; background: var(--us-surface); }
.us-donut-center { z-index: 1; text-align: center; font-weight: 700; font-size: 23px; }
.us-donut-center small { display: block; margin-top: 3px; color: var(--us-muted); font-weight: 400; font-size: 11px; }
.us-model-row { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 8px 16px; padding: 12px 0; border-bottom: 1px solid var(--us-border); }
.us-model-row:last-child { border-bottom: 0; }
.us-model-name { font-weight: 580; overflow: hidden; text-overflow: ellipsis; }
.us-model-meta, .us-model-percent { color: var(--us-muted); font-size: 12px; }
.us-breakdown { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0; }
.us-break-item { min-width: 0; padding: 5px 14px 3px; border-left: 1px solid color-mix(in srgb, var(--us-border) 65%, transparent); background: transparent; }
.us-break-item:first-child { padding-left: 0; border-left: 0; }
.us-break-item span { display: block; color: var(--us-muted); font-size: 13px; margin-bottom: 5px; }
.us-break-item strong { font-size: 18px; font-weight: 600; font-variant-numeric: tabular-nums; }
.us-state { min-height: 420px; display: grid; place-items: center; color: var(--us-muted); text-align: center; }
.us-spinner { width: 28px; height: 28px; margin: 0 auto 14px; border: 3px solid var(--us-border); border-top-color: var(--us-accent); border-radius: 50%; animation: us-spin .8s linear infinite; }
@keyframes us-spin { to { transform: rotate(360deg); } }
@keyframes us-enter { from { opacity: 0; transform: translateY(4px); } }
@keyframes us-card-in { from { opacity: 0; transform: translateY(8px); } }
@keyframes us-panel-in { from { opacity: 0; transform: translateY(10px); } }
@keyframes us-bar-in { from { transform: scaleY(0); opacity: .25; } }
@keyframes us-tip-in { from { opacity: 0; transform: translate(-50%, calc(-100% + 4px)); } }
@keyframes us-select-in { from { opacity: 0; transform: translateY(-4px) scale(.985); } }
@keyframes us-chart-tip-in { from { opacity: 0; transform: translate(-50%, calc(-50% + 4px)) scale(.985); } }
@media (max-width: 760px) { .us-top { min-height: 88px; } .us-heading { gap: 12px; } .us-tab { display: none; } .us-cards { grid-template-columns: repeat(2,minmax(0,1fr)); } .us-model-layout { grid-template-columns: 1fr; } .us-breakdown { grid-template-columns: repeat(2,1fr); } .us-chart-frame { height: 280px; } .us-legend { justify-content: flex-start; } }
@media (max-width: 480px) { .us-cards { grid-template-columns: 1fr; } .us-toolbar { align-items: stretch; } .us-field, .us-select { max-width:none; flex:1; } }
@media (prefers-reduced-motion: reduce) { .us-shell, .us-spinner, .us-bar-segment, .us-card, .us-panel, .us-floating-tip, .us-chart-tip { animation: none; transition: none; } }
.us-calls-wrap { overflow: visible; }
.us-calls-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-bottom: 12px; }
.us-calls-select { min-width: 180px; max-width: 240px; }
.us-calls-select .us-select-trigger { height: 34px; border-color: var(--us-border); }
.us-calls-select .us-select-menu { min-width: 100%; width: max-content; max-width: min(320px, calc(100vw - 32px)); }
.us-calls-number-field { height: 34px; width: 150px; display: flex; align-items: center; border: 1px solid var(--us-border); border-radius: 10px; color: var(--us-muted); background: var(--us-raised); transition: border-color 140ms ease, box-shadow 140ms ease; }
.us-calls-number-field:focus-within { border-color: color-mix(in srgb, var(--us-accent) 58%, var(--us-border)); box-shadow: 0 0 0 3px color-mix(in srgb, var(--us-accent) 10%, transparent); }
.us-calls-number-input { height: 32px; width: 92px; min-width: 0; padding: 0 0 0 10px; border: 0; outline: none; color: var(--us-text); background: transparent; font: inherit; }
.us-calls-number-field > span { padding: 0 9px 0 6px; font-size: 11px; color: var(--us-muted); }
.us-calls-clear { height: 34px; padding: 0 10px; border: 0; border-radius: 9px; color: var(--us-muted); background: transparent; cursor: pointer; font: inherit; transition: color 140ms ease, background 140ms ease; }
.us-calls-clear:hover { color: var(--us-text); background: var(--us-hover); }
.us-calls-page-size { min-width: 110px; }
.us-calls-max-records { min-width: 150px; }
.us-calls-table { width: 100%; table-layout: fixed; border-collapse: separate; border-spacing: 0 2px; font-size: 13px; }
.us-calls-table col { width: calc(100% / 7); }
.us-calls-table th { position: sticky; z-index: 2; top: 0; padding: 9px 10px; text-align: left; color: var(--us-muted); font-size: 12px; font-weight: 560; border-bottom: 1px solid var(--us-border); background: color-mix(in srgb, var(--us-surface) 96%, var(--us-raised)); white-space: nowrap; }
.us-calls-table td { padding: 9px 10px; box-shadow: inset 0 -1px color-mix(in srgb, var(--us-border) 48%, transparent); background-clip: padding-box; font-variant-numeric: tabular-nums; white-space: nowrap; transition: background 120ms ease, box-shadow 120ms ease; }
.us-calls-table tbody td:first-child { border-radius: 10px 0 0 10px; }
.us-calls-table tbody td:last-child { border-radius: 0 10px 10px 0; }
.us-calls-table tbody tr:hover td { background: color-mix(in srgb, var(--us-hover) 76%, transparent); box-shadow: none; }
.us-calls-table .us-number, .us-calls-table .us-center { text-align: left; font-variant-numeric: tabular-nums; }
.us-calls-time { color: var(--us-muted); }
.us-calls-model { max-width: 220px; overflow: hidden; text-overflow: ellipsis; }
.us-calls-effort.is-empty { color: var(--us-muted); }
.us-calls-pager { display: flex; align-items: center; gap: 12px; justify-content: flex-end; margin-top: 12px; color: var(--us-muted); font-size: 12px; }
.us-calls-page-buttons { display: inline-flex; gap: 4px; }
.us-calls-pager button { width: 28px; height: 28px; display: grid; place-items: center; padding: 0; border: 1px solid var(--us-border); border-radius: 8px; color: var(--us-text); background: var(--us-raised); cursor: pointer; font: inherit; transition: background 120ms ease, border-color 120ms ease; }
.us-calls-pager button:hover:not(:disabled) { border-color: color-mix(in srgb, var(--us-border) 70%, var(--us-text)); background: var(--us-hover); }
.us-calls-pager button svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
.us-calls-pager button:disabled { opacity: .45; cursor: default; }
@media (max-width: 760px) {
  .us-calls-toolbar .us-spacer { display: none; }
  .us-calls-select { flex: 1 1 180px; min-width: 0; max-width: none; }
  .us-calls-number-field { flex: 1 1 150px; width: auto; min-width: 0; }
  .us-calls-page-size { flex: 1 1 130px; }
  .us-calls-max-records { flex: 1 1 160px; }
}
@media (max-width: 480px) {
  .us-calls-wrap { overflow-x: auto; }
  .us-calls-select, .us-calls-number-field, .us-calls-page-size { flex-basis: 100%; width: 100%; }
  .us-calls-pager { justify-content: space-between; }
}
`
