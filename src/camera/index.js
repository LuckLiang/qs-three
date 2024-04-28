import { PerspectiveCamera } from 'three';
export class LCamera extends PerspectiveCamera {
    constructor(fov, aspect, near, far) {        
        super(fov, aspect, near, far)
    }
}
export default LCamera;