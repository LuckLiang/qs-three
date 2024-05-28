import WebGPU  from 'three/examples/jsm/capabilities/WebGPU.js';
import WebGPURenderer from 'three/examples/jsm/renderers/webgpu/WebGPURenderer.js';

class LWebGPURenderer extends WebGPURenderer {
    constructor(options) {        
        super(options)
    }
}
export default LWebGPURenderer
export {WebGPU ,LWebGPURenderer}
