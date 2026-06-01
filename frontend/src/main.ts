import { rejoin } from './wsManager';
import { updateSendingLoop } from './controls';
import { menuRenderLoop } from './menu/smallCanvas';
import { mainCanvasRenderLoop } from './mainCanvas';
import './visuals/fullscreen';

rejoin();

requestAnimationFrame(updateSendingLoop);
requestAnimationFrame(menuRenderLoop);
requestAnimationFrame(mainCanvasRenderLoop);
