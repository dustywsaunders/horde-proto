import Phaser from "phaser";

export default class PauseScene extends Phaser.Scene {
  constructor() {
    super("PauseScene");
  }

  create() {
    const { width, height } = this.scale;

    // Dark overlay
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);

    // Text
    this.add
      .text(width / 2, 260, "PAUSED", {
        fontSize: "48px",
        fill: "#ffffff",
      })
      .setOrigin(0.5);

    this.add
      .text(
        width / 2,
        340,
        `
Press ENTER / SPACE to Resume
Press ESC to Exit to Menu
      `,
        {
          fontSize: "20px",
          fill: "#ffffff",
          align: "center",
          lineSpacing: 10,
        },
      )
      .setOrigin(0.5);

    this.keys = this.input.keyboard.addKeys({
      enter: "ENTER",
      space: "SPACE",
      esc: "ESC",
    });
  }

  update() {
    if (
      Phaser.Input.Keyboard.JustDown(this.keys.enter) ||
      Phaser.Input.Keyboard.JustDown(this.keys.space)
    ) {
      this.scene.stop();
      this.scene.resume("GameScene");
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.esc)) {
      this.scene.stop("GameScene");
      this.scene.start("StartScene");
    }
  }
}
