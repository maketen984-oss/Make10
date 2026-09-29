/**
 * =====================================================================
 *  Make 10 (テンパズル) のプログラム
 *  高校生の人でも読めるように、各パートに説明コメントをつけています。
 *  上から順番に読んでいくと、ゲーム全体の流れがわかるようになっています。
 * =====================================================================
 */


/**
 * A. 効果音を鳴らすためのクラス
 * ------------------------------------------------------------
 * Web Audio API という「音を作る仕組み」を使って、
 * 音声ファイルを用意しなくても「ピコン」のような音を鳴らせるようにしている。
 */
class SoundFX {
    constructor() {
        this.ctx = null;       // 音を鳴らすための「音声コンテキスト」（最初は空っぽ）
        this.enabled = true;   // 効果音ON/OFFのスイッチ（trueなら鳴らす）
    }

    // 音声コンテキストの準備（ボタンなどが押された最初のタイミングで作る）
    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
    }

    // 指定した「音の高さ（freq）」「長さ（duration）」で音を1つ鳴らす関数
    playTone(freq, duration, type = 'sine', gainVal = 0.08) {
        if (!this.enabled) return; // OFFなら何もしない
        this.init();
        if (!this.ctx) return;
        try {
            const osc = this.ctx.createOscillator(); // 音の「発生源」
            const gain = this.ctx.createGain();       // 音の「大きさ」を調整する部品
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration); // だんだん音を小さくする
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) { /* 音が鳴らせない環境でもエラーで止まらないようにする */ }
    }

    // それぞれの場面で鳴らす音を、わかりやすい名前の関数にまとめている
    playSelect() { this.playTone(600, 0.06, 'sine', 0.06); }    // カードを選んだ時
    playOp() { this.playTone(450, 0.08, 'triangle', 0.08); }    // 演算子を選んだ時
    playMerge() { this.playTone(850, 0.1, 'sine', 0.1); }       // 数字を計算した時
    playUndo() { this.playTone(300, 0.08, 'sawtooth', 0.05); }  // 1手戻した時
    playSuccess() {                                              // 「10」が完成した時（3音のファンファーレ）
        if (!this.enabled) return;
        this.init();
        this.playTone(523.25, 0.1, 'sine', 0.1);
        setTimeout(() => this.playTone(659.25, 0.1, 'sine', 0.1), 80);
        setTimeout(() => this.playTone(783.99, 0.1, 'sine', 0.1), 160);
        setTimeout(() => this.playTone(1046.50, 0.3, 'sine', 0.12), 240);
    }
}

const sound = new SoundFX();


/**
 * B. クリア時の紙吹雪（Confetti）エフェクトを管理するクラス
 * ------------------------------------------------------------
 * 画面全体に敷いた <canvas> というお絵かき用の領域に、
 * 小さな四角（紙吹雪）をたくさん降らせるアニメーションを作っている。
 */
