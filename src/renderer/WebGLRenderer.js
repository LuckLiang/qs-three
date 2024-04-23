import WebGL from 'l-three/jsm/capabilities/WebGL.js';
import { WebGLRenderer } from 'three';

class LWebGLRenderer extends WebGLRenderer {
    constructor(options) {        
        super(options)
    }
}
export default LWebGLRenderer
export {WebGL,LWebGLRenderer}
