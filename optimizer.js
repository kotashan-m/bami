// ======================================================================
// 最適割当て計算(サーバー版server.pyと同じロジックのJavaScript移植版)
// config.js の後に読み込むこと。依存: なし(純粋計算のみ)
// ======================================================================
(function (global) {
  "use strict";

  var OUTPUT_ORDER = ["下4", "下3", "下2", "下1", "0", "上1", "上2", "上3", "上4"];

  function personScore(cfg, resp, opt) {
    var s = 0;
    if (resp.w1 === opt) s += cfg.w1Score;
    else if (resp.w2 === opt) s += cfg.w2Score;
    else if (resp.w3 === opt) s += cfg.w3Score;
    if (resp.bad === opt) s -= cfg.badPenalty;
    return s;
  }

  function rankLabel(resp, opt) {
    if (resp.w1 === opt) return "第1希望";
    if (resp.w2 === opt) return "第2希望";
    if (resp.w3 === opt) return "第3希望";
    if (resp.bad === opt) return "NG(回避希望)";
    return "希望圏外";
  }

  function buildPattern(perm, cfg, respondents, nonRespondents, data) {
    var assign = {};
    perm.forEach(function (oi, i) { assign[respondents[i]] = cfg.options[oi]; });

    // 未回答者には残りの選択肢を参加者順に自動割当
    var used = {};
    Object.keys(assign).forEach(function (p) { used[assign[p]] = true; });
    var leftovers = cfg.options.filter(function (o) { return !used[o]; });
    nonRespondents.forEach(function (p, i) { if (leftovers[i] !== undefined) assign[p] = leftovers[i]; });

    var lines = OUTPUT_ORDER.map(function (opt) {
      var hit = cfg.participants.filter(function (p) { return assign[p] === opt; })[0];
      return opt + (hit || "");
    });

    var members = [];
    var summary = { "第1希望": 0, "第2希望": 0, "第3希望": 0, "希望圏外": 0, "NG": 0, "未回答": 0 };
    cfg.participants.forEach(function (p) {
      var opt = assign[p];
      var label;
      if (data[p]) {
        label = rankLabel(data[p], opt);
        summary[label.indexOf("NG") === 0 ? "NG" : label] += 1;
      } else {
        label = "未回答(自動割当)";
        summary["未回答"] += 1;
      }
      members.push({ person: p, option: opt, label: label });
    });

    return { assignment: members, lines: lines.join("\n"), summary: summary };
  }

  /**
   * data: { 名前: {w1,w2,w3,bad}, ... }
   * 戻り値: Python版と同じ形状
   *   { respondents:[], nonRespondents:[], modes:[{id,name,description,score,tieCount,patterns:[...]}, ...] }
   */
  function computeResults(cfg, data) {
    var MAX_KEEP = 50;
    var respondents = cfg.participants.filter(function (p) { return data[p]; });
    var nonRespondents = cfg.participants.filter(function (p) { return !data[p]; });
    var n = respondents.length;

    var empty = [
      {
        id: "priority", name: "① 優先度高モード(しいたん・オルサ・てっこ・ゆうや優先)",
        description: "優先メンバー4人の希望スコアを" + cfg.priorityWeight + "倍で評価した最適解",
        score: 0, tieCount: 0, patterns: []
      },
      { id: "equal", name: "② 全員平等モード", description: "全員の希望スコアを同じ重みで評価した最適解", score: 0, tieCount: 0, patterns: [] }
    ];
    if (n === 0) {
      return { respondents: respondents, nonRespondents: nonRespondents, modes: empty };
    }

    var scores = {};   // scores[人][optionIndex]
    respondents.forEach(function (p) {
      scores[p] = cfg.options.map(function (o) { return personScore(cfg, data[p], o); });
    });
    var weight = respondents.map(function (p) {
      return cfg.priorityMembers.indexOf(p) >= 0 ? cfg.priorityWeight : 1;
    });

    var best = { equal: null, priority: null };
    var kept = { equal: [], priority: [] };
    var count = { equal: 0, priority: 0 };

    var nOptions = cfg.options.length;
    var usedIdx = new Array(nOptions).fill(false);
    var perm = new Array(n);

    function record(key, val) {
      if (best[key] === null || val > best[key]) {
        best[key] = val;
        kept[key] = [perm.slice()];
        count[key] = 1;
      } else if (val === best[key]) {
        count[key] += 1;
        if (kept[key].length < MAX_KEEP) kept[key].push(perm.slice());
      }
    }

    function recurse(depth) {
      if (depth === n) {
        var eq = 0, pr = 0;
        for (var i = 0; i < n; i++) {
          var base = scores[respondents[i]][perm[i]];
          eq += base;
          pr += base * weight[i];
        }
        record("equal", eq);
        record("priority", pr);
        return;
      }
      for (var oi = 0; oi < nOptions; oi++) {
        if (usedIdx[oi]) continue;
        usedIdx[oi] = true;
        perm[depth] = oi;
        recurse(depth + 1);
        usedIdx[oi] = false;
      }
    }
    recurse(0);

    var modes = [
      {
        id: "priority",
        name: "① 優先度高モード(しいたん・オルサ・てっこ・ゆうや優先)",
        description: "優先メンバー4人の希望スコアを" + cfg.priorityWeight + "倍で評価した最適解",
        score: best.priority,
        tieCount: count.priority,
        patterns: kept.priority.map(function (pm) { return buildPattern(pm, cfg, respondents, nonRespondents, data); })
      },
      {
        id: "equal",
        name: "② 全員平等モード",
        description: "全員の希望スコアを同じ重みで評価した最適解",
        score: best.equal,
        tieCount: count.equal,
        patterns: kept.equal.map(function (pm) { return buildPattern(pm, cfg, respondents, nonRespondents, data); })
      }
    ];
    return { respondents: respondents, nonRespondents: nonRespondents, modes: modes };
  }

  global.WishOptimizer = { computeResults: computeResults, OUTPUT_ORDER: OUTPUT_ORDER };
})(window);
