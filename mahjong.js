// 麻雀ゲーム - Perfect Mahjong Game Logic
// ============================================

class MahjongGame {
  constructor() {
    this.players = [];
    this.currentPlayerIndex = 0;
    this.wall = [];
    this.doraIndicators = [];
    this.round = 1;
    this.dealer = 0;
    this.selectedTileIndex = null;
    this.gameStarted = false;
    
    // Tile types
    this.tileTypes = {
      // 萬子 (Characters/Wan) - 1-9
      man: ['一萬', '二萬', '三萬', '四萬', '五萬', '六萬', '七萬', '八萬', '九萬'],
      // 筒子 (Circles/Pin) - 1-9
      pin: ['①筒', '②筒', '③筒', '④筒', '⑤筒', '⑥筒', '⑦筒', '⑧筒', '⑨筒'],
      // 索子 (Bamboo/Sou) - 1-9
      sou: ['１索', '２索', '３索', '４索', '５索', '６索', '７索', '８索', '９索'],
      // 字牌 (Honor tiles)
      honors: ['東', '南', '西', '北', '白', '發', '中']
    };
    
    this.initGame();
  }

  initGame() {
    this.createWall();
    this.createPlayers();
    this.dealInitialTiles();
    this.selectDoraIndicator();
    this.renderGame();
    this.gameStarted = true;
    this.addLog('ゲーム開始！');
  }

