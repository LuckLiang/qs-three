import * as THREE from "three";
import { EventDispatcher } from "three";
import { Octree } from "three/examples/jsm/math/Octree.js";
import { Capsule } from "three/examples/jsm/math/Capsule.js";
const GRAVITY = 50;

const _changeEvent = { type: "change" };
const _lockEvent = { type: "lock" };
const _unlockEvent = { type: "unlock" };
const _keyDownEvent = { type: "keyDown" };
const _keyUpEvent = { type: "keyUp" };
const _walkEvent = { type: "walk" };
const _jumpEvent = { type: "jump" };
const _switchPerspective = { type: "switch" };

const STEPS_PER_FRAME = 5;

const _euler = new THREE.Euler(0, 0, 0, "YXZ");

const clock = new THREE.Clock();

const _PI_2 = Math.PI / 2;
// 矫正模型塌陷高度
let CorrectionHeight = 3.6;
// 模型高度
let CharacterHeight = 1.8;
// 步幅
let Stride = 20
// 跳起高度
let JumpHeight = 15
const keyStates = {};
/**
 * @class PlayerController
 * @classdesc 支持第一人称/第三人称切换控制器
 * @constructor
 * @param camera
 * @param world 世界模型 用于八叉树计算碰撞
 * @param domElement 操作说明dom
 * @param character 人物模型
 * @param stride 步幅 默认值20
 * @param jumpHeight 跳跃高度，默认值15
 * @param isFirstPerson 是否为第一人称，false为第三人称
 */
class PlayerController extends EventDispatcher {
  constructor(camera, domElement, options) {
    super();
    let { world, character, stride, jumpHeight, isFirstPerson = true } = options
    
    if (stride) Stride=stride
    if (jumpHeight) JumpHeight = jumpHeight 
    
    const size =getModelHeight(character);
    CorrectionHeight = 1.32;
    CharacterHeight = size.y;
    this.camera = camera;
    this.camera.lookAt(new THREE.Vector3(1, size.y, 0));
    this.world = world;
    this.character = character;
    this.domElement = domElement;

    this.isLocked = false;
    // 视角
    // Set to constrain the pitch of the camera
    // Range is 0 to Math.PI radians
    this.minPolarAngle = 0; // radians
    this.maxPolarAngle = Math.PI; // radians
    this.isFirstPerson = isFirstPerson; // 当前是否为第一人称视角

    // 碰撞及控制
    this.worldOctree = new Octree();
    this.worldOctree.fromGraphNode(world);
    this.playerCollider = new Capsule(
      new THREE.Vector3(0, 0.35, 0), new THREE.Vector3(0, 1, 0),
      0.66
    );

    this.playerVelocity = new THREE.Vector3();
    this.playerDirection = new THREE.Vector3();
    this.pointerSpeed = 1.0;

    this.playerOnFloor = true;
    // 鼠标锁定
    this._onMouseMove = onMouseMove.bind(this);
    this._onPointerlockChange = onPointerlockChange.bind(this);
    this._onPointerlockError = onPointerlockError.bind(this);

    this.connect();
    this.update();
    /**
     * 获取相机
     * @returns {Camera} 返回控制器相机camera
     */
    this.getCamera = () => {
      return this.camera;
    };
  }
  update() {
    const deltaTime = Math.min(0.05, clock.getDelta()) / STEPS_PER_FRAME;

    // we look for collisions in substeps to mitigate the risk of
    // an object traversing another too quickly for detection.

    for (let i = 0; i < STEPS_PER_FRAME; i++) {
      this.controls(deltaTime);

      this.updatePlayer(deltaTime);
    }
  }
  connect() {
    this.domElement.ownerDocument.addEventListener(
      "mousemove",
      this._onMouseMove
    );
    this.domElement.ownerDocument.addEventListener(
      "pointerlockchange",
      this._onPointerlockChange
    );
    this.domElement.ownerDocument.addEventListener(
      "pointerlockerror",
      this._onPointerlockError
    );
    document.addEventListener("keydown", (event) => {
      keyStates[event.code] = true;
      /**
       * 键盘按下事件
       * @event PlayerController#keyDown
       */
      this.dispatchEvent(_keyDownEvent)
    });

    document.addEventListener("keyup", (event) => {
      keyStates[event.code] = false;
      /**
       * 键盘弹起事件
       * @event PlayerController#keyUp
       */
      this.dispatchEvent(_keyUpEvent)
    });
  }

  disconnect() {
    this.domElement.ownerDocument.removeEventListener(
      "mousemove",
      this._onMouseMove
    );
    this.domElement.ownerDocument.removeEventListener(
      "pointerlockchange",
      this._onPointerlockChange
    );
    this.domElement.ownerDocument.removeEventListener(
      "pointerlockerror",
      this._onPointerlockError
    );
    document.removeEventListener("keydown");

    document.removeEventListener("keyup");
  }

  dispose() {
    this.disconnect();
  }

  lock() {
    this.domElement.requestPointerLock();
  }

  unlock() {
    this.domElement.ownerDocument.exitPointerLock();
  }

  playerCollisions() {
    const result = this.worldOctree.capsuleIntersect(this.playerCollider);

    this.playerOnFloor = false;

    if (result) {
      this.playerOnFloor = result.normal.y > 0;

      if (!this.playerOnFloor) {
        this.playerVelocity.addScaledVector(
          result.normal,
          -result.normal.dot(this.playerVelocity)
        );
      }

      this.playerCollider.translate(result.normal.multiplyScalar(result.depth));
    }
  }

