import { GLTFLoader } from "l-three/jsm/loaders/GLTFLoader.js";

class LGLTFLoader extends GLTFLoader {
    constructor(options) {
        super()
        this.init(options)
    }
    init(options) {
        const {url,success,process,fail} = options
        this.load( url, (res) => success(res), (res) => process(res), (error) => fail(error));
    }

}

export default LGLTFLoader