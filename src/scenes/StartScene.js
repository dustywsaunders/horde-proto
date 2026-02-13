import Phaser from "phaser";

export default class StartScene extends Phaser.Scene {
  constructor() {
    super("StartScene");
  }

  create() {
    const { width, height } = this.scale;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x5c9e67);

    // Title
    this.add
      .text(width / 2, 120, "Claws on the Course", {
        fontSize: "48px",
        fill: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    // Instructions
    this.add
      .text(
        width / 2,
        240,
        `
Crayfish are taking over your local disc golf course
There is only one solution - DISCS

Use WASD / Arrow Keys to Move
ENTER / SPACE to Choose Upgrades
ESC to Pause Game

Auto throw discs at nearest enemy
KILL THEM ALL!

Press ENTER or SPACE to start
      `,
        {
          fontSize: "18px",
          fill: "#e1e0e0ff",
          align: "center",
          lineSpacing: 10,
        },
      )
      .setOrigin(0.5, 0.3);

    // Input
    this.startKeys = this.input.keyboard.addKeys({
      enter: "ENTER",
      space: "SPACE",
    });
  }

  update() {
    if (
      Phaser.Input.Keyboard.JustDown(this.startKeys.enter) ||
      Phaser.Input.Keyboard.JustDown(this.startKeys.space)
    ) {
      this.scene.start("GameScene");
    }
  }
}
