// ======================================================================
// 設定ファイル(GitHub Pages 版)
// ここだけ編集してコミットしてください。編集後の反映は1〜2分かかります。
// ======================================================================
window.WISH_CONFIG = {
  // ---- 回答データ(CSV)を保存する「非公開」リポジトリ ----
  // 「あなたのユーザー名/リポジトリ名」の形式で指定
  dataRepo: "kotashan-m/bami-data",

  // CSVのファイル名とブランチ
  dataFile: "responses.csv",
  branch: "main",

  // ---- fine-grained パーソナルアクセストークン ----
  // 上記リポジトリのみ・権限は Contents: Read and write のみを付与したもの
  // 発行手順は README.md を参照
  token: "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",

  // 管理者ページを開くための簡易パスワード
  // ※ 静的サイトのため完全な保護ではありません(READMEの注意を読んでください)
  adminPassword: "aguri2026",

  // ---- 以下はアプリの基本設定(通常は変更不要) ----
  participants: ["てっこ", "しまたん", "ゆうや", "オルサ", "としき", "かずきち", "さよな"],
  options: ["0", "上1", "上2", "上3", "上4", "下1", "下2", "下3", "下4"],
  priorityMembers: ["しまたん", "オルサ", "てっこ", "ゆうや"],

  // スコアリング(判定基則)
  w1Score: 100,      // 第1希望
  w2Score: 50,       // 第2希望
  w3Score: 20,       // 第3希望
  badPenalty: 100000,   // 手に入れたくないものが割り当たった場合の減点
  priorityWeight: 10    // 優先度高モードでの優先メンバーの倍率
};
