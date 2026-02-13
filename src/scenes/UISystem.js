// UISystem.js
export default class UISystem {
  constructor(scene) {
    this.scene = scene;
    this.createUI();
  }

  createUI() {
    const scene = this.scene;

    // Enemy counter
    this.enemyCounterText = scene.add
      .text(10, 10, "Kill Count: 0", {
        fontSize: "18px",
        fill: "#393939ff",
      })
      .setDepth(1000)
      .setScrollFactor(0);

    // Health bar background
    this.healthBarBg = scene.add
      .rectangle(10, 40, 200, 20, 0x222222)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1000)
      .setAlpha(0.7);

    // Health bar fill
    this.healthBar = scene.add
      .rectangle(10, 40, 200, 20, 0x00ff00)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1001)
      .setAlpha(0.7);

    this.healthText = scene.add
      .text(10, 65, "", {
        fontSize: "14px",
        fill: "#393939ff",
      })
      .setScrollFactor(0)
      .setDepth(1002);

    // Level text
    this.levelText = scene.add
      .text(580, 10, "Level: 1", { fontSize: "18px", fill: "#393939ff" })
      .setDepth(1000)
      .setScrollFactor(0);

    // XP bar background
    this.xpBarBg = scene.add
      .rectangle(580, 40, 200, 20, 0x222222)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1000)
      .setAlpha(0.7);

    // XP bar fill
    this.xpBar = scene.add
      .rectangle(580, 40, 0, 20, 0x00aaff)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(1001)
      .setAlpha(0.7);

    this.xpText = scene.add
      .text(790, 65, "", {
        fontSize: "14px",
        fill: "#393939ff",
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(1002);

    // Timer
    this.timerText = scene.add
      .text(400, 10, "0:00", { fontSize: "18px", fill: "#393939ff" })
      .setOrigin(0.5, 0)
      .setDepth(1000)
      .setScrollFactor(0);
  }

  update() {
    const scene = this.scene;
    const ps = scene.playerStats;

    // Enemy count
    this.enemyCounterText.setText("Kill Count: " + scene.enemiesKilled);

    // Health
    if (!scene.isPlayerDead) {
      const hpPercent = Phaser.Math.Clamp(ps.hp / ps.maxHp, 0, 1);
      this.healthBar.width = Math.floor(200 * hpPercent);

      if (hpPercent > 0.6) {
        this.healthBar.setFillStyle(0x00ff00);
      } else if (hpPercent > 0.3) {
        this.healthBar.setFillStyle(0xffff00);
      } else {
        this.healthBar.setFillStyle(0xff0000);
      }
    } else {
      this.healthBar.width = 0;
    }

    this.healthText.setText(`${Math.floor(ps.hp)} / ${ps.maxHp}`);

    // XP
    const xpPercent = Phaser.Math.Clamp(ps.xp / ps.xpToLevel, 0, 1);
    this.xpBar.width = Math.floor(200 * xpPercent);
    this.xpText.setText(`${ps.xp} / ${ps.xpToLevel}`);
    this.levelText.setText("Level: " + ps.level);

    // Timer
    const totalSeconds = Math.floor(this.scene.runTime / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    this.timerText.setText(`${minutes}:${seconds.toString().padStart(2, "0")}`);
  }
}
