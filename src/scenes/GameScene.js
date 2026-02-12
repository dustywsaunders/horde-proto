import Phaser from "phaser";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  preload() {}

  create() {
    // Set world bounds
    this.physics.world.setBounds(0, 0, 800, 600);

    // Add simple player placeholder
    this.player = this.add.rectangle(400, 300, 40, 40, 0x00ff00);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);

    // Create enemy group
    this.enemies = this.physics.add.group();

    this.time.addEvent({
      delay: 1000,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true,
    });

    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.handlePlayerHit,
      null,
      this,
    );

    this.enemyList = this.enemies.getChildren();

    // Create player controls
    this.keys = this.input.keyboard.addKeys({
      up: "W",
      down: "S",
      left: "A",
      right: "D",
    });

    // TEMPORARY enemy counter
    this.enemyCounterText = this.add.text(10, 10, "Enemies: 0", {
      fontSize: "18px",
      fill: "#ffffff",
    });

    this.enemyCounterText.setDepth(1000);
    this.enemyCounterText.setScrollFactor(0);
  }

  update() {
    // Update player controls
    const speed = 200;
    const body = this.player.body;

    body.setVelocity(0);

    if (this.keys.left.isDown) {
      body.setVelocityX(-speed);
    } else if (this.keys.right.isDown) {
      body.setVelocityX(speed);
    }

    if (this.keys.up.isDown) {
      body.setVelocityY(-speed);
    } else if (this.keys.down.isDown) {
      body.setVelocityY(speed);
    }

    // ADD THIS AFTER ENEMIES CAN BE REMOVED
    // this.enemyList.forEach(enemy => {
    //    ...
    // })

    // Update enemy controls
    this.enemies.getChildren().forEach((enemy) => {
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;

      const length = Math.sqrt(dx * dx + dy * dy);

      if (length > 0) {
        const speed = 80;
        enemy.body.setVelocity((dx / length) * speed, (dy / length) * speed);
      }
    });

    // TEMPORARY enemy counter
    this.enemyCounterText.setText("Enemies: " + this.enemies.countActive(true));
  }

  spawnEnemy() {
    const { width, height } = this.scale;

    // Random edge spawn
    let x, y;
    const side = Phaser.Math.Between(0, 3);

    if (side === 0) {
      x = 0;
      y = Phaser.Math.Between(0, height);
    } else if (side === 1) {
      x = width;
      y = Phaser.Math.Between(0, height);
    } else if (side === 2) {
      x = Phaser.Math.Between(0, width);
      y = 0;
    } else {
      x = Phaser.Math.Between(0, width);
      y = height;
    }

    const enemy = this.add.rectangle(x, y, 30, 30, 0xff0000);
    this.physics.add.existing(enemy);
    enemy.body.setAllowGravity(false);
    enemy.body.setImmovable(true);
    enemy.body.setCircle(12);
    enemy.body.setCollideWorldBounds(true);

    this.enemies.add(enemy);
  }
}