  controls(deltaTime) {
    if (!this.isLocked) return
    // gives a bit of air control
    const speedDelta = deltaTime * (this.playerOnFloor ? Stride : Stride*.23);
    if (keyStates["KeyW"]) {
      this.playerVelocity.add(
        this.getForwardVector().multiplyScalar(speedDelta)
      );
    }

    if (keyStates["KeyS"]) {
      this.playerVelocity.add(
        this.getForwardVector().multiplyScalar(-speedDelta)
      );
    }

    if (keyStates["KeyA"]) {
      this.playerVelocity.add(this.getSideVector().multiplyScalar(-speedDelta));
    }

    if (keyStates["KeyD"]) {
      this.playerVelocity.add(this.getSideVector().multiplyScalar(speedDelta));
    }

    if (keyStates["KeyF"]) {
      this.isFirstPerson = !this.isFirstPerson;
      keyStates["KeyF"] = false;
    }

    if (this.playerOnFloor) {
      if (keyStates["Space"]) {
        this.playerVelocity.y = JumpHeight;
      }
    }
    if (keyStates["KeyA"] || keyStates["KeyD"] || keyStates["KeyS"] || keyStates["KeyW"]) {
      /**
       * 移动监听回调
       * @event PlayerController#walk
       */
      this.dispatchEvent(_walkEvent);
    } else if (this.playerOnFloor && keyStates["Space"]) {
      /**
       * 跳跃监听回调
       * @event PlayerController#jump
       */
      this.dispatchEvent(_jumpEvent);
    } else if (this.playerOnFloor && keyStates["KeyF"]) {
      /**
       * 视角转换监听回调
       * @event PlayerController#switch
       */
      this.dispatchEvent(_switchPerspective);
    }
  }

  updatePlayer(deltaTime) {
    let damping = Math.exp(-4 * deltaTime) - 1;

    if (!this.playerOnFloor) {
      this.playerVelocity.y -= GRAVITY * deltaTime;

      // small air resistance
      damping *= 0.1;
    }

    this.playerVelocity.addScaledVector(this.playerVelocity, damping);

    const deltaPosition = this.playerVelocity.clone().multiplyScalar(deltaTime);
    this.playerCollider.translate(deltaPosition);
    const resPos = this.playerCollider.end;
    this.camera.position.copy(resPos.clone());

    if (this.character) {
      this.character.position.copy(resPos.clone());
      this.character.position.setY(resPos.y - CorrectionHeight);
      if (!this.isFirstPerson) {
        this.character.visible = true;
        const relativeCameraOffset = new THREE.Vector3(0, CharacterHeight+0.1, -(CharacterHeight+.8));
        const cameraOffset = relativeCameraOffset.applyMatrix4(
          this.character.matrixWorld
        );
        this.camera.position.x = cameraOffset.x;
        this.camera.position.y = cameraOffset.y;
        this.camera.position.z = cameraOffset.z;
      } else {
        this.character.visible = false;
      }
    }
    this.playerCollisions();
  }

  getForwardVector() {
    this.camera.getWorldDirection(this.playerDirection);
    this.playerDirection.y = 0;
    this.playerDirection.normalize();

    return this.playerDirection;
  }

  getSideVector() {
    this.camera.getWorldDirection(this.playerDirection);
    this.playerDirection.y = 0;
    this.playerDirection.normalize();
    this.playerDirection.cross(this.camera.up);

    return this.playerDirection;
  }
}

function onMouseMove(event) {
  if (this.isLocked === false) return;

  const movementX =
    event.movementX || event.mozMovementX || event.webkitMovementX || 0;
  const movementY =
    event.movementY || event.mozMovementY || event.webkitMovementY || 0;

  const camera = this.camera;
  _euler.setFromQuaternion(camera.quaternion);

  _euler.y -= movementX * 0.001 * this.pointerSpeed;
  _euler.x -= movementY * 0.001 * this.pointerSpeed;

  _euler.x = Math.max(
    _PI_2 - this.maxPolarAngle,
    Math.min(_PI_2 - this.minPolarAngle, _euler.x)
  );

  camera.quaternion.setFromEuler(_euler);
  if (!this.isFirstPerson) {
    this.character.rotation.y -= Math.min(
      _PI_2 - this.minPolarAngle,
      movementX * 0.001 * this.pointerSpeed
    );
    // 获取模型的前向向量
    const modelForward = new THREE.Vector3();
    this.character.getWorldDirection(modelForward).negate(); // 取反得到向后向量

    // 计算相机的新位置
    const newPosition = this.character.position
      .clone()
      .add(modelForward.multiplyScalar(1)); // 沿模型前向向量的负方向移动

    camera.position.copy(newPosition);
    camera.lookAt(this.character.position);
  }
  /**
   * 鼠标移动回调
   * @event PlayerController#change
   */
  this.dispatchEvent(_changeEvent);
}

function onPointerlockChange() {
  if (this.domElement.ownerDocument.pointerLockElement === this.domElement) {
    /**
     * 锁定鼠标回调
     * @event PlayerController#lock
     */
    this.dispatchEvent(_lockEvent);
    this.isLocked = true;
  } else {
    /**
     * 移除锁定鼠标回调
     * @event PlayerController#unlock
     */
    this.dispatchEvent(_unlockEvent);
    this.isLocked = false;
  }
}

function onPointerlockError() {
  console.error("THREE.PointerLockControls: Unable to use Pointer Lock API");
}

function getModelHeight(mesh) {
  let geometry;
  if (mesh instanceof THREE.Object3D) {
    geometry = mesh;
  } else if (mesh.children) {
    mesh.children.forEach((child) => {
      getModelHeight(child);
    });
  }
  const box = new THREE.Box3();
  box.setFromObject(geometry);
  const size = new THREE.Vector3();
  box.getSize(size);
  return size
}
export default PlayerController;
