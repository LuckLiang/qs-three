
import * as TWEEN from 'three/examples/jsm/libs/tween.module.js';

/**
 * @param object3D
 * @param targetCamera
 * @param [options.duration]
 * @param [options.easingFunction]
 */
class SmoothTransition {
  constructor(object3D, targetCamera, duration = 500, easingFunction = TWEEN.Easing.Quadratic.Out) {
      this.object3D = object3D;
      this.targetCamera = targetCamera;
      this.duration = duration;
      this.easingFunction = easingFunction;
    }
  
    startTransition(isThirdPerson) {
      if (isThirdPerson) {
        this.transitionToThirdPerson();
      } else {
        this.transitionToFirstPerson();
      }
    }
  
    transitionToThirdPerson() {
      const currentPos = this.targetCamera.position.clone();
      const targetPos = new THREE.Vector3()
        .copy(this.object3D.position)
        .add(new THREE.Vector3(0, 2, -5)); // 自定义距离和方向
  
      new TWEEN.Tween(currentPos)
        .to(targetPos, this.duration)
        .easing(this.easingFunction)
        .onUpdate(() => {
          this.targetCamera.position.lerpVectors(currentPos, targetPos, this.targetCamera.position.lerpSpeed || 0.1);
          this.targetCamera.lookAt(this.object3D.position);
        })
        .start();
    }
  
    transitionToFirstPerson() {
      // 使用类似的方法将相机位置平滑过渡回原点
      // ...
    }
  }
  
export default SmoothTransition