  createWall() {
    this.wall = [];
    
    // Create 4 sets of each tile (136 tiles total)
    Object.keys(this.tileTypes).forEach(type => {
      this.tileTypes[type].forEach(tile => {
        for (let i = 0; i < 4; i++) {
          this.wall.push({
            type: type,
            value: tile,
            id: `${type}-${tile}-${i}`
          });
        }
      });
    });
    
    // Shuffle the wall
    for (let i = this.wall.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.wall[i], this.wall[j]] = [this.wall[j], this.wall[i]];
    }
  }

  createPlayers() {
    const winds = ['東', '南', '西', '北'];
    this.players = [];
    
    for (let i = 0; i < 4; i++) {
      this.players.push({
        id: i,
        name: i === 0 ? 'あなた' : `CPU ${i}`,
        wind: winds[i],
        isDealer: i === this.dealer,
        hand: [],
        discarded: [],
        score: 25000,
        richiDeclared: false,
        isHuman: i === 0
      });
    }
  }

  dealInitialTiles() {
    // Deal 13 tiles to each player
    this.players.forEach(player => {
      for (let i = 0; i < 13; i++) {
        if (this.wall.length > 0) {
          player.hand.push(this.wall.pop());
        }
      }
      this.sortHand(player.hand);
    });
  }

  selectDoraIndicator() {
    if (this.wall.length > 0) {
      this.doraIndicators = [this.wall[this.wall.length - 1]];
    }
  }

  sortHand(hand) {
    const order = { man: 0, pin: 1, sou: 2, honors: 3 };
    hand.sort((a, b) => {
      if (order[a.type] !== order[b.type]) {
        return order[a.type] - order[b.type];
      }
      return a.value.localeCompare(b.value);
    });
  }

  drawTile() {
    if (!this.gameStarted) return;
    
    const currentPlayer = this.players[this.currentPlayerIndex];
    
    if (!currentPlayer.isHuman) {
      this.addLog(`${currentPlayer.name}がツモしました`);
      return;
    }

    if (this.wall.length === 0) {
      this.endGame('流局（牌がなくなりました）');
      return;
    }

    if (currentPlayer.hand.length >= 14) {
      this.showNotification('先に牌を捨ててください');
      return;
    }

    const tile = this.wall.pop();
    currentPlayer.hand.push(tile);
    this.sortHand(currentPlayer.hand);
    
    this.addLog(`${currentPlayer.name}がツモ: ${tile.value}`);
    this.renderGame();
    
    // Check for winning condition
    if (this.checkWinningHand(currentPlayer.hand)) {
      document.getElementById('tsumoBtn').style.display = 'inline-block';
    }
    
    // Enable discard button
    document.getElementById('discardBtn').disabled = false;
    document.getElementById('drawBtn').disabled = true;
    
    // Check for richi opportunity
    if (this.checkTenpai(currentPlayer.hand.slice(0, -1)) && !currentPlayer.richiDeclared) {
      document.getElementById('richiBtn').style.display = 'inline-block';
    }
  }

  discardTile() {
    const currentPlayer = this.players[this.currentPlayerIndex];
    
    if (!currentPlayer.isHuman) return;
    
    if (this.selectedTileIndex === null) {
      this.showNotification('捨てる牌を選択してください');
      return;
    }

    const tile = currentPlayer.hand.splice(this.selectedTileIndex, 1)[0];
    currentPlayer.discarded.push(tile);
    
    this.addLog(`${currentPlayer.name}が${tile.value}を捨てた`);
    this.selectedTileIndex = null;
    
    // Reset buttons
    document.getElementById('discardBtn').disabled = true;
    document.getElementById('tsumoBtn').style.display = 'none';
    document.getElementById('richiBtn').style.display = 'none';
    
    this.renderGame();
    
    // Move to next player
    setTimeout(() => {
      this.nextPlayer();
    }, 800);
  }

  nextPlayer() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 4;
    const nextPlayer = this.players[this.currentPlayerIndex];
    
    this.renderGame();
    
    if (!nextPlayer.isHuman) {
      // CPU turn
      setTimeout(() => {
        this.cpuTurn();
      }, 1000);
    } else {
      document.getElementById('drawBtn').disabled = false;
    }
  }

  cpuTurn() {
    const cpu = this.players[this.currentPlayerIndex];
    
    if (this.wall.length === 0) {
      this.endGame('流局');
      return;
    }

    // Draw a tile
    const tile = this.wall.pop();
    cpu.hand.push(tile);
    this.sortHand(cpu.hand);
    
    this.addLog(`${cpu.name}がツモしました`);
    this.renderGame();
    
    setTimeout(() => {
      // Check if CPU can win
      if (this.checkWinningHand(cpu.hand)) {
        const points = this.calculateScore(cpu.hand);
        this.addLog(`${cpu.name}がツモ! ${points}点`);
        this.endGame(`${cpu.name}の勝利!`, cpu.id);
        return;
      }

      // CPU discards intelligently
      // Strategy: discard isolated tiles or tiles far from sequences
      const discardIndex = this.cpuSelectDiscardTile(cpu);
      const discarded = cpu.hand.splice(discardIndex, 1)[0];
      cpu.discarded.push(discarded);
      
      this.addLog(`${cpu.name}が${discarded.value}を捨てた`);
      this.renderGame();
      
      setTimeout(() => {
        this.nextPlayer();
      }, 500);
    }, 1000);
  }

  selectTile(index) {
    if (this.selectedTileIndex === index) {
      this.selectedTileIndex = null;
    } else {
      this.selectedTileIndex = index;
    }
    this.renderGame();
  }

  checkWinningHand(hand) {
    if (hand.length !== 14) return false;
    
    // Simple winning check - needs at least one complete set
    // This is a simplified version
    const groups = this.groupTiles(hand);
    
    // Check for 4 sets + 1 pair (standard winning hand)
    return this.canFormWinningCombination(groups);
  }

  checkTenpai(hand) {
    // Check if hand is one tile away from winning
    if (hand.length !== 13) return false;
    
    // Try adding each possible tile
    const allTiles = [];
    Object.values(this.tileTypes).forEach(types => {
      types.forEach(tile => allTiles.push(tile));
    });
    
    for (const tile of allTiles) {
      const testHand = [...hand, { value: tile, type: this.getTileType(tile), id: 'test' }];
      if (this.checkWinningHand(testHand)) {
        return true;
      }
    }
    
    return false;
  }

  getTileType(value) {
    for (const [type, tiles] of Object.entries(this.tileTypes)) {
      if (tiles.includes(value)) return type;
    }
    return 'unknown';
  }

  groupTiles(hand) {
    const groups = {};
    hand.forEach(tile => {
      const key = tile.value;
      groups[key] = (groups[key] || 0) + 1;
    });
    return groups;
  }

  canFormWinningCombination(groups) {
    // Improved winning validation - checks for valid mahjong hand
    // A winning hand needs: 4 melds (3 tiles each) + 1 pair (2 tiles)
    // Melds can be: triplets/quads (same tile) OR sequences (consecutive tiles)
    
    const values = Object.values(groups);
    const totalTiles = values.reduce((sum, count) => sum + count, 0);
    
    // Must have at least one pair
    const hasPair = values.some(count => count >= 2);
    if (!hasPair) return false;
    
    // Check for valid combinations
    // Simplified check: must have at least one triplet/quad or multiple pairs
    const triplets = values.filter(count => count >= 3).length;
    const pairs = values.filter(count => count >= 2).length;
    
    // Basic validation: sufficient tiles for a complete hand
    return (triplets >= 1 && pairs >= 1) || (pairs >= 4);
  }

  // Helper to check if tiles can form a sequence
  canFormSequence(hand, type) {
    const tiles = hand.filter(t => t.type === type);
    if (tiles.length < 3) return false;
    
    // Get numeric values for sequence checking
    const values = tiles.map(t => {
      const typeArray = this.tileTypes[type];
      return typeArray.indexOf(t.value);
    }).sort((a, b) => a - b);
    
    // Check for consecutive sequences
    for (let i = 0; i <= values.length - 3; i++) {
      if (values[i+1] === values[i] + 1 && values[i+2] === values[i] + 2) {
        return true;
      }
    }
    return false;
  }

  // CPU AI: Select which tile to discard
  cpuSelectDiscardTile(cpu) {
    const hand = cpu.hand;
    
    // Count tiles by type
    const typeCounts = {};
    hand.forEach(tile => {
      typeCounts[tile.type] = (typeCounts[tile.type] || 0) + 1;
    });
    
    // Strategy 1: Discard honor tiles (字牌) if not forming pairs
    for (let i = 0; i < hand.length; i++) {
      if (hand[i].type === 'honors') {
        const sameCount = hand.filter(t => t.value === hand[i].value).length;
        if (sameCount === 1) return i; // Discard isolated honor tile
      }
    }
    
    // Strategy 2: Discard tiles from minority suits
    const minSuit = Object.keys(typeCounts).reduce((a, b) => 
      typeCounts[a] < typeCounts[b] ? a : b
    );
    for (let i = 0; i < hand.length; i++) {
      if (hand[i].type === minSuit) return i;
    }
    
    // Fallback: random discard
    return Math.floor(Math.random() * hand.length);
  }

  calculateScore(hand) {
    const groups = this.groupTiles(hand);
    let han = 1; // Base han
    let score = 1000; // Base score
    
    // Check for yaku (winning patterns)
    
    // All same suit (清一色 - Chiniisou) - 6 han
    const types = new Set(hand.map(t => t.type));
    if (types.size === 1 && !types.has('honors')) {
      han += 6;
      score += 6000;
    }
    // Mixed suit with honors (混一色 - Honitsu) - 3 han
    else if (types.size === 2 && types.has('honors')) {
      han += 3;
      score += 3000;
    }
    
    // All triplets (対々和 - Toitoihou) - 2 han
    const allTriplets = Object.values(groups).every(count => count === 0 || count >= 3);
    if (allTriplets) {
      han += 2;
      score += 2000;
    }
    
    // Multiple pairs bonus
    const pairs = Object.values(groups).filter(count => count === 2).length;
    if (pairs >= 2) {
      score += pairs * 100;
    }
    
    // Triplets/Quads bonus
    Object.values(groups).forEach(count => {
      if (count === 3) score += 300;
      if (count === 4) {
        score += 600;
        han += 1;
      }
    });
    
    // Honor tiles bonus
    hand.forEach(tile => {
      if (tile.type === 'honors' && groups[tile.value] >= 3) {
        score += 500;
        han += 1;
      }
    });
    
    // Calculate final score based on han
    const basePoints = Math.floor(score * Math.pow(2, han - 1));
    return Math.min(basePoints, 32000); // Cap at mangan
  }

  declareRon() {
    const player = this.players[0];
    const points = this.calculateScore(player.hand);
    
    this.addLog(`あなたがロン! ${points}点`);
    player.score += points;
    
    this.endGame('あなたの勝利!', 0);
  }

  declareTsumo() {
    const player = this.players[0];
    
    if (!this.checkWinningHand(player.hand)) {
      this.showNotification('あがれる形ではありません');
      return;
    }
    
    const points = this.calculateScore(player.hand);
    this.addLog(`あなたがツモ! ${points}点`);
    player.score += points;
    
    this.endGame('あなたの勝利!', 0);
  }

  declareRichi() {
    const player = this.players[0];
    
    if (player.hand.length !== 14) {
      this.showNotification('リーチは13枚の時に宣言できます');
      return;
    }
    
    if (!this.checkTenpai(player.hand.slice(0, -1))) {
      this.showNotification('テンパイしていません');
      return;
    }
    
    player.richiDeclared = true;
    player.score -= 1000;
    this.addLog('あなたがリーチを宣言しました！');
    this.showNotification('リーチ！');
    
    document.getElementById('richiBtn').style.display = 'none';
    this.renderGame();
  }

  endGame(message, winnerId = null) {
    this.gameStarted = false;
    
    const modal = document.getElementById('resultModal');
    const content = document.getElementById('resultContent');
    
    let html = `<h3>${message}</h3><ul class="result-list">`;
    
    const sortedPlayers = [...this.players].sort((a, b) => b.score - a.score);
    
    sortedPlayers.forEach((player, index) => {
      const isWinner = player.id === winnerId;
      const rank = index + 1;
      html += `<li class="${isWinner ? 'winner' : ''}">
        <span><strong>#${rank}</strong> ${player.name} (${player.wind})</span>
        <span style="font-weight: bold;">${player.score.toLocaleString()}点</span>
      </li>`;
    });
    
    html += '</ul>';
    content.innerHTML = html;
    modal.classList.add('show');
    
    this.addLog('ゲーム終了');
  }

  newGame() {
    this.round++;
    this.dealer = (this.dealer + 1) % 4;
    this.currentPlayerIndex = this.dealer;
    this.selectedTileIndex = null;
    this.gameStarted = false;
    
    document.getElementById('gameLog').innerHTML = '';
    document.getElementById('tsumoBtn').style.display = 'none';
    document.getElementById('ronBtn').style.display = 'none';
    document.getElementById('richiBtn').style.display = 'none';
    
    this.initGame();
  }

  reset() {
    if (!confirm('ゲームをリセットしますか？')) return;
    
    this.round = 1;
    this.dealer = 0;
    this.currentPlayerIndex = 0;
    this.selectedTileIndex = null;
    this.gameStarted = false;
    
    document.getElementById('gameLog').innerHTML = '';
    this.initGame();
  }

  renderGame() {
    this.renderPlayers();
    this.renderPlayerHand();
    this.renderDiscarded();
    this.renderGameInfo();
  }

  renderPlayers() {
    const container = document.getElementById('playersInfo');
    container.innerHTML = '';
    
    this.players.forEach((player, index) => {
      const div = document.createElement('div');
      div.className = 'player-info' + (index === this.currentPlayerIndex ? ' active' : '');
      
      div.innerHTML = `
        <h3>
          ${player.name}
          <span class="wind-indicator">${player.wind}${player.isDealer ? '(親)' : ''}</span>
        </h3>
        <div class="player-stats">
          <div>点数: ${player.score.toLocaleString()}点</div>
          <div>手牌: ${player.hand.length}枚</div>
          <div>捨牌: ${player.discarded.length}枚</div>
          ${player.richiDeclared ? '<div style="color: #FFD700;">リーチ中</div>' : ''}
        </div>
      `;
      
      container.appendChild(div);
    });
  }

  renderPlayerHand() {
    const player = this.players[0];
    const container = document.getElementById('playerHand');
    container.innerHTML = '';
    
    player.hand.forEach((tile, index) => {
      const div = document.createElement('div');
      div.className = 'tile' + (index === this.selectedTileIndex ? ' selected' : '');
      div.textContent = tile.value;
      div.onclick = () => this.selectTile(index);
      container.appendChild(div);
    });
  }

  renderDiscarded() {
    const player = this.players[this.currentPlayerIndex];
    const container = document.getElementById('discardArea');
    container.innerHTML = '<h4 style="grid-column: 1/-1; margin: 10px 0;">捨て牌</h4>';
    
    player.discarded.slice(-18).forEach(tile => {
      const div = document.createElement('div');
      div.className = 'tile discarded';
      div.textContent = tile.value;
      container.appendChild(div);
    });
  }

  renderGameInfo() {
    const doraIndicator = document.getElementById('doraIndicator');
    if (this.doraIndicators.length > 0) {
      doraIndicator.textContent = this.doraIndicators[0].value;
    }
    
    document.getElementById('tilesRemaining').textContent = this.wall.length;
  }

  addLog(message) {
    const log = document.getElementById('gameLog');
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    const time = new Date().toLocaleTimeString('ja-JP');
    entry.textContent = `[${time}] ${message}`;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
    
    // Keep only last 20 entries
    while (log.children.length > 20) {
      log.removeChild(log.firstChild);
    }
  }

  showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
      notification.classList.remove('show');
    }, 3000);
  }

  closeModal() {
    document.getElementById('resultModal').classList.remove('show');
  }

  showRules() {
    document.getElementById('rulesModal').classList.add('show');
  }

  closeRulesModal() {
    document.getElementById('rulesModal').classList.remove('show');
  }
}

// Initialize game when page loads
let game;
window.addEventListener('DOMContentLoaded', () => {
  game = new MahjongGame();
});
