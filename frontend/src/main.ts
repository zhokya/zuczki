import { rejoin } from './wsManager';
import { updateSendingLoop } from './controls';
import { menuRenderLoop } from './menu';
import { mainCanvasRenderLoop } from './mainCanvas';
import './visuals/fullscreen';

rejoin();

requestAnimationFrame(updateSendingLoop);
requestAnimationFrame(menuRenderLoop);
requestAnimationFrame(mainCanvasRenderLoop);
