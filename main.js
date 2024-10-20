// Game configuration
const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: { y: 0 }  // No gravity for a top-down game
        }
    }
};

// Create the Phaser game
const game = new Phaser.Game(config);

// Global variables
let player;
let cursors;
let bullets;
let enemies;
let meteors;
let lastFired = 0;
let score = 0;
let highScore = localStorage.getItem('highScore') || 0;
let scoreText;
let highScoreText;
let playerLifeBar;
let gameOverText;
let replayButton;
let shootSound;
let gameOverSound;
let isGameOver = false;

function preload() {
    this.load.image('background', 'assets/Backgrounds/black.png');
    this.load.image('player', 'assets/PNG/playerShip1_blue.png');
    this.load.image('bullet', 'assets/PNG/Lasers/laserBlue01.png');
    this.load.image('enemy', 'assets/PNG/Enemies/enemyBlack1.png');
    this.load.image('meteor', 'assets/PNG/Meteors/meteorBrown_big1.png');
    this.load.image('ship', 'assets/PNG/Ships/spaceShips_001.png');
    this.load.image('replay', 'assets/PNG/UI/replay.png');
    this.load.audio('shoot', 'assets/Bonus/sfx_laser1.ogg');
    this.load.audio('gameOver', 'assets/Bonus/sfx_lose.ogg');
}

function create() {
    // Add the background image and scale it to cover the entire screen
    let background = this.add.image(0, 0, 'background').setOrigin(0, 0);
    background.displayWidth = this.sys.canvas.width;
    background.displayHeight = this.sys.canvas.height;

    // Create player
    player = this.physics.add.sprite(this.sys.canvas.width / 2, this.sys.canvas.height / 2, 'player').setCollideWorldBounds(true);
    player.health = 100;

    // Create player life bar
    playerLifeBar = this.add.graphics();
    updateLifeBar(player, playerLifeBar);

    // Create bullet group
    bullets = this.physics.add.group({
        classType: Bullet,
        runChildUpdate: true
    });

    // Create enemy group
    enemies = this.physics.add.group();
    spawnEnemies(this, 3);

    // Create meteor group
    meteors = this.physics.add.group();
    spawnMeteors(this, Phaser.Math.Between(2, 3));

    // Input events
    cursors = this.input.keyboard.createCursorKeys();
    this.input.keyboard.on('keydown-SPACE', shootBullet, this);

    // Add score text
    scoreText = this.add.text(16, 16, 'Score: 0', { fontSize: '32px', fill: '#fff' });
    highScoreText = this.add.text(16, 48, 'High Score: ' + highScore, { fontSize: '32px', fill: '#fff' });

    // Add collision detection
    this.physics.add.collider(bullets, enemies, hitEnemy, null, this);
    this.physics.add.collider(player, enemies, hitPlayer, null, this);
    this.physics.add.collider(player, meteors, hitMeteor, null, this);

    // Load sounds
    shootSound = this.sound.add('shoot');
    gameOverSound = this.sound.add('gameOver');

    // Add pause and resume keys
    this.input.keyboard.on('keydown-P', () => {
        this.physics.pause();
        this.add.text(this.sys.canvas.width / 2, this.sys.canvas.height / 2, 'Paused', { fontSize: '64px', fill: '#fff' }).setOrigin(0.5).setName('Paused');
    });

    this.input.keyboard.on('keydown-R', () => {
        this.physics.resume();
        this.children.getByName('Paused').destroy();
    });

    // Add restart key
    this.input.keyboard.on('keydown-ENTER', () => {
        if (isGameOver) {
            restartGame(this);
        }
    });

    // Add help text
    this.add.text(this.sys.canvas.width - 200, this.sys.canvas.height - 50, 'P: Pause, R: Resume, ENTER: Restart', { fontSize: '16px', fill: '#fff' }).setOrigin(0.5);
}

function update(time) {
    if (isGameOver) return;

    // Player movement
    if (cursors.left.isDown) {
        player.setVelocityX(-200);
    } else if (cursors.right.isDown) {
        player.setVelocityX(200);
    } else {
        player.setVelocityX(0);
    }

    if (cursors.up.isDown) {
        player.setVelocityY(-200);
    } else if (cursors.down.isDown) {
        player.setVelocityY(200);
    } else {
        player.setVelocityY(0);
    }

    // Update player life bar position
    updateLifeBar(player, playerLifeBar);
}

