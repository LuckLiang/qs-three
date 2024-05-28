import { LCamera as Camera } from "./camera/index";
import * as Renderer from "./renderer/index";
import { LScene as Scene } from "./scene/index";
import { GLTFLoader } from "./modelLoader/index";
import { OrbitControls } from "./controls/index";
import Eventable from "../core/Eventable";
import SingleScene from "./scene/SingleScene";

import Stats from "three/examples/jsm/libs/stats.module.js";
import * as THREE from "three";

/**
 * @class QsThree
 * @classdesc 快速创建一个展示场景
 * @constructor
 * @param {Document} container 场景绑定的DOM元素
 * @param {object} options 配置属性
 * @param {string} options.modelUrl 模型地址，目前默认加载方式为GLTFLoader
 * @param {boolean} options.isGPU 是否开启WebGPU渲染,默认以WebGL渲染
 * @param {boolean} options.isDebug 是否开启Stats面板
 * @param {boolean} options.isShowLoading=false 是否开启加载面板
 * @param {function} options.customLoading 自定义面板回调函数
 * @param {object} options.customLoading.xhr 自定义面板函数
 * @param {number} options.customLoading.xhr.loaded  已加载量
 * @param {number} options.customLoading.xhr.total 总数据量
 * @param {number|string} options.background=0x000000 初始化场景背景
 * @param {number|string} options.skyColor=0x505555 天空颜色
 * @param {number} options.isRotation=false 开启旋转
 * @param {number} options.rotationSpeed=4 旋转速度 默认值为4.0，相当于在60fps时每旋转一周需要15秒
 * @param {array} options.cameraPos=0,0,0 相机初始位置
 * @param {object} options.scene 场景配置
 * @param {number} options.scene.backgroundBlurriness=null 设置背景的模糊度,仅影响分配给Scene.background的环境贴图。有效的输入是0到1之间。
 * @param {Texture} options.scene.environment=null 若该值不为null，则该纹理贴图将会被设为场景中所有物理材质的环境贴图。 然而，该属性不能够覆盖已存在的、已分配给 MeshStandardMaterial.envMap 的贴图。
 * @param {Fog} options.scene.fog=null 一个fog实例定义了影响场景中的每个物体的雾的类型。
 * @param {Material} options.scene.overrideMaterial=null 如果不为空，它将强制场景中的每个物体使用这里的材质来渲染。
 */

class QsThree {
  #groundColor;
  #skyColor;
  #cameraPos;
  #rotationSpeed;
  #isGPU;
  #sceneGLTF;
  #isShowLoading;
  #customLoading;
  #isRotation;
  #clock = new THREE.Clock();

  constructor(container, options) {
    if (
      Renderer.WebGPU.isAvailable() === false &&
      Renderer.WebGL.isWebGL2Available() === false
    ) {
      container.appendChild(Renderer.WebGPU.getErrorMessage());
      throw new Error("No WebGPU or WebGL2 support");
    }
    Object.assign(this, Eventable);
    this.container = container;
    this.#initOptions(options);
    if (options.isDebug) {
      this.stats = new Stats();
      this.stats.domElement.style.position = "absolute";
      this.stats.domElement.classList.add("stats-box");
      container.appendChild(this.stats.dom);
    }
    this.#isShowLoading = options.isShowLoading || false;
    this.#customLoading = options.customLoading;
    this.#init(options);
    if (options.modelUrl) {
      this.#loadModel(options.modelUrl);
    }
    this.#addLight();
    this.#loadControls();
    this.animate = this.#animate();
    this.animate.Play();
    // 添加事件监听器
    window.addEventListener("resize", () => {
      this.#onWindowResized(this);
      /**
       * 窗口变化事件
       * @event QsThree#onWindowReset
       */
      this.emit("onWindowReset");
    });
    /**
     * 获取已加载模型
     * @returns 模型
     */
    this.getModel = function () {
      return this.#sceneGLTF;
    };
  }

