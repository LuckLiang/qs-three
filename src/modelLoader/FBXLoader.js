import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

class LFBXLoader extends FBXLoader {
    constructor(options) {
        super()
        this.init(options)
    }
    init(options) {
        const {url,success,process,fail} = options
        this.load( url, (res) => success(res), (res) => process(res), (error) => fail(error));
    }

}

export default LFBXLoader