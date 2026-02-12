import Phaser from "phaser"
import GameScene from "./scenes/GameScene"

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: "#1e1e1e",
  physics: {
    default: "arcade",
    arcade: {
      debug: false
    }
  },
  scene: [GameScene]
}

new Phaser.Game(config)