class ConfettiManager {
    constructor() {
        this.canvas = document.getElementById('confetti-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];   // 紙吹雪の粒（つぶ）を入れておく配列
        this.animating = false;
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    // 画面サイズが変わってもキャンバスがぴったり合うようにする
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    // 紙吹雪を画面中央から一気に飛び散らせる
    explode() {
        const colors = ['#38bdf8', '#818cf8', '#f43f5e', '#fbbf24', '#34d399', '#c084fc'];
        this.particles = [];
        for (let i = 0; i < 90; i++) {
            this.particles.push({
                x: this.canvas.width / 2,
                y: this.canvas.height / 2,
                vx: (Math.random() - 0.5) * 20,  // 横方向の速さ（ランダム）
                vy: (Math.random() - 0.7) * 20,  // 縦方向の速さ（ランダム）
                size: Math.random() * 8 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 0.2,
                life: 1 // 1→0に減っていき、0になったら消える
            });
        }
        if (!this.animating) {
            this.animating = true;
            this.loop();
        }
    }

    // 毎フレーム（パラパラ漫画のコマのように）粒の位置を更新して描き直す
    loop() {
        if (!this.animating) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        let alive = false;
        for (let p of this.particles) {
            if (p.life <= 0) continue;
            alive = true;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.4;        // 重力（だんだん下に落ちていく）
            p.life -= 0.018;    // 少しずつ薄くなって消える
            p.rotation += p.vRot;

            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation);
            this.ctx.fillStyle = p.color;
            this.ctx.globalAlpha = Math.max(0, p.life);
            this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            this.ctx.restore();
        }
        if (alive) {
            requestAnimationFrame(() => this.loop()); // 生きている粒があれば次のフレームへ
        } else {
            this.animating = false;
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
}

const confetti = new ConfettiManager();


/**
 * C. 「10パズル」を計算するエンジン（頭脳の部分）
 * ------------------------------------------------------------
 * 4つの数字と四則演算（＋－×÷）を組み合わせて「10」になる問題だけを
 * 出題できるように、あらかじめ答えがある組み合わせだけを集めておく。
 */
class Make10Engine {
    // 2つの数字(x, y)を演算子(op)で計算する、一番基本の計算関数
    static calc(x, op, y) {
        if (x === null || y === null) return null;
        if (op === '+') return x + y;
        if (op === '-') return x - y;
        if (op === '*') return x * y;
        if (op === '/') {
            if (Math.abs(y) <= 0.000001) return null; // 0で割り算はしない
            // ★追加: 割り切れない（答えが小数になる）場合は計算できないようにする
            if (Math.abs(x % y) > 0.000001) return null;
            return x / y;
        }
        return null;
    }

    // 4つの数字の「並び順」と「演算子の組み合わせ」を全部試して、
    // 答えが10になるものだけを集めて返す関数
    static findSolutions(digits) {
        const results = new Set(); // Setを使うと同じ答えが重複して入らない
        const ops = ['+', '-', '*', '/'];

        // 配列の並び替え（順列）を全部作る関数
        function permute(arr) {
            if (arr.length <= 1) return [arr];
            let res = [];
            for (let i = 0; i < arr.length; i++) {
                let cur = arr[i];
                let rem = arr.slice(0, i).concat(arr.slice(i + 1));
                for (let p of permute(rem)) res.push([cur].concat(p));
            }
            return res;
        }

        // 4つの数字の並び替え(a,b,c,e)ごとに、3つの演算子(op1,op2,op3)の
        // 全部の組み合わせを試して、計算の順番（カッコの付け方）も3パターン試す
        for (let d of permute(digits)) {
            const [a, b, c, e] = d;
            for (let op1 of ops) {
                for (let op2 of ops) {
                    for (let op3 of ops) {
                        // パターン1: ((a op1 b) op2 c) op3 e
                        const v1 = Make10Engine.calc(Make10Engine.calc(Make10Engine.calc(a, op1, b), op2, c), op3, e);
                        if (v1 !== null && Math.abs(v1 - 10) < 0.00001) {
                            results.add(`(( ${a} ${op1} ${b} ) ${op2} ${c}) ${op3} ${e}`.replace(/\*/g, '×').replace(/\//g, '÷'));
                        }
                        // パターン2: (a op1 (b op2 c)) op3 e
                        const v2 = Make10Engine.calc(Make10Engine.calc(a, op1, Make10Engine.calc(b, op2, c)), op3, e);
                        if (v2 !== null && Math.abs(v2 - 10) < 0.00001) {
                            results.add(`( ${a} ${op1} ( ${b} ${op2} ${c} )) ${op3} ${e}`.replace(/\*/g, '×').replace(/\//g, '÷'));
                        }
                        // パターン3: (a op1 b) op2 (c op3 e)
                        const v3 = Make10Engine.calc(Make10Engine.calc(a, op1, b), op2, Make10Engine.calc(c, op3, e));
                        if (v3 !== null && Math.abs(v3 - 10) < 0.00001) {
                            results.add(`( ${a} ${op1} ${b} ) ${op2} ( ${c} ${op3} ${e} )`.replace(/\*/g, '×').replace(/\//g, '÷'));
                        }
                    }
                }
            }
        }
        return Array.from(results);
    }

    // 0〜9の数字を4つ選ぶ組み合わせのうち、「10が作れるもの」だけを
    // あらかじめ全部探して pool（問題のストック）に貯めておく
    // ※この処理は少し時間がかかるので、ゲーム開始時に1回だけ実行する
    static initPool() {
        if (Make10Engine.pool && Make10Engine.pool.length > 0) return; // 2回計算しないようにする
        const pool = [];
        for (let a = 0; a <= 9; a++) {
            for (let b = a; b <= 9; b++) {
                for (let c = b; c <= 9; c++) {
                    for (let d = c; d <= 9; d++) {
                        const digits = [a, b, c, d];
                        const sols = Make10Engine.findSolutions(digits);
                        if (sols.length > 0) { // 答えが見つかった組み合わせだけ保存する
                            pool.push({ nums: digits, solutions: sols });
                        }
                    }
                }
            }
        }
        Make10Engine.pool = pool;
    }

    // 問題のストック(pool)からランダムに1問取り出す（数字はシャッフルして返す）
    static getRandomPuzzle() {
        Make10Engine.initPool();
        const p = Make10Engine.pool[Math.floor(Math.random() * Make10Engine.pool.length)];
        const shuffled = [...p.nums].sort(() => Math.random() - 0.5);
        return { nums: shuffled, solutions: p.solutions };
    }
}


/**
 * D. ★追加: 記録（累計正解数・タイムアタックの自己ベスト）を保存する仕組み
 * ------------------------------------------------------------
 * ブラウザには localStorage という「ページを閉じても消えないメモ帳」がある。
 * ここに数字を書き込んでおくことで、リロード（再読み込み）しても記録が消えなくなる。
 */
const StatsManager = {
    KEY_TOTAL: 'make10_totalCorrect',     // 累計正解数を保存するときの「名前」
    KEY_TA_BEST: 'make10_timeAttackBest', // タイムアタック自己ベストを保存するときの「名前」
    KEY_FASTEST: 'make10_fastestTime',    // 最速クリアタイムを保存するときの「名前」
    KEY_BEST_STREAK: 'make10_bestStreak', // 連続正解記録（コンボ）を保存するときの「名前」

    // 累計正解数を読み込む（まだ記録がなければ 0 を返す）
    getTotalCorrect() {
        const saved = localStorage.getItem(this.KEY_TOTAL);
        return saved ? parseInt(saved, 10) : 0;
    },

    // タイムアタックの自己ベストを読み込む（まだ記録がなければ 0 を返す）
    getTimeAttackBest() {
        const saved = localStorage.getItem(this.KEY_TA_BEST);
        return saved ? parseInt(saved, 10) : 0;
    },

    // 最速クリアタイム（秒）を読み込む（まだ記録がなければ null を返す）
    getFastestTime() {
        const saved = localStorage.getItem(this.KEY_FASTEST);
        return saved ? parseFloat(saved) : null;
    },

    // 連続正解記録（コンボ）の自己ベストを読み込む（まだ記録がなければ 0 を返す）
    getBestStreak() {
        const saved = localStorage.getItem(this.KEY_BEST_STREAK);
        return saved ? parseInt(saved, 10) : 0;
    },

    // 「10」が1問完成するたびに呼び出す。累計正解数を+1して保存する
    addCorrect() {
        const newTotal = this.getTotalCorrect() + 1;
        localStorage.setItem(this.KEY_TOTAL, String(newTotal));
        return newTotal;
    },

    // タイムアタックが終わったときに呼び出す。
    // 今回のスコアが自己ベストより高ければ、上書き保存して true を返す
    updateTimeAttackBest(score) {
        const best = this.getTimeAttackBest();
        if (score > best) {
            localStorage.setItem(this.KEY_TA_BEST, String(score));
            return true;  // 自己ベストを更新した
        }
        return false; // 更新はなかった
    },

    // 1問クリアするたびに呼び出す。かかった秒数(seconds)が今までより速ければ上書き保存して true を返す
    updateFastestTime(seconds) {
        const best = this.getFastestTime();
        if (best === null || seconds < best) {
            localStorage.setItem(this.KEY_FASTEST, String(seconds));
            return true; // 最速記録を更新した
        }
        return false;
    },

    // 連続正解数(streak)が今までの自己ベストより多ければ上書き保存して true を返す
    updateBestStreak(streak) {
        const best = this.getBestStreak();
        if (streak > best) {
            localStorage.setItem(this.KEY_BEST_STREAK, String(streak));
            return true; // コンボの自己ベストを更新した
        }
        return false;
    }
};


/**
 * E. ゲーム中の状態（変数）をまとめて管理する場所
 * ------------------------------------------------------------
 * バラバラの変数をあちこちに置くと分かりにくいので、
 * 1つの「GameState」というオブジェクトにまとめている。
 */
const GameState = {
    mode: 'endless', // 今のモード: 'endless'（エンドレス） または 'time'（タイムアタック）
    currentPuzzle: { nums: [], solutions: [] },

    cards: [],            // 今、盤面に並んでいる数字カードの配列
    history: [],          // 「1手戻す」機能のために、計算前の状態を記録しておく配列

    selectedCardIdx1: null, // 1枚目に選んだカードの位置（番号）
    selectedOp: null,       // 選んだ演算子 ('+', '-', '*', '/')

    score: 0,                 // 今のプレイでの正解数
    timerInterval: null,      // タイムアタックのタイマー（setIntervalのID）
    timeAttackRemaining: 60,  // タイムアタックの残り秒数
    isSolved: false,          // 今の問題が解けた直後かどうか

    puzzleStartTime: null,    // ★追加: 今の問題を出題した時刻（最速クリアタイムの計算に使う）
    currentStreak: 0          // ★追加: 今、何問連続で正解しているか（パスすると0に戻る）
};

/**
 * ★追加: 対戦モード（1つの端末を順番に渡してあそぶモード）専用の状態
 * ------------------------------------------------------------
 * GameStateとは別に、対戦モードだけで使う情報をここにまとめておく。
 */
const BattleState = {
    players: [],              // 参加者一覧。中身は {name: "名前", totalTime: 合計タイム(秒)} の形
    questionsPerPlayer: 5,    // 1人あたりの問題数（デフォルトは5問）
    currentPlayerIndex: 0,    // 今、何番目のプレイヤーの番か（0から数える）
    currentQuestionIndex: 0,  // 今のプレイヤーが何問目を解いているか（0から数える）
    turnStartTime: null,      // 今のプレイヤーのターンが始まった時刻
    timerInterval: null       // 経過時間の表示を更新するためのタイマー（setIntervalのID）
};

// よく使うHTML要素をあらかじめ変数に入れておく（毎回 document.getElementById() を書かなくて済むように）
const elCardsContainer = document.getElementById('cards-container');
const elInstruction = document.getElementById('instruction-label');
const elTimerBox = document.getElementById('timer-box');
const elTimerLabel = document.getElementById('timer-label'); // ★追加: 「残り時間:」⇔「経過時間:」を切り替えるため
const elTimerVal = document.getElementById('timer-val');
const elScoreLabel = document.getElementById('score-label'); // ★追加: 「正解数:」⇔「進捗:」を切り替えるため
const elScoreVal = document.getElementById('score-val');
const elNextBanner = document.getElementById('next-question-banner');

// ★追加: 対戦モードの「今誰の番か」バッジ
const elBattlePlayerBadge = document.getElementById('battle-player-badge');
const elBattlePlayerName = document.getElementById('battle-player-name');

// ★追加: 記録モーダル用の要素
const elStatTotalCorrect = document.getElementById('stat-total-correct');
const elStatTaBest = document.getElementById('stat-ta-best');
const elStatFastest = document.getElementById('stat-fastest-time');
const elStatBestStreak = document.getElementById('stat-best-streak');

// ★追加: タイムアタックの「スタート画面 & カウントダウン」用の要素
const elTaOverlay = document.getElementById('modal-timeattack-start');
const elTaStartView = document.getElementById('ta-start-view');
const elTaCountdownView = document.getElementById('ta-countdown-view');
const elTaCountdownNumber = document.getElementById('ta-countdown-number');
const elFinalBestMessage = document.getElementById('final-best-message');


/**
 * F. ページが読み込まれた時の初期化 & ボタンにイベント（クリック時の処理）を登録する
 */
window.onload = function () {
    Make10Engine.initPool(); // 問題のストックを先に作っておく
    setupEventListeners();
    switchMode('endless');   // 最初はエンドレスモードで始める
    toggleModal('modal-help', true); // ★追加: 開いたら最初に「あそびかた」を表示しておく
};

function setupEventListeners() {
    // モード切り替えタブ（エンドレス / タイムアタック / 対戦）
    document.getElementById('mode-endless').addEventListener('click', () => switchMode('endless'));
    document.getElementById('mode-time').addEventListener('click', () => switchMode('time'));
    document.getElementById('mode-battle').addEventListener('click', () => switchMode('battle')); // ★追加

    // 演算子ボタン（＋ － × ÷）
    document.querySelectorAll('.op-btn').forEach(btn => {
        btn.addEventListener('click', () => handleOpSelect(btn.dataset.op));
    });

    // 下部の操作ボタン（1手戻す / クリア / パス / ヒント）
    document.getElementById('btn-undo').addEventListener('click', handleUndo);
    document.getElementById('btn-reset-puzzle').addEventListener('click', handleResetPuzzle); // ★追加
    document.getElementById('btn-skip').addEventListener('click', () => {
        sound.playSelect();
        GameState.currentStreak = 0; // パスしたら連続正解記録はリセットされる
        elScoreVal.innerText = '0';  // ★追加: 画面に表示されている数字も0に戻す
        startNewPuzzle();
    });
    document.getElementById('btn-hint').addEventListener('click', (e) => showHintModal(e.currentTarget));

    // 正解した後の「次の問題へ進む」ボタン
    document.getElementById('btn-next-puzzle').addEventListener('click', () => {
        sound.playSelect();
        elNextBanner.classList.add('hidden');
        startNewPuzzle();
    });

    // ★追加: タイムアタックの「スタート」ボタン → カウントダウンを開始する
    document.getElementById('btn-ta-start').addEventListener('click', startTimeAttackCountdown);

    // ★追加: 右上の記録（トロフィー）ボタン → 記録モーダルを開く
    document.getElementById('stats-btn').addEventListener('click', (e) => openStatsModal(e.currentTarget));

    // ★追加: 対戦モード関連のボタン
    setupBattleEventListeners();

    // ルール説明モーダルの開閉
    document.getElementById('help-btn').addEventListener('click', (e) => toggleModal('modal-help', true, e.currentTarget));
    document.querySelectorAll('.close-modal').forEach(b => {
        b.addEventListener('click', () => {
            // ★変更: id が「modal-」で始まる要素すべてではなく、
            // ポップアップ共通の「app-modal」クラスが付いた要素だけを閉じるようにする
            // （タイムアタックのスタート画面は仕組みが違うので、間違って巻き込まないため）
            document.querySelectorAll('.app-modal').forEach(m => toggleModal(m.id, false));
        });
    });

    // 効果音ON/OFFの切り替え
    document.getElementById('sound-toggle-btn').addEventListener('click', () => {
        sound.enabled = !sound.enabled;
        const icon = document.getElementById('sound-icon');
        icon.className = sound.enabled ? "fas fa-volume-up text-lg text-cyan-400" : "fas fa-volume-mute text-lg text-slate-500";
    });

    // タイムアタックの「もう一度挑戦する」ボタン
    document.getElementById('ta-retry-btn').addEventListener('click', () => {
        toggleModal('modal-gameover', false);
        switchMode('time'); // もう一度、スタート画面から始める
    });
}

/**
 * ★追加: 対戦モードのボタンにイベントを登録する
 * setupEventListeners() が長くなりすぎないように、別の関数に分けている
 */
function setupBattleEventListeners() {
    // ニックネームの「追加」ボタンとEnterキー
    document.getElementById('btn-battle-add-player').addEventListener('click', addBattlePlayer);
    document.getElementById('battle-nickname-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addBattlePlayer();
    });

    // 1人あたりの問題数を選ぶボタン（3問 / 5問 / 10問）
    document.querySelectorAll('.battle-qcount-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            BattleState.questionsPerPlayer = parseInt(btn.dataset.count, 10);
            renderBattleQuestionCountButtons();
            sound.playSelect();
        });
    });

    // 「対戦開始」ボタン
    document.getElementById('btn-battle-start').addEventListener('click', () => {
        if (BattleState.players.length < 2) {
            alert('2人以上のニックネームを追加してください');
            return;
        }
        startBattle();
    });

    // 各プレイヤーの「スタート」ボタン → カウントダウンを開始する
    document.getElementById('btn-battle-turn-ready').addEventListener('click', startBattleCountdown);

    // 1人のターンが終わった後の「次の人へわたす」ボタン
    document.getElementById('btn-battle-turn-next').addEventListener('click', goToNextBattleTurnOrResults);

    // 最終結果画面の「もう一度対戦する」ボタン
    document.getElementById('btn-battle-again').addEventListener('click', () => {
        sound.playSelect();
        hideAllBattleScreens();
        showBattleSetupScreen(); // ニックネームは残っているので、そのまま再戦できる
    });
}


/**
 * G. ゲームモード（エンドレス / タイムアタック）の切り替え
 */
function switchMode(newMode) {
    sound.playSelect();
    GameState.mode = newMode;
    clearInterval(GameState.timerInterval);   // 前のタイマーが動いていたら止める
    clearInterval(BattleState.timerInterval); // ★追加: 対戦モードの経過時間タイマーも念のため止める
    GameState.score = 0;
    GameState.currentStreak = 0; // ★追加: モードを切り替えたら連続正解カウントも0から
    elScoreVal.innerText = '0';

    // ★追加: 他のモードで変えた表示ラベルを、通常の状態に戻しておく
    elScoreLabel.innerText = '連続正解数:';
    elTimerLabel.innerText = '残り時間:';
    elBattlePlayerBadge.classList.add('hidden');
    elBattlePlayerBadge.classList.remove('flex');
    elTaOverlay.classList.add('hidden');
    elTaOverlay.classList.remove('flex');
    hideAllBattleScreens();

    // タブの見た目（色）を切り替える
    const tabs = {
        endless: document.getElementById('mode-endless'),
        time: document.getElementById('mode-time'),
        battle: document.getElementById('mode-battle')
    };
    const activeClass = "mode-tab py-2.5 px-2 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all bg-gradient-to-r from-cyan-500 to-indigo-500 text-white shadow-lg shadow-cyan-500/20";
    const inactiveClass = "mode-tab py-2.5 px-2 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all text-slate-300 hover:text-white hover:bg-white/5";
    Object.keys(tabs).forEach(key => {
        tabs[key].className = (key === newMode) ? activeClass : inactiveClass;
    });

    // ★追加: ヒントボタンは「エンドレスモード」の時だけ表示する
    // （タイムアタック・対戦モードはタイムを競うモードなので、ヒントは使えないようにする）
    document.getElementById('btn-hint').classList.toggle('hidden', newMode !== 'endless');

    if (newMode === 'endless') {
        elTimerBox.classList.add('hidden');
        startNewPuzzle();
    } else if (newMode === 'time') {
        elTimerBox.classList.remove('hidden');
        // すぐにタイマーを始めず、まず「スタート画面」を見せる
        showTimeAttackStartScreen();
    } else if (newMode === 'battle') {
        // ★追加: 対戦モードは、まず参加者を登録する画面を見せる
        elTimerBox.classList.add('hidden');
        elCardsContainer.innerHTML = '';
        showBattleSetupScreen();
    }
}

// 新しい問題を読み込んで盤面をリセットする
function startNewPuzzle() {
    GameState.isSolved = false;
    GameState.currentPuzzle = Make10Engine.getRandomPuzzle();
    GameState.cards = [...GameState.currentPuzzle.nums];
    GameState.history = [];
    GameState.puzzleStartTime = Date.now(); // ★追加: 「今、何時何分何秒か」を記録しておく（クリアタイム計測用）
    resetSelections();
    elNextBanner.classList.add('hidden');
    renderCards();
}


/**
 * ★追加: 「3・2・1」とカウントダウンする共通の関数
 * ------------------------------------------------------------
 * タイムアタックと対戦モードの両方で同じカウントダウンを使うので、
 * 1つの関数にまとめておくことで、同じコードを2回書かずに済むようにしている。
 *
 * numberEl: カウントダウンの数字を表示するHTML要素
 * onDone:   カウントダウンが0になったときに実行する関数
 */
function runCountdown(numberEl, onDone) {
    let count = 3;
    numberEl.innerText = count;

    // setIntervalで1秒ごとに数字を1つずつ減らしていく
    const countdownTimer = setInterval(() => {
        count--;

        if (count > 0) {
            // 数字を表示し直して、ポンと出るアニメーションをもう一度再生する
            numberEl.innerText = count;
            numberEl.classList.remove('countdown-pop');
            void numberEl.offsetWidth; // ★アニメーションを最初からやり直させるためのおまじない
            numberEl.classList.add('countdown-pop');
            sound.playOp();
        } else {
            // 0になったらカウントダウン終了！ 渡された処理を実行する
            clearInterval(countdownTimer);
            sound.playMerge();
            onDone();
        }
    }, 1000);
}


/**
 * ★追加: タイムアタックの「スタート画面」と「3秒カウントダウン」の処理
 * ------------------------------------------------------------
 * 流れ: タブを押す → スタート画面を表示 → 「スタート」ボタンを押す
 *      → 3,2,1のカウントダウン → 60秒タイマー開始
 */

// スタート画面（説明とスタートボタン）を表示する
function showTimeAttackStartScreen() {
    elCardsContainer.innerHTML = ''; // カードはまだ出さない（スタート前なので）
    elTaStartView.classList.remove('hidden');
    elTaCountdownView.classList.add('hidden');
    elTaOverlay.classList.remove('hidden');
    elTaOverlay.classList.add('flex');
}

// 「スタート」ボタンが押された時に呼ばれる：3→2→1とカウントダウンしてからタイムアタックを始める
function startTimeAttackCountdown() {
    sound.playSelect();
    elTaStartView.classList.add('hidden');
    elTaCountdownView.classList.remove('hidden');
    elTaCountdownView.classList.add('flex');

    runCountdown(elTaCountdownNumber, () => {
        // カウントダウン終了！ オーバーレイを消してゲームスタート
        elTaOverlay.classList.add('hidden');
        elTaOverlay.classList.remove('flex');
        startTimeAttack();
    });
}

// タイムアタックの60秒タイマーをスタートする（実際にゲームが始まる部分）
function startTimeAttack() {
    GameState.timeAttackRemaining = 60;
    elTimerVal.innerText = '60s';
    startNewPuzzle();

    GameState.timerInterval = setInterval(() => {
        GameState.timeAttackRemaining--;
        elTimerVal.innerText = `${GameState.timeAttackRemaining}s`;

        if (GameState.timeAttackRemaining <= 0) {
            clearInterval(GameState.timerInterval);
            document.getElementById('final-score').innerText = GameState.score;

            // ★追加: 自己ベストを更新したかチェックして、結果画面にメッセージを出す
            const isNewBest = StatsManager.updateTimeAttackBest(GameState.score);
            if (isNewBest && GameState.score > 0) {
                elFinalBestMessage.innerText = '🎉 自己ベストを更新しました！';
            } else {
                elFinalBestMessage.innerText = `自己ベスト: ${StatsManager.getTimeAttackBest()}問`;
            }

            toggleModal('modal-gameover', true, elTimerBox); // ★追加: タイマー表示の位置から出てくるようにする
        }
    }, 1000);
}


/**
 * ★追加: 対戦モード（1つの端末を順番に渡してあそぶモード）の処理
 * ------------------------------------------------------------
 * 流れ:
 *   (1) ニックネームを登録し、1人あたりの問題数を決める
 *   (2) 「◯◯さんの番です」→3,2,1カウントダウン
 *   (3) 決められた問題数を解く（かかった時間を計測する）
 *   (4) 結果画面 →（まだ他のプレイヤーがいれば(2)に戻る）
 *   (5) 全員終わったら、合計タイムが一番小さい人が優勝というランキングを表示する
 */

// 対戦モードの画面（4種類）を全部隠す。モードを切り替えた時などに呼ぶ
function hideAllBattleScreens() {
    ['battle-setup-screen', 'battle-turn-start-screen', 'battle-turn-result-screen', 'battle-final-results-screen'].forEach(id => {
        const el = document.getElementById(id);
        el.classList.add('hidden');
        el.classList.remove('flex');
    });
}

// (1) ニックネーム登録画面を表示する
function showBattleSetupScreen() {
    renderBattlePlayersList();
    renderBattleQuestionCountButtons();
    const overlay = document.getElementById('battle-setup-screen');
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
}

// ニックネームを1人分、参加者リストに追加する
function addBattlePlayer() {
    const input = document.getElementById('battle-nickname-input');
    const name = input.value.trim();
    if (name === '') return; // 空っぽなら何もしない

    if (BattleState.players.length >= 8) {
        alert('参加人数は8人までです');
        return;
    }

    BattleState.players.push({ name: name, totalTime: 0 });
    input.value = '';
    renderBattlePlayersList();
    sound.playSelect();
}

// 参加者リストから1人削除する
function removeBattlePlayer(idx) {
    BattleState.players.splice(idx, 1);
    renderBattlePlayersList();
    sound.playSelect();
}

// HTMLに文字を差し込んでも安全なように、危険な記号を無害な文字に変換する
// （ニックネームに <script> のような文字が入っても悪さをしないようにするための対策）
function escapeHtml(str) {
    const div = document.createElement('div');
    div.innerText = str;
    return div.innerHTML;
}

// 参加者リストのHTMLを描き直す
function renderBattlePlayersList() {
    const list = document.getElementById('battle-players-list');
    list.innerHTML = '';
    BattleState.players.forEach((p, idx) => {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-700/60';
        item.innerHTML = `<span class="text-sm font-bold text-slate-200">${idx + 1}. ${escapeHtml(p.name)}</span>`;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'text-slate-500 hover:text-rose-400 px-2';
        removeBtn.innerHTML = '<i class="fas fa-xmark"></i>';
        removeBtn.addEventListener('click', () => removeBattlePlayer(idx));

        item.appendChild(removeBtn);
        list.appendChild(item);
    });
    document.getElementById('battle-player-count').innerText = BattleState.players.length;
}

// 「1人あたりの問題数」ボタンの見た目を、今選ばれている問題数に合わせて更新する
function renderBattleQuestionCountButtons() {
    const activeClass = "battle-qcount-btn px-4 py-2 rounded-xl text-sm font-bold transition-all bg-gradient-to-r from-cyan-500 to-indigo-500 text-white shadow-md";
    const inactiveClass = "battle-qcount-btn px-4 py-2 rounded-xl text-sm font-bold transition-all bg-slate-800/80 text-slate-300 hover:bg-slate-700/80";
    document.querySelectorAll('.battle-qcount-btn').forEach(btn => {
        const isSelected = parseInt(btn.dataset.count, 10) === BattleState.questionsPerPlayer;
        btn.className = isSelected ? activeClass : inactiveClass;
    });
}

// 「対戦開始」ボタンが押された時の処理
function startBattle() {
    BattleState.players.forEach(p => p.totalTime = 0); // タイムをリセット（再戦の場合のため）
    BattleState.currentPlayerIndex = 0;

    hideAllBattleScreens();
    showBattleTurnStartScreen();
}

// (2) 「◯◯さんの番です」という、端末を渡すための画面を表示する
function showBattleTurnStartScreen() {
    const player = BattleState.players[BattleState.currentPlayerIndex];
    document.getElementById('battle-turn-start-name').innerText = player.name;

    document.getElementById('battle-ready-view').classList.remove('hidden');
    document.getElementById('battle-countdown-view').classList.add('hidden');

    const overlay = document.getElementById('battle-turn-start-screen');
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
}

// 各プレイヤーの「スタート」ボタンが押された時：3,2,1とカウントダウンしてからそのプレイヤーのターンを始める
function startBattleCountdown() {
    sound.playSelect();
    document.getElementById('battle-ready-view').classList.add('hidden');
    const countdownView = document.getElementById('battle-countdown-view');
    countdownView.classList.remove('hidden');
    countdownView.classList.add('flex');

    const countdownNumber = document.getElementById('battle-countdown-number');
    runCountdown(countdownNumber, () => {
        const overlay = document.getElementById('battle-turn-start-screen');
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
        beginBattleTurn();
    });
}

// (3) 実際にそのプレイヤーの問題を出題し始める
function beginBattleTurn() {
    BattleState.currentQuestionIndex = 0;
    BattleState.turnStartTime = Date.now(); // 今の時刻を「スタート時刻」として覚えておく

    // 経過時間を0.1秒ごとに画面へ表示し続ける
    BattleState.timerInterval = setInterval(updateBattleTimerDisplay, 100);

    elTimerBox.classList.remove('hidden');
    elBattlePlayerBadge.classList.remove('hidden');
    elBattlePlayerBadge.classList.add('flex');
    elBattlePlayerName.innerText = BattleState.players[BattleState.currentPlayerIndex].name;

    loadBattlePuzzle();
}

// ★変更: 対戦モード用に、新しい問題をランダムに出題する（プレイヤーごとに問題は変わる。全員共通ではない）
function loadBattlePuzzle() {
    GameState.isSolved = false;
    GameState.currentPuzzle = Make10Engine.getRandomPuzzle();
    GameState.cards = [...GameState.currentPuzzle.nums];
    GameState.history = [];
    resetSelections();
    renderCards();
    updateBattleHud(); // 「進捗:」「経過時間:」の表示を更新する
}

// 対戦モード中は、スコア表示欄を「進捗（何問目/全部で何問）」の表示として使う
function updateBattleHud() {
    elTimerLabel.innerText = '経過時間:';
    elScoreLabel.innerText = '進捗:';
    elScoreVal.innerText = `${BattleState.currentQuestionIndex + 1}/${BattleState.questionsPerPlayer}`;
}

// 経過時間の表示（0.1秒ごとに呼ばれる）
function updateBattleTimerDisplay() {
    if (!BattleState.turnStartTime) return;
    const elapsed = (Date.now() - BattleState.turnStartTime) / 1000;
    elTimerVal.innerText = `${elapsed.toFixed(1)}s`;
}

// 対戦モードで1問正解した時に呼ばれる（checkVictory()から呼び出される）
function handleBattlePuzzleCleared() {
    BattleState.currentQuestionIndex++;

    if (BattleState.currentQuestionIndex < BattleState.questionsPerPlayer) {
        // まだ問題が残っているので、少し待ってから次の問題を出す
        setTimeout(() => {
            loadBattlePuzzle();
        }, 500);
    } else {
        // 全部解き終わった！ このプレイヤーの合計タイムを記録する
        clearInterval(BattleState.timerInterval);
        const elapsed = (Date.now() - BattleState.turnStartTime) / 1000;
        BattleState.players[BattleState.currentPlayerIndex].totalTime = Math.round(elapsed * 10) / 10;
        showBattleTurnResultScreen();
    }
}

// (4) 1人のターンが終わった時の結果画面を表示する
function showBattleTurnResultScreen() {
    const player = BattleState.players[BattleState.currentPlayerIndex];
    document.getElementById('battle-result-name').innerText = player.name;
    document.getElementById('battle-result-time').innerText = `${player.totalTime}秒`;

    const isLastPlayer = BattleState.currentPlayerIndex === BattleState.players.length - 1;
    document.getElementById('btn-battle-turn-next').innerText = isLastPlayer ? '結果を見る' : '次の人へわたす';

    elBattlePlayerBadge.classList.add('hidden');
    elBattlePlayerBadge.classList.remove('flex');
    elTimerBox.classList.add('hidden');

    const overlay = document.getElementById('battle-turn-result-screen');
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
}

// 「次の人へわたす」または「結果を見る」ボタンが押された時の処理
function goToNextBattleTurnOrResults() {
    sound.playSelect();
    document.getElementById('battle-turn-result-screen').classList.add('hidden');
    document.getElementById('battle-turn-result-screen').classList.remove('flex');

    const isLastPlayer = BattleState.currentPlayerIndex === BattleState.players.length - 1;
    if (isLastPlayer) {
        showBattleFinalResults();
    } else {
        BattleState.currentPlayerIndex++;
        showBattleTurnStartScreen();
    }
}

// (5) 全員終わった後の、ランキング画面を表示する
function showBattleFinalResults() {
    // タイムが小さい順（速い順）に並べ替える。元の配列は変えたくないのでコピーしてから並べ替える
    const ranking = [...BattleState.players].sort((a, b) => a.totalTime - b.totalTime);

    const list = document.getElementById('battle-ranking-list');
    list.innerHTML = '';
    ranking.forEach((p, idx) => {
        const rank = idx + 1;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}位`;
        const isFirst = rank === 1;

        const row = document.createElement('div');
        row.className = `flex items-center justify-between px-4 py-3 rounded-xl border ${isFirst ? 'bg-amber-500/15 border-amber-400/40' : 'bg-slate-900/60 border-slate-700/60'}`;
        row.innerHTML = `
            <span class="font-bold text-slate-100 flex items-center gap-2">
                <span class="text-lg">${medal}</span> ${escapeHtml(p.name)}
            </span>
            <span class="font-black font-outfit text-cyan-300">${p.totalTime}秒</span>
        `;
        list.appendChild(row);
    });

    const overlay = document.getElementById('battle-final-results-screen');
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');
}


/**
 * H. ★追加: 記録（累計正解数・自己ベスト）モーダルの表示
 */
function openStatsModal(originButton) {
    sound.playSelect();
    elStatTotalCorrect.innerText = StatsManager.getTotalCorrect();
    elStatTaBest.innerText = StatsManager.getTimeAttackBest();

    // ★追加: 最速クリアタイムの表示（まだ記録がなければ「--」と表示する）
    const fastest = StatsManager.getFastestTime();
    elStatFastest.innerText = fastest !== null ? `${fastest}秒` : '--';

    // ★追加: 連続正解記録（コンボ）の表示
    elStatBestStreak.innerText = StatsManager.getBestStreak();

    toggleModal('modal-stats', true, originButton);
}


/**
 * I. カード操作・計算まわりのコアインタラクション
 */

// 選択状態のリセット（カード1枚目・演算子の選択をなかったことにする）
function resetSelections() {
    GameState.selectedCardIdx1 = null;
    GameState.selectedOp = null;
    document.querySelectorAll('.op-btn').forEach(b => b.classList.remove('selected'));
    updateInstruction();
}

// 「次に何をすればいいか」を伝えるガイド文章を更新する
function updateInstruction() {
    if (!elInstruction) return; // 要素が見つからない場合の安全対策

    if (GameState.selectedCardIdx1 === null) {
        // 「① まとめたい数字を選択」
        elInstruction.innerText = "① 合体させたい数字を選択";
    } else if (GameState.selectedOp === null) {
        // 「② 演算子（＋ － × ÷）を選択」
        elInstruction.innerText = "② 演算子（＋ － × ÷）を選択";
    } else {
        // 「③ 計算相手の数字を選択」
        elInstruction.innerText = "③ 計算相手の数字を選択";
    }
}

// 盤面の数字カードを描き直す
function renderCards() {
    elCardsContainer.innerHTML = '';
    GameState.cards.forEach((val, idx) => {
        const card = document.createElement('button');

        // 数値の表示形式（小数が出た場合は小数点2桁までにする）
        const displayVal = Number.isInteger(val) ? val : parseFloat(val.toFixed(2));

        // ★変更: 大きさの単位をpx(絶対サイズ)からrem(画面サイズに応じて伸び縮みする単位)に変更した
        card.className = `num-card min-w-[4.4rem] sm:min-w-[5.3rem] h-[5rem] sm:h-[6.25rem] px-3 bg-gradient-to-br from-slate-800 to-slate-900/90 border border-slate-700/80 text-cyan-300 rounded-2xl text-2xl sm:text-3xl font-black font-outfit flex items-center justify-center cursor-pointer shadow-lg active:scale-95 transition-all`;
        card.innerText = displayVal;

        // 選択中のカードをハイライトする
        if (GameState.selectedCardIdx1 === idx) {
            card.classList.add('selected');
        }

        // 10が完成した時の強調表示
        if (GameState.cards.length === 1 && Math.abs(val - 10) < 0.0001) {
            card.classList.add('cleared');
        }

        card.addEventListener('click', () => handleCardClick(idx));
        elCardsContainer.appendChild(card);
    });
    updateInstruction();
}

// 数字カードをタップした時の処理
function handleCardClick(idx) {
    if (GameState.isSolved) return;

    // 1枚目のカードを選ぶ
    if (GameState.selectedCardIdx1 === null) {
        sound.playSelect();
        GameState.selectedCardIdx1 = idx;
        renderCards();
        return;
    }

    // 同じカードをもう一度タップしたら選択を解除する
    if (GameState.selectedCardIdx1 === idx && GameState.selectedOp === null) {
        sound.playSelect();
        resetSelections();
        renderCards();
        return;
    }

    // 演算子を選ぶ前に別のカードをタップした場合は、1枚目の選択を変更する
    if (GameState.selectedOp === null) {
        sound.playSelect();
        GameState.selectedCardIdx1 = idx;
        renderCards();
        return;
    }

    // 2枚目のカードが選ばれたので、計算を実行する
    const idx1 = GameState.selectedCardIdx1;
    const idx2 = idx;
    if (idx1 === idx2) return; // 同じカード同士は計算できない

    const val1 = GameState.cards[idx1];
    const val2 = GameState.cards[idx2];
    const op = GameState.selectedOp;

    // 0で割り算しようとした場合はエラーメッセージを出す
    if (op === '/' && Math.abs(val2) < 0.000001) {
        alert('0で割ることはできません！');
        resetSelections();
        renderCards();
        return;
    }

    // ★追加: 割り切れない（答えが小数になる）割り算をしようとした場合もエラーメッセージを出す
    if (op === '/' && Math.abs(val1 % val2) > 0.000001) {
        alert('割り切れない計算はできません！');
        resetSelections();
        renderCards();
        return;
    }

    // 計算を実行
    const res = Make10Engine.calc(val1, op, val2);
    if (res === null) return;

    // 「1手戻す」のために、計算前の状態を保存しておく
    GameState.history.push([...GameState.cards]);

    // 使った2枚のカードを取り除き、計算結果を新しい1枚のカードにする
    const newCards = [];
    GameState.cards.forEach((v, i) => {
        if (i !== idx1 && i !== idx2) {
            newCards.push(v);
        }
    });
    newCards.push(res);
    GameState.cards = newCards;

    sound.playMerge();
    resetSelections();
    renderCards();

    // 残りカードが1枚で、それが10ならクリア判定！
    checkVictory();
}

// 演算子ボタンをタップした時の処理
function handleOpSelect(opVal) {
    if (GameState.isSolved) return;
    if (GameState.selectedCardIdx1 === null) return; // 1枚目のカードが未選択なら無効

    sound.playOp();
    GameState.selectedOp = opVal;

    document.querySelectorAll('.op-btn').forEach(b => {
        if (b.dataset.op === opVal) {
            b.classList.add('selected');
        } else {
            b.classList.remove('selected');
        }
    });
    updateInstruction();
}

// 「1手戻す」機能
function handleUndo() {
    if (GameState.history.length === 0 || GameState.isSolved) return;
    sound.playUndo();
    GameState.cards = GameState.history.pop();
    resetSelections();
    renderCards();
}

// ★追加: 「クリア」ボタン ― 1手戻すのではなく、今の問題を出題された時の状態まで一気に戻す
function handleResetPuzzle() {
    if (GameState.isSolved) return;
    sound.playUndo();
    GameState.cards = [...GameState.currentPuzzle.nums]; // 最初に出題された数字に戻す
    GameState.history = []; // 「1手戻す」の記録も空にする
    resetSelections();
    renderCards();
}

// クリア判定（数字が「10」1枚になったか調べる）
function checkVictory() {
    if (GameState.cards.length === 1 && Math.abs(GameState.cards[0] - 10) < 0.0001) {
        GameState.isSolved = true;
        sound.playSuccess();
        confetti.explode();

        // ★追加: 対戦モードの時は、スコアや記録の代わりに「次の問題 or 結果画面」の処理をする
        if (GameState.mode === 'battle') {
            handleBattlePuzzleCleared();
            return;
        }

        GameState.score++; // タイムアタック終了時の「今回の正解数」用のカウント（連続でなくてもよい）

        // ★追加: 累計正解数を+1して保存する（モードに関係なく記録する）
        StatsManager.addCorrect();

        // ★追加: この1問にかかった秒数を計算して、最速記録より速ければ保存する
        const elapsedSeconds = (Date.now() - GameState.puzzleStartTime) / 1000;
        StatsManager.updateFastestTime(Math.round(elapsedSeconds * 10) / 10); // 小数点1桁に丸める

        // ★変更: 連続正解記録（コンボ）を1つ増やして、自己ベストより多ければ保存する
        // 画面に表示する数字も、こちらの「連続正解数」の方を使うようにする
        GameState.currentStreak++;
        elScoreVal.innerText = GameState.currentStreak;
        StatsManager.updateBestStreak(GameState.currentStreak);

        setTimeout(() => {
            elNextBanner.classList.remove('hidden');
        }, 400);
    }
}

// ヒントモーダルの表示
function showHintModal(originButton) {
    if (GameState.mode !== 'endless') return; // ★追加: ヒントはエンドレスモード専用の機能にする
    sound.playSelect();
    const container = document.getElementById('hint-content');
    const sols = GameState.currentPuzzle.solutions;
    if (sols && sols.length > 0) {
        container.innerText = `${sols[0]} = 10`;
    } else {
        container.innerText = "ヒントを取得できませんでした";
    }
    toggleModal('modal-hint', true, originButton);
}

// モーダルの開閉を切り替える共通関数
/**
 * ★変更: モーダル（ポップアップ画面）の開閉を、ただの表示/非表示ではなく
 * 「右上のボタンに向かって縮んでいく」アニメーションにする関数
 * ------------------------------------------------------------
 * 使っている仕組み：
 *  ・CSSで transform-origin（拡大縮小の中心点）を右上に指定しておく(originクラス)
 *  ・「閉じている状態」は scale-0(大きさ0) + opacity-0(透明)
 *  ・「開いている状態」は scale-100(等倍) + opacity-100(不透明)
 *  ・この2つの状態をtransitionで滑らかに切り替えることで、
 *    ウィンドウの最小化のように「吸い込まれていく」動きに見える
 */
/**
 * ★変更: モーダル（ポップアップ画面）の開閉を、押したボタンの位置に向かって
 * 大きくなったり小さくなったりするアニメーションにする関数
 * ------------------------------------------------------------
 * originButton（開くきっかけになったボタン）を渡すと、そのボタンの真ん中の座標を計算して
 * transform-origin（拡大縮小の中心点）に設定する。これにより「そのボタンから生まれて、
 * そのボタンに戻っていく」ような、ウィンドウの最小化に似た動きになる。
 * 閉じるとき（show=false）はoriginButtonを渡さなくてよい。開いた時の中心点がそのまま
 * 残っているので、自動的に同じ場所へ向かって閉じていく。
 */
function toggleModal(id, show, originButton) {
    const m = document.getElementById(id);

    if (originButton) {
        // ボタンの画面上の位置（真ん中の座標）を取得する
        const rect = originButton.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        m.style.transformOrigin = `${centerX}px ${centerY}px`;
    }

    if (show) {
        m.classList.remove('invisible', 'opacity-0', 'scale-0');
        m.classList.add('visible', 'opacity-100', 'scale-100');
    } else {
        m.classList.remove('visible', 'opacity-100', 'scale-100');
        m.classList.add('invisible', 'opacity-0', 'scale-0');
    }
}
