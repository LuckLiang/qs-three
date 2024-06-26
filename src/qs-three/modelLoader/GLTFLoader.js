import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

class LGLTFLoader extends GLTFLoader {
    constructor(options) {
        super()
        this.init(options)
    }
    init(options) {
        const {url,success=function(){},process=function(){},fail=function(){}} = options
        this.load( url, (res) => success(res), (res) => process(res), (error) => fail(error));
    }

}

export default LGLTFLoader