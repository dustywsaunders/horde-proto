import Phaser from "phaser"

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene")
  }

  preload() {}

  create() {
    // Set world bounds
    this.physics.world.setBounds(0, 0, 800, 600)

    // Add simple player placeholder
    this.player = this.add.rectangle(400, 300, 40, 40, 0x00ff00)
    this.physics.add.existing(this.player)

    this.player.body.setCollideWorldBounds(true)

    this.cursors = this.input.keyboard.createCursorKeys()
  }

  update() {
    const speed = 200
    const body = this.player.body

    body.setVelocity(0)

    if (this.cursors.left.isDown) {
      body.setVelocityX(-speed)
    } else if (this.cursors.right.isDown) {
      body.setVelocityX(speed)
    }

    if (this.cursors.up.isDown) {
      body.setVelocityY(-speed)
    } else if (this.cursors.down.isDown) {
      body.setVelocityY(speed)
    }
  }
}