  // 初始化参数
  #initOptions(options) {
    const {
      background = 0x000000,
      skyColor = 0x505555,
      cameraPos = [0, 0, 0],
      isRotation = false,
      rotationSpeed = 4,
    } = options;
    this.#groundColor = new THREE.Color(background);
    this.#skyColor = new THREE.Color(skyColor);
    this.#cameraPos = cameraPos;
    this.#isRotation = isRotation;
    this.#rotationSpeed = rotationSpeed;
  }
  // 初始化场景
  #init(options) {
    const { scene } = options;
    // 初始化场景
    this.scene = new Scene();
    this.scene.background = this.#groundColor;
    if (scene) {
      const {
        backgroundBlurriness = null,
        environment = null,
        fog = null,
        overrideMaterial = null,
      } = scene;
      this.scene.backgroundBlurriness = backgroundBlurriness;
      this.scene.environment = environment;
      this.scene.fog = fog;
      this.scene.overrideMaterial = overrideMaterial;
    }

    const width = this.container.offsetWidth; //窗口宽度
    const height = this.container.offsetHeight; //窗口高度
    const k = width / height; //窗口宽高比
    const s = 75; //三维场景显示范围控制系数，系数越大，显示的范围越大
    //初始化相机
    this.camera = new Camera(s, k, 0.1, 10000);
    this.camera.position.set(
      this.#cameraPos[0],
      this.#cameraPos[1],
      this.#cameraPos[2]
    );
    this.camera.lookAt(this.scene.position);

    // 判断环境是否支持WebGPU及WebGL，初始化渲染器
    if (this.isAvailableSys().indexOf("WebGPU") >= 0 && options.isGPU) {
      this.#isGPU = options.isGPU;
      this.renderer = new Renderer.WebGPURenderer({ antialias: true });
    } else if (this.isAvailableSys().indexOf("WebGL") >= 0) {
      this.renderer = new Renderer.WebGLRenderer({ antialias: true });
    }
    this.renderer.setSize(
      this.container.offsetWidth,
      this.container.offsetHeight
    ); //设置渲染区域尺寸
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.VSMShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    //body元素中插入canvas对象
    this.container.appendChild(this.renderer.domElement);
  }
  // 添加灯光
  #addLight() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1); // 白光，强度为1
    this.scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight("rgb(253,253,253)", 1);
    dirLight.position.set(700, 700, 700); // 根据需要自行调整位置

    dirLight.castShadow = true;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 10000;
    dirLight.shadow.camera.right = 1500;
    dirLight.shadow.camera.left = -1500;
    dirLight.shadow.camera.top = 1500;
    dirLight.shadow.camera.bottom = -1500;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;

    // const helper = new THREE.CameraHelper( dirLight.shadow.camera );
    // this.scene.add( helper );
    this.scene.add(dirLight);
    this.scene.add(
      new THREE.HemisphereLight(
        this.#skyColor.value,
        this.#groundColor.value,
        0.1
      )
    );
  }
  // 加载模型
  #loadModel(url) {
    const self = this;
    let loadingDom;
    new GLTFLoader({
      url,
      success(gltf) {
        self.#sceneGLTF = gltf.scene;
        self.scene.add(gltf.scene);
        loadingDom && self.container.removeChild(loadingDom);
        /**
         * 模型加载完成事件
         * @event QsThree#ModeLoaded
         */
        self.emit("ModeLoaded", gltf);
      },
      process({ loaded, total }) {
        /**
         * 模型加载中事件
         * @event QsThree#ModeLoading
         */
        self.emit("ModeLoading", { loaded, total });
        if (self.#isShowLoading && !self.#customLoading) {
          loadingDom && self.container.removeChild(loadingDom);
          loadingDom = self.#createLoadingDom({ loaded, total });
          self.container.appendChild(loadingDom);
        } else if (self.#customLoading) {
          try {
            if (typeof self.#customLoading !== "function")
              throw "customLoading is not a function";
            /**
             * 自定义loading面板函数
             * @property {object} options.isShowLoading.xhr 自定义面板函数
             * @param {number} options.isShowLoading.xhr.loaded  已加载量
             * @param {number} options.isShowLoading.xhr.total 总数据量
             */
            self.#customLoading({ loaded, total });
          } catch (error) {
            console.error(error);
          }
        }
      },
      fail(res) {
        console.log(res);
      },
    });
  }

  #createLoadingDom({ loaded, total }) {
    const loadingDom = document.createElement("div");
    loadingDom.className = "loading";
    loadingDom.style =
      "position: fixed;display:flex;justify-content: center;flex-direction: column;text-align: center;width: 30%;color: rgb(255, 255, 255);top: 50%;left: 50%;transform: translate(-50%, -50%);";
    const loadingDomText = document.createElement("div");

    loadingDomText.textContent = `加载中...`;
    loadingDom.appendChild(loadingDomText);
    const loadingDomProgress = document.createElement("div");

    loadingDomProgress.style = `display:flex;justify-content: space-between;margin-top: 3vh;direction: column;`;
    loadingDom.appendChild(loadingDomProgress);

    const loadingDomDetail = document.createElement("div");
    loadingDomDetail.textContent = `${loaded}/${total}`;
    loadingDomProgress.appendChild(loadingDomDetail);
    const loadingDomRate = document.createElement("div");
    loadingDomRate.textContent = `${Math.round((loaded / total) * 100)}%`;
    loadingDomProgress.appendChild(loadingDomRate);

    const loadingDomProgressBar = document.createElement("div");
    loadingDomProgressBar.style = `display:flex;margin-top: 1vh;border-radius: 3px;overflow: hidden;`;
    loadingDom.appendChild(loadingDomProgressBar);

    const loadingDomProgressBarLoaded = document.createElement("div");
    loadingDomProgressBarLoaded.style = `width: ${Math.round(
      (loaded / total) * 100
    )}%;background: #5bd0ff;height: 6px;`;
    loadingDomProgressBar.appendChild(loadingDomProgressBarLoaded);

    const loadingDomProgressBarUnloaded = document.createElement("div");
    loadingDomProgressBarUnloaded.style = `width: ${
      100 - Math.round((loaded / total) * 100)
    }%;background: #d3d3d3;height: 6px;`;
    loadingDomProgressBar.appendChild(loadingDomProgressBarUnloaded);

    return loadingDom;
  }

  // 加载控制器
  #loadControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.minDistance = 2;
    this.controls.autoRotate = this.#isRotation;
    this.controls.autoRotateSpeed = this.#rotationSpeed;
    // this.controls.maxPolarAngle = Math.PI * 0.5;
  }
  /**
   * 场景动画
   */
  #animate = function () {
    let self = this,
      animationId = null;
    function renderScene() {
      self.stats && self.stats.update();
      self.controls.update(self.#clock.getDelta());
      if (self.#isGPU) {
        self.renderer.renderAsync(self.scene, self.camera);
      } else {
        self.renderer.render(self.scene, self.camera);
      }
      self._RenderAnimate && self._RenderAnimate();
      animationId = requestAnimationFrame(renderScene);
    }
    function resetControls() {
      // 重置相机的位置和方向
      self.camera.position.set(
        self.#cameraPos[0],
        self.#cameraPos[1],
        self.#cameraPos[2]
      );
      self.camera.lookAt(self.scene.position);
      // 重置控制器的目标位置
      self.controls.target.set(0, 0, 0);
      // 重置控制器的其他参数，比如旋转、缩放和平移等
      self.controls.update(); // 更新控制器状态
    }
    function Play() {
      renderScene();
    }
    function Pause() {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    function Reset() {
      resetControls();
      if (self.#isGPU) {
        self.renderer.renderAsync(self.scene, self.camera);
      } else {
        self.renderer.render(self.scene, self.camera);
      }
    }
    function Replay() {
      resetControls();
      renderScene();
    }
    return { Play, Pause, Reset, Replay };
  };
  /**
   * 监听页面变化
   */
  #onWindowResized() {
    this.renderer.setSize(
      this.container.offsetWidth,
      this.container.offsetHeight
    );
    this.camera.aspect =
      this.container.offsetWidth / this.container.offsetHeight;
    this.camera.updateProjectionMatrix();
  }
}

