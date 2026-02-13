import Phaser from "phaser";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  preload() {}

  create() {
    // Set world bounds
    this.physics.world.setBounds(0, 0, 800, 600);

    // Set default values
    this.playerSpeed = 200;
    this.enemySpeed = 80;
    this.fireRate = 1000;
    this.weaponDamage = 15;
    this.xpMultiplier = 1;
    this.enemyHealth = 30;

    // Add simple player placeholder
    this.player = this.add.rectangle(400, 300, 40, 40, 0x00ff00);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.player.setDepth(2);

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

    this.playerMaxHp = 100;
    this.playerHp = 100;
    this.isPlayerDead = false;

    this.lastDamageTime = 0;
    this.damageCooldown = 300; // ms

    // Projectiles
    this.projectiles = this.physics.add.group();

    this.time.addEvent({
      delay: this.fireRate, // ms between shots
      callback: this.fireProjectile,
      callbackScope: this,
      loop: true,
    });

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
    this.playerLevel = 1;
    this.xp = 0;
    this.xpToLevel = 50; // first level threshold

    this.levelText = this.add.text(
      580,
      10, // top-right
      "Level: " + this.playerLevel,
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
      //     this.playerMaxHp += 20;
      //     this.playerHp += 20;
      //   },
      // },
      {
        key: "moveSpeed",
        label: "Increase Move Speed (+10)",
        apply: () => {
          this.playerSpeed += 10;
        },
      },
      {
        key: "enemySlow",
        label: "Decrease Enemy Speed (-5)",
        apply: () => {
          this.enemySpeed = Math.max(20, this.enemySpeed - 5);
        },
      },
      {
        key: "fireRate",
        label: "Increase Fire Rate (-50)",
        apply: () => {
          this.fireRate -= 50;
        },
      },
      {
        key: "damage",
        label: "Increase Weapon Damage (+10)",
        apply: () => {
          this.weaponDamage += 10;
        },
      },
      {
        key: "xpBoost",
        label: "Increase XP Per Orb (+1)",
        apply: () => {
          this.xpMultiplier += 1;
        },
      },
    ];
  }

  update() {
    // Pause gameplay during upgrade
    if (this.isChoosingUpgrade) {
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

      return;
    }

    // Set death state
    if (this.isPlayerDead) {
      this.player.body.setVelocity(0);
      return;
    }

    // Update player controls
    const speed = this.playerSpeed;
    const body = this.player.body;

    body.setVelocity(0);

    // Horizontal
    if (this.keys.left.isDown || this.keys.leftArrow.isDown) {
      body.setVelocityX(-speed);
    } else if (this.keys.right.isDown || this.keys.rightArrow.isDown) {
      body.setVelocityX(speed);
    }

    // Vertical
    if (this.keys.up.isDown || this.keys.upArrow.isDown) {
      body.setVelocityY(-speed);
    } else if (this.keys.down.isDown || this.keys.downArrow.isDown) {
      body.setVelocityY(speed);
    }

    // Update enemy controls
    this.enemies.getChildren().forEach((enemy) => {
      // Movement
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length > 0) {
        const speed = this.enemySpeed;
        enemy.body.setVelocity((dx / length) * speed, (dy / length) * speed);
      }
    });

    // Projectiles
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
        // Apply damage
        proj.target.hp -= this.weaponDamage;

        // --- HIT FLASH ---
        proj.target.setFillStyle(0xff9999); // lighter red

        this.time.delayedCall(50, () => {
          if (proj.target && proj.target.active) {
            proj.target.setFillStyle(0xff0000); // back to normal red
          }
        });

        // Death check
        if (proj.target.hp <= 0 && !proj.target.isDead) {
          proj.target.hp = 0;
          proj.target.isDead = true;

          // Store position BEFORE destroy
          const { x, y } = proj.target;

          proj.target.destroy();

          // Drop XP orb
          this.spawnXpOrb(x, y, proj.target.xpValue);
        }

        proj.destroy();
        return;
      }

      proj.body.setVelocity((dx / length) * speed, (dy / length) * speed);
    });

    // TEMPORARY enemy counter
    this.enemyCounterText.setText("Enemies: " + this.enemies.countActive(true));

    // Health bar
    if (!this.isPlayerDead) {
      const healthPercent = Phaser.Math.Clamp(
        this.playerHp / this.playerMaxHp,
        0,
        1,
      );
      this.healthBar.width = Math.floor(200 * healthPercent);

      // Change color when low
      if (healthPercent > 0.6) {
        this.healthBar.setFillStyle(0x00ff00);
      } else if (healthPercent > 0.3) {
        this.healthBar.setFillStyle(0xffff00);
      } else {
        this.healthBar.setFillStyle(0xff0000);
      }
    } else {
      // Ensure it stays zero
      this.healthBar.width = 0;
    }

    // Update HP text
    this.healthText.setText(
      `${Math.floor(this.playerHp)} / ${this.playerMaxHp}`,
    );

    // XP Bar
    const xpPercent = Phaser.Math.Clamp(this.xp / this.xpToLevel, 0, 1);
    this.xpBar.width = Math.floor(200 * xpPercent);

    // Update XP text
    this.xpText.setText(`${this.xp} / ${this.xpToLevel}`);

    // Player Level Text
    this.levelText.setText("Level: " + this.playerLevel);

    // Timer
    const elapsedSeconds = Math.floor((this.time.now - this.startTime) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    const paddedSeconds = seconds.toString().padStart(2, "0");

    this.timerText.setText(`${minutes}:${paddedSeconds}`);
  }

  // --- FUNCTIONS --- //

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
    enemy.maxHp = this.enemyHealth; // basic HP for first prototype
    enemy.hp = enemy.maxHp;
    enemy.xpValue = 10; // XP granted when killed
    enemy.isDead = false;
    enemy.setFillStyle(0xff0000);
    enemy.setDepth(3);

    this.enemies.add(enemy);
  }

  handlePlayerHit(player, enemy) {
    const now = this.time.now;

    if (now < this.lastDamageTime + this.damageCooldown) {
      return;
    }

    this.lastDamageTime = now;

    this.playerHp = Phaser.Math.Clamp(this.playerHp - 10, 0, this.playerMaxHp);

    // --- PLAYER HIT FLASH ---
    this.player.setFillStyle(0xff4444); // flash red on hit

    this.time.delayedCall(80, () => {
      if (!this.isPlayerDead && this.player.active) {
        this.player.setFillStyle(0x00ff00); // back to normal green
      }
    });

    if (this.playerHp < 0) {
      this.playerHp = 0;
    }

    console.log("HP:", this.playerHp);

    // Trigger player death
    if (this.playerHp <= 0 && !this.isPlayerDead) {
      this.isPlayerDead = true;
      this.playerHp = 0;
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

  spawnXpOrb(x, y, value) {
    const orb = this.add.circle(x, y, 6, 0x00aaff);
    this.physics.add.existing(orb);
    orb.body.setAllowGravity(false);
    orb.value = value;
    orb.setDepth(1);

    this.xpOrbs.add(orb);
  }

  collectXp(player, orb) {
    this.xp += orb.value * this.xpMultiplier;
    orb.destroy();
    this.checkLevelUp();
  }

  checkLevelUp() {
    while (this.xp >= this.xpToLevel) {
      this.xp -= this.xpToLevel;
      this.playerLevel += 1;
      this.xpToLevel = Math.floor(this.xpToLevel * 1.3);

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
        Level: ${this.playerLevel}
        HP: ${this.playerHp}/${this.playerMaxHp}
        Speed: ${this.playerSpeed}
        Damage: ${this.weaponDamage}
        Fire Rate: 1/${this.fireRate}mss
        Enemy Speed: ${this.enemySpeed}
        XP Multiplier: x ${this.xpMultiplier}
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
