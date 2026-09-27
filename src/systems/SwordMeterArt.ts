import Phaser from 'phaser';

const TEXTURE_WIDTH = 2172;
const TEXTURE_HEIGHT = 724;
const FILL_CROP_Y = 340;
const FILL_CROP_HEIGHT = 44;

export const SWORD_METER = {
  frameX:67, frameY:8, frameWidth:300, frameHeight:64,
  fillX:104, fillY:33.5, fillWidth:187, fillHeight:9.5,
} as const;

/** Place the narrow source slice inside the frame opening using the HUD's 300x64 layout. */
export function alignSwordMeterFill(fill: Phaser.GameObjects.Image): void {
  const scaleY = SWORD_METER.fillHeight / FILL_CROP_HEIGHT;
  fill.setOrigin(0)
    .setPosition(SWORD_METER.fillX, SWORD_METER.fillY - FILL_CROP_Y * scaleY)
    .setDisplaySize(SWORD_METER.fillWidth, TEXTURE_HEIGHT * scaleY)
    .setCrop(0, FILL_CROP_Y, 0, FILL_CROP_HEIGHT);
}

/** Crop the source canvas in proportion to the displayed aperture width. */
export function setSwordMeterCharge(fill: Phaser.GameObjects.Image, charge: number): void {
  const amount = Phaser.Math.Clamp(charge, 0, 1);
  fill.setCrop(0, FILL_CROP_Y, Math.round(TEXTURE_WIDTH * amount), FILL_CROP_HEIGHT);
}

/** Build the same aligned frame and full-charge blade used by the HUD for the swing. */
export function createUltimateSwordVisual(
  scene: Phaser.Scene, x: number, y: number, width = 220, height = 25,
): Phaser.GameObjects.Container {
  const scaleX = width / SWORD_METER.frameWidth;
  const scaleY = height / SWORD_METER.frameHeight;
  const left = -width * 0.9;
  const top = -height / 2;
  const croppedFillHeight = SWORD_METER.fillHeight * scaleY;
  const fillScaleY = croppedFillHeight / FILL_CROP_HEIGHT;
  const fillDisplayHeight = fillScaleY * TEXTURE_HEIGHT;
  const fillTop = top + (SWORD_METER.fillY - SWORD_METER.frameY) * scaleY;
  const sword = scene.add.container(x, y).setDepth(45);
  const fill = scene.add.image(
    left + (SWORD_METER.fillX - SWORD_METER.frameX) * scaleX,
    fillTop - FILL_CROP_Y * fillScaleY,
    'ultimate-sword-fill',
  ).setOrigin(0).setDisplaySize(SWORD_METER.fillWidth * scaleX, fillDisplayHeight);
  fill.setCrop(0, FILL_CROP_Y, TEXTURE_WIDTH, FILL_CROP_HEIGHT);
  const frame = scene.add.image(0, 0, 'ultimate-sword-frame')
    .setOrigin(0.9, 0.5).setDisplaySize(width, height);
  sword.add([fill, frame]);
  return sword;
}
