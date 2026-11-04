// HTML rendering — the demo front-end recreates outgrid.io's experience
// with the browse mechanics from Outgrid's own design debates: a
// cinematic billboard, horizontal rails, hover-expand cards, a detail
// modal, My List and Continue Planning — in Outgrid's identity (dark
// slate #263646, cream #F4F0E8, gold accent), NOT a Netflix costume.
// Data comes only from the exported snapshot in data/. No live APIs.
import { loadData, getCity, getCountry } from "./records.js";
import { applyBrowse } from "./search.js";

export function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const CSS = `
  :root { --ink:#263646; --ink2:#1b2835; --cream:#F4F0E8; --line:#536373; --gold:#B7791F; --card:#fffdf8; }
  * { box-sizing:border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; margin:0; background:var(--cream); color:var(--ink); }
  header.top { background:var(--ink); color:var(--cream); padding:14px 4%; display:flex; justify-content:space-between; align-items:center; position:relative; z-index:50; }
  header.top .brand { font-size:21px; font-weight:bold; letter-spacing:.02em; }
  header.top .brand span { color:var(--gold); }
  header.top nav a { color:var(--cream); margin-left:16px; font-size:14px; text-decoration:none; opacity:.92; }
  main { max-width:1180px; margin:0 auto; padding:22px 16px 60px; }
  h2 { font-size:23px; margin:26px 0 12px; }
  a { color:var(--ink); }
  .note { font-size:13px; color:var(--line); line-height:1.5; }
  footer { color:var(--line); font-size:12px; text-align:center; padding:18px; }
  /* Billboard */
  .billboard { position:relative; min-height:64vh; display:flex; align-items:flex-end; color:var(--cream); background:linear-gradient(100deg,#0d4f5c 0%,#14606e 34%,#263646 78%); overflow:hidden; }
  .billboard::before { content:""; position:absolute; inset:0; background:
    repeating-linear-gradient(90deg, rgba(244,240,232,.05) 0 1px, transparent 1px 72px),
    repeating-linear-gradient(0deg, rgba(244,240,232,.05) 0 1px, transparent 1px 72px); }
  .billboard::after { content:""; position:absolute; inset:0; background:linear-gradient(to top, rgba(27,40,53,.92) 4%, transparent 55%); z-index:1; }
  .billboard .bb-bg { position:absolute; inset:-42px 0; background-size:cover; background-position:center; z-index:0; will-change:transform; }
  .billboard .bb-in { position:relative; z-index:2; padding:0 4% 42px; max-width:760px; }
  .billboard .kicker { text-transform:uppercase; letter-spacing:.22em; font-size:12px; color:#e8cf9a; margin-bottom:10px; }
  .billboard h1 { font-size:52px; line-height:1.04; margin:0 0 12px; }
  .billboard p.lede { font-size:17px; line-height:1.55; color:#e9e4d8; margin:0 0 16px; max-width:600px; }
  .chips { display:flex; gap:8px; flex-wrap:wrap; margin:10px 0 18px; }
  .mchip { border:1px solid rgba(244,240,232,.45); border-radius:999px; padding:4px 12px; font-size:13px; color:var(--cream); background:rgba(27,40,53,.35); }
  .mchip b { color:#e8cf9a; }
  .bb-cta { display:flex; gap:10px; flex-wrap:wrap; }
  .btn { display:inline-block; background:var(--cream); color:var(--ink); border:0; border-radius:8px; padding:11px 20px; font-size:15px; font-family:inherit; text-decoration:none; cursor:pointer; font-weight:bold; }
  .btn.dark { background:var(--ink); color:var(--cream); }
  .btn.ghost { background:rgba(244,240,232,.14); color:var(--cream); border:1px solid rgba(244,240,232,.5); font-weight:normal; }
  .btn.small { padding:7px 12px; font-size:13px; }
  /* AI search + sentence search */
  .searchdeck { max-width:1180px; margin:-34px auto 0; padding:0 16px; position:relative; z-index:5; }
  .searchcard { background:var(--card); border:1px solid #ddd5c3; border-radius:14px; padding:18px; box-shadow:0 14px 34px rgba(38,54,70,.18); }
  .searchcard h3 { margin:0 0 4px; font-size:18px; }
  .aisearch { display:flex; gap:8px; margin-top:10px; }
  .aisearch input { flex:1; font:inherit; font-size:16px; padding:11px 13px; border:1px solid #c9c0aa; border-radius:8px; }
  .sentence { margin-top:14px; font-size:15px; color:var(--line); line-height:2; }
  .sentence input, .sentence select { font:inherit; font-size:15px; border:0; border-bottom:2px solid var(--gold); background:transparent; padding:2px 4px; color:var(--ink); }
  .sentence input[type=number] { width:96px; }
  /* Place autocomplete (all cities + countries from the records) */
  .ac-wrap { position:relative; }
  .aisearch .ac-wrap { flex:1; display:flex; }
  .aisearch .ac-wrap input { flex:1; }
  .sentence .ac-wrap { display:inline-block; }
  .ac-list { position:absolute; top:calc(100% + 6px); left:0; right:0; min-width:260px; background:#fff; border:1px solid #ddd5c3; border-radius:10px; box-shadow:0 18px 40px rgba(38,54,70,.25); z-index:130; max-height:308px; overflow:auto; display:none; text-align:left; }
  .ac-list.open { display:block; }
  .ac-item { display:flex; justify-content:space-between; gap:12px; padding:9px 12px; cursor:pointer; font-size:14.5px; color:var(--ink); line-height:1.35; }
  .ac-item small { color:#8496a5; white-space:nowrap; }
  .ac-item.on, .ac-item:hover { background:#eef2f5; }
  /* Chips filter row */
  .filters { display:flex; gap:8px; flex-wrap:wrap; margin:12px 0 6px; align-items:center; }
  .filters a, .filters .chipbtn { border:1px solid #c9c0aa; background:var(--card); color:var(--ink); border-radius:999px; padding:5px 13px; font-size:13px; text-decoration:none; font-family:inherit; cursor:pointer; }
  .filters a.on, .filters .chipbtn.on { background:var(--ink); color:var(--cream); }
  .filters select { font:inherit; font-size:13px; padding:5px 8px; border:1px solid #c9c0aa; border-radius:999px; background:var(--card); }
  /* Rails */
  .rail { margin-top:30px; }
  .rail h2 { display:flex; align-items:baseline; gap:12px; margin:0 0 6px; padding:0 2px; }
  .rail h2 .explore { font-size:13px; color:var(--gold); opacity:0; transition:opacity .2s; font-weight:normal; }
  .rail:hover h2 .explore { opacity:1; }
  .rail .track { display:flex; gap:12px; overflow-x:auto; padding:14px 2px 18px; scroll-snap-type:x mandatory; scrollbar-width:thin; }
  /* Cards */
  .tcard { flex:0 0 248px; scroll-snap-align:start; background:var(--card); border:1px solid #ddd5c3; border-radius:12px; overflow:hidden; position:relative; transition:transform .22s ease, box-shadow .22s ease; }
  .tcard:hover { transform:scale(1.06); z-index:20; box-shadow:0 16px 38px rgba(38,54,70,.35); }
  .tcard .art { height:132px; position:relative; display:flex; align-items:flex-end; padding:10px 12px; color:var(--cream); overflow:hidden; }
  .tcard .art::before { content:""; position:absolute; inset:0; background:repeating-linear-gradient(90deg, rgba(244,240,232,.06) 0 1px, transparent 1px 34px), repeating-linear-gradient(0deg, rgba(244,240,232,.06) 0 1px, transparent 1px 34px); z-index:1; }
  .tcard .art img.ph { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:0; }
  .tcard .art .scrim { position:absolute; inset:0; background:linear-gradient(to top, rgba(27,40,53,.45), transparent 55%); z-index:1; }
  .tcard .art .initial { position:absolute; right:6px; top:-14px; font-size:104px; font-weight:bold; color:rgba(244,240,232,.16); line-height:1; z-index:1; }
  .tcard .art .flag { position:relative; font-size:22px; z-index:2; text-shadow:0 1px 6px rgba(0,0,0,.5); }
  .tcard .art .badge { position:relative; margin-left:auto; background:var(--ink); color:var(--cream); border-radius:6px; padding:3px 9px; font-size:12px; z-index:2; }
  .tcard .art .badge b { color:#e8cf9a; font-size:14px; }
  .tcard .tbody { padding:12px 13px 13px; }
  .tcard h3 { margin:0 0 2px; font-size:18px; }
  .tcard h3 a { text-decoration:none; }
  .tcard .sub { color:var(--line); font-size:12.5px; margin-bottom:7px; }
  .tcard p { font-size:13.5px; line-height:1.45; margin:4px 0; }
  .tag { display:inline-block; background:var(--cream); border:1px solid #ddd5c3; border-radius:999px; padding:2px 9px; font-size:11.5px; margin:2px 3px 2px 0; }
  .tcard .hover-panel { position:absolute; inset:auto 0 0 0; background:linear-gradient(transparent, rgba(27,40,53,.94) 45%); padding:30px 10px 10px; display:flex; gap:6px; opacity:0; transition:opacity .2s; }
  .tcard:hover .hover-panel { opacity:1; }
  .icon-btn { flex:1; text-align:center; background:rgba(244,240,232,.14); color:var(--cream); border:1px solid rgba(244,240,232,.55); border-radius:7px; padding:7px 4px; font-size:12.5px; text-decoration:none; cursor:pointer; font-family:inherit; }
  .icon-btn:hover { background:var(--cream); color:var(--ink); }
  .icon-btn.inlist { background:var(--gold); border-color:var(--gold); color:#fff; }
  /* Grid */
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(248px,1fr)); gap:14px; }
  .grid .tcard { flex:none; }
  .grid .tcard:hover { transform:scale(1.03); }
  /* Detail pages */
  .stats { display:flex; gap:14px; flex-wrap:wrap; background:#eef2f5; border-radius:10px; padding:12px 14px; margin:12px 0; }
  .stats div { font-size:13px; color:var(--line); } .stats b { display:block; font-size:17px; color:var(--ink); }
  .cols { display:grid; grid-template-columns:1fr 1fr; gap:16px; } @media (max-width:640px){ .cols{grid-template-columns:1fr;} .billboard h1{font-size:38px;} }
  .panel { background:var(--card); border:1px solid #ddd5c3; border-radius:12px; padding:16px 18px; }
  .panel h3 { margin-top:0; }
  ul.clean { list-style:none; padding:0; margin:8px 0; } ul.clean li { padding:7px 0; border-top:1px dashed #ddd5c3; font-size:15px; line-height:1.5; }
  ul.clean li:first-child { border-top:0; }
  .score { display:inline-block; background:var(--ink); color:var(--cream); border-radius:6px; padding:2px 8px; font-size:13px; }
  .flag { display:inline-block; background:#fdf0d5; color:#7a5210; border:1px solid #e6cf8f; border-radius:4px; padding:1px 7px; font-size:12px; margin-left:6px; }
  .fchip { display:inline-block; background:#eef2f5; border:1px solid #c8d2da; border-radius:999px; padding:3px 11px; font-size:13px; margin:2px 4px 2px 0; }
  /* Modal */
  .modal-veil { position:fixed; inset:0; background:rgba(27,40,53,.72); z-index:300; display:none; align-items:flex-start; justify-content:center; overflow-y:auto; padding:4vh 0; }
  .modal-veil.open { display:flex; }
  .modal { width:min(760px,94vw); background:var(--card); border-radius:12px; overflow:hidden; position:relative; box-shadow:0 30px 80px rgba(0,0,0,.5); }
  .modal .mhero { min-height:230px; color:var(--cream); display:flex; align-items:flex-end; padding:18px 22px; position:relative; overflow:hidden; }
  .modal .mhero .phimg { position:absolute; left:0; right:0; top:-46px; bottom:-46px; background-size:cover; background-position:center; z-index:0; will-change:transform; }
  .modal .mhero .mscrim { position:absolute; inset:0; background:linear-gradient(rgba(27,40,53,.14),rgba(27,40,53,.86)); z-index:1; }
  .modal .mhero .mtitle { position:relative; z-index:2; }
  @keyframes pop { from { transform:translateY(16px) scale(.98); opacity:0; } to { transform:none; opacity:1; } }
  .modal-veil.open .modal { animation:pop .24s ease; }
  .msec { margin-top:18px; }
  .msec h4 { margin:0 0 8px; font-size:16px; }
  .hoods { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:10px; }
  .hood { background:#eef2f5; border:1px solid #dbe3e9; border-radius:10px; padding:10px 12px; font-size:14px; line-height:1.45; }
  .hood b { display:block; margin-bottom:3px; }
  .xrow { display:flex; justify-content:space-between; gap:12px; padding:7px 0; border-bottom:1px dashed #ddd5c3; font-size:14.5px; }
  .xrow small { color:var(--line); white-space:nowrap; }
  ul.tick { margin:6px 0; padding-left:18px; line-height:1.55; font-size:14.5px; }
  .citychips { display:flex; flex-wrap:wrap; gap:8px; }
  .tcard .art { cursor:pointer; }
  .modal .mbody { padding:18px 22px 22px; }
  .modal .mclose { position:absolute; top:12px; right:12px; z-index:3; background:rgba(27,40,53,.55); color:var(--cream); border:1px solid rgba(244,240,232,.5); border-radius:50%; width:34px; height:34px; font-size:16px; cursor:pointer; }
  /* Intake + plan */
  form.intake { background:var(--card); border:1px solid #ddd5c3; border-radius:12px; padding:18px; display:grid; gap:10px; max-width:560px; }
  form.intake label { font-size:13px; color:var(--line); display:grid; gap:4px; }
  form.intake input, form.intake select { font:inherit; font-size:15px; padding:8px; border:1px solid #c9c0aa; border-radius:6px; }
  .day { background:var(--card); border:1px solid #ddd5c3; border-radius:12px; padding:16px 18px; margin:14px 0; }
  .day h3 { margin:0 0 10px; font-size:17px; }
  .item { border-top:1px dashed #ddd5c3; padding:10px 0; } .item:first-of-type { border-top:0; }
  .item h4 { margin:0 0 3px; font-size:15px; } .item p { margin:0; font-size:14px; line-height:1.5; }
  .meta { font-size:12px; color:var(--line); margin-top:4px; }
  .chip { display:inline-block; background:#eef2f5; border-radius:4px; padding:1px 6px; font-size:11px; text-transform:uppercase; letter-spacing:.04em; }
  .pflag { display:inline-block; background:#fdf0d5; color:#7a5210; border:1px solid #e6cf8f; border-radius:4px; padding:1px 7px; font-size:12px; margin-left:6px; }
  .summary { background:#eef2f5; border:1px solid #c8d2da; border-radius:12px; padding:14px 18px; font-size:14px; line-height:1.55; }
  .honest { font-style:italic; }
  /* Card refresh (Nov 4): icons, badges, always-visible trip tools */
  .ic { width:15px; height:15px; flex:0 0 auto; }
  .facts { display:flex; flex-wrap:wrap; gap:4px 14px; font-size:13.5px; margin:7px 0 2px; }
  .facts span { display:inline-flex; align-items:center; gap:5px; }
  .facts .ic { color:var(--gold); }
  .badges { display:flex; gap:6px; flex-wrap:wrap; margin:8px 0 0; }
  .bdg { display:inline-flex; align-items:center; gap:5px; border-radius:999px; padding:3px 10px; font-size:12px; border:1px solid #ddd5c3; background:var(--cream); }
  .bdg .ic { width:13px; height:13px; }
  .bdg.gold { background:#fdf0d5; border-color:#e6cf8f; color:#7a5210; }
  .bdg.good { background:#e7f2e4; border-color:#bcd8b2; color:#2e5b27; }
  .actions { display:flex; gap:6px; padding:0 13px 13px; flex-wrap:wrap; }
  .abtn { flex:1 1 30%; display:inline-flex; align-items:center; justify-content:center; gap:6px; background:var(--cream); border:1px solid #c9c0aa; color:var(--ink); border-radius:8px; padding:8px 6px; font-size:13px; font-family:inherit; cursor:pointer; text-decoration:none; white-space:nowrap; }
  .abtn:hover { border-color:var(--ink); }
  .abtn.primary { background:var(--ink); color:var(--cream); border-color:var(--ink); font-weight:bold; }
  .abtn.saved { background:var(--gold); border-color:var(--gold); color:#fff; }
  .abtn.hasnote { border-color:var(--gold); background:#fdf0d5; }
  .mynote { display:flex; gap:7px; background:#fdf6e0; border:1px dashed #e6cf8f; border-radius:8px; padding:7px 9px; font-size:13px; margin:9px 0 0; line-height:1.45; }
  .mynote .ic { color:var(--gold); margin-top:1px; }
  textarea.notebox { width:100%; font:inherit; font-size:14.5px; padding:9px 10px; border:1px solid #c9c0aa; border-radius:8px; min-height:62px; background:#fff; }
  .toolsrow { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
  /* Welcome pop-up (Nov 4) */
  .welcome-veil { position:fixed; inset:0; background:rgba(27,40,53,.74); z-index:400; display:none; align-items:center; justify-content:center; padding:16px; }
  .welcome-veil.open { display:flex; }
  .welcome { width:min(560px,94vw); background:var(--card); border-radius:14px; padding:26px 28px 22px; box-shadow:0 30px 80px rgba(0,0,0,.5); animation:pop .24s ease; max-height:92vh; overflow-y:auto; }
  .welcome h2 { margin:0 0 4px; font-size:27px; }
  .welcome .wsub { color:var(--line); font-size:14.5px; margin:0 0 8px; line-height:1.5; }
  .wrow { display:flex; gap:12px; margin:13px 0; font-size:15px; line-height:1.5; }
  .wrow .ic { width:22px; height:22px; color:var(--gold); margin-top:2px; }
  .wrow b { display:block; }
  /* Visa & stay page (Nov 4) */
  .passportbar { display:flex; gap:12px; align-items:center; flex-wrap:wrap; background:var(--card); border:1px solid #ddd5c3; border-radius:12px; padding:14px 18px; margin:14px 0; }
  .passportbar select { font:inherit; font-size:15px; padding:8px 10px; border:1px solid #c9c0aa; border-radius:8px; background:#fff; }
  /* Sidebar browse layout (Nov 4) */
  .browse-wrap { display:grid; grid-template-columns:234px 1fr; gap:22px; margin-top:44px; align-items:start; }
  .sidebar { position:sticky; top:14px; display:grid; gap:14px; }
  .side-panel { background:var(--card); border:1px solid #ddd5c3; border-radius:12px; padding:14px 16px; }
  .side-panel h3 { margin:0 0 10px; font-size:16px; }
  .side-link { display:block; padding:7px 8px; border-radius:8px; text-decoration:none; font-size:14.5px; }
  .side-link:hover { background:#eef2f5; }
  .side-panel label { display:grid; gap:4px; font-size:13px; color:var(--line); margin-bottom:10px; }
  .side-panel input, .side-panel select { font:inherit; font-size:14.5px; padding:7px 8px; border:1px solid #c9c0aa; border-radius:8px; color:var(--ink); background:#fff; width:100%; }
  .side-clear { display:inline-block; margin-top:8px; font-size:13px; }
  @media (max-width:840px){ .browse-wrap{grid-template-columns:1fr;} .sidebar{position:static;} }
  /* Plan-building progress overlay (Nov 4) */
  .buildveil { position:fixed; inset:0; background:rgba(27,40,53,.78); z-index:500; display:none; align-items:center; justify-content:center; padding:16px; }
  .buildveil.open { display:flex; }
  .buildcard { width:min(520px,94vw); background:var(--card); border-radius:14px; padding:26px 28px; box-shadow:0 30px 80px rgba(0,0,0,.5); }
  .spinner { width:34px; height:34px; border-radius:50%; border:4px solid #ddd5c3; border-top-color:var(--gold); animation:spin .9s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  .buildbar { height:8px; background:#e7e0cd; border-radius:99px; overflow:hidden; margin:16px 0 8px; }
  .buildbar i { display:block; height:100%; width:8%; background:var(--gold); border-radius:99px; transition:width 55s linear; }
`;

