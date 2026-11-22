/* ============================================================
   极乐迪斯科人格体系框架 — 双板（A / B）数据与交互
   等级上限 5，A / B 两张 24 项面板并排对照，差异自动标出
   ============================================================ */
(function () {
  "use strict";

  /* 存档键命名空间：selftest.html 用 test- 前缀，绝不碰真实存档 */
  var TEST_MODE = !!window.__TEST_MODE__ || /[?&]test=1\b/.test(location.search);
  var NS = TEST_MODE ? "test-" : "";

  /* 自检页用：把实际用的键名暴露出去，免得测试里写死字符串 */
  window.__KEYS__ = { board: NS + "de-persona-board-v2", codex: NS + "de-codex-v1",
                      combo: NS + "de-combo-v1", view: NS + "de-view-v1",
                      lines: NS + "de-lines-v1", lineCats: NS + "de-lines-cats-v1",
                      profiles: NS + "de-profile-v1" };

  /* 单文件打包版用：__SEED__ 里是作者的内容，只在本地还没有同一条存档时写入。
     本地已经有的键一律不覆盖，别人打开自己的编辑也不会被作者的数据顶掉。 */
  if (window.__SEED__ && !TEST_MODE) {
    Object.keys(window.__SEED__).forEach(function (key) {
      try {
        if (localStorage.getItem(key) === null) {
          localStorage.setItem(key, window.__SEED__[key]);
        }
      } catch (err) { /* 存储被禁用时安静跳过 */ }
    });
  }

  /* ------------------------------------------------ 初始数据 */
  var ATTRIBUTES = [
    {
      id: "int", name: "智力", value: 0,
      skills: [
        { id: "logic", name: "逻辑思维", level: 0 },
        { id: "encyclopedia", name: "博学多闻", level: 0 },
        { id: "rhetoric", name: "能说会道", level: 0 },
        { id: "drama", name: "故弄玄虚", level: 0 },
        { id: "conceptualization", name: "标新立异", level: 0 },
        { id: "visual-calculus", name: "见微知著", level: 0 }
      ]
    },
    {
      id: "psy", name: "精神", value: 0,
      skills: [
        { id: "volition", name: "平心定气", level: 0 },
        { id: "inland-empire", name: "内陆帝国", level: 0 },
        { id: "empathy", name: "通情达理", level: 0 },
        { id: "authority", name: "争强好胜", level: 0 },
        { id: "esprit-de-corps", name: "同舟共济", level: 0 },
        { id: "suggestion", name: "循循善诱", level: 0 }
      ]
    },
    {
      id: "phy", name: "体格", value: 0,
      skills: [
        { id: "endurance", name: "钢筋铁骨", level: 0 },
        { id: "pain-threshold", name: "坚忍不拔", level: 0 },
        { id: "physical-instrument", name: "强身健体", level: 0 },
        { id: "electrochemistry", name: "食髓知味", level: 0 },
        { id: "shivers", name: "天人感应", level: 0 },
        { id: "half-light", name: "疑神疑鬼", level: 0 }
      ]
    },
    {
      id: "mot", name: "身手", value: 0,
      skills: [
        { id: "hand-eye", name: "眼明手巧", level: 0 },
        { id: "perception", name: "五感发达", level: 0 },
        { id: "reaction-speed", name: "反应速度", level: 0 },
        { id: "savoir-faire", name: "鬼祟玲珑", level: 0 },
        { id: "interfacing", name: "能工巧匠", level: 0 },
        { id: "composure", name: "从容自若", level: 0 }
      ]
    }
  ];

  var PIP_COUNT = 5;
  var MAX_LEVEL = 5;
  var PF_NORMAL = 3;          /* 普通人标准线：低于它的分数在人物分析里标红 */
  var PF_HIGH = 4;            /* 高出一截的线：到它及以上的人物名在人物分析里标蓝 */
  var STORAGE_KEY = NS + "de-persona-board-v2";
  var PANELS = ["A"];

  var state = load() || freshState();

  /* ------------------------------------------------ 界面切换（单板 / 双板） */
  var VIEW_KEY = NS + "de-view-v1";
  var view = readView();

  function readView() {
    var m = /[?&]view=(panel|combo|lines|profile)\b/.exec(location.search);
    if (m) return m[1];
    try {
      var v = localStorage.getItem(VIEW_KEY);
      if (v === "panel" || v === "combo" || v === "lines" || v === "profile") return v;
    } catch (e) {}
    return "panel";
  }

  function applyView(v, remember) {
    view = v === "combo" || v === "lines" || v === "profile" ? v : "panel";
    document.body.dataset.view = view;
    if (boardsEl) boardsEl.dataset.view = view;
    var comboViewEl = document.getElementById("combo-view");
    if (comboViewEl) comboViewEl.dataset.view = view;
    var profViewEl = document.getElementById("profile-view");
    if (profViewEl) profViewEl.dataset.view = view;
    var linesViewEl = document.getElementById("lines-view");
    if (linesViewEl) linesViewEl.dataset.view = view;
    Array.prototype.forEach.call(document.querySelectorAll(".views button"), function (b) {
      var on = b.dataset.view === view;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    /* 先把标签与容器的显示状态切好（点击立刻有反馈），重活放到下一帧 */
    var target = view;
    if (target === "profile") {
      buildProfileView();
      viewBuilt.profile = true;
      viewDirty.profile = false;
    }
    if (target === "combo" || target === "lines") {
      var need = !viewBuilt[target] || viewDirty[target];
      if (need) {
        requestAnimationFrame(function () {
          if (view !== target) return;
          if (target === "combo") buildComboView();
          else if (target === "profile") buildProfileView();
          else buildLinesView();
        });
      }
    }
    if (remember) {
      try { localStorage.setItem(VIEW_KEY, view); } catch (e) {}
      var search = location.search
        .replace(/[?&]view=(panel|combo|lines|profile)/, "")
        .replace(/^\?&/, "?");
      if (search === "?") search = "";
      var next = location.pathname + search + (search ? "&" : "?") + "view=" + view + location.hash;
      history.replaceState(null, "", next);
    }
  }

  /* ------------------------------------------------ 长篇分析（第三界面） */
  var LINES_KEY = NS + "de-lines-v1";
  var LINES_CATS_KEY = NS + "de-lines-cats-v1";
  var lineBooks = loadLineBooks();
  var lineCats = loadLineCats();
  var lineCat = "";          /* ""=全部  "__none"=未分类  其它=分类 id */
  var lineQuery = "";

  function newBookId() {
    return "b" + Date.now().toString(36) + Math.floor(Math.random() * 46656).toString(36);
  }

  function cleanTagIds(arr) {
    var out = [];
    if (!Array.isArray(arr)) return out;
    arr.forEach(function (id) {
      var hit = null;
      ATTRIBUTES.forEach(function (a) {
        a.skills.forEach(function (k) { if (k.id === id) hit = k.id; });
      });
      if (hit && out.indexOf(hit) < 0) out.push(hit);
    });
    return out;
  }

  function cleanMarks(raw) {
    var out = {};
    if (Array.isArray(raw)) {                     /* 旧格式：全是「突出」 */
      cleanTagIds(raw).forEach(function (id) { out[id] = "up"; });
      return out;
    }
    if (raw && typeof raw === "object") {
      Object.keys(raw).forEach(function (id) {
        var v = raw[id];
        if (v !== "up" && v !== "down") return;
        var ok = null;
        ATTRIBUTES.forEach(function (a) {
          a.skills.forEach(function (k) { if (k.id === id) ok = k.id; });
        });
        if (ok) out[ok] = v;
      });
    }
    return out;
  }

  function normalizeBook(src) {
    var out = {
      id: (src && src.id) || newBookId(),
      title: src && src.title ? String(src.title) : "没起名字的一段",
      cat: src && src.cat ? String(src.cat) : "",
      lines: [],
      editing: false
    };
    var raw = src && Array.isArray(src.lines) ? src.lines : [];
    raw.forEach(function (ln) {
      out.lines.push({
        text: String((ln && ln.text) || ""),
        marks: cleanMarks(ln && (ln.marks || ln.tags))
      });
    });
    if (!out.lines.length) out.lines.push({ text: "", marks: {} });
    return out;
  }

  function loadLineBooks() {
    try {
      var raw = localStorage.getItem(LINES_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr.map(normalizeBook);
    } catch (e) { return []; }
  }

  function saveLineBooks() {
    try {
      localStorage.setItem(LINES_KEY, JSON.stringify(lineBooks.map(function (b) {
        return {
          id: b.id, title: b.title, cat: b.cat || "",
          lines: b.lines.map(function (ln) { return { text: ln.text, marks: ln.marks }; })
        };
      })));
    } catch (e) {}
  }

  function lineCatId() { return "lc" + Date.now().toString(36) + Math.floor(Math.random() * 1e3); }

  function loadLineCats() {
    try {
      var raw = localStorage.getItem(LINES_CATS_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr.filter(function (c) { return c && c.id; }).map(function (c) {
        return { id: String(c.id), name: String(c.name || "分类").slice(0, 8) };
      });
    } catch (e) { return []; }
  }

  function saveLineCats() {
    try { localStorage.setItem(LINES_CATS_KEY, JSON.stringify(lineCats)); } catch (e) {}
  }

  function lineCatName(id) {
    for (var i = 0; i < lineCats.length; i++) if (lineCats[i].id === id) return lineCats[i].name;
    return "";
  }

  var linesGridEl = document.getElementById("lines-grid");

  function bookMatches(b) {
    if (lineCat) {
      if (lineCat === "__none") { if (b.cat && lineCatName(b.cat)) return false; }
      else if (b.cat !== lineCat) return false;
    }
    if (!lineQuery) return true;
    var q = lineQuery.toLowerCase();
    if ((b.title || "").toLowerCase().indexOf(q) >= 0) return true;
    for (var i = 0; i < b.lines.length; i++) {
      if ((b.lines[i].text || "").toLowerCase().indexOf(q) >= 0) return true;
    }
    return false;
  }

  function buildLineCatBar() {
    var bar = document.getElementById("line-cat-bar");
    if (!bar) return;
    bar.innerHTML = "";
    function count(id) {
      if (!id) return lineBooks.length;
      return lineBooks.filter(function (b) {
        return id === "__none" ? (!b.cat || !lineCatName(b.cat)) : b.cat === id;
      }).length;
    }
    function chip(label, value, rename) {
      var btn = el("button", "cat-chip", bar);
      btn.type = "button";
      btn.dataset.cat = value;
      if (value === lineCat) btn.classList.add("is-on");
      var nm = el("span", "cat-name", btn);
      nm.textContent = label;
      el("span", "cat-num", btn).textContent = String(count(value));
      if (rename) {
        btn.title = "双击改名，右键删除";
        btn.addEventListener("dblclick", function (e) { e.preventDefault(); renameLineCat(value); });
        btn.addEventListener("contextmenu", function (e) { e.preventDefault(); removeLineCat(value); });
      }
      btn.addEventListener("click", function () {
        lineCat = lineCat === value ? "" : value;
        buildLinesView();
      });
      return btn;
    }
    chip("全部", "", false);
    chip("未分类", "__none", false);
    lineCats.forEach(function (c) { chip(c.name, c.id, true); });
    var add = el("button", "cat-add", bar);
    add.type = "button";
    add.textContent = "+ 分类";
    add.addEventListener("click", function () {
      var c = { id: lineCatId(), name: "新分类" };
      lineCats.push(c);
      saveLineCats();
      lineCat = c.id;
      buildLinesView();
      renameLineCat(c.id);
    });
    var hint = el("span", "cat-hint", bar);
    hint.textContent = "点分类筛选；双击改名；右键删除";
  }

  function renameLineCat(id) {
    var bar = document.getElementById("line-cat-bar");
    var chipEl = bar && bar.querySelector('.cat-chip[data-cat="' + id + '"]');
    if (!chipEl) return;
    var nm = chipEl.querySelector(".cat-name");
    var old = nm.textContent;
    nm.setAttribute("contenteditable", "true");
    nm.focus();
    function done(save) {
      nm.removeAttribute("contenteditable");
      var v = String(nm.textContent || "").replace(/\s+/g, "").slice(0, 8);
      if (!save || !v) v = old;
      for (var i = 0; i < lineCats.length; i++) if (lineCats[i].id === id) lineCats[i].name = v;
      saveLineCats();
      buildLinesView();
    }
    nm.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); done(true); }
      else if (e.key === "Escape") { e.preventDefault(); done(false); }
    });
    nm.addEventListener("blur", function () { done(true); });
  }

  function removeLineCat(id) {
    if (!window.confirm("删除分类「" + (lineCatName(id) || "分类") + "」？里面的文章会变成「未分类」，不会被删掉")) return;
    lineCats = lineCats.filter(function (c) { return c.id !== id; });
    lineBooks.forEach(function (b) { if (b.cat === id) b.cat = ""; });
    if (lineCat === id) lineCat = "";
    saveLineCats();
    saveLineBooks();
    buildLinesView();
  }

  /* ------------------------------------------------ 视图懒建：切界面只在必要时重画 */
  var viewBuilt = { combo: false, lines: false, profile: false };
  var viewDirty = { combo: true, lines: true, profile: true };

  function buildComboView() {
    if (view !== "combo") { viewDirty.combo = true; return; }
    renderComboView();
    viewBuilt.combo = true;
    viewDirty.combo = false;
  }

  function buildLinesView() {
    if (view !== "lines") { viewDirty.lines = true; return; }
    renderLinesView();
    viewBuilt.lines = true;
    viewDirty.lines = false;
  }

  function renderLinesView() {
    if (!linesGridEl) return;
    window.__VIEW_BUILDS__ = window.__VIEW_BUILDS__ || { combo: 0, lines: 0 };
    window.__VIEW_BUILDS__.lines++;
    buildLineCatBar();
    linesGridEl.innerHTML = "";
    var shown = lineBooks.filter(bookMatches);
    if (!lineBooks.length) {
      var empty = el("div", "combo-empty", linesGridEl);
      empty.textContent = "还没有长篇分析。点上面的「+ 新建一篇」开始 —— 一篇可以有很多段，每段行尾挂人格。";
      return;
    }
    if (!shown.length) {
      var none = el("div", "combo-empty", linesGridEl);
      none.textContent = "没有满足条件的文章 —— 点「全部」或者清空搜索。";
      return;
    }
    shown.forEach(function (b) { buildLineCard(b); });
  }

  function buildLineCard(b) {
    var card = el("article", "lb", linesGridEl);
    card.dataset.id = b.id;

    var head = el("header", "lb-head", card);
    var title = el("div", "lb-title", head);
    title.textContent = b.title;
    title.dataset.ph = "这篇叫什么（自己起名）";
    title.addEventListener("input", function () {
      b.title = title.textContent.replace(/\s+/g, " ").trim();
      saveLineBooks();
    });

    var tools = el("div", "lb-tools", head);
    var catTag = el("span", "cc-cat", tools);
    catTag.hidden = !(b.cat && lineCatName(b.cat));
    catTag.textContent = b.cat && lineCatName(b.cat) ? lineCatName(b.cat) : "";
    var catSel = document.createElement("select");
    catSel.className = "cc-cat-sel lb-cat-sel";
    catSel.hidden = true;
    catSel.addEventListener("change", function () {
      b.cat = catSel.value;
      saveLineBooks();
      buildLinesView();
    });
    tools.appendChild(catSel);

    var edit = el("button", "lb-edit", tools);
    edit.type = "button";
    edit.addEventListener("click", function () {
      b.editing = !b.editing;
      renderLineCard(card, b);
      saveLineBooks();
    });

    var del = el("button", "lb-del", tools);
    del.type = "button";
    del.textContent = "×";
    del.title = "删掉这一篇";
    del.addEventListener("click", function () {
      if (!window.confirm("删掉「" + (b.title || "未命名") + "」这一整篇？")) return;
      lineBooks = lineBooks.filter(function (x) { return x.id !== b.id; });
      saveLineBooks();
      buildLinesView();
      toast("已删掉一篇");
    });

    el("div", "lb-lines", card);
    el("div", "lb-actions", card);
    renderLineCard(card, b);
  }

  var openPicker = null;

  function closePicker() {
    if (openPicker && openPicker.parentNode) openPicker.parentNode.removeChild(openPicker);
    openPicker = null;
  }

  /* Esc 直接收起人格网格（比来回点「收起」快） */
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" && e.key !== "Esc") return;
    if (!openPicker) return;
    closePicker();
    e.stopPropagation();
    e.preventDefault();
  }, true);

  function markCell(cell, v) {
    cell.dataset.pick = v || "off";
    if (v === "up") cell.title = "突出（蓝）· 再点取消";
    else if (v === "down") cell.title = "弱化（红）· 右键取消";
    else cell.title = "点=突出（蓝），右键=弱化（红）";
  }

  function openTagGrid(anchor, line, card, b) {
    closePicker();
    var pop = el("div", "lb-grid", card);
    ATTRIBUTES.forEach(function (a) {
      var row = el("div", "lb-grid-row", pop);
      var lab = el("span", "lb-grid-attr", row);
      lab.textContent = a.name;
      lab.dataset.attr = a.id;
      var cells = el("div", "lb-grid-cells", row);
      a.skills.forEach(function (k) {
        var cell = el("button", "lb-cell", cells);
        cell.type = "button";
        cell.dataset.skill = k.id;
        markCell(cell, line.marks[k.id]);
        var nm = el("span", "lb-cell-name", cell);
        nm.textContent = k.name;
        cell.addEventListener("click", function (e) {
          e.preventDefault();
          line.marks[k.id] = line.marks[k.id] === "up" ? "" : "up";
          if (!line.marks[k.id]) delete line.marks[k.id];
          markCell(cell, line.marks[k.id]);
          saveLineBooks();
          refreshTags(card, b);
        });
        cell.addEventListener("contextmenu", function (e) {
          e.preventDefault();
          line.marks[k.id] = line.marks[k.id] === "down" ? "" : "down";
          if (!line.marks[k.id]) delete line.marks[k.id];
          markCell(cell, line.marks[k.id]);
          saveLineBooks();
          refreshTags(card, b);
        });
      });
    });
    var head = el("div", "lb-grid-head", pop);
    head.textContent = "点一下＝突出（蓝），右键＝弱化（红），再点一次取消";
    var close = el("button", "lb-grid-close", head);
    close.type = "button";
    close.textContent = "收起";
    close.addEventListener("click", closePicker);
    openPicker = pop;
    /* 定位到按钮下方 */
    var box = anchor.getBoundingClientRect();
    var cardBox = card.getBoundingClientRect();
    pop.style.left = Math.max(0, Math.min(box.left - cardBox.left - 40, Math.max(0, cardBox.width - 540))) + "px";
    pop.style.top = (box.bottom - cardBox.top + 6) + "px";
  }

  /* 只重画标签那一块，不整卡重建（避免丢焦点） */
  function refreshTags(card, b) {
    var lineRows = card.querySelectorAll(".lb-row");
    b.lines.forEach(function (line, i) {
      var row = lineRows[i];
      if (!row) return;
      var box = row.querySelector(".lb-tags");
      if (!box) return;
      paintTags(box, line, card, b);
    });
  }

  function paintTags(box, line, card, b) {
    var editing = !!b.editing;
    box.innerHTML = "";
    Object.keys(line.marks).forEach(function (id) {
      var k = skillOf(id);
      var chip = el("span", "lb-tag", box);
      chip.dataset.pick = line.marks[id];
      chip.textContent = "#" + (k ? k.name : id);
      chip.title = (k ? k.attr + " · " : "") + (line.marks[id] === "up" ? "突出" : "弱化");
      chip.addEventListener("click", function (e) {
        e.preventDefault();
        openCodex(id);
      });
      if (editing) {
        var x = el("button", "lb-tag-x", chip);
        x.type = "button";
        x.textContent = "×";
        x.addEventListener("click", function (e) {
          e.stopPropagation();
          delete line.marks[id];
          saveLineBooks();
          refreshTags(card, b);
        });
      }
    });
    if (editing) {
      var btn = el("button", "lb-pick-btn", box);
      btn.type = "button";
      btn.textContent = "+ 人格";
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (openPicker && openPicker.dataset.for === lineKey(line)) { closePicker(); return; }
        openTagGrid(btn, line, card, b);
        if (openPicker) openPicker.dataset.for = lineKey(line);
      });
    }
  }

  var lineKeys = [];
  function lineKey(line) {
    var i = lineKeys.indexOf(line);
    if (i < 0) { lineKeys.push(line); i = lineKeys.length - 1; }
    return String(i);
  }

  function renderLineCard(card, b) {
    var editing = !!b.editing;
    card.classList.toggle("is-editing", editing);
    card.querySelector(".lb-edit").textContent = editing ? "编辑中…" : "✎ 编辑";

    var titleEl = card.querySelector(".lb-title");
    if (titleEl) {
      titleEl.setAttribute("contenteditable", editing ? "true" : "false");
      titleEl.classList.toggle("is-editable", editing);
    }

    var tagEl = card.querySelector(".lb-tools .cc-cat");
    var selEl = card.querySelector(".lb-cat-sel");
    if (tagEl) {
      var has = b.cat && lineCatName(b.cat);
      tagEl.hidden = editing || !has;
      tagEl.textContent = has ? lineCatName(b.cat) : "";
    }
    if (selEl) {
      selEl.hidden = !editing;
      if (editing) {
        selEl.innerHTML = "";
        var o0 = document.createElement("option");
        o0.value = "";
        o0.textContent = "未分类";
        selEl.appendChild(o0);
        lineCats.forEach(function (c) {
          var o = document.createElement("option");
          o.value = c.id;
          o.textContent = c.name;
          selEl.appendChild(o);
        });
        selEl.value = b.cat || "";
      }
    }

    var list = card.querySelector(".lb-lines");
    list.innerHTML = "";
    b.lines.forEach(function (line, idx) {
      var row = el("div", "lb-row", list);
      var textEl = el("div", "lb-text", row);
      textEl.textContent = line.text;
      textEl.dataset.ph = "写一段分析 / 一句词";
      textEl.setAttribute("contenteditable", editing ? "true" : "false");
      textEl.addEventListener("input", function () {
        line.text = textEl.textContent.replace(/\s+$/, "");
        saveLineBooks();
      });

      var tagsBox = el("div", "lb-tags", row);
      paintTags(tagsBox, line, card, b);

      if (editing && b.lines.length > 1) {
        var rm = el("button", "lb-row-del", row);
        rm.type = "button";
        rm.textContent = "−";
        rm.title = "删掉这一段";
        rm.addEventListener("click", function () {
          b.lines.splice(idx, 1);
          saveLineBooks();
          renderLineCard(card, b);
        });
      }
    });

    var paste = card.querySelector(".lb-paste-wrap");
    if (!paste) {
      paste = el("div", "lb-paste-wrap", card);
      var ta = document.createElement("textarea");
      ta.className = "lb-paste";
      ta.placeholder = "把一整段文字粘贴到这里，点「按行分段」，它会一行一段地拆开";
      paste.appendChild(ta);
      var go = el("button", "lb-paste-go", paste);
      go.type = "button";
      go.textContent = "按行分段 →";
      go.addEventListener("click", function () {
        var raw = String(ta.value || "");
        if (!raw.trim()) { toast("先粘一段文字进来"); return; }
        var rows = raw.split(/\n+/).map(function (t) { return t.trim(); }).filter(Boolean);
        if (!rows.length) { toast("没读出内容"); return; }
        rows.forEach(function (t) { b.lines.push({ text: t, marks: {} }); });
        ta.value = "";
        saveLineBooks();
        renderLineCard(card, b);
        toast("拆成 " + rows.length + " 段，逐段点「+ 人格」挂人");
      });
    }
    paste.hidden = !editing;

    var actions = card.querySelector(".lb-actions");
    actions.innerHTML = "";
    if (editing) {
      var addRow = el("button", "lb-addrow", actions);
      addRow.type = "button";
      addRow.textContent = "+ 一段";
      addRow.addEventListener("click", function () {
        b.lines.push({ text: "", marks: {} });
        saveLineBooks();
        renderLineCard(card, b);
        var texts = card.querySelectorAll(".lb-text");
        if (texts.length) texts[texts.length - 1].focus();
      });

      var done = el("button", "lb-done", actions);
      done.type = "button";
      done.textContent = "完成";
      done.addEventListener("click", function () {
        b.editing = false;
        saveLineBooks();
        renderLineCard(card, b);
        toast("写好了");
      });
    }

    /* 阅读态：内容太长就折叠，给一个「展开全文 / 收起」 */
    var overflowing = b.lines.length > 4;
    var folded = !editing && (b.collapsed === undefined ? overflowing : !!b.collapsed);
    var fold = card.querySelector(".lb-fold");
    if (!fold) {
      fold = el("button", "lb-fold", card);
      fold.type = "button";
      fold.addEventListener("click", function () {
        b.collapsed = card.classList.contains("is-folded") ? false : true;
        saveLineBooks();
        renderLineCard(card, b);
      });
    }
    card.classList.toggle("is-folded", folded);
    fold.hidden = editing || !overflowing;
    fold.textContent = folded ? "展开全文 ▾" : "收起 ▴";
  }

  function addLineBook() {
    var b = normalizeBook({ title: "" });
    b.title = "";
    b.editing = true;
    b.cat = lineCat && lineCat !== "__none" && lineCatName(lineCat) ? lineCat : "";
    lineBooks.unshift(b);
    saveLineBooks();
    buildLinesView();
    var first = linesGridEl.querySelector(".lb:first-child .lb-title");
    if (first) first.focus();
    toast("新建一篇：起个名字，然后一段段写");
  }

  function exportLineBooks() {
    if (!lineBooks.length) { toast("还没有文章，没有可导出的东西"); return; }
    var stamp = new Date().toISOString().slice(0, 10);
    download("persona-longform-" + stamp + ".json", JSON.stringify({
      kind: "persona-longform",
      v: 1,
      exportedAt: new Date().toISOString(),
      categories: lineCats.map(function (c) { return { id: c.id, name: c.name }; }),
      books: lineBooks.map(function (b) {
        return {
          id: b.id, title: b.title, cat: b.cat || "",
          lines: b.lines.map(function (ln) { return { text: ln.text, marks: ln.marks }; })
        };
      })
    }, null, 2));
    toast("已导出 " + lineBooks.length + " 篇");
  }

  function mergeLineCats(list) {
    if (!Array.isArray(list)) return;
    list.forEach(function (raw) {
      if (!raw) return;
      var name = String(raw.name || "").replace(/\s+/g, "").slice(0, 8);
      if (!name) return;
      var id = String(raw.id || "");
      var hit = null;
      lineCats.forEach(function (c) { if (c.id === id || c.name === name) hit = c; });
      if (hit) return;
      lineCats.push({ id: id || lineCatId(), name: name });
    });
    saveLineCats();
  }

  function importLineBooks(data) {
    if (!data) return;
    mergeLineCats(data.categories);
    var list = Array.isArray(data) ? data : data.books;
    if (!Array.isArray(list)) { toast("这个文件里没有文章"); return; }
    var n = 0;
    list.forEach(function (raw) {
      var b = normalizeBook(raw);
      var old = null;
      lineBooks.forEach(function (x) { if (x.id === b.id) old = x; });
      if (old) { old.title = b.title; old.cat = b.cat; old.lines = b.lines; }
      else lineBooks.push(b);
      n++;
    });
    saveLineBooks();
    buildLinesView();
    toast("已导入 " + n + " 篇");
  }

  /* 长篇分析：按钮与搜索 */
  (function bindLinesUI() {
    var newBtn = document.getElementById("line-new");
    if (newBtn) newBtn.addEventListener("click", addLineBook);

    var expBtn = document.getElementById("line-exp");
    if (expBtn) expBtn.addEventListener("click", exportLineBooks);

    var fileEl = document.getElementById("line-file");
    var impBtn = document.getElementById("line-imp");
    if (impBtn && fileEl) {
      impBtn.addEventListener("click", function () { fileEl.click(); });
      fileEl.addEventListener("change", function () {
        var f = fileEl.files && fileEl.files[0];
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function () {
          try {
            importLineBooks(JSON.parse(String(reader.result)));
          } catch (e) {
            toast("这个文件读不出来");
          }
          fileEl.value = "";
        };
        reader.readAsText(f);
      });
    }

    var qEl = document.getElementById("line-search");
    var qClear = document.getElementById("line-search-clear");
    function paint() {
      if (qClear) qClear.hidden = !lineQuery;
      buildLinesView();
    }
    if (qEl) {
      qEl.addEventListener("input", function () {
        lineQuery = qEl.value.trim();
        paint();
      });
      qEl.addEventListener("keydown", function (e) {
        if (e.key === "Escape") { qEl.value = ""; lineQuery = ""; paint(); }
      });
    }
    if (qClear) {
      qClear.addEventListener("click", function () {
        if (qEl) qEl.value = "";
        lineQuery = "";
        paint();
        if (qEl) qEl.focus();
      });
    }
  })();

  /* ------------------------------------------------ 思维阁（第三界面） */
  var COMBO_KEY = NS + "de-combo-v1";
  var CATS_KEY = NS + "de-combo-cats-v1";
  var combos = loadCombos();
  var comboCats = loadCats();
  var activeCat = "";              /* ""=全部  "__none"=未分类  其它=分类 id */

  function newComboId() {
    return "c" + Date.now().toString(36) + Math.floor(Math.random() * 46656).toString(36);
  }

  /* 一条组合：{ id, title, note, picks, objects, active }
     picks   = 主体那 24 人格
     objects = 若干个「对象」，每个 { name, picks }，一个组合可以挂好几个
     active  = "main" 或对象的下标，记正在改哪一侧 */
  function cleanNotes(raw) {
    var bag = {};
    if (raw) {
      Object.keys(raw).forEach(function (k) {
        var v = raw[k];
        if (typeof v === "string" && v.trim()) bag[k] = v.trim().slice(0, 40);
      });
    }
    return bag;
  }

  function cleanPicks(raw) {
    var bag = {};
    if (raw) {
      Object.keys(raw).forEach(function (k) {
        if (raw[k] === "up" || raw[k] === "down") bag[k] = raw[k];
      });
    }
    return bag;
  }

  function normalizeCombo(src) {
    var out = {
      id: (src && src.id) || newComboId(),
      title: src && (src.title || src.name) ? String(src.title || src.name) : "没起名字的组合",
      note: src && src.note ? String(src.note) : "",
      picks: {},
      notes: cleanNotes(src && src.notes),
      objects: [],
      cat: src && src.cat ? String(src.cat) : "",
      active: "main",
      editing: false
    };
    if (src && Array.isArray(src.objects)) {
      src.objects.forEach(function (o) {
        out.objects.push({
          name: objNameOf(o && o.name),
          picks: cleanPicks(o && o.picks),
          notes: cleanNotes(o && o.notes)
        });
      });
    } else {
      /* 兼容只有一侧对象的旧存档 */
      var rawB = src && (src.picksB || src.objectPicks);
      if (rawB && Object.keys(rawB).length) {
        out.objects.push({ name: objNameOf(src.objName), picks: cleanPicks(rawB) });
      }
    }
    if (typeof src.active === "number" && src.active >= 0 && src.active < out.objects.length) {
      out.active = src.active;
    } else if (src && src.side === "B" && out.objects.length) {
      out.active = 0;
    }
    if (src && src.picks) {
      Object.keys(src.picks).forEach(function (k) {
        if (src.picks[k] === "up" || src.picks[k] === "down") out.picks[k] = src.picks[k];
      });
    } else if (src && src.levels) {
      /* 兼容上一版 0–5 的分数：>=4 算突出，<=1 算弱化 */
      Object.keys(src.levels).forEach(function (k) {
        var v = src.levels[k];
        if (v >= 4) out.picks[k] = "up";
        else if (v <= 1) out.picks[k] = "down";
      });
    }
    return out;
  }

  /* 对象侧的名字：默认「对象」，最多 5 个字 */
  function objNameOf(v) {
    var name = String(v == null ? "" : v).replace(/\s+/g, "").trim();
    if (!name) return "对象";
    return Array.from(name).slice(0, 5).join("");
  }

  /* 当前在改哪一侧：主体 / 第几个对象 */
  function activeObj(c) {
    return typeof c.active === "number" ? c.objects[c.active] : null;
  }

  function sideLabel(c) {
    var o = activeObj(c);
    if (!o) return "主体 · 24 人格";
    return o.name + " · 对象 " + (c.active + 1) + " / " + c.objects.length;
  }

  function catId() { return "cat" + Date.now().toString(36) + Math.floor(Math.random() * 1e3); }

  function loadCats() {
    try {
      var raw = localStorage.getItem(CATS_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr.filter(function (c) { return c && c.id; }).map(function (c) {
        return { id: String(c.id), name: String(c.name || "分类").slice(0, 8) };
      });
    } catch (e) { return []; }
  }

  function saveCats() {
    try { localStorage.setItem(CATS_KEY, JSON.stringify(comboCats)); } catch (e) {}
  }

  function catName(id) {
    for (var i = 0; i < comboCats.length; i++) if (comboCats[i].id === id) return comboCats[i].name;
    return "";
  }

  function loadCombos() {
    try {
      var raw = localStorage.getItem(COMBO_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr.map(normalizeCombo);
    } catch (e) {
      return [];
    }
  }

  function saveCombos() {
    try {
      localStorage.setItem(COMBO_KEY, JSON.stringify(combos.map(function (c) {
        var first = c.objects[0];
        return {
          id: c.id,
          title: c.title,
          note: c.note,
          cat: c.cat || "",
          picks: c.picks,
          notes: c.notes,
          objects: c.objects.map(function (o) {
            return { name: o.name, picks: o.picks, notes: o.notes };
          }),
          objName: first ? first.name : objNameOf(""),
          picksB: first ? first.picks : {}
        };
      })));
    } catch (e) {}
  }

  /* 筛选状态：buildComboView 在初始化阶段就会调用，所以必须先声明 */
  /* 打字时别每个按键都序列化 + 写 localStorage：攒一小会儿再写 */
  var comboSaveTimer = null;
  function saveCombosSoon(delay) {
    if (comboSaveTimer) clearTimeout(comboSaveTimer);
    comboSaveTimer = setTimeout(function () {
      comboSaveTimer = null;
      saveCombos();
    }, delay || 300);
  }
  function saveCombosNow() {
    if (comboSaveTimer) { clearTimeout(comboSaveTimer); comboSaveTimer = null; }
    saveCombos();
  }

  var filterSel = {};              /* skillId -> "up" | "down" */
  var comboQuery = "";             /* 思维阁标题 / 解释里的关键词 */
  var expandedCards = {};          /* comboId -> true：单卡「全文」 */
  var expandAll = false;           /* 顶部「全部展开」 */

  var comboGridEl = document.getElementById("combo-grid");

  function skillOf(id) {
    var found = null;
    ATTRIBUTES.forEach(function (a) {
      if (found) return;
      a.skills.forEach(function (k) {
        if (k.id === id) found = { id: k.id, name: k.name, attr: a.name, attrId: a.id };
      });
    });
    return found;
  }

  function syncComboClamp() {
    if (!comboGridEl) return;
    Array.prototype.forEach.call(comboGridEl.querySelectorAll(".cc"), function (card) {
      var t = card.querySelector(".cc-title");
      var more = card.querySelector(".cc-more");
      if (!t || !more) return;
      var clamped = t.scrollHeight - t.clientHeight > 2;
      card.classList.toggle("has-more", clamped);
      card.classList.toggle("is-open", !!expandedCards[card.dataset.id] || expandAll);
    });
  }

  /* ---- 分类栏 ---- */
  function catCount(id) {
    if (!id) return combos.length;   /* 全部 */
    var n = 0;
    combos.forEach(function (c) {
      if (id === "__none" ? !c.cat || !catName(c.cat) : c.cat === id) n++;
    });
    return n;
  }

  function buildCatBar() {
    var bar = document.getElementById("cat-bar");
    if (!bar) return;
    bar.innerHTML = "";

    function chip(label, value, opts) {
      var b = el("button", "cat-chip", bar);
      b.type = "button";
      b.dataset.cat = value;
      if (value === activeCat) b.classList.add("is-on");
      var nameSpan = el("span", "cat-name", b);
      nameSpan.textContent = label;
      var num = el("span", "cat-num", b);
      num.textContent = String(catCount(value));
      if (opts && opts.rename) {
        b.title = "双击改名，右键删除";
        b.addEventListener("dblclick", function (e) {
          e.preventDefault();
          startCatRename(value);
        });
        b.addEventListener("contextmenu", function (e) {
          e.preventDefault();
          removeCat(value);
        });
      }
      b.addEventListener("click", function () {
        activeCat = activeCat === value ? "" : value;
        buildCatBar();
        applyComboFilter();
      });
      return b;
    }

    chip("全部", "", null);
    chip("未分类", "__none", null);
    comboCats.forEach(function (c) { chip(c.name, c.id, { rename: true }); });

    var addBtn = el("button", "cat-add", bar);
    addBtn.type = "button";
    addBtn.textContent = "+ 分类";
    addBtn.title = "新建一个分类，建好就能改名";
    addBtn.addEventListener("click", function () {
      var c = { id: catId(), name: "新分类" };
      comboCats.push(c);
      saveCats();
      activeCat = c.id;
      buildCatBar();
      applyComboFilter();
      startCatRename(c.id);
    });

    var hint = el("span", "cat-hint", bar);
    hint.textContent = "点分类筛选；双击改名；右键删除";
  }

  function startCatRename(id) {
    var bar = document.getElementById("cat-bar");
    var chipEl = bar && bar.querySelector('.cat-chip[data-cat="' + id + '"]');
    if (!chipEl) return;
    var nameEl = chipEl.querySelector(".cat-name");
    var old = nameEl.textContent;
    nameEl.setAttribute("contenteditable", "true");
    nameEl.focus();
    function done(save) {
      nameEl.removeAttribute("contenteditable");
      var v = String(nameEl.textContent || "").replace(/\s+/g, "").slice(0, 8);
      if (!save || !v) v = old;
      for (var i = 0; i < comboCats.length; i++) if (comboCats[i].id === id) comboCats[i].name = v;
      saveCats();
      buildCatBar();
      buildComboView();
      applyComboFilter();
    }
    nameEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); done(true); }
      else if (e.key === "Escape") { e.preventDefault(); done(false); }
    });
    nameEl.addEventListener("blur", function () { done(true); });
  }

  function removeCat(id) {
    var name = catName(id) || "这个分类";
    if (!window.confirm("删除分类「" + name + "」？里面的组合会变成「未分类」，不会被删掉")) return;
    comboCats = comboCats.filter(function (c) { return c.id !== id; });
    combos.forEach(function (c) { if (c.cat === id) c.cat = ""; });
    if (activeCat === id) activeCat = "";
    saveCats();
    saveCombos();
    buildCatBar();
    buildComboView();
    applyComboFilter();
  }

  function renderComboView() {
    if (!comboGridEl) return;
    window.__VIEW_BUILDS__ = window.__VIEW_BUILDS__ || { combo: 0, lines: 0 };
    window.__VIEW_BUILDS__.combo++;
    comboGridEl.innerHTML = "";
    if (!combos.length) {
      var empty = el("div", "combo-empty", comboGridEl);
      empty.textContent = "还没有组合。点上面的「+ 新建一条」开始 —— 左键点格子标蓝，右键标红。";
      return;
    }
    combos.forEach(function (c) { buildComboCard(c); });
    buildCatBar();
    if (typeof applyComboFilter === "function") applyComboFilter();
    syncComboClamp();
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(syncComboClamp);

    /* 点卡片外面 = 结束编辑（给「完成」多一条退路） */
    if (!window.__COMBO_OUTSIDE_BOUND__) {
      window.__COMBO_OUTSIDE_BOUND__ = true;
      document.addEventListener("click", function (e) {
        var editingCards = comboGridEl.querySelectorAll(".cc.is-editing");
        if (!editingCards.length) return;
        var t = e.target;
        for (var i = 0; i < editingCards.length; i++) {
          var card = editingCards[i];
          if (card.contains(t)) continue;
          var live = null;
          for (var j = 0; j < combos.length; j++) if (combos[j].id === card.dataset.id) live = combos[j];
          if (!live) continue;
          live.editing = false;
          live.collapsed = false;
          renderComboCard(card, live);
        }
        saveCombosNow();
      }, true);
    }
  }

  window.addEventListener("resize", function () {
    if (typeof syncComboClamp === "function") syncComboClamp();
  });

  function startNoteEdit(chip, skillId, notes, noteEl, comboId, side) {
    if (editingNoteEl) finishNoteEdit();
    editingNoteEl = {
      chip: chip, noteEl: noteEl, notes: notes,
      skillId: skillId, comboId: comboId, side: side
    };
    chip.dataset.editing = "1";
    chip.classList.add("is-editing-note");
    noteEl.hidden = false;
    var colon = chip.querySelector(".pk-colon");
    if (colon) colon.hidden = false;
    noteEl.setAttribute("contenteditable", "true");
    noteEl.dataset.ph = "写一句";
    if (!noteEl.textContent) noteEl.innerHTML = "";
    noteEl.focus();
    var sel = window.getSelection();
    if (sel) {
      var range = document.createRange();
      range.selectNodeContents(noteEl);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }

  function finishNoteEdit(save) {
    var st = editingNoteEl;
    if (!st) return;
    editingNoteEl = null;
    var txt = st.noteEl.textContent.replace(/\s+/g, " ").trim().slice(0, 40);
    st.noteEl.removeAttribute("contenteditable");
    st.chip.dataset.editing = "";
    st.chip.classList.remove("is-editing-note");
    if (save !== false) {
      var target = null;
      for (var i = 0; i < combos.length; i++) {
        if (combos[i].id === st.comboId) target = combos[i];
      }
      var bag = st.notes;
      if (target) {
        if (st.side === "main") bag = target.notes;
        else if (target.objects[st.side]) bag = target.objects[st.side].notes;
      }
      if (!bag) bag = st.notes;
      if (txt) bag[st.skillId] = txt;
      else delete bag[st.skillId];
      saveCombos();
      paintComboCardNow(st.chip);
    }
  }

  var editingNoteEl = null;

  document.addEventListener("keydown", function (e) {
    if (!editingNoteEl) return;
    if (e.key === "Enter") {
      e.preventDefault();
      finishNoteEdit(true);
    } else if (e.key === "Escape") {
      e.preventDefault();
      finishNoteEdit(false);
    }
  });

  document.addEventListener("mousedown", function (e) {
    if (!editingNoteEl) return;
    if (editingNoteEl.chip.contains(e.target)) return;
    finishNoteEdit(true);
  }, true);

  function paintComboCardNow(node) {
    var card = node.closest ? node.closest(".cc") : null;
    if (!card) return;
    for (var i = 0; i < combos.length; i++) {
      if (combos[i].id === card.dataset.id) {
        renderComboCard(card, combos[i]);
        return;
      }
    }
  }

  function buildComboCard(c) {
    var card = el("article", "cc", comboGridEl);
    card.dataset.id = c.id;

    var head = el("header", "cc-head", card);
    var title = el("div", "cc-title", head);
    title.textContent = c.title;
    title.dataset.ph = "一句话：这是谁 / 这是什么组合";
    title.addEventListener("input", function () {
      c.title = title.textContent.replace(/\s+/g, " ").trim();
      saveCombosSoon();
    });
    title.addEventListener("blur", function () {
      if (!c.title) title.textContent = "";
      saveCombosNow();
    });

    var tools = el("div", "cc-tools", head);
    var catTag = el("span", "cc-cat", tools);
    catTag.hidden = true;
    var catSel = document.createElement("select");
    catSel.className = "cc-cat-sel";
    catSel.hidden = true;
    catSel.addEventListener("change", function () {
      c.cat = catSel.value;
      saveCombosNow();
      /* 归完类这张卡必须还看得见：新分类不在当前筛选里，就把筛选切过去 */
      if (!comboMatchesCat(c)) {
        activeCat = c.cat || "";
        if (typeof toast === "function" && c.cat) toast("已归到「" + catName(c.cat) + "」，左边已切到这个分类");
      }
      buildCatBar();
      renderComboCard(card, c);
      applyComboFilter();
    });
    tools.appendChild(catSel);

    var moreBtn = el("button", "cc-more", tools);
    moreBtn.type = "button";
    moreBtn.addEventListener("click", function () {
      expandedCards[c.id] = !expandedCards[c.id];
      card.classList.toggle("is-open", !!expandedCards[c.id]);
      moreBtn.textContent = expandedCards[c.id] ? "收起" : "全文";
    });

    var toolsRow = el("div", "cc-tools-row", tools);
    var editBtn = el("button", "cc-edit", toolsRow);
    editBtn.type = "button";
    editBtn.addEventListener("click", function () {
      c.editing = !c.editing;
      renderComboCard(card, c);
      saveCombos();
    });

    var del = el("button", "cc-del", toolsRow);
    del.type = "button";
    del.textContent = "×";
    del.title = "删掉这一条";
    del.addEventListener("click", function () {
      if (!window.confirm("删掉「" + (c.title || "未命名") + "」？")) return;
      combos = combos.filter(function (x) { return x.id !== c.id; });
      saveCombos();
      buildComboView();
      toast("已删掉一条");
    });

    /* 阅读态：主体一行；对象可以有好几行 */
    el("div", "cc-picks cc-picks-a", card);
    el("div", "cc-objs", card);

    /* 编辑态：24 格全露出来 */
    var editor = el("div", "cc-editor", card);
    var grid = el("div", "cc-grid", editor);

    ATTRIBUTES.forEach(function (a) {
      a.skills.forEach(function (k) {
        var cell = el("button", "cc-cell", grid);
        cell.type = "button";
        cell.dataset.skill = k.id;
        cell.dataset.attr = a.id;
        cell.style.backgroundImage = 'url("' + assetUrl("assets/cards/" + assetName(k.id) + ".jpg") + '")';
        el("span", "cc-num", cell);
        cell.addEventListener("click", function (e) {
          e.preventDefault();
          togglePick(c, k.id, "up", e.shiftKey);
          renderComboCard(card, c);
          saveCombos();
        });
        cell.addEventListener("contextmenu", function (e) {
          e.preventDefault();
          togglePick(c, k.id, "down", e.shiftKey);
          renderComboCard(card, c);
          saveCombos();
        });
      });
    });

    /* 解释栏：编辑完再露出来，之后一直可写 */
    var note = el("textarea", "cc-note", card);
    note.rows = 2;
    note.placeholder = "解释：为什么是这几项一起出现？（写完自动保存）";
    note.value = c.note;
    note.addEventListener("input", function () {
      c.note = note.value;
      autosize(note);
      saveCombosSoon();
    });
    note.addEventListener("blur", function () {
      saveCombosNow();
    });

    /* 底部一排：左边「对象」切换，右边「完成」 */
    var actions = el("div", "cc-actions", card);

    var nameInput = el("input", "cc-objname", actions);
    nameInput.type = "text";
    nameInput.setAttribute("maxlength", "5");
    nameInput.placeholder = "对象";
    nameInput.title = "给当前这个「对象」起个名（最多 5 个字）";
    nameInput.addEventListener("input", function () {
      var o = activeObj(c);
      if (!o) return;
      o.name = objNameOf(nameInput.value);
      saveCombos();
      renderComboCard(card, c);
    });
    nameInput.addEventListener("blur", function () {
      var o = activeObj(c);
      if (!o) return;
      o.name = objNameOf(nameInput.value);
      nameInput.value = o.name === "对象" ? "" : o.name;
      saveCombos();
      renderComboCard(card, c);
    });

    var sideBtn = el("button", "cc-side", actions);
    sideBtn.type = "button";
    sideBtn.title = "切换这一格是给谁标的：主体 / 对象 1 / 对象 2 …";
    sideBtn.addEventListener("click", function () {
      if (c.active === "main") c.active = c.objects.length ? 0 : "main";
      else if (c.active + 1 < c.objects.length) c.active = c.active + 1;
      else c.active = "main";
      renderComboCard(card, c);
      saveCombos();
      toast(c.active === "main" ? "现在标的是「主体」" : "现在标的是「" + c.objects[c.active].name + "」");
    });

    var addObj = el("button", "cc-addobj", actions);
    addObj.type = "button";
    addObj.textContent = "+ 对象";
    addObj.title = "再挂一个对象（一条组合可以有好几个对象）";
    addObj.addEventListener("click", function () {
      c.objects.push({ name: "对象" + (c.objects.length + 1), picks: {} });
      c.active = c.objects.length - 1;
      renderComboCard(card, c);
      saveCombos();
      toast("加了第 " + c.objects.length + " 个对象");
    });

    var delObj = el("button", "cc-delobj", actions);
    delObj.type = "button";
    delObj.textContent = "− 对象";
    delObj.title = "删掉当前这个对象";
    delObj.addEventListener("click", function () {
      if (typeof c.active !== "number") return;
      var o = c.objects[c.active];
      if (!window.confirm("删掉「" + o.name + "」这一侧？")) return;
      c.objects.splice(c.active, 1);
      c.active = c.objects.length ? Math.min(c.active, c.objects.length - 1) : "main";
      renderComboCard(card, c);
      saveCombos();
      toast("删掉了一个对象");
    });

    var done = el("button", "cc-done", actions);
    done.type = "button";
    done.textContent = "完成";
    done.addEventListener("click", function () {
      /* 先把还在编辑框里的字落盘，再退出编辑态 */
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      /* 按 id 找回「现役」那条，避免拿到旧引用导致点了没反应 */
      var live = null;
      for (var i = 0; i < combos.length; i++) if (combos[i].id === c.id) live = combos[i];
      if (!live) live = c;
      c.editing = false;
      live.editing = false;
      live.collapsed = false;
      saveCombosNow();
      /* 就地重画（保留 DOM 节点）；万一这张卡已经被重建过就直接刷整块 */
      if (card.parentNode) renderComboCard(card, live);
      else buildComboView();
      card.classList.add("flash-note");
      setTimeout(function () { card.classList.remove("flash-note"); }, 700);
    });

    renderComboCard(card, c);
  }

  function sidePicks(c) {
    var o = activeObj(c);
    return o ? o.picks : c.picks;
  }

  function togglePick(c, skillId, dir, keep) {
    var bag = sidePicks(c);
    var cur = bag[skillId];
    if (cur === dir) delete bag[skillId];   /* 同色再点一次 = 取消 */
    else bag[skillId] = dir;
  }

  function renderComboCard(card, c) {
    var editing = !!c.editing;
    card.classList.toggle("is-editing", editing);

    /* 分类：阅读态一枚小标签，编辑态一个下拉 */
    var catTagEl = card.querySelector(".cc-cat");
    var catSelEl = card.querySelector(".cc-cat-sel");
    var myCat = c.cat && catName(c.cat) ? c.cat : "";
    if (catTagEl) {
      catTagEl.hidden = editing || !myCat;
      catTagEl.textContent = myCat ? catName(myCat) : "";
    }
    if (catSelEl) {
      catSelEl.hidden = !editing;
      if (editing) {
        catSelEl.innerHTML = "";
        var optNone = document.createElement("option");
        optNone.value = "";
        optNone.textContent = "未分类";
        catSelEl.appendChild(optNone);
        comboCats.forEach(function (cc2) {
          var o = document.createElement("option");
          o.value = cc2.id;
          o.textContent = cc2.name;
          catSelEl.appendChild(o);
        });
        catSelEl.value = myCat;
      }
    }
    card.querySelector(".cc-edit").textContent = editing ? "编辑中…" : "✎ 编辑";
    var titleEl = card.querySelector(".cc-title");
    titleEl.setAttribute("contenteditable", editing ? "true" : "false");
    if (titleEl.textContent !== c.title && document.activeElement !== titleEl) {
      titleEl.textContent = c.title;
    }

    var moreEl = card.querySelector(".cc-more");
    card.classList.toggle("is-open", !!expandedCards[c.id]);
    if (moreEl) {
      moreEl.textContent = expandedCards[c.id] ? "收起" : "全文";
      moreEl.hidden = editing;
      card.classList.toggle("has-more", !editing && titleEl.scrollHeight - titleEl.clientHeight > 2);
    }

    function pickList(bag) {
      var ups = [];
      var downs = [];
      ATTRIBUTES.forEach(function (a) {
        a.skills.forEach(function (k) {
          if (bag[k.id] === "up") ups.push(k);
          else if (bag[k.id] === "down") downs.push(k);
        });
      });
      return { ups: ups, downs: downs };
    }

    function paintPicks(box, bag, notes, withTag, tagText, side) {
      box.innerHTML = "";
      var list = pickList(bag);
      if (withTag && (list.ups.length || list.downs.length)) {
        var tag = el("span", "pk-tag", box);
        tag.textContent = tagText || "对象";
      }
      function chipFor(k, dir, notes, side) {
        var chip = el("span", "pk " + dir, box);
        chip.dataset.skill = k.id;
        chip.title = "左键写一句话 · 右键打开「" + k.name + "」的人格档案";
        var nameEl = el("span", "pk-name", chip);
        nameEl.textContent = k.name;
        var colonEl = el("span", "pk-colon", chip);
        colonEl.textContent = "：";
        var noteEl = el("span", "pk-note", chip);
        var txt = (notes && notes[k.id]) || "";
        noteEl.textContent = txt;
        colonEl.hidden = noteEl.hidden = !txt;

        /* 左键：改这句备注 */
        chip.addEventListener("click", function (e) {
          if (chip.dataset.editing === "1") return;
          e.stopPropagation();
          startNoteEdit(chip, k.id, notes, noteEl, c.id, side);
        });
        /* 右键：进卡片（人格档案） */
        chip.addEventListener("contextmenu", function (e) {
          e.preventDefault();
          openCodex(k.id);
        });
        return chip;
      }

      var sideKey = side === undefined ? "main" : side;
      list.ups.forEach(function (k) { chipFor(k, "up", notes, sideKey); });
      list.downs.forEach(function (k) { chipFor(k, "down", notes, sideKey); });
      return list.ups.length + list.downs.length;
    }

    var boxA = card.querySelector(".cc-picks-a");
    var objsBox = card.querySelector(".cc-objs");
    objsBox.innerHTML = "";
    var nA = paintPicks(boxA, c.picks, c.notes, false, "", "main");
    var nObjTotal = 0;
    var nObjRows = 0;
    c.objects.forEach(function (o, oi) {
      var row = el("div", "cc-picks cc-picks-b", objsBox);
      var n = paintPicks(row, o.picks, o.notes, true, o.name, oi);
      nObjTotal += n;
      if (n) {
        nObjRows++;
        row.dataset.obj = o.name;
      } else {
        row.classList.add("is-empty");
        if (editing) {
          var t = el("span", "pk-tag", row);
          t.textContent = o.name;
          var e = el("span", "cc-hint-inline", row);
          e.textContent = "还没给这个对象标任何一项";
        }
      }
    });
    if (!nA && !nObjTotal) {
      var hint = el("span", "cc-hint", boxA);
      hint.textContent = editing ? "点格子标蓝（突出）· 右键 / 长按标红（弱化）· 再点一次取消"
        : "还没挑任何一项，点右上角「✎ 编辑」开始。";
    }
    if (!nA && nObjTotal) boxA.classList.add("is-empty");
    card.classList.toggle("has-object", nObjTotal > 0);
    card.classList.toggle("multi-object", c.objects.length > 1);

    var sideBtnEl = card.querySelector(".cc-side");
    if (sideBtnEl) {
      var ao = activeObj(c);
      sideBtnEl.textContent = sideLabel(c);
      sideBtnEl.classList.toggle("is-b", !!ao);
    }

    var nameEl = card.querySelector(".cc-objname");
    var curObj = activeObj(c);
    if (nameEl) {
      nameEl.hidden = !curObj;
      if (curObj) {
        var shown = curObj.name === "对象" ? "" : curObj.name;
        if (document.activeElement !== nameEl && nameEl.value !== shown) nameEl.value = shown;
      }
    }
    var delEl = card.querySelector(".cc-delobj");
    if (delEl) delEl.hidden = !curObj;
    card.classList.toggle("editing-b", editing && !!curObj);

    /* 编辑态：24 格 + 三态（读的是当前这一侧） */
    var activeBag = sidePicks(c);
    Array.prototype.forEach.call(card.querySelectorAll(".cc-cell"), function (cell) {
      var id = cell.dataset.skill;
      var st = activeBag[id] || "off";
      cell.dataset.pick = st;
      var sk = skillOf(id);
      cell.querySelector(".cc-num").textContent = st === "up" ? "▲" : st === "down" ? "▼" : "";
      cell.title = (sk ? sk.attr + " · " + sk.name : id) +
        "　左键=蓝（突出）／右键=红（弱化）／再点一次取消";
    });

    var note = card.querySelector(".cc-note");
    var showNote = editing || !!c.note;
    note.classList.toggle("is-show", showNote);
    if (note.value !== c.note) note.value = c.note;
    autosize(note);
  }

  function autosize(ta) {
    ta.style.height = "auto";
    ta.style.height = Math.min(200, Math.max(38, ta.scrollHeight)) + "px";
  }

  function addCombo() {
    if (comboQuery) {
      comboQuery = "";
      if (comboSearchEl) comboSearchEl.value = "";
      syncSearchClear();
    }
    /* 正在看某个分类时，新建的就归到这一类里，别跳到「全部」 */
    var newCat = activeCat && activeCat !== "__none" && catName(activeCat) ? activeCat : "";
    var c = normalizeCombo({ title: "", cat: newCat });
    c.title = "";
    c.editing = true;
    combos.unshift(c);
    saveCombos();
    buildComboView();
    var first = comboGridEl.querySelector(".cc:first-child .cc-title");
    if (first) first.focus();
    toast("新建了一条：左键点格子标蓝，右键标红");
  }

  /* 招牌技能王冠的 SVG：不规则的锯齿冠，接近美术里那颗白色王冠的味道 */
  var CROWN_PATH =
    "M8 96 L18 40 L34 86 L50 22 L64 84 L76 6 L90 86 L106 20 L120 86 L134 44 L148 96 Z";
  var CROWN_SVG =
    '<svg viewBox="0 0 160 96" aria-hidden="true" focusable="false">' +
    '<path d="' + CROWN_PATH + '" fill="currentColor"/></svg>';

  /* ------------------------------------------------ 状态工具 */
  function panelSnapshot(name) {
    var p = { name: name || "", attrs: {}, skills: {}, picks: {}, sig: null };
    ATTRIBUTES.forEach(function (a) {
      p.attrs[a.id] = a.value;
      a.skills.forEach(function (k) { p.skills[k.id] = k.level; });
    });
    return p;
  }

  function freshState() {
    return { A: panelSnapshot("A"), B: panelSnapshot("B") };
  }

  function load() {
    try {
      var hash = decodeHash();
      if (hash) return hash;
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var saved = JSON.parse(raw);
      /* 旧版本的初始值是全 3；这份存档如果还是原封不动的全 3，
         说明用户从没动过，直接丢掉，让新的「全 0 起步」生效 */
      if (isLegacyDefault(saved)) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return normalize(saved);
    } catch (e) {
      return null;
    }
  }

  function isLegacyDefault(src) {
    if (!src || typeof src !== "object") return false;
    var panels = src.A || src.B ? [src.A, src.B] : [src];
    return panels.every(function (p) {
      if (!p) return true;
      if (p.sig) return false;                                   /* 挂过招牌王冠就算动过 */
      if (p.picks && Object.keys(p.picks).length) return false;   /* 标过「已选」也算动过 */
      var attrs = p.attrs || {};
      var skills = p.skills || {};
      var boxes = [];
      if (p.attrs) boxes.push(Object.keys(attrs).map(function (k) { return attrs[k]; }));
      if (p.skills) boxes.push(Object.keys(skills).map(function (k) { return skills[k]; }));
      return boxes.every(function (list) {
        return list.length && list.every(function (v) { return v === 3; });
      });
    });
  }

  /* 兼容三种输入：双板 {A,B}、单板 {attrs,...}（老版本）、空 */
  function normalize(src) {
    if (src && (src.attrs || src.skills)) {
      return { A: normalizePanel(src, "A"), B: panelSnapshot("B") };
    }
    return {
      A: normalizePanel(src && src.A, "A"),
      B: normalizePanel(src && src.B, "B")
    };
  }

  function normalizePanel(src, fallbackName) {
    var b = panelSnapshot();
    var out = { name: cleanName(src && src.name, fallbackName), attrs: {}, skills: {}, picks: {}, sig: null };
    Object.keys(b.attrs).forEach(function (k) {
      out.attrs[k] = clamp(src && src.attrs ? src.attrs[k] : b.attrs[k], b.attrs[k]);
    });
    Object.keys(b.skills).forEach(function (k) {
      out.skills[k] = clamp(src && src.skills ? src.skills[k] : b.skills[k], b.skills[k]);
    });
    if (src && src.picks) {
      Object.keys(src.picks).forEach(function (k) { if (src.picks[k]) out.picks[k] = true; });
    }
    if (src && typeof src.sig === "string" && b.skills.hasOwnProperty(src.sig)) {
      out.sig = src.sig;
    }
    return out;
  }

  /* 板名：去掉换行、限长，空了就退回 A / B */
  function cleanName(v, fallback) {
    if (typeof v !== "string") return fallback;
    var s = v.replace(/[\r\n\t]/g, " ").trim().slice(0, 10);
    return s || fallback;
  }

  function clamp(v, fallback) {
    var n = parseInt(v, 10);
    if (!isFinite(n)) n = fallback;
    return Math.max(0, Math.min(MAX_LEVEL, n));
  }

  function copyPanel(p) {
    return {
      attrs: Object.assign({}, p.attrs),
      skills: Object.assign({}, p.skills),
      picks: Object.assign({}, p.picks),
      sig: p.sig
    };
  }

  var saveTimer = null;
  function save(silent) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        if (location.hash) history.replaceState(null, "", location.pathname + location.search);
        if (!silent) toast("已保存到本机");
      } catch (e) {
        if (!silent) toast("浏览器拒绝保存（隐私模式？）");
      }
    }, 240);
  }

  /* ------------------------------------------------ DOM 构建 */
  var boardsEl = document.getElementById("boards");
  var refs = {};

  function el(tag, cls, parent) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (parent) parent.appendChild(n);
    return n;
  }

  function buildBoards() {
    PANELS.forEach(function (key) {
      var col = el("section", "board-col", boardsEl);
      col.dataset.board = key;

      var cap = el("div", "board-cap", col);
      var tag = el("input", "tag tag-input", cap);
      tag.type = "text";
      tag.maxLength = 10;
      tag.value = state[key].name;
      tag.title = "点这里改这张板的名字";
      tag.setAttribute("aria-label", key + " 板名称");
      tag.addEventListener("input", function () {
        state[key].name = cleanName(tag.value, key);
        paintStats();
        save(true);
      });
      tag.addEventListener("blur", function () {
        state[key].name = cleanName(tag.value, key);
        tag.value = state[key].name;
        paintStats();
        save(true);
      });
      tag.addEventListener("keydown", function (e) {
        if (e.key === "Enter") tag.blur();
      });

      var capSum = el("span", "cap-item", cap);
      capSum.innerHTML = "合计 <b>0</b>";
      var capMax = el("span", "cap-item", cap);
      capMax.innerHTML = "最高 <b>0</b>";
      var capDiff = null;
      if (key === "B") {
        capDiff = el("span", "cap-item cap-diff", cap);
        capDiff.innerHTML = "差异 <b>0</b> 项";
      }

      var grid = el("div", "board", col);
      grid.dataset.board = key;

      refs[key] = {
        col: col, grid: grid, attrs: {}, skills: {}, tag: tag,
        sum: capSum.querySelector("b"),
        max: capMax.querySelector("b"),
        diff: capDiff ? capDiff.querySelector("b") : null
      };

      ATTRIBUTES.forEach(function (attr) {
        buildAttr(key, attr);
      });
    });
  }

  function buildAttr(key, attr) {
    var grid = refs[key].grid;
    var col = el("section", "attr", grid);
    col.dataset.attr = attr.id;

    var head = el("div", "attr-head", col);
    var num = el("input", "attr-num", head);
    num.type = "text";
    num.inputMode = "numeric";
    num.maxLength = 1;
    num.value = state[key].attrs[attr.id];
    num.setAttribute("aria-label", attr.name + " 等级（" + key + " 板）");

    var pips = el("div", "pips", col);
    var pipEls = [];
    for (var i = 0; i < PIP_COUNT; i++) {
      (function (idx) {
        var p = el("button", "pip", pips);
        p.type = "button";
        p.setAttribute("aria-label", attr.name + " 第 " + (idx + 1) + " 点");
        p.addEventListener("click", function () {
          setAttr(key, attr.id, nextValue(state[key].attrs[attr.id], idx));
        });
        pipEls.push(p);
      })(i);
    }

    var plus = el("button", "plus", pips);
    plus.type = "button";
    plus.textContent = "+";
    plus.title = "增加 " + attr.name;
    plus.addEventListener("click", function () { stepAttr(key, attr.id, 1); });

    var nameRow = el("div", "attr-name-row", col);
    var name = el("div", "attr-name", nameRow);
    name.textContent = attr.name;
    var delta = el("span", "attr-delta", nameRow);

    var foot = el("div", "attr-foot", col);
    foot.innerHTML = "小计 <b>0</b> · " + attr.skills.length + " 项";

    refs[key].attrs[attr.id] = {
      num: num, pips: pipEls, plus: plus, delta: delta, foot: foot,
      sub: foot.querySelector("b"),
      skillIds: attr.skills.map(function (s) { return s.id; })
    };

    num.addEventListener("input", onNumberInput(function (v) { setAttr(key, attr.id, v); }, 1, function () { return state[key].attrs[attr.id]; }));
    num.addEventListener("blur", function () { paintAttr(key, attr.id); });
    num.addEventListener("keydown", function (e) {
      if (e.key === "ArrowUp") { e.preventDefault(); setAttr(key, attr.id, state[key].attrs[attr.id] + 1); }
      else if (e.key === "ArrowDown") { e.preventDefault(); setAttr(key, attr.id, state[key].attrs[attr.id] - 1); }
    });

    attr.skills.forEach(function (skill) {
      buildCard(key, col.parentNode, attr, skill);
    });
  }

  function buildCard(key, grid, attr, skill) {
    var card = el("article", "card", grid);
    card.dataset.skill = skill.id;
    card.dataset.attr = attr.id;
    card.dataset.board = key;
    if (state[key].picks[skill.id]) card.classList.add("is-on");

    var art = el("div", "art", card);
    var img = el("img", null, art);
    img.src = assetUrl("assets/cards/" + assetName(skill.id) + ".jpg");
    img.alt = skill.name + " 卡面";
    img.draggable = false;
    /* 底部半透明条要用同一张卡面做「透出来的底」，这里存成 CSS 变量 */
    card.style.setProperty("--art", 'url("' + img.src + '")');
    /* 单击卡面：翻开这个人格的档案（没写过的人格不弹窗）；双击：标记 / 取消「已选」 */
    art.addEventListener("click", function () {
      if (!(PERSONA_CODEX[skill.id] || (loadCodexStore() || {})[skill.id])) return;
      openCodex(skill.id);
    });
    art.addEventListener("dblclick", function () {
      card.classList.toggle("is-on");
      state[key].picks[skill.id] = card.classList.contains("is-on");
      save(true);
    });

    // 悬停 / 键盘聚焦：两张板上同一项一起点亮，方便对照
    card.addEventListener("mouseenter", function () { focusSkill(skill.id); });
    card.addEventListener("mouseleave", clearFocus);

    // 招牌技能：额头王冠 + 卡片右上角的设置按钮
    var crown = el("div", "crown", card);
    crown.innerHTML = CROWN_SVG;

    var sigBtn = el("button", "sig-btn", card);
    sigBtn.type = "button";
    sigBtn.innerHTML = CROWN_SVG;
    sigBtn.title = "设为招牌技能（再点一次取消）";
    sigBtn.setAttribute("aria-label", "把「" + skill.name + "」设为招牌技能");
    sigBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      setSig(key, state[key].sig === skill.id ? null : skill.id);
    });

    // 差异角标（只在 B 板上显示）
    var delta = null;
    if (key === "B") {
      delta = el("span", "delta", card);
      delta.title = "B 相对 A 的差值";
    }

    var bar = el("div", "bar", card);
    var pipRow = el("div", "bar-row", bar);
    var pips = el("div", "pips", pipRow);
    var pipEls = [];
    for (var i = 0; i < PIP_COUNT; i++) {
      (function (idx) {
        var p = el("button", "pip", pips);
        p.type = "button";
        p.setAttribute("aria-label", skill.name + " 第 " + (idx + 1) + " 点");
        p.addEventListener("click", function () {
          setSkill(key, skill.id, nextValue(state[key].skills[skill.id], idx));
        });
        pipEls.push(p);
      })(i);
    }

    var row = el("div", "bar-row", bar);
    var name = el("div", "name", row);
    name.textContent = skill.name;

    var badge = el("label", "badge", row);
    var input = el("input", null, badge);
    input.type = "text";
    input.inputMode = "numeric";
    input.maxLength = 1;
    input.value = state[key].skills[skill.id];
    input.setAttribute("aria-label", skill.name + " 等级（" + key + " 板）");
    input.addEventListener("input", onNumberInput(function (v) { setSkill(key, skill.id, v); }, 1, function () { return state[key].skills[skill.id]; }));
    input.addEventListener("blur", function () { paintSkill(key, skill.id); });
    input.addEventListener("focus", function () { focusSkill(skill.id); });
    input.addEventListener("blur", clearFocus);
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowUp") { e.preventDefault(); setSkill(key, skill.id, state[key].skills[skill.id] + 1); }
      else if (e.key === "ArrowDown") { e.preventDefault(); setSkill(key, skill.id, state[key].skills[skill.id] - 1); }
    });
    input.addEventListener("wheel", function (e) {
      if (document.activeElement !== input) return;
      e.preventDefault();
      setSkill(key, skill.id, state[key].skills[skill.id] + (e.deltaY < 0 ? 1 : -1));
    }, { passive: false });

    refs[key].skills[skill.id] = {
      card: card, input: input, pips: pipEls, name: skill.name,
      sigBtn: sigBtn, delta: delta
    };
    return card;
  }

  var ASSET_INDEX = null;
  function assetName(id) {
    if (!ASSET_INDEX) {
      ASSET_INDEX = {};
      var n = 0;
      ATTRIBUTES.forEach(function (a) {
        a.skills.forEach(function (k) {
          ASSET_INDEX[k.id] = "r" + (Math.floor(n / 6) + 1) + "-c" + (n % 6 + 1);
          n++;
        });
      });
    }
    return ASSET_INDEX[id] || "r1-c1";
  }

  /* ------------------------------------------------ 数值写入 */
  function onNumberInput(writer, digits, current) {
    return function (e) {
      var re = new RegExp("[^\\d]", "g");
      var raw = e.target.value.replace(re, "").slice(0, digits);
      if (raw !== e.target.value) e.target.value = raw;
      if (raw === "") {
        // 全删空时回到当前数值，别留一个空框
        if (current) e.target.value = String(current());
        return;
      }
      writer(parseInt(raw, 10));
    };
  }

  function setSkill(key, id, value) {
    value = Math.max(0, Math.min(MAX_LEVEL, value));
    state[key].skills[id] = value;
    paintSkill(key, id);
    paintStats();
    save(true);
  }

  function setAttr(key, id, value) {
    value = Math.max(0, Math.min(MAX_LEVEL, value));
    state[key].attrs[id] = value;
    paintAttr(key, id);
    paintStats();
    save(true);
  }

  function stepAttr(key, id, delta) { setAttr(key, id, state[key].attrs[id] + delta); }

  /* 招牌技能：每张板各一个，点到哪张卡就挪到哪张卡 */
  function setSig(key, id) {
    state[key].sig = id;
    paintSig(key);
    save(true);
    toast(id ? key + " 板招牌技能：" + refs[key].skills[id].name : key + " 板已取消招牌技能");
  }

  function paintSig(key) {
    Object.keys(refs[key].skills).forEach(function (id) {
      var on = state[key].sig === id;
      refs[key].skills[id].card.classList.toggle("is-sig", on);
      var btn = refs[key].skills[id].sigBtn;
      if (btn) {
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        btn.title = on ? "取消招牌技能" : "设为招牌技能";
      }
    });
  }

  function nextValue(current, pipIndex) {
    return current === pipIndex + 1 ? pipIndex : pipIndex + 1;
  }

  /* 对照辅助：把 A / B 两张板上同一个技能一起点亮 */
  var focusedSkill = null;

  function focusSkill(id) {
    if (focusedSkill === id) return;
    clearFocus();
    focusedSkill = id;
    PANELS.forEach(function (key) {
      var r = refs[key].skills[id];
      if (r) r.card.classList.add("is-focus");
    });
    document.body.classList.add("has-focus");
  }

  function clearFocus() {
    focusedSkill = null;
    document.body.classList.remove("has-focus");
    PANELS.forEach(function (key) {
      Object.keys(refs[key].skills).forEach(function (id) {
        refs[key].skills[id].card.classList.remove("is-focus");
      });
    });
  }

  function paintSkill(key, id) {
    var r = refs[key].skills[id];
    if (!r) return;
    var v = state[key].skills[id];
    if (r.input.value !== String(v)) r.input.value = v;
    r.pips.forEach(function (p, i) { p.classList.toggle("on", i < Math.min(v, PIP_COUNT)); });
    paintSub(key, r.card.dataset.attr);
  }

  /* 四大分类各自的小计（6 项技能相加） */
  function paintSub(key, attrId) {
    var a = refs[key].attrs[attrId];
    if (!a || !a.sub) return;
    var sum = a.skillIds.reduce(function (t, id) { return t + state[key].skills[id]; }, 0);
    if (a.sub.textContent !== String(sum)) a.sub.textContent = sum;
  }

  function paintAttr(key, id) {
    var r = refs[key].attrs[id];
    if (!r) return;
    var v = state[key].attrs[id];
    if (r.num.value !== String(v)) r.num.value = v;
    r.pips.forEach(function (p, i) { p.classList.toggle("on", i < Math.min(v, PIP_COUNT)); });
    paintSub(key, id);
  }

  /* 差值角标 + 差异高亮 */
  function paintDiff() {
    /* 双板对照已删除，只剩一块板时不需要算差值 */
    if (!refs.B) return 0;
    var skillDiff = 0;
    ATTRIBUTES.forEach(function (attr) {
      var da = state.B.attrs[attr.id] - state.A.attrs[attr.id];
      var dEl = refs.B.attrs[attr.id].delta;
      if (dEl) {
        dEl.textContent = da === 0 ? "" : (da > 0 ? "+" + da : String(da));
        dEl.className = "attr-delta" + (da > 0 ? " up" : da < 0 ? " down" : "");
      }
      refs.A.attrs[attr.id].num.parentNode.parentNode.classList.toggle("is-diff", da !== 0);

      attr.skills.forEach(function (skill) {
        var d = state.B.skills[skill.id] - state.A.skills[skill.id];
        if (d !== 0) skillDiff++;
        var aRef = refs.A.skills[skill.id];
        var bRef = refs.B.skills[skill.id];
        aRef.card.classList.toggle("is-diff", d !== 0);
        bRef.card.classList.toggle("is-diff", d !== 0);
        if (bRef.delta) {
          bRef.delta.textContent = d === 0 ? "" : (d > 0 ? "+" + d : String(d));
          bRef.delta.className = "delta" + (d > 0 ? " up" : d < 0 ? " down" : "") + (d === 0 ? " is-zero" : "");
        }
      });
    });
    return skillDiff;
  }

  function paintStats() {
    var diff = paintDiff();
    PANELS.forEach(function (key) {
      var values = Object.keys(state[key].skills).map(function (k) { return state[key].skills[k]; });
      var sum = values.reduce(function (a, b) { return a + b; }, 0);
      var r = refs[key];
      if (r.sum) r.sum.textContent = sum;
      if (r.max) r.max.textContent = Math.max.apply(null, values);
      if (r.diff) r.diff.textContent = diff;
      if (r.tag && r.tag.value !== state[key].name) r.tag.value = state[key].name;
    });
    var nameA = document.getElementById("name-a");
    var nameB = document.getElementById("name-b");
    var sumA = document.getElementById("sum-a");
    var sumB = document.getElementById("sum-b");
    var dc = document.getElementById("diff-count");
    if (nameA) nameA.textContent = state.A.name;
    if (nameB) nameB.textContent = state.B.name;
    if (sumA) sumA.textContent = sumOf("A");
    if (sumB) sumB.textContent = sumOf("B");
    var maxA = document.getElementById("max-a");
    if (maxA) maxA.textContent = maxOf("A");
    if (dc) dc.textContent = diff;
  }

  function maxOf(key) {
    var values = Object.keys(state[key].skills).map(function (k) { return state[key].skills[k]; });
    return Math.max.apply(null, values);
  }

  function sumOf(key) {
    return Object.keys(state[key].skills).reduce(function (a, k) { return a + state[key].skills[k]; }, 0);
  }

  function paintAll() {
    PANELS.forEach(function (key) {
      ATTRIBUTES.forEach(function (a) {
        paintAttr(key, a.id);
        a.skills.forEach(function (k) {
          paintSkill(key, k.id);
          refs[key].skills[k.id].card.classList.toggle("is-on", !!state[key].picks[k.id]);
        });
      });
      paintSig(key);
    });
    paintStats();
  }

  /* ------------------------------------------------ 提示条 */
  var hintEl = document.getElementById("hint");
  var hintTimer = null;
  function toast(msg) {
    hintEl.textContent = msg;
    hintEl.classList.add("show");
    clearTimeout(hintTimer);
    hintTimer = setTimeout(function () { hintEl.classList.remove("show"); }, 1600);
  }

  /* ------------------------------------------------ 分享 / 导入导出 */
  function encodeHash() {
    var payload = JSON.stringify({
      v: 2,
      A: { n: state.A.name, a: state.A.attrs, s: state.A.skills, p: state.A.picks, g: state.A.sig },
      B: { n: state.B.name, a: state.B.attrs, s: state.B.skills, p: state.B.picks, g: state.B.sig }
    });
    return btoa(unescape(encodeURIComponent(payload))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function decodeHash() {
    if (!location.hash || location.hash.length < 8) return null;
    try {
      var b = location.hash.slice(1).replace(/-/g, "+").replace(/_/g, "/");
      while (b.length % 4) b += "=";
      var raw = JSON.parse(decodeURIComponent(escape(atob(b))));
      var pick = function (x) {
        return x ? { name: x.n, attrs: x.a, skills: x.s, picks: x.p, sig: x.g } : null;
      };
      return normalize({ A: pick(raw.A), B: pick(raw.B) });
    } catch (e) {
      return null;
    }
  }

  function download(name, text) {
    var blob = new Blob([text], { type: "application/json;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
  }

  function plainPanel(p) {
    return { name: p.name, attrs: p.attrs, skills: p.skills, picks: p.picks, sig: p.sig };
  }

  /* 单文件打包版：资源被塞进 __ASSETS__ 里，按路径查表，查不到就照旧走相对路径 */
  function assetUrl(path) {
    var map = window.__ASSETS__;
    return (map && map[path]) || path;
  }

  /* 单文件打包版：作者图库里的照片也写进去，第一次打开时补进 IndexedDB */
  function seedPics() {
    var pics = window.__SEED_PICS__;
    if (!pics || !pics.length) return;
    try {
      if (localStorage.getItem(NS + "de-seed-pics-v1")) return;
    } catch (e) { return; }
    var jobs = pics.map(function (p) {
      return fetch(p.data).then(function (r) { return r.blob(); })
        .then(function (b) { return mediaAdd(p.skill, b); })
        .catch(function () {});
    });
    Promise.all(jobs).then(function () {
      try { localStorage.setItem(NS + "de-seed-pics-v1", "1"); } catch (e) {}
    });
  }

  setTimeout(seedPics, 900);

  /* ---- 打包版：把作者的全部内容导出成一个文件 ---- */
  function bundleSkillIds() {
    var ids = [];
    ATTRIBUTES.forEach(function (a) {
      a.skills.forEach(function (k) { ids.push(k.id); });
    });
    return ids;
  }

  function blobToDataUrl(blob) {
    return new Promise(function (resolve) {
      if (!blob || !window.FileReader) return resolve(null);
      var fr = new FileReader();
      fr.onload = function () { resolve(String(fr.result)); };
      fr.onerror = function () { resolve(null); };
      fr.readAsDataURL(blob);
    });
  }

  function exportBundle() {
    var keys = {};
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(NS + "de-") === 0) keys[k] = localStorage.getItem(k);
    }
    var jobs = bundleSkillIds().map(function (sid) {
      return mediaList(sid).then(function (list) {
        return list.map(function (item) { return { skill: sid, item: item }; });
      }).catch(function () { return []; });
    });
    Promise.all(jobs).then(function (groups) {
      var reads = [];
      var pics = [];
      groups.forEach(function (group) {
        group.forEach(function (x) {
          reads.push(blobToDataUrl(x.item && x.item.blob).then(function (url) {
            if (url) pics.push({ skill: x.skill, mime: (x.item.blob && x.item.blob.type) || "image/jpeg", data: url });
          }));
        });
      });
      return Promise.all(reads).then(function () { return pics; });
    }).then(function (pics) {
      var stamp = new Date().toISOString().slice(0, 10);
      download("persona-bundle-" + stamp + ".json", JSON.stringify({
        kind: "de-bundle", v: 1, exportedAt: new Date().toISOString(),
        keys: keys, pics: pics
      }));
      toast("已导出全部内容：" + Object.keys(keys).length + " 项存档、" + pics.length + " 张图库照片");
    }).catch(function () {
      toast("导出失败了，稍后再试一次");
    });
  }

  document.querySelector(".toolbar").addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-action]");
    if (!btn) return;
    var action = btn.dataset.action;

    if (action === "reset") {
      state = freshState();
      paintAll();
      save(true);
      toast("两张都回到 0");
    } else if (action === "random") {
      PANELS.forEach(function (key) {
        ATTRIBUTES.forEach(function (a) {
          state[key].attrs[a.id] = Math.floor(Math.random() * (MAX_LEVEL + 1));
          a.skills.forEach(function (k) {
            state[key].skills[k.id] = Math.floor(Math.random() * (MAX_LEVEL + 1));
          });
        });
      });
      paintAll();
      save(true);
      toast("两张各随机了一套 0–5");
    } else if (action === "copy") {
      state.B.attrs = Object.assign({}, state.A.attrs);
      state.B.skills = Object.assign({}, state.A.skills);
      paintAll();
      save(true);
      toast("已把 A 的数值同步到 B");
    } else if (action === "export") {
      download("persona-board.json", JSON.stringify({
        A: plainPanel(state.A),
        B: plainPanel(state.B),
        combos: combos
      }, null, 2));
      toast("已导出 JSON（含 " + combos.length + " 个角色）");
    } else if (action === "import") {
      document.getElementById("import-file").click();
    } else if (action === "cexp") {
      var ids = Object.keys(codexStore);
      if (!ids.length) {
        toast("人格档案还没改过内容，没有可导出的东西");
        return;
      }
      var stamp = new Date().toISOString().slice(0, 10);
      download("persona-codex-" + stamp + ".json", JSON.stringify({
        kind: "persona-codex",
        v: 1,
        exportedAt: new Date().toISOString(),
        entries: codexStore
      }, null, 2));
      toast("已导出 " + ids.length + " 条档案");
    } else if (action === "ballexp") {
      exportBundle();
    } else if (action === "cimp") {
      document.getElementById("codex-file").click();
    } else if (action === "share") {
      var url = location.pathname + location.search + "#" + encodeHash();
      history.replaceState(null, "", url);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        /* 无头/无焦点环境下 writeText 会被拒，别让它变成未捕获的异常 */
        navigator.clipboard.writeText(location.href).catch(function () {});
      }
      toast("链接已生成（两张面板都写进地址栏）");
    } else if (action === "shot") {
      document.body.classList.toggle("shot");
      btn.classList.toggle("active");
      toast(document.body.classList.contains("shot") ? "已进入截图模式" : "已退出截图模式");
    }
  });

  document.getElementById("import-file").addEventListener("change", function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        state = normalize(data);
        if (Array.isArray(data && data.combos)) {
          combos = data.combos.map(normalizeCombo);
          saveCombos();
          buildComboView();
        }
        paintAll();
        save(true);
        toast("已导入数值");
      } catch (err) {
        toast("这个文件不是有效的 JSON");
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  });

  var codexFileInput = document.getElementById("codex-file");
  if (codexFileInput) codexFileInput.addEventListener("change", function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var n = 0;
      try {
        n = importCodexData(JSON.parse(reader.result));
      } catch (err) {
        toast("这个文件不是有效的 JSON");
        e.target.value = "";
        return;
      }
      if (!n) {
        toast("文件里没找到可用的档案条目");
      } else {
        if (codexEl && !codexEl.hidden && codexId) openCodex(codexId);
        toast("已导入 " + n + " 条档案");
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  });

  /* 接受两种格式：{kind,entries} 或直接的 {id: 词条} 映射；
     词条本身可以是「扁平」的（collectCodex 存下来的样子），也可以是 {sections:{...}} 嵌套的 */
  var CODEX_ENTRY_KEYS = ["keywords", "traits", "job", "figures", "quotes", "scenes", "mechanics"];
  function looksLikeCodexEntry(v) {
    if (!v || typeof v !== "object") return false;
    if (v.sections && typeof v.sections === "object") return true;
    return CODEX_ENTRY_KEYS.some(function (k) { return Array.isArray(v[k]); });
  }

  function importCodexData(obj) {
    var src = obj && obj.entries ? obj.entries : obj;
    if (!src || typeof src !== "object") return 0;
    var n = 0;
    Object.keys(src).forEach(function (id) {
      if (!looksLikeCodexEntry(src[id])) return;
      codexStore[id] = src[id];
      n++;
    });
    if (n) persistCodex();
    return n;
  }


  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (codexEl && !codexEl.hidden) { closeCodex(); return; }
    document.activeElement && document.activeElement.blur();
  });

  /* ------------------------------------------------ 人格档案（思维阁） */
  var codexEl = null;
  var codexId = null;
  var codexHideTimer = null;

  /* 档案的「改动」单独存一层，js/codex.js 里的原文当默认值，随时能恢复 */
  var CODEX_KEY = NS + "de-codex-v1";
  var codexStore = loadCodexStore();

  function loadCodexStore() {
    var raw = {};
    try { raw = JSON.parse(localStorage.getItem(CODEX_KEY) || "{}") || {}; } catch (e) { raw = {}; }
    var changed = false;
    Object.keys(raw).forEach(function (id) {
      if (migrateCodexEntry(raw[id])) changed = true;
    });
    if (changed) {
      try { localStorage.setItem(CODEX_KEY, JSON.stringify(raw)); } catch (e) {}
    }
    return raw;
  }

  /* 老格式（anime 一整段 / game+high+low）搬到新结构，保住用户自己改过的内容：
     anime → traits 标签；game / high / low → mechanics 三行。 */
  function migrateCodexEntry(over) {
    if (!over) return false;
    var touched = false;

    if (over.traits === undefined && typeof over.anime === "string" && over.anime.trim()) {
      over.traits = over.anime
        .split(/[、；;。\n]+/)
        .map(function (x) { return x.trim(); })
        .filter(Boolean);
      delete over.anime;
      touched = true;
    }
    if (over.mechanics === undefined && (over.game || over.high || over.low)) {
      var mech = [];
      if (over.game) mech.push({ g: "游戏原文", t: over.game });
      if (over.high) mech.push({ g: "等级过高", t: over.high });
      if (over.low) mech.push({ g: "等级过低", t: over.low });
      over.mechanics = mech;
      delete over.game;
      delete over.high;
      delete over.low;
      touched = true;
    }
    return touched;
  }

  var CODEX_BAK = CODEX_KEY + ".prev";

  function persistCodex() {
    try {
      var prev = localStorage.getItem(CODEX_KEY);
      if (prev) localStorage.setItem(CODEX_BAK, prev);   /* 每次保存前留上一版 */
      localStorage.setItem(CODEX_KEY, JSON.stringify(codexStore));
    } catch (e) {}
  }

  /* 存档被清空时（比如自检页、误清缓存）自动用上一版备份顶回来 */
  function codexGuard() {
    try {
      var cur = localStorage.getItem(CODEX_KEY);
      var bak = localStorage.getItem(CODEX_BAK);
      if ((!cur || cur === "{}" || cur === "null") && bak && bak.length > 8) {
        localStorage.setItem(CODEX_KEY, bak);
        toast("检测到人格档案存档被清空，已用上一次的备份恢复");
      }
    } catch (e) {}
  }

  var CODEX_CHIP_FIELDS = ["keywords", "traits", "job", "figures"];

  /* 原文 + 本机改动 = 实际显示的词条 */
  function codexEntry(id) {
    var base = (window.PERSONA_CODEX || {})[id] || null;
    var over = codexStore[id] || null;
    if (!base && !over) return null;

    var src = base || { en: "UNWRITTEN", slogan: "", sections: {} };
    var s = src.sections || {};

    function pick(f, dflt) {
      if (over) {
        if (over[f] !== undefined && over[f] !== null) return over[f];
        /* 也接受 {sections:{...}} 这种嵌套写法（导出的 JSON 手工改起来更直观） */
        if (over.sections && over.sections[f] !== undefined && over.sections[f] !== null) {
          return over.sections[f];
        }
      }
      return dflt;
    }

    var out = {
      en: src.en || "UNWRITTEN",
      slogan: over && over.slogan != null ? over.slogan : (src.slogan || ""),
      sections: {}
    };

    CODEX_CHIP_FIELDS.forEach(function (f) {
      out.sections[f] = (pick(f, s[f]) || []).slice();
    });
    ["quotes", "scenes"].forEach(function (f) {
      var v = pick(f, s[f]) || [];
      out.sections[f] = v.map(function (x) { return { t: x.t || "", d: x.d || "" }; });
    });
    var mech = pick("mechanics", s.mechanics) || [];
    out.sections.mechanics = mech.map(function (x) { return { g: x.g || "", t: x.t || "" }; });
    return out;
  }

  function buildCodex() {
    codexEl = document.createElement("div");
    codexEl.className = "codex";
    codexEl.hidden = true;
    codexEl.innerHTML =
      '<div class="codex-card" role="dialog" aria-modal="true" aria-labelledby="codex-title">' +
      '<button type="button" class="codex-x" aria-label="关闭">×</button>' +
      '<button type="button" class="codex-edit" aria-label="编辑词条">✎ 编辑</button>' +
      '<div class="codex-art"><img alt=""><div class="codex-drop-hint" hidden>松手，放进参考图库</div><div class="codex-gallery"><button class="cg-add" type="button" title="加一张参考图（也可以直接把图片拖进来）">+</button></div></div>' +
      '<div class="codex-imgview" hidden><img alt=""><button type="button" class="codex-imgview-x" aria-label="关闭">×</button><div class="codex-imgview-acts"><button type="button" class="codex-imgview-del">删掉这张</button><button type="button" class="codex-imgview-clear">清空图库</button></div></div>' +
      '<div class="codex-body" id="codex-body"></div>' +
      "</div>";
    document.body.appendChild(codexEl);

    codexEl.addEventListener("click", function (e) {
      if (e.target === codexEl) closeCodex();
    });
    codexEl.querySelector(".codex-x").addEventListener("click", closeCodex);
    codexEl.querySelector(".codex-edit").addEventListener("click", function () {
      toggleEdit(!codexEl.classList.contains("is-edit"));
    });

    /* 编辑态里的增删按钮（事件委托，重绘也不用重绑） */
    codexEl.addEventListener("click", function (e) {
      var t = e.target;
      if (!codexEl.classList.contains("is-edit")) return;

      if (t.classList.contains("chip-add")) {
        var box = t.parentNode;
        var made = newChip("");
        box.insertBefore(made, t);
        made.querySelector(".codex-chip").focus();
        return;
      }
      if (t.classList.contains("chip-del")) {
        var wrapEl = t.parentNode;
        if (wrapEl) wrapEl.remove();
        return;
      }
      if (t.classList.contains("row-add")) {
        var holder = t.parentNode;
        var ul = holder.querySelector(".codex-quotes, .codex-scenes, .codex-mech");
        if (!ul) return;
        var li;
        if (ul.classList.contains("codex-quotes")) li = quoteRow({ t: "", d: "" });
        else if (ul.classList.contains("codex-scenes")) li = sceneRow({ t: "", d: "" });
        else li = mechRow({ g: "", t: "" });
        ul.appendChild(li);
        li.querySelector("[data-edit]").focus();
        return;
      }
      if (t.classList.contains("row-del")) {
        var row = t.closest("li");
        if (row) row.remove();
        return;
      }
    });

    /* 底部「保存 / 恢复原文 / 取消」 */
    codexEl.addEventListener("click", function (e) {
      var b = e.target.closest("[data-co]");
      if (!b) return;
      var act = b.dataset.co;
      if (act === "save") saveCodexEdit();
      else if (act === "reset") resetCodexEdit();
      else if (act === "cancel") { toggleEdit(false); openCodex(codexId); }
    });
    bindGalleryDrop();
  }

  /* ------------------------------------------------ 参考图库（左栏底部） */
  var MEDIA_DB = "de-codex-media";
  var MEDIA_STORE = "pics";
  var MEDIA_LS = NS + "de-codex-pics-v1";
  var mediaP = null;

  function mediaDb() {
    if (mediaP) return mediaP;
    mediaP = new Promise(function (resolve) {
      if (!("indexedDB" in window)) return resolve(null);
      var req;
      try { req = indexedDB.open(MEDIA_DB, 1); } catch (e) { return resolve(null); }
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(MEDIA_STORE)) {
          var st = db.createObjectStore(MEDIA_STORE, { keyPath: "id", autoIncrement: true });
          st.createIndex("skill", "skill", { unique: false });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { resolve(null); };
    });
    return mediaP;
  }

  function mediaLsAll() {
    try { return JSON.parse(localStorage.getItem(MEDIA_LS) || "{}") || {}; } catch (e) { return {}; }
  }
  function mediaLsSave(all) {
    try { localStorage.setItem(MEDIA_LS, JSON.stringify(all)); return true; } catch (e) { return false; }
  }
  function mediaLsList(skill) {
    return (mediaLsAll()[skill] || []).slice();
  }

  function mediaList(skill) {
    return mediaDb().then(function (db) {
      if (!db) return mediaLsList(skill);
      return new Promise(function (resolve) {
        var out = [];
        var tx = db.transaction(MEDIA_STORE, "readonly");
        var idx = tx.objectStore(MEDIA_STORE).index("skill");
        var rq = idx.openCursor();
        rq.onsuccess = function (ev) {
          var cur = ev.target.result;
          if (!cur) return resolve(out);
          if (cur.value.skill === skill) out.push(cur.value);
          cur.continue();
        };
        rq.onerror = function () { resolve(mediaLsList(skill)); };
      });
    }).catch(function () { return mediaLsList(skill); });
  }

  function mediaAdd(skill, blob) {
    if (!blob) return Promise.resolve(null);
    return mediaDb().then(function (db) {
      if (!db) return null;
      return new Promise(function (resolve) {
        var tx = db.transaction(MEDIA_STORE, "readwrite");
        var rq = tx.objectStore(MEDIA_STORE).add({ skill: skill, blob: blob, at: Date.now() });
        rq.onsuccess = function () { resolve(rq.result); };
        rq.onerror = function () { resolve(null); };
      });
    }).then(function (id) {
      if (id !== null) return id;
      /* 兜底：IndexedDB 用不了就转成 dataURL 进 localStorage */
      return new Promise(function (resolve) {
        var fr = new FileReader();
        fr.onload = function () {
          var all = mediaLsAll();
          var list = all[skill] || [];
          var mid = "ls" + Date.now() + Math.floor(Math.random() * 1000);
          list.push({ id: mid, skill: skill, dataUrl: fr.result, at: Date.now() });
          all[skill] = list;
          resolve(mediaLsSave(all) ? mid : null);
        };
        fr.onerror = function () { resolve(null); };
        fr.readAsDataURL(blob);
      });
    });
  }

  function mediaDel(skill, id) {
    if (id === null || id === undefined || id === "") return Promise.resolve(false);
    var key = id;
    if (typeof key === "string" && /^\d+$/.test(key)) key = Number(key);
    /* localStorage 那份也清（万一同一条既在 IDB 又在 LS，或者 id 类型对不上） */
    var all = mediaLsAll();
    if (all[skill]) {
      var before = all[skill].length;
      all[skill] = all[skill].filter(function (x) { return String(x.id) !== String(id); });
      if (all[skill].length !== before) mediaLsSave(all);
    }
    return mediaDb().then(function (db) {
      if (!db) return true;
      /* 不直接 delete(key)：改成游标逐条比对 String(id)，数字键 / 字符串键 / 缺失索引都能删 */
      return new Promise(function (resolve) {
        var found = false;
        var tx = db.transaction(MEDIA_STORE, "readwrite");
        var store = tx.objectStore(MEDIA_STORE);
        var rq = store.openCursor();
        rq.onsuccess = function (ev) {
          var cur = ev.target.result;
          if (!cur) return;
          var v = cur.value || {};
          var sameId = String(v.id) === String(key) || String(v.id) === String(id);
          if (sameId) { found = true; cur.delete(); }
          cur.continue();
        };
        tx.oncomplete = function () { resolve(found || true); };
        tx.onerror = function () { resolve(true); };
      });
    });
  }

  function mediaClear(skill) {
    var all = mediaLsAll();
    if (all[skill]) { delete all[skill]; mediaLsSave(all); }
    return mediaDb().then(function (db) {
      if (!db) return;
      return new Promise(function (resolve) {
        var tx = db.transaction(MEDIA_STORE, "readwrite");
        var store = tx.objectStore(MEDIA_STORE);
        var rq = store.openCursor();
        rq.onsuccess = function (ev) {
          var cur = ev.target.result;
          if (!cur) return;
          if ((cur.value || {}).skill === skill) cur.delete();
          cur.continue();
        };
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { resolve(); };
      });
    });
  }

  function mediaSrc(item) {
    if (item.dataUrl) return item.dataUrl;
    if (!item.blob) return "";
    if (!item._url) item._url = URL.createObjectURL(item.blob);
    return item._url;
  }

  /* 大图压缩：长边不超过 1200，JPEG 0.85，够看又能存很多张 */
  /* 一批图片文件 → 当前人格的参考图库；拖拽、粘贴、文件选择都走这里 */
  function addImageFiles(files, skill) {
    var list = Array.prototype.slice.call(files || []).filter(function (f) {
      return f && f.type && f.type.indexOf("image/") === 0;
    });
    if (!list.length) { toast("这里只收图片文件"); return Promise.resolve(0); }
    var chain = Promise.resolve();
    list.forEach(function (f) {
      chain = chain.then(function () {
        return shrinkImage(f).then(function (blob) { return mediaAdd(skill, blob); });
      });
    });
    return chain.then(function () {
      renderGallery(skill);
      toast("加进参考图库了 · " + list.length + " 张");
      return list.length;
    });
  }

  /* 把图片直接拖到档案上，或者开着档案按 Ctrl+V 粘贴截图 */
  function bindGalleryDrop() {
    if (!codexEl) return;
    var cardEl = codexEl.querySelector(".codex-card");
    var hint = codexEl.querySelector(".codex-drop-hint");
    if (!cardEl) return;
    function hasFiles(e) {
      var t = (e.dataTransfer && e.dataTransfer.types) || [];
      for (var i = 0; i < t.length; i++) if (t[i] === "Files") return true;
      return false;
    }
    cardEl.addEventListener("dragover", function (e) {
      if (!hasFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      cardEl.classList.add("is-drop");
      if (hint) hint.hidden = false;
    });
    cardEl.addEventListener("dragleave", function (e) {
      if (e.relatedTarget && cardEl.contains(e.relatedTarget)) return;
      cardEl.classList.remove("is-drop");
      if (hint) hint.hidden = true;
    });
    cardEl.addEventListener("drop", function (e) {
      if (!hasFiles(e)) return;
      e.preventDefault();
      cardEl.classList.remove("is-drop");
      if (hint) hint.hidden = true;
      addImageFiles(e.dataTransfer.files, codexId);
    });
    document.addEventListener("paste", function (e) {
      if (!codexEl || codexEl.hidden) return;
      var items = (e.clipboardData && e.clipboardData.items) || [];
      var files = [];
      for (var i = 0; i < items.length; i++) {
        if (items[i].kind === "file" && /^image\//.test(items[i].type)) {
          var f = items[i].getAsFile();
          if (f) files.push(f);
        }
      }
      if (!files.length) return;
      e.preventDefault();
      addImageFiles(files, codexId);
    });
  }

  function shrinkImage(file) {
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth || 1, h = img.naturalHeight || 1;
        var k = Math.min(1, 1200 / Math.max(w, h));
        var cw = Math.max(1, Math.round(w * k)), ch = Math.max(1, Math.round(h * k));
        var cv = document.createElement("canvas");
        cv.width = cw;
        cv.height = ch;
        var ctx = cv.getContext("2d");
        ctx.fillStyle = "#0b0b0d";
        ctx.fillRect(0, 0, cw, ch);
        ctx.drawImage(img, 0, 0, cw, ch);
        URL.revokeObjectURL(url);
        cv.toBlob(function (b) { resolve(b || file); }, "image/jpeg", 0.85);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  function renderGallery(skill) {
    if (!codexEl) return;
    var artEl = codexEl.querySelector(".codex-art");
    var gal = artEl.querySelector(".codex-gallery");
    if (!gal) return;
    mediaList(skill).then(function (items) {
      if (codexId !== skill) return;
      /* 只清缩略图，保留末尾那个「＋」按钮（它在初始 markup 里，同步就存在） */
      Array.prototype.slice.call(gal.querySelectorAll(".cg-cell")).forEach(function (n) { n.remove(); });
      var addBtn = gal.querySelector(".cg-add");
      gal.classList.toggle("is-empty", !items.length);
      items.forEach(function (it) {
        var cell = el("div", "cg-cell", gal);
        if (addBtn) gal.insertBefore(cell, addBtn);
        var img = el("img", "cg-img", cell);
        img.src = mediaSrc(it);
        img.alt = "参考图";
        cell.addEventListener("click", function () { openImgView(it); });
        var x = el("button", "cg-x", cell);
        x.type = "button";
        x.textContent = "×";
        x.title = "删掉这张";
        x.addEventListener("click", function (e) {
          e.stopPropagation();
          e.preventDefault();
          mediaDel(skill, it.id).then(function () {
            renderGallery(skill);
            toast("删掉一张");
          });
        });
      });
      if (addBtn && !addBtn.dataset.bound) {
        addBtn.dataset.bound = "1";
        /* 用 codexId 而不是闭包里的 skill：这个按钮只建一次，切人格后会拿到旧 skill */
        addBtn.addEventListener("click", function () { pickImages(codexId); });
      }
    });
  }

  function pickImages(skill) {
    var inp = el("input", "cg-file");
    inp.type = "file";
    inp.accept = "image/*";
    inp.multiple = true;
    inp.hidden = true;
    document.body.appendChild(inp);
    inp.addEventListener("change", function () {
      var files = Array.prototype.slice.call(inp.files || []);
      inp.remove();
      if (!files.length) return;
      addImageFiles(files, skill);
    });
    inp.click();
  }

  function openImgView(item) {
    var vw = codexEl.querySelector(".codex-imgview");
    if (!vw) return;
    var img = vw.querySelector("img");
    img.src = mediaSrc(item);
    vw.hidden = false;
    vw.dataset.id = item.id;
    vw.dataset.skill = codexId;
    vw.querySelector(".codex-imgview-del").onclick = function () {
      mediaDel(vw.dataset.skill, vw.dataset.id).then(function () {
        vw.hidden = true;
        renderGallery(vw.dataset.skill);
        toast("删掉一张");
      });
    };
    vw.querySelector(".codex-imgview-clear").onclick = function () {
      if (!window.confirm("清空这个人格的参考图库？")) return;
      mediaClear(vw.dataset.skill).then(function () {
        vw.hidden = true;
        renderGallery(vw.dataset.skill);
        toast("图库清空了");
      });
    };
    vw.querySelector(".codex-imgview-x").onclick = function () { vw.hidden = true; };
    /* 用 onclick 而不是 addEventListener：每开一次大图都会重绑，add 会越堆越多 */
    vw.onclick = function (e) { if (e.target === vw) vw.hidden = true; };
  }

  function openCodex(id) {
    codexGuard();
    if (!codexEl) buildCodex();
    var skill = null, attr = null;
    ATTRIBUTES.forEach(function (a) {
      a.skills.forEach(function (s) { if (s.id === id) { skill = s; attr = a; } });
    });
    if (!skill || !attr) return;

    codexId = id;
    /* 重绘前先把编辑态退干净（否则右上角按钮还写着「退出编辑」，看着像没保存成功） */
    if (codexEl.classList.contains("is-edit")) toggleEdit(false);
    else codexEl.classList.remove("is-edit");
    var entry = codexEntry(id);

    /* 优先用 assets/art/<id>.png 这张「完整原画」；没有就退回卡面裁图 */
    var fullUrl = assetUrl("assets/art/" + id + ".png");
    var cardUrl = assetUrl("assets/cards/" + assetName(id) + ".jpg");
    var artEl = codexEl.querySelector(".codex-art");
    artEl.style.setProperty("--art-src", 'url("' + fullUrl + '")');
    artEl.classList.add("is-full");
    var artImg = artEl.querySelector("img");
    artImg.onerror = function () {
      if (artImg.dataset.fallback === "1") return;
      artImg.dataset.fallback = "1";
      artEl.classList.remove("is-full");
      artEl.style.setProperty("--art-src", 'url("' + cardUrl + '")');
      artImg.src = cardUrl;
    };
    artImg.dataset.fallback = "";
    artImg.src = fullUrl;
    artImg.alt = skill.name + " 原画";
    codexEl.querySelector(".codex-card").dataset.attr = attr.id;

    var body = codexEl.querySelector("#codex-body");
    var keepScroll = body.scrollTop;
    body.innerHTML = "";

    var eyebrow = el("div", "codex-eyebrow", body);
    eyebrow.innerHTML =
      esc(attr.name) + " · " + (entry ? esc(entry.en) : "—") +
      '<span class="codex-levels">等级 <b>' + state.A.skills[id] + "</b></span>";

    var title = el("h2", "codex-title", body);
    title.id = "codex-title";
    title.textContent = skill.name;

    var slogan = el("p", "codex-slogan", body);
    slogan.textContent = entry ? entry.slogan : "";
    slogan.setAttribute("data-edit", "slogan");

    var s = entry ? entry.sections : null;
    if (entry) {
      section("关键词", function (wrap) { chips(wrap, s.keywords, "keywords"); });
      section("职业 / 身份", function (wrap) { chips(wrap, s.job, "job"); });
      section("代表", function (wrap) { chips(wrap, s.figures, "figures"); });
      section("名言 / 语录", function (wrap) { quoteList(wrap, s.quotes); });
      section("实例", function (wrap) { sceneList(wrap, s.scenes); });
      section("机制 / 设定", function (wrap) { mechList(wrap, s.mechanics); });
    } else {
      section("关键词", function (wrap) { chips(wrap, [], "keywords"); });
      section("职业 / 身份", function (wrap) { chips(wrap, [], "job"); });
      section("代表", function (wrap) { chips(wrap, [], "figures"); });
      section("名言 / 语录", function (wrap) { quoteList(wrap, []); });
      section("实例", function (wrap) { sceneList(wrap, []); });
      section("机制 / 设定", function (wrap) { mechList(wrap, []); });
    }

    /* 编辑态的底部操作条 */
    var foot = el("div", "codex-foot", body);
    el("span", "codex-tip", foot).textContent = "直接点上面的文字改；「+」加一条，「×」删一条。";
    var bReset = el("button", null, foot);
    bReset.type = "button";
    bReset.dataset.co = "reset";
    bReset.textContent = "还原";
    bReset.title = "回到点「编辑」之前的样子（只撤销这次改动）";
    var bCancel = el("button", null, foot);
    bCancel.type = "button";
    bCancel.dataset.co = "cancel";
    bCancel.textContent = "取消";
    var bSave = el("button", "is-primary", foot);
    bSave.type = "button";
    bSave.dataset.co = "save";
    bSave.textContent = "保存";

    clearTimeout(codexHideTimer);
    codexEl.hidden = false;
    renderGallery(id);
    document.body.classList.add("codex-open");
    /* 先让它按隐藏态排一次版，再加 is-on，过渡才会真的播出来 */
    void codexEl.offsetHeight;
    codexEl.classList.add("is-on");
    body.scrollTop = keepScroll || 0;

    /* 局部小工具 */
    function section(label, fill) {
      var sec = el("section", "codex-sec", body);
      var h = el("h3", null, sec);
      h.textContent = label;
      var wrap = el("div", "codex-sec-body", sec);
      fill(wrap);
    }
    function para(parent, text, field) {
      var p = el("p", "codex-p", parent);
      p.textContent = text;
      if (field) p.dataset.f = field;
      p.setAttribute("data-edit", "");
    }
    function note(parent, text, field) {
      var p = el("p", "codex-note", parent);
      p.textContent = text;
      if (field) p.dataset.f = field;
      p.setAttribute("data-edit", "");
    }
    function chip(t) {
      var wrap = newChip(t);
      wrap.querySelector(".codex-chip").removeAttribute("contenteditable");
      return wrap;
    }
    function chips(parent, list, field) {
      var box = el("div", "codex-chips", parent);
      box.dataset.f = field;
      (list || []).forEach(function (t) { box.appendChild(chip(t)); });
      if (!list || !list.length) {
        var empty = el("span", "codex-empty", box);
        empty.textContent = "还没有内容，点「✎ 编辑」后可以自己加。";
      }
      var add = el("button", "chip-add", box);
      add.type = "button";
      add.textContent = "+";
      add.title = "加一条";
    }
    function quoteList(parent, list) {
      var ul = el("ul", "codex-quotes", parent);
      (list || []).forEach(function (q) { ul.appendChild(quoteRow(q)); });
      rowAdd(parent, "加一条语录");
    }
    function sceneList(parent, list) {
      var ul = el("ul", "codex-scenes", parent);
      (list || []).forEach(function (sc) { ul.appendChild(sceneRow(sc)); });
      rowAdd(parent, "加一条实例");
    }
    function mechList(parent, list) {
      var ul = el("ul", "codex-mech", parent);
      (list || []).forEach(function (m) { ul.appendChild(mechRow(m)); });
      rowAdd(parent, "加一条机制");
    }
    function rowAdd(parent, label) {
      var b = el("button", "row-add", parent);
      b.type = "button";
      b.textContent = "+ " + label;
    }
  }

  /* 把一段新节点里的 [data-edit] 变成可编辑（编辑态下新建的行 / 标签都要过一遍，
     否则新加的那一条虽然是空的、却根本敲不进字） */
  function markEditable(root) {
    if (!root || !codexEl || !codexEl.classList.contains("is-edit")) return;
    Array.prototype.forEach.call(root.querySelectorAll("[data-edit]"), function (n) {
      n.setAttribute("contenteditable", "true");
    });
  }

  /* 语录一行：<q> 正文 + 一行注解 + 删除 */
  function quoteRow(q) {
    var li = document.createElement("li");
    var t = el("q", null, li);
    t.textContent = q.t || "";
    t.setAttribute("data-edit", "");
    t.setAttribute("data-ph", "一句语录");
    var d = el("span", "codex-qnote", li);
    d.textContent = q.d || "";
    d.setAttribute("data-edit", "");
    d.setAttribute("data-ph", "出处 / 备注（可空）");
    rowDel(li);
    markEditable(li);
    return li;
  }

  /* 实例一行：粗体标题 + 描述 + 删除（和机制一样，标题后面不加冒号） */
  function sceneRow(sc) {
    var li = document.createElement("li");
    var t = el("b", null, li);
    t.textContent = String((sc && sc.t) || "").replace(/[：:]\s*$/, "");
    t.setAttribute("data-edit", "");
    t.setAttribute("data-ph", "实例名");
    var d = el("span", "codex-sd", li);
    d.textContent = sc.d || "";
    d.setAttribute("data-edit", "");
    d.setAttribute("data-ph", "这个例子里它怎么起作用");
    rowDel(li);
    markEditable(li);
    return li;
  }

  /* 机制一行：作品名 + 它怎么起作用 + 删除 */
  function newChip(text) {
    var wrap = document.createElement("span");
    wrap.className = "codex-chip-wrap";
    var c = document.createElement("span");
    c.className = "codex-chip";
    c.textContent = text;
    c.setAttribute("data-edit", "");
    c.setAttribute("contenteditable", "true");
    var d = document.createElement("button");
    d.type = "button";
    d.className = "chip-del";
    d.textContent = "×";
    d.title = "删掉这一条";
    wrap.appendChild(c);
    wrap.appendChild(d);
    return wrap;
  }

  function mechRow(m) {
    var li = document.createElement("li");
    var g = el("b", "codex-mg", li);
    g.textContent = (m && m.g) || "";
    g.setAttribute("data-edit", "");
    g.setAttribute("data-ph", "作品 / 场景");
    var t = el("span", "codex-mt", li);
    t.textContent = (m && m.t) || "";
    t.setAttribute("data-edit", "");
    t.setAttribute("data-ph", "它在这里怎么起作用");
    rowDel(li);
    markEditable(li);
    return li;
  }

  function rowDel(li) {
    var b = el("button", "row-del", li);
    b.type = "button";
    b.textContent = "×";
    b.title = "删掉这一条";
  }

  /* 进入编辑态时记一份快照：还原要回到「点编辑之前」，而不是出厂原文 */
  var codexEditSnap = null;

  /* 进入 / 退出编辑态：只是把 data-edit 的元素变成可编辑，不重建 DOM */
  function toggleEdit(on) {
    if (on && codexId) {
      var prev = codexStore[codexId];
      codexEditSnap = {
        id: codexId,
        entry: JSON.parse(JSON.stringify(codexEntry(codexId))),
        prev: prev ? JSON.parse(JSON.stringify(prev)) : null
      };
    } else if (!on) {
      codexEditSnap = null;
    }
    codexEl.classList.toggle("is-edit", on);
    var nodes = codexEl.querySelectorAll("[data-edit]");
    Array.prototype.forEach.call(nodes, function (n) {
      if (on) n.setAttribute("contenteditable", "true");
      else n.removeAttribute("contenteditable");
    });
    var btn = codexEl.querySelector(".codex-edit");
    btn.textContent = on ? "✕ 退出编辑" : "✎ 编辑";
  }

  function codexText(node) {
    return node ? node.textContent.replace(/\s+/g, " ").trim() : "";
  }

  function collectCodex() {
    var body = codexEl.querySelector("#codex-body");
    var out = {};

    var slogan = body.querySelector('.codex-slogan[data-edit]');
    if (slogan) out.slogan = codexText(slogan);

    CODEX_CHIP_FIELDS.forEach(function (f) {
      var box = body.querySelector('.codex-chips[data-f="' + f + '"]');
      if (!box) return;
      out[f] = Array.prototype.map.call(box.querySelectorAll(".codex-chip"), function (c) {
        return codexText(c);
      }).filter(Boolean);
    });

    var quotes = body.querySelectorAll(".codex-quotes li");
    if (quotes.length) {
      out.quotes = Array.prototype.map.call(quotes, function (li) {
        return { t: codexText(li.querySelector("q")), d: codexText(li.querySelector(".codex-qnote")) };
      }).filter(function (q) { return q.t || q.d; });
    } else {
      out.quotes = [];
    }

    var scenes = body.querySelectorAll(".codex-scenes li");
    if (scenes.length) {
      out.scenes = Array.prototype.map.call(scenes, function (li) {
        return {
          t: codexText(li.querySelector("b")).replace(/[：:]\s*$/, ""),
          d: codexText(li.querySelector(".codex-sd"))
        };
      }).filter(function (sc) { return sc.t || sc.d; });
    } else {
      out.scenes = [];
    }

    var mech = body.querySelectorAll(".codex-mech li");
    out.mechanics = Array.prototype.map.call(mech, function (li) {
      return { g: codexText(li.querySelector(".codex-mg")), t: codexText(li.querySelector(".codex-mt")) };
    }).filter(function (m) { return m.g || m.t; });

    return out;
  }

  function saveCodexEdit() {
    if (!codexId) return;
    /* 先收数据再重绘：重绘会把编辑态退掉，万一收数据出错就留在编辑态，别让人白写 */
    try {
      /* 页面上没有的字段（比如已下线的「性格」）沿用旧值，别被保存顺手清掉 */
      var fresh = collectCodex();
      var old = codexStore[codexId];
      if (old) {
        Object.keys(old).forEach(function (k) {
          if (!(k in fresh)) fresh[k] = old[k];
        });
      }
      codexStore[codexId] = fresh;
      persistCodex();
    } catch (e) {
      toast("保存失败了，改动还在编辑框里，再点一次试试");
      return;
    }
    openCodex(codexId);
    toast("词条已保存到本机");
  }

  function resetCodexEdit() {
    if (!codexId) return;
    var snap = codexEditSnap && codexEditSnap.id === codexId ? codexEditSnap : null;

    if (snap) {
      /* 回到「点编辑之前」：之前有本机改动就恢复那份，没有就不写存档 */
      if (snap.prev) codexStore[codexId] = JSON.parse(JSON.stringify(snap.prev));
      else delete codexStore[codexId];
    } else {
      delete codexStore[codexId];
    }

    persistCodex();
    openCodex(codexId);
    if (snap) {
      toggleEdit(true);
      toast("已回到点「编辑」之前的样子");
    } else {
      toast("已恢复原文");
    }
  }

  function closeCodex() {
    if (!codexEl) return;
    var vw = codexEl.querySelector(".codex-imgview");
    if (vw) vw.hidden = true;
    if (codexEl.classList.contains("is-edit")) toggleEdit(false);
    clearTimeout(codexHideTimer);
    codexEl.classList.remove("is-on");
    document.body.classList.remove("codex-open");
    /* 兜底：即使过渡没跑完，也保证不会留下一层看不见、却挡住全站点击的遮罩 */
    codexHideTimer = setTimeout(function () {
      codexEl.hidden = true;
    }, 170);
  }


  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }


  /* ------------------------------------------------ 人物分析（第四界面） */
  var PROFILES_KEY = NS + "de-profile-v1";
  var LINK_KINDS = ["搭档", "上级", "对手", "朋友", "其他"];
  var profiles = loadProfiles();

  /* 思维阁里删掉的卡：下次打开把它的加分还回去，别留下收不回的 +1 */
  (function pruneProfileCombos() {
    var alive = {};
    combos.forEach(function (c) { alive[c.id] = true; });
    var dirty = false;
    profiles.forEach(function (p) {
      (p.stages || []).forEach(function (st, si) {
        var keep = [];
        st.combos.forEach(function (l) {
          if (alive[l.cid]) { keep.push(l); return; }
          Object.keys(l.adds).forEach(function (sid) {
            st.scores[sid] = clamp((st.scores[sid] || 0) - (l.adds[sid] || 0), 0);
          });
          dirty = true;
        });
        st.combos = keep;
        if (si === p.stage) {
          p.combos = deepCombos(keep);
          p.scores = Object.assign({}, st.scores);
        }
      });
    });
    if (dirty) saveProfiles();
  })();
  var profileId = profiles.length ? profiles[0].id : null;

  function newProfileId() {
    return "p" + Date.now().toString(36) + Math.floor(Math.random() * 46656).toString(36);
  }

  function normalizeProfile(src) {
    var p = {
      id: (src && src.id) || newProfileId(),
      name: cleanName(src && src.name, "新人物"),
      work: String((src && src.work) || "").slice(0, 24),
      note: String((src && src.note) || "").slice(0, 200),
      editing: false,
      scores: {},                  /* 当前阶段的分数（跟着 p.stage 走） */
      links: [],
      combos: [],                  /* 当前阶段收进来的卡：[{ cid, adds }] */
      attrs: {},                   /* 当前阶段的属性档值 */
      crowns: {},                  /* 当前阶段的王冠 */
      stages: [],                  /* [{ name, scores, attrs, combos, crowns }]，前期 / 中期 / 后期… */
      stage: 0                     /* 现在停在第几段 */
    };
    ((src && src.links) || []).forEach(function (l) {
      if (!l) return;
      var nm = String(l.name || "").trim().slice(0, 12);
      if (!nm) return;
      p.links.push({
        kind: LINK_KINDS.indexOf(l.kind) >= 0 ? l.kind : "搭档",
        name: nm,
        pid: String(l.pid || "")
      });
    });

    /* 一段的数据：分数 / 档值 / 收的卡 / 王冠，老的单段档案也走这里 */
    function readStageData(d) {
      var out = { scores: {}, attrs: {}, combos: [], crowns: {} };
      var sc = (d && d.scores) || {};
      ATTRIBUTES.forEach(function (a) {
        a.skills.forEach(function (k) {
          out.scores[k.id] = clamp(sc[k.id] === undefined ? 0 : sc[k.id], 0);
        });
      });
      var at = (d && d.attrs) || {};
      ATTRIBUTES.forEach(function (a) {
        if (typeof at[a.id] === "number") out.attrs[a.id] = clamp(at[a.id], 0);
      });
      ((d && d.combos) || []).forEach(function (c) {
        if (!c || !c.cid) return;
        var adds = {};
        Object.keys(c.adds || {}).forEach(function (sid) {
          if (profileOf(sid)) adds[sid] = 1;
        });
        out.combos.push({ cid: String(c.cid), adds: adds });
      });
      var cr = (d && d.crowns) || {};
      Object.keys(cr).forEach(function (sid) {
        if (!profileOf(sid) || !cr[sid]) return;
        out.crowns[sid] = {
          dir: cr[sid].dir === "down" ? "down" : "up",
          delta: cr[sid].delta === 1 ? 1 : (cr[sid].delta === -1 ? -1 : 0)
        };
      });
      /* 老档案只有一个招牌（sig）：当成一顶只做标记的正皇冠 */
      if (d && typeof d.sig === "string" && profileOf(d.sig) && !out.crowns[d.sig]) {
        out.crowns[d.sig] = { dir: "up", delta: 0 };
      }
      return out;
    }

    var live = readStageData(src);
    p.scores = live.scores;
    p.attrs = live.attrs;
    p.combos = live.combos;
    p.crowns = live.crowns;

    var stageSrcs = (src && Array.isArray(src.stages)) ? src.stages : [];
    p.stages = stageSrcs.length
      ? stageSrcs.map(function (st, i) {
          var d = readStageData(st);
          return {
            name: cleanStageName(st && st.name, i),
            scores: d.scores, attrs: d.attrs, combos: d.combos, crowns: d.crowns
          };
        })
      : [{ name: "前期", scores: p.scores, attrs: p.attrs, combos: p.combos, crowns: p.crowns }];

    var si = parseInt((src && src.stage) || 0, 10);
    p.stage = si >= 0 && si < p.stages.length ? si : 0;
    loadStageInto(p, p.stage);
    return p;
  }

  function loadProfiles() {
    try {
      var raw = localStorage.getItem(PROFILES_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr.map(normalizeProfile);
    } catch (e) { return []; }
  }

  function saveProfiles() {
    profiles.forEach(flushStage);
    try { localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles)); } catch (e) {}
  }

  function currentProfile() {
    for (var i = 0; i < profiles.length; i++) {
      if (profiles[i].id === profileId) return profiles[i];
    }
    return null;
  }

  function profileOf(skillId) {
    for (var i = 0; i < ATTRIBUTES.length; i++) {
      var a = ATTRIBUTES[i];
      for (var j = 0; j < a.skills.length; j++) {
        if (a.skills[j].id === skillId) return { attr: a, skill: a.skills[j] };
      }
    }
    return null;
  }

  function addProfile() {
    /* 新人物从「普通人」起：24 项都是 3，四个属性档也都是 3 */
    var scores = {};
    var attrs = {};
    ATTRIBUTES.forEach(function (a) {
      attrs[a.id] = PF_NORMAL;
      a.skills.forEach(function (k) { scores[k.id] = PF_NORMAL; });
    });
    var p = normalizeProfile({ name: "新人物", scores: scores, attrs: attrs });
    profiles.push(p);
    profileId = p.id;
    saveProfiles();
    viewDirty.profile = true;
    buildProfileView();
    toast("新建了一份人物档案：24 项都从 3（普通人）起，点名字可以改");
  }

  function buildProfileView() {
    var tabs = document.getElementById("profile-tabs");
    var stage = document.getElementById("profile-stage");
    if (!tabs || !stage) return;
    tabs.innerHTML = "";
    profiles.forEach(function (p) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pf-tab" + (p.id === profileId ? " is-on" : "");
      b.dataset.pid = p.id;
      b.textContent = p.name || "未命名";
      tabs.appendChild(b);
    });
    renderProfileStage();
  }

  function renderProfileStage() {
    var stage = document.getElementById("profile-stage");
    if (!stage) return;
    var p = currentProfile();
    if (!p) {
      stage.className = "profile-stage is-empty";
      stage.innerHTML = '<p class="pf-empty">还没有人物档案。点右上角「+ 新建人物」开始——左边给她 24 个声音打分，右边从思维阁里挑几张卡把分数顶上去。</p>';
      return;
    }
    stage.className = "profile-stage";

    var head =
      '<div class="pf-head">' +
        '<div class="pf-id">' +
          '<input class="pf-name" id="pf-name" value="' + esc(p.name) + '" maxlength="12" aria-label="人物名">' +
          '<input class="pf-work" id="pf-work" value="' + esc(p.work) + '" maxlength="24" placeholder="出自哪部作品（可空）" aria-label="作品">' +
        '</div>' +
        '<div class="pf-tools">' +
          '<div class="pf-stagebar" role="group" aria-label="人物阶段">' +
            '<button type="button" class="pf-stepnav" data-stage="prev"' + (p.stage <= 0 ? " disabled" : "") + ' aria-label="上一段">‹</button>' +
            '<input class="pf-stage-name" id="pf-stage-name" maxlength="8" value="' + esc(p.stages[p.stage].name) + '" aria-label="阶段名">' +
            '<span class="pf-stage-n">' + (p.stage + 1) + ' / ' + p.stages.length + '</span>' +
            '<button type="button" class="pf-stepnav" data-stage="next"' + (p.stage >= p.stages.length - 1 ? " disabled" : "") + ' aria-label="下一段">›</button>' +
            '<button type="button" class="pf-stage-add" data-stage="add" title="复制当前这一段，往后加一段">+ 阶段</button>' +
            (p.stages.length > 1 ? '<button type="button" class="pf-stage-del" data-stage="del" title="删掉当前这一段">−</button>' : "") +
          '</div>' +
          '<label class="pf-budget-wrap" title="随机时先分给四个大类多少点（每类至少 1、最多 5）">大类' +
            '<input class="pf-budget" id="pf-attr-budget" type="number" min="4" max="20" step="1" value="' + pfAttrBudget + '" aria-label="分给四个大类的点数">点' +
          '</label>' +
          '<label class="pf-budget-wrap" title="大类分完之后，再随机撒到 24 个人格上多少点（单格最高 5）">微调' +
            '<input class="pf-budget" id="pf-micro-budget" type="number" min="0" max="120" step="1" value="' + pfMicroBudget + '" aria-label="微调点数">点' +
          '</label>' +
          '<div class="pf-locks" role="group" aria-label="重掷时锁住哪几个大类">' +
            ATTRIBUTES.map(function (a) {
              return '<button type="button" class="pf-lock' + (pfLocks[a.id] ? " is-on" : "") + '" data-lock="' + a.id + '" aria-pressed="' + (pfLocks[a.id] ? "true" : "false") + '" title="锁住「' + a.name + '」：重掷时不改这一行">' + a.name + '</button>';
            }).join("") +
          '</div>' +
          '<button type="button" class="pf-btn" data-pf="random" title="先随机分四个大类，再把微调点数撒到人格上">随机</button>' +
          '<button type="button" class="pf-btn is-danger" data-pf="del">删除</button>' +
        '</div>' +
      '</div>';

    var rows = "";
    ATTRIBUTES.forEach(function (a) {
      var cells = "";
      var attrLv = attrBase(p, a.id);
      a.skills.forEach(function (k) {
        var v = p.scores[k.id] || 0;
        var cr = p.crowns[k.id] || null;
        var isUp = !!cr && cr.dir === "up";
        var isDown = !!cr && cr.dir === "down";
        cells += '<div class="pf-cell' + (v < PF_NORMAL ? " is-low" : "") + (v >= PF_HIGH ? " is-high" : "") +
          (isUp ? " is-sig" : "") + (isDown ? " is-sig-down" : "") +
          '" data-skill="' + k.id + '" data-lv="' + v + '" role="button" tabindex="0"' +
          ' title="' + esc(k.name + " " + v + " · " + (v < PF_NORMAL ? "低于普通人 " + PF_NORMAL + "；" : (v >= PF_HIGH ? "突出；" : "")) +
            "左键 +1、右键 −1、右上角正/倒皇冠各 ±1") + '">' +
          '<span class="pf-cname">' + k.name + '</span><b>' + v + '</b>' +
          '<span class="pf-crowns">' +
            '<button type="button" class="pf-crown-btn' + (isUp ? " is-on" : "") + '" data-crown="' + k.id + '" data-dir="up"' +
              ' aria-pressed="' + (isUp ? "true" : "false") + '" title="' +
              esc(isUp ? "取下「" + k.name + "」的正皇冠（退回那 1 点）" : "给「" + k.name + "」戴正皇冠（+1 点）") + '">' +
              CROWN_SVG + '</button>' +
            '<button type="button" class="pf-crown-btn is-down' + (isDown ? " is-on" : "") + '" data-crown="' + k.id + '" data-dir="down"' +
              ' aria-pressed="' + (isDown ? "true" : "false") + '" title="' +
              esc(isDown ? "取下「" + k.name + "」的倒皇冠（补回那 1 点）" : "给「" + k.name + "」戴倒皇冠（−1 点）") + '">' +
              CROWN_SVG + '</button>' +
          '</span></div>';
      });
      rows += '<div class="pf-row"><button type="button" class="pf-attr" data-attr="' + a.id + '" data-lv="' + attrLv +
        '" title="' + esc("「" + a.name + "」现在是 " + attrLv + "，下面 6 个人格也都按这个档走（0–" + MAX_LEVEL + "）" +
          "；左键 +1：整行一起设成新值；右键 −1；之后还能单独微调某一格") + '">' +
        '<span class="pf-attr-name">' + a.name + '</span><b class="pf-attr-lv">' + attrLv + '</b></button>' +
        '<div class="pf-cells">' + cells + '</div></div>';
    });

    var total = 0;
    Object.keys(p.scores).forEach(function (k) { total += p.scores[k] || 0; });

    var crownUp = 0, crownDown = 0;
    Object.keys(p.crowns).forEach(function (sid) {
      if (p.crowns[sid].dir === "up") crownUp++;
      else crownDown++;
    });

    stage.innerHTML = head +
      '<div class="pf-body">' +
        '<div class="pf-matrix">' + rows + '</div>' +
        '<section class="pf-picker">' + comboBlockHtml(p) + '</section>' +
        profilePickedHtml(p) +
      '</div>' +
      '<p class="pf-foot">24 个声音合计 <b>' + total + '</b> · ' + PF_NORMAL + ' 是普通人标准，低于它名字标红、' + PF_HIGH + ' 以上标蓝 · 左键 +1、右键 −1' +
        ' · 点左边的属性名：整行 6 个一起设成那个档' +
        ' · 皇冠 正 <b class="pf-foot-sig">' + crownUp + '</b> · 倒 <b class="pf-foot-sig">' + crownDown + '</b></p>';

    applyProfileComboFilter();     /* 重渲染后把搜索 / 分类状态接着用 */
  }

  /* 思维阁 → 人物：一张卡里「突出」的人格，收进来就各 +1 */
  function comboLinkOf(p, cid) {
    for (var i = 0; i < p.combos.length; i++) {
      if (p.combos[i].cid === cid) return p.combos[i];
    }
    return null;
  }

  function combosWithUp() {
    return combos.filter(function (c) {
      var pk = c.picks || {};
      for (var k in pk) { if (pk[k] === "up") return true; }
      return false;
    });
  }

  function upSkillsOf(c) {
    var out = [];
    ATTRIBUTES.forEach(function (a) {
      a.skills.forEach(function (k) {
        if (c.picks[k.id] === "up") out.push(k);
      });
    });
    return out;
  }

  function downSkillsOf(c) {
    var out = [];
    ATTRIBUTES.forEach(function (a) {
      a.skills.forEach(function (k) {
        if (c.picks[k.id] === "down") out.push(k);
      });
    });
    return out;
  }

  /* 卡上的人格名：突出蓝、弱化红——跟思维阁里的写法一致 */
  function capChipsHtml(c, cls) {
    var html = "";
    upSkillsOf(c).forEach(function (k) {
      html += '<span class="' + cls + ' up">' + esc(k.name) + '</span>';
    });
    downSkillsOf(c).forEach(function (k) {
      html += '<span class="' + cls + ' down">' + esc(k.name) + '</span>';
    });
    return html;
  }

  /* 王冠：正皇冠 +1 点、倒皇冠 −1 点；再点同一顶就取下、把那 1 点退回去 */
  function setCrown(p, sid, dir) {
    var k = skillOf(sid);
    var nm = k ? k.name : sid;
    var v = p.scores[sid] || 0;
    var cur = p.crowns[sid] || null;
    var was = cur ? cur.dir : null;
    if (cur) {                       /* 先撤销旧的加成 */
      v = clamp(v - (cur.delta || 0), 0);
      delete p.crowns[sid];
    }
    if (was === dir) {               /* 点的同一顶：取下 */
      p.scores[sid] = v;
      saveProfiles();
      renderProfileStage();
      toast("取下「" + nm + "」的" + (dir === "up" ? "正" : "倒") + "皇冠");
      return;
    }
    var delta = 0;
    if (dir === "up") {
      if (v < MAX_LEVEL) { delta = 1; v += 1; }
    } else if (v > 0) {
      delta = -1; v -= 1;
    }
    p.crowns[sid] = { dir: dir, delta: delta };
    p.scores[sid] = v;
    saveProfiles();
    renderProfileStage();
    if (!delta) {
      toast(dir === "up" ? "「" + nm + "」已经到 5，正皇冠只做标记" : "「" + nm + "」已经是 0，倒皇冠只做标记");
    } else {
      toast((dir === "up" ? "给「" + nm + "」+1 点（正皇冠）" : "给「" + nm + "」−1 点（倒皇冠）") + (was ? " · 原来那顶换掉了" : ""));
    }
  }

  /* 随机用的两笔点数：先分给四个大类（每类 1–5），再撒到 24 个人格上微调 */
  var PF_ATTR_BUDGET_KEY = NS + "de-profile-abudget-v1";
  var PF_MICRO_BUDGET_KEY = NS + "de-profile-mbudget-v1";
  var PF_LOCK_KEY = NS + "de-profile-locks-v1";

  function readBudget(key, dft, lo, hi) {
    var n = parseInt(localStorage.getItem(key), 10);
    return isFinite(n) && n >= lo && n <= hi ? n : dft;
  }

  var pfAttrBudget = readBudget(PF_ATTR_BUDGET_KEY, 12, 4, 20);
  var pfMicroBudget = readBudget(PF_MICRO_BUDGET_KEY, 36, 0, 120);

  function saveAttrBudget(n) {
    pfAttrBudget = Math.max(4, Math.min(20, Math.round(Number(n) || 0)));
    try { localStorage.setItem(PF_ATTR_BUDGET_KEY, String(pfAttrBudget)); } catch (e) {}
    return pfAttrBudget;
  }

  function saveMicroBudget(n) {
    pfMicroBudget = Math.max(0, Math.min(120, Math.round(Number(n) || 0)));
    try { localStorage.setItem(PF_MICRO_BUDGET_KEY, String(pfMicroBudget)); } catch (e) {}
    return pfMicroBudget;
  }

  /* 重掷时哪几个大类不动 */
  var pfLocks = (function () {
    var o = {};
    try { o = JSON.parse(localStorage.getItem(PF_LOCK_KEY) || "{}") || {}; } catch (e) { o = {}; }
    var out = {};
    ATTRIBUTES.forEach(function (a) { out[a.id] = !!o[a.id]; });
    return out;
  })();

  function saveLocks() {
    try { localStorage.setItem(PF_LOCK_KEY, JSON.stringify(pfLocks)); } catch (e) {}
  }

  /* 收卡要不要连带加分：关掉的话只把卡记到人身上，分数一点不动 */


  /* 随机一套分数：按用户选的总点数，逐点撒到随机的人格上（单项最高 5，总共最多 120） */
  function randomizeProfile(p, attrWant, microWant) {
    var A = saveAttrBudget(attrWant === undefined ? pfAttrBudget : attrWant);
    var M = saveMicroBudget(microWant === undefined ? pfMicroBudget : microWant);

    var free = [];
    var lockedSum = 0;
    ATTRIBUTES.forEach(function (a) {
      if (pfLocks[a.id]) {
        p.attrs[a.id] = attrBase(p, a.id);
        lockedSum += p.attrs[a.id];
      } else {
        free.push(a.id);
      }
    });

    /* 第一段：大类预算 → 四个档位（每类至少 1，锁住的类不动） */
    var attrPoints = lockedSum;
    if (free.length) {
      var lo = lockedSum + free.length;                    /* 每类先给 1 */
      var hi = lockedSum + free.length * MAX_LEVEL;
      var want = Math.max(lo, Math.min(hi, A));
      var budget = want - lo;
      var lv = {};
      free.forEach(function (id) { lv[id] = 1; });
      var guard = 0;
      while (budget > 0 && guard++ < 20000) {
        var pick = free[Math.floor(Math.random() * free.length)];
        if (lv[pick] >= MAX_LEVEL) continue;
        lv[pick]++;
        budget--;
      }
      A = want;
      free.forEach(function (id) {
        p.attrs[id] = lv[id];
        ATTRIBUTES.forEach(function (a) {
          if (a.id !== id) return;
          a.skills.forEach(function (k) { p.scores[k.id] = lv[id]; });
        });
      });
      attrPoints = A;
    } else {
      A = lockedSum;                                       /* 四类全锁：只动微调 */
      attrPoints = lockedSum;
    }

    /* 第二段：微调预算 → 撒到没锁的那几行上（单格最高 5） */
    var cells = [];
    ATTRIBUTES.forEach(function (a) {
      if (pfLocks[a.id]) return;
      a.skills.forEach(function (k) { cells.push(k.id); });
    });
    var room = 0;
    cells.forEach(function (sid) { room += Math.max(0, MAX_LEVEL - (p.scores[sid] || 0)); });
    var put = Math.min(M, room);
    var applied = 0;
    var guard2 = 0;
    while (put > 0 && guard2++ < 20000) {
      var sid2 = cells[Math.floor(Math.random() * cells.length)];
      var cur = p.scores[sid2] || 0;
      if (cur >= MAX_LEVEL) continue;
      p.scores[sid2] = cur + 1;
      put--;
      applied++;
    }

    /* 王冠也重掷：随机挑 2–4 格，各 50% 正 / 倒 */
    p.crowns = {};
    var crownPool = [];
    ATTRIBUTES.forEach(function (a) { a.skills.forEach(function (k) { crownPool.push(k.id); }); });
    var crownCount = Math.min(crownPool.length, 2 + Math.floor(Math.random() * 3));
    for (var ci = 0; ci < crownCount; ci++) {
      var cid2 = crownPool.splice(Math.floor(Math.random() * crownPool.length), 1)[0];
      var cdir = Math.random() < 0.5 ? "up" : "down";
      var cv = p.scores[cid2] || 0;
      var cdelta = 0;
      if (cdir === "up" && cv < MAX_LEVEL) { cdelta = 1; cv += 1; }
      else if (cdir === "down" && cv > 0) { cdelta = -1; cv -= 1; }
      p.crowns[cid2] = { dir: cdir, delta: cdelta };
      p.scores[cid2] = cv;
    }

    p.combos = [];                 /* 分数重来，收进来的卡也跟着作废 */
    var total = 0;
    ATTRIBUTES.forEach(function (a) {
      a.skills.forEach(function (k) { total += p.scores[k.id] || 0; });
    });
    var upN = 0, downN = 0;
    Object.keys(p.crowns).forEach(function (sid) { if (p.crowns[sid].dir === "up") upN++; else downN++; });
    return { attr: attrPoints, micro: applied, wantMicro: M, room: room, total: total, freeCount: free.length, up: upN, down: downN };
  }

  function comboById(cid) {
    for (var i = 0; i < combos.length; i++) {
      if (combos[i].id === cid) return combos[i];
    }
    return null;
  }

  function comboCatLabel(c) {
    if (!c || !c.cat) return "未分类";
    return catName(c.cat) || "未分类";
  }

  function comboSearchText(c) {
    var parts = [c.title || "", comboCatLabel(c)];
    upSkillsOf(c).forEach(function (k) { parts.push(k.name); });
    return parts.join(" ").toLowerCase();
  }

  /* 右栏的筛选状态：切人物 / 重渲染后还在 */
  var pfComboQuery = "";
  /* 人物是会长大的：每个阶段一套分数 / 王冠 / 收的卡，左右按钮在阶段之间走 */
  var STAGE_DEFAULT = ["前期", "中期", "后期", "终章"];
  function cleanStageName(v, i) {
    var nm = String(v || "").trim().slice(0, 8);
    return nm || (STAGE_DEFAULT[i] || ("阶段 " + (i + 1)));
  }
  function deepMap(o) {
    var out = {};
    Object.keys(o || {}).forEach(function (k) {
      var v = o[k];
      out[k] = (v && typeof v === "object") ? { dir: v.dir, delta: v.delta } : v;
    });
    return out;
  }
  function deepCombos(a) {
    return (a || []).map(function (c) { return { cid: c.cid, adds: Object.assign({}, c.adds || {}) }; });
  }
  function loadStageInto(p, i) {
    var st = p.stages && p.stages[i];
    if (!st) return;
    p.scores = Object.assign({}, st.scores);
    p.attrs = Object.assign({}, st.attrs);
    p.combos = deepCombos(st.combos);
    p.crowns = deepMap(st.crowns);
  }
  function flushStage(p) {
    var st = p.stages && p.stages[p.stage];
    if (!st) return;
    st.scores = Object.assign({}, p.scores);
    st.attrs = Object.assign({}, p.attrs);
    st.combos = deepCombos(p.combos);
    st.crowns = deepMap(p.crowns);
  }
  function switchStage(p, i) {
    if (!p.stages || i < 0 || i >= p.stages.length || i === p.stage) return;
    flushStage(p);
    p.stage = i;
    loadStageInto(p, i);
    saveProfiles();
    renderProfileStage();
    toast("切到「" + p.stages[i].name + "」");
  }
  function addStage(p) {
    flushStage(p);
    var src = p.stages[p.stage];
    var idx = p.stage + 1;
    var nm = STAGE_DEFAULT[p.stages.length] || ("阶段 " + (p.stages.length + 1));
    p.stages.splice(idx, 0, {
      name: nm,
      scores: Object.assign({}, src.scores),
      attrs: Object.assign({}, src.attrs),
      combos: deepCombos(src.combos),
      crowns: deepMap(src.crowns)
    });
    p.stage = idx;
    loadStageInto(p, idx);
    saveProfiles();
    renderProfileStage();
    toast("加了一段「" + nm + "」：从上一段复制过来，改分数、加卡都行");
  }
  function deleteStage(p) {
    if (p.stages.length <= 1) { toast("只剩一段了，删不了"); return; }
    var nm = p.stages[p.stage].name;
    p.stages.splice(p.stage, 1);
    if (p.stage >= p.stages.length) p.stage = p.stages.length - 1;
    loadStageInto(p, p.stage);
    saveProfiles();
    renderProfileStage();
    toast("删掉了「" + nm + "」这一段");
  }
  function renameStage(p, v) {
    var st = p.stages[p.stage];
    var nm = cleanStageName(v, p.stage);
    if (nm === st.name) return;
    st.name = nm;
    saveProfiles();
    renderProfileStage();
  }
  var pfComboCat = "";
  /* 人物分析里现场写的卡：草稿放在这儿，存下来就进同一份思维阁 */
  var pfNewDraft = null;

  /* 人物分析里的「按人格筛选」：{ skillId: "up" | "down" }，和思维阁里那排按钮一样 */
  var pfFilter = {};
  var pfChipsOpen = true;

  function pfFilterActive() { return Object.keys(pfFilter).length > 0; }

  function comboPassesPfFilter(c) {
    return Object.keys(pfFilter).every(function (id) {
      if (c.picks && c.picks[id] === pfFilter[id]) return true;
      return (c.objects || []).some(function (o) { return o.picks && o.picks[id] === pfFilter[id]; });
    });
  }

  function pfChipsSum() {
    var ids = Object.keys(pfFilter);
    if (!ids.length) return "没设条件";
    return ids.map(function (id) {
      var k = skillOf(id);
      return (pfFilter[id] === "up" ? "蓝 " : "红 ") + (k ? k.name : id);
    }).join("、");
  }

  function profileChipsHtml() {
    var html = '<div class="pf-chips" data-open="' + (pfChipsOpen ? "1" : "0") + '">' +
      '<div class="pf-chips-head">' +
        '<button type="button" class="pf-chips-toggle" data-pf="chips-toggle" aria-expanded="' + (pfChipsOpen ? "true" : "false") + '">' +
          '<span class="pf-chips-arrow">▾</span>按人格筛选' +
          '<span class="pf-chips-sum">' + esc(pfChipsSum()) + '</span>' +
        '</button>' +
        '<button type="button" class="pf-chips-clear" data-pf="chips-clear"' + (pfFilterActive() ? "" : " hidden") + '>清空</button>' +
      '</div>' +
      '<div class="pf-chips-body">';
    ATTRIBUTES.forEach(function (a) {
      html += '<div class="f-row"><div class="f-row-name">' + a.name + '</div><div class="f-chips">';
      a.skills.forEach(function (k) {
        html += '<button type="button" class="f-chip" data-chip-skill="' + k.id + '" data-state="' +
          (pfFilter[k.id] || "off") + '" title="点一下＝要求「' + k.name +
          '」突出（蓝）；再点＝要求弱化（红）；再点＝取消">' + k.name + '</button>';
      });
      html += '</div></div>';
    });
    return html + '</div></div>';
  }

  /* 只刷新筛选条本身（不重绘整页），改动后重新筛卡 */
  function syncProfileChips() {
    var stage = document.getElementById("profile-stage");
    if (!stage) return;
    var box = stage.querySelector(".pf-chips");
    if (!box) return;
    Array.prototype.forEach.call(box.querySelectorAll(".f-chip"), function (chip) {
      chip.dataset.state = pfFilter[chip.dataset.chipSkill] || "off";
    });
    box.dataset.open = pfChipsOpen ? "1" : "0";
    var tg = box.querySelector(".pf-chips-toggle");
    if (tg) tg.setAttribute("aria-expanded", pfChipsOpen ? "true" : "false");
    var sum = box.querySelector(".pf-chips-sum");
    if (sum) sum.textContent = pfChipsSum();
    var clr = box.querySelector(".pf-chips-clear");
    if (clr) clr.hidden = !pfFilterActive();
    applyProfileComboFilter();
  }

  function comboBlockHtml(p) {
    var list = combosWithUp();
    var html = '<div class="pf-block pf-combo-block"><h3>思维阁 · 挑卡</h3>';

    html += '<div class="pf-pick-bar">' +
      '<input class="pf-search" id="pf-combo-search" type="search" placeholder="搜卡名 / 人格…" value="' + esc(pfComboQuery) + '" aria-label="搜思维阁的卡">' +
      '<select class="pf-cat" id="pf-combo-cat" aria-label="按分类筛选">' +
        '<option value="">全部分类</option>' +
        '<option value="__none"' + (pfComboCat === "__none" ? " selected" : "") + '>未分类</option>';
    comboCats.forEach(function (c) {
      html += '<option value="' + esc(c.id) + '"' + (pfComboCat === c.id ? " selected" : "") + '>' + esc(c.name) + '</option>';
    });
    html += '</select>' +
      '<button type="button" class="pf-newc' + (pfNewDraft ? " is-open" : "") + '" data-pf="newcard">' +
        (pfNewDraft ? "收起新卡" : "＋ 新建卡") +
      '</button></div>';

    if (pfNewDraft) html += pfNewCardHtml();

    html += profileChipsHtml();

    if (!list.length) {
      return html + '<p class="pf-hint">这里还没有标过「突出」的卡。可以直接点上面的「＋ 新建卡」写一张：左键标蓝＝突出，存下来就进同一份思维阁，同时也能在这里收。</p></div>';
    }

    html += '<ul class="pf-combolist">';
    list.forEach(function (c) {
      var on = !!comboLinkOf(p, c.id);
      html += '<li><button type="button" class="pf-combo' + (on ? " is-on" : "") +
        '" data-cid="' + esc(c.id) + '" data-cat="' + esc(c.cat || "__none") +
        '" data-text="' + esc(comboSearchText(c)) + '" title="' +
        esc(on ? "取消这张卡，分数退回" : "收进这个人，突出的人格各 +1（红的不加分）") + '">' +
        '<span class="pf-combo-title">' + esc(c.title || "没起名字的组合") + '</span>' +
        '<span class="pf-combo-hold">' +
          '<span class="pf-combo-cat">' + esc(comboCatLabel(c)) + '</span>' +
          '<span class="pf-combo-caps">' + capChipsHtml(c, "pf-combo-cap") + '</span></span></button></li>';
    });
    return html + '</ul><p class="pf-combo-none" hidden>没有匹配的卡。</p></div>';
  }

  /* 人物分析里现场写卡：省得为了写一张卡来回切界面 */
  function pfNewCardHtml() {
    var d = pfNewDraft;
    var rows = ATTRIBUTES.map(function (a) {
      return '<div class="pf-nc-row"><span class="pf-nc-attr">' + esc(a.name) + '</span>' +
        '<div class="pf-nc-chips">' + a.skills.map(function (k) {
          var st = d.picks[k.id] || "";
          return '<button type="button" class="pf-nc-cell' + (st ? " is-" + st : "") +
            '" data-ncs="' + esc(k.id) + '" title="' + (st === "up" ? "突出" : (st === "down" ? "弱化" : "点一下标蓝")) + '">' +
            esc(k.name) + '</button>';
        }).join('') + '</div></div>';
    }).join('');
    var upN = Object.keys(d.picks).filter(function (id) { return d.picks[id] === "up"; }).length;
    var downN = Object.keys(d.picks).filter(function (id) { return d.picks[id] === "down"; }).length;
    return '<div class="pf-newcard">' +
      '<input class="pf-nc-title" id="pf-nc-title" type="text" maxlength="40" placeholder="这张卡叫什么（比如：搭档原型）" value="' + esc(d.title) + '" aria-label="新卡的名字">' +
      rows +
      '<p class="pf-nc-tip">左键标蓝＝突出（收进来时 +1），右键标红＝弱化，再点一下取消。现在：突出 ' + upN + ' · 弱化 ' + downN + '</p>' +
      '<div class="pf-nc-actions">' +
        '<button type="button" class="pf-btn is-primary" data-pf="newcard-save">存进思维阁</button>' +
        '<button type="button" class="pf-btn" data-pf="newcard-cancel">取消</button>' +
      '</div></div>';
  }

  var PROFILE_CAT_NAME = "人物分析";
  function profileCatId() {
    for (var i = 0; i < comboCats.length; i++) {
      if (comboCats[i].name === PROFILE_CAT_NAME) return comboCats[i].id;
    }
    var c = { id: catId(), name: PROFILE_CAT_NAME };
    comboCats.push(c);
    saveCats();
    return c.id;
  }

  function saveNewCard() {
    if (!pfNewDraft) return;
    var titleEl = document.getElementById("pf-nc-title");
    var title = titleEl ? titleEl.value.replace(/\s+/g, " ").trim().slice(0, 40) : pfNewDraft.title;
    pfNewDraft.title = title;
    var ups = Object.keys(pfNewDraft.picks).filter(function (id) { return pfNewDraft.picks[id] === "up"; });
    if (!ups.length) {
      toast("至少给一项标蓝（突出），不然这张卡收进谁身上都不加分");
      return;
    }
    pfNewDraft.cat = profileCatId();          /* 现场建的卡统一归到「人物分析」 */
    var c = normalizeCombo(pfNewDraft);
    c.title = title || "没起名字的组合";
    c.editing = false;
    combos.unshift(c);
    saveCombos();
    pfNewDraft = null;
    renderProfileStage();
    toast("建好「" + c.title + "」，已经在下面的列表里，点它就能收");
  }

  /* 已经收进这个人身上的卡：放在矩阵下面，一眼看全 */
  function profilePickedHtml(p) {
    var cards = p.combos.map(function (l) { return comboById(l.cid); }).filter(Boolean);
    var html = '<section class="pf-picked"><h3>收进来的思维阁 <span class="pf-picked-n">' + cards.length + '</span></h3>';
    if (!cards.length) {
      return html + '<p class="pf-hint">还没收卡。右边挑一张：卡上「突出」的人格各 +1，收进来的会排到这里，点一下就能取消。</p></section>';
    }
    html += '<div class="pf-picked-list">';
    p.combos.forEach(function (l) {
      var c = comboById(l.cid);
      if (!c) return;
      var picks = capChipsHtml(c, "pf-picked-cap");
      if (!picks) picks = '<span class="pf-picked-cap is-empty">没有标突出 / 弱化的项</span>';
      html += '<button type="button" class="pf-picked-card" data-cid="' + esc(c.id) + '" title="点一下取消这张卡，分数退回去">' +
        '<span class="pf-picked-name">' + esc(c.title || "没起名字的组合") + '</span>' +
        '<span class="pf-picked-caps">' + picks + '</span>' +
        '<span class="pf-picked-x" aria-hidden="true">×</span></button>';
    });
    return html + '</div></section>';
  }

  function applyProfileComboFilter() {
    var stage = document.getElementById("profile-stage");
    if (!stage) return;
    var q = String(pfComboQuery || "").trim().toLowerCase();
    var shown = 0, total = 0;
    Array.prototype.forEach.call(stage.querySelectorAll(".pf-combo"), function (b) {
      total++;
      var c = comboById(b.dataset.cid);
      var hit = (!q || (b.dataset.text || "").indexOf(q) >= 0) &&
        (!pfComboCat || b.dataset.cat === pfComboCat) &&
        (!c || comboPassesPfFilter(c));
      b.parentNode.hidden = !hit;
      if (hit) shown++;
    });
    var none = stage.querySelector(".pf-combo-none");
    if (none) none.hidden = shown > 0 || !total;
    var sum = stage.querySelector(".pf-chips-sum");
    if (sum && (pfFilterActive() || q || pfComboCat)) {
      sum.textContent = pfChipsSum() + " · 命中 " + shown + " / " + total;
    }
  }

  /* 属性名可点：智力 / 精神 / 体格 / 身手 各自带着下面 6 个人格一起 ±1 */
  function attrById(id) {
    for (var i = 0; i < ATTRIBUTES.length; i++) if (ATTRIBUTES[i].id === id) return ATTRIBUTES[i];
    return null;
  }
  /* 属性是单独的一档：智力 3 就是这一行 6 个人格都按 3 起走，之后还能逐格微调 */
  function attrBase(p, attrId) {
    if (p.attrs && typeof p.attrs[attrId] === "number") return clamp(p.attrs[attrId], 0);
    var a = attrById(attrId);
    if (!a) return 0;
    var lo = MAX_LEVEL;
    a.skills.forEach(function (k) { lo = Math.min(lo, clamp(p.scores[k.id] || 0, 0)); });
    return lo === MAX_LEVEL ? 0 : lo;      /* 老档案没存过档值：按这一行最低的那格算 */
  }
  function bumpAttr(p, attrId, delta) {
    var attr = attrById(attrId);
    if (!attr) return;
    var from = attrBase(p, attrId);
    var to = clamp(from + delta, 0);
    if (to === from) {
      toast("「" + attr.name + "」已经到 " + (delta > 0 ? MAX_LEVEL : 0) + " 了");
      return;
    }
    p.attrs = p.attrs || {};
    p.attrs[attrId] = to;
    attr.skills.forEach(function (k) { p.scores[k.id] = to; });
    saveProfiles();
    renderProfileStage();
    toast("「" + attr.name + "」= " + to + " · 下面 6 项都设成 " + to + "（还能单独微调）");
  }

  function toggleProfileCombo(p, cid) {
    var c = comboById(cid);
    if (!c) return;
    var link = comboLinkOf(p, cid);
    if (link) {
      if (Object.keys(link.adds || {}).length) {
        Object.keys(link.adds).forEach(function (sid) {
          p.scores[sid] = clamp((p.scores[sid] || 0) - (link.adds[sid] || 0), 0);
        });
      }
      p.combos = p.combos.filter(function (x) { return x.cid !== cid; });
      toast("已取消这张卡，分数退回去了");
    } else {
      var adds = {};
      upSkillsOf(c).forEach(function (k) {
        var cur = p.scores[k.id] || 0;
        if (cur >= MAX_LEVEL) return;      /* 已经顶格：不加，取消时也不减 */
        p.scores[k.id] = cur + 1;
        adds[k.id] = 1;
      });
      if (!Object.keys(adds).length) {
        toast("这张卡上的人格都已经到 5 了，加不上去");
        return;
      }
      p.combos.push({ cid: cid, adds: adds });
      toast("收进「" + (c.title || "这条组合") + "」，突出的人格各 +1");
    }
    saveProfiles();
    renderProfileStage();
  }

  (function bindProfileUI() {
    var stage = document.getElementById("profile-stage");
    var tabs = document.getElementById("profile-tabs");
    var newBtn = document.getElementById("profile-new");

    if (tabs) tabs.addEventListener("click", function (e) {
      var b = e.target.closest(".pf-tab");
      if (!b) return;
      profileId = b.dataset.pid;
      buildProfileView();
    });

    if (newBtn) newBtn.addEventListener("click", addProfile);

    if (stage) {
      stage.addEventListener("click", function (e) {
        var p = currentProfile();
        if (!p) return;

        var pick = e.target.closest(".pf-picked-card");
        if (pick) { toggleProfileCombo(p, pick.dataset.cid); return; }

        /* 现场新建的卡：点格子三态循环，右键直接标红 */
        var ncCell = e.target.closest("[data-ncs]");
        if (ncCell && pfNewDraft) {
          var ncid = ncCell.dataset.ncs;
          var cur = pfNewDraft.picks[ncid] || "";
          var next = cur === "" ? "up" : (cur === "up" ? "down" : "");
          if (next) pfNewDraft.picks[ncid] = next;
          else delete pfNewDraft.picks[ncid];
          renderProfileStage();
          return;
        }

        if (e.target.closest('[data-pf="newcard"]')) {
          pfNewDraft = pfNewDraft ? null : normalizeCombo({ title: "" });
          if (pfNewDraft) pfNewDraft.title = "";
          renderProfileStage();
          var tEl = document.getElementById("pf-nc-title");
          if (tEl) tEl.focus();
          return;
        }
        if (e.target.closest('[data-pf="newcard-cancel"]')) {
          pfNewDraft = null;
          renderProfileStage();
          return;
        }
        if (e.target.closest('[data-pf="newcard-save"]')) {
          saveNewCard();
          return;
        }

        /* 按人格筛选：点一下＝突出、再点＝弱化、第三次取消（和思维阁里那排一样） */
        var chip = e.target.closest(".f-chip");
        if (chip && chip.dataset.chipSkill) {
          var kid = chip.dataset.chipSkill;
          if (!pfFilter[kid]) pfFilter[kid] = "up";
          else if (pfFilter[kid] === "up") pfFilter[kid] = "down";
          else delete pfFilter[kid];
          syncProfileChips();
          return;
        }
        if (e.target.closest('[data-pf="chips-toggle"]')) {
          pfChipsOpen = !pfChipsOpen;
          syncProfileChips();
          return;
        }
        if (e.target.closest('[data-pf="chips-clear"]')) {
          pfFilter = {};
          syncProfileChips();
          return;
        }

        var cbtn = e.target.closest(".pf-combo");
        if (cbtn) { toggleProfileCombo(p, cbtn.dataset.cid); return; }

        /* 右上角王冠：设为招牌（再点取消） */
        var stageBtn = e.target.closest("[data-stage]");
        if (stageBtn) {
          var sv = stageBtn.dataset.stage;
          if (sv === "prev") switchStage(p, p.stage - 1);
          else if (sv === "next") switchStage(p, p.stage + 1);
          else if (sv === "add") addStage(p);
          else if (sv === "del") deleteStage(p);
          return;
        }

        var crown = e.target.closest(".pf-crown-btn");
        if (crown && crown.dataset.crown) {
          setCrown(p, crown.dataset.crown, crown.dataset.dir === "down" ? "down" : "up");
          return;
        }

        /* 属性名：这一行的 6 个人格跟着一起动 */
        var attrBtn = e.target.closest(".pf-attr");
        if (attrBtn) { bumpAttr(p, attrBtn.dataset.attr, 1); return; }

        var cell = e.target.closest(".pf-cell");
        if (cell) {
          var sid = cell.dataset.skill;
          p.scores[sid] = ((p.scores[sid] || 0) + 1) % (MAX_LEVEL + 1);
          saveProfiles();
          renderProfileStage();
          return;
        }

        var lock = e.target.closest(".pf-lock");
        if (lock) {
          var lid = lock.dataset.lock;
          pfLocks[lid] = !pfLocks[lid];
          saveLocks();
          renderProfileStage();
          var lname = "";
          ATTRIBUTES.forEach(function (a) { if (a.id === lid) lname = a.name; });
          toast((pfLocks[lid] ? "锁住" : "松开") + "「" + lname + "」，重掷时" + (pfLocks[lid] ? "不动这一行" : "会重新分"));
          return;
        }

        var btn = e.target.closest("[data-pf]");
        if (!btn) return;
        if (btn.dataset.pf === "random") {
          var ab = document.getElementById("pf-attr-budget");
          var mb = document.getElementById("pf-micro-budget");
          var r = randomizeProfile(p, ab ? ab.value : pfAttrBudget, mb ? mb.value : pfMicroBudget);
          saveProfiles();
          renderProfileStage();
          var note = r.micro < r.wantMicro && r.freeCount
            ? "微调只剩 " + r.room + " 格空位，剩下的没撒完"
            : (r.freeCount ? "收进来的卡清空了" : "四个大类都锁着，只撒了微调");
          toast("大类 " + r.attr + " 点 · 微调 " + r.micro + " 点 · 合计 " + r.total + " 点 · 皇冠 正 " + r.up + " / 倒 " + r.down + "，" + note);
        } else if (btn.dataset.pf === "del") {
          var nm = p.name || "这份档案";
          if (window.confirm && !window.confirm("删掉「" + nm + "」？分数和收进来的卡都会一起消失。")) return;
          profiles = profiles.filter(function (x) { return x.id !== p.id; });
          profileId = profiles.length ? profiles[0].id : null;
          saveProfiles();
          buildProfileView();
          toast("已删除这份人物档案");
        }
      });

      /* 右键：−1（0 的时候绕回 5） */
      stage.addEventListener("contextmenu", function (e) {
        var p0 = currentProfile();
        if (!p0) return;

        var ncCell = e.target.closest("[data-ncs]");
        if (ncCell && pfNewDraft) {
          e.preventDefault();
          var ncid = ncCell.dataset.ncs;
          if (pfNewDraft.picks[ncid] === "down") delete pfNewDraft.picks[ncid];
          else pfNewDraft.picks[ncid] = "down";
          renderProfileStage();
          return;
        }
        /* 属性名上的右键：整行 6 个人格各 −1 */
        var attrBtn = e.target.closest(".pf-attr");
        if (attrBtn) {
          e.preventDefault();
          bumpAttr(p0, attrBtn.dataset.attr, -1);
          return;
        }
        var cell = e.target.closest(".pf-cell");
        if (!cell) return;
        var p = currentProfile();
        if (!p) return;
        e.preventDefault();
        var id = cell.dataset.skill;
        p.scores[id] = ((p.scores[id] || 0) + MAX_LEVEL) % (MAX_LEVEL + 1);
        saveProfiles();
        renderProfileStage();
      });

      /* 键盘：格子是 div 了，Enter / 空格也当左键 +1 */
      stage.addEventListener("keydown", function (e) {
        if (e.key !== "Enter" && e.key !== " ") return;
        var cell = e.target.closest(".pf-cell");
        if (!cell) return;
        var p = currentProfile();
        if (!p) return;
        e.preventDefault();
        var id = cell.dataset.skill;
        p.scores[id] = ((p.scores[id] || 0) + 1) % (MAX_LEVEL + 1);
        saveProfiles();
        renderProfileStage();
        var again = stage.querySelector('.pf-cell[data-skill="' + id + '"]');
        if (again) again.focus();
      });

      stage.addEventListener("input", function (e) {
        var p = currentProfile();
        if (!p) return;
        if (e.target.id === "pf-name") {
          p.name = cleanName(e.target.value, "新人物");
          saveProfiles();
        } else if (e.target.id === "pf-work") {
          p.work = String(e.target.value).slice(0, 24);
          saveProfiles();
        } else if (e.target.id === "pf-nc-title") {
          if (pfNewDraft) pfNewDraft.title = e.target.value;
        } else if (e.target.id === "pf-combo-search") {
          pfComboQuery = e.target.value;
          applyProfileComboFilter();
        } else if (e.target.id === "pf-attr-budget" && e.target.value !== "") {
          saveAttrBudget(e.target.value);
        } else if (e.target.id === "pf-micro-budget" && e.target.value !== "") {
          saveMicroBudget(e.target.value);
        }
      });

      stage.addEventListener("change", function (e) {
        var p = currentProfile();
        if (!p) return;
        if (e.target.id === "pf-name" || e.target.id === "pf-work") {
          buildProfileView();
        } else if (e.target.id === "pf-stage-name") {
          renameStage(p, e.target.value);
        } else if (e.target.id === "pf-combo-cat") {
          pfComboCat = e.target.value;
          applyProfileComboFilter();
        }
      });
    }

    var expBtn = document.getElementById("profile-exp");
    if (expBtn) expBtn.addEventListener("click", function () {
      if (!profiles.length) { toast("还没有人物档案，没有可导出的东西"); return; }
      var data = { kind: "persona-profiles", v: 1, exportedAt: new Date().toISOString(), profiles: profiles };
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "persona-profiles-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
      toast("已导出 " + profiles.length + " 份人物档案");
    });

    var impBtn = document.getElementById("profile-imp");
    var fileInput = document.getElementById("profile-file");
    if (impBtn && fileInput) {
      impBtn.addEventListener("click", function () { fileInput.click(); });
      fileInput.addEventListener("change", function (e) {
        var f = e.target.files && e.target.files[0];
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function () {
          var n = 0;
          try {
            var obj = JSON.parse(reader.result);
            var arr = Array.isArray(obj) ? obj : (obj && obj.profiles);
            if (!Array.isArray(arr)) throw new Error("bad");
            arr.forEach(function (raw) {
              var np = normalizeProfile(raw);
              profiles = profiles.filter(function (x) { return x.id !== np.id; });
              profiles.push(np);
              n++;
            });
            profileId = profiles.length ? profiles[profiles.length - 1].id : null;
            saveProfiles();
            buildProfileView();
          } catch (err) {
            toast("这个文件不是有效的人物档案");
            e.target.value = "";
            return;
          }
          toast("已导入 " + n + " 份人物档案");
          e.target.value = "";
        };
        reader.readAsText(f);
      });
    }
  })();

  buildBoards();
  paintAll();
  applyView(view, false);

  var viewsNav = document.getElementById("views");
  if (viewsNav) {
    viewsNav.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-view]");
      if (!btn) return;
      applyView(btn.dataset.view, true);
      toast(view === "combo" ? "思维阁：一张卡＝一个人物或一种组合，还能挂好几个对象"
        : view === "lines" ? "长篇分析：一篇可以有很多段，每段行尾挂人格"
        : "人格面板：一张板，专心调这一套");
    });

    /* 键盘：左右方向键在三个界面之间走，Home / End 跳到首尾 */
    viewsNav.addEventListener("keydown", function (e) {
      var keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
      if (keys.indexOf(e.key) < 0) return;
      var btns = Array.prototype.slice.call(viewsNav.querySelectorAll("button[data-view]"));
      if (!btns.length) return;
      var at = btns.indexOf(document.activeElement);
      if (at < 0) at = btns.findIndex(function (b) { return b.dataset.view === view; });
      var next = at;
      if (e.key === "ArrowLeft") next = (at - 1 + btns.length) % btns.length;
      else if (e.key === "ArrowRight") next = (at + 1) % btns.length;
      else if (e.key === "Home") next = 0;
      else next = btns.length - 1;
      e.preventDefault();
      btns[next].focus();
      btns[next].click();
    });
  }


  /* ===== 按人格筛选（只在思维阁里生效） ===== */
  var filterEl = document.getElementById("filter");
  var filterBodyEl = document.getElementById("filter-body");
  var filterSumEl = document.getElementById("filter-sum");
  var filterClearEl = document.getElementById("filter-clear");
  var filterToggleEl = document.getElementById("filter-toggle");
  var filterEmptyEl = null;

  function filterActive() { return Object.keys(filterSel).length > 0 || !!comboQuery; }

  function comboMatchesCat(c) {
    if (!activeCat) return true;
    if (activeCat === "__none") return !c.cat || !catName(c.cat);
    return c.cat === activeCat;
  }

  function comboMatchesQuery(c) {
    if (!comboQuery) return true;
    var q = comboQuery.toLowerCase();
    var hay = (c.title || "") + "\n" + (c.note || "");
    c.objects.forEach(function (o) { hay += "\n" + (o.name || ""); });
    return hay.toLowerCase().indexOf(q) >= 0;
  }

  function comboMatchesFilter(c) {
    if (!comboMatchesQuery(c)) return false;
    return Object.keys(filterSel).every(function (id) {
      if (c.picks[id] === filterSel[id]) return true;
      return c.objects.some(function (o) { return o.picks[id] === filterSel[id]; });
    });
  }

  function buildFilterChips() {
    if (!filterBodyEl) return;
    filterBodyEl.innerHTML = "";
    ATTRIBUTES.forEach(function (a) {
      var row = el("div", "f-row", filterBodyEl);
      var nameEl = el("div", "f-row-name", row);
      nameEl.textContent = a.name;
      var box = el("div", "f-chips", row);
      a.skills.forEach(function (k) {
        var chip = el("button", "f-chip", box);
        chip.type = "button";
        chip.dataset.skill = k.id;
        chip.dataset.state = "off";
        chip.textContent = k.name;
        chip.title = "点一下＝要求「" + k.name + "」突出（蓝）；再点＝要求弱化（红）；再点＝取消";
        chip.addEventListener("click", function () {
          var cur = filterSel[k.id];
          if (!cur) filterSel[k.id] = "up";
          else if (cur === "up") filterSel[k.id] = "down";
          else delete filterSel[k.id];
          syncFilter();
        });
      });
    });
    var legend = el("div", "f-legend", filterBodyEl);
    legend.textContent = "点一下标蓝＝这条组合里必须有它且是「突出」；再点标红＝必须有它且是「弱化」；第三次点取消。同时选两个就取交集。";
  }

  function syncFilter() {
    if (!filterBodyEl) return;
    Array.prototype.forEach.call(filterBodyEl.querySelectorAll(".f-chip"), function (chip) {
      chip.dataset.state = filterSel[chip.dataset.skill] || "off";
    });

    /* 顶部摘要：蓝、红分开写 */
    filterSumEl.innerHTML = "";
    var ids = Object.keys(filterSel);
    if (!ids.length) {
      var none = el("span", "fs-none", filterSumEl);
      none.textContent = comboQuery
        ? "搜「" + comboQuery + "」"
        : "没设条件 —— 显示全部组合";
    } else {
      var ups = ids.filter(function (id) { return filterSel[id] === "up"; });
      var downs = ids.filter(function (id) { return filterSel[id] === "down"; });
      ups.forEach(function (id) {
        var t = el("span", "fs up", filterSumEl);
        t.textContent = "蓝 " + skillOf(id).name;
      });
      downs.forEach(function (id) {
        var t = el("span", "fs down", filterSumEl);
        t.textContent = "红 " + skillOf(id).name;
      });
    }
    filterClearEl.hidden = !ids.length;
    applyComboFilter();
  }

  function applyComboFilter() {
    if (!comboGridEl) return;
    var cards = comboGridEl.querySelectorAll(".cc");
    var shown = 0;
    Array.prototype.forEach.call(cards, function (card) {
      var c = null;
      for (var i = 0; i < combos.length; i++) if (combos[i].id === card.dataset.id) c = combos[i];
      var ok = !c || (comboMatchesCat(c) && comboMatchesFilter(c));
      card.hidden = !ok;
      if (ok) shown++;
    });

    var active = filterActive();
    var count = document.getElementById("filter-count");
    if (filterSumEl && active) {
      var tail = el("span", "fs-count", filterSumEl);
      tail.textContent = "命中 " + shown + " / " + cards.length + " 条";
    }

    if (filterEmptyEl) { filterEmptyEl.remove(); filterEmptyEl = null; }
    if (active && cards.length && !shown) {
      filterEmptyEl = el("div", "combo-empty", comboGridEl);
      filterEmptyEl.textContent = comboQuery
        ? ("没有标题或解释里含「" + comboQuery + "」的组合 —— 点搜索框右边的 × 清空。")
        : "没有同时满足这些条件的组合 —— 点「清空」或者改条件。";
    }
  }

  if (filterToggleEl && filterEl) {
    filterToggleEl.addEventListener("click", function () {
      var open = filterEl.dataset.open === "1";
      filterEl.dataset.open = open ? "0" : "1";
      filterToggleEl.setAttribute("aria-expanded", open ? "false" : "true");
    });
  }

  if (filterClearEl) {
    filterClearEl.addEventListener("click", function () {
      filterSel = {};
      syncFilter();
    });
  }

  /* 搜索框：输入即筛，× 清空 */
  var comboSearchEl = document.getElementById("combo-search");
  var comboSearchClearEl = document.getElementById("combo-search-clear");
  function syncSearchClear() {
    if (comboSearchClearEl) comboSearchClearEl.hidden = !comboQuery;
  }
  if (comboSearchEl) {
    comboSearchEl.addEventListener("input", function () {
      comboQuery = comboSearchEl.value.trim();
      syncSearchClear();
      syncFilter();
      applyComboFilter();
    });
    comboSearchEl.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        comboSearchEl.value = "";
        comboQuery = "";
        syncSearchClear();
        syncFilter();
        applyComboFilter();
      }
    });
  }
  if (comboSearchClearEl) {
    comboSearchClearEl.addEventListener("click", function () {
      if (comboSearchEl) comboSearchEl.value = "";
      comboQuery = "";
      syncSearchClear();
      syncFilter();
      applyComboFilter();
      if (comboSearchEl) comboSearchEl.focus();
    });
  }

  /* 深链：?q=关键词 */
  var qParam = /[?&]q=([^&]*)/.exec(location.search);
  if (qParam && comboSearchEl) {
    comboQuery = decodeURIComponent(qParam[1]).trim();
    comboSearchEl.value = comboQuery;
    syncSearchClear();
  }

  var expandAllBtn = document.getElementById("combo-expand-all");
  if (expandAllBtn) {
    expandAllBtn.addEventListener("click", function () {
      expandAll = !expandAll;
      expandAllBtn.textContent = expandAll ? "收起全部" : "全部展开";
      expandAllBtn.classList.toggle("is-on", expandAll);
      syncComboClamp();
    });
  }

  buildFilterChips();

  /* 深链：?f=reaction-speed:up,suggestion:down 直接带上筛选项 */
  var fParam = /[?&]f=([^&]+)/.exec(location.search);
  if (fParam) {
    decodeURIComponent(fParam[1]).split(",").forEach(function (pair) {
      var bits = pair.split(":");
      if (bits[0] && (bits[1] === "up" || bits[1] === "down")) filterSel[bits[0]] = bits[1];
    });
    if (Object.keys(filterSel).length) {
      filterEl.dataset.open = "1";
      filterToggleEl.setAttribute("aria-expanded", "true");
    }
  }

  syncFilter();

  var comboNewBtn = document.getElementById("combo-new");
  if (comboNewBtn) comboNewBtn.addEventListener("click", addCombo);

  /* ===== 组合单独导出 / 导入 ===== */
  var comboFileEl = document.getElementById("combo-file");

  function exportCombos() {
    if (!combos.length) { toast("还没有组合，没有可导出的东西"); return; }
    var stamp = new Date().toISOString().slice(0, 10);
    download("persona-combos-" + stamp + ".json", JSON.stringify({
      kind: "persona-combos",
      v: 1,
      exportedAt: new Date().toISOString(),
      categories: comboCats.map(function (c) { return { id: c.id, name: c.name }; }),
      combos: combos.map(function (c) {
        return {
      id: c.id,
      title: c.title,
      note: c.note,
      cat: c.cat || "",
      picks: c.picks,
      notes: c.notes,
      objects: c.objects.map(function (o) {
        return { name: o.name, picks: o.picks, notes: o.notes };
      })
    };
      })
    }, null, 2));
    toast("已导出 " + combos.length + " 条组合");
  }

  function mergeCats(list) {
    if (!Array.isArray(list)) return;
    list.forEach(function (raw) {
      if (!raw) return;
      var name = String(raw.name || "").replace(/\s+/g, "").slice(0, 8);
      if (!name) return;
      var id = String(raw.id || "");
      var hit = null;
      comboCats.forEach(function (c) { if (c.id === id || c.name === name) hit = c; });
      if (hit) return;
      comboCats.push({ id: id || catId(), name: name });
    });
    saveCats();
  }

  function importCombos(data) {
    if (data && data.categories) mergeCats(data.categories);
    var list = null;
    if (Array.isArray(data)) list = data;
    else if (data && Array.isArray(data.combos)) list = data.combos;
    else if (data && typeof data === "object") {
      /* 也认 {id: 组合} 这种写法 */
      var vals = Object.keys(data).map(function (k) { return data[k]; });
      if (vals.length && vals.every(function (v) { return v && (v.picks || v.title); })) list = vals;
    }
    if (!list) { toast("这个文件里没找到组合"); return; }

    var incoming = list.map(normalizeCombo).filter(function (c) { return c.id || c.title; });
    var added = 0, updated = 0;
    incoming.forEach(function (c) {
      if (!c.id) c.id = "c-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
      var hit = null;
      for (var i = 0; i < combos.length; i++) if (combos[i].id === c.id) hit = combos[i];
      if (hit) {
        hit.title = c.title; hit.note = c.note; hit.picks = c.picks;
        updated++;
      } else {
        c.editing = false;
        combos.push(c);
        added++;
      }
    });
    saveCombos();
    buildComboView();
    toast("导入 " + incoming.length + " 条（新增 " + added + " / 覆盖 " + updated + "）");
  }

  var comboExpBtn = document.getElementById("combo-exp");
  if (comboExpBtn) comboExpBtn.addEventListener("click", exportCombos);

  var comboImpBtn = document.getElementById("combo-imp");
  if (comboImpBtn) comboImpBtn.addEventListener("click", function () {
    if (comboFileEl) comboFileEl.click();
  });

  if (comboFileEl) {
    comboFileEl.addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try { importCombos(JSON.parse(reader.result)); }
        catch (err) { toast("这个文件读不出来，确认是组合导出的 JSON"); }
      };
      reader.readAsText(file, "utf-8");
      comboFileEl.value = "";
    });
  }

  // 支持 index.html?shot=1 直接进入截图模式（方便出图 / 投屏）
  if (/[?&]shot=1\b/.test(location.search)) {
    document.body.classList.add("shot");
    var shotBtn = document.querySelector('[data-action="shot"]');
    if (shotBtn) shotBtn.classList.add("active");
  }

  // 出图 / 自检时关掉所有过渡，避免无头截图抓到过渡中间态
  if (/[?&]noanim=1\b/.test(location.search)) document.documentElement.classList.add("no-anim");

  // 支持 index.html?codex=drama 直接翻开某个人格的档案（方便单独分享一张词条）
  var codexParam = /[?&]codex=([a-z-]+)/.exec(location.search);
  /* 出图用：把所有组合卡直接摊成编辑态 */
  if (/[?&]comboedit=1\b/.test(location.search)) {
    combos.forEach(function (c) { c.editing = true; });
    viewDirty.combo = true;
  }

  if (codexParam) {
    openCodex(codexParam[1]);
    if (/[?&]edit=1\b/.test(location.search)) toggleEdit(true);
  }
})();
