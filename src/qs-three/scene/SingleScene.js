import { Scene, WebGLRenderTarget } from "three";

class SingleScene extends Scene {
  constructor(renderer, camera, options) {
    super(options);
    this.renderer = renderer;
    this.camera = camera;
    const renderTargetParameters = {
      stencilBuffer: false,
    };
      
    this.fbo = new WebGLRenderTarget(
      renderer.domElement.offsetWidth,
      renderer.domElement.offsetHeight,
      renderTargetParameters
    );
  }

  render(rtt = false) {
    if (rtt) {
      this.renderer.setRenderTarget(this.fbo);
      this.renderer.clear();
      this.renderer.render(this, this.camera);
    } else {
      this.renderer.setRenderTarget(null);
      this.renderer.render(this, this.camera);
    }
  }
}
export default SingleScene