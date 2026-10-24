import test from 'node:test';
import assert from 'node:assert/strict';
import { boundGuideWindow, initialGuideWindow } from './guideWindow.ts';

test('the desktop guide opens compactly above the lower-right map controls', () => {
  assert.deepEqual(initialGuideWindow(1440,1000),{x:730,y:460,width:600,height:470});
});

test('dragging, oversizing and viewport changes keep the entire guide reachable', () => {
  for (const [width,height] of [[1440,1000],[800,600],[390,844],[844,390]]) {
    for (const rect of [initialGuideWindow(width,height),{x:-500,y:3000,width:2000,height:2000},{x:3000,y:-100,width:1,height:1}]) {
      const result=boundGuideWindow(rect,width,height);
      assert.ok(result.x>=12&&result.y>=12);
      assert.ok(result.width<=width-24&&result.height<=height-24);
      assert.ok(result.x+result.width<=width-12&&result.y+result.height<=height-12);
      assert.ok(result.width>=Math.min(420,width-24)&&result.height>=Math.min(340,height-24));
    }
  }
});
