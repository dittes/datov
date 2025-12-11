(() => {
  const boardEl = document.getElementById('board');
  const statusEl = document.getElementById('status');
  const historyEl = document.getElementById('history');
  const micBtn = document.getElementById('mic-btn');
  const voiceStatus = document.getElementById('voice-status');
  const voiceText = document.getElementById('voice-text');
  const confirmBox = document.getElementById('confirm-box');
  const confirmMoveText = document.getElementById('confirm-move');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayText = document.getElementById('overlay-text');
  const overlayBtn = document.getElementById('overlay-btn');
  const modeSelect = document.getElementById('mode');
  const depthRange = document.getElementById('depth');
  const depthLabel = document.getElementById('depth-label');
  const themeSelect = document.getElementById('theme');
  const languageSelect = document.getElementById('language');
  const modeBadge = document.getElementById('mode-label');
  const promotionBox = document.getElementById('promotion');
  const toast = document.getElementById('toast');

  const startFEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const pieceIcons = {
    'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚',
    'P': '♙', 'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔'
  };

  const pieceValues = { p:100, n:320, b:330, r:500, q:900, k:20000 };
  const pst = {
    p:[0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,50,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,5,10,10,-20,-20,10,10,5,0,0,0,0,0,0,0,0],
    n:[-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,0,0,0,-20,-40,-30,0,10,15,15,10,0,-30,-30,5,15,20,20,15,5,-30,-30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,-40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50],
    b:[-20,-10,-10,-10,-10,-10,-10,-20,-10,5,0,0,0,0,5,-10,-10,10,10,10,10,10,10,-10,-10,0,10,10,10,10,0,-10,-10,5,5,10,10,5,5,-10,-10,0,5,10,10,5,0,-10,-10,0,0,0,0,0,0,-10,-20,-10,-10,-10,-10,-10,-10,-20],
    r:[0,0,0,0,0,0,0,0,5,10,10,10,10,10,10,5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,5,10,10,10,10,10,10,5],
    q:[-20,-10,-10,-5,-5,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,5,5,5,0,-10,-5,0,5,5,5,5,0,-5,0,0,5,5,5,5,0,-5,-10,5,5,5,5,5,0,-10,-10,0,5,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20],
    k:[-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,20,20,0,0,0,0,20,20,20,30,10,0,0,10,30,20]
  };

  let board = Array(64).fill(null);
  let turn = 'w';
  let castling = { w: {k:true, q:true}, b:{k:true,q:true} };
  let enPassant = -1;
  let halfmoveClock = 0;
  let fullmoveNumber = 1;
  let history = [];
  let selected = null;
  let legalMoves = [];
  let lastMove = null;
  let recognition = null;
  let currentMode = 'hvc';
  let engineDepth = 2;
  let language = 'en';
  let theme = 'dark';
  let pendingPromotion = null;

  const dirs = {
    n: [-17,-15,-10,-6,6,10,15,17],
    b: [-9,-7,7,9],
    r: [-8,-1,1,8],
    q: [-9,-8,-7,-1,1,7,8,9],
  };

  function idxToCoord(i){ return ['a','b','c','d','e','f','g','h'][i%8] + (8-Math.floor(i/8)); }
  function coordToIdx(c){ const file = c.charCodeAt(0)-97; const rank = 8-parseInt(c[1]); return rank*8+file; }

  function parseFEN(fen){
    const parts = fen.split(' ');
    const rows = parts[0].split('/');
    board = [];
    rows.forEach(r=>{
      for(const ch of r){
        if(!isNaN(ch)) board.push(...Array(parseInt(ch)).fill(null));
        else board.push(ch);
      }
    });
    turn = parts[1];
    castling = {w:{k:false,q:false}, b:{k:false,q:false}};
    if(parts[2].includes('K')) castling.w.k=true;
    if(parts[2].includes('Q')) castling.w.q=true;
    if(parts[2].includes('k')) castling.b.k=true;
    if(parts[2].includes('q')) castling.b.q=true;
    enPassant = parts[3]==='-'?-1:coordToIdx(parts[3]);
    halfmoveClock = parseInt(parts[4]);
    fullmoveNumber = parseInt(parts[5]);
  }

  function renderBoard(){
    boardEl.innerHTML = '';
    for(let i=0;i<64;i++){
      const square = document.createElement('div');
      square.className = 'square '+(((Math.floor(i/8)+i)%2===0)?'light':'dark');
      square.dataset.index = i;
      const piece = board[i];
      if(piece){
        const span = document.createElement('span');
        span.textContent = pieceIcons[piece];
        span.className = 'piece';
        square.appendChild(span);
      }
      square.addEventListener('click', () => onSquareClick(i));
      boardEl.appendChild(square);
    }
    highlightState();
  }

  function highlightState(){
    document.querySelectorAll('.square').forEach(el=>{
      el.classList.remove('move-hint','capture-hint','last-move','check');
    });
    if(selected!==null){
      legalMoves.filter(m=>m.from===selected).forEach(m=>{
        const el = boardEl.children[m.to];
        el.classList.add(m.captured? 'capture-hint':'move-hint');
      });
    }
    if(lastMove){
      boardEl.children[lastMove.from].classList.add('last-move');
      boardEl.children[lastMove.to].classList.add('last-move');
    }
    const kingIdx = board.findIndex(p=>p===(turn==='w'?'K':'k'));
    if(kingIdx>=0 && isSquareAttacked(kingIdx, turn==='w'?'b':'w')){
      boardEl.children[kingIdx].classList.add('check');
    }
  }

  function onSquareClick(i){
    if(pendingPromotion) return;
    const piece = board[i];
    if(selected===null){
      if(piece && isWhite(piece) === (turn==='w')){
        selected = i;
        legalMoves = generateLegalMoves(turn);
      }
    } else {
      const move = legalMoves.find(m=>m.from===selected && m.to===i);
      if(move){
        handleMove(move);
      }
      selected = null;
    }
    renderBoard();
  }

  function isWhite(p){ return p && p === p.toUpperCase(); }
  function isOpponent(p, color){ if(!p) return false; return color==='w'?p===p.toLowerCase():p===p.toUpperCase(); }

  function generatePseudoMoves(color, forAttack=false){
    const moves = [];
    for(let i=0;i<64;i++){
      const piece = board[i];
      if(!piece) continue;
      const isW = isWhite(piece);
      if((color==='w')!==isW) continue;
      const type = piece.toLowerCase();
      if(type==='p') pawnMoves(i, isW, moves);
      else if(type==='n') knightMoves(i, isW, moves);
      else if(type==='b') stepMoves(i, dirs.b, 7, isW, moves);
      else if(type==='r') stepMoves(i, dirs.r, 7, isW, moves);
      else if(type==='q') stepMoves(i, dirs.q, 7, isW, moves);
      else if(type==='k') kingMoves(i, isW, moves, forAttack);
    }
    return moves;
  }

  function knightMoves(i, isW, moves){
    for(const d of dirs.n){
      const to = i + d;
      if(to<0 || to>63) continue;
      const fileDiff = Math.abs((to%8)-(i%8));
      const rankDiff = Math.abs(Math.floor(to/8)-Math.floor(i/8));
      if(!((fileDiff===1 && rankDiff===2) || (fileDiff===2 && rankDiff===1))) continue;
      const target = board[to];
      if(target && isWhite(target)===isW) continue;
      moves.push({from:i,to,piece:board[i], captured: target||null});
    }
  }

  function pawnMoves(i, isW, moves){
    const dir = isW? -8: 8;
    const startRank = isW?6:1;
    const to = i + dir;
    if(to>=0 && to<64 && !board[to]){
      addPawnMove(i, to, isW, moves);
      if(Math.floor(i/8)===startRank && !board[i+2*dir]) addPawnMove(i, i+2*dir, isW, moves);
    }
    for(const dx of [-1,1]){
      const t = i + dir + dx;
      if(t<0||t>63) continue;
      if(Math.abs((i%8)-((t)%8))!==1) continue;
      const target = board[t];
      if(target && isWhite(target)!==isW) addPawnMove(i, t, isW, moves, target);
      if(t===enPassant) addPawnMove(i, t, isW, moves, board[isW? t+8 : t-8], true);
    }
  }

  function addPawnMove(from, to, isW, moves, captured=null, enPassantCapture=false){
    const rank = Math.floor(to/8);
    const promotionRanks = isW?0:7;
    if(rank===promotionRanks){
      ['q','r','b','n'].forEach(p=>{
        moves.push({from,to,piece: board[from], captured, promotion: isW? p.toUpperCase():p, enPassantCapture});
      });
    } else {
      moves.push({from,to,piece: board[from], captured, enPassantCapture});
    }
  }

  function stepMoves(i, deltas, maxSteps, isW, moves){
    for(const d of deltas){
      for(let step=1; step<=maxSteps; step++){
        const to = i + d*step;
        if(to<0 || to>63) break;
        const fileDiff = Math.abs((to%8)-(i%8));
        const rankDiff = Math.abs(Math.floor(to/8)-Math.floor(i/8));
        if((d===-1||d===1||d===-8||d===8)===false && fileDiff!==rankDiff) break;
        if(Math.abs((to%8)-(i%8))>step || Math.abs(Math.floor(to/8)-Math.floor(i/8))>step) break;
        const target = board[to];
        if(target){
          if(isWhite(target)!==isW) moves.push({from:i,to,piece:board[i], captured:target});
          break;
        }
        moves.push({from:i,to,piece:board[i]});
      }
    }
  }

  function kingMoves(i, isW, moves, forAttack){
    for(const d of dirs.q){
      const to = i + d;
      if(to<0 || to>63) continue;
      const fileDiff = Math.abs((to%8)-(i%8));
      const rankDiff = Math.abs(Math.floor(to/8)-Math.floor(i/8));
      if(fileDiff>1 || rankDiff>1) continue;
      const target = board[to];
      if(target && isWhite(target)===isW) continue;
      moves.push({from:i,to,piece:board[i], captured:target||null});
    }
    if(forAttack) return;
    const color = isW?'w':'b';
    if(!isKingInCheck(color)){
      if(castling[color].k && board[i+1]===null && board[i+2]===null && !isSquareAttacked(i+1, color==='w'?'b':'w') && !isSquareAttacked(i+2, color==='w'?'b':'w'))
        moves.push({from:i,to:i+2,castle:'k',piece:board[i]});
      if(castling[color].q && board[i-1]===null && board[i-2]===null && board[i-3]===null && !isSquareAttacked(i-1, color==='w'?'b':'w') && !isSquareAttacked(i-2, color==='w'?'b':'w'))
        moves.push({from:i,to:i-2,castle:'q',piece:board[i]});
    }
  }

  function isSquareAttacked(square, byColor){
    const opponentMoves = generatePseudoMoves(byColor, true);
    return opponentMoves.some(m=>m.to===square);
  }

  function isKingInCheck(color){
    const kingSq = board.findIndex(p=>p===(color==='w'?'K':'k'));
    return isSquareAttacked(kingSq, color==='w'?'b':'w');
  }

  function makeMove(move){
    const {from,to,piece, captured, promotion, castle, enPassantCapture} = move;
    const prev = {board: board.slice(), turn, castling: JSON.parse(JSON.stringify(castling)), enPassant, halfmoveClock, fullmoveNumber, lastMove };
    history.push(prev);
    enPassant = -1;
    if(piece.toLowerCase()==='p') halfmoveClock=0; else halfmoveClock++;
    if(captured) halfmoveClock=0;
    board[from]=null;
    if(enPassantCapture){
      const capSq = turn==='w'? to+8 : to-8;
      board[capSq]=null;
    }
    if(promotion){
      board[to]=promotion;
    } else {
      board[to]=piece;
    }
    if(piece==='K'){ castling.w={k:false,q:false}; }
    if(piece==='k'){ castling.b={k:false,q:false}; }
    if(from===7||to===7) castling.w.k=false;
    if(from===0||to===0) castling.w.q=false;
    if(from===63||to===63) castling.b.k=false;
    if(from===56||to===56) castling.b.q=false;
    if(piece.toLowerCase()==='p' && Math.abs(to-from)===16) enPassant = (from+to)/2;
    if(castle==='k'){
      const rookFrom = to+1;
      const rookTo = to-1;
      board[rookTo]=board[rookFrom];
      board[rookFrom]=null;
    }
    if(castle==='q'){
      const rookFrom = to-2;
      const rookTo = to+1;
      board[rookTo]=board[rookFrom];
      board[rookFrom]=null;
    }
    lastMove = {from,to};
    turn = turn==='w'?'b':'w';
    if(turn==='w') fullmoveNumber++;
  }

  function undoMove(){
    const prev = history.pop();
    board = prev.board;
    turn = prev.turn;
    castling = prev.castling;
    enPassant = prev.enPassant;
    halfmoveClock = prev.halfmoveClock;
    fullmoveNumber = prev.fullmoveNumber;
    lastMove = prev.lastMove;
  }

  function handleMove(move){
    if(move.promotion && !move.autoPromotion){
      pendingPromotion = move;
      promotionBox.style.display = 'grid';
      promotionBox.querySelectorAll('button').forEach(btn=>{
        btn.onclick = () => {
          pendingPromotion.promotion = isWhite(move.piece)? btn.dataset.piece.toUpperCase(): btn.dataset.piece;
          pendingPromotion.autoPromotion=true;
          promotionBox.style.display = 'none';
          pendingPromotion && finalizeMove(pendingPromotion);
          pendingPromotion=null;
        };
      });
      return;
    }
    finalizeMove(move);
  }

  function finalizeMove(move){
    makeMove(move);
    renderBoard();
    updateStatus();
    addHistory(move);
    const end = evaluateEnd();
    if(end) { showOverlay(end.title, end.text); return; }
    if(currentMode==='hvc'){
      if(turn==='b') setTimeout(engineMove, 200);
    } else if(currentMode==='cvc'){
      setTimeout(engineMove, 200);
    }
  }

  function evaluateEnd(){
    const legal = generateLegalMoves(turn);
    if(legal.length===0){
      if(isKingInCheck(turn)) return {title:'Checkmate', text: turn==='w'?'Black wins':'White wins'};
      return {title:'Stalemate', text:'Draw by stalemate.'};
    }
    if(halfmoveClock>=100) return {title:'Draw', text:'Draw by fifty-move rule.'};
    return null;
  }

  function addHistory(move){
    const moveText = moveToNotation(move);
    if(turn==='b') historyEl.innerHTML += `<p>${fullmoveNumber-1}. ${moveText}</p>`;
    else {
      const last = historyEl.lastChild;
      if(last) last.innerHTML += ` ${moveText}`;
      else historyEl.innerHTML += `<p>${fullmoveNumber}. ... ${moveText}</p>`;
    }
    historyEl.scrollTop = historyEl.scrollHeight;
  }

  function moveToNotation(move){
    const piece = move.piece.toLowerCase()==='p'? '' : move.piece.toUpperCase();
    const capture = move.captured? 'x' : '';
    const to = idxToCoord(move.to);
    if(move.castle==='k') return 'O-O';
    if(move.castle==='q') return 'O-O-O';
    let promo = '';
    if(move.promotion) promo = '=' + move.promotion.toUpperCase();
    let check = '';
    makeMove(move);
    const end = generateLegalMoves(turn);
    if(end.length===0){
      check = isKingInCheck(turn)?'#':'½';
    } else if(isKingInCheck(turn)) check = '+';
    undoMove();
    return `${piece}${capture}${to}${promo}${check}`;
  }

  function updateStatus(){
    statusEl.textContent = `${turn==='w'?'White':'Black'} to move.`;
    modeBadge.textContent = `Mode: ${modeSelect.options[modeSelect.selectedIndex].text}`;
  }

  function showOverlay(title, text){
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    overlay.classList.add('active');
  }
  overlayBtn.onclick = () => overlay.classList.remove('active');

  function showToast(msg){
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(()=>toast.classList.remove('show'), 2000);
  }

  function engineMove(){
    const move = minimaxRoot(engineDepth, turn==='w');
    if(!move){
      const end = evaluateEnd();
      if(end) showOverlay(end.title, end.text);
      return;
    }
    finalizeMove(move);
  }

  function minimaxRoot(depth, isMax){
    const moves = generateLegalMoves(isMax?'w':'b');
    let bestVal = isMax? -Infinity : Infinity;
    let bestMove = null;
    for(const m of moves){
      makeMove(m);
      const val = minimax(depth-1, -Infinity, Infinity, !isMax);
      undoMove();
      if(isMax && val>bestVal){ bestVal=val; bestMove=m; }
      if(!isMax && val<bestVal){ bestVal=val; bestMove=m; }
    }
    return bestMove;
  }

  function minimax(depth, alpha, beta, isMax){
    if(depth===0) return evaluateBoard();
    const moves = generateLegalMoves(isMax?'w':'b');
    if(moves.length===0){
      if(isKingInCheck(isMax?'w':'b')) return isMax? -99999 : 99999;
      return 0;
    }
    if(isMax){
      let maxEval = -Infinity;
      for(const m of moves){
        makeMove(m);
        const evaln = minimax(depth-1, alpha, beta, false);
        undoMove();
        maxEval = Math.max(maxEval, evaln);
        alpha = Math.max(alpha, evaln);
        if(beta<=alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for(const m of moves){
        makeMove(m);
        const evaln = minimax(depth-1, alpha, beta, true);
        undoMove();
        minEval = Math.min(minEval, evaln);
        beta = Math.min(beta, evaln);
        if(beta<=alpha) break;
      }
      return minEval;
    }
  }

  function evaluateBoard(){
    let score=0;
    for(let i=0;i<64;i++){
      const p = board[i];
      if(!p) continue;
      const value = pieceValues[p.toLowerCase()];
      const table = pst[p.toLowerCase()]||Array(64).fill(0);
      const pstVal = p===p.toUpperCase()? table[i] : -table[63-i];
      score += (p===p.toUpperCase()? value : -value) + (p===p.toUpperCase()? pstVal : -pstVal);
    }
    return score + (turn==='w'?10:-10);
  }

  function startVoice(){
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SpeechRecognition){
      voiceStatus.textContent = 'Speech input unsupported. Please use manual input.';
      return;
    }
    recognition = new SpeechRecognition();
    recognition.lang = language==='de'?'de-DE':'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = ()=>{
      micBtn.classList.add('listening');
      voiceStatus.textContent = 'Listening...';
    };
    recognition.onerror = ()=>{
      micBtn.classList.remove('listening');
      voiceStatus.textContent = 'Recognition error.';
      showToast('Speech recognition failed');
    };
    recognition.onend = ()=>{ micBtn.classList.remove('listening'); };
    recognition.onresult = (e)=>{
      const text = e.results[0][0].transcript;
      voiceText.textContent = text;
      const move = parseVoice(text);
      if(move){
        confirmMoveText.textContent = move;
        confirmBox.style.display = 'block';
        confirmBox.dataset.move = move;
      } else {
        voiceStatus.textContent = 'Not understood. Example: e two to e four';
      }
    };
    recognition.start();
  }

  function normalizeNumbers(str){
    const map = { 'eins':'1','zwei':'2','drei':'3','vier':'4','fünf':'5','fuenf':'5','sechs':'6','sieben':'7','acht':'8','one':'1','two':'2','three':'3','four':'4','five':'5','six':'6','seven':'7','eight':'8' };
    for(const k in map){
      const re = new RegExp(k,'gi');
      str = str.replace(re,map[k]);
    }
    return str;
  }

  function parseVoice(text){
    let t = text.toLowerCase();
    t = normalizeNumbers(t);
    t = t.replace(/\s+/g,'').replace(/nach|zu|auf|to|from/g,'').replace(/schlaegt|schlägt|nimmt|takes|capture|captures|x/g,'');
    if(/rochade|castle|rokade/.test(t)){
      if(/kurz|short|king/.test(t)) return 'O-O';
      return 'O-O-O';
    }
    const match = t.match(/([a-h][1-8])([a-h][1-8])/);
    if(match) return match[1]+match[2];
    return null;
  }

  confirmBox.querySelector('#confirm-yes').onclick = ()=>{
    const notation = confirmBox.dataset.move;
    confirmBox.style.display = 'none';
    const move = findMoveFromNotation(notation);
    if(move) finalizeMove(move); else showToast('Move not allowed');
  };
  confirmBox.querySelector('#confirm-no').onclick = ()=>{
    confirmBox.style.display = 'none';
    voiceStatus.textContent = 'Please try again.';
  };

  function findMoveFromNotation(note){
    const legal = generateLegalMoves(turn);
    if(note==='O-O') return legal.find(m=>m.castle==='k');
    if(note==='O-O-O') return legal.find(m=>m.castle==='q');
    const m = legal.find(m=> idxToCoord(m.from)+idxToCoord(m.to)===note || idxToCoord(m.to)===note.slice(2));
    return m || null;
  }

  micBtn.onclick = startVoice;
  document.getElementById('settings-btn').onclick = ()=>{
    const el = document.getElementById('settings-overlay');
    el.style.display = el.style.display==='none'? 'block':'none';
  };
  document.getElementById('new-game').onclick = resetGame;
  modeSelect.onchange = ()=>{ currentMode = modeSelect.value; updateStatus(); if(currentMode==='cvc') setTimeout(engineMove, 200); };
  depthRange.oninput = ()=>{ engineDepth = parseInt(depthRange.value); depthLabel.textContent = engineDepth===1?'Easy':engineDepth===2?'Medium':'Hard'; };
  themeSelect.onchange = ()=>{ theme = themeSelect.value; applyTheme(); };
  languageSelect.onchange = ()=>{ language = languageSelect.value; };

  function applyTheme(){
    if(theme==='light'){
      document.documentElement.style.setProperty('--bg','#e2e8f0');
      document.documentElement.style.setProperty('--panel','#fff');
      document.documentElement.style.setProperty('--text','#111');
      document.documentElement.style.setProperty('--dark-square','#94a3b8');
      document.documentElement.style.setProperty('--light-square','#cbd5e1');
    } else {
      document.documentElement.style.removeProperty('--bg');
      document.documentElement.style.removeProperty('--panel');
      document.documentElement.style.removeProperty('--text');
      document.documentElement.style.removeProperty('--dark-square');
      document.documentElement.style.removeProperty('--light-square');
    }
  }

  function resetGame(){
    history = [];
    parseFEN(startFEN);
    renderBoard();
    historyEl.innerHTML='';
    selected=null; lastMove=null; pendingPromotion=null; promotionBox.style.display='none';
    updateStatus();
    if(currentMode==='hvc' && turn==='b') setTimeout(engineMove,200);
    if(currentMode==='cvc') setTimeout(engineMove,200);
  }

  function init(){
    parseFEN(startFEN);
    renderBoard();
    updateStatus();
    depthLabel.textContent = 'Medium';
  }
  init();
})();
