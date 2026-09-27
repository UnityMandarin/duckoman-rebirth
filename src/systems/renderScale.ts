import Phaser from 'phaser';
import { TUNING } from '../config/tuning';

const { width: WIDTH, height: HEIGHT } = TUNING.simulation;
const MAX_SCALE = 4;

/**
 * Scenes are laid out in TUNING.simulation units but the canvas is this many times larger, so it
 * covers the window in physical pixels instead of being stretched (and blurred) to fit.
 */
function fitScale(): number {
  if (typeof window === 'undefined') return 1;
  const fit = Math.min(window.innerWidth / WIDTH, window.innerHeight / HEIGHT);
  return Phaser.Math.Clamp(Math.ceil(fit * (window.devicePixelRatio || 1)), 1, MAX_SCALE);
}

let scale = fitScale();

/** Canvas pixels per layout unit. Changes when the window is resized. */
export function renderScale(): number { return scale; }

export function canvasSize(): { width: number; height: number } { return { width: WIDTH * scale, height: HEIGHT * scale }; }

interface Registered { scene: Phaser.Scene; hud: Phaser.Cameras.Scene2D.Camera; }
const registered = new Set<Registered>();

/**
 * Phaser zooms around the camera centre, which makes a zoomed camera's scrollX sit left of what it
 * shows. Scene code (parallax, scenery culling) expects scrollX to be the view's top-left, as it is
 * at zoom 1, so run Phaser's follow, deadzone and bounds logic in its own terms and convert back.
 */
function keepScrollAtViewCorner(camera: Phaser.Cameras.Scene2D.Camera): void {
  const preRender = camera.preRender.bind(camera);
  camera.preRender = () => {
    const lagX = camera.width / 2 * (1 - 1 / camera.zoomX), lagY = camera.height / 2 * (1 - 1 / camera.zoomY);
    camera.scrollX -= lagX; camera.scrollY -= lagY;
    preRender();
    camera.scrollX += lagX; camera.scrollY += lagY;
  };
}

const sharpen = (object: Phaser.GameObjects.GameObject): void => {
  if (object instanceof Phaser.GameObjects.Text) object.setResolution(scale);
};

/** Scales the main camera, adds a matching HUD camera for scroll-factor-0 objects, and keeps text at full resolution. */
export function setupRenderScale(scene: Phaser.Scene, hudName: string): Phaser.Cameras.Scene2D.Camera {
  const main = scene.cameras.main.setZoom(scale);
  keepScrollAtViewCorner(main);
  scene.children.list.forEach(sharpen);
  scene.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, sharpen);
  const { width, height } = canvasSize();
  const entry = { scene, hud: scene.cameras.add(0, 0, width, height).setOrigin(0).setZoom(scale).setName(hudName) };
  registered.add(entry);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE, sharpen);
    registered.delete(entry);
  });
  return entry.hud;
}

/** Re-picks the render scale whenever the window changes size. Returns a cleanup function. */
export function installRenderScale(game: Phaser.Game): () => void {
  const onResize = (): void => {
    const next = fitScale();
    if (next === scale) return;
    const ratio = next / scale;
    scale = next;
    const { width, height } = canvasSize();
    game.scale.setGameSize(width, height);
    for (const { scene, hud } of registered) {
      const main = scene.cameras.main;
      main.setSize(width, height).setZoom(main.zoomX * ratio, main.zoomY * ratio);
      hud.setSize(width, height).setZoom(scale);
      scene.children.list.forEach(sharpen);
    }
  };
  window.addEventListener('resize', onResize);
  return () => window.removeEventListener('resize', onResize);
}
