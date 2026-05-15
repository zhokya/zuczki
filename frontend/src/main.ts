import { rejoin } from './wsManager';
import { updateSendingLoop } from './controls';
import { menuRenderLoop } from './menu';
import { mainCanvasRenderLoop } from './mainCanvas';

rejoin();

requestAnimationFrame(updateSendingLoop);
requestAnimationFrame(menuRenderLoop);
requestAnimationFrame(mainCanvasRenderLoop);