function shootBullet() {
    if (isGameOver) return;

    let bullet = bullets.get();
    if (bullet) {
        bullet.fire(player.x, player.y);
        shootSound.play(); // Play shooting sound
    }
}

class Bullet extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'bullet');
    }

    fire(x, y) {
        this.setPosition(x, y);
        this.setActive(true);
        this.setVisible(true);
        this.setVelocityY(-300);
    }

    update() {
        if (this.y < 0) {
            this.setActive(false);
            this.setVisible(false);
        }
    }
}

function spawnEnemies(scene, count = 1) {
    for (let i = 0; i < count; i++) {
        let enemy = enemies.create(Phaser.Math.Between(100, scene.sys.canvas.width - 100), Phaser.Math.Between(50, scene.sys.canvas.height - 50), 'enemy');
        enemy.setVelocity(Phaser.Math.Between(-100, 100), Phaser.Math.Between(-100, 100));
        enemy.setCollideWorldBounds(true);
        enemy.setBounce(0); // Set bounce to 0
        enemy.setImmovable(true); // Prevent bouncing off screen edges
        enemy.health = 20; // Set health to 20 (2 bullets with 10 damage each)

        // Add world bounds event listener
        enemy.body.onWorldBounds = true;
        enemy.body.world.on('worldbounds', function(body) {
            if (body.gameObject === enemy) {
                enemy.destroy();
                spawnEnemies(scene, 1); // Respawn only one enemy
            }
        });
    }
}

function spawnMeteors(scene, count = 1) {
    for (let i = 0; i < count; i++) {
        let meteor = meteors.create(Phaser.Math.Between(100, scene.sys.canvas.width - 100), Phaser.Math.Between(50, scene.sys.canvas.height - 50), 'meteor');
        meteor.setVelocity(Phaser.Math.Between(-50, 50), Phaser.Math.Between(-50, 50));
        meteor.setCollideWorldBounds(true);
        meteor.setBounce(0); // Set bounce to 0
        meteor.setImmovable(true); // Prevent bouncing off screen edges

        // Add world bounds event listener
        meteor.body.onWorldBounds = true;
        meteor.body.world.on('worldbounds', function(body) {
            if (body.gameObject === meteor) {
                meteor.destroy();
                spawnMeteors(scene, 1); // Respawn only one meteor
            }
        });
    }
}

function updateLifeBar(entity, lifeBar) {
    lifeBar.clear();
    lifeBar.fillStyle(0xff0000, 1);
    lifeBar.fillRect(entity.x - 40, entity.y - 50, 80 * (entity.health / 100), 10);
}

function hitEnemy(bullet, enemy) {
    bullet.setActive(false);
    bullet.setVisible(false);
    enemy.health -= 10; // Reduce health by 10

    if (enemy.health <= 0) {
        enemy.destroy();
        score += 10;
        scoreText.setText('Score: ' + score);
        spawnEnemies(this, 2); // Respawn two enemies
    }
}

function hitPlayer(player, enemy) {
    enemy.destroy();
    player.health -= 10;
    updateLifeBar(player, playerLifeBar);

    if (player.health <= 0) {
        gameOver(this);
    } else {
        spawnEnemies(this, 1); // Respawn one enemy
    }
}

function hitMeteor(player, meteor) {
    player.health -= 10;
    updateLifeBar(player, playerLifeBar);

    if (player.health <= 0) {
        gameOver(this);
    }
}

function gameOver(scene) {
    isGameOver = true;
    player.setActive(false);
    player.setVisible(false);
    player.body.enable = false;

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore); // Store high score in local storage
        highScoreText.setText('High Score: ' + highScore);
    }

    gameOverSound.play(); // Play game over sound

    gameOverText = scene.add.text(scene.sys.canvas.width / 2, scene.sys.canvas.height / 2, 'Game Over', { fontSize: '64px', fill: '#fff' }).setOrigin(0.5);
    replayButton = scene.add.image(scene.sys.canvas.width / 2, scene.sys.canvas.height / 2 + 100, 'replay').setOrigin(0.5).setInteractive();

    // Pause the game
    scene.physics.pause();

    replayButton.on('pointerdown', () => {
        restartGame(scene);
    });
}

function restartGame(scene) {
    // Remove Game Over text and replay button
    if (gameOverText) gameOverText.destroy();
    if (replayButton) replayButton.destroy();

    // Reset variables
    isGameOver = false;
    score = 0;
    scoreText.setText('Score: 0');
    player.health = 100;

    // Restart the scene
    scene.scene.restart();
    scene.physics.resume();
}
