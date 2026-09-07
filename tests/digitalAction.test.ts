import { describe, expect, it } from 'vitest';
import { DigitalAction } from '../src/systems/DigitalAction';

describe('DigitalAction', () => {
  it('emits one press and one release for a held action', () => {
    const action = new DigitalAction();
    expect(action.read(false)).toEqual({ down: false, pressed: false, released: false });
    expect(action.read(true)).toEqual({ down: true, pressed: true, released: false });
    expect(action.read(true)).toEqual({ down: true, pressed: false, released: false });
    expect(action.read(false)).toEqual({ down: false, pressed: false, released: true });
  });

  it('does not release while another binding keeps the action down', () => {
    const action = new DigitalAction();
    action.read(true);
    expect(action.read(true)).toEqual({ down: true, pressed: false, released: false });
  });
});
