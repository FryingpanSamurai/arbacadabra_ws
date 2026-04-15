(function () {
    const canvas = document.getElementById("ski-game");
    const ctx = canvas.getContext("2d");
    const scoreEl = document.getElementById("score");
    const speedEl = document.getElementById("speed");
    const gapEl = document.getElementById("gap");
    const overlayEl = document.getElementById("overlay");
    const startButton = document.getElementById("start-button");
    const restartButton = document.getElementById("restart-button");
    const spriteSheet = new Image();
    spriteSheet.src = "../static/skifreespritesheet.png";

    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;
    const TREE_MIN_DISTANCE = 82;
    const SPRITE = {
        frameWidth: 30,
        frameHeight: 46,
        skierRowY: 0,
        yetiRowY: 50,
        crashRowY: 56,
        yetiLeft: { x: 45, y: 51, width: 24, height: 46 },
        yetiRight: { x: 87, y: 51, width: 24, height: 46 },
        crash: { x: 123, y: 54, width: 30, height: 40 }
    };

    const state = {
        running: false,
        gameOver: false,
        score: 0,
        speed: 6.1,
        targetSpeed: 6.1,
        yetiDistance: 290,
        leftPressed: false,
        rightPressed: false,
        skier: {
            x: WIDTH / 2,
            y: 128,
            width: 32,
            height: 42,
            momentum: 0,
            crashTimer: 0
        },
        trees: [],
        trailOffset: 0,
        nextTreeSpawn: 0
    };

    function resetGame() {
        state.running = false;
        state.gameOver = false;
        state.score = 0;
        state.speed = 6.1;
        state.targetSpeed = 6.1;
        state.yetiDistance = 290;
        state.leftPressed = false;
        state.rightPressed = false;
        state.skier.x = WIDTH / 2;
        state.skier.momentum = 0;
        state.skier.crashTimer = 0;
        state.trees = [];
        state.trailOffset = 0;
        state.nextTreeSpawn = 0;

        for (let i = 0; i < 7; i += 1) {
            spawnTree(true, HEIGHT - i * 120);
        }

        showOverlay(
            "Outrun the Yeti",
            "Thread between the trees and keep your momentum. Collisions slow you down, and the yeti does not miss second chances.",
            "Start Run"
        );
        updateHud();
        draw();
    }

    function startGame() {
        if (state.gameOver) {
            resetGame();
        }
        state.running = true;
        state.gameOver = false;
        overlayEl.classList.add("is-hidden");
    }

    function endGame() {
        state.running = false;
        state.gameOver = true;
        showOverlay(
            "The Yeti Got You",
            `Final score: ${Math.floor(state.score)}. Press restart and take another run.`,
            "Run It Back"
        );
    }

    function showOverlay(title, message, buttonText) {
        overlayEl.classList.remove("is-hidden");
        overlayEl.querySelector("h2").textContent = title;
        overlayEl.querySelector("p").textContent = message;
        startButton.textContent = buttonText;
    }

    function updateHud() {
        scoreEl.textContent = Math.floor(state.score);
        speedEl.textContent = state.speed.toFixed(1);
        gapEl.textContent = Math.max(0, Math.floor(state.yetiDistance));
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function random(min, max) {
        return Math.random() * (max - min) + min;
    }

    function spawnTree(initial, forcedY) {
        let x;
        let attempts = 0;

        do {
            x = random(70, WIDTH - 70);
            attempts += 1;
        } while (
            attempts < 12 &&
            state.trees.some((tree) => {
                const yClose = Math.abs((forcedY ?? (HEIGHT + 40)) - tree.y) < TREE_MIN_DISTANCE;
                const xClose = Math.abs(x - tree.x) < 70;
                return yClose && xClose;
            })
        );

        state.trees.push({
            x,
            y: forcedY ?? (HEIGHT + 60),
            trunkWidth: random(12, 16),
            trunkHeight: random(16, 22),
            crown: random(28, 38),
            hit: false
        });

        if (!initial) {
            state.nextTreeSpawn = random(62, 104);
        }
    }

    function updateSkier() {
        const steer = (state.rightPressed ? 1 : 0) - (state.leftPressed ? 1 : 0);
        state.skier.momentum = clamp(state.skier.momentum + steer * 0.35, -4.6, 4.6);
        state.skier.momentum *= 0.88;
        state.skier.x = clamp(state.skier.x + state.skier.momentum, 34, WIDTH - 34);
        state.skier.crashTimer = Math.max(0, state.skier.crashTimer - 1);
    }

    function updateTrees() {
        state.nextTreeSpawn -= state.speed;

        if (state.nextTreeSpawn <= 0) {
            spawnTree(false);
        }

        for (const tree of state.trees) {
            tree.y -= state.speed;
        }

        state.trees = state.trees.filter((tree) => tree.y > -70);
    }

    function checkCollisions() {
        const skier = state.skier;

        for (const tree of state.trees) {
            if (tree.hit) {
                continue;
            }

            const dx = Math.abs(skier.x - tree.x);
            const dy = Math.abs((skier.y + skier.height * 0.3) - tree.y);

            if (dx < tree.crown * 0.55 && dy < 38) {
                tree.hit = true;
                state.speed = Math.max(2.8, state.speed - 1.35);
                state.targetSpeed = Math.max(5.1, state.targetSpeed - 0.45);
                state.yetiDistance = Math.max(0, state.yetiDistance - 26);
                state.skier.momentum += skier.x < tree.x ? -2.5 : 2.5;
                state.skier.crashTimer = 24;
            }
        }
    }

    function drawSprite(frame, dx, dy, dw, dh) {
        if (!spriteSheet.complete || !frame) {
            return false;
        }

        ctx.drawImage(
            spriteSheet,
            frame.x,
            frame.y,
            frame.width,
            frame.height,
            dx,
            dy,
            dw,
            dh
        );
        return true;
    }

    function getSkierFrameIndex() {
        if (state.skier.crashTimer > 0) {
            return null;
        }

        const turn = clamp(state.skier.momentum / 4.2, -1, 1);
        const index = Math.round(((turn + 1) / 2) * 8);
        return clamp(index, 0, 8);
    }

    function updateChase() {
        const calmRunBonus = state.speed > 8.2 ? 0.22 : 0;
        state.targetSpeed = clamp(state.targetSpeed + 0.0028 + calmRunBonus * 0.0015, 5.8, 11.4);
        state.speed += (state.targetSpeed - state.speed) * 0.02;

        if (state.speed > 6.3) {
            state.yetiDistance += (state.speed - 6.3) * 0.42;
        } else {
            state.yetiDistance -= (6.3 - state.speed) * 0.72;
        }

        state.yetiDistance = clamp(state.yetiDistance, 0, 420);
        state.score += state.speed * 0.55;

        if (state.yetiDistance <= 6) {
            endGame();
        }
    }

    function drawSnow() {
        ctx.fillStyle = "#dff2ff";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        state.trailOffset = (state.trailOffset + state.speed) % 48;
        ctx.strokeStyle = "rgba(132, 185, 225, 0.22)";
        ctx.lineWidth = 2;

        for (let i = -1; i < 18; i += 1) {
            const y = i * 48 - state.trailOffset;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(WIDTH, y - 18);
            ctx.stroke();
        }
    }

    function drawTree(tree) {
        ctx.save();
        ctx.translate(tree.x, tree.y);

        ctx.fillStyle = "#6d4323";
        ctx.fillRect(-tree.trunkWidth / 2, 10, tree.trunkWidth, tree.trunkHeight);

        ctx.fillStyle = tree.hit ? "#2f6f43" : "#33814f";
        ctx.beginPath();
        ctx.moveTo(0, -tree.crown);
        ctx.lineTo(tree.crown * 0.8, 18);
        ctx.lineTo(-tree.crown * 0.8, 18);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#49a468";
        ctx.beginPath();
        ctx.moveTo(0, -tree.crown * 0.66);
        ctx.lineTo(tree.crown * 0.52, 6);
        ctx.lineTo(-tree.crown * 0.52, 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function drawSkier() {
        const skier = state.skier;
        const drawWidth = 44;
        const drawHeight = 60;
        const shadowWidth = 24;

        ctx.fillStyle = "rgba(35, 61, 86, 0.16)";
        ctx.beginPath();
        ctx.ellipse(skier.x, skier.y + 26, shadowWidth, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        if (state.skier.crashTimer > 0) {
            if (drawSprite(SPRITE.crash, skier.x - drawWidth / 2, skier.y - 24, drawWidth, drawHeight)) {
                return;
            }
        } else {
            const frameIndex = getSkierFrameIndex();
            const frame = {
                x: frameIndex * SPRITE.frameWidth,
                y: SPRITE.skierRowY,
                width: SPRITE.frameWidth,
                height: SPRITE.frameHeight
            };

            if (drawSprite(frame, skier.x - drawWidth / 2, skier.y - 24, drawWidth, drawHeight)) {
                return;
            }
        }

        ctx.save();
        ctx.translate(skier.x, skier.y);
        ctx.strokeStyle = "#26445a";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-14, 16);
        ctx.lineTo(10, 20);
        ctx.moveTo(-10, 20);
        ctx.lineTo(14, 16);
        ctx.stroke();
        ctx.fillStyle = "#182938";
        ctx.fillRect(-10, -6, 20, 22);
        ctx.fillStyle = "#d93b3b";
        ctx.beginPath();
        ctx.arc(0, -16, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function drawYeti() {
        const chaseRatio = 1 - state.yetiDistance / 420;
        const y = clamp(state.skier.y + 90 + state.yetiDistance * 0.88, state.skier.y + 80, HEIGHT - 34);
        const x = clamp(state.skier.x * 0.38 + WIDTH * 0.31, 70, WIDTH - 70);
        const scale = 0.62 + chaseRatio * 0.6;
        const facingRight = x < state.skier.x;
        const yetiFrame = facingRight ? SPRITE.yetiRight : SPRITE.yetiLeft;

        ctx.fillStyle = "rgba(35, 61, 86, 0.12)";
        ctx.beginPath();
        ctx.ellipse(x, y + 25 * scale, 18 * scale, 7 * scale, 0, 0, Math.PI * 2);
        ctx.fill();

        if (drawSprite(yetiFrame, x - 18 * scale, y - 18 * scale, 36 * scale, 50 * scale)) {
            return;
        }

        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);

        ctx.fillStyle = "#f7fbff";
        ctx.beginPath();
        ctx.ellipse(0, 18, 20, 24, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, -8, 16, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#203040";
        ctx.beginPath();
        ctx.arc(-5, -10, 2, 0, Math.PI * 2);
        ctx.arc(5, -10, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#7b8ea5";
        ctx.beginPath();
        ctx.arc(0, -2, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    function drawFinishText() {
        if (!state.gameOver) {
            return;
        }

        ctx.save();
        ctx.fillStyle = "rgba(10, 19, 30, 0.4)";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.restore();
    }

    function draw() {
        drawSnow();
        for (const tree of state.trees) {
            drawTree(tree);
        }
        drawYeti();
        drawSkier();
        drawFinishText();
    }

    function tick() {
        if (state.running) {
            updateSkier();
            updateTrees();
            checkCollisions();
            updateChase();
            updateHud();
        }

        draw();
        window.requestAnimationFrame(tick);
    }

    document.addEventListener("keydown", (event) => {
        const key = event.key.toLowerCase();
        if (["a", "d", "arrowleft", "arrowright", " ", "enter"].includes(key)) {
            event.preventDefault();
        }
        if (key === "a" || key === "arrowleft") {
            state.leftPressed = true;
        }
        if (key === "d" || key === "arrowright") {
            state.rightPressed = true;
        }
        if ((key === "enter" || key === " ") && !state.running) {
            startGame();
        }
    });

    document.addEventListener("keyup", (event) => {
        const key = event.key.toLowerCase();
        if (key === "a" || key === "arrowleft") {
            state.leftPressed = false;
        }
        if (key === "d" || key === "arrowright") {
            state.rightPressed = false;
        }
    });

    startButton.addEventListener("click", startGame);
    restartButton.addEventListener("click", () => {
        resetGame();
        startGame();
    });

    resetGame();
    tick();
}());