const REGION_ART = {
  Americas: "linear-gradient(120deg,#0d4f5c,#1d7285 55%,#263646)",
  Asia: "linear-gradient(120deg,#8a5a2b,#b7791f 55%,#263646)",
  Europe: "linear-gradient(120deg,#3d5a80,#5b7ea6 55%,#263646)",
};
const FALLBACK_ART = "linear-gradient(120deg,#40586e,#263646)";

function page(title, body, extra = "") {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · Outgrid</title><style>${CSS}</style></head>
<body>
<header class="top"><div class="brand">Out<span>grid</span></div><nav><a href="/">Destinations</a><a href="/#countries">Countries</a><a href="/visa">Visa &amp; stay</a><a href="/stay-rules">Stay Rules</a><a href="/plan">Plan a stay</a><a href="/evidence">Evidence</a><a href="/how-it-works">How it works</a></nav></header>
${body}
<footer>Outgrid Plan Agent — a hackathon demo recreating outgrid.io from an exported data snapshot. Demo only: no live data, no bookings, and the demo stores no account or intake data. Card artwork generated with Muse Image (Meta Model API) for this demo. Built for the Meta Global AI Developer Hackathon, Oct 27 – Nov 4, 2026.</footer>
${extra}
</body></html>`;
}

function money(n) {
  return n == null ? "—" : `$${Number(n).toLocaleString("en-US")}`;
}

// Inline SVG icons (stroke style, inherit colour) — no external icon
// library, so the pages stay self-contained under the CSP.
const ICON_PATHS = {
  wallet: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10.2h18M16.5 15h.9"/>',
  wifi: '<path d="M3.5 10a12.5 12.5 0 0 1 17 0"/><path d="M6.8 13.6a7.6 7.6 0 0 1 10.4 0"/><circle cx="12" cy="17.4" r="1.5" fill="currentColor" stroke="none"/>',
  shield: '<path d="M12 3l7 2.8v5.4c0 4.4-2.9 8-7 9.8-4.1-1.8-7-5.4-7-9.8V5.8z"/><path d="M9 11.8l2.1 2.1 4-4.2"/>',
  star: '<path d="M12 3.6l2.6 5.2 5.8.9-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.9z"/>',
  bookmark: '<path d="M6.5 3.5h11V21l-5.5-3.8L6.5 21z"/>',
  note: '<path d="M4 20h4.2L19.6 8.6a2.15 2.15 0 0 0-3-3L5.2 17z"/><path d="M13.8 6.4l3 3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M4.5 12.6l5 5L19.5 7"/>',
  pin: '<path d="M12 21.2S5.2 15.4 5.2 9.9a6.8 6.8 0 1 1 13.6 0c0 5.5-6.8 11.3-6.8 11.3z"/><circle cx="12" cy="9.9" r="2.6"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  compass: '<circle cx="12" cy="12" r="8.8"/><path d="M15.5 8.5l-2.1 5-5 2.1 2.1-5z"/>',
  sparkle: '<path d="M12 3.2l1.9 5.4 5.4 1.9-5.4 1.9L12 17.8l-1.9-5.4L4.7 10.5l5.4-1.9z"/><path d="M18.6 15.6l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z"/>',
  info: '<circle cx="12" cy="12" r="8.8"/><path d="M12 11v5M12 7.8v.3"/>',
  home: '<path d="M4 11.2L12 4l8 7.2"/><path d="M6.2 9.8V20h11.6V9.8"/>',
};
function icon(name) {
  return `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] ?? ""}</svg>`;
}
// Plain-language reads of the numbers, same wording family as the
// detail pop-up's decision aids.
function wifiWord(m) { return m >= 100 ? "Very fast" : m >= 50 ? "Fast" : m >= 25 ? "Workable" : "Basic"; }
function safetyWordShort(s) { return s >= 8 ? "High" : s >= 6.5 ? "Mid-range" : "Lower"; }
// Badges are computed from the record only — a badge appears because a
// number in the data earns it, never as decoration.
function cityBadges(c, country) {
  const out = [];
  if (country?.nomad_score != null) out.push(`<span class="bdg gold">${icon("star")} Nomad Score ${esc(country.nomad_score)}</span>`);
  if (c.monthly_cost_usd != null && c.monthly_cost_usd <= 1300) out.push(`<span class="bdg good">${icon("wallet")} Under $1,300/mo</span>`);
  if (c.internet_mbps >= 100) out.push(`<span class="bdg good">${icon("wifi")} Fast Wi-Fi ${esc(c.internet_mbps)}+</span>`);
  if (c.safety_10 >= 8) out.push(`<span class="bdg">${icon("shield")} Safety ${esc(c.safety_10)}/10</span>`);
  return out.length ? `<div class="badges">${out.join("")}</div>` : "";
}

function cityCard(c, country) {
  const art = REGION_ART[country?.region] ?? FALLBACK_ART;
  return `<article class="tcard" data-city="${esc(c.id)}">
    <div class="art" style="background:${art}" data-modal="${esc(c.id)}" title="Quick view">
      <img class="ph" src="/img/${esc(c.id)}.jpg" alt="${esc(c.name)}" loading="lazy" onerror="this.remove()">
      <span class="scrim"></span>
      <span class="initial">${esc(c.name.slice(0, 1))}</span>
      <span class="flag">${esc(country?.flag ?? "")}</span>
      <span class="badge">${icon("shield")} Safety <b>${esc(c.safety_10)}/10</b></span>
    </div>
    <div class="tbody">
      <h3><a href="/destination/${esc(c.id)}">${esc(c.name)}</a></h3>
      <div class="sub">${icon("pin")} ${esc(c.type ?? "Place")} in ${esc(country?.name ?? c.country_id)}</div>
      <p class="facts">
        <span>${icon("wallet")} <strong>${money(c.monthly_cost_usd)}</strong>/month</span>
        <span>${icon("wifi")} <strong>${esc(c.internet_mbps)} Mbps</strong> · ${wifiWord(c.internet_mbps)}</span>
        ${c.rent_usd != null ? `<span>${icon("home")} Rent ${money(c.rent_usd)}</span>` : ""}
      </p>
      ${cityBadges(c, country)}
      <p style="margin-top:8px;">${(c.vibe ?? []).slice(0, 3).map((v) => `<span class="tag">${esc(v)}</span>`).join("")}</p>
      <p class="mynote" data-note-for="${esc(c.id)}" hidden></p>
    </div>
    <div class="actions">
      <a class="abtn primary" href="/plan?destination=${esc(c.id)}">${icon("plus")} Add to trip</a>
      <button class="abtn" type="button" data-save="${esc(c.id)}">${icon("bookmark")} Save</button>
      <button class="abtn" type="button" data-note="${esc(c.id)}">${icon("note")} Note</button>
      <button class="abtn" type="button" data-modal="${esc(c.id)}">${icon("info")} Details</button>
    </div>
  </article>`;
}

function countryCard(c) {
  const art = REGION_ART[c.region] ?? FALLBACK_ART;
  return `<article class="tcard" data-country="${esc(c.id)}">
    <div class="art" style="background:${art}" data-modal-country="${esc(c.id)}" title="Quick view">
      <img class="ph" src="/img/country-${esc(c.id)}.jpg" alt="${esc(c.name)}" loading="lazy" onerror="this.remove()">
      <span class="scrim"></span>
      <span class="initial">${esc(c.name.slice(0, 1))}</span>
      <span class="flag">${esc(c.flag ?? "")}</span>
      <span class="badge">Nomad Score <b>${esc(c.nomad_score)}</b></span>
    </div>
    <div class="tbody">
      <h3><a href="/country/${esc(c.id)}">${esc(c.name)}</a></h3>
      <div class="sub">${icon("pin")} ${esc(c.region)}${c.us_travel_advisory_level != null ? ` · US advisory L${esc(c.us_travel_advisory_level)}` : ""}</div>
      <p class="facts">
        <span>${icon("wallet")} <strong>${money(c.monthly_cost_usd)}</strong>/month</span>
        <span>${icon("wifi")} <strong>${esc(c.internet_mbps)} Mbps</strong></span>
        <span>${icon("shield")} Safety <strong>${esc(c.safety_10)}/10</strong></span>
      </p>
      ${c.visa ? `<p class="facts"><span>${icon("calendar")} Long stay: ${esc(c.visa)}</span></p>` : ""}
      <p>${esc(c.best_for ?? "")}</p>
    </div>
    <div class="actions">
      <a class="abtn primary" href="/country/${esc(c.id)}">${icon("compass")} Explore</a>
      <a class="abtn" href="/visa#${esc(c.id)}">${icon("calendar")} Visa &amp; stay</a>
      <button class="abtn" type="button" data-modal-country="${esc(c.id)}">${icon("info")} Details</button>
    </div>
  </article>`;
}

function rail(title, cards, exploreHref = "") {
  if (!cards) return "";
  return `<section class="rail"><h2>${esc(title)} ${exploreHref ? `<a class="explore" href="${esc(exploreHref)}">Explore all →</a>` : ""}</h2><div class="track">${cards}</div></section>`;
}

function clientData() {
  const { cities, countries } = loadData();
  const slim = (o, keys) => Object.fromEntries(keys.map((k) => [k, o[k]]));
  return {
    cities: Object.fromEntries(cities.map((c) => [c.id, {
      ...slim(c, ["id", "name", "type", "monthly_cost_usd", "rent_usd", "internet_mbps", "safety_10", "vibe", "note", "description", "best_season", "flight_from_miami", "time_zone", "sim_cost", "english_level", "getting_around", "scene", "lat", "lng"]),
      country_id: c.country_id,
      neighbourhoods: c.neighbourhoods ?? [],
      coworking: c.coworking ?? [],
      experiences: (c.experiences ?? []).map((e) => ({ name: e.name, price_usd: e.price_usd, duration: e.duration, category: e.category })),
    }])),
    countries: Object.fromEntries(countries.map((c) => [c.id, {
      ...slim(c, ["id", "name", "region", "flag", "nomad_score", "monthly_cost_usd", "internet_mbps", "safety_10", "best_for", "visa_duration", "visa", "us_travel_advisory_level", "capital", "visa_cost_usd", "visa_income_requirement_usd_month", "tax_notes", "pros", "cons"]),
    }])),
  };
}

const CLIENT_JS = `
const DATA = window.__OG_DATA__;
const $ = (s, r = document) => r.querySelector(s);
const IC = {
  wallet: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10.2h18M16.5 15h.9"/></svg>',
  wifi: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 10a12.5 12.5 0 0 1 17 0"/><path d="M6.8 13.6a7.6 7.6 0 0 1 10.4 0"/><circle cx="12" cy="17.4" r="1.5" fill="currentColor" stroke="none"/></svg>',
  shield: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 2.8v5.4c0 4.4-2.9 8-7 9.8-4.1-1.8-7-5.4-7-9.8V5.8z"/><path d="M9 11.8l2.1 2.1 4-4.2"/></svg>',
  bookmark: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 3.5h11V21l-5.5-3.8L6.5 21z"/></svg>',
  note: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4.2L19.6 8.6a2.15 2.15 0 0 0-3-3L5.2 17z"/><path d="M13.8 6.4l3 3"/></svg>',
  plus: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  check: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 12.6l5 5L19.5 7"/></svg>',
  pin: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21.2S5.2 15.4 5.2 9.9a6.8 6.8 0 1 1 13.6 0c0 5.5-6.8 11.3-6.8 11.3z"/><circle cx="12" cy="9.9" r="2.6"/></svg>',
  info: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.8"/><path d="M12 11v5M12 7.8v.3"/></svg>',
};
function escT(s) { return String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }
function getList() { try { return JSON.parse(localStorage.getItem("og-my-list") || "[]"); } catch { return []; } }
function inList(id) { return getList().includes(id); }
function getNotes() { try { return JSON.parse(localStorage.getItem("og-notes") || "{}"); } catch { return {}; } }
function noteFor(id) { return getNotes()[id] || ""; }
function paintSaveBtn(b, id) { const on = inList(id); b.classList.toggle("saved", on); b.innerHTML = (on ? IC.check : IC.bookmark) + (on ? " Saved" : " Save"); }
function paintSave(id) { document.querySelectorAll('[data-save="' + id + '"]').forEach((b) => paintSaveBtn(b, id)); }
function paintNoteBtn(b, id) { const t = noteFor(id); b.classList.toggle("hasnote", !!t); b.innerHTML = IC.note + (t ? " Note ✓" : " Note"); }
function paintNote(id) {
  const t = noteFor(id);
  document.querySelectorAll('[data-note-for="' + id + '"]').forEach((el) => {
    if (t) { el.hidden = false; el.innerHTML = IC.note + "<span><b>Your note:</b> " + escT(t) + "</span>"; }
    else { el.hidden = true; el.innerHTML = ""; }
  });
  document.querySelectorAll('[data-note="' + id + '"]').forEach((b) => paintNoteBtn(b, id));
}
function paintPlanLinks(root) {
  (root || document).querySelectorAll('a[href^="/plan?destination="]').forEach((a) => {
    try {
      const u = new URL(a.getAttribute("href"), location.origin);
      const id = u.searchParams.get("destination");
      const t = id ? noteFor(id) : "";
      if (t && !u.searchParams.get("note")) { u.searchParams.set("note", t); a.setAttribute("href", u.pathname + u.search); }
    } catch {}
  });
}
function toggleSave(id) {
  let list = getList();
  list = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  try { localStorage.setItem("og-my-list", JSON.stringify(list)); } catch {}
  paintSave(id);
  renderMyList();
}
function saveNote(id, text) {
  const notes = getNotes();
  const t = String(text || "").trim();
  if (t) notes[id] = t; else delete notes[id];
  try { localStorage.setItem("og-notes", JSON.stringify(notes)); } catch {}
  paintNote(id);
  paintPlanLinks(document);
  renderMyList();
}
function cardHTML(c) {
  const co = DATA.countries[c.country_id] || {};
  return '<article class="tcard"><div class="art" data-modal="' + c.id + '" style="height:96px;"><img class="ph" src="/img/' + c.id + '.jpg" alt="" loading="lazy" onerror="this.remove()"><span class="scrim"></span>' +
    '<span class="badge">' + IC.shield + ' Safety <b>' + c.safety_10 + '/10</b></span></div><div class="tbody"><h3><a href="/destination/' + c.id + '">' + c.name + '</a></h3>' +
    '<div class="sub">' + IC.pin + ' ' + (c.type || "Place") + ' in ' + (co.name || "") + '</div>' +
    '<p class="facts"><span>' + IC.wallet + ' <strong>$' + Number(c.monthly_cost_usd).toLocaleString("en-US") + '</strong>/month</span><span>' + IC.wifi + ' <strong>' + c.internet_mbps + ' Mbps</strong></span></p>' +
    '<p class="mynote" data-note-for="' + c.id + '" hidden></p></div>' +
    '<div class="actions"><a class="abtn primary" href="/plan?destination=' + c.id + '">' + IC.plus + ' Add to trip</a>' +
    '<button class="abtn" type="button" data-save="' + c.id + '">' + IC.bookmark + ' Save</button>' +
    '<button class="abtn" type="button" data-note="' + c.id + '">' + IC.note + ' Note</button>' +
    '<button class="abtn" type="button" data-modal="' + c.id + '">' + IC.info + ' Details</button></div></article>';
}
function renderMyList() {
  const host = document.getElementById("mylist-rail"); if (!host) return;
  const list = getList();
  const cards = list.map((id) => DATA.cities[id]).filter(Boolean).map(cardHTML).join("");
  host.innerHTML = cards ? '<section class="rail"><h2>My List — saved places</h2><p class="note" style="padding:0 2px;">Saved places and your notes live in this browser only. Add a saved place to a trip and its note travels with it into the planner.</p><div class="track">' + cards + "</div></section>" : "";
  bindCards(host);
  list.forEach((id) => { paintSave(id); paintNote(id); });
  paintPlanLinks(host);
}
function renderContinue() {
  const host = document.getElementById("continue-rail"); if (!host) return;
  const id = localStorage.getItem("og-last-plan");
  const c = id && DATA.cities[id];
  host.innerHTML = c ? '<section class="rail"><h2>Continue planning</h2><div class="track">' + cardHTML(c) + "</div></section>" : "";
  bindCards(host);
}
function money0(n) { return "$" + Number(n).toLocaleString("en-US"); }
function wifiVerdict(m) { return m >= 50 ? "Video calls, uploads, streaming — comfortable" : m >= 25 ? "Fine for video calls; big uploads will crawl" : "Light work only — video calls may struggle"; }
function safetyWord(s) { return s >= 8 ? "High on record" : s >= 6.5 ? "Mid-range — normal city awareness" : "Lower on record — research areas first"; }
function heroHTML(img, title, sub) {
  return '<div class="mhero"><div class="phimg" style="background-image:url(' + img + ')"></div><div class="mscrim"></div><button class="mclose" type="button" data-close>✕</button>' +
    '<div class="mtitle"><div style="font-size:30px;font-weight:bold;">' + title + '</div><div>' + sub + '</div></div></div>';
}
function wireModal() {
  const veil = document.getElementById("modal-veil"); const box = document.getElementById("modal-box");
  if (!veil || !box) return;
  box.querySelectorAll("[data-open-city]").forEach((b) => { b.onclick = () => openModal("city", b.getAttribute("data-open-city")); });
  box.querySelectorAll("[data-open-country]").forEach((b) => { b.onclick = () => openModal("country", b.getAttribute("data-open-country")); });
  bindCards(box);
  box.querySelectorAll("[data-savenote]").forEach((b) => {
    b.onclick = () => {
      const ta = box.querySelector("#note-text");
      saveNote(b.getAttribute("data-savenote"), ta ? ta.value : "");
      b.textContent = "Note saved ✓";
    };
  });
  veil.scrollTop = 0;
  const img = box.querySelector(".phimg");
  veil.onscroll = () => { if (img) img.style.transform = "translateY(" + Math.min(Math.max(veil.scrollTop, 0) * 0.3, 70) + "px)"; };
}
function openModal(kind, id, focus) {
  const veil = document.getElementById("modal-veil"); const box = document.getElementById("modal-box");
  if (!veil || !box) return;
  if (kind === "city") {
    const c = DATA.cities[id]; if (!c) return; const co = DATA.countries[c.country_id] || {};
    const decide = [];
    if (c.rent_usd != null && c.monthly_cost_usd) {
      decide.push('<div>Rent share<b>' + Math.round((c.rent_usd / c.monthly_cost_usd) * 100) + '% of budget</b></div>');
      decide.push('<div>Left for living<b>' + money0(c.monthly_cost_usd - c.rent_usd) + '/mo</b></div>');
    } else {
      decide.push('<div>Rent<b>Not on record</b></div>');
    }
    decide.push('<div>Internet verdict<b>' + wifiVerdict(c.internet_mbps) + '</b></div>');
    decide.push('<div>Safety read<b>' + safetyWord(c.safety_10) + '</b></div>');
    box.innerHTML = heroHTML('/img/' + c.id + '.jpg', c.name, (c.type || "") + ' in ' + (co.name || "") + (c.vibe && c.vibe.length ? ' · ' + c.vibe.join(' · ') : '')) +
      '<div class="mbody"><div class="stats"><div>Monthly budget<b>' + money0(c.monthly_cost_usd) + '</b></div>' +
      '<div>Rent<b>' + (c.rent_usd != null ? money0(c.rent_usd) : "Not in the data") + '</b></div>' +
      '<div>Internet<b>' + c.internet_mbps + ' Mbps</b></div><div>Safety<b>' + c.safety_10 + '/10</b></div>' +
      '<div>' + (co.name || "Country") + ' Nomad Score<b>' + (co.nomad_score ?? "—") + '</b></div>' +
      '<div>Stay on record<b>' + (co.visa_duration || "—") + '</b></div></div>' +
      '<div class="stats" style="margin-top:0;">' + decide.join("") + '</div>' +
      (c.best_season ? '<div class="msec"><h4>Nomad essentials</h4><div class="hoods">' +
        [["Best season", c.best_season], ["From Miami", c.flight_from_miami], ["Time zone", c.time_zone], ["SIM and data", c.sim_cost], ["English", c.english_level], ["Getting around", c.getting_around], ["The scene", c.scene]]
          .filter((pair) => pair[1]).map((pair) => '<div class="hood"><b>' + pair[0] + '</b>' + pair[1] + '</div>').join("") +
        '</div><p class="note">Essentials added to the snapshot in October 2026 as curated typical ranges — verify locally.</p></div>' : '') +
      (c.description ? '<div class="msec"><h4>The full picture, from the record</h4><p style="line-height:1.65;margin:0;">' + c.description + '</p></div>' : '<p style="line-height:1.6;">' + (c.note || "") + '</p>') +
      (c.neighbourhoods && c.neighbourhoods.length ? '<div class="msec"><h4>Neighbourhoods</h4><div class="hoods">' + c.neighbourhoods.map((h) => '<div class="hood"><b>' + h.name + '</b>' + (h.about || "") + '</div>').join("") + '</div></div>' : '') +
      (c.coworking && c.coworking.length ? '<div class="msec"><h4>Working from here</h4><ul class="tick">' + c.coworking.map((w) => '<li>' + w + '</li>').join("") + '</ul></div>' : '') +
      (c.experiences && c.experiences.length ? '<div class="msec"><h4>Experiences on record</h4>' + c.experiences.map((e) => '<div class="xrow"><span>' + e.name + (e.category ? ' <small>' + e.category + '</small>' : '') + '<br><a href="/plan?destination=' + c.id + '&interest=' + encodeURIComponent(e.name) + '">+ Add experience to trip</a></span><small>' + (e.duration || "") + (e.price_usd != null ? ' · ' + (Array.isArray(e.price_usd) ? money0(e.price_usd[0]) + '–' + money0(e.price_usd[1]) : money0(e.price_usd)) : '') + '</small></div>').join("") + '<p class="note">Add experience to trip stays inside this app: it opens the planner with the experience already in your interests. This demo does not book or take payment.</p></div>' : '') +
      '<div class="msec" id="note-anchor"><h4>Your note for ' + c.name + '</h4>' +
      '<textarea class="notebox" id="note-text" placeholder="Anything you want to remember — a neighbourhood to check, a coworking spot, a price to verify…">' + escT(noteFor(c.id)) + '</textarea>' +
      '<div class="toolsrow" style="margin-top:8px;"><button class="btn dark small" type="button" data-savenote="' + c.id + '">Save note</button>' +
      '<button class="abtn" type="button" data-save="' + c.id + '" style="flex:0 1 auto;">' + IC.bookmark + ' Save place</button>' +
      '<span class="note">Notes live in this browser only. Add this place to a trip and the note goes into the planner with it.</span></div></div>' +
      '<div class="msec"><p style="margin:0 0 10px;"><button class="fchip" type="button" style="cursor:pointer;" data-open-country="' + c.country_id + '">See ' + (co.name || "the country") + ' — visa, pros and cons, tax notes</button></p>' +
      '<p style="margin:0;"><a class="btn dark" href="/plan?destination=' + c.id + '">+ Add to trip — plan ' + c.name + '</a> <a class="btn" href="/destination/' + c.id + '" style="border:1px solid var(--ink);">Full page</a></p></div></div>';
  } else {
    const c = DATA.countries[id]; if (!c) return;
    const cities = Object.values(DATA.cities).filter((x) => x.country_id === c.id);
    box.innerHTML = heroHTML('/img/country-' + c.id + '.jpg', (c.flag || "") + ' ' + c.name, c.region + ' · Nomad Score ' + c.nomad_score + (c.capital ? ' · Capital: ' + c.capital : '')) +
      '<div class="mbody"><div class="stats"><div>Monthly budget<b>' + money0(c.monthly_cost_usd) + '</b></div>' +
      '<div>Internet<b>' + c.internet_mbps + ' Mbps</b></div><div>Safety<b>' + c.safety_10 + '/10</b></div>' +
      '<div>Stay length on record<b>' + (c.visa_duration || "—") + '</b></div>' +
      '<div>US travel advisory<b>' + (c.us_travel_advisory_level != null ? "Level " + c.us_travel_advisory_level : "—") + '</b></div>' +
      (c.visa_cost_usd != null ? '<div>Visa cost on record<b>' + money0(c.visa_cost_usd) + '</b></div>' : '') +
      (c.visa_income_requirement_usd_month != null ? '<div>Visa income bar<b>' + money0(c.visa_income_requirement_usd_month) + '/mo</b></div>' : '') + '</div>' +
      '<p style="line-height:1.6;">' + (c.best_for || "") + '</p>' +
      (c.visa ? '<div class="msec"><h4>Stay and visa, from the record</h4><p style="line-height:1.6;margin:0;">' + String(c.visa) + '</p><p class="note">Stay information from the Outgrid records — flagged unverified, confirm with official sources.</p></div>' : '') +
      ((c.pros && c.pros.length) || (c.cons && c.cons.length) ? '<div class="cols msec">' +
        '<div><h4>Working in its favour</h4><ul class="tick">' + (c.pros || []).map((x) => '<li>' + x + '</li>').join("") + '</ul></div>' +
        '<div><h4>Watch-outs</h4><ul class="tick">' + (c.cons || []).map((x) => '<li>' + x + '</li>').join("") + '</ul></div></div>' : '') +
      (c.tax_notes ? '<div class="msec"><h4>Tax notes, from the record</h4><p style="line-height:1.6;margin:0;">' + String(c.tax_notes) + '</p><p class="note">General information only — not tax advice.</p></div>' : '') +
      (cities.length ? '<div class="msec"><h4>Cities on record</h4><div class="citychips">' + cities.map((x) => '<button class="fchip" type="button" style="cursor:pointer;" data-open-city="' + x.id + '">' + x.name + ' · ' + money0(x.monthly_cost_usd) + '/mo</button>').join("") + '</div></div>' : '') +
      '<p><a class="btn dark" href="/country/' + c.id + '">Explore ' + c.name + '</a></p></div>';
  }
  veil.classList.add("open");
  wireModal();
  paintPlanLinks(box);
  if (focus === "note") { const ta = box.querySelector("#note-text"); if (ta) { ta.scrollIntoView({ block: "center" }); ta.focus(); } }
}
function bindCards(root) {
  root.querySelectorAll("[data-save]").forEach((b) => {
    const id = b.getAttribute("data-save");
    paintSaveBtn(b, id);
    b.onclick = () => toggleSave(id);
  });
  root.querySelectorAll("[data-note]").forEach((b) => {
    const id = b.getAttribute("data-note");
    paintNoteBtn(b, id);
    b.onclick = () => openModal("city", id, "note");
  });
  root.querySelectorAll("[data-modal]").forEach((b) => { b.onclick = () => openModal("city", b.getAttribute("data-modal")); });
  root.querySelectorAll("[data-modal-country]").forEach((b) => { b.onclick = () => openModal("country", b.getAttribute("data-modal-country")); });
}
// --- Place autocomplete: every city and country in the records,
// no model involved. Picking a place goes straight to its results.
const PLACES = [
  ...Object.values(DATA.cities).map((c) => ({ name: c.name, kind: "City", sub: DATA.countries[c.country_id]?.name ?? "", monthly: c.monthly_cost_usd })),
  ...Object.values(DATA.countries).map((c) => ({ name: c.name, kind: "Country", sub: c.region ?? "", monthly: c.monthly_cost_usd })),
].sort((a, b) => a.name.localeCompare(b.name));
function wireAutocomplete(inputId, listId, onPick) {
  const input = document.getElementById(inputId), list = document.getElementById(listId);
  if (!input || !list) return;
  let items = [], active = -1;
  const close = () => { list.classList.remove("open"); list.innerHTML = ""; items = []; active = -1; };
  const pick = (p) => { if (!p) return; close(); onPick(p); };
  function show() {
    const q = input.value.trim().toLowerCase();
    const matches = q === "" ? PLACES : [
      ...PLACES.filter((p) => p.name.toLowerCase().startsWith(q)),
      ...PLACES.filter((p) => !p.name.toLowerCase().startsWith(q) && p.name.toLowerCase().includes(q)),
    ];
    items = matches.slice(0, q === "" ? PLACES.length : 8);
    active = items.length ? 0 : -1;
    list.innerHTML = items.map((p, i) => '<div class="ac-item' + (i === active ? " on" : "") + '" data-i="' + i + '"><span><b>' + p.name + "</b> <small>" + p.kind + (p.sub ? " · " + p.sub : "") + "</small></span><small>$" + Number(p.monthly).toLocaleString("en-US") + "/mo</small></div>").join("");
    list.classList.toggle("open", items.length > 0);
    list.querySelectorAll(".ac-item").forEach((el) => el.addEventListener("mousedown", (e) => { e.preventDefault(); pick(items[Number(el.dataset.i)]); }));
  }
  input.addEventListener("focus", show);
  input.addEventListener("input", show);
  input.addEventListener("blur", () => setTimeout(close, 150));
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); if (!items.length) return;
      active = (active + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      list.querySelectorAll(".ac-item").forEach((el, i) => el.classList.toggle("on", i === active));
    } else if (e.key === "Enter" && items.length && list.classList.contains("open")) { e.preventDefault(); pick(items[active]); }
    else if (e.key === "Escape") close();
  });
}
document.addEventListener("DOMContentLoaded", () => {
  bindCards(document);
  renderMyList(); renderContinue();
  getList().forEach((id) => paintSave(id));
  Object.keys(getNotes()).forEach((id) => paintNote(id));
  paintPlanLinks(document);
  // Inline note editors (destination pages)
  document.querySelectorAll("[data-noteedit]").forEach((ta) => { ta.value = noteFor(ta.getAttribute("data-noteedit")); });
  document.querySelectorAll("[data-notesave]").forEach((b) => {
    b.onclick = () => {
      const id = b.getAttribute("data-notesave");
      const ta = document.querySelector('[data-noteedit="' + id + '"]');
      saveNote(id, ta ? ta.value : "");
      b.textContent = "Note saved ✓";
    };
  });
  // Welcome pop-up: first visit only, remembered in this browser.
  const welcome = document.getElementById("welcome-veil");
  if (welcome) {
    let seen = false; try { seen = !!localStorage.getItem("og-welcomed"); } catch {}
    if (!seen) welcome.classList.add("open");
    const closeW = () => { welcome.classList.remove("open"); try { localStorage.setItem("og-welcomed", "1"); } catch {} };
    welcome.querySelectorAll("[data-welcome-close]").forEach((b) => { b.onclick = closeW; });
    welcome.addEventListener("click", (e) => { if (e.target === welcome) closeW(); });
  }
  // Visa & stay page: passport picker personalises the scope note.
  const pSel = document.getElementById("passport-select");
  const pNote = document.getElementById("visa-scope");
  if (pSel && pNote) {
    const apply = () => {
      const p = pSel.value;
      try { localStorage.setItem("og-passport", p); } catch {}
      pNote.innerHTML = p === "United States"
        ? "You picked a <b>United States</b> passport. The long-stay routes below are the ones in Outgrid's records. Tourist entry — the visa-free days you'd get on arrival — is not itemised in this snapshot for any passport, so it isn't shown rather than guessed."
        : "You picked a <b>" + escT(p) + "</b> passport. The long-stay routes below come from Outgrid's records — they are work and residence programmes whose published terms are on record. Tourist entry (visa-free days) for a " + escT(p) + " passport is not in this snapshot, so it isn't shown rather than guessed. Confirm entry rules with the country's official source before you travel.";
    };
    let savedP = ""; try { savedP = localStorage.getItem("og-passport") || ""; } catch {}
    if (savedP) { for (const o of pSel.options) { if (o.value === savedP) { pSel.value = savedP; break; } } }
    pSel.addEventListener("change", apply);
    apply();
  }
  wireAutocomplete("ac-ai", "ac-ai-list", (p) => { location.href = "/search?nl=" + encodeURIComponent(p.name); });
  wireAutocomplete("ac-q", "ac-q-list", (p) => { const i = document.getElementById("ac-q"); i.value = p.name; i.form.submit(); });
  const locateBtn = document.getElementById("locate-btn");
  const locateStatus = document.getElementById("locate-status");
  if (locateBtn && locateStatus) {
    locateBtn.onclick = () => {
      if (!navigator.geolocation) { locateStatus.textContent = "This browser cannot share a location — pick a place from the list instead."; return; }
      locateStatus.textContent = "Finding the nearest place in the demo records…";
      navigator.geolocation.getCurrentPosition((pos) => {
        const lat1 = pos.coords.latitude * Math.PI / 180, lng1 = pos.coords.longitude * Math.PI / 180;
        let best = null;
        Object.values(DATA.cities).forEach((c) => {
          if (typeof c.lat !== "number" || typeof c.lng !== "number") return;
          const dLat = (c.lat * Math.PI / 180) - lat1, dLng = (c.lng * Math.PI / 180) - lng1;
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(c.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
          const km = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          if (!best || km < best.km) best = { c, km };
        });
        locateStatus.innerHTML = best
          ? 'Nearest place in this demo’s records: <a href="/destination/' + best.c.id + '"><b>' + best.c.name + '</b></a> — about ' + Math.round(best.km).toLocaleString("en-US") + ' km away. <a href="/plan?destination=' + best.c.id + '">Plan a stay there</a>.'
          : "No demo place has coordinates on record.";
      }, () => { locateStatus.textContent = "Location was not shared. Nothing was sent anywhere — pick a place from the list instead."; }, { timeout: 10000 });
    };
  }
  const bb = document.querySelector(".billboard .bb-bg");
  if (bb) { const onS = () => { bb.style.transform = "translateY(" + Math.min(window.scrollY * 0.2, 80) + "px)"; }; addEventListener("scroll", onS, { passive: true }); onS(); }
  const veil = document.getElementById("modal-veil");
  if (veil) {
    veil.addEventListener("click", (e) => { if (e.target === veil || e.target.hasAttribute("data-close")) veil.classList.remove("open"); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") veil.classList.remove("open"); });
  }
});
`;

function modalShell() {
  return `<div class="modal-veil" id="modal-veil"><div class="modal" id="modal-box"></div></div>
<script>window.__OG_DATA__ = ${JSON.stringify(clientData())};</script>
<script>${CLIENT_JS}</script>`;
}

export function renderBrowse(params = {}) {
  const { cities: allCities, countries } = loadData();
  const { cities, countries: shownCountries, countryById } = applyBrowse(params);
  const byCountry = (c) => countryById[c.country_id];
  const hero = getCity("bacalar");
  const heroCountry = getCountry(hero.country_id);
  const beach = allCities.filter((c) => c.type === "beach" || c.type === "island");
  const budget = allCities.filter((c) => c.monthly_cost_usd <= 1300);
  const fast = allCities.slice().sort((a, b) => b.internet_mbps - a.internet_mbps).slice(0, 8);
  const byScore = countries.slice().sort((a, b) => b.nomad_score - a.nomad_score);
  const bands = [["", "All scores"], ["85", "85+"], ["70", "70–84"], ["55", "55–69"], ["0", "Under 55"]];
  const types = ["", ...new Set(allCities.map((c) => c.type).filter(Boolean))];
  const sort = params.sort || "recommended";
  const hasFilter = params.q || params.maxBudget || params.band || params.type || sort !== "recommended";
  const body = `
  <div class="welcome-veil" id="welcome-veil" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
    <div class="welcome">
      <h2 id="welcome-title">Welcome to Outgrid</h2>
      <p class="wsub">This is the live demo of the <strong>Outgrid Plan Agent</strong>, built for the Meta Global AI Developer Hackathon. Thirty seconds and you'll know exactly what it does.</p>
      <div class="wrow">${icon("compass")}<div><b>Real places, real numbers</b>Browse 16 destinations from Outgrid's own records — cost of living, internet, safety, stay rules. Nothing here is invented to fill a page.</div></div>
      <div class="wrow">${icon("sparkle")}<div><b>Two AI models — one checks the other</b>A planner (Muse Spark, via the Meta Model API) drafts your day-by-day stay. A second model (Muse Spark Open, served via Baseten) then checks every claim in it against the records before you see the plan.</div></div>
      <div class="wrow">${icon("shield")}<div><b>If it isn't in the data, it doesn't ship</b>Unsupported claims get dropped. Unverifiable ones are flagged in the open — never quietly made up.</div></div>
      <div class="wrow">${icon("bookmark")}<div><b>Make it yours</b>Save places, jot a note on any card, add experiences to a trip. Saves and notes live in your browser only, and your note travels into the planner with the place.</div></div>
      <p class="note">Demo snapshot: 5 countries, 16 cities. No bookings, no payments, no accounts — planning and checking only.</p>
      <div class="toolsrow" style="margin-top:14px;">
        <button class="btn dark" type="button" data-welcome-close>Start exploring</button>
        <a class="btn" href="/how-it-works" style="border:1px solid var(--ink);">How it works</a>
      </div>
    </div>
  </div>
  <section class="billboard">
    <div class="bb-bg" style="background-image:url('/img/${esc(hero.id)}.jpg')"></div>
    <div class="bb-in">
      <div class="kicker">Featured base · ${esc(heroCountry.name)}</div>
      <h1>${esc(hero.name)} — the lagoon base</h1>
      <p class="lede">Find your perfect next base. Every destination below is scored on the stuff that decides a long stay — cost, internet, safety — and every plan is checked claim-by-claim by a second AI before you see it.</p>
      <div class="chips">
        <span class="mchip">Monthly budget <b>${money(hero.monthly_cost_usd)}</b></span>
        <span class="mchip">Internet <b>${esc(hero.internet_mbps)} Mbps</b></span>
        <span class="mchip">Safety <b>${esc(hero.safety_10)}/10</b></span>
        <span class="mchip">${esc(heroCountry.name)} Nomad Score <b>${esc(heroCountry.nomad_score)}</b></span>
      </div>
      <div class="bb-cta">
        <a class="btn" href="/plan?destination=${esc(hero.id)}">Plan a stay in ${esc(hero.name)}</a>
        <a class="btn ghost" href="/destination/${esc(hero.id)}">Explore ${esc(hero.name)}</a>
      </div>
    </div>
  </section>
  <div class="searchdeck"><div class="searchcard">
    <h3>Search in your own words</h3>
    <p class="note">Powered by Muse Spark: describe the base you want and the model turns it into filters — the data does the matching, and the results page shows you exactly what it heard.</p>
    <form class="aisearch" method="get" action="/search">
      <span class="ac-wrap"><input type="text" id="ac-ai" name="nl" autocomplete="off" placeholder="Start typing a place — Bacalar, Lisbon… — or describe your base"><span class="ac-list" id="ac-ai-list"></span></span>
      <button class="btn dark" type="submit">Search with AI</button>
    </form>
    <p style="margin:12px 0 0;"><button id="locate-btn" class="btn" type="button" style="border:1px solid var(--ink);">Locate me</button></p>
    <p class="note" id="locate-status">Optional: your browser can find the nearest of the 16 demo places from the coordinates already in the records. Your location stays in your browser — it is not stored or sent to a server.</p>
    <form class="sentence" method="get" action="/">
      Or the classic way — I'd like to be in
      <span class="ac-wrap"><input type="text" id="ac-q" name="q" autocomplete="off" placeholder="Where to?" value="${esc(params.q || "")}"><span class="ac-list" id="ac-q-list"></span></span>
      with a budget of <input type="number" name="budget" placeholder="2500" value="${esc(params.maxBudget || "")}" min="0"> /month
      <button class="btn dark small" type="submit">Search</button>
    </form>
  </div></div>
  <main>
    <div id="mylist-rail"></div>
    <div id="continue-rail"></div>
    ${rail("Countries, ranked by Nomad Score", byScore.map(countryCard).join(""), "/#countries")}
    ${rail("Beach & island bases", beach.map((c) => cityCard(c, byCountry(c))).join(""))}
    ${rail("Under $1,300 a month", budget.map((c) => cityCard(c, byCountry(c))).join(""))}
    ${rail("Fastest internet", fast.map((c) => cityCard(c, byCountry(c))).join(""))}
    <div class="browse-wrap" id="countries">
      <aside class="sidebar">
        <div class="side-panel">
          <h3>Explore</h3>
          <a class="side-link" href="/">All destinations</a>
          <a class="side-link" href="/#countries">Countries &amp; cities</a>
          <a class="side-link" href="/visa">Visa &amp; stay, by passport</a>
          <a class="side-link" href="/stay-rules">Stay Rules</a>
          <a class="side-link" href="/plan">Plan a stay</a>
          <a class="side-link" href="/evidence">Evidence</a>
          <a class="side-link" href="/how-it-works">How it works</a>
        </div>
        <div class="side-panel">
          <h3>Filter places</h3>
          <form method="get" action="/">
            <label>Max budget (USD/month)
              <input type="number" name="budget" min="0" placeholder="e.g. 1500" value="${esc(params.maxBudget || "")}">
            </label>
            <label>Nomad Score
              <select name="band">
                ${bands.map(([v, label]) => `<option value="${v}" ${(params.band || "") === v ? "selected" : ""}>${label === "All scores" ? "All scores" : `Score ${label}`}</option>`).join("")}
              </select>
            </label>
            <label>Place type
              <select name="type">
                ${types.map((t) => `<option value="${esc(t)}" ${(params.type || "") === t ? "selected" : ""}>${t === "" ? "All types" : esc(t)}</option>`).join("")}
              </select>
            </label>
            <label>Sort by
              <select name="sort">
                ${[["recommended", "Recommended"], ["cost_low", "Lowest cost"], ["safety", "Safest"], ["internet", "Fastest internet"], ["score", "Nomad Score"]].map(([v, l]) => `<option value="${v}" ${sort === v ? "selected" : ""}>${l}</option>`).join("")}
              </select>
            </label>
            <button class="btn dark small" type="submit">Apply filters</button>
            ${hasFilter ? `<a class="side-clear" href="/">Clear all filters</a>` : ""}
          </form>
          <p class="note" style="margin-bottom:0;">The same filters as the classic Outgrid browse: score band, place type, budget, sort.</p>
        </div>
        <div class="side-panel">
          <h3>Your trip tools</h3>
          <p class="note" style="margin:0;">Save places from any card and they collect in <strong>My List</strong> at the top of this page. Jot a note on a place and it travels into the planner when you add the place to a trip.</p>
        </div>
      </aside>
      <div class="browse-main">
        <h2 style="margin-top:2px;">Browse everything</h2>
        ${hasFilter ? `<p class="note">Showing ${cities.length} cities and ${shownCountries.length} countries matching your filters.</p>` : ""}
        <h3 style="margin:18px 0 10px;">Countries</h3>
        <div class="grid">${shownCountries.map(countryCard).join("") || '<p class="note">No countries in that score band in the demo data.</p>'}</div>
        <h3 style="margin:26px 0 10px;">Cities</h3>
        <div class="grid">${cities.map((c) => cityCard(c, byCountry(c))).join("") || '<p class="note">No cities match — try a higher budget.</p>'}</div>
        <h2>Plan your route</h2>
        <p class="note">On the live site you tap pins on a map and tune stays and budget as your route comes together. In this demo, pick a city and hit “Add to trip” — the planner builds the day-by-day plan and the checker verifies every claim in it.</p>
      </div>
    </div>
  </main>`;
  return page("Find Your Perfect Next Base", body, modalShell());
}

export function renderSearchResults({ query, chips, cities, countryById, aiUsed, note, relaxed = [] }) {
  const cards = cities.map((c) => cityCard(c, countryById[c.country_id])).join("");
  const body = `<main>
    <p class="note"><a href="/">← All destinations</a></p>
    <h2 style="font-size:28px;">Results for “${esc(query)}”</h2>
    ${aiUsed ? `<p class="note">Muse Spark read that as:</p><p>${chips.map((ch) => `<span class="fchip">${esc(ch)}</span>`).join("") || '<span class="fchip">No specific filters — showing everything, best matches first</span>'}</p>${relaxed.length ? `<p class="note">Nothing in the data matched all of that at once, so I loosened ${esc(relaxed.join(" and "))} — your stated budget was never loosened.</p>` : ""}` : `<p class="note">${esc(note || "")}</p>`}
    <p class="note">${cities.length} destination${cities.length === 1 ? "" : "s"} in the data match. The model only translates your words into filters — every result here is a real record, nothing invented.</p>
    <div class="grid">${cards || '<p class="note">Nothing matches all of that — try loosening the budget or the internet speed.</p>'}</div>
  </main>`;
  return page("Search results", body, modalShell());
}

export function renderDestination(cityId) {
  const city = getCity(cityId);
  const country = getCountry(city.country_id);
  const { cities } = loadData();
  const siblings = cities.filter((c) => c.country_id === country.id && c.id !== city.id);
  const art = REGION_ART[country.region] ?? FALLBACK_ART;
  const experiences = (city.experiences ?? [])
    .map(
      (e) => `<li><strong>${esc(e.name)}</strong>: ${
        Array.isArray(e.price_usd) ? `${money(e.price_usd[0])}–${money(e.price_usd[1])}` : money(e.price_usd)
      }${e.duration ? `, ${esc(e.duration)}` : ""} · <a href="/plan?destination=${esc(city.id)}&interest=${encodeURIComponent(e.name)}">+ Add experience to trip</a></li>`
    )
    .join("");
  const neighbourhoods = (city.neighbourhoods ?? [])
    .map((n) => `<li><strong>${esc(n.name)}</strong>: ${esc(n.about)}</li>`)
    .join("");
  const coworking = (city.coworking ?? []).map((c) => `<li>${esc(c)}</li>`).join("");
  const body = `
  <section class="billboard" style="min-height:44vh;background:${art}">
    <div class="bb-bg" style="background-image:url('/img/${esc(city.id)}.jpg')"></div>
    <div class="bb-in">
      <div class="kicker">${esc(city.type ?? "")} in ${esc(country.name)}</div>
      <h1>${esc(city.name)}</h1>
      <div class="chips">${(city.vibe ?? []).map((v) => `<span class="mchip">${esc(v)}</span>`).join("")}</div>
      <div class="bb-cta"><a class="btn" href="/plan?destination=${esc(city.id)}">Plan a stay</a><a class="btn ghost" href="/country/${esc(country.id)}">More in ${esc(country.name)}</a></div>
    </div>
  </section>
  <main>
    <div class="stats">
      <div>Monthly budget<b>${money(city.monthly_cost_usd)}</b></div>
      <div>Rent<b>${city.rent_usd != null ? money(city.rent_usd) : "Not in the data"}</b></div>
      <div>Internet<b>${esc(city.internet_mbps)} Mbps</b></div>
      <div>Safety<b>${esc(city.safety_10)}/10</b></div>
    </div>
    <div class="panel" style="margin:14px 0;">
      <h3 style="margin-top:0;">Your trip tools</h3>
      <div class="toolsrow">
        <a class="abtn primary" style="flex:0 1 auto;" href="/plan?destination=${esc(city.id)}">${icon("plus")} Add to trip</a>
        <button class="abtn" type="button" data-save="${esc(city.id)}" style="flex:0 1 auto;">${icon("bookmark")} Save</button>
        <a class="abtn" style="flex:0 1 auto;" href="/visa#${esc(country.id)}">${icon("calendar")} Visa &amp; stay in ${esc(country.name)}</a>
      </div>
      <label style="display:block;margin-top:14px;font-size:13px;color:var(--line);">${icon("note")} Your note for ${esc(city.name)} — kept in this browser, and sent to the planner when you add this place to a trip
      <textarea class="notebox" data-noteedit="${esc(city.id)}" placeholder="A neighbourhood to check, a coworking spot, a price to verify…"></textarea></label>
      <div class="toolsrow" style="margin-top:8px;"><button class="btn dark small" type="button" data-notesave="${esc(city.id)}">Save note</button></div>
    </div>
    ${city.note ? `<p style="line-height:1.6;">${esc(city.note)}</p>` : ""}
    ${city.best_season ? `<h2>Nomad essentials</h2><ul class="clean">
      <li><strong>Best season</strong>: ${esc(city.best_season)}</li>
      <li><strong>From Miami</strong>: ${esc(city.flight_from_miami)}</li>
      <li><strong>Time zone</strong>: ${esc(city.time_zone)}</li>
      <li><strong>SIM and data</strong>: ${esc(city.sim_cost)}</li>
      <li><strong>English</strong>: ${esc(city.english_level)}</li>
      <li><strong>Getting around</strong>: ${esc(city.getting_around)}</li>
      <li><strong>The scene</strong>: ${esc(city.scene)}</li></ul>
    <p class="note">Essentials added to the snapshot in October 2026 as curated typical ranges — verify locally.</p>` : ""}
    ${neighbourhoods ? `<h2>Best neighbourhoods to stay and visit</h2><ul class="clean">${neighbourhoods}</ul>` : ""}
    ${coworking ? `<h2>Coworking</h2><ul class="clean">${coworking}</ul>` : ""}
    ${experiences ? `<h2>Experiences and activities</h2><ul class="clean">${experiences}</ul>` : ""}
    <div class="panel" style="margin-top:22px;">
      <h3>Staying in ${esc(country.name)}</h3>
      <p style="line-height:1.55;">${esc(country.visa ?? "")}${country.visa_duration ? ` Duration on the record: ${esc(country.visa_duration)}.` : ""}</p>
      <p class="note">Visa and stay information is shown from Outgrid's records and flagged <span class="pflag">unverified</span> until confirmed with official sources — the Plan Agent treats it the same way.</p>
      <a class="btn dark" href="/plan?destination=${esc(city.id)}">Plan a stay in ${esc(city.name)}</a>
    </div>
    ${siblings.length ? `<h2>More cities in ${esc(country.name)}</h2><div class="grid">${siblings.map((s) => cityCard(s, country)).join("")}</div>` : ""}
  </main>`;
  return page(`${city.name}, ${country.name}: living & working remotely`, body, modalShell());
}

export function renderCountry(countryId) {
  const country = getCountry(countryId);
  const { cities } = loadData();
  const own = cities.filter((c) => c.country_id === country.id);
  const pros = (country.pros ?? []).map((p) => `<li>${esc(p)}</li>`).join("");
  const cons = (country.cons ?? []).map((p) => `<li>${esc(p)}</li>`).join("");
  const body = `<main>
    <p class="note"><a href="/">← All destinations</a></p>
    <h2 style="font-size:32px;margin-bottom:4px;">${esc(country.flag ?? "")} ${esc(country.name)}</h2>
    <p class="note" style="font-size:15px;">${esc(country.region)} · ${esc(country.best_for ?? "")}</p>
    <div class="stats">
      <div>Nomad Score<b>${esc(country.nomad_score)}</b></div>
      <div>Monthly budget<b>${money(country.monthly_cost_usd)}</b></div>
      <div>Internet<b>${esc(country.internet_mbps)} Mbps</b></div>
      <div>Safety<b>${esc(country.safety_10)}/10</b></div>
      <div>US travel advisory<b>Level ${esc(country.us_travel_advisory_level ?? "—")}</b></div>
    </div>
    <div class="cols">
      <div class="panel"><h3>Staying there</h3>
        <p style="line-height:1.55;">${esc(country.visa ?? "")}</p>
        <p class="note">Duration: ${esc(country.visa_duration ?? "—")}${country.visa_cost_usd != null ? ` · Visa cost on record: ${money(country.visa_cost_usd)}` : ""}${country.visa_income_requirement_usd_month != null ? ` · Income requirement on record: ${money(country.visa_income_requirement_usd_month)}/month` : ""}</p>
        <p class="note">Shown from Outgrid's records — flagged <span class="pflag">unverified</span>, confirm with official sources.</p>
      </div>
      <div class="panel"><h3>Tax snapshot</h3>
        <p style="line-height:1.55;">${esc(country.tax_notes ?? "")}</p>
        <p class="note">General information only, not tax advice.</p>
      </div>
    </div>
    ${pros || cons ? `<div class="cols" style="margin-top:16px;">
      ${pros ? `<div class="panel"><h3>Pros</h3><ul class="clean">${pros}</ul></div>` : ""}
      ${cons ? `<div class="panel"><h3>Cons</h3><ul class="clean">${cons}</ul></div>` : ""}
    </div>` : ""}
    <h2>Cities in ${esc(country.name)}</h2>
    <div class="grid">${own.map((c) => cityCard(c, country)).join("")}</div>
  </main>`;
  return page(country.name, body, modalShell());
}

export function renderStayRules() {
  const { countries } = loadData();
  const cards = countries.map((c) => `<section class="panel" style="margin:14px 0;">
      <h3 style="font-size:21px;">${esc(c.flag ?? "")} ${esc(c.name)} <span class="pflag">unverified snapshot</span></h3>
      <div class="stats">
        <div>Stay length on record<b>${esc(c.visa_duration ?? "Not published")}</b></div>
        <div>Route on record<b>${esc(c.visa ?? "Not published")}</b></div>
        ${c.visa_cost_usd != null ? `<div>Visa cost on record<b>${money(c.visa_cost_usd)}</b></div>` : ""}
        ${c.visa_income_requirement_usd_month != null ? `<div>Income bar on record<b>${money(c.visa_income_requirement_usd_month)}/mo</b></div>` : ""}
      </div>
      <h4>Tax snapshot</h4>
      <p style="line-height:1.6;">${esc(c.tax_notes || "No tax note is published in this snapshot.")}</p>
      <p class="note">${esc(c.verification_note || "Not yet verified by Outgrid: confirm specifics with official sources.")}</p>
      <p><a class="btn dark" href="/country/${esc(c.id)}">See ${esc(c.name)} and its cities</a></p>
    </section>`).join("");
  const body = `<main>
    <p class="note"><a href="/">← All destinations</a></p>
    <h2 style="font-size:32px;">Stay Rules — snapshot edition</h2>
    <p style="line-height:1.65;max-width:760px;">The production idea is simple: show how long you can stay, what can trigger tax residency, and what longer-term routes exist — with a source for every number. This hackathon version is deliberately smaller: it covers only the <strong>five countries in the exported snapshot</strong>, and it publishes only fields that are actually in those records.</p>
    <div class="summary"><strong>General information, not immigration or tax advice.</strong> Every card below is flagged unverified because the snapshot itself says the visa and tax specifics still need confirmation with official sources. Where the record has no verified residence-pathway field, this page says nothing instead of filling the gap.</div>
    ${cards}
  </main>`;
  return page("Stay Rules — snapshot edition", body, modalShell());
}

const PASSPORTS = ["United States", "Canada", "United Kingdom", "Ireland", "France", "Germany", "Spain", "Italy", "Netherlands", "Portugal", "Australia", "New Zealand", "Brazil", "Mexico", "South Africa", "India", "Japan", "Other"];

// Fuller visa view, framed by the visitor's passport. The records hold
// long-stay routes (work/residence programmes) — they do NOT hold
// per-passport tourist-entry allowances, so this page shows the routes
// on record and states that gap in plain language instead of guessing.
export function renderVisa() {
  const { countries } = loadData();
  const cards = countries.map((c) => `<section class="panel" id="${esc(c.id)}" style="margin:14px 0;">
      <h3 style="font-size:21px;">${esc(c.flag ?? "")} ${esc(c.name)} <span class="pflag">unverified — from the record</span></h3>
      <div class="stats">
        <div>Long-stay route on record<b>${esc(c.visa ?? "Not published")}</b></div>
        <div>Duration on record<b>${esc(c.visa_duration ?? "Not published")}</b></div>
        ${c.visa_cost_usd != null ? `<div>Visa cost on record<b>${money(c.visa_cost_usd)}</b></div>` : ""}
        ${c.visa_income_requirement_usd_month ? `<div>Income bar on record<b>${money(c.visa_income_requirement_usd_month)}/mo</b></div>` : ""}
        <div>Nomad Score<b>${esc(c.nomad_score)}</b></div>
      </div>
      ${c.tax_notes ? `<h4>Tax snapshot</h4><p style="line-height:1.6;">${esc(c.tax_notes)}</p>` : ""}
      <p class="note">${esc(c.verification_note || "Stay information from the Outgrid records — confirm specifics with official sources before you travel.")}</p>
      <p class="toolsrow"><a class="btn dark" href="/country/${esc(c.id)}">See ${esc(c.name)} and its cities</a> <a class="btn" href="/stay-rules" style="border:1px solid var(--ink);">Stay Rules snapshot</a></p>
    </section>`).join("");
  const body = `<main>
    <p class="note"><a href="/">← All destinations</a></p>
    <h2 style="font-size:32px;">Visa &amp; stay, by passport</h2>
    <p style="line-height:1.65;max-width:760px;">How long you can stay somewhere depends on the passport in your pocket. Pick yours and this page frames everything around it — honestly: it shows the long-stay routes that are actually in Outgrid's records, and where the record doesn't cover tourist entry for your passport, it says so instead of filling the gap.</p>
    <div class="passportbar">
      <label for="passport-select"><strong>Your passport</strong></label>
      <select id="passport-select">${PASSPORTS.map((p) => `<option value="${esc(p)}">${esc(p)}</option>`).join("")}</select>
      <span class="note">Kept in this browser only — it frames this page, nothing is sent anywhere.</span>
    </div>
    <div class="summary" id="visa-scope"></div>
    <div class="summary" style="margin-top:12px;"><strong>General information, not immigration or tax advice.</strong> Every figure below comes from the demo's exported records and is flagged unverified. Entry rules change and depend on your passport and travel history — confirm with the country's official source.</div>
    ${cards}
  </main>`;
  return page("Visa & stay, by passport", body, modalShell());
}

export function renderEvidence({ plan, proof }) {
  const city = getCity(plan.destination_id);
  const summary = plan.verifier_summary ?? {};
  const published = (plan.log ?? []).find((l) => l.event === "published");
  const models = plan.log?.[0] ?? {};
  const logRows = (plan.log ?? []).map((l) => `<li><strong>${esc(l.event)}</strong> — ${esc(l.timestamp ?? "")}<br><span class="note">Planner: ${esc(l.planner_model ?? "—")} · Verifier: ${esc(l.verifier_model ?? "—")}${l.summary ? ` · ${esc(JSON.stringify(l.summary))}` : ""}</span></li>`).join("");
  const body = `<main>
    <p class="note"><a href="/">← All destinations</a></p>
    <h2 style="font-size:32px;">Evidence: a checked plan, and a caught invention</h2>
    <p style="line-height:1.65;max-width:760px;">This page is the paper trail for the demo's central claim: the plan was written by one Muse model and checked claim-by-claim by another, and when a fake claim was inserted on purpose, the checker caught it.</p>

    <h2>1 · The saved verified ${esc(city.name)} plan</h2>
    <div class="summary">
      <p><strong>Result:</strong> ${esc(plan.state)} · ${summary.checked ?? "—"} claims checked · ${summary.supported ?? "—"} supported · ${summary.unverifiable ?? "—"} unverifiable and flagged · ${summary.dropped ?? 0} dropped.</p>
      <p class="note">Planner: ${esc(models.planner_model ?? "Muse Spark")} · Verifier: ${esc(models.verifier_model ?? "Muse Spark Open")}${published?.timestamp ? ` · Published ${esc(published.timestamp)}` : ""}</p>
      <p><a class="btn dark" href="/verified-plan">Read the saved verified plan</a></p>
    </div>
    ${logRows ? `<h3>Run log</h3><ul class="clean">${logRows}</ul>` : ""}

    <h2>2 · The proof test, side by side</h2>
    <div class="cols">
      <div class="panel"><h3>Invented claim</h3><p style="line-height:1.6;"><strong>${esc(proof.injected_claim?.title ?? "")}</strong></p><p style="line-height:1.6;">${esc(proof.injected_claim?.detail ?? "")}</p><p><span class="pflag">not in any record</span></p></div>
      <div class="panel"><h3>Actual record</h3><p style="line-height:1.6;"><strong>${esc(proof.actual_record?.city ?? city.name)}</strong> costs about ${money(proof.actual_record?.monthly_cost_usd)}/month all-in.</p><p style="line-height:1.6;">${esc(proof.actual_record?.note ?? "")}</p></div>
    </div>
    <div class="summary" style="margin-top:16px;">
      <p><strong>Verifier verdict:</strong> <span class="chip">${esc(proof.verdict_for_injected_item?.verdict ?? "no verdict")}</span> — ${esc(proof.verdict_for_injected_item?.note ?? "")}</p>
      <p><strong>${esc(proof.result ?? "")}</strong></p>
      <p class="note">Verifier model: ${esc(proof.verifier_model ?? "")} · Run at ${esc(proof.timestamp ?? "")} · Full machine-readable evidence is in <span class="chip">eval/</span> in the public repository.</p>
    </div>

    <h2>3 · The exact-number check</h2>
    <p style="line-height:1.65;max-width:760px;">Models judge wording; plain code checks money. Every dollar amount in a plan must appear exactly in a source field cited by that same item. If it does not, the item is marked unsupported and goes through the same one-retry, then drop-or-hold, rule. The code check can add a flag — it can never remove one.</p>
  </main>`;
  return page("Evidence", body, modalShell());
}

export function renderHowItWorks() {
  const body = `<main>
    <p class="note"><a href="/">← All destinations</a></p>
    <h2 style="font-size:32px;">How this demo works — in plain language</h2>
    <p style="line-height:1.65;max-width:780px;">This is the catalog for the hackathon build, following the same pattern as the production Outgrid catalog: what it is, what we did, how it works, why it matters, and one key term. The running demo's AI roles are <strong>Meta Muse models only</strong>: Muse Spark writes and interprets, Muse Spark Open checks, and Muse Image made the card artwork. No other AI model is used by the running demo.</p>

    <section class="panel" style="margin:14px 0;"><h3>Architecture — a snapshot app, not a copy of production</h3>
      <p><strong>What it is:</strong> a small Node program on Render that serves pages from an exported snapshot of 5 countries and 16 cities.</p>
      <p><strong>What we did:</strong> recreated the feel and key flows of outgrid.io with original hackathon code. We did not copy the production Cloudflare Worker, Supabase database, accounts, or live partner feeds.</p>
      <p><strong>How it works:</strong> the records are loaded once and kept in memory. Browsing and classic filters need no model call. Only natural-language search and plan building call Muse models.</p>
      <p><strong>Why it matters:</strong> judges see exactly which facts the Planner was allowed to use — the same snapshot they can browse.</p>
      <p class="note"><strong>Key term — Snapshot:</strong> a frozen exported copy of data at a moment in time.</p>
    </section>

    <section class="panel" style="margin:14px 0;"><h3>Grounding — the fact checker</h3>
      <p><strong>What it is:</strong> the system that stops the plan writer from inventing prices, places, and stay rules.</p>
      <p><strong>What we did:</strong> built a three-part gate: the Planner must cite a record field for every factual item; Muse Spark Open checks each claim against the same records; plain code checks every dollar amount exactly against the cited fields.</p>
      <p><strong>How it works:</strong> an unsupported claim gets one rewrite attempt. If it is still unsupported, it is dropped and logged; if dropping it would empty a day, the whole plan is held. Stay and tax claims publish only with an unverified warning.</p>
      <p><strong>Why it matters:</strong> wrong travel facts can cost someone money or a legal stay. “The model sounded sure” is not a safety standard.</p>
      <p class="note"><strong>Key term — Grounding:</strong> forcing AI output to stay tied to named source records.</p>
    </section>

    <section class="panel" style="margin:14px 0;"><h3>Security and data kept</h3>
      <p><strong>What it is:</strong> the demo's safety settings and its deliberately small data footprint.</p>
      <p><strong>What we did:</strong> added a Content Security Policy and other browser safety headers, published a security.txt, kept all model keys on the server only, and built the demo with no account signup and no stored intake.</p>
      <p><strong>How it works:</strong> the browser is told which sources pages may load from; API keys never appear in page code or the public repository; the plan form asks for trip preferences only — no name and no payment details.</p>
      <p><strong>Why it matters:</strong> less stored data means less to protect, and a public demo should never become a leak path for keys.</p>
      <p class="note"><strong>Key term — Content Security Policy:</strong> a list sent with each page saying which outside sources the browser may load.</p>
    </section>

    <section class="panel" style="margin:14px 0;"><h3>Features adapted from the production catalog</h3>
      <ul class="clean">
        <li><strong>Experience cards:</strong> priced experiences from the record, with <strong>Add to trip</strong>. It opens Plan with Outgrid in this app with the experience pre-filled — no fake booking partner and no payment.</li>
        <li><strong>Locate me:</strong> the browser finds the nearest of the 16 snapshot places using coordinates already in the records. The location is used in the browser only and is not stored.</li>
        <li><strong>Stay Rules:</strong> a five-country snapshot edition. It publishes only stay and tax fields present in the records, all flagged unverified, with the not-advice disclaimer.</li>
        <li><strong>Search in your own words:</strong> Muse Spark turns a sentence into filters; the records do the matching and the page shows what the model heard.</li>
        <li><strong>Cards you can act on (Nov 4):</strong> every place card carries icon-labelled facts (cost, Wi-Fi speed with a plain-English read, safety), badges the record numbers actually earn (Nomad Score, under-$1,300/month, fast Wi-Fi), and always-visible buttons in Outgrid's own words — <strong>Add to trip</strong>, <strong>Save</strong>, <strong>Note</strong>, <strong>Details</strong> — plus <strong>Add experience to trip</strong> on experiences. Saves and notes live in the visitor's browser only; a note is passed to the planner as an interest when the place is added to a trip.</li>
        <li><strong>Visa &amp; stay, by passport (Nov 4):</strong> pick your passport and the page frames each country's long-stay route from the records (route, duration, cost, income bar) around it. The records do not hold per-passport tourist-entry allowances, so the page states that gap instead of guessing — the same grounding rule as the planner.</li>
        <li><strong>Welcome pop-up (Nov 4):</strong> a first-visit card that explains the demo in four short rows — real records, two Muse models checking each other, nothing invented, saves and notes in your browser. It shows once and stays dismissed.</li>
      </ul>
    </section>

    <section class="panel" style="margin:14px 0;"><h3>What we deliberately did not add</h3>
      <ul class="clean">
        <li><strong>Cloudflare Workers, Supabase accounts, and production deploys:</strong> production architecture, outside the hackathon demo's job and limits.</li>
        <li><strong>Stay22, GetYourGuide, and Viator:</strong> partner feeds need keys, licences, and booking rules; inventing partner results would break the grounding rule.</li>
        <li><strong>Stripe and Klaviyo:</strong> no payments or marketing email in a judged planning demo.</li>
        <li><strong>Missing-place generation:</strong> a place outside the snapshot has no checked record here, so the honest answer is “not in the demo data,” not a generated page.</li>
        <li><strong>Modal:</strong> an approved fallback host, not wired in because Baseten already serves the Verifier and a second host would add risk without improving the judged flow.</li>
      </ul>
      <p class="note">Third parties actually used by this demo: Meta Model API (Muse Spark and Muse Image), Baseten (Muse Spark Open), Render (hosting), and GitHub (public code and history).</p>
    </section>
  </main>`;
  return page("How this demo works", body, modalShell());
}

export function renderIntake(destinationId, initialInterests = "") {
  const { cities } = loadData();
  const options = cities
    .map((c) => `<option value="${esc(c.id)}" ${c.id === destinationId ? "selected" : ""}>${esc(c.name)}</option>`)
    .join("");
  const body = `<main>
    <h2>Plan your stay</h2>
    <p class="note">Tell the planner what you need. The plan is then checked claim-by-claim by a second model against the destination's record — nothing gets invented.</p>
    <form class="intake" id="intake-form" method="get" action="/plan/view">
      <label>Destination <select name="destination_id">${options}</select></label>
      <label>Start date <input type="date" name="start_date" value="2026-11-09" required></label>
      <label>End date <input type="date" name="end_date" value="2026-11-11" required></label>
      <label>Travelers <input type="number" name="travelers" value="1" min="1"></label>
      <label>Nationality (stay-rules context) <input name="nationality" value="US"></label>
      <label>Budget range (USD/month) <input name="budget_range" value="1000-1500"></label>
      <label>Accommodation tier <input name="accommodation_tier" value="mid"></label>
      <label>Pace <select name="pace"><option>relaxed</option><option selected>balanced</option><option>packed</option></select></label>
      <label>Interests (comma separated) <input name="interests" value="${esc(initialInterests || (destinationId === "bacalar" ? "lagoon, cenotes" : ""))}"></label>
      <label>Coworking needs <input name="coworking_needs" value="Daily focused work, reliable WiFi"></label>
      <label>Fitness needs <input name="fitness_needs" value="Morning runs"></label>
      <button class="btn dark" type="submit">Build my plan</button>
    </form>
    <p class="note" style="max-width:560px;">Building takes about a minute: one model writes the plan, a second model checks every claim in it. You'll see the stages while you wait — the plan only appears once the check has run.</p>
    <div class="buildveil" id="build-veil" role="dialog" aria-modal="true">
      <div class="buildcard">
        <div class="spinner"></div>
        <h3 style="margin:14px 0 6px;">Building your <span id="build-dest">plan</span></h3>
        <p id="build-stage" style="line-height:1.55;margin:0;">Muse Spark is drafting your plan from the destination's records…</p>
        <div class="buildbar"><i id="build-bar-fill"></i></div>
        <p class="note">Two models are working: one writes, one checks. Nothing publishes until the check finishes — that's the point of the demo, and why it takes about a minute.</p>
      </div>
    </div>
  </main>`;
  const script = `<script>
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("intake-form");
  const veil = document.getElementById("build-veil");
  if (!form || !veil) return;
  const stage = document.getElementById("build-stage");
  const bar = document.getElementById("build-bar-fill");
  const dest = document.getElementById("build-dest");
  form.addEventListener("submit", () => {
    const sel = form.querySelector('select[name="destination_id"]');
    if (dest && sel) dest.textContent = sel.options[sel.selectedIndex].text + " plan";
    veil.classList.add("open");
    requestAnimationFrame(() => { if (bar) bar.style.width = "88%"; });
    setTimeout(() => { if (stage) stage.textContent = "Muse Spark Open, served via Baseten, is now checking every claim in the draft against the destination's records."; }, 14000);
    setTimeout(() => { if (stage) stage.textContent = "Still checking — anything the checker can't verify gets flagged or dropped, never invented. Plans usually take about a minute."; }, 38000);
  });
});
</script>`;
  return page("Plan your stay", body, script);
}

export function renderPlan(plan, city, options = {}) {
  const allItems = plan.days.flatMap((d) => d.items);
  const sourced = allItems.filter((i) => i.source_refs.length > 0).length;
  const flagged = allItems.filter((i) => i.unverifiable).length;
  const days = plan.days
    .map(
      (d) => `<section class="day"><h3>${esc(d.date)}</h3>${d.items
        .map(
          (i) => `<div class="item">
            <h4>${esc(i.title)}${i.unverifiable ? `<span class="pflag">unverified</span>` : ""}</h4>
            <p>${esc(i.detail)}</p>
            <div class="meta"><span class="chip">${esc(i.claim_type)}</span>
            ${i.source_refs.length ? ` Source: ${i.source_refs.map(esc).join(", ")}` : " No factual claim — no source needed."}</div>
          </div>`
        )
        .join("")}</section>`
    )
    .join("");
  const summaryBox = plan.verifier_summary
    ? `<div class="summary">
      <p class="honest">Planned with AI on Fabrice's travel data, checked claim-by-claim by a second model against the source records.</p>
      <p><strong>Checker summary:</strong> ${plan.verifier_summary.checked} claims checked · ${plan.verifier_summary.supported} supported · ${plan.verifier_summary.unverifiable} unverifiable (shown with a warning) · ${plan.verifier_summary.dropped ?? 0} dropped as unsupported.
      ${plan.exact_number_flags?.length ? `<br>Plain-code exact-number check flagged ${plan.exact_number_flags.length} item${plan.exact_number_flags.length === 1 ? "" : "s"} during checking; those items followed the same retry, drop, or hold rule.` : ""}
      ${plan.preview_unchecked ? `<br><strong>Preview plan — the live AI models could not be reached just now, so this plan was assembled directly from the destination record and has NOT been claim-checked.</strong>` : ""}
      ${plan.state === "held" ? `<br><strong>This plan is HELD (${esc(plan.held_reason ?? "")}) and is not published as a finished plan.</strong>` : ""}</p>
      ${plan.dropped?.length ? `<p>Dropped after checking: ${plan.dropped.map((d) => esc(d.title)).join("; ")}</p>` : ""}
    </div>`
    : `<div class="summary">
      <p class="honest">Planned with AI on Fabrice's travel data, checked claim-by-claim by a second model against the source records.</p>
      <p><strong>Preview mode:</strong> rendered from the stand-in planner — the live models run when the server has its API keys. Claims on this plan: ${allItems.length} · with a source: ${sourced} · flagged unverified: ${flagged}.</p>
      ${plan.preview_unchecked ? `<p><strong>Preview plan — the live AI models could not be reached just now, so this plan was assembled directly from the destination record and has NOT been claim-checked.</strong></p>` : ""}
    </div>`;
  const savedBanner = options.savedRun
    ? `<div class="summary" style="margin-bottom:14px;"><strong>Saved verified run.</strong> This is an actual completed run of the live pipeline${plan.log?.[0]?.timestamp ? ` from ${esc(plan.log[0].timestamp)}` : ""}, pinned here so a checked plan can be inspected even when a live model call is unavailable. Planner: ${esc(plan.log?.[0]?.planner_model ?? "Muse Spark")} · Verifier: ${esc(plan.log?.[0]?.verifier_model ?? "Muse Spark Open")}.</div>`
    : "";
  const planCountry = getCountry(city.country_id);
  const passport = (options.nationality || "").trim();
  const visaPanel = planCountry?.visa ? `<div class="summary" style="margin-bottom:14px;">
      <p style="margin:0 0 6px;"><strong>Stay &amp; visa snapshot${passport ? ` — for a ${esc(passport)} passport` : ""}</strong> <span class="pflag">unverified</span></p>
      <p style="margin:0;line-height:1.6;">Long-stay route on record for ${esc(planCountry.name)}: <strong>${esc(planCountry.visa)}</strong>${planCountry.visa_duration ? ` · Duration: ${esc(planCountry.visa_duration)}` : ""}${planCountry.visa_cost_usd != null ? ` · Cost on record: ${money(planCountry.visa_cost_usd)}` : ""}${planCountry.visa_income_requirement_usd_month ? ` · Income bar on record: ${money(planCountry.visa_income_requirement_usd_month)}/mo` : ""}. Tourist entry for your passport isn't itemised in this snapshot, so the planner never invents it — confirm with official sources. <a href="/visa#${esc(planCountry.id)}">Fuller visa view →</a></p>
    </div>` : "";
  const body = `<main>
    <p class="note"><a href="/destination/${esc(city.id)}">← ${esc(city.name)}</a></p>
    <h2>Your ${esc(city.name)} plan</h2>
    ${savedBanner}
    ${summaryBox}
    ${visaPanel}
    ${days}
    <p><a href="/">← Browse all destinations</a></p>
  </main>`;
  const extra = `<script>try { localStorage.setItem("og-last-plan", ${JSON.stringify(city.id)}); } catch (e) {}</script>`;
  return page(`Your ${city.name} plan`, body, extra);
}
