import WebGPU  from 'l-three/jsm/capabilities/WebGPU.js';
import WebGPURenderer from 'l-three/jsm/renderers/webgpu/WebGPURenderer.js';

class LWebGPURenderer extends WebGPURenderer {
    constructor(options) {        
        super(options)
    }
}
export default LWebGPURenderer
export {WebGPU ,LWebGPURenderer}
