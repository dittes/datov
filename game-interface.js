/**
 * Game Interface Shared Library
 * Handles:
 * - SEO Meta Injection
 * - How to Play Modal
 * - Game Over / Round Result Modal
 * - Social Sharing
 */

const GameInterface = {
    config: {
        name: 'Game',
        description: 'A fun game on DATOV.',
        howToPlay: [], // Array of strings
        url: window.location.href
    },

    init(config) {
        this.config = { ...this.config, ...config };
        this.injectSEO();
        this.createUI();
    },

    injectSEO() {
        // Update Title
        document.title = `${this.config.name} - DATOV`;

        // Meta Description
        let metaDesc = document.querySelector('meta[name="description"]');
        if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.name = 'description';
            document.head.appendChild(metaDesc);
        }
        metaDesc.content = this.config.description;

        // Open Graph
        this.setMeta('og:title', `${this.config.name} - DATOV`);
        this.setMeta('og:description', this.config.description);
        this.setMeta('og:url', this.config.url);
        // this.setMeta('og:image', '...'); // Could add game specific image if available
    },

    setMeta(property, content) {
        let meta = document.querySelector(`meta[property="${property}"]`);
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('property', property);
            document.head.appendChild(meta);
        }
        meta.content = content;
    },

    createUI() {
        // Create Overlay Container
        const overlay = document.createElement('div');
        overlay.id = 'gameOverlay';
        overlay.className = 'game-overlay hidden';
        document.body.appendChild(overlay);

        // Integrate How to Play into Nav
        const navLinks = document.querySelector('.nav-links');
        if (navLinks) {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = '#';
            a.textContent = 'How to Play';
            a.onclick = (e) => {
                e.preventDefault();
                this.showHowToPlay();
            };
            // Insert before the last item (usually "Back to Games" or similar if present, or just append)
            // Actually, usually "Back to Games" is there. Let's just append or prepend?
            // User said "neatly integrated".
            // Let's append it.
            navLinks.appendChild(li);
            li.appendChild(a);
        } else {
            // Fallback to floating button if no nav found
            const infoBtn = document.createElement('button');
            infoBtn.className = 'info-btn';
            infoBtn.innerHTML = '<i class="fas fa-question"></i>';
            infoBtn.title = 'How to Play';
            infoBtn.onclick = () => this.showHowToPlay();
            document.body.appendChild(infoBtn);
        }
    },

    showHowToPlay() {
        const overlay = document.getElementById('gameOverlay');
        overlay.innerHTML = `
            <div class="modal">
                <h2>How to Play ${this.config.name}</h2>
                <ul class="instructions-list">
                    ${this.config.howToPlay.map(step => `<li>${step}</li>`).join('')}
                </ul>
                <button class="btn btn-primary" onclick="GameInterface.hideOverlay()">Got it!</button>
            </div>
        `;
        overlay.classList.remove('hidden');
    },

    showMessage(title, text) {
        const overlay = document.getElementById('gameOverlay');
        overlay.innerHTML = `
            <div class="modal">
                <h2>${title}</h2>
                <p>${text}</p>
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="GameInterface.hideOverlay()">OK</button>
                </div>
            </div>
        `;
        overlay.classList.remove('hidden');
    },

    showGameOver(result) {
        const overlay = document.getElementById('gameOverlay');
        const scoreText = result.score !== undefined ? `Score: ${result.score}` : '';
        const levelText = result.level !== undefined ? `Level: ${result.level}` : '';
        const resultMsg = result.text || 'Game Over';

        overlay.innerHTML = `
            <div class="modal">
                <h2>${resultMsg}</h2>
                <div class="result-stats">
                    ${scoreText ? `<p>${scoreText}</p>` : ''}
                    ${levelText ? `<p>${levelText}</p>` : ''}
                </div>
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="location.reload()">Play Again</button>
                    <button class="btn btn-secondary share-btn" onclick="GameInterface.shareResult('${scoreText} ${levelText}')">
                        <i class="fas fa-share-alt"></i> Share
                    </button>
                    <button class="btn btn-outline" onclick="location.href='index.html'">Exit</button>
                </div>
            </div>
        `;
        overlay.classList.remove('hidden');
    },

    hideOverlay() {
        document.getElementById('gameOverlay').classList.add('hidden');
    },

    async shareResult(stats) {
        const text = `I just played ${this.config.name} on DATOV! ${stats} \nPlay now: ${this.config.url}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: this.config.name,
                    text: text,
                    url: this.config.url
                });
            } catch (err) {
                console.log('Share failed:', err);
                this.showMessage('Share Error', 'Could not share result.');
            }
        } else {
            // Fallback to clipboard
            navigator.clipboard.writeText(text).then(() => {
                this.showMessage('Copied!', 'Result copied to clipboard.');
            }).catch(() => {
                this.showMessage('Error', 'Failed to copy to clipboard.');
            });
        }
    }
};
