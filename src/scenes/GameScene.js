import Phaser from "phaser";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  preload() {}

  create() {
    // Set world bounds
    this.physics.world.setBounds(0, 0, 800, 600);

    // Set default player values
    this.playerStats = {
      moveSpeed: 200,
      maxHp: 100,
      hp: 100,
      damage: 15,
      fireRate: 1000,
      xpMultiplier: 1,
      level: 1,
      xp: 0,
      xpToLevel: 50,
    };

    // Projectile timer
    this.fireTimer = this.time.addEvent({
      delay: this.playerStats.fireRate,
      callback: this.fireProjectile,
      callbackScope: this,
      loop: true,
    });

    // Add simple player placeholder
    this.player = this.add.rectangle(400, 300, 40, 40, 0x00ff00);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.player.setDepth(2);

    // Enemy base stats
    this.enemyStats = {
      moveSpeed: 80,
      maxHp: 30,
      xpValue: 10,
    };

    // Create enemy group
    this.enemies = this.physics.add.group();

    this.enemySpawnEvent = this.time.addEvent({
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
      upArrow: "UP",
      downArrow: "DOWN",
      leftArrow: "LEFT",
      rightArrow: "RIGHT",
    });

    this.playerStats.maxHp = 100;
    this.playerStats.hp = 100;
    this.isPlayerDead = false;

    this.lastDamageTime = 0;
    this.damageCooldown = 300; // ms

    // Projectiles
    this.projectiles = this.physics.add.group();

    // XP Drops
    this.xpOrbs = this.physics.add.group();
    this.physics.add.overlap(
      this.player,
      this.xpOrbs,
      this.collectXp,
      null,
      this,
    );

    // TEMPORARY enemy counter
    this.enemyCounterText = this.add.text(10, 10, "Enemies: 0", {
      fontSize: "18px",
      fill: "#ffffff",
    });

    this.enemyCounterText.setDepth(1000);
    this.enemyCounterText.setScrollFactor(0);

    // Health bar background
    this.healthBarBg = this.add
      .rectangle(10, 40, 200, 20, 0x222222)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1000)
      .setAlpha(0.7);

    // Health bar fill
    this.healthBar = this.add
      .rectangle(10, 40, 200, 20, 0x00ff00)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1001)
      .setAlpha(0.7);

    this.healthText = this.add
      .text(10, 65, "", {
        fontSize: "14px",
        fill: "#ffffff",
      })
      .setScrollFactor(0)
      .setDepth(1002);

    // xp bar
    // Player Level
    this.playerStats.level = 1;
    this.playerStats.xp = 0;
    this.playerStats.xpToLevel = 50; // first level threshold

    this.levelText = this.add.text(
      580,
      10, // top-right
      "Level: " + this.playerStats.level,
      { fontSize: "18px", fill: "#ffffff" },
    );
    this.levelText.setDepth(1000);
    this.levelText.setScrollFactor(0);

    // XP bar background
    this.xpBarBg = this.add
      .rectangle(580, 40, 200, 20, 0x222222)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1000)
      .setAlpha(0.7);

    // XP bar fill
    this.xpBar = this.add
      .rectangle(580, 40, 0, 20, 0x0000ff) // width will grow
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1001)
      .setAlpha(0.7);

    this.xpText = this.add
      .text(790, 65, "", {
        fontSize: "14px",
        fill: "#ffffff",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(1002);

    // Timer
    this.startTime = this.time.now;

    this.timerText = this.add
      .text(400, 10, "Time: 0s", { fontSize: "18px", fill: "#ffffff" })
      .setOrigin(0.5, 0); // centered
    this.timerText.setDepth(1000);
    this.timerText.setScrollFactor(0);

    // Upgrades
    this.upgrades = [
      // {
      //   key: "maxHp",
      //   label: "Increase Max Health (+20)",
      //   apply: () => {
      //     this.playerStats.maxHp += 20;
      //     this.playerStats.hp += 20;
      //   },
      // },
      {
        key: "moveSpeed",
        label: "Increase Move Speed (+10)",
        apply: () => {
          this.playerStats.moveSpeed += 10;
        },
      },
      {
        key: "enemySlow",
        label: "Decrease Enemy Speed (-5)",
        apply: () => {
          this.enemyStats.moveSpeed = Math.max(
            20,
            this.enemyStats.moveSpeed - 5,
          );
        },
      },
      {
        key: "fireRate",
        label: "Increase Fire Rate (-50)",
        apply: () => {
          this.playerStats.fireRate = Math.max(
            100,
            this.playerStats.fireRate - 50,
          );
          this.updateFireRate(); // refresh the timer
        },
      },
      {
        key: "damage",
        label: "Increase Weapon Damage (+10)",
        apply: () => {
          this.playerStats.damage += 10;
        },
      },
      {
        key: "xpBoost",
        label: "Increase XP Per Orb (+1)",
        apply: () => {
          this.playerStats.xpMultiplier += 1;
        },
      },
    ];
  }

  update() {
    if (this.handleUpgradeInput()) return;
    if (this.handleDeathState()) return;

    this.handlePlayerMovement();
    this.handleEnemyMovement();
    this.handleProjectiles();
    this.updateUI();
    this.updateTimer();
  }

  // --- FUNCTIONS --- //

  // --- UI --- //

  updateUI() {
    this.enemyCounterText.setText("Enemies: " + this.enemies.countActive(true));

    if (!this.isPlayerDead) {
      const healthPercent = Phaser.Math.Clamp(
        this.playerStats.hp / this.playerStats.maxHp,
        0,
        1,
      );

      this.healthBar.width = Math.floor(200 * healthPercent);

      if (healthPercent > 0.6) {
        this.healthBar.setFillStyle(0x00ff00);
      } else if (healthPercent > 0.3) {
        this.healthBar.setFillStyle(0xffff00);
      } else {
        this.healthBar.setFillStyle(0xff0000);
      }
    } else {
      this.healthBar.width = 0;
    }

    this.healthText.setText(
      `${Math.floor(this.playerStats.hp)} / ${this.playerStats.maxHp}`,
    );

    const xpPercent = Phaser.Math.Clamp(
      this.playerStats.xp / this.playerStats.xpToLevel,
      0,
      1,
    );
    this.xpBar.width = Math.floor(200 * xpPercent);
    this.xpText.setText(
      `${this.playerStats.xp} / ${this.playerStats.xpToLevel}`,
    );
    this.levelText.setText("Level: " + this.playerStats.level);
  }

  updateTimer() {
    const elapsedSeconds = Math.floor((this.time.now - this.startTime) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    const paddedSeconds = seconds.toString().padStart(2, "0");

    this.timerText.setText(`${minutes}:${paddedSeconds}`);
  }

  // --- PLAYER --- //

  handlePlayerMovement() {
    const speed = this.playerStats.moveSpeed;
    const body = this.player.body;

    body.setVelocity(0);

    if (this.keys.left.isDown || this.keys.leftArrow.isDown) {
      body.setVelocityX(-speed);
    } else if (this.keys.right.isDown || this.keys.rightArrow.isDown) {
      body.setVelocityX(speed);
    }

    if (this.keys.up.isDown || this.keys.upArrow.isDown) {
      body.setVelocityY(-speed);
    } else if (this.keys.down.isDown || this.keys.downArrow.isDown) {
      body.setVelocityY(speed);
    }
  }

  handlePlayerHit(player, enemy) {
    const now = this.time.now;

    if (now < this.lastDamageTime + this.damageCooldown) {
      return;
    }

    this.lastDamageTime = now;

    this.playerStats.hp = Phaser.Math.Clamp(
      this.playerStats.hp - 10,
      0,
      this.playerStats.maxHp,
    );

    // --- PLAYER HIT FLASH ---
    this.player.setFillStyle(0xff4444); // flash red on hit

    this.time.delayedCall(80, () => {
      if (!this.isPlayerDead && this.player.active) {
        this.player.setFillStyle(0x00ff00); // back to normal green
      }
    });

    if (this.playerStats.hp < 0) {
      this.playerStats.hp = 0;
    }

    // Trigger player death
    if (this.playerStats.hp <= 0 && !this.isPlayerDead) {
      this.isPlayerDead = true;
      this.playerStats.hp = 0;
      this.player.setFillStyle(0x555555);

      // Stop spawning
      this.enemySpawnEvent.remove(false);

      // Stop all enemies
      this.enemies.getChildren().forEach((enemy) => {
        enemy.body.setVelocity(0);
      });

      // Kill health bar visually
      this.healthBar.width = 0;

      // Optional: show death text
      const deathText = this.add
        .text(400, 300, "YOU DIED", {
          fontSize: "48px",
          fill: "#ffffff",
        })
        .setOrigin(0.5);
      deathText.setDepth(1000);
    }
  }

  handleDeathState() {
    if (!this.isPlayerDead) return false;

    this.player.body.setVelocity(0);
    return true;
  }

  // --- ENEMIES --- //

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

    const enemy = this.add.rectangle(x, y, 25, 25, 0xff0000);
    this.physics.add.existing(enemy);
    enemy.body.setAllowGravity(false);
    enemy.body.setImmovable(true);
    enemy.body.setCircle(12);
    enemy.body.setCollideWorldBounds(true);
    enemy.maxHp = this.enemyStats.maxHp;
    enemy.hp = enemy.maxHp;
    enemy.xpValue = this.enemyStats.xpValue;
    enemy.isDead = false;
    enemy.setFillStyle(0xff0000);
    enemy.setDepth(3);

    this.enemies.add(enemy);
  }

  handleEnemyMovement() {
    this.enemies.getChildren().forEach((enemy) => {
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const length = Math.sqrt(dx * dx + dy * dy);

      if (length > 0) {
        const speed = this.enemyStats.moveSpeed;
        enemy.body.setVelocity((dx / length) * speed, (dy / length) * speed);
      }
    });
  }

  // --- PROJECTILES --- //

  fireProjectile() {
    if (this.isPlayerDead) return; // don't shoot when dead

    // Find nearest enemy
    const enemiesAlive = this.enemies.getChildren().filter((e) => !e.isDead);
    if (enemiesAlive.length === 0) return;

    let closest = enemiesAlive[0];
    let minDist = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      closest.x,
      closest.y,
    );

    enemiesAlive.forEach((enemy) => {
      const dist = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        enemy.x,
        enemy.y,
      );
      if (dist < minDist) {
        minDist = dist;
        closest = enemy;
      }
    });

    // Create projectile
    const projectile = this.add.rectangle(
      this.player.x,
      this.player.y,
      8,
      8,
      0xffff00,
    );
    this.physics.add.existing(projectile);
    projectile.body.setAllowGravity(false);
    projectile.speed = 400;
    projectile.target = closest;

    // Add to group
    this.projectiles.add(projectile);
  }

  handleProjectiles() {
    this.projectiles.getChildren().forEach((proj) => {
      if (!proj.target || proj.target.isDead) {
        proj.destroy();
        return;
      }

      const dx = proj.target.x - proj.x;
      const dy = proj.target.y - proj.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const speed = proj.speed;

      if (length < 5) {
        proj.target.hp -= this.playerStats.damage;

        proj.target.setFillStyle(0xff9999);

        this.time.delayedCall(50, () => {
          if (proj.target && proj.target.active) {
            proj.target.setFillStyle(0xff0000);
          }
        });

        if (proj.target.hp <= 0 && !proj.target.isDead) {
          proj.target.hp = 0;
          proj.target.isDead = true;

          const { x, y } = proj.target;

          proj.target.destroy();
          this.spawnXpOrb(x, y, proj.target.xpValue);
        }

        proj.destroy();
        return;
      }

      proj.body.setVelocity((dx / length) * speed, (dy / length) * speed);
    });
  }

  updateFireRate() {
    if (this.fireTimer) {
      this.fireTimer.remove(false); // remove old timer
    }

    this.fireTimer = this.time.addEvent({
      delay: this.playerStats.fireRate,
      callback: this.fireProjectile,
      callbackScope: this,
      loop: true,
    });
  }

  // --- XP --- //

  spawnXpOrb(x, y, value) {
    const orb = this.add.circle(x, y, 6, 0x00aaff);
    this.physics.add.existing(orb);
    orb.body.setAllowGravity(false);
    orb.value = value;
    orb.setDepth(1);

    this.xpOrbs.add(orb);
  }

  collectXp(player, orb) {
    this.playerStats.xp += orb.value * this.playerStats.xpMultiplier;
    orb.destroy();
    this.checkLevelUp();
  }

  // --- LEVEL UPS --- //

  checkLevelUp() {
    while (this.playerStats.xp >= this.playerStats.xpToLevel) {
      this.playerStats.xp -= this.playerStats.xpToLevel;
      this.playerStats.level += 1;
      this.playerStats.xpToLevel = Math.floor(this.playerStats.xpToLevel * 1.3);

      this.showUpgradeMenu();
    }
  }

  showUpgradeMenu() {
    this.physics.pause();
    this.isChoosingUpgrade = true;
    this.selectedUpgradeIndex = 0;

    // Pause enemy spawning
    if (this.enemySpawnEvent) {
      this.enemySpawnEvent.paused = true;
    }

    const overlay = this.add
      .rectangle(400, 300, 800, 600, 0x000000, 0.8)
      .setDepth(2000);

    const choices = Phaser.Utils.Array.Shuffle([...this.upgrades]).slice(0, 3);
    this.currentUpgradeChoices = choices;

    this.upgradeButtons = [];

    choices.forEach((upgrade, index) => {
      const y = 250 + index * 90;

      const button = this.add
        .text(400, y, upgrade.label, {
          fontSize: "26px",
          fill: "#ffffff",
          backgroundColor: "#333333",
          padding: { x: 20, y: 10 },
        })
        .setOrigin(0.5)
        .setDepth(2001);

      this.upgradeButtons.push(button);
    });

    this.upgradeOverlay = overlay;

    this.updateUpgradeSelection();

    // Setup keys
    this.upgradeKeys = this.input.keyboard.addKeys({
      up: "UP",
      down: "DOWN",
      w: "W",
      s: "S",
      confirm: "SPACE",
      enter: "ENTER",
    });

    this.statsText = this.add
      .text(
        400,
        200,
        `
        Level: ${this.playerStats.level}
        HP: ${this.playerStats.hp}/${this.playerStats.maxHp}
        Speed: ${this.playerSpeed}
        Damage: ${this.weaponDamage}
        Fire Rate: 1/${this.fireRate}mss
        Enemy Speed: ${this.enemySpeed}
        XP Multiplier: x ${this.playerStats.xpMultiplier}
        `,
        {
          fontSize: "16px", // slightly smaller
          fill: "#ffffff",
          align: "center", // center-align text
          lineSpacing: 4,
        },
      )
      .setOrigin(0.65, 0.9) // center horizontally
      .setDepth(2001);
  }

  handleUpgradeInput() {
    if (!this.isChoosingUpgrade) return false;

    if (
      Phaser.Input.Keyboard.JustDown(this.upgradeKeys.up) ||
      Phaser.Input.Keyboard.JustDown(this.upgradeKeys.w)
    ) {
      this.selectedUpgradeIndex =
        (this.selectedUpgradeIndex - 1 + this.upgradeButtons.length) %
        this.upgradeButtons.length;

      this.updateUpgradeSelection();
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.upgradeKeys.down) ||
      Phaser.Input.Keyboard.JustDown(this.upgradeKeys.s)
    ) {
      this.selectedUpgradeIndex =
        (this.selectedUpgradeIndex + 1) % this.upgradeButtons.length;

      this.updateUpgradeSelection();
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.upgradeKeys.confirm) ||
      Phaser.Input.Keyboard.JustDown(this.upgradeKeys.enter)
    ) {
      const chosen = this.currentUpgradeChoices[this.selectedUpgradeIndex];
      chosen.apply();
      this.closeUpgradeMenu();
    }

    return true;
  }

  updateUpgradeSelection() {
    this.upgradeButtons.forEach((button, index) => {
      if (index === this.selectedUpgradeIndex) {
        button.setStyle({
          backgroundColor: "#550000",
        });
      } else {
        button.setStyle({
          backgroundColor: "#333333",
        });
      }
    });
  }

  closeUpgradeMenu() {
    this.upgradeOverlay.destroy();
    this.upgradeButtons.forEach((b) => b.destroy());

    this.isChoosingUpgrade = false;
    this.physics.resume();

    // Resume enemy spawning
    if (this.enemySpawnEvent) {
      this.enemySpawnEvent.paused = false;
    }

    this.statsText.destroy();
  }
}
