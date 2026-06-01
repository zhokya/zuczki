import { rejoin } from './wsManager';
import { updateSendingLoop } from './controls';
import { smallCanvasRenderLoop } from './menu/smallCanvas';
import { mainCanvasRenderLoop } from './mainLoop';
import './visuals/fullscreen';

rejoin();

requestAnimationFrame(updateSendingLoop);
requestAnimationFrame(smallCanvasRenderLoop);
requestAnimationFrame(mainCanvasRenderLoop);
