import { OrbitControls } from 'l-three/jsm/controls/OrbitControls.js';

class LOrbitControls extends OrbitControls {
    constructor(camera,domElement) {
        super(camera,domElement)
    }
}

export default LOrbitControls