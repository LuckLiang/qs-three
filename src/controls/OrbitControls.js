import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

class LOrbitControls extends OrbitControls {
    constructor(camera,domElement) {
        super(camera,domElement)
    }
}

export default LOrbitControls