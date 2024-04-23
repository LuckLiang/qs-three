import { LCamera as Camera } from "./camera/index";
import * as Renderer from "./renderer/index";
import { LScene as Scene } from "./scene/index";
import { GLTFLoader } from './modelLoader';
import { OrbitControls } from './controls';
import * as THREE from 'three';

/**
 * @class QsThree
 * @classdesc 快速创建一个展示场景
 * @constructor
 * @param {Document} container 场景绑定的DOM元素
 * @param {object} options 配置属性
 * @param {string} options.modelUrl 模型地址，目前默认加载方式为GLTFLoader
 * @param {boolean} options.isGPU 是否开启WebGPU渲染,默认以WebGL渲染
 * @param {number|string} options.background=0x000000 初始化场景背景
 * @param {number|string} options.skyColor=0x505555 天空颜色
 * @param {number|string} options.rotationSpeed=0.01 旋转速度 正数为逆时针旋转，负数为顺时针旋转
 * @param {array} options.cameraPos=[0, 60, 100] 相机初始位置
 * @param {object} options.scene 场景配置
 * @param {number} options.scene.backgroundBlurriness=null 设置背景的模糊度,仅影响分配给Scene.background的环境贴图。有效的输入是0到1之间。
 * @param {Texture} options.scene.environment=null 若该值不为null，则该纹理贴图将会被设为场景中所有物理材质的环境贴图。 然而，该属性不能够覆盖已存在的、已分配给 MeshStandardMaterial.envMap 的贴图。
 * @param {Fog} options.scene.fog=null 一个fog实例定义了影响场景中的每个物体的雾的类型。
 * @param {Material} options.scene.overrideMaterial=null 如果不为空，它将强制场景中的每个物体使用这里的材质来渲染。
 */

class QsThree {
    constructor(container, options) {
        if ( Renderer.WebGPU.isAvailable() === false && Renderer.WebGL.isWebGL2Available() === false ) {
            container.appendChild( Renderer.WebGPU.getErrorMessage() );
            throw new Error( 'No WebGPU or WebGL2 support' );
        }

        this.container = container;
        this._initOptions(options)
        if (options.modelUrl) {
            this._loadModel(options.modelUrl)
        }
        this._init(options);
        this._addSky()
        this._loadControls()
    }
    // 初始化参数
    _initOptions(options) {        
        const {background=0x000000, skyColor=0x505555, cameraPos=[0, 60, 100], _rotationSpeed = 0.01} = options
        this._groundColor = new THREE.Color(background)
        this._skyColor = new THREE.Color(skyColor)
        this._cameraPos = cameraPos
        this._rotationSpeed = _rotationSpeed
    }
    // 初始化场景
    _init(options) {
        const { scene } = options
        // 初始化场景
        this.scene = new Scene();
        this.scene.background = this._groundColor;
        
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
        const s = 90; //三维场景显示范围控制系数，系数越大，显示的范围越大

        //初始化相机
        this.camera = new Camera(s, k, 0.1, 1000)
        this.camera.rotation.order = 'YXZ';
        this.camera.position.set(this._cameraPos[0],this._cameraPos[1],this._cameraPos[2]);
        this.camera.lookAt(0, 0, 0);
        
        // 判断环境是否支持WebGPU及WebGL，初始化渲染器
        if (this.isAvailableSys().indexOf("WebGPU") >= 0 && options.isGPU) {
            this._isGPU = options.isGPU
            this.renderer = new Renderer.WebGPURenderer({antialias: true});
        } else  if (this.isAvailableSys().indexOf("WebGL") >= 0) {
            this.renderer = new Renderer.WebGLRenderer();
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
    _addSky() {      
        const ambientLight = new THREE.AmbientLight(0xffffff, .1); // 白光，强度为1
        this.scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight('rgb(253,253,253)', 5);
        dirLight.position.set(10, 10, 5); // 根据需要自行调整位置
        this.scene.add(dirLight);
        this.scene.add( new THREE.HemisphereLight( this._skyColor.value, this._groundColor.value, .1 ) );
    }
    // 加载模型
    _loadModel(url) {
        const self = this
        new GLTFLoader({
            url,
            success(gltf) {
                self._sceneGLTF = gltf.scene
                self.scene.add(gltf.scene)
            },
            process({ loaded, total }) {
                console.log(`${loaded}/${total}`, Math.round(loaded/total * 100));
            },
            fail(res) {
                console.log(res);
            },
        })
    }
    // 加载控制器
    _loadControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement)
        this.controls.minDistance = 2;
    }
}

/**
 * 判断当前浏览器是否支持'WebGPU','WebGL'渲染
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
 * 场景动画
 */
QsThree.prototype.animate = function() {
    let self = this
    function play (self) {
        renderScene()
        function renderScene() {
            requestAnimationFrame(renderScene);
            if(self._sceneGLTF) self._sceneGLTF.rotation.y += self._rotationSpeed
            if (self._isGPU) {
                self.renderer.renderAsync(self.scene, self.camera);
            } else {
                self.renderer.render( self.scene, self.camera );
            }
        }
    }
    play(self)
}

export { QsThree };
export { THREE } ;