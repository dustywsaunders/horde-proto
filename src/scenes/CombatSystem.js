// CombatSystem.js
export default class CombatSystem {
  constructor(scene) {
    this.scene = scene;
  }

  fireProjectile() {
    const scene = this.scene;

    if (scene.isPlayerDead) return;

    const enemiesAlive = scene.enemies.getChildren().filter((e) => !e.isDead);

    if (enemiesAlive.length === 0) return;

    let closest = enemiesAlive[0];
    let minDist = Phaser.Math.Distance.Between(
      scene.player.x,
      scene.player.y,
      closest.x,
      closest.y,
    );

    enemiesAlive.forEach((enemy) => {
      const dist = Phaser.Math.Distance.Between(
        scene.player.x,
        scene.player.y,
        enemy.x,
        enemy.y,
      );
      if (dist < minDist) {
        minDist = dist;
        closest = enemy;
      }
    });

    const projectile = scene.add.sprite(scene.player.x, scene.player.y, "disc");
    projectile.setDisplaySize(16, 16);
    projectile.rotation += 1;

    scene.physics.add.existing(projectile);
    projectile.body.setAllowGravity(false);
    projectile.speed = 400;
    projectile.target = closest;

    scene.projectiles.add(projectile);
  }

  updateProjectiles() {
    const scene = this.scene;

    scene.projectiles.getChildren().forEach((proj) => {
      if (!proj.target || proj.target.isDead) {
        proj.destroy();
        return;
      }

      const dx = proj.target.x - proj.x;
      const dy = proj.target.y - proj.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const speed = proj.speed;

      if (length < 5) {
        this.applyDamage(proj.target);
        proj.destroy();
        return;
      }

      // Disc trail
      const trail = scene.add.image(proj.x, proj.y, "disc");
      trail.setDisplaySize(16, 16);
      trail.setAlpha(0.3); // transparency
      trail.setDepth(proj.depth - 1);

      scene.tweens.add({
        targets: trail,
        alpha: 0,
        scale: 0.5,
        duration: 250, // length
        onComplete: () => trail.destroy(),
      });

      // Projectile trail limiting
      proj.trailTimer = 0;
      proj.trailTimer += scene.game.loop.delta;

      if (proj.trailTimer > 10) {
        proj.trailTimer = 0; // spawn trail
      }

      proj.body.setVelocity((dx / length) * speed, (dy / length) * speed);
    });
  }

  applyDamage(enemy) {
    const scene = this.scene;

    enemy.hp -= scene.playerStats.damage;

    enemy.setTint(0xffaaaa);

    this.scene.time.delayedCall(50, () => {
      if (enemy.active) enemy.clearTint();
    });

    if (enemy.hp <= 0 && !enemy.isDead) {
      this.killEnemy(enemy);
    }
  }

  killEnemy(enemy) {
    const scene = this.scene;

    enemy.isDead = true;
    const { x, y } = enemy;

    scene.enemiesKilled++;

    enemy.destroy();

    // Decide to drop XP or HEALTH
    // Currently at 20/80 Health to XP ratio
    const dropRoll = Math.random();

    if (dropRoll < 0.2) {
      scene.spawnHealthPickup(x, y, 10);
    } else {
      scene.spawnXpOrb(x, y, enemy.xpValue);
    }
  }
}