/**
 * 判断当前浏览器是否支持'WebGPU','WebGL'渲染
 * @event QsThree#isAvailableSys
 * @returns 返回浏览器支持的渲染器 undefined | ['WebGPU','WebGL']
 */
QsThree.prototype.isAvailableSys = function () {
  let AvailableSys = [];
  if (Renderer.WebGPU.isAvailable() === true) {
    AvailableSys.push("WebGPU");
  }
  if (Renderer.WebGL.isWebGL2Available() === true) {
    AvailableSys.push("WebGL");
  }
  return AvailableSys.length > 0 ? AvailableSys : undefined;
};

/**
 * 设置渲染器
 * @event QsThree#setRenderer
 * @param {Renderer} renderer
 */
QsThree.prototype.setRenderer = function (renderer) {
  this.renderer = renderer;
};
/**
 * 获取渲染器
 * @event QsThree#getRenderer
 * @return {Renderer} 当前渲染器 renderer
 */
QsThree.prototype.getRenderer = function () {
  return this.renderer;
};
/**
 * 获取当前场景
 * @event QsThree#getScene
 * @return {Scene} scene 当前场景 scene
 */
QsThree.prototype.getScene = function () {
  return this.scene;
};
/**
 * 设置新的场景
 * @event QsThree#setScene
 * @param {Scene} scene
 */
QsThree.prototype.setScene = function (scene) {
  this.scene = scene;
};
/**
 * 需要渲染的动画
 * @param {function} func
 */
QsThree.prototype.addRenderAnimate = function (func) {
  try {
    if (typeof func !== "function") throw "param is not a function";
    this._RenderAnimate = func;
  } catch (error) {
    console.error(error);
  }
};

