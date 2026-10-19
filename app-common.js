// ======================================================================
// 共通ユーティリティ(GitHub API でのCSV読み書き + バリデーション)
// config.js の後に読み込むこと
// ======================================================================
(function (global) {
  "use strict";

  var CFG = global.WISH_CONFIG;

  // ---------- 設定チェック ----------
  function isConfigured() {
    return CFG
      && typeof CFG.dataRepo === "string"
      && CFG.dataRepo.indexOf("/") > 0
      && CFG.dataRepo.indexOf("YOUR-USERNAME") < 0
      && typeof CFG.token === "string"
      && CFG.token.indexOf("XXXXXXXX") < 0
      && CFG.token.length > 20;
  }

  // ---------- base64 (UTF-8対応) ----------
  function b64encode(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function b64decode(b64) {
    var bin = atob(String(b64).replace(/\s/g, ""));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  // ---------- GitHub API ----------
  function api(method, path, body) {
    return fetch("https://api.github.com" + path + "?t=" + Date.now(), {
      method: method,
      headers: {
        "Authorization": "Bearer " + CFG.token,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined
    });
  }

  // CSVファイルを取得 → {sha, rows} / ファイルが無ければ {sha:null, rows:[]}
  function fetchResponses() {
    return api("GET", "/repos/" + CFG.dataRepo + "/contents/" + encodeURIComponent(CFG.dataFile))
      .then(function (res) {
        if (res.status === 404) return { sha: null, rows: [] };
        if (res.status === 401 || res.status === 403) {
          throw new Error("トークンが無効か、リポジトリへのアクセス権がありません。config.js の token と dataRepo を確認してください。");
        }
        if (!res.ok) throw new Error("GitHubからの取得に失敗しました(HTTP " + res.status + ")");
        return res.json().then(function (j) {
          return { sha: j.sha, rows: parseCsv(b64decode(j.content)) };
        });
      });
  }

  // CSVを書き込む(201/200=成功 / 409=競合)
  function putResponses(text, sha, message) {
    var body = {
      message: message,
      content: b64encode(text),
      branch: CFG.branch
    };
    if (sha) body.sha = sha;
    return api("PUT", "/repos/" + CFG.dataRepo + "/contents/" + encodeURIComponent(CFG.dataFile), body)
      .then(function (res) {
        if (res.status === 200 || res.status === 201) return { ok: true };
        if (res.status === 409) return { ok: false, conflict: true };
        if (res.status === 401 || res.status === 403) {
          return { ok: false, error: "トークンが無効か、書き込み権限がありません。fine-grained トークンで Contents: Read and write 権限を付与してください。" };
        }
        if (res.status === 404) {
          return { ok: false, error: "データ用リポジトリ(dataRepo)が見つかりません。config.js の設定を確認してください。" };
        }
        return res.json().then(function (j) {
          return { ok: false, error: "保存に失敗しました(HTTP " + res.status + "): " + (j && j.message ? j.message : "") };
        }).catch(function () { return { ok: false, error: "保存に失敗しました(HTTP " + res.status + ")" }; });
      });
  }

  // ---------- CSV パース/シリアライズ ----------
  function parseCsv(text) {
    if (!text) return [];
    var lines = text.replace(/\r/g, "").split("\n").filter(function (l) { return l.trim() !== ""; });
    if (lines.length && lines[0].indexOf("name,") === 0) lines.shift(); // ヘッダー
    return lines.map(function (line) {
      var c = line.split(",");
      return { name: c[0], w1: c[1], w2: c[2], w3: c[3], bad: c[4], updatedAt: c[5] || "" };
    });
  }
  function toCsv(rows) {
    var sorted = rows.slice().sort(function (a, b) {
      return CFG.participants.indexOf(a.name) - CFG.participants.indexOf(b.name);
    });
    var lines = ["name,w1,w2,w3,bad,updated_at"];
    sorted.forEach(function (r) {
      lines.push([r.name, r.w1, r.w2, r.w3, r.bad, r.updatedAt].join(","));
    });
    return lines.join("\n") + "\n";
  }

  // ---------- 回答の送信(読み出し→ upsert → 書き戻し、競合時は自動再試行) ----------
  function submitResponse(name, picks) {
    if (!isConfigured()) {
      return Promise.reject(new Error("このサイトはまだ設定が完了していません(管理者に連絡してください)。"));
    }
    var attempt = 0;
    function tryOnce() {
      attempt++;
      return fetchResponses().then(function (cur) {
        var existed = cur.rows.some(function (r) { return r.name === name; });
        var next = cur.rows.filter(function (r) { return r.name !== name; });
        next.push({
          name: name, w1: picks.w1, w2: picks.w2, w3: picks.w3, bad: picks.bad,
          updatedAt: new Date().toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
        });
        return putResponses(toCsv(next), cur.sha, "回答を更新: " + name)
          .then(function (r) {
            if (r.ok) return { overwrote: existed };
            if (r.conflict && attempt < 5) return tryOnce(); // 他の人の送信と競合したら再試行
            throw new Error(r.error || "他の人の送信と重なって保存できませんでした。もう一度送信してください。");
          });
      });
    }
    return tryOnce();
  }

  // ---------- バリデーション ----------
  function validate(name, picks) {
    if (CFG.participants.indexOf(name) < 0) return "名前が参加者一覧にありません。";
    var values = [picks.w1, picks.w2, picks.w3, picks.bad];
    for (var i = 0; i < values.length; i++) {
      if (CFG.options.indexOf(values[i]) < 0) return "すべての項目を選択してください。";
    }
    if (new Set(values).size !== 4) {
      return "第1〜3希望と「手に入れたくないもの」は、それぞれ違う選択肢を選んでください。";
    }
    return null;
  }

  global.WishCommon = {
    CFG: CFG,
    isConfigured: isConfigured,
    fetchResponses: fetchResponses,
    submitResponse: submitResponse,
    validate: validate
  };
})(window);
