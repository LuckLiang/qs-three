import { LCamera as Camera } from "./camera/index";
import * as Renderer from "./renderer/index";
import { LScene as Scene } from "./scene/index";
import { GLTFLoader } from './modelLoader/index';
import { OrbitControls } from './controls/index';
import Eventable from './core/Eventable';


import Stats from 'three/examples/jsm/libs/stats.module.js';
import * as THREE from 'three';

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
    #groundColor
    #skyColor
    #cameraPos
    #rotationSpeed
    #isGPU
    #sceneGLTF
    #isShowLoading
    #customLoading
    #isRotation
    constructor(container, options) {
        if ( Renderer.WebGPU.isAvailable() === false && Renderer.WebGL.isWebGL2Available() === false ) {
            container.appendChild( Renderer.WebGPU.getErrorMessage() );
            throw new Error( 'No WebGPU or WebGL2 support' );
        }
        Object.assign(this, Eventable)
        this.container = container;
        this.#initOptions(options)
        if (options.isDebug) {
            this.stats = new Stats();
            container.appendChild( this.stats.dom );
        }
        this.#isShowLoading = options.isShowLoading || false
        this.#customLoading = options.customLoading
        this.#init(options);
        if (options.modelUrl) {
            this.#loadModel(options.modelUrl)
        }
        this.#addSky()
        this.#loadControls()
        this.animate = this.#animate()
        this.animate.Play()
        // 添加事件监听器
        window.addEventListener('resize', () => { 
            this.#onWindowResized(this);
            /**
             * 窗口变化事件
             * @event QsThree#onWindowReset
             */
            this.emit('onWindowReset')
         });
        /**
         * 获取已加载模型
         * @returns 模型
         */
        this.getModel = function () {
            return this.#sceneGLTF
        }
    }

    // 初始化参数
    #initOptions(options) {
        const {background=0x000000, skyColor=0x505555, cameraPos=[0, 0, 0], isRotation= false, rotationSpeed = 4} = options
        this.#groundColor = new THREE.Color(background)
        this.#skyColor = new THREE.Color(skyColor)
        this.#cameraPos = cameraPos
        this.#isRotation = isRotation
        this.#rotationSpeed = rotationSpeed
    }
    // 初始化场景
    #init(options) {
        const { scene } = options
        // 初始化场景
        this.scene = new Scene();
        this.scene.background = this.#groundColor;
        if (scene) {
            const { backgroundBlurriness = null, environment = null, fog = null, overrideMaterial = null} = scene
            this.scene.backgroundBlurriness = backgroundBlurriness;
            this.scene.environment = environment;
            this.scene.fog = fog ;
            this.scene.overrideMaterial = overrideMaterial;
        }
        
        const width = this.container.offsetWidth; //窗口宽度
        const height = this.container.offsetHeight; //窗口高度
        const k = width / height; //窗口宽高比
        const s = 75; //三维场景显示范围控制系数，系数越大，显示的范围越大
        //初始化相机
        this.camera = new Camera(s, k, 0.1, 1000)
        this.camera.position.set(this.#cameraPos[0],this.#cameraPos[1],this.#cameraPos[2]);
        this.camera.lookAt(this.scene.position);
        
        // 判断环境是否支持WebGPU及WebGL，初始化渲染器
        if (this.isAvailableSys().indexOf("WebGPU") >= 0 && options.isGPU) {
            this.#isGPU = options.isGPU
            this.renderer = new Renderer.WebGPURenderer({antialias: true});
        } else  if (this.isAvailableSys().indexOf("WebGL") >= 0) {
            this.renderer = new Renderer.WebGLRenderer({ antialias: true });
        }
        this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);//设置渲染区域尺寸
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.VSMShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        //body元素中插入canvas对象
        this.container.appendChild(this.renderer.domElement); 
    }
    // 添加天空盒
    #addSky() {
        const ambientLight = new THREE.AmbientLight(0xffffff, .1); // 白光，强度为1
        this.scene.add(ambientLight);
        const dirLight1 = new THREE.DirectionalLight('rgb(253,253,253)', 2);
        const dirLight2 = new THREE.DirectionalLight('rgb(253,253,253)', 2);
        const dirLight3 = new THREE.DirectionalLight('rgb(253,253,253)', 2);
        const dirLight4 = new THREE.DirectionalLight('rgb(253,253,253)', 2);
        dirLight1.position.set(60, 60, 60); // 根据需要自行调整位置
        dirLight2.position.set(60, 60, -60); // 根据需要自行调整位置
        dirLight3.position.set(-60, 60, 60); // 根据需要自行调整位置
        dirLight4.position.set(-60, 60, -60); // 根据需要自行调整位置
        this.scene.add(dirLight1);
        this.scene.add(dirLight2);
        this.scene.add(dirLight3);
        this.scene.add(dirLight4);
        this.scene.add( new THREE.HemisphereLight( this.#skyColor.value, this.#groundColor.value, .1 ) );
    }
    // 加载模型
    #loadModel(url) {
        const self = this
        let loadingDom
        new GLTFLoader({
            url,
            success(gltf) {
                self.#sceneGLTF = gltf.scene
                self.scene.add(gltf.scene)
                loadingDom && self.container.removeChild(loadingDom)
                /**
                 * 模型加载完成事件
                 * @event QsThree#ModeLoaded
                 */
                self.emit('ModeLoaded', gltf)
            },
            process({ loaded, total }) {
                /**
                 * 模型加载中事件
                 * @event QsThree#ModeLoading
                 */
                self.emit('ModeLoading', { loaded, total })
                if (self.#isShowLoading&&!self.#customLoading) {
                    loadingDom&&self.container.removeChild(loadingDom)
                    loadingDom = self.#createLoadingDom({ loaded, total })
                    self.container.appendChild(loadingDom)
                } else if (self.#customLoading) {
                    try {
                        if (typeof self.#customLoading !== 'function') throw 'customLoading is not a function'
                        /**
                         * 自定义loading面板函数
                         * @property {object} options.isShowLoading.xhr 自定义面板函数
                         * @param {number} options.isShowLoading.xhr.loaded  已加载量
                         * @param {number} options.isShowLoading.xhr.total 总数据量
                         */
                        self.#customLoading({ loaded, total })

                    } catch (error) {
                        console.error(error)
                    }
                }
            },
            fail(res) {
                console.log(res);
            },
        })
    }

    #createLoadingDom({ loaded, total }) {
        const loadingDom = document.createElement('div');
        loadingDom.className='loading'
        loadingDom.style = 'position: fixed;display:flex;justify-content: center;flex-direction: column;text-align: center;width: 30%;color: rgb(255, 255, 255);top: 50%;left: 50%;transform: translate(-50%, -50%);'
        const loadingDomText = document.createElement('div');
        
        loadingDomText.textContent = `加载中...`
        loadingDom.appendChild(loadingDomText)
        const loadingDomProgress= document.createElement('div');
        
        loadingDomProgress.style = `display:flex;justify-content: space-between;margin-top: 3vh;direction: column;`
        loadingDom.appendChild(loadingDomProgress)
        
        const loadingDomDetail = document.createElement('div');
        loadingDomDetail.textContent = `${loaded}/${total}`
        loadingDomProgress.appendChild(loadingDomDetail)
        const loadingDomRate = document.createElement('div');
        loadingDomRate.textContent = `${Math.round(loaded / total * 100)}%`
        loadingDomProgress.appendChild(loadingDomRate)

        const loadingDomProgressBar = document.createElement('div');
        loadingDomProgressBar.style = `display:flex;margin-top: 1vh;border-radius: 3px;overflow: hidden;`
        loadingDom.appendChild(loadingDomProgressBar)

        const loadingDomProgressBarLoaded = document.createElement('div');
        loadingDomProgressBarLoaded.style = `width: ${Math.round(loaded / total * 100)}%;background: #5bd0ff;height: 6px;`
        loadingDomProgressBar.appendChild(loadingDomProgressBarLoaded)

        const loadingDomProgressBarUnloaded = document.createElement('div');
        loadingDomProgressBarUnloaded.style = `width: ${100 - Math.round(loaded / total * 100)}%;background: #d3d3d3;height: 6px;`
        loadingDomProgressBar.appendChild(loadingDomProgressBarUnloaded)

        return loadingDom
    }

    // 加载控制器
    #loadControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement)
        this.controls.minDistance = 2;
        this.controls.autoRotate = this.#isRotation
        this.controls.autoRotateSpeed = this.#rotationSpeed
        this.controls.maxPolarAngle = Math.PI * 0.5;
    }    
    /**
     * 场景动画
     */
    #animate = function() {
        let self = this, animationId = null
        function renderScene() {
            self.stats && self.stats.update();
            self.controls.update()
            self._RenderAnimate&&self._RenderAnimate()
            if (self.#isGPU) {
                self.renderer.renderAsync(self.scene, self.camera);
            } else {
                self.renderer.render(self.scene, self.camera);
            }
            animationId = requestAnimationFrame(renderScene);
        }
        function resetControls() {
            // 重置相机的位置和方向
            self.camera.position.set(self.#cameraPos[0],self.#cameraPos[1],self.#cameraPos[2]);
            self.camera.lookAt(self.scene.position);
            // 重置控制器的目标位置
            self.controls.target.set(0, 0, 0);
            // 重置控制器的其他参数，比如旋转、缩放和平移等
            self.controls.update(); // 更新控制器状态
          }
        function Play () {
            renderScene()
        }
        function Pause() {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        function Reset() {
            resetControls()
            if (self.#isGPU) {
                self.renderer.renderAsync(self.scene, self.camera);
            } else {
                self.renderer.render(self.scene, self.camera);
            }
        }
        function Replay() {
            resetControls()
            renderScene()
        }
        return {Play,Pause,Reset,Replay}
    }
    /**
     * 监听页面变化
     */
    #onWindowResized () {
        this.renderer.setSize( this.container.offsetWidth, this.container.offsetHeight );
        this.camera.aspect = this.container.offsetWidth / this.container.offsetHeight;
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
        AvailableSys.push('WebGPU')
    }
    if (Renderer.WebGL.isWebGL2Available() === true) {
        AvailableSys.push('WebGL')
    }
    return AvailableSys.length>0?AvailableSys:undefined
}

/**
 * 设置渲染器
 * @event QsThree#setRenderer
 * @param {Renderer} renderer 
 */
QsThree.prototype.setRenderer = function (renderer) {
    this.renderer = renderer
}
/**
 * 获取渲染器
 * @event QsThree#getRenderer
 * @return {Renderer} 当前渲染器 renderer 
 */
QsThree.prototype.getRenderer = function () {
    return this.renderer
}
/**
 * 获取渲染器
 * @event QsThree#getScene
 * @return {Scene} scene 当前场景 scene
 */
QsThree.prototype.getScene = function () {
    return this.scene
}
/**
 * 需要渲染的动画
 * @param {function} func 
 */
QsThree.prototype.addRenderAnimate = function (func) {
    try {
        if (typeof func !== 'function') throw 'param is not a function'
        this._RenderAnimate = func
    } catch (error) {
        console.error(error)
    }
}
export { QsThree };
    
export * from './plugins/index'
export { THREE } ;