/**
 * 设置Controls
 * @param {Controls} controls
 */
QsThree.prototype.setControls = function (controls) {
  this.controls = controls;
};

/**
 * 设置围栏
 * @param {Object} options
 * @param {Object} options.l=10 长
 * @param {Object} options.w=10 宽 不传与长相同
 * @param {Object} options.h=10 高 不传与长相同
 * @param {Object} opacity.color=#FF4127 围栏颜色
 * @returns {THREE.Mesh} mesh
 * @example
 * const mesh = qsThree.addShape();
 * mesh.rotateX(-Math.PI / 2);
 * mesh.position.set(20, 0, 0);
 */
QsThree.prototype.addShape = function (options={}) {
  let { l = 20, w, h, color = "#FF4127" } = options;
  if (!w) w = l;
  if (!h) h = l;
  let c = [0, 0, l, 0, l, w, 0, w, 0, 0];
  let posArr = [];
  let uvrr = [];
  for (let i = 0; i < c.length - 2; i += 2) {
    // 围墙多边形上两个点构成一个直线扫描出来一个高度为h的矩形
    // 矩形的三角形1
    posArr.push(
      c[i],
      c[i + 1],
      0,
      c[i + 2],
      c[i + 3],
      0,
      c[i + 2],
      c[i + 3],
      h
    );
    // 矩形的三角形2
    posArr.push(c[i], c[i + 1], 0, c[i + 2], c[i + 3], h, c[i], c[i + 1], h);

    // 注意顺序问题，和顶点位置坐标对应
    uvrr.push(0, 0, 1, 0, 1, 1);
    uvrr.push(0, 0, 1, 1, 0, 1);
  }
  let geometry = new THREE.BufferGeometry(); //声明一个空几何体对象
  // 设置几何体attributes属性的位置position属性
  geometry.attributes.position = new THREE.BufferAttribute(
    new Float32Array(posArr),
    3
  );
  // 设置几何体attributes属性的位置uv属性
  geometry.attributes.uv = new THREE.BufferAttribute(new Float32Array(uvrr), 2);
  geometry.computeVertexNormals();
  const vertexs = {
    normal_vertex: "\n  precision lowp float;\n  precision lowp int;\n  "
      .concat(
        THREE.ShaderChunk.fog_pars_vertex,
        "\n  varying vec2 vUv;\n  void main() {\n    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );\n    vUv = uv;\n    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n    "
      )
      .concat(THREE.ShaderChunk.fog_vertex, "\n  }\n"),
  };

  const fragments = {
    rippleWall_fragment:
      "\n  precision lowp float;\n  precision lowp int;\n  uniform float time;\n  uniform float opacity;\n  uniform vec3 color;\n  uniform float num;\n  uniform float hiz;\n\n  varying vec2 vUv;\n\n  void main() {\n    vec4 fragColor = vec4(0.);\n    float sin = sin((vUv.y - time * hiz) * 10. * num);\n    float high = 0.92;\n    float medium = 0.4;\n    if (sin > high) {\n      fragColor = vec4(mix(vec3(.8, 1., 1.), color, (1. - sin) / (1. - high)), 1.);\n    } else if(sin > medium) {\n      fragColor = vec4(color, mix(1., 0., 1.-(sin - medium) / (high - medium)));\n    } else {\n      fragColor = vec4(color, 0.);\n    }\n\n    vec3 fade = mix(color, vec3(0., 0., 0.), vUv.y);\n    fragColor = mix(fragColor, vec4(fade, 1.), 0.85);\n    gl_FragColor = vec4(fragColor.rgb, fragColor.a * opacity * (1. - vUv.y));\n  }\n",
  };

  const custMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: {
        type: "pv2",
        value: 0,
      },
      color: {
        type: "uvs",
        value: new THREE.Color(color),
      },
      opacity: {
        type: "pv2",
        value: 1.0,
      },
      num: {
        type: "pv2",
        value: 10,
      },
      hiz: {
        type: "pv2",
        value: 0.15,
      },
    },
    vertexShader: vertexs.normal_vertex,
    fragmentShader: fragments.rippleWall_fragment,
    blending: THREE.AdditiveBlending,
    transparent: !0,
    depthWrite: !1,
    depthTest: !0,
    side: THREE.DoubleSide,
  });

  let mesh = new THREE.Mesh(geometry, custMaterial); //网格模型对象Mesh
  this.scene.add(mesh);
  return mesh;
};

export { QsThree };
export * from "../plugins/index";
export { SingleScene, THREE, GLTFLoader };
