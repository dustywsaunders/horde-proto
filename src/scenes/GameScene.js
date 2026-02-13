import Phaser from "phaser";
import UISystem from "./UISystem";
import CombatSystem from "./CombatSystem";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  preload() {
    this.load.image("grass", "assets/backgrounds/grass.png");
    this.load.image("player", "assets/sprites/player.png");
    this.load.image("crayfish", "assets/sprites/crayfish.png");
    this.load.image("disc", "assets/sprites/disc.png");
  }

  create() {
    // Add assets
    this.add.tileSprite(400, 300, 800, 600, "grass").setDepth(-10);

    // Reset Safety
    this.isPlayerDead = false;

    // Define systems
    this.ui = new UISystem(this);
    this.combat = new CombatSystem(this);

    // Set pause action
    this.pauseKey = this.input.keyboard.addKey("ESC");

    // Set world bounds
    this.physics.world.setBounds(0, 0, 800, 600);

    // Timer
    this.runTime = 0; // total run time in ms
    this.lastUpdateTime = 0; // used to calculate delta

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
      callback: () => this.combat.fireProjectile(),
      callbackScope: this,
      loop: true,
    });

    // Add simple player placeholder
    this.player = this.add.sprite(400, 300, "player");
    this.player.setDisplaySize(40, 40); // keep collision feel the same
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

    this.enemiesKilled = 0;

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

    // Health Drops
    this.healthPickups = this.physics.add.group();
    this.physics.add.overlap(
      this.player,
      this.healthPickups,
      this.collectHealth,
      null,
      this,
    );

    // Player Level
    this.playerStats.level = 1;
    this.playerStats.xp = 0;
    this.playerStats.xpToLevel = 50; // first level threshold

    // Upgrades
    this.upgrades = [
      {
        key: "maxHp",
        label: "Increase Max Health (+10)",
        apply: () => {
          this.playerStats.maxHp += 10;
        },
      },
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
        label: "Increase Throw Rate (-50ms)",
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
        label: "Increase Disc Damage (+10)",
        apply: () => {
          this.playerStats.damage += 10;
        },
      },
      {
        key: "xpBoost",
        label: "Increase XP Per Orb (+0.2)",
        apply: () => {
          this.playerStats.xpMultiplier += 0.2;
        },
      },
    ];
  }

  update(time, delta) {
    // Handle retry
    if (this.isPlayerDead && this.deathKeys) {
      if (
        Phaser.Input.Keyboard.JustDown(this.deathKeys.enter) ||
        Phaser.Input.Keyboard.JustDown(this.deathKeys.space)
      ) {
        this.scene.start("StartScene");
      }
      return;
    }

    // Handle pause
    if (Phaser.Input.Keyboard.JustDown(this.pauseKey) && !this.isPlayerDead) {
      this.scene.launch("PauseScene");
      this.scene.pause();
      return;
    }

    // Accumulate run time only during active gameplay
    if (!this.isPlayerDead && !this.isChoosingUpgrade) {
      this.runTime += delta;
    }

    if (this.handleUpgradeInput()) return;
    if (this.handleDeathState()) return;

    this.handlePlayerMovement();
    this.handleEnemyMovement();
    this.combat.updateProjectiles();
    this.ui.update();
  }

  // --- FUNCTIONS --- //

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
    // this.player.setFillStyle(0xff4444); // flash red on hit

    // this.time.delayedCall(80, () => {
    //   if (!this.isPlayerDead && this.player.active) {
    //     this.player.setFillStyle(0x00ff00); // back to normal green
    //   }
    // });

    if (this.playerStats.hp < 0) {
      this.playerStats.hp = 0;
    }

    // Trigger player death
    if (this.playerStats.hp <= 0 && !this.isPlayerDead) {
      this.isPlayerDead = true;
      this.playerStats.hp = 0;
      // this.player.setFillStyle(0x555555);

      // Stop spawning
      this.enemySpawnEvent.remove(false);

      // Stop all enemies
      this.enemies.getChildren().forEach((enemy) => {
        enemy.body.setVelocity(0);
      });

      this.add.rectangle(400, 300, 800, 600, 0x000000, 0.8).setDepth(1500);

      // Show death text
      const deathText = this.add
        .text(400, 300, "YOU HAVE BEEN SLAIN BY THE CRAYFISH", {
          fontSize: "36px",
          fill: "#ffffff",
        })
        .setOrigin(0.5);
      deathText.setDepth(2000);

      // Restart instruction
      this.add
        .text(400, 360, "Press ENTER or SPACE to return to menu", {
          fontSize: "20px",
          fill: "#ffffff",
        })
        .setOrigin(0.5)
        .setDepth(2000);

      // Listen for restart input
      this.deathKeys = this.input.keyboard.addKeys({
        enter: "ENTER",
        space: "SPACE",
      });
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

    const enemy = this.add.sprite(x, y, "crayfish");
    enemy.setDisplaySize(25, 25);
    this.physics.add.existing(enemy);
    enemy.body.setAllowGravity(false);
    enemy.body.setImmovable(true);
    enemy.body.setCircle(12);
    enemy.body.setCollideWorldBounds(true);
    enemy.maxHp = this.enemyStats.maxHp;
    enemy.hp = enemy.maxHp;
    enemy.xpValue = this.enemyStats.xpValue;
    enemy.isDead = false;
    enemy.setTint(0xffaaaa);
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

  updateFireRate() {
    if (this.fireTimer) {
      this.fireTimer.remove(false);
      this.fireTimer = null;
    }

    this.fireTimer = this.time.addEvent({
      delay: this.playerStats.fireRate,
      callback: () => this.combat.fireProjectile(),
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

  // --- HEALTH --- //

  spawnHealthPickup(x, y, amount) {
    const pickup = this.add.rectangle(x, y, 10, 10, 0xff77aa);
    this.physics.add.existing(pickup);
    pickup.body.setAllowGravity(false);
    pickup.value = amount;
    pickup.setDepth(1);

    this.healthPickups.add(pickup);
  }

  collectHealth(player, pickup) {
    const ps = this.playerStats;

    ps.hp = Phaser.Math.Clamp(ps.hp + pickup.value, 0, ps.maxHp);

    pickup.destroy();
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
        Player Level: ${this.playerStats.level}
        Player HP: ${this.playerStats.hp}/${this.playerStats.maxHp}
        Disc Speed: ${this.playerStats.moveSpeed}
        Disc Damage: ${this.playerStats.damage}
        Throw Rate: 1/${this.playerStats.fireRate}ms
        Enemy Speed: ${this.enemyStats.moveSpeed}
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
          backgroundColor: "#0096a1ff",
